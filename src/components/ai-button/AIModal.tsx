import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import {
    AI_SCANNER_BASELINE_PCT,
    SCAN_DIGIT_COUNT,
    fetchVolatilityMarkets,
    pickBestAnalysis,
    scanVolatilityMarkets,
    waitForTradingApi,
    type TMarketAnalysis,
} from './ai-market-analyzer';
import './ai-modal.scss';

type ModalPhase = 'scanning' | 'results' | 'loading';

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose }) => {
    const store = useStore();
    const [phase, setPhase] = useState<ModalPhase>('scanning');
    const [currentMarket, setCurrentMarket] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [leaderMarket, setLeaderMarket] = useState<TMarketAnalysis | null>(null);
    const [scanResult, setScanResult] = useState<TMarketAnalysis | null>(null);
    const [marketsScanned, setMarketsScanned] = useState(0);
    const [totalMarkets, setTotalMarkets] = useState(0);
    const [stake, setStake] = useState('1');
    const [error, setError] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    const handleClose = () => {
        setPhase('scanning');
        setCurrentMarket(null);
        setScanProgress(0);
        setLeaderMarket(null);
        setScanResult(null);
        setMarketsScanned(0);
        setTotalMarkets(0);
        setStake('1');
        setError(null);
        setHasStarted(false);
        onClose();
    };

    useEffect(() => {
        if (isOpen && !hasStarted) {
            setHasStarted(true);
            runScan();
        }
    }, [isOpen, hasStarted]);

    const runScan = async () => {
        try {
            setError(null);
            setCurrentMarket(null);
            setScanProgress(0);
            setLeaderMarket(null);
            setMarketsScanned(0);

            const connected = await waitForTradingApi();
            if (!connected) {
                setError('Failed to connect to trading feed. Please try again.');
                setPhase('results');
                return;
            }

            const markets = await fetchVolatilityMarkets();
            if (!markets.length) {
                setError('No volatility markets available. Please try again later.');
                setPhase('results');
                return;
            }

            setTotalMarkets(markets.length);
            setCurrentMarket('Connecting…');

            let successCount = 0;
            const analyses = await scanVolatilityMarkets(markets, ({ completed, total, currentMarket: name, leader }) => {
                setCurrentMarket(name);
                setScanProgress(total ? Math.round((completed / total) * 100) : 0);
                setMarketsScanned(completed);
                if (leader) setLeaderMarket(leader);
            });

            successCount = analyses.length;
            const best = pickBestAnalysis(analyses);

            if (best && successCount > 0) {
                setCurrentMarket(null);
                setScanProgress(100);
                setScanResult(best);
            } else {
                setError(
                    successCount === 0
                        ? 'Could not load 1,000 digits for any volatility market. Check connection and retry.'
                        : 'No clear edge found across volatility markets. Try again shortly.'
                );
            }

            setPhase('results');
        } catch (err) {
            console.error('AI Modal scan error:', err);
            setError('An error occurred during scanning. Please try again.');
            setPhase('results');
        }
    };

    const handleLoadStrategy = async () => {
        if (!scanResult || !store) return;

        try {
            setPhase('loading');
            const stakeParsed = parseFloat(stake);
            const stakeNum = isNaN(stakeParsed) ? 1 : Math.ceil(stakeParsed);
            const { quick_strategy, dashboard } = store;

            quick_strategy.setSelectedStrategy('MARTINGALE');

            const contractType = scanResult.prediction === 'over2' ? 'DIGITOVER' : 'DIGITUNDER';
            const formData = {
                symbol: scanResult.symbol,
                tradetype: 'overunder',
                type: contractType,
                last_digit_prediction: scanResult.predictionValue,
                durationtype: 't',
                duration: '1',
                stake: stakeNum,
                profit: stakeNum * 1000,
                loss: stakeNum * 500,
                size: '2',
                unit: '1',
                boolean_max_stake: false,
                max_stake: 10,
                action: 'RUN',
                growth_rate: '0.01',
                tick_count: 0,
                take_profit: 0,
                boolean_tick_count: false,
                max_payout: 0,
                max_ticks: 0,
            };

            Object.entries(formData).forEach(([key, value]) => {
                quick_strategy.setValue(key, value);
            });

            dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);
            await new Promise<void>(resolve => setTimeout(resolve, 300));
            await quick_strategy.onSubmit(formData);
            handleClose();
        } catch (err) {
            console.error('Error loading strategy:', err);
            setError('Failed to load strategy. Please try again.');
            setPhase('results');
        }
    };

    const confidenceTier = (c: number) => {
        if (c >= 75) return 'high';
        if (c >= 50) return 'mid';
        return 'low';
    };

    if (!isOpen) return null;

    return (
        <div className='ai-modal-overlay' onClick={handleClose}>
            <div className='ai-modal-container' onClick={e => e.stopPropagation()}>
                {phase === 'scanning' && (
                    <div className='ai-modal__scanner'>
                        <div className='ai-modal__scanner-header'>
                            <div className='ai-modal__scanner-title'>TRADER GO AI SCANNER</div>
                            <div className='ai-modal__scanner-subtitle'>
                                Volatility indices • {SCAN_DIGIT_COUNT.toLocaleString()} digit deep scan
                            </div>
                        </div>

                        <div className='ai-modal__scanner-body ai-modal__scanner-body--centered'>
                            <div className='ai-modal__radar' aria-hidden='true'>
                                <div className='ai-modal__radar-sweep' />
                                <div className='ai-modal__radar-pulse' />
                                <div className='ai-modal__radar-center'>
                                    <div className='ai-modal__radar-center-title'>Analyzing</div>
                                    <div className='ai-modal__radar-center-value'>
                                        {currentMarket ?? 'Volatility markets…'}
                                    </div>
                                </div>
                            </div>

                            <div className='ai-modal__scanner-panel'>
                                <div className='ai-modal__scanner-progress'>
                                    <div className='ai-modal__scanner-progress-track' />
                                    <div
                                        className='ai-modal__scanner-progress-fill'
                                        style={{ width: `${scanProgress}%` }}
                                    />
                                </div>

                                <div className='ai-modal__scanner-meta'>
                                    <div className='ai-modal__scanner-meta-row'>
                                        <span className='ai-modal__scanner-meta-label'>Progress</span>
                                        <span className='ai-modal__scanner-meta-value'>{scanProgress}%</span>
                                    </div>
                                    <div className='ai-modal__scanner-meta-row'>
                                        <span className='ai-modal__scanner-meta-label'>Markets</span>
                                        <span className='ai-modal__scanner-meta-value'>
                                            {marketsScanned}
                                            {totalMarkets > 0 ? ` / ${totalMarkets}` : ''}
                                        </span>
                                    </div>
                                    <div className='ai-modal__scanner-meta-row'>
                                        <span className='ai-modal__scanner-meta-label'>Sample</span>
                                        <span className='ai-modal__scanner-meta-value'>
                                            {SCAN_DIGIT_COUNT.toLocaleString()} digits
                                        </span>
                                    </div>
                                </div>

                                {leaderMarket && (
                                    <div className='ai-modal__scanner-leader'>
                                        <div className='ai-modal__scanner-leader-label'>Leading signal</div>
                                        <div className='ai-modal__scanner-leader-market'>{leaderMarket.displayName}</div>
                                        <div className='ai-modal__scanner-leader-pred'>
                                            {leaderMarket.prediction === 'over2' ? 'OVER 2' : 'UNDER 7'} •{' '}
                                            {leaderMarket.confidence}% • +{leaderMarket.edgePct.toFixed(1)}% edge
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'results' && (
                    <div
                        className={`ai-modal__results ${
                            scanResult && !error ? 'ai-modal__results--signal' : ''
                        }`}
                    >
                        {!(scanResult && !error) && (
                            <div className='ai-modal__close-btn' onClick={handleClose}>
                                ✕
                            </div>
                        )}

                        {error ? (
                            <div className='ai-modal__error'>
                                <div className='ai-modal__error-icon'>⚠</div>
                                <div className='ai-modal__error-title'>Scan Failed</div>
                                <div className='ai-modal__error-message'>{error}</div>
                                <button
                                    className='ai-modal__retry-btn'
                                    onClick={() => {
                                        setPhase('scanning');
                                        setHasStarted(false);
                                    }}
                                >
                                    ↻ Retry Scan
                                </button>
                            </div>
                        ) : scanResult ? (
                            <div className='ai-modal__signal-card'>
                                <div className='ai-modal__signal-glow' aria-hidden='true' />
                                <div
                                    className={`ai-modal__signal-glow ai-modal__signal-glow--accent ${
                                        scanResult.prediction === 'over2' ? 'over2' : 'under7'
                                    }`}
                                    aria-hidden='true'
                                />

                                <div className='ai-modal__signal-top'>
                                    <div className='ai-modal__signal-status'>
                                        <span className='ai-modal__signal-dot' />
                                        Signal ready
                                    </div>
                                    <button
                                        type='button'
                                        className='ai-modal__signal-close'
                                        onClick={handleClose}
                                        aria-label='Close'
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div
                                    className={`ai-modal__signal-hero ${
                                        scanResult.prediction === 'over2' ? 'over2' : 'under7'
                                    }`}
                                >
                                    <div className='ai-modal__signal-hero-label'>Recommended trade</div>
                                    <div className='ai-modal__signal-pill'>
                                        {scanResult.prediction === 'over2' ? 'OVER 2' : 'UNDER 7'}
                                    </div>
                                    <div className='ai-modal__signal-market'>{scanResult.displayName}</div>
                                    <div className='ai-modal__signal-symbol'>{scanResult.symbol}</div>
                                    <div className='ai-modal__signal-tags'>
                                        <span className='ai-modal__signal-tag'>Martingale</span>
                                        <span className='ai-modal__signal-tag'>Volatility</span>
                                        <span className='ai-modal__signal-tag'>
                                            {SCAN_DIGIT_COUNT.toLocaleString()} digits
                                        </span>
                                    </div>
                                </div>

                                <div className='ai-modal__signal-body'>
                                    <div
                                        className={`ai-modal__signal-gauge ai-modal__signal-gauge--${confidenceTier(
                                            scanResult.confidence
                                        )}`}
                                        style={{ '--confidence': scanResult.confidence } as React.CSSProperties}
                                    >
                                        <div className='ai-modal__signal-gauge-inner'>
                                            <span className='ai-modal__signal-gauge-value'>
                                                {scanResult.confidence}
                                            </span>
                                            <span className='ai-modal__signal-gauge-unit'>%</span>
                                            <span className='ai-modal__signal-gauge-caption'>Confidence</span>
                                        </div>
                                    </div>

                                    <div className='ai-modal__signal-metrics'>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>Edge</span>
                                            <span className='ai-modal__signal-metric-value accent'>
                                                +{scanResult.edgePct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>1K sample</span>
                                            <span className='ai-modal__signal-metric-value'>
                                                {scanResult.fullPct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>Last 100</span>
                                            <span className='ai-modal__signal-metric-value'>
                                                {scanResult.recentPct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>Momentum</span>
                                            <span
                                                className={`ai-modal__signal-metric-value ${
                                                    scanResult.momentumPct >= 0 ? 'up' : 'down'
                                                }`}
                                            >
                                                {scanResult.momentumPct >= 0 ? '+' : ''}
                                                {scanResult.momentumPct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>Streak</span>
                                            <span className='ai-modal__signal-metric-value'>
                                                {scanResult.streakLength}
                                            </span>
                                        </div>
                                        <div className='ai-modal__signal-metric'>
                                            <span className='ai-modal__signal-metric-label'>Baseline</span>
                                            <span className='ai-modal__signal-metric-value muted'>
                                                {AI_SCANNER_BASELINE_PCT}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='ai-modal__signal-bars'>
                                    <div className='ai-modal__signal-bar-row'>
                                        <div className='ai-modal__signal-bar-head'>
                                            <span>Over 2</span>
                                            <strong>{Math.round(scanResult.over2Pct)}%</strong>
                                        </div>
                                        <div className='ai-modal__signal-bar-track'>
                                            <div
                                                className='ai-modal__signal-bar-fill over2'
                                                style={{ width: `${scanResult.over2Pct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className='ai-modal__signal-bar-row'>
                                        <div className='ai-modal__signal-bar-head'>
                                            <span>Under 7</span>
                                            <strong>{Math.round(scanResult.under7Pct)}%</strong>
                                        </div>
                                        <div className='ai-modal__signal-bar-track'>
                                            <div
                                                className='ai-modal__signal-bar-fill under7'
                                                style={{ width: `${scanResult.under7Pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='ai-modal__signal-stake'>
                                    <label className='ai-modal__signal-stake-label' htmlFor='ai-signal-stake'>
                                        Stake amount
                                    </label>
                                    <div className='ai-modal__signal-stake-wrap'>
                                        <span className='ai-modal__signal-stake-prefix'>$</span>
                                        <input
                                            id='ai-signal-stake'
                                            type='number'
                                            min='0.1'
                                            step='0.1'
                                            value={stake}
                                            onChange={e => setStake(e.target.value)}
                                            className='ai-modal__signal-stake-input'
                                            placeholder='1.00'
                                        />
                                    </div>
                                </div>

                                <button
                                    type='button'
                                    className='ai-modal__signal-cta'
                                    onClick={handleLoadStrategy}
                                    disabled={phase === 'loading'}
                                >
                                    <span className='ai-modal__signal-cta-shine' aria-hidden='true' />
                                    {phase === 'loading' ? 'Loading strategy…' : 'Load strategy'}
                                </button>
                            </div>
                        ) : (
                            <div className='ai-modal__error'>
                                <div className='ai-modal__error-title'>No Results</div>
                                <div className='ai-modal__error-message'>No volatility markets could be analyzed.</div>
                                <button
                                    className='ai-modal__retry-btn'
                                    onClick={() => {
                                        setPhase('scanning');
                                        setHasStarted(false);
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIModal;
