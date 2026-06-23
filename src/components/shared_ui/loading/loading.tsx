import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import Text from '../text/text';

export type TLoadingProps = React.HTMLProps<HTMLDivElement> & {
    is_fullscreen: boolean;
    is_slow_loading: boolean;
    status: string[];
    theme: string;
};

const Loading = ({ className, id, is_fullscreen = true, is_slow_loading, status, theme }: Partial<TLoadingProps>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const candles: Array<{
            x: number;
            open: number;
            close: number;
            high: number;
            low: number;
            phase: number;
        }> = [];

        const candleCount = 20;

        for (let i = 0; i < candleCount; i++) {
            candles.push({
                x: (canvas.width / candleCount) * i + 50,
                open: Math.random() * 80 + 40,
                close: Math.random() * 80 + 40,
                high: Math.random() * 120 + 80,
                low: Math.random() * 40 + 10,
                phase: Math.random() * Math.PI * 2,
            });
        }

        let animationId: number;
        let frameCount = 0;

        const animate = () => {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.015)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            frameCount++;

            candles.forEach(candle => {
                const oscillation = Math.sin(frameCount * 0.015 + candle.phase) * 20;
                const close = candle.close + oscillation;
                const open = candle.open + oscillation * 0.6;
                const high = candle.high + oscillation;
                const low = candle.low + oscillation * 0.4;

                const yScale = 1.2;
                const baseY = canvas.height / 2;

                const x = candle.x + ((frameCount * 0.25) % (canvas.width + 100));
                const closeY = baseY - close * yScale;
                const openY = baseY - open * yScale;
                const highY = baseY - high * yScale;
                const lowY = baseY - low * yScale;

                const isGreen = close > open;
                const candleColor = isGreen ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
                const wickColor = isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';

                // Draw wick
                ctx.strokeStyle = wickColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, highY);
                ctx.lineTo(x, lowY);
                ctx.stroke();

                // Draw candle body
                ctx.fillStyle = candleColor;
                const rectHeight = Math.abs(closeY - openY) || 3;
                const rectY = Math.min(closeY, openY);
                ctx.fillRect(x - 4, rectY, 8, rectHeight);
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div
            data-testid='dt_initial_loader'
            className={classNames(
                'initial-loader',
                {
                    'initial-loader--fullscreen': is_fullscreen,
                },
                className
            )}
        >
            <canvas ref={canvasRef} className='initial-loader__canvas' />

            <div className='initial-loader__content'>
                <div className='initial-loader__spinner'>
                    <div className='spinner-dot'></div>
                    <div className='spinner-dot'></div>
                    <div className='spinner-dot'></div>
                </div>

                <div className='initial-loader__brand'>
                    <h2 className='initial-loader__title'>PROFIT SCOPE</h2>
                    <p className='initial-loader__subtitle'>Loading your trading workspace...</p>
                </div>

                {is_slow_loading && status?.length > 0 && (
                    <div className='initial-loader__status'>
                        {status.map((text, inx) => (
                            <Text as='h3' color='prominent' size='xs' align='center' key={inx}>
                                {text}
                            </Text>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Loading;
