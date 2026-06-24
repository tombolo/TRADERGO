import React from 'react';
import classNames from 'classnames';
import { toast } from 'react-toastify';
import { observer } from 'mobx-react-lite';
import AIModal from '@/components/ai-button/AIModal';
import { getMarketNamesMap } from '@/components/shared/utils/constants/contract';
import { useStore } from '@/hooks/useStore';
import {
    getKomPipSize,
    komCountDigits,
    komFetchSyntheticIndexSymbols,
    komFetchTickQuotes,
    komLastDigitFromQuote,
    komSubscribeTicks,
} from '@/pages/dashboard/king-of-matches-api';
import {
    KOM_DEFAULT_SYMBOL,
    KOM_DEFAULT_TICK_COUNT,
    KOM_FALLBACK_SYNTHETIC_SYMBOLS,
    KOM_MAX_TICKS,
    KOM_MIN_TICKS,
} from '@/pages/dashboard/king-of-matches-constants';
import { Localize, localize } from '@deriv-com/translations';
import { placeBulkEvenOddTrades, type TBulkEvenOddSide } from './bulk-trader-trade';
import './bulk-trader.scss';

const RECENT_CAP = 12;
const DIGIT_RING_COLORS = ['ring-red', 'ring-cyan', 'ring-orange', 'ring-blue'] as const;

function clampTickCount(n: number): number {
    return Math.min(KOM_MAX_TICKS, Math.max(KOM_MIN_TICKS, Math.floor(n)));
}

function clampStake(n: number): number {
    return Math.min(5000, Math.max(0.35, n));
}

function digitIsEven(d: number): boolean {
    return d % 2 === 0;
}

function formatPct(count: number, total: number): string {
    if (total <= 0) return '0.00%';
    return `${((count / total) * 100).toFixed(2)}%`;
}

const ChipIcon = () => (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <rect x='5' y='5' width='14' height='14' rx='2' stroke='currentColor' strokeWidth='1.5' />
        <path d='M9 9h6M9 12h6M9 15h4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
);

const GearIcon = () => (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
            d='M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'
            stroke='currentColor'
            strokeWidth='1.5'
        />
        <path
            d='M19.4 13.5a7.6 7.6 0 0 0 .1-3l2-1.2-2-3.5-2.3.7a7.5 7.5 0 0 0-2.6-1.5L14.5 2h-5L9.4 5.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-.7-2 3.5 2 1.2a7.6 7.6 0 0 0 .1 3l-2 1.2 2 3.5 2.3-.7a7.5 7.5 0 0 0 2.6 1.5L9.5 22h5l.5-3.5a7.5 7.5 0 0 0 2.6-1.5l2.3.7 2-3.5-2-1.2Z'
            stroke='currentColor'
            strokeWidth='1.2'
            strokeLinejoin='round'
        />
    </svg>
);

const BulkTrader = observer(() => {
    const { client } = useStore();
    const marketNames = React.useMemo(() => getMarketNamesMap(), []);

    const [symbol, setSymbol] = React.useState(KOM_DEFAULT_SYMBOL);
    const [tickCount, setTickCount] = React.useState(KOM_DEFAULT_TICK_COUNT);
    const [tickInput, setTickInput] = React.useState(String(KOM_DEFAULT_TICK_COUNT));
    const [quotes, setQuotes] = React.useState<number[]>([]);
    const [liveQuote, setLiveQuote] = React.useState<number | null>(null);
    const [liveDigit, setLiveDigit] = React.useState<number | null>(null);
    const [marketOptions, setMarketOptions] = React.useState<{ symbol: string; display_name: string }[]>([]);
    const [durationTicks, setDurationTicks] = React.useState(1);
    const [durationInput, setDurationInput] = React.useState('1');
    const [stake, setStake] = React.useState(0.5);
    const [stakeInput, setStakeInput] = React.useState('0.5');
    const [bulkCount, setBulkCount] = React.useState(1);
    const [bulkInput, setBulkInput] = React.useState('1');
    const [autoTrader, setAutoTrader] = React.useState(false);
    const [tradeBusy, setTradeBusy] = React.useState(false);
    const [status, setStatus] = React.useState('');
    const [statusError, setStatusError] = React.useState(false);
    const [aiOpen, setAiOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const pipSize = React.useMemo(() => getKomPipSize(symbol), [symbol]);
    const pipSizeRef = React.useRef(pipSize);
    pipSizeRef.current = pipSize;
    const tickCountRef = React.useRef(tickCount);
    tickCountRef.current = tickCount;

    React.useEffect(() => {
        let cancelled = false;
        komFetchSyntheticIndexSymbols().then(list => {
            if (cancelled) return;
            if (list.length > 0) {
                setMarketOptions(list);
            } else {
                setMarketOptions(
                    KOM_FALLBACK_SYNTHETIC_SYMBOLS.map(sym => ({
                        symbol: sym,
                        display_name: marketNames[sym] || sym,
                    }))
                );
            }
        });
        return () => {
            cancelled = true;
        };
    }, [marketNames]);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        komFetchTickQuotes(symbol, tickCount).then(qs => {
            if (cancelled) return;
            setQuotes(qs);
            if (qs.length > 0) {
                const last = qs[qs.length - 1];
                setLiveQuote(last);
                setLiveDigit(komLastDigitFromQuote(last, pipSize));
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
            const q = typeof quote === 'number' ? quote : Number(quote);
            if (Number.isNaN(q)) return;
            setLiveQuote(q);
            setLiveDigit(komLastDigitFromQuote(q, pip));
            setQuotes(prev => {
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

    const evenCount = React.useMemo(
        () => counts.reduce((sum, c, digit) => sum + (digitIsEven(digit) ? c : 0), 0),
        [counts]
    );
    const oddCount = total - evenCount;
    const evenPct = formatPct(evenCount, total);
    const oddPct = formatPct(oddCount, total);

    const rankedDigits = React.useMemo(() => {
        return Array.from({ length: 10 }, (_, digit) => ({ digit, count: counts[digit] })).sort(
            (a, b) => b.count - a.count || a.digit - b.digit
        );
    }, [counts]);

    const ringByDigit = React.useMemo(() => {
        const map = new Map<number, string>();
        rankedDigits.slice(0, 4).forEach((entry, idx) => {
            map.set(entry.digit, DIGIT_RING_COLORS[idx] ?? 'ring-red');
        });
        return map;
    }, [rankedDigits]);

    const recentResults = React.useMemo(() => {
        const slice = quotes.slice(-RECENT_CAP);
        return slice.map((q, i) => {
            const d = komLastDigitFromQuote(q, pipSize);
            return {
                key: `${i}-${q}`,
                even: digitIsEven(d),
            };
        });
    }, [quotes, pipSize]);

    const displayMarket = (sym: string) => marketOptions.find(m => m.symbol === sym)?.display_name || marketNames[sym] || sym;

    const handleTickCountBlur = () => {
        const n = clampTickCount(Number(tickInput) || KOM_DEFAULT_TICK_COUNT);
        setTickCount(n);
        setTickInput(String(n));
    };

    const handleTrade = async (side: TBulkEvenOddSide) => {
        const currency = client?.currency;
        if (!currency) {
            toast.error(localize('Please log in to trade.'));
            return;
        }
        const stakeVal = clampStake(stake);
        const duration = Math.min(Math.max(Math.floor(durationTicks), 1), 10);
        const count = Math.min(Math.max(Math.floor(bulkCount), 1), 50);

        setTradeBusy(true);
        setStatusError(false);
        setStatus(localize('Placing trades...'));

        try {
            const { placed, errors } = await placeBulkEvenOddTrades({
                symbol,
                side,
                stake: stakeVal,
                duration_ticks: duration,
                count,
                currency,
            });
            if (placed > 0) {
                setStatus(`${placed} ${side} trade(s) placed.`);
                toast.success(`${placed} contract(s) purchased.`);
            }
            if (errors.length > 0) {
                setStatusError(true);
                setStatus(errors[0]);
                toast.error(errors[0]);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : localize('Trade failed');
            setStatusError(true);
            setStatus(msg);
            toast.error(msg);
        } finally {
            setTradeBusy(false);
        }
    };

    return (
        <div className='bulk-trader-page'>
            <div className='bulk-trader'>
                <div className='bulk-trader__row bulk-trader__row--2col'>
                    <label className='bulk-trader__field'>
                        <span className='bulk-trader__label'>
                            <Localize i18n_default_text='Market' />
                        </span>
                        <select
                            className='bulk-trader__control'
                            value={symbol}
                            onChange={e => setSymbol(e.target.value)}
                        >
                            {(marketOptions.length
                                ? marketOptions
                                : [{ symbol, display_name: displayMarket(symbol) }]
                            ).map(opt => (
                                <option key={opt.symbol} value={opt.symbol}>
                                    {opt.display_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='bulk-trader__field'>
                        <span className='bulk-trader__label'>
                            <Localize i18n_default_text='Trade type' />
                        </span>
                        <select className='bulk-trader__control' value='even_odd' disabled>
                            <option value='even_odd'>
                                <Localize i18n_default_text='Even/Odd' />
                            </option>
                        </select>
                    </label>
                </div>

                <label className='bulk-trader__field'>
                    <span className='bulk-trader__label'>
                        <Localize i18n_default_text='Number of ticks' />
                    </span>
                    <input
                        className='bulk-trader__control'
                        type='number'
                        min={KOM_MIN_TICKS}
                        max={KOM_MAX_TICKS}
                        value={tickInput}
                        onChange={e => setTickInput(e.target.value)}
                        onBlur={handleTickCountBlur}
                    />
                </label>

                <div className='bulk-trader__tick-row'>
                    <div className='bulk-trader__current-tick'>
                        <span className='bulk-trader__current-tick-label'>
                            <Localize i18n_default_text='Current tick' />
                        </span>
                        <span className='bulk-trader__current-tick-value'>
                            {loading && liveQuote == null
                                ? '—'
                                : liveQuote != null
                                  ? liveQuote.toFixed(pipSize)
                                  : '—'}
                        </span>
                    </div>
                    <button type='button' className='bulk-trader__ai-scanner' onClick={() => setAiOpen(true)}>
                        <ChipIcon />
                        <Localize i18n_default_text='AI SCANNER' />
                    </button>
                </div>

                <div className='bulk-trader__digits' aria-label={localize('Digit distribution')}>
                    {counts.map((count, digit) => (
                        <div key={digit} className='bulk-trader__digit'>
                            <div
                                className={classNames('bulk-trader__digit-circle', {
                                    [`bulk-trader__digit-circle--${ringByDigit.get(digit)}`]: ringByDigit.has(digit),
                                    'bulk-trader__digit-circle--live': liveDigit === digit,
                                })}
                            >
                                {digit}
                            </div>
                            <span className='bulk-trader__digit-pct'>{formatPct(count, total)}</span>
                            {liveDigit === digit && <span className='bulk-trader__digit-marker' aria-hidden />}
                        </div>
                    ))}
                </div>

                <div className='bulk-trader__recent' aria-label={localize('Recent results')}>
                    {recentResults.map(r => (
                        <span
                            key={r.key}
                            className={classNames('bulk-trader__recent-badge', {
                                'bulk-trader__recent-badge--even': r.even,
                                'bulk-trader__recent-badge--odd': !r.even,
                            })}
                        >
                            {r.even ? 'E' : 'O'}
                        </span>
                    ))}
                </div>

                <div className='bulk-trader__row bulk-trader__row--3col'>
                    <label className='bulk-trader__field'>
                        <span className='bulk-trader__label'>
                            <Localize i18n_default_text='Ticks' />
                        </span>
                        <input
                            className='bulk-trader__control'
                            type='number'
                            min={1}
                            max={10}
                            value={durationInput}
                            onChange={e => setDurationInput(e.target.value)}
                            onBlur={() => {
                                const n = Math.min(10, Math.max(1, Math.floor(Number(durationInput) || 1)));
                                setDurationTicks(n);
                                setDurationInput(String(n));
                            }}
                        />
                    </label>
                    <label className='bulk-trader__field'>
                        <span className='bulk-trader__label'>
                            <Localize i18n_default_text='Stake' />
                        </span>
                        <input
                            className='bulk-trader__control'
                            type='number'
                            min={0.35}
                            step={0.01}
                            value={stakeInput}
                            onChange={e => setStakeInput(e.target.value)}
                            onBlur={() => {
                                const n = clampStake(Number(stakeInput) || 0.5);
                                setStake(n);
                                setStakeInput(String(n));
                            }}
                        />
                    </label>
                    <label className='bulk-trader__field'>
                        <span className='bulk-trader__label'>
                            <Localize i18n_default_text='No. of bulk trades' />
                        </span>
                        <input
                            className='bulk-trader__control'
                            type='number'
                            min={1}
                            max={50}
                            value={bulkInput}
                            onChange={e => setBulkInput(e.target.value)}
                            onBlur={() => {
                                const n = Math.min(50, Math.max(1, Math.floor(Number(bulkInput) || 1)));
                                setBulkCount(n);
                                setBulkInput(String(n));
                            }}
                        />
                    </label>
                </div>

                <div className='bulk-trader__auto-row'>
                    <button
                        type='button'
                        className={classNames('bulk-trader__auto-trader', {
                            'bulk-trader__auto-trader--active': autoTrader,
                        })}
                        onClick={() => setAutoTrader(v => !v)}
                    >
                        <GearIcon />
                        <Localize i18n_default_text='Auto trader' />
                    </button>
                </div>

                <div className='bulk-trader__actions'>
                    <button
                        type='button'
                        className='bulk-trader__trade-btn bulk-trader__trade-btn--even'
                        disabled={tradeBusy}
                        onClick={() => handleTrade('even')}
                    >
                        <span>
                            <Localize i18n_default_text='Even' />
                        </span>
                        <span className='bulk-trader__trade-pct'>{evenPct}</span>
                    </button>
                    <button
                        type='button'
                        className='bulk-trader__trade-btn bulk-trader__trade-btn--odd'
                        disabled={tradeBusy}
                        onClick={() => handleTrade('odd')}
                    >
                        <span>
                            <Localize i18n_default_text='Odd' />
                        </span>
                        <span className='bulk-trader__trade-pct'>{oddPct}</span>
                    </button>
                </div>

                {status ? (
                    <p className={classNames('bulk-trader__status', { 'bulk-trader__status--error': statusError })}>
                        {status}
                    </p>
                ) : null}
            </div>

            <AIModal isOpen={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
    );
});

export default BulkTrader;
