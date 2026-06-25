import { speedLabBuildProposalExtras } from '@/pages/dashboard/speed-lab-contract-params';
import { forgetAllProposals, buyProposal, requestProposal } from '@/pages/dashboard/speed-lab-trade';

export type TBulkTradeType = 'even_odd' | 'match_diff' | 'over_under';

export type TBulkTradeSide =
    | 'even'
    | 'odd'
    | 'match'
    | 'diff'
    | 'over'
    | 'under';

function resolveContract(
    trade_type: TBulkTradeType,
    side: TBulkTradeSide
): { contract_type: string; needs_barrier: boolean } {
    if (trade_type === 'even_odd') {
        return { contract_type: side === 'even' ? 'DIGITEVEN' : 'DIGITODD', needs_barrier: false };
    }
    if (trade_type === 'match_diff') {
        return { contract_type: side === 'match' ? 'DIGITMATCH' : 'DIGITDIFF', needs_barrier: true };
    }
    return { contract_type: side === 'over' ? 'DIGITOVER' : 'DIGITUNDER', needs_barrier: true };
}

export async function placeBulkTrades(params: {
    symbol: string;
    trade_type: TBulkTradeType;
    side: TBulkTradeSide;
    barrier_digit?: number;
    stake: number;
    duration_ticks: number;
    count: number;
    currency: string;
}): Promise<{ placed: number; errors: string[] }> {
    const { contract_type, needs_barrier } = resolveContract(params.trade_type, params.side);
    const barrier = needs_barrier ? Math.min(9, Math.max(0, Math.round(params.barrier_digit ?? 5))) : undefined;
    const extras = barrier !== undefined ? speedLabBuildProposalExtras(contract_type, barrier) : {};

    const capped = Math.min(Math.max(Math.floor(params.count), 1), 50);
    const errors: string[] = [];
    let placed = 0;

    for (let i = 0; i < capped; i++) {
        try {
            await forgetAllProposals();
            const { id, ask_price } = await requestProposal({
                symbol: params.symbol,
                contract_type,
                duration: params.duration_ticks,
                duration_unit: 't',
                amount: params.stake,
                currency: params.currency,
                barrier: extras.barrier,
                selected_tick: extras.selected_tick,
            });
            await buyProposal(id, ask_price);
            placed += 1;
        } catch (e) {
            errors.push(e instanceof Error ? e.message : 'Trade failed');
            break;
        }
    }

    return { placed, errors };
}

/** @deprecated Use placeBulkTrades */
export type TBulkEvenOddSide = 'even' | 'odd';

export async function placeBulkEvenOddTrades(params: {
    symbol: string;
    side: TBulkEvenOddSide;
    stake: number;
    duration_ticks: number;
    count: number;
    currency: string;
}): Promise<{ placed: number; errors: string[] }> {
    return placeBulkTrades({ ...params, trade_type: 'even_odd', side: params.side });
}
