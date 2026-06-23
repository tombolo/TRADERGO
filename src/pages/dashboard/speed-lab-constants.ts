/** Contract lists & durations come from Quick Strategy’s `contracts_for` API (see `speed-lab-qs-data.ts`). */

export type TSpeedLabTradingMode = 'single_fast' | 'multiple' | 'hedge' | 'multi_market';

/** Default underlying: Volatility 10 (1s) — see `contract.ts` / `AIMarketScanner` symbol map (`1HZ10V`). */
export const SPEED_LAB_DEFAULT_ASSET_SYMBOL = '1HZ10V';
