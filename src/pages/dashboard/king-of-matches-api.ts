import { api_base } from '@/external/bot-skeleton';

/**
 * Decimal places per symbol — aligns with `AIMarketScanner` / Quick Strategy digit logic when `pip_sizes`
 * is not yet loaded from `active_symbols`.
 */
const KOM_PIP_FALLBACK: Record<string, number> = {
    '1HZ10V': 2,
    '1HZ25V': 2,
    '1HZ50V': 2,
    '1HZ75V': 2,
    '1HZ100V': 2,
    '1HZ150V': 2,
    '1HZ200V': 2,
    '1HZ250V': 2,
    '1HZ300V': 2,
    R_10: 3,
    R_25: 3,
    R_50: 4,
    R_75: 4,
    R_100: 2,
    JD10: 2,
    JD25: 2,
    JD50: 2,
    JD75: 2,
    JD100: 2,
    JD150: 2,
    JD200: 2,
    BOOM300N: 2,
    BOOM500: 2,
    BOOM1000: 2,
    CRASH300N: 2,
    CRASH500: 2,
    CRASH1000: 2,
    RDBEAR: 2,
    RDBULL: 2,
    STPRNG: 2,
    WLDAUD: 2,
    WLDEUR: 2,
    WLDGBP: 2,
    WLDXAU: 2,
    WLDUSD: 2,
};

/**
 * Pip size = decimal places for `toFixed`, same as trade engine `getLastDigitForList(tick, pip_size)`.
 */
export function getKomPipSize(symbol: string): number {
    const sizes = api_base.pip_sizes as Record<string, number> | undefined;
    const p = sizes?.[symbol];
    if (typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 12) {
        return Math.floor(p);
    }
    return KOM_PIP_FALLBACK[symbol] ?? 2;
}

/**
 * Last significant digit of the tick quote — same approach as `AIMarketScanner` `lastDigit(price, decimals)`.
 */
export function komLastDigitFromQuote(quote: number | string, pipSize: number): number {
    const n = typeof quote === 'number' ? quote : Number(String(quote).trim());
    if (!Number.isFinite(n)) return 0;
    const places = Math.max(0, Math.min(12, Math.floor(pipSize)));
    const fixed = n.toFixed(places);
    const last = fixed[fixed.length - 1];
    const d = Number.parseInt(last, 10);
    return Number.isNaN(d) ? 0 : d;
}

type THistoryResponse = {
    history?: { prices?: unknown[]; times?: unknown[] };
    error?: { message?: string };
};

function extractHistoryPrices(res: unknown): number[] {
    if (!res || typeof res !== 'object') return [];
    const r = res as THistoryResponse & {
        data?: THistoryResponse;
        ticks_history?: { prices?: unknown[] };
    };
    const nested = r.history ?? r.data?.history;
    const top = r.ticks_history;
    const prices = nested?.prices ?? top?.prices;
    if (!Array.isArray(prices)) return [];
    return prices.map(p => Number(p)).filter(n => !Number.isNaN(n));
}

/** Fetch last `count` tick quotes for `symbol` (ticks_history, no subscription). */
export async function komFetchTickQuotes(symbol: string, count: number): Promise<number[]> {
    if (!api_base.api) return [];
    const capped = Math.min(Math.max(Math.floor(count), 1), 5000);
    try {
        const res = await api_base.api.send({
            ticks_history: symbol,
            end: 'latest',
            start: 1,
            count: capped,
            style: 'ticks',
        });
        const err = (res as THistoryResponse)?.error;
        if (err?.message) throw new Error(err.message);
        return extractHistoryPrices(res);
    } catch {
        return [];
    }
}

const KOM_API_WAIT_MS = 8000;
const KOM_API_WAIT_STEP_MS = 150;

async function waitForKomApi(): Promise<boolean> {
    const deadline = Date.now() + KOM_API_WAIT_MS;
    while (Date.now() < deadline) {
        if (api_base.api) return true;
        await new Promise<void>(resolve => {
            setTimeout(resolve, KOM_API_WAIT_STEP_MS);
        });
    }
    return Boolean(api_base.api);
}

type TKomActiveSymbolRow = {
    symbol?: string;
    display_name?: string;
    market?: string;
    exchange_is_open?: unknown;
    is_trading_suspended?: unknown;
};

function extractKomActiveSymbolsArray(res: unknown): TKomActiveSymbolRow[] {
    if (!res || typeof res !== 'object') return [];
    const r = res as Record<string, unknown>;
    if (Array.isArray(r.active_symbols)) {
        return r.active_symbols as TKomActiveSymbolRow[];
    }
    const data = r.data;
    if (data && typeof data === 'object') {
        const inner = (data as Record<string, unknown>).active_symbols;
        if (Array.isArray(inner)) {
            return inner as TKomActiveSymbolRow[];
        }
    }
    return [];
}

function komIsOpenActiveSymbolRow(row: TKomActiveSymbolRow): boolean {
    const ex = Number(row.exchange_is_open);
    const sus = Number(row.is_trading_suspended);
    return ex === 1 && sus !== 1;
}

const SYNTHETIC_INDEX_MARKET = 'synthetic_index';

/** Open synthetic-index symbols from Deriv `active_symbols: brief` (for market dropdown). */
export async function komFetchSyntheticIndexSymbols(): Promise<{ symbol: string; display_name: string }[]> {
    const ready = await waitForKomApi();
    if (!ready || !api_base.api) return [];

    try {
        const res = await api_base.api.send({ active_symbols: 'brief' });
        const rows = extractKomActiveSymbolsArray(res);
        const seen = new Set<string>();
        const out: { symbol: string; display_name: string }[] = [];

        for (const row of rows) {
            const sym = row.symbol;
            if (!sym || row.market !== SYNTHETIC_INDEX_MARKET || seen.has(sym)) continue;
            if (!komIsOpenActiveSymbolRow(row)) continue;
            seen.add(sym);
            out.push({
                symbol: sym,
                display_name: row.display_name || sym,
            });
        }

        out.sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }));
        return out;
    } catch {
        return [];
    }
}

export function komCountDigits(quotes: number[], pipSize: number): number[] {
    const counts = new Array(10).fill(0) as number[];
    for (const q of quotes) {
        const d = komLastDigitFromQuote(q, pipSize);
        counts[d] += 1;
    }
    return counts;
}

export type TKomTickCleanup = () => void;

/**
 * Subscribe to live ticks for `symbol`. `onQuote` receives each new quote string/number.
 * Returns cleanup (forget + unsubscribe).
 */
export function komSubscribeTicks(symbol: string, onQuote: (quote: number | string) => void): TKomTickCleanup {
    if (!api_base.api) return () => undefined;

    let forgetId: string | null = null;
    const sub = api_base.api.onMessage().subscribe((msg: unknown) => {
        const m = msg as { data?: { msg_type?: string; tick?: { symbol?: string; quote?: number | string } } };
        const d = m?.data;
        if (d?.msg_type === 'tick' && d.tick?.symbol === symbol && d.tick.quote != null) {
            onQuote(d.tick.quote);
        }
    });
    api_base.pushSubscription(sub);

    api_base.api
        .send({ ticks: symbol, subscribe: 1 })
        .then((res: { subscription?: { id?: string } }) => {
            forgetId = res?.subscription?.id ?? null;
        })
        .catch(() => {
            forgetId = null;
        });

    return () => {
        sub.unsubscribe();
        if (forgetId && api_base.api) {
            api_base.api.send({ forget: forgetId }).catch(() => undefined);
        }
    };
}
