import React from 'react';
import classNames from 'classnames';
import { LegacyClose1pxIcon } from '@deriv/quill-icons/Legacy';
import { toast } from 'react-toastify';
import { getMarketNamesMap } from '@/components/shared/utils/constants/contract';
import { Localize, localize } from '@deriv-com/translations';
import { useStore } from '@/hooks/useStore';
import {
    getKomPipSize,
    komCountDigits,
    komFetchSyntheticIndexSymbols,
    komFetchTickQuotes,
    komLastDigitFromQuote,
    komSubscribeTicks,
} from './king-of-matches-api';
import {
    KOM_DEFAULT_SYMBOL,
    KOM_DEFAULT_TICK_COUNT,
    KOM_FALLBACK_SYNTHETIC_SYMBOLS,
    KOM_MAX_TICKS,
    KOM_MIN_TICKS,
} from './king-of-matches-constants';
import {
    KOM_MAX_BATCH_LEGS,
    komFetchOpenContractSnapshot,
    komPlaceDigitTrade,
    komPlaceDigitTradesBatch,
    type TKomDigitTradeMode,
} from './king-of-matches-trade';
import './king-of-matches.scss';

const KOM_CLOSED_HISTORY_CAP = 40;

type TKomOpenContractRow = {
    key: string;
    contract_id: string;
    digit: number;
    stake: number;
    buy_price?: number;
    mode: TKomDigitTradeMode;
    symbol: string;
    currency: string;
    /** Indicative P/L while running */
    live_profit?: number;
};

type TKomClosedContractRow = {
    key: string;
    contract_id: string;
    digit: number;
    stake: number;
    profit: number;
    mode: TKomDigitTradeMode;
    symbol: string;
    currency: string;
    closed_at: number;
};

type TMultiLeg = { key: string; digit: number; stake_input: string };

function newLegKey(): string {
    return `kom-leg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampKomStake(n: number): number {
    return Math.min(5000, Math.max(0.35, n));
}

export type TKingOfMatchesPanelProps = {
    onClose: () => void;
};

type TBar = {
    digit: number;
    count: number;
    pct: number;
    tier: 'most' | 'least';
};

type TChartModel = {
    bars: TBar[];
    mostDigits: number[];
    leastDigits: number[];
    recommendedDiffersDigit: number | null;
};

/**
 * Five leaf-green (most frequent): left → right by decreasing %, bar height follows % (tallest = highest %).
 * Five red (least frequent): left → right by decreasing % among that group, bar height is inverted so
 * lower % → taller bar (rightmost = rarest = tallest red, best Differs cue).
 */
function buildChartModel(counts: number[], total: number): TChartModel {
    if (total <= 0) {
        return { bars: [], mostDigits: [], leastDigits: [], recommendedDiffersDigit: null };
    }
    const entries = counts.map((count, digit) => ({ digit, count }));
    const sortedDesc = [...entries].sort((a, b) => b.count - a.count || a.digit - b.digit);
    const top5 = sortedDesc.slice(0, 5);
    const bottom5 = sortedDesc.slice(5, 10);
    const bottomSorted = [...bottom5].sort((a, b) => b.count - a.count || a.digit - b.digit);
    const ordered = [...top5, ...bottomSorted];
    const leastDigitsSet = new Set(bottomSorted.map(e => e.digit));

    const bars: TBar[] = ordered.map(e => ({
        digit: e.digit,
        count: e.count,
        pct: (e.count / total) * 100,
        tier: leastDigitsSet.has(e.digit) ? 'least' : 'most',
    }));

    const recommendedDiffersDigit =
        bottomSorted.length > 0 ? bottomSorted[bottomSorted.length - 1].digit : null;

    return {
        bars,
        mostDigits: top5.map(e => e.digit),
        leastDigits: bottomSorted.map(e => e.digit),
        recommendedDiffersDigit,
    };
}

/** Shortest / tallest bar fill as % of the column track (spread within each group so digits sit at different levels). */
const KOM_BAR_TRACK_FILL_MIN_PCT = 18;
const KOM_BAR_TRACK_FILL_MAX_PCT = 82;
/** < 1 exaggerates differences when sample percentages are close (stronger y separation). */
const KOM_BAR_HEIGHT_GAMMA = 0.68;

/** Display height % for bar fill: green tier scales with % range in top 5; red uses inverted ranks within bottom 5. */
function barDisplayHeightPct(bar: TBar, bars: TBar[]): number {
    const most_bars = bars.filter(b => b.tier === 'most');
    const reds = bars.filter(b => b.tier === 'least');
    const eps = 1e-9;
    const span = KOM_BAR_TRACK_FILL_MAX_PCT - KOM_BAR_TRACK_FILL_MIN_PCT;

    const mapShaped = (t01: number) => {
        const clamped = Math.min(1, Math.max(0, t01));
        return KOM_BAR_TRACK_FILL_MIN_PCT + Math.pow(clamped, KOM_BAR_HEIGHT_GAMMA) * span;
    };

    if (bar.tier === 'most') {
        const minT = Math.min(...most_bars.map(b => b.pct));
        const maxT = Math.max(...most_bars.map(b => b.pct));
        const range = Math.max(maxT - minT, eps);
        const t = (bar.pct - minT) / range;
        return mapShaped(t);
    }

    const minPct = Math.min(...reds.map(b => b.pct));
    const rawHeights = reds.map((b, j) => {
        const inv = minPct / Math.max(b.pct, eps);
        return inv * (1 + j * 0.02);
    });
    const idx = reds.findIndex(b => b.digit === bar.digit);
    if (idx < 0) return KOM_BAR_TRACK_FILL_MIN_PCT;
    const minRaw = Math.min(...rawHeights);
    const maxRaw = Math.max(...rawHeights, eps);
    const rawRange = Math.max(maxRaw - minRaw, eps);
    /** Full 0–1 spread like green tier — dividing only by maxRaw kept reds ~0.85–1.0 (flat). */
    const t = (rawHeights[idx] - minRaw) / rawRange;
    return mapShaped(t);
}

function clampTickInput(n: number): number {
    return Math.min(KOM_MAX_TICKS, Math.max(KOM_MIN_TICKS, Math.floor(n)));
}

export const KingOfMatchesPanel = ({ onClose }: TKingOfMatchesPanelProps) => {
    const { client } = useStore();
    const marketNames = React.useMemo(() => getMarketNamesMap(), []);

    const [symbol, setSymbol] = React.useState(KOM_DEFAULT_SYMBOL);
    const [tickCount, setTickCount] = React.useState(KOM_DEFAULT_TICK_COUNT);
    const [tickInput, setTickInput] = React.useState(String(KOM_DEFAULT_TICK_COUNT));
    const [quotes, setQuotes] = React.useState<number[]>([]);
    const [liveDigit, setLiveDigit] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [matchHighlight, setMatchHighlight] = React.useState<'most' | 'least' | null>(null);
    const [marketOptions, setMarketOptions] = React.useState<{ symbol: string; display_name: string }[]>([]);

    const [trade_mode, setTradeMode] = React.useState<TKomDigitTradeMode>('match');
    const [trade_stake, setTradeStake] = React.useState(1);
    const [trade_stake_input, setTradeStakeInput] = React.useState('1');
    const [trade_digit, setTradeDigit] = React.useState<number | null>(null);
    const [trade_duration_ticks, setTradeDurationTicks] = React.useState(1);
    const [trade_busy, setTradeBusy] = React.useState(false);

    /** `single` = one digit key; `multi` = queue up to five legs (each own stake). */
    const [digit_trade_layout, setDigitTradeLayout] = React.useState<'single' | 'multi'>('single');
    const [multi_legs, setMultiLegs] = React.useState<TMultiLeg[]>([]);
    const [open_contract_rows, setOpenContractRows] = React.useState<TKomOpenContractRow[]>([]);
    const [closed_contract_rows, setClosedContractRows] = React.useState<TKomClosedContractRow[]>([]);

    const open_contract_rows_ref = React.useRef<TKomOpenContractRow[]>([]);
    React.useEffect(() => {
        open_contract_rows_ref.current = open_contract_rows;
    }, [open_contract_rows]);

    const tickCountRef = React.useRef(tickCount);
    tickCountRef.current = tickCount;

    const pipSize = React.useMemo(() => getKomPipSize(symbol), [symbol]);
    const pipSizeRef = React.useRef(pipSize);
    pipSizeRef.current = pipSize;

    React.useEffect(() => {
        let cancelled = false;
        komFetchSyntheticIndexSymbols().then(rows => {
            if (cancelled) return;
            const list =
                rows.length > 0
                    ? rows
                    : KOM_FALLBACK_SYNTHETIC_SYMBOLS.map(sym => ({
                          symbol: sym,
                          display_name: (marketNames as Record<string, string>)[sym] ?? sym,
                      }));
            setMarketOptions(list);
        });
        return () => {
            cancelled = true;
        };
    }, [marketNames]);

    React.useEffect(() => {
        if (marketOptions.length === 0) return;
        if (!marketOptions.some(o => o.symbol === symbol)) {
            setSymbol(marketOptions[0].symbol);
        }
    }, [marketOptions, symbol]);

    const applyTickCount = React.useCallback(() => {
        const parsed = Number.parseInt(tickInput, 10);
        const v = Number.isNaN(parsed) ? KOM_DEFAULT_TICK_COUNT : clampTickInput(parsed);
        setTickCount(v);
        setTickInput(String(v));
    }, [tickInput]);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        komFetchTickQuotes(symbol, tickCount).then(qs => {
            if (cancelled) return;
            if (qs.length === 0) {
                setError(localize('Could not load ticks. Check connection or try another market.'));
                setQuotes([]);
            } else {
                setQuotes(qs);
                const lastQ = qs[qs.length - 1];
                setLiveDigit(komLastDigitFromQuote(lastQ, pipSize));
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [symbol, tickCount, pipSize]);

    React.useEffect(() => {
        const stop = komSubscribeTicks(symbol, quote => {
            const pip = pipSizeRef.current;
            setLiveDigit(komLastDigitFromQuote(quote, pip));
            setQuotes(prev => {
                const q = typeof quote === 'number' ? quote : Number(quote);
                if (Number.isNaN(q)) return prev;
                const max = tickCountRef.current;
                const next = [...prev, q];
                if (next.length > max) return next.slice(-max);
                return next;
            });
        });
        return stop;
    }, [symbol]);

    const counts = React.useMemo(() => komCountDigits(quotes, pipSize), [quotes, pipSize]);
    const total = quotes.length;
    const chartModel = React.useMemo(() => buildChartModel(counts, total), [counts, total]);
    const { bars, mostDigits, leastDigits, recommendedDiffersDigit } = chartModel;

    const apply_trade_stake = React.useCallback(() => {
        const n = Number.parseFloat(trade_stake_input.replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) {
            setTradeStakeInput(String(trade_stake));
            return;
        }
        const clamped = clampKomStake(n);
        setTradeStake(clamped);
        setTradeStakeInput(String(clamped));
    }, [trade_stake_input, trade_stake]);

    const parse_leg_stake = React.useCallback(
        (stake_input: string) => {
            const n = Number.parseFloat(stake_input.replace(',', '.'));
            if (!Number.isFinite(n) || n <= 0) return trade_stake;
            return clampKomStake(n);
        },
        [trade_stake]
    );

    const on_place_digit_trade = React.useCallback(async () => {
        if (!client.is_logged_in || !client.currency) {
            toast.error(localize('Log in and select an account to trade.'));
            return;
        }
        if (digit_trade_layout === 'single') {
            if (trade_digit === null) {
                toast.error(localize('Choose a digit from 0–9.'));
                return;
            }
        } else if (multi_legs.length === 0) {
            toast.error(localize('Add up to five digits (tap the pad for each leg).'));
            return;
        }
        setTradeBusy(true);
        try {
            if (digit_trade_layout === 'single' && trade_digit !== null) {
                const { contract_id, buy_price } = await komPlaceDigitTrade({
                    symbol,
                    mode: trade_mode,
                    digit: trade_digit,
                    stake: trade_stake,
                    currency: client.currency,
                    duration: trade_duration_ticks,
                    duration_unit_api: 't',
                });
                if (contract_id) {
                    setOpenContractRows(prev => [
                        ...prev,
                        {
                            key: `kom-open-${contract_id}`,
                            contract_id,
                            digit: trade_digit,
                            stake: trade_stake,
                            buy_price,
                            mode: trade_mode,
                            symbol,
                            currency: client.currency,
                        },
                    ]);
                    toast.success(
                        localize('Contract {{id}} opened — {{mode}}, digit {{d}}.', {
                            id: contract_id,
                            mode: trade_mode === 'match' ? 'Match' : 'Differs',
                            d: String(trade_digit),
                        })
                    );
                } else {
                    toast.success(localize('Order placed.'));
                }
                return;
            }

            const legs = multi_legs.map(l => ({
                digit: l.digit,
                stake: parse_leg_stake(l.stake_input),
            }));
            const results = await komPlaceDigitTradesBatch({
                symbol,
                mode: trade_mode,
                legs,
                currency: client.currency,
                duration: trade_duration_ticks,
                duration_unit_api: 't',
            });
            const new_open: TKomOpenContractRow[] = [];
            let err_n = 0;
            for (const r of results) {
                if (r.error) err_n += 1;
                else if (r.contract_id) {
                    new_open.push({
                        key: `kom-open-${r.contract_id}`,
                        contract_id: r.contract_id,
                        digit: r.digit,
                        stake: r.stake,
                        buy_price: r.buy_price,
                        mode: trade_mode,
                        symbol,
                        currency: client.currency,
                    });
                }
            }
            if (new_open.length > 0) {
                setOpenContractRows(prev => [...prev, ...new_open]);
                setMultiLegs([]);
            }
            if (err_n === 0 && new_open.length === results.length) {
                toast.success(
                    localize('{{n}} contracts opened.', {
                        n: String(new_open.length),
                    })
                );
            } else if (new_open.length > 0) {
                toast.warning(
                    localize('Opened {{ok}} of {{total}} ({{fail}} failed).', {
                        ok: String(new_open.length),
                        total: String(results.length),
                        fail: String(err_n),
                    })
                );
            } else {
                toast.error(localize('No contracts could be opened.'));
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : localize('Trade failed.'));
        } finally {
            setTradeBusy(false);
        }
    }, [
        client.currency,
        client.is_logged_in,
        digit_trade_layout,
        multi_legs,
        parse_leg_stake,
        symbol,
        trade_digit,
        trade_duration_ticks,
        trade_mode,
        trade_stake,
    ]);

    const on_digit_pad_click = React.useCallback(
        (d: number) => {
            if (trade_busy) return;
            if (digit_trade_layout === 'single') {
                setTradeDigit(d);
                return;
            }
            setMultiLegs(prev => {
                if (prev.length >= KOM_MAX_BATCH_LEGS) return prev;
                return [...prev, { key: newLegKey(), digit: d, stake_input: trade_stake_input }];
            });
        },
        [digit_trade_layout, trade_busy, trade_stake_input]
    );

    const remove_multi_leg = React.useCallback((key: string) => {
        setMultiLegs(prev => prev.filter(l => l.key !== key));
    }, []);

    const update_multi_leg_stake = React.useCallback((key: string, value: string) => {
        setMultiLegs(prev => prev.map(l => (l.key === key ? { ...l, stake_input: value } : l)));
    }, []);

    React.useEffect(() => {
        const id = window.setInterval(async () => {
            const rows = open_contract_rows_ref.current;
            if (rows.length === 0) return;
            const next_open: TKomOpenContractRow[] = [];
            const newly_closed: TKomClosedContractRow[] = [];
            for (const row of rows) {
                const snap = await komFetchOpenContractSnapshot(row.contract_id);
                if (!snap) {
                    next_open.push(row);
                    continue;
                }
                if (snap.settled) {
                    newly_closed.push({
                        key: `kom-closed-${row.contract_id}-${Date.now()}`,
                        contract_id: row.contract_id,
                        digit: row.digit,
                        stake: row.stake,
                        profit: snap.profit ?? 0,
                        mode: row.mode,
                        symbol: row.symbol,
                        currency: row.currency,
                        closed_at: Date.now(),
                    });
                } else {
                    next_open.push({
                        ...row,
                        buy_price: snap.buy_price ?? row.buy_price,
                        live_profit: snap.profit,
                    });
                }
            }
            setOpenContractRows(next_open);
            if (newly_closed.length > 0) {
                setClosedContractRows(prev =>
                    [...newly_closed, ...prev].slice(0, KOM_CLOSED_HISTORY_CAP)
                );
            }
        }, 4000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className='kom'>
            <header className='kom__header'>
                <button type='button' className='kom__close' onClick={onClose} aria-label={localize('Close')}>
                    <LegacyClose1pxIcon height='18px' width='18px' fill='currentColor' />
                </button>
                <div className='kom__title-row'>
                    <span className='kom__crown' aria-hidden>
                        👑
                    </span>
                    <h1 id='king-of-matches-heading' className='kom__title'>
                        <Localize i18n_default_text='king of Matches' />
                    </h1>
                </div>

                <div className='kom__controls'>
                    <label className='kom__field'>
                        <span className='kom__label'>
                            <Localize i18n_default_text='Market:' />
                        </span>
                        <select
                            className='kom__select'
                            value={symbol}
                            onChange={e => setSymbol(e.target.value)}
                            disabled={loading || marketOptions.length === 0}
                        >
                            {marketOptions.map(opt => (
                                <option key={opt.symbol} value={opt.symbol}>
                                    {opt.display_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='kom__field kom__field--ticks'>
                        <span className='kom__label'>
                            <Localize i18n_default_text='Ticks:' />
                        </span>
                        <input
                            type='number'
                            className='kom__input'
                            min={KOM_MIN_TICKS}
                            max={KOM_MAX_TICKS}
                            value={tickInput}
                            onChange={e => setTickInput(e.target.value)}
                            onBlur={applyTickCount}
                            onKeyDown={e => {
                                if (e.key === 'Enter') applyTickCount();
                            }}
                        />
                    </label>
                    <div className='kom__badges-row'>
                        <div className='kom__recommended-wrap'>
                            <span className='kom__recommended-label'>
                                <Localize i18n_default_text='Recommended digit' />
                            </span>
                            <div
                                className='kom__recommended-badge'
                                aria-live='polite'
                                title={localize('Lowest frequency in sample — typical Differs pick')}
                            >
                                {recommendedDiffersDigit !== null ? recommendedDiffersDigit : '—'}
                            </div>
                        </div>
                        <div className='kom__live-wrap kom__live-wrap--side'>
                            <span className='kom__live-label'>
                                <Localize i18n_default_text='Live last digit' />
                            </span>
                            <div className='kom__live-digit kom__live-digit--compact' aria-live='polite'>
                                {liveDigit !== null ? liveDigit : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className='kom__body'>
                {error && <p className='kom__error'>{error}</p>}
                {loading && !error ? (
                    <div className='kom__loading'>
                        <Localize i18n_default_text='Loading ticks…' />
                    </div>
                ) : (
                    <>
                        <div className='kom__chart-card'>
                            <div className='kom__chart'>
                                {bars.map((bar, i) => (
                                    <div
                                        key={`kom-bar-${i}-${bar.digit}`}
                                        className={classNames('kom__bar-col', {
                                            'kom__bar-col--red-block-start': bar.tier === 'least' && i > 0 && bars[i - 1]?.tier === 'most',
                                        })}
                                    >
                                        <div className='kom__bar-meta'>
                                            <span className='kom__bar-pct'>{bar.pct.toFixed(2)}%</span>
                                        </div>
                                        <div className='kom__bar-track'>
                                            <div
                                                className={`kom__bar-fill kom__bar-fill--${bar.tier}`}
                                                style={{ height: `${barDisplayHeightPct(bar, bars)}%` }}
                                            >
                                                <span className={`kom__bar-digit kom__bar-digit--${bar.tier}`}>
                                                    {bar.digit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='kom__legend'>
                                <span className='kom__legend-item kom__legend-item--most'>
                                    <Localize i18n_default_text='Green: five most frequent (bar height = share %)' />
                                </span>
                                <span className='kom__legend-item kom__legend-item--least'>
                                    <Localize i18n_default_text='Red: five least frequent (inverted height — rarer = taller)' />
                                </span>
                            </div>
                        </div>

                        <div className='kom__actions'>
                            <button
                                type='button'
                                className={classNames('kom__btn kom__btn--most', {
                                    'kom__btn--active': matchHighlight === 'most',
                                })}
                                onClick={() => setMatchHighlight(matchHighlight === 'most' ? null : 'most')}
                            >
                                <Localize i18n_default_text='Match most appearing digits' />
                            </button>
                            <button
                                type='button'
                                className={classNames('kom__btn kom__btn--least', {
                                    'kom__btn--active': matchHighlight === 'least',
                                })}
                                onClick={() => setMatchHighlight(matchHighlight === 'least' ? null : 'least')}
                            >
                                <Localize i18n_default_text='Match least appearing digits (Differs)' />
                            </button>
                        </div>
                        {matchHighlight && total > 0 && (
                            <p className='kom__match-summary'>
                                {matchHighlight === 'most' ? (
                                    <>
                                        <Localize i18n_default_text='Digits for Match (top 5):' />{' '}
                                        <strong>{mostDigits.join(', ')}</strong>
                                    </>
                                ) : (
                                    <>
                                        <Localize i18n_default_text='Digits for Differs (bottom 5):' />{' '}
                                        <strong>{leastDigits.join(', ')}</strong>
                                    </>
                                )}
                            </p>
                        )}

                        <section className='kom__trade-dock' aria-labelledby='kom-trade-dock-heading'>
                            <div className='kom__trade-dock-glow' aria-hidden />
                            <h2 id='kom-trade-dock-heading' className='kom__trade-dock-title'>
                                <Localize i18n_default_text='Digit trade dock' />
                            </h2>
                            <p className='kom__trade-dock-lede'>
                                <Localize i18n_default_text='Stake on the last tick digit — Match wins if it equals your pick; Differs wins if it does not (same as Quick Strategy digit contracts).' />
                            </p>

                            <div className='kom__trade-mode' role='group' aria-label={localize('Contract type')}>
                                <button
                                    type='button'
                                    className={classNames('kom__trade-mode-btn', {
                                        'kom__trade-mode-btn--match-on': trade_mode === 'match',
                                    })}
                                    onClick={() => setTradeMode('match')}
                                >
                                    <Localize i18n_default_text='Match' />
                                </button>
                                <button
                                    type='button'
                                    className={classNames('kom__trade-mode-btn', {
                                        'kom__trade-mode-btn--diff-on': trade_mode === 'diff',
                                    })}
                                    onClick={() => setTradeMode('diff')}
                                >
                                    <Localize i18n_default_text='Differs' />
                                </button>
                            </div>

                            <div
                                className='kom__trade-layout-toggle'
                                role='group'
                                aria-label={localize('How many digits to trade')}
                            >
                                <button
                                    type='button'
                                    className={classNames('kom__trade-layout-btn', {
                                        'kom__trade-layout-btn--on': digit_trade_layout === 'single',
                                    })}
                                    onClick={() => setDigitTradeLayout('single')}
                                    disabled={trade_busy}
                                >
                                    <Localize i18n_default_text='One digit' />
                                </button>
                                <button
                                    type='button'
                                    className={classNames('kom__trade-layout-btn', {
                                        'kom__trade-layout-btn--on': digit_trade_layout === 'multi',
                                    })}
                                    onClick={() => {
                                        setDigitTradeLayout('multi');
                                        setMultiLegs(prev => {
                                            if (prev.length > 0) return prev;
                                            if (trade_digit !== null) {
                                                return [
                                                    {
                                                        key: newLegKey(),
                                                        digit: trade_digit,
                                                        stake_input: trade_stake_input,
                                                    },
                                                ];
                                            }
                                            return prev;
                                        });
                                    }}
                                    disabled={trade_busy}
                                >
                                    {localize('Up to {{max}} digits (batch)', {
                                        max: String(KOM_MAX_BATCH_LEGS),
                                    })}
                                </button>
                            </div>

                            <div className='kom__trade-row kom__trade-row--stake'>
                                <label className='kom__trade-field'>
                                    <span className='kom__trade-label'>
                                        <Localize i18n_default_text='Stake' /> ({client.currency ?? '—'})
                                    </span>
                                    <input
                                        type='number'
                                        className='kom__trade-input'
                                        min={0.35}
                                        step={0.01}
                                        value={trade_stake_input}
                                        onChange={e => setTradeStakeInput(e.target.value)}
                                        onBlur={apply_trade_stake}
                                        disabled={trade_busy}
                                    />
                                </label>
                                <label className='kom__trade-field kom__trade-field--ticks'>
                                    <span className='kom__trade-label'>
                                        <Localize i18n_default_text='Ticks' />
                                    </span>
                                    <input
                                        type='number'
                                        className='kom__trade-input'
                                        min={1}
                                        max={10}
                                        value={trade_duration_ticks}
                                        onChange={e =>
                                            setTradeDurationTicks(
                                                Math.min(10, Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                                            )
                                        }
                                        disabled={trade_busy}
                                    />
                                </label>
                            </div>

                            <p className='kom__digit-hint'>
                                {digit_trade_layout === 'single' ? (
                                    <Localize i18n_default_text='Tap one digit to trade.' />
                                ) : (
                                    <Localize i18n_default_text='Tap the pad to add each leg (same digit allowed). Max five.' />
                                )}
                            </p>

                            <div className='kom__digit-pad-wrap'>
                                <div
                                    className='kom__digit-pad'
                                    role='group'
                                    aria-label={localize('Digit to match or differ')}
                                >
                                    {Array.from({ length: 10 }, (_, d) => {
                                        const queue_count = multi_legs.filter(l => l.digit === d).length;
                                        return (
                                            <button
                                                key={`kom-digit-${d}`}
                                                type='button'
                                                className={classNames('kom__digit-key', {
                                                    'kom__digit-key--selected':
                                                        digit_trade_layout === 'single' && trade_digit === d,
                                                    'kom__digit-key--match':
                                                        digit_trade_layout === 'single' &&
                                                        trade_mode === 'match' &&
                                                        trade_digit === d,
                                                    'kom__digit-key--diff':
                                                        digit_trade_layout === 'single' &&
                                                        trade_mode === 'diff' &&
                                                        trade_digit === d,
                                                    'kom__digit-key--queued':
                                                        digit_trade_layout === 'multi' && queue_count > 0,
                                                })}
                                                onClick={() => on_digit_pad_click(d)}
                                                disabled={trade_busy}
                                            >
                                                <span className='kom__digit-key-num'>{d}</span>
                                                {digit_trade_layout === 'multi' && queue_count > 0 ? (
                                                    <span className='kom__digit-key-badge' aria-hidden>
                                                        {queue_count}
                                                    </span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {digit_trade_layout === 'multi' && multi_legs.length > 0 && (
                                <ul className='kom__multi-legs' aria-label={localize('Trade legs')}>
                                    {multi_legs.map((leg, idx) => (
                                        <li key={leg.key} className='kom__multi-leg'>
                                            <span className='kom__multi-leg-idx'>{idx + 1}</span>
                                            <span className='kom__multi-leg-digit'>{leg.digit}</span>
                                            <label className='kom__multi-leg-stake'>
                                                <span className='kom__multi-leg-stake-label'>
                                                    <Localize i18n_default_text='Stake' />
                                                </span>
                                                <input
                                                    type='number'
                                                    className='kom__multi-leg-stake-input'
                                                    min={0.35}
                                                    step={0.01}
                                                    value={leg.stake_input}
                                                    onChange={e => update_multi_leg_stake(leg.key, e.target.value)}
                                                    disabled={trade_busy}
                                                />
                                            </label>
                                            <button
                                                type='button'
                                                className='kom__multi-leg-remove'
                                                onClick={() => remove_multi_leg(leg.key)}
                                                disabled={trade_busy}
                                                aria-label={localize('Remove leg')}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <button
                                type='button'
                                className='kom__trade-submit'
                                onClick={on_place_digit_trade}
                                disabled={
                                    trade_busy ||
                                    !client.is_logged_in ||
                                    (digit_trade_layout === 'single' && trade_digit === null) ||
                                    (digit_trade_layout === 'multi' && multi_legs.length === 0)
                                }
                            >
                                {trade_busy ? (
                                    <Localize i18n_default_text='Placing…' />
                                ) : digit_trade_layout === 'multi' ? (
                                    localize('Place {{n}} trades', { n: String(multi_legs.length) })
                                ) : (
                                    <Localize i18n_default_text='Place trade' />
                                )}
                            </button>
                            {!client.is_logged_in && (
                                <p className='kom__trade-hint'>
                                    <Localize i18n_default_text='Sign in to place trades.' />
                                </p>
                            )}
                        </section>

                        <section
                            className='kom__contracts-panel'
                            aria-labelledby='kom-contracts-panel-heading'
                        >
                            <h2 id='kom-contracts-panel-heading' className='kom__contracts-panel-title'>
                                <Localize i18n_default_text='Contracts from this session' />
                            </h2>
                            <p className='kom__contracts-panel-lede'>
                                <Localize i18n_default_text='Open positions update every few seconds; closed rows show final profit or loss.' />
                            </p>
                            <div className='kom__contracts-grid'>
                                <div className='kom__contracts-card'>
                                    <h3 className='kom__contracts-card-title'>
                                        <Localize i18n_default_text='Open' />
                                    </h3>
                                    {open_contract_rows.length === 0 ? (
                                        <p className='kom__contracts-empty'>
                                            <Localize i18n_default_text='No open contracts yet.' />
                                        </p>
                                    ) : (
                                        <div className='kom__contracts-table-wrap'>
                                            <table className='kom__contracts-table'>
                                                <thead>
                                                    <tr>
                                                        <th>
                                                            <Localize i18n_default_text='ID' />
                                                        </th>
                                                        <th>
                                                            <Localize i18n_default_text='Digit' />
                                                        </th>
                                                        <th>
                                                            <Localize i18n_default_text='Stake' />
                                                        </th>
                                                        <th>
                                                            <Localize i18n_default_text='P/L' />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {open_contract_rows.map(row => (
                                                        <tr key={row.key}>
                                                            <td className='kom__contracts-mono' title={row.contract_id}>
                                                                {row.contract_id.length > 10
                                                                    ? `${row.contract_id.slice(0, 8)}…`
                                                                    : row.contract_id}
                                                            </td>
                                                            <td>{row.digit}</td>
                                                            <td>
                                                                {row.stake.toFixed(2)} {row.currency}
                                                            </td>
                                                            <td
                                                                className={classNames({
                                                                    'kom__contracts-pl--pos':
                                                                        row.live_profit != null &&
                                                                        row.live_profit >= 0,
                                                                    'kom__contracts-pl--neg':
                                                                        row.live_profit != null &&
                                                                        row.live_profit < 0,
                                                                })}
                                                            >
                                                                {row.live_profit != null
                                                                    ? `${row.live_profit >= 0 ? '+' : ''}${row.live_profit.toFixed(2)}`
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className='kom__contracts-card'>
                                    <h3 className='kom__contracts-card-title'>
                                        <Localize i18n_default_text='Closed' />
                                    </h3>
                                    {closed_contract_rows.length === 0 ? (
                                        <p className='kom__contracts-empty'>
                                            <Localize i18n_default_text='No settled contracts yet.' />
                                        </p>
                                    ) : (
                                        <div className='kom__contracts-table-wrap'>
                                            <table className='kom__contracts-table'>
                                                <thead>
                                                    <tr>
                                                        <th>
                                                            <Localize i18n_default_text='Digit' />
                                                        </th>
                                                        <th>
                                                            <Localize i18n_default_text='Stake' />
                                                        </th>
                                                        <th>
                                                            <Localize i18n_default_text='Result' />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {closed_contract_rows.map(row => (
                                                        <tr key={row.key}>
                                                            <td>{row.digit}</td>
                                                            <td>
                                                                {row.stake.toFixed(2)} {row.currency}
                                                            </td>
                                                            <td
                                                                className={classNames({
                                                                    'kom__contracts-pl--pos': row.profit >= 0,
                                                                    'kom__contracts-pl--neg': row.profit < 0,
                                                                })}
                                                            >
                                                                {row.profit >= 0 ? '+' : ''}
                                                                {row.profit.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};
