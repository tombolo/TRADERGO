import { extractInfoFromShortcode } from '@/components/shared/utils/shortcode/shortcode';

type TLooseContract = Record<string, unknown>;

export type TMirrorBuyPayload = {
    buy: string;
    price: number;
    parameters?: Record<string, unknown>;
};

const ACCU_TYPES = ['ACCU'];
const MULT_TYPES = ['MULTUP', 'MULTDOWN'];

const toNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const toStringValue = (value: unknown) => {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const parseGrowthRate = (value: unknown, shortcode_growth_rate?: string | null) => {
    const from_contract = toNumber(value);
    if (from_contract != null) return from_contract;

    if (!shortcode_growth_rate) return null;

    const from_shortcode = Number(shortcode_growth_rate);
    if (!Number.isFinite(from_shortcode)) return null;

    return from_shortcode > 1 ? from_shortcode / 100 : from_shortcode;
};

const inferDuration = (data: TLooseContract) => {
    const duration = toNumber(data.duration ?? data.duration_amount);
    const duration_unit = toStringValue(data.duration_unit);

    if (duration != null && duration_unit) {
        return { duration, duration_unit };
    }

    const start = toNumber(data.date_start);
    const expiry = toNumber(data.expiry_time ?? data.date_expiry);

    if (start != null && expiry != null && expiry > start) {
        return { duration: expiry - start, duration_unit: duration_unit ?? 's' };
    }

    return null;
};

const buildFollowerParameters = (data: TLooseContract): Record<string, unknown> | null => {
    const amount = toNumber(data.buy_price ?? data.amount);
    const symbol = toStringValue(data.underlying_symbol ?? data.underlying ?? data.symbol);
    const contract_type = toStringValue(data.contract_type);
    const basis = toStringValue(data.basis) ?? 'stake';
    const currency = toStringValue(data.currency);

    if (amount == null || !symbol || !contract_type) {
        return null;
    }

    const shortcode = toStringValue(data.shortcode);
    const shortcode_info = shortcode ? extractInfoFromShortcode(shortcode) : null;

    const parameters: Record<string, unknown> = {
        amount,
        basis,
        contract_type,
        underlying_symbol: symbol,
        ...(currency ? { currency } : {}),
    };

    if (ACCU_TYPES.includes(contract_type)) {
        const growth_rate = parseGrowthRate(data.growth_rate, shortcode_info?.growth_rate);
        if (growth_rate == null) return null;
        parameters.growth_rate = growth_rate;
        return parameters;
    }

    if (MULT_TYPES.includes(contract_type)) {
        const multiplier =
            toNumber(data.multiplier) ??
            (shortcode_info?.multiplier ? Number(shortcode_info.multiplier) : null);
        if (multiplier == null) return null;
        parameters.multiplier = multiplier;
        return parameters;
    }

    const duration_info = inferDuration(data);
    if (!duration_info) return null;

    parameters.duration = duration_info.duration;
    parameters.duration_unit = duration_info.duration_unit;

    const barrier = toStringValue(data.barrier) ?? shortcode_info?.barrier_1;
    const barrier2 = toStringValue(data.barrier2);
    const selected_tick = toNumber(data.selected_tick);

    if (barrier) parameters.barrier = barrier;
    if (barrier2) parameters.barrier2 = barrier2;
    if (selected_tick != null) parameters.selected_tick = selected_tick;

    return parameters;
};

export const buildMirrorBuyPayloadFromOpenContract = (data: TLooseContract): TMirrorBuyPayload | null => {
    const amount = toNumber(data.buy_price ?? data.amount);
    const parameters = buildFollowerParameters(data);

    if (amount == null || !parameters) {
        return null;
    }

    return {
        buy: '1',
        price: amount,
        parameters,
    };
};

export const normalizeLeaderBuyPayloadForMirror = (
    leader_payload: TMirrorBuyPayload | null | undefined,
    contract_data: TLooseContract
): TMirrorBuyPayload | null => {
    if (!leader_payload?.buy || leader_payload.price == null) {
        return buildMirrorBuyPayloadFromOpenContract(contract_data);
    }

    if (!leader_payload.parameters) {
        return buildMirrorBuyPayloadFromOpenContract(contract_data);
    }

    const parameters = { ...leader_payload.parameters } as Record<string, unknown>;
    const symbol =
        toStringValue(parameters.underlying_symbol) ??
        toStringValue(parameters.symbol) ??
        toStringValue(contract_data.underlying_symbol ?? contract_data.underlying ?? contract_data.symbol);

    if (!symbol) {
        return buildMirrorBuyPayloadFromOpenContract(contract_data);
    }

    delete parameters.symbol;
    parameters.underlying_symbol = symbol;

    return {
        buy: String(leader_payload.buy),
        price: Number(leader_payload.price),
        parameters,
    };
};
