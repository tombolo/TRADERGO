import { forgetAllProposals, buyProposal, requestProposal } from '@/pages/dashboard/speed-lab-trade';

export type TBulkEvenOddSide = 'even' | 'odd';

export async function placeBulkEvenOddTrades(params: {
    symbol: string;
    side: TBulkEvenOddSide;
    stake: number;
    duration_ticks: number;
    count: number;
    currency: string;
}): Promise<{ placed: number; errors: string[] }> {
    const contract_type = params.side === 'even' ? 'DIGITEVEN' : 'DIGITODD';
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
