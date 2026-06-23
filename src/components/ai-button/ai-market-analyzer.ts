import { ApiHelpers, api_base } from '@/external/bot-skeleton';
import { getKomPipSize, komCountDigits, komFetchTickQuotes } from '@/pages/dashboard/king-of-matches-api';

/** Expected hit-rate under a uniform digit distribution (7 winning digits / 10). */
export const AI_SCANNER_BASELINE_PCT = 70;

export const SCAN_DIGIT_COUNT = 1000;

export type TScannerMarket = {
    symbol: string;
    displayName: string;
};

export type TMarketAnalysis = {
    symbol: string;
    displayName: string;
    tickCount: number;
    prediction: 'over2' | 'under7';
    predictionValue: 2 | 7;
    over2Pct: number;
    under7Pct: number;
    over2Count: number;
    under7Count: number;
    totalCount: number;
    edgePct: number;
    confidence: number;
    momentumPct: number;
    alignment: number;
    structureScore: number;
    compositeScore: number;
    recentPct: number;
    fullPct: number;
    streakLength: number;
};

/** Standard + 1s Volatility Index symbols (R_* and 1HZ*V). */
const VOLATILITY_SYMBOL_RE = /^(R_\d+|1HZ\d+V)$/;

const VOLATILITY_FALLBACK: TScannerMarket[] = [
    { symbol: '1HZ10V', displayName: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', displayName: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', displayName: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', displayName: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', displayName: 'Volatility 100 (1s) Index' },
    { symbol: '1HZ150V', displayName: 'Volatility 150 (1s) Index' },
    { symbol: '1HZ200V', displayName: 'Volatility 200 (1s) Index' },
    { symbol: '1HZ250V', displayName: 'Volatility 250 (1s) Index' },
    { symbol: '1HZ300V', displayName: 'Volatility 300 (1s) Index' },
    { symbol: 'R_10', displayName: 'Volatility 10 Index' },
    { symbol: 'R_25', displayName: 'Volatility 25 Index' },
    { symbol: 'R_50', displayName: 'Volatility 50 Index' },
    { symbol: 'R_75', displayName: 'Volatility 75 Index' },
    { symbol: 'R_100', displayName: 'Volatility 100 Index' },
];

export function isVolatilitySymbol(symbol: string, group?: string): boolean {
    if (group?.includes('Volatility')) return true;
    return VOLATILITY_SYMBOL_RE.test(symbol);
}

/** Open volatility indices only — R_* and 1HZ*V from Quick Strategy symbol list. */
export async function fetchVolatilityMarkets(): Promise<TScannerMarket[]> {
    try {
        const inst = ApiHelpers.instance as
            | {
                  active_symbols?: {
                      retrieveActiveSymbols: (forced?: boolean) => Promise<unknown>;
                      getSymbolsForBot: () => { value: string; text: string; group?: string; submarket?: string }[];
                      isSymbolClosed?: (symbol: string) => boolean;
                  };
              }
            | undefined;

        if (inst?.active_symbols?.getSymbolsForBot) {
            await inst.active_symbols.retrieveActiveSymbols(false).catch(() => undefined);
            const rows = inst.active_symbols.getSymbolsForBot();
            const seen = new Set<string>();
            const markets: TScannerMarket[] = [];

            for (const row of rows) {
                const sym = row.value;
                if (!sym || seen.has(sym) || !isVolatilitySymbol(sym, row.group)) continue;
                if (inst.active_symbols.isSymbolClosed?.(sym)) continue;
                seen.add(sym);
                markets.push({ symbol: sym, displayName: row.text || sym });
            }

            if (markets.length > 0) {
                return markets.sort((a, b) =>
                    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
                );
            }
        }
    } catch {
        /* fall through to static list */
    }

    return [...VOLATILITY_FALLBACK];
}

function extractDigits(quotes: number[], pipSize: number): number[] {
    return quotes.map(q => {
        const n = typeof q === 'number' ? q : Number(String(q).trim());
        if (!Number.isFinite(n)) return -1;
        const places = Math.max(0, Math.min(12, Math.floor(pipSize)));
        const fixed = n.toFixed(places);
        const last = fixed[fixed.length - 1];
        const d = Number.parseInt(last, 10);
        return Number.isNaN(d) ? -1 : d;
    }).filter(d => d >= 0 && d <= 9);
}

function isWinningDigit(digit: number, prediction: 'over2' | 'under7'): boolean {
    return prediction === 'over2' ? digit > 2 : digit < 7;
}

function rateFromDigits(digits: number[], prediction: 'over2' | 'under7'): number {
    if (!digits.length) return 0;
    const wins = digits.filter(d => isWinningDigit(d, prediction)).length;
    return (wins / digits.length) * 100;
}

function digitCountsFromDigits(digits: number[]): number[] {
    const counts = new Array(10).fill(0) as number[];
    for (const d of digits) counts[d] += 1;
    return counts;
}

function digitStructureScore(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total < 10) return 0;
    const expected = total / 10;
    let chi = 0;
    for (const c of counts) {
        const diff = c - expected;
        chi += (diff * diff) / expected;
    }
    return chi;
}

function trailingStreak(digits: number[], prediction: 'over2' | 'under7'): number {
    let streak = 0;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        if (isWinningDigit(digits[i], prediction)) streak += 1;
        else break;
    }
    return streak;
}

function windowAlignment(fullPct: number, recentPct: number): number {
    const diff = Math.abs(fullPct - recentPct);
    return Math.max(0, 100 - diff * 4);
}

function buildConfidence(params: {
    edgePct: number;
    alignment: number;
    structureScore: number;
    momentumPct: number;
    streakLength: number;
}): number {
    const { edgePct, alignment, structureScore, momentumPct, streakLength } = params;
    const edgeScore = Math.min(38, Math.max(0, edgePct * 7));
    const alignScore = (alignment / 100) * 22;
    const structureComponent = Math.min(14, structureScore * 0.85);
    const momentumBonus = Math.min(10, Math.max(0, momentumPct * 2.5));
    const streakBonus = Math.min(8, streakLength * 0.4);
    const sampleBonus = 18; // full 1,000-digit sample always present when analysis runs

    return Math.round(
        Math.min(100, Math.max(0, edgeScore + sampleBonus + alignScore + structureComponent + momentumBonus + streakBonus))
    );
}

/**
 * Deep analysis on exactly the last {@link SCAN_DIGIT_COUNT} tick digits.
 * Multi-window blend: 1,000 / 500 / 250 / 100 ticks.
 */
export function analyzeQuotes(
    symbol: string,
    displayName: string,
    quotes: number[]
): TMarketAnalysis | null {
    const pipSize = getKomPipSize(symbol);
    const trimmed = quotes.slice(-SCAN_DIGIT_COUNT);
    if (trimmed.length < SCAN_DIGIT_COUNT) return null;

    const digits = extractDigits(trimmed, pipSize);
    if (digits.length < SCAN_DIGIT_COUNT) return null;

    const fullCounts = digitCountsFromDigits(digits);
    const totalCount = digits.length;

    const over2Count = digits.filter(d => d > 2).length;
    const under7Count = digits.filter(d => d < 7).length;
    const over2Pct = (over2Count / totalCount) * 100;
    const under7Pct = (under7Count / totalCount) * 100;

    const edgeOver2 = over2Pct - AI_SCANNER_BASELINE_PCT;
    const edgeUnder7 = under7Pct - AI_SCANNER_BASELINE_PCT;
    const prediction: 'over2' | 'under7' = edgeOver2 >= edgeUnder7 ? 'over2' : 'under7';

    const fullPct = prediction === 'over2' ? over2Pct : under7Pct;
    const edgePct = prediction === 'over2' ? edgeOver2 : edgeUnder7;

    const w500 = rateFromDigits(digits.slice(-500), prediction);
    const w250 = rateFromDigits(digits.slice(-250), prediction);
    const recentPct = rateFromDigits(digits.slice(-100), prediction);

    const weightedPct = fullPct * 0.35 + w500 * 0.3 + w250 * 0.2 + recentPct * 0.15;
    const momentumPct = recentPct - fullPct;
    const alignment = windowAlignment(fullPct, recentPct);
    const structureScore = digitStructureScore(fullCounts);
    const streakLength = trailingStreak(digits, prediction);

    const confidence = buildConfidence({
        edgePct,
        alignment,
        structureScore,
        momentumPct,
        streakLength,
    });

    const compositeScore =
        weightedPct * 0.5 +
        edgePct * 5 +
        confidence * 0.4 +
        alignment * 0.06 +
        Math.max(0, momentumPct) * 1.5 +
        Math.min(6, streakLength * 0.25);

    return {
        symbol,
        displayName,
        tickCount: totalCount,
        prediction,
        predictionValue: prediction === 'over2' ? 2 : 7,
        over2Pct,
        under7Pct,
        over2Count,
        under7Count,
        totalCount,
        edgePct,
        confidence,
        momentumPct,
        alignment,
        structureScore,
        compositeScore,
        recentPct,
        fullPct,
        streakLength,
    };
}

const MIN_EDGE_PCT = 1.2;

export function isActionableAnalysis(analysis: TMarketAnalysis): boolean {
    return (
        analysis.tickCount >= SCAN_DIGIT_COUNT &&
        analysis.edgePct >= MIN_EDGE_PCT &&
        analysis.confidence >= 40
    );
}

export function pickBestAnalysis(analyses: TMarketAnalysis[]): TMarketAnalysis | null {
    const actionable = analyses.filter(isActionableAnalysis);
    const pool = actionable.length > 0 ? actionable : analyses;
    if (!pool.length) return null;
    return pool.reduce((best, cur) => (cur.compositeScore > best.compositeScore ? cur : best));
}

export async function analyzeMarket(symbol: string, displayName: string): Promise<TMarketAnalysis | null> {
    const quotes = await komFetchTickQuotes(symbol, SCAN_DIGIT_COUNT);
    return analyzeQuotes(symbol, displayName, quotes);
}

const SCAN_CONCURRENCY = 4;

export async function scanVolatilityMarkets(
    markets: TScannerMarket[],
    onProgress: (payload: {
        completed: number;
        total: number;
        currentMarket: string;
        leader: TMarketAnalysis | null;
    }) => void
): Promise<TMarketAnalysis[]> {
    const results: TMarketAnalysis[] = [];
    let leader: TMarketAnalysis | null = null;
    let completed = 0;

    const runOne = async (market: TScannerMarket) => {
        try {
            const analysis = await analyzeMarket(market.symbol, market.displayName);
            if (analysis) {
                results.push(analysis);
                if (!leader || analysis.compositeScore > leader.compositeScore) {
                    leader = analysis;
                }
            }
        } catch {
            /* skip failed market */
        } finally {
            completed += 1;
            onProgress({
                completed,
                total: markets.length,
                currentMarket: market.displayName,
                leader,
            });
        }
    };

    for (let i = 0; i < markets.length; i += SCAN_CONCURRENCY) {
        const batch = markets.slice(i, i + SCAN_CONCURRENCY);
        await Promise.all(batch.map(runOne));
    }

    return results;
}

export async function waitForTradingApi(timeoutMs = 10000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (api_base.api) return true;
        await new Promise<void>(resolve => setTimeout(resolve, 150));
    }
    return Boolean(api_base.api);
}
