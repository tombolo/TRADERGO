import type { ActiveSymbolsResponse } from '@deriv/api-types';
import { api_base } from '@/external/bot-skeleton';
import ApiHelpers from '@/external/bot-skeleton/services/api/api-helpers';
import { speedLabBuildProposalExtras } from './speed-lab-contract-params';
import type { TSpeedLabTradingMode } from './speed-lab-constants';

export type TSpeedLabMarketRow = {
    symbol: string;
    display_name: string;
    /** Submarket display name — same as Quick Strategy asset groups (e.g. Volatility indices). */
    group?: string;
    submarket?: string;
    is_open: boolean;
};

type TBotSymbolRow = {
    group?: string;
    text: string;
    value: string;
    submarket?: string;
};

const API_WAIT_MS = 8000;
const API_WAIT_STEP_MS = 150;

async function waitForTradingApi(): Promise<boolean> {
    const deadline = Date.now() + API_WAIT_MS;
    while (Date.now() < deadline) {
        if (api_base.api) return true;
        await new Promise<void>(resolve => {
            setTimeout(resolve, API_WAIT_STEP_MS);
        });
    }
    return Boolean(api_base.api);
}

function isOpenActiveSymbolRow(row: {
    exchange_is_open?: 0 | 1 | number;
    is_trading_suspended?: 0 | 1 | number;
}): boolean {
    const ex = Number(row.exchange_is_open);
    const sus = Number(row.is_trading_suspended);
    return ex === 1 && sus !== 1;
}

/** Deriv `send()` may return the payload at the root or under `data` (middleware / client versions). */
type TActiveSymbolApiRow = {
    symbol?: string;
    display_name?: string;
    submarket_display_name?: string;
    market_display_name?: string;
    exchange_is_open?: unknown;
    is_trading_suspended?: unknown;
};

function extractActiveSymbolsArray(res: unknown): TActiveSymbolApiRow[] {
    if (!res || typeof res !== 'object') return [];
    const r = res as Record<string, unknown>;
    if (Array.isArray(r.active_symbols)) {
        return r.active_symbols as TActiveSymbolApiRow[];
    }
    const data = r.data;
    if (data && typeof data === 'object') {
        const inner = (data as Record<string, unknown>).active_symbols;
        if (Array.isArray(inner)) {
            return inner as TActiveSymbolApiRow[];
        }
    }
    return [];
}

function rowsToSpeedLabMarkets(list: TActiveSymbolApiRow[]): TSpeedLabMarketRow[] {
    const seen = new Set<string>();
    const out: TSpeedLabMarketRow[] = [];

    for (const row of list) {
        const sym = row.symbol;
        if (!sym || seen.has(sym)) continue;
        seen.add(sym);
        out.push({
            symbol: sym,
            display_name: row.display_name || sym,
            group: row.submarket_display_name || row.market_display_name,
            is_open: isOpenActiveSymbolRow(row),
        });
    }

    out.sort((a, b) => {
        if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
        return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    });

    return out;
}

/**
 * Same symbol list + grouping as Quick Strategy (`active_symbols.getSymbolsForBot`).
 * Ensures `processed_symbols` is built via `retrieveActiveSymbols` when possible.
 */
export async function fetchSpeedLabMarketsFromQuickStrategy(): Promise<TSpeedLabMarketRow[] | null> {
    const ready = await waitForTradingApi();
    if (!ready) return null;

    const inst = ApiHelpers.instance as
        | {
              active_symbols?: {
                  retrieveActiveSymbols: (forced?: boolean) => Promise<unknown>;
                  getSymbolsForBot: () => TBotSymbolRow[];
                  isSymbolClosed: (symbol: string) => boolean;
              };
          }
        | undefined;

    const active = inst?.active_symbols;
    if (!active?.getSymbolsForBot) return null;

    try {
        await active.retrieveActiveSymbols(false);
    } catch {
        /* processed_symbols may still be usable */
    }

    const rows = active.getSymbolsForBot();
    if (!rows?.length) return null;

    return rows.map(s => ({
        symbol: s.value,
        display_name: s.text,
        group: s.group,
        submarket: s.submarket,
        is_open: typeof active.isSymbolClosed === 'function' ? !active.isSymbolClosed(s.value) : true,
    }));
}

/**
 * Loads symbols via Deriv WebSocket `active_symbols` (see API docs: request `active_symbols`: `brief` | `full`).
 * Does not depend on ApiHelpers / trading_times so the list works as soon as the socket is up.
 */
export async function fetchSpeedLabMarkets(): Promise<TSpeedLabMarketRow[]> {
    const ready = await waitForTradingApi();
    if (!ready || !api_base.api) {
        throw new Error('Trading connection is not ready yet');
    }

    const res = (await api_base.api.send({
        active_symbols: 'brief',
    })) as ActiveSymbolsResponse & { error?: { code?: string; message?: string }; data?: unknown };

    if (res.error) {
        throw new Error(res.error.message || res.error.code || 'active_symbols request failed');
    }

    let list = extractActiveSymbolsArray(res);

    if (!list.length) {
        await api_base.getActiveSymbols();
        const cached = api_base.active_symbols as TActiveSymbolApiRow[] | undefined;
        if (Array.isArray(cached) && cached.length) {
            list = cached;
        }
    }

    return rowsToSpeedLabMarkets(list);
}

/** Prefer Quick Strategy pipeline; fall back to direct `active_symbols` brief fetch. */
export async function fetchSpeedLabMarketsPreferred(): Promise<TSpeedLabMarketRow[]> {
    const from_qs = await fetchSpeedLabMarketsFromQuickStrategy();
    if (from_qs?.length) return from_qs;
    return fetchSpeedLabMarkets();
}

const DURATION_UNIT_API: Record<string, string> = {
    Ticks: 't',
    Seconds: 's',
    Minutes: 'm',
    Hours: 'h',
    Days: 'd',
};

export function mapDurationUnit(ui: string): string {
    return DURATION_UNIT_API[ui] ?? 't';
}

/** UI contract label → API contract_type (+ optional barrier for digits/touch). */
export function mapContractUiToApi(ui: string): { contract_type: string; barrier?: string } {
    const table: Record<string, { contract_type: string; barrier?: string }> = {
        'Rise (CALL)': { contract_type: 'CALL' },
        'Fall (PUT)': { contract_type: 'PUT' },
        Higher: { contract_type: 'HIGHER' },
        Lower: { contract_type: 'LOWER' },
        Touch: { contract_type: 'ONETOUCH', barrier: '+0.01' },
        'No Touch': { contract_type: 'NOTOUCH', barrier: '+0.01' },
        'Matches/Differs': { contract_type: 'DIGITMATCH', barrier: '5' },
        'Even/Odd': { contract_type: 'DIGITEVEN' },
        'Over/Under': { contract_type: 'DIGITOVER', barrier: '5' },
    };
    return table[ui] ?? { contract_type: 'CALL' };
}

type TProposalResponse = {
    proposal?: { id?: string; ask_price?: number; payout?: number; contract_details?: { minimum_stake?: number } };
    error?: { message?: string; code?: string };
};

export type TSpeedLabContractLeg = {
    contract_id: string;
    buy_price: number;
};

type TPriceProposalOk = { id: string; ask_price: number; payout: number };

async function sendPriceProposal(params: {
    symbol: string;
    contract_type: string;
    duration: number;
    duration_unit: string;
    amount: number;
    currency: string;
    basis?: string;
    barrier?: string | number;
    selected_tick?: number;
}): Promise<TPriceProposalOk> {
    if (!api_base.api) throw new Error('API not ready');

    const req: Record<string, unknown> = {
        proposal: 1,
        amount: params.amount,
        basis: params.basis ?? 'stake',
        contract_type: params.contract_type,
        currency: params.currency,
        duration: params.duration,
        duration_unit: params.duration_unit,
        symbol: params.symbol,
    };
    if (params.barrier !== undefined) req.barrier = params.barrier;
    if (params.selected_tick !== undefined) req.selected_tick = params.selected_tick;

    const res = (await api_base.api.send(req)) as TProposalResponse;
    if (res.error) {
        throw new Error(res.error.message || res.error.code || 'Proposal failed');
    }
    const id = res.proposal?.id;
    const ask = res.proposal?.ask_price;
    const payout = Number(res.proposal?.payout);
    if (!id || ask === undefined) throw new Error('Invalid proposal response');
    return {
        id,
        ask_price: Number(ask),
        payout: Number.isFinite(payout) ? payout : 0,
    };
}

/**
 * Net profit/loss for a settled contract.
 * Deriv `transaction` sells expose `amount` as the sale proceeds / payout (often positive even when you lost stake),
 * so we must use **sell proceeds − buy_price** when `buy_price` is known (from the `buy` response).
 */
export function extractSellNetProfit(
    transaction: Record<string, unknown>,
    buy_price?: number
): number | null {
    const t = transaction;
    if (String(t.action) !== 'sell') return null;

    const balAfter = Number(t.balance_after);
    const balBefore = Number(t.balance_before);
    if (Number.isFinite(balAfter) && Number.isFinite(balBefore)) {
        return balAfter - balBefore;
    }

    const sell_proceeds = Number(t.sold_for ?? t.amount);
    if (Number.isFinite(sell_proceeds) && buy_price !== undefined && Number.isFinite(buy_price)) {
        return sell_proceeds - buy_price;
    }

    const p = Number(t.profit);
    if (Number.isFinite(p) && t.profit !== '' && t.profit !== undefined) {
        return p;
    }

    return null;
}

export async function forgetAllProposals(): Promise<void> {
    if (!api_base.api) return;
    try {
        await api_base.api.send({ forget_all: 'proposal' });
    } catch {
        /* ignore */
    }
}

export async function requestProposal(params: {
    symbol: string;
    contract_type: string;
    duration: number;
    duration_unit: string;
    amount: number;
    currency: string;
    basis?: string;
    barrier?: string | number;
    selected_tick?: number;
}): Promise<{ id: string; ask_price: number }> {
    const r = await sendPriceProposal(params);
    return { id: r.id, ask_price: r.ask_price };
}

const MULTI_MARKET_BATCH = 10;

/** Request proposals across symbols in batches; pick the highest `payout` (same stake). */
export async function pickBestSymbolForMultiMarket(params: {
    symbols: string[];
    contract_type: string;
    barrier?: string | number;
    selected_tick?: number;
    duration: number;
    duration_unit: string;
    amount: number;
    currency: string;
}): Promise<{ symbol: string; id: string; ask_price: number }> {
    const unique = [...new Set(params.symbols.filter(Boolean))];
    if (!unique.length) throw new Error('No symbols to scan');

    let best: { symbol: string; id: string; ask_price: number; payout: number } | null = null;

    for (let i = 0; i < unique.length; i += MULTI_MARKET_BATCH) {
        const chunk = unique.slice(i, i + MULTI_MARKET_BATCH);
        const settled = await Promise.all(
            chunk.map(async sym => {
                try {
                    const r = await sendPriceProposal({
                        symbol: sym,
                        contract_type: params.contract_type,
                        duration: params.duration,
                        duration_unit: params.duration_unit,
                        amount: params.amount,
                        currency: params.currency,
                        barrier: params.barrier,
                        selected_tick: params.selected_tick,
                    });
                    if (!Number.isFinite(r.payout) || r.payout <= 0) return null;
                    return { symbol: sym, id: r.id, ask_price: r.ask_price, payout: r.payout };
                } catch {
                    return null;
                }
            })
        );

        for (const row of settled) {
            if (!row) continue;
            if (!best || row.payout > best.payout) best = row;
        }
    }

    if (!best) {
        throw new Error(
            'No market returned a valid proposal for this contract type and duration. Try another contract, duration, or stake.'
        );
    }

    return { symbol: best.symbol, id: best.id, ask_price: best.ask_price };
}

export async function buyProposal(proposal_id: string, price: number): Promise<{
    buy_price?: number;
    transaction_id?: string;
    contract_id?: string | number;
}> {
    if (!api_base.api) throw new Error('API not ready');
    const res = (await api_base.api.send({
        buy: proposal_id,
        price,
    })) as {
        buy?: { buy_price?: number; transaction_id?: string; contract_id?: string | number };
        error?: { message?: string };
    };
    if (res.error) throw new Error(res.error.message || 'Buy failed');
    return res.buy ?? {};
}

/** One logical “round” of trades depending on mode (hedge = CALL + PUT; multi-market = best payout across symbols). */
export async function executeSpeedLabRound(args: {
    symbol: string;
    symbol_candidates?: string[];
    /** API `contract_type` (e.g. CALL, PUT) from Quick Strategy `getContractTypes`. */
    contract_type_api: string;
    duration: number;
    /** API `duration_unit` single letter: t, s, m, h, d — from `getDurations`. */
    duration_unit_api: string;
    /** Optional fixed barrier (e.g. touch offset) when not driven by `trade_prediction`. */
    barrier?: string | number;
    /**
     * Same meaning as Quick Strategy `last_digit_prediction`: digit 0–9 for match/diff/over/under;
     * tick index 1–10 for TICKHIGH / TICKLOW (see `tradeOptionToProposal`).
     */
    trade_prediction: number;
    stake: number;
    currency: string;
    trading_mode: TSpeedLabTradingMode;
}): Promise<{ contracts: number; legs: TSpeedLabContractLeg[] }> {
    const dur_unit = args.duration_unit_api;
    const legs: TSpeedLabContractLeg[] = [];

    const proposalFieldsForContract = (ct: string) => {
        const ex = speedLabBuildProposalExtras(ct, args.trade_prediction);
        const barrier =
            ex.barrier !== undefined
                ? ex.barrier
                : ct === args.contract_type_api && args.barrier !== undefined
                  ? args.barrier
                  : undefined;
        return { barrier, selected_tick: ex.selected_tick };
    };

    const run_one = async (ct: string) => {
        await forgetAllProposals();
        const { barrier, selected_tick } = proposalFieldsForContract(ct);
        const { id, ask_price } = await requestProposal({
            symbol: args.symbol,
            contract_type: ct,
            duration: args.duration,
            duration_unit: dur_unit,
            amount: args.stake,
            currency: args.currency,
            barrier,
            selected_tick,
        });
        const buy = await buyProposal(id, ask_price);
        const cid = buy.contract_id != null ? String(buy.contract_id) : '';
        const buy_px = Number(buy.buy_price ?? ask_price);
        if (cid && Number.isFinite(buy_px)) {
            legs.push({ contract_id: cid, buy_price: buy_px });
        }
    };

    if (args.trading_mode === 'multi_market') {
        const candidates =
            args.symbol_candidates?.length ? args.symbol_candidates : args.symbol ? [args.symbol] : [];
        const main_ex = proposalFieldsForContract(args.contract_type_api);
        const best = await pickBestSymbolForMultiMarket({
            symbols: candidates,
            contract_type: args.contract_type_api,
            barrier: main_ex.barrier,
            selected_tick: main_ex.selected_tick,
            duration: args.duration,
            duration_unit: dur_unit,
            amount: args.stake,
            currency: args.currency,
        });
        const buy = await buyProposal(best.id, best.ask_price);
        const cid = buy.contract_id != null ? String(buy.contract_id) : '';
        const buy_px = Number(buy.buy_price ?? best.ask_price);
        if (cid && Number.isFinite(buy_px)) {
            legs.push({ contract_id: cid, buy_price: buy_px });
        }
    } else if (args.trading_mode === 'hedge') {
        await run_one('CALL');
        await run_one('PUT');
    } else if (args.trading_mode === 'multiple') {
        const n = 3;
        for (let i = 0; i < n; i++) {
            await run_one(args.contract_type_api);
        }
    } else {
        await run_one(args.contract_type_api);
    }

    return { contracts: legs.length, legs };
}

export type TTickHandler = () => void;

/**
 * Subscribe to live ticks for `symbol`. Calls `onTick` for each tick. Returns unsubscribe cleanup.
 */
export function subscribeSpeedLabTicks(symbol: string, onTick: TTickHandler): () => void {
    if (!api_base.api) return () => undefined;

    let forget_id: string | null = null;
    const sub = api_base.api.onMessage().subscribe((msg: { data?: { msg_type?: string; tick?: { symbol?: string } } }) => {
        const d = msg?.data;
        if (d?.msg_type === 'tick' && d.tick?.symbol === symbol) {
            onTick();
        }
    });
    api_base.pushSubscription(sub);

    api_base.api
        .send({ ticks: symbol, subscribe: 1 })
        .then((res: { subscription?: { id?: string } }) => {
            forget_id = res?.subscription?.id ?? null;
        })
        .catch(() => {
            /* fall back: interval mode still works */
        });

    return () => {
        sub.unsubscribe();
        if (forget_id && api_base.api) {
            api_base.api.send({ forget: forget_id }).catch(() => undefined);
        }
    };
}
