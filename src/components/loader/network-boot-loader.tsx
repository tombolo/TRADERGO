import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import scopeLandscapeBg from '@/components/backgrounds/totori.mp4';
import scopePotraitBg from '@/components/backgrounds/tomtom.mp4';
import './network-boot-loader.scss';

let hasNetworkBootLoaderEntered = false;

type NetworkBootLoaderProps = {
    message?: string;
    hint?: string;
};

type TCandle = {
    id: number;
    bullish: boolean;
    bodyHeight: number;
    wickTop: number;
    wickBottom: number;
    delay: number;
};

const CANDLE_COUNT = 28;

function buildCandles(): TCandle[] {
    return Array.from({ length: CANDLE_COUNT }, (_, id) => ({
        id,
        bullish: id % 3 !== 1,
        bodyHeight: 28 + ((id * 17) % 55),
        wickTop: 8 + ((id * 11) % 22),
        wickBottom: 6 + ((id * 13) % 18),
        delay: (id % 7) * 0.18,
    }));
}

export default function NetworkBootLoader({ message, hint }: NetworkBootLoaderProps) {
    const [shouldAnimateEntry] = useState(() => !hasNetworkBootLoaderEntered);
    const candles = useMemo(() => buildCandles(), []);

    useEffect(() => {
        hasNetworkBootLoaderEntered = true;
    }, []);

    return (
        <div
            className={`network-boot ${shouldAnimateEntry ? 'network-boot--entry' : ''}`}
            role='status'
            aria-live='polite'
            aria-busy='true'
            aria-label={message || 'Loading trading platform'}
            data-testid='dt_network_boot_loader'
        >
            <div className='network-boot__bg' aria-hidden>
                <video
                    className='network-boot__bg-video network-boot__bg-video--portrait'
                    src={scopePotraitBg}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload='auto'
                />
                <video
                    className='network-boot__bg-video network-boot__bg-video--landscape'
                    src={scopeLandscapeBg}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload='auto'
                />
            </div>
            <div className='network-boot__candles' aria-hidden>
                <div className='network-boot__chart-grid' />
                <div className='network-boot__chart-line' />
                {candles.map(candle => (
                    <div
                        key={candle.id}
                        className={`network-boot__candle network-boot__candle--${
                            candle.bullish ? 'bull' : 'bear'
                        }`}
                        style={
                            {
                                '--body-h': `${candle.bodyHeight}px`,
                                '--wick-top': `${candle.wickTop}px`,
                                '--wick-bottom': `${candle.wickBottom}px`,
                                '--delay': `${candle.delay}s`,
                            } as CSSProperties
                        }
                    >
                        <span className='network-boot__candle-wick network-boot__candle-wick--top' />
                        <span className='network-boot__candle-body' />
                        <span className='network-boot__candle-wick network-boot__candle-wick--bottom' />
                    </div>
                ))}
            </div>
            <div className='network-boot__content'>
                <p className='network-boot__brand'>TRADER GO</p>
                <p className='network-boot__tagline'>Trading Platform</p>

                <div className='network-boot__spinner-panel'>
                    <div className='network-boot__spinner-glow' aria-hidden />
                    <div className='network-boot__spinner'>
                        <div className='network-boot__spinner-ring network-boot__spinner-ring--outer' />
                        <div className='network-boot__spinner-ring network-boot__spinner-ring--mid' />
                        <div className='network-boot__spinner-ring network-boot__spinner-ring--inner' />
                        <div className='network-boot__spinner-core'>
                            <svg viewBox='0 0 24 24' fill='none' aria-hidden>
                                <path
                                    d='M4 18L8 12L12 15L16 8L20 11'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                                <path
                                    d='M4 20H20'
                                    stroke='currentColor'
                                    strokeWidth='1.5'
                                    strokeLinecap='round'
                                    opacity='0.45'
                                />
                            </svg>
                        </div>
                    </div>
                    <p className='network-boot__status'>{message || 'Syncing market data'}</p>
                    {hint && <p className='network-boot__hint'>{hint}</p>}
                </div>
            </div>
        </div>
    );
}
