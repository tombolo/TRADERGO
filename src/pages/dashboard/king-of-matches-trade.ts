import type { ProposalOpenContract } from '@deriv/api-types';
import { api_base } from '@/external/bot-skeleton';
import { forgetAllProposals, requestProposal, buyProposal } from './speed-lab-trade';
import { speedLabBuildProposalExtras } from './speed-lab-contract-params';

export type TKomDigitTradeMode = 'match' | 'diff';

/** Max simultaneous digit legs (each is its own proposal + buy, like Speed Lab). */
export const KOM_MAX_BATCH_LEGS = 5;

export type TKomPlaceDigitResult = {
    contract_id: string | undefined;
    buy_price: number | undefined;
};

export type TKomBatchLegResult = {
    digit: number;
    stake: number;
    contract_id?: string;
    buy_price?: number;
    error?: string;
};

/**
 * Single digit contract (Match / Differs) — same barrier semantics as Quick Strategy / Speed Lab:
 * `DIGITMATCH` wins if last digit equals barrier; `DIGITDIFF` if it does not.
 */
export async function komPlaceDigitTrade(params: {
    symbol: string;
    mode: TKomDigitTradeMode;
    digit: number;
    stake: number;
    currency: string;
    /** Tick count (default 1), same API shape as Speed Lab proposals. */
    duration?: number;
    duration_unit_api?: string;
}): Promise<TKomPlaceDigitResult> {
    const contract_type = params.mode === 'match' ? 'DIGITMATCH' : 'DIGITDIFF';
    const ex = speedLabBuildProposalExtras(contract_type, params.digit);
    await forgetAllProposals();
    const { id, ask_price } = await requestProposal({
        symbol: params.symbol,
        contract_type,
        duration: params.duration ?? 1,
        duration_unit: params.duration_unit_api ?? 't',
        amount: params.stake,
        currency: params.currency,
        barrier: ex.barrier,
        selected_tick: ex.selected_tick,
    });
    const buy = await buyProposal(id, ask_price);
    return {
        contract_id: buy.contract_id != null ? String(buy.contract_id) : undefined,
        buy_price: buy.buy_price != null ? Number(buy.buy_price) : undefined,
    };
}

/**
 * Place up to five digit contracts in sequence (forget → proposal → buy per leg).
 * The API has no single multi-barrier call; this matches Speed Lab’s one-contract-per-round pattern.
 */
export async function komPlaceDigitTradesBatch(params: {
    symbol: string;
    mode: TKomDigitTradeMode;
    legs: { digit: number; stake: number }[];
    currency: string;
    duration?: number;
    duration_unit_api?: string;
}): Promise<TKomBatchLegResult[]> {
    const capped = params.legs.slice(0, KOM_MAX_BATCH_LEGS);
    const results: TKomBatchLegResult[] = [];
    for (const leg of capped) {
        try {
            const r = await komPlaceDigitTrade({
                symbol: params.symbol,
                mode: params.mode,
                digit: leg.digit,
                stake: leg.stake,
                currency: params.currency,
                duration: params.duration,
                duration_unit_api: params.duration_unit_api,
            });
            results.push({
                digit: leg.digit,
                stake: leg.stake,
                contract_id: r.contract_id,
                buy_price: r.buy_price,
            });
        } catch (e) {
            results.push({
                digit: leg.digit,
                stake: leg.stake,
                error: e instanceof Error ? e.message : 'Trade failed',
            });
        }
    }
    return results;
}

export type TKomOpenContractSnapshot = {
    settled: boolean;
    /** Final P/L when settled (payout − stake style from API). */
    profit: number | undefined;
    buy_price: number | undefined;
    sell_price: number | undefined;
};

/**
 * Poll open contract state (same as trade engine’s `proposal_open_contract` usage).
 */
export async function komFetchOpenContractSnapshot(contract_id: string): Promise<TKomOpenContractSnapshot | null> {
    if (!api_base.api) return null;
    try {
        const res = (await api_base.api.send({
            proposal_open_contract: 1,
            contract_id,
        })) as { proposal_open_contract?: ProposalOpenContract; error?: { message?: string } };
        if (res.error || !res.proposal_open_contract) return null;
        const poc = res.proposal_open_contract;
        const sold = poc.is_sold === 1;
        const expired = poc.is_expired === 1;
        const settled = sold || expired;
        const buy = poc.buy_price != null ? Number(poc.buy_price) : undefined;
        const sell =
            poc.sell_price != null
                ? Number(poc.sell_price)
                : poc.bid_price != null
                  ? Number(poc.bid_price)
                  : undefined;
        const profitField = poc.profit != null && Number.isFinite(poc.profit) ? poc.profit : undefined;
        let profit: number | undefined;
        if (settled) {
            if (buy != null && sell != null && Number.isFinite(buy) && Number.isFinite(sell)) {
                profit = sell - buy;
            } else if (profitField != null) {
                profit = profitField;
            }
        } else {
            profit = profitField;
        }
        return {
            settled,
            profit,
            buy_price: buy,
            sell_price: sell,
        };
    } catch {
        return null;
    }
}
