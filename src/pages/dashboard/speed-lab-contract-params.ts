/**
 * Mirrors Quick Strategy / trade-engine rules: digit contracts need `barrier`,
 * high/low tick contracts need `selected_tick` (not `barrier`). See `tradeOptionToProposal` in bot-skeleton.
 */
const TICK_SELECTED_TICK_TYPES = new Set(['TICKHIGH', 'TICKLOW']);

/** Matches / Differs / Over / Under — last digit 0–9 as `barrier` on the proposal. */
const DIGIT_BARRIER_TYPES = new Set(['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF']);

export type TSpeedLabPredictionMode = 'barrier_digit' | 'selected_tick' | null;

export function speedLabPredictionMode(contract_type_api: string): TSpeedLabPredictionMode {
    const u = contract_type_api.toUpperCase();
    if (TICK_SELECTED_TICK_TYPES.has(u)) return 'selected_tick';
    if (DIGIT_BARRIER_TYPES.has(u)) return 'barrier_digit';
    return null;
}

export type TSpeedLabProposalExtras = {
    /** Digit prediction — API accepts numeric barrier (same as QS `requestOptionsProposalForQS`). */
    barrier?: number;
    selected_tick?: number;
};

/**
 * @param prediction — QS `last_digit_prediction`: 0–9 for digit contracts; tick index (1–10) for High/Low tick.
 */
export function speedLabBuildProposalExtras(
    contract_type_api: string,
    prediction: number
): TSpeedLabProposalExtras {
    const mode = speedLabPredictionMode(contract_type_api);
    if (!mode) return {};

    const n = Math.round(Number(prediction));

    if (mode === 'selected_tick') {
        const t = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
        return { selected_tick: t };
    }

    const d = Number.isFinite(n) ? Math.min(9, Math.max(0, n)) : 5;
    return { barrier: d };
}

export function speedLabPredictionInputValid(contract_type_api: string, prediction: number): boolean {
    const mode = speedLabPredictionMode(contract_type_api);
    if (!mode) return true;
    const n = Math.round(Number(prediction));
    if (!Number.isFinite(n)) return false;
    if (mode === 'selected_tick') return n >= 1 && n <= 10;
    return n >= 0 && n <= 9;
}
