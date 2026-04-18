type TLooseContract = Record<string, unknown>;

const toNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const toStringValue = (value: unknown) => {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const buildMirrorBuyPayloadFromOpenContract = (data: TLooseContract) => {
    const amount = toNumber(data.buy_price ?? data.amount);
    const symbol = toStringValue(data.underlying ?? data.symbol ?? data.display_name);
    const contract_type = toStringValue(data.contract_type);
    const duration = toNumber(data.duration ?? data.duration_amount);
    const duration_unit = toStringValue(data.duration_unit);
    const basis = toStringValue(data.basis) ?? 'stake';
    const currency = toStringValue(data.currency);
    const barrier = toStringValue(data.barrier);
    const barrier2 = toStringValue(data.barrier2);

    if (!amount || !symbol || !contract_type || !duration || !duration_unit) {
        return null;
    }

    return {
        buy: '1',
        price: amount,
        parameters: {
            amount,
            basis,
            contract_type,
            duration,
            duration_unit,
            symbol,
            ...(currency ? { currency } : {}),
            ...(barrier ? { barrier } : {}),
            ...(barrier2 ? { barrier2 } : {}),
        },
    };
};
