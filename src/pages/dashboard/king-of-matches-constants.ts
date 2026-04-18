/**
 * Fallback when `active_symbols` is empty — common Deriv synthetic index symbols (ticks).
 * Live list is loaded from API (`market === synthetic_index`).
 */
export const KOM_FALLBACK_SYNTHETIC_SYMBOLS = [
    '1HZ10V',
    '1HZ25V',
    '1HZ50V',
    '1HZ75V',
    '1HZ100V',
    '1HZ150V',
    '1HZ200V',
    '1HZ250V',
    '1HZ300V',
    'R_10',
    'R_25',
    'R_50',
    'R_75',
    'R_100',
    'JD10',
    'JD25',
    'JD50',
    'JD75',
    'JD100',
    'JD150',
    'JD200',
    'BOOM300N',
    'BOOM500',
    'BOOM1000',
    'CRASH300N',
    'CRASH500',
    'CRASH1000',
    'RDBEAR',
    'RDBULL',
    'STPRNG',
    'WLDAUD',
    'WLDEUR',
    'WLDGBP',
    'WLDXAU',
    'WLDUSD',
] as const;

export const KOM_DEFAULT_SYMBOL = 'R_100';
export const KOM_DEFAULT_TICK_COUNT = 1000;
export const KOM_MIN_TICKS = 100;
export const KOM_MAX_TICKS = 5000;
