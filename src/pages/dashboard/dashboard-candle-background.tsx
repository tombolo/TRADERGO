import { useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';

type TCandle = {
    x: number;
    open: number;
    close: number;
    high: number;
    low: number;
    phase: number;
    speed: number;
    width: number;
};

const CANDLE_COUNT = 28;

const createCandles = (width: number, height: number): TCandle[] =>
    Array.from({ length: CANDLE_COUNT }, (_, index) => {
        const body = 24 + Math.random() * 56;
        const wick = body + 18 + Math.random() * 42;

        return {
            x: (width / CANDLE_COUNT) * index + Math.random() * 40,
            open: body,
            close: body + (Math.random() - 0.48) * 28,
            high: wick,
            low: Math.max(8, body - Math.random() * 22),
            phase: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.55,
            width: 5 + Math.random() * 7,
        };
    });

export const DashboardCandleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { ui } = useStore();
    const isDark = ui?.is_dark_mode_on ?? false;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let animationId = 0;
        let frameCount = 0;
        let candles: TCandle[] = [];
        const overlayFill = isDark ? 'rgba(8, 12, 24, 0.35)' : 'rgba(241, 245, 249, 0.55)';
        const greenBody = isDark ? 'rgba(45, 212, 191, 0.11)' : 'rgba(16, 185, 129, 0.14)';
        const redBody = isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.12)';
        const greenWick = isDark ? 'rgba(45, 212, 191, 0.08)' : 'rgba(16, 185, 129, 0.1)';
        const redWick = isDark ? 'rgba(248, 113, 113, 0.07)' : 'rgba(239, 68, 68, 0.09)';

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const { width, height } = parent.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            candles = createCandles(width, height);
        };

        const draw = () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = overlayFill;
            ctx.fillRect(0, 0, width, height);

            const baseY = height * 0.58;
            const yScale = height / 220;

            candles.forEach(candle => {
                const drift = prefersReducedMotion ? 0 : Math.sin(frameCount * 0.004 + candle.phase) * 14;
                const scroll = prefersReducedMotion ? 0 : (frameCount * candle.speed * 0.18) % (width + 120);

                const open = candle.open + drift * 0.45;
                const close = candle.close + drift;
                const high = candle.high + drift * 0.75;
                const low = candle.low + drift * 0.35;

                const x = ((candle.x + scroll) % (width + 120)) - 60;
                const openY = baseY - open * yScale;
                const closeY = baseY - close * yScale;
                const highY = baseY - high * yScale;
                const lowY = baseY - low * yScale;

                const isGreen = close >= open;
                const bodyColor = isGreen ? greenBody : redBody;
                const wickColor = isGreen ? greenWick : redWick;
                const halfWidth = candle.width / 2;

                ctx.strokeStyle = wickColor;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x, highY);
                ctx.lineTo(x, lowY);
                ctx.stroke();

                ctx.fillStyle = bodyColor;
                const bodyHeight = Math.max(Math.abs(closeY - openY), 2.5);
                ctx.fillRect(x - halfWidth, Math.min(openY, closeY), candle.width, bodyHeight);
            });

            frameCount += 1;
            animationId = window.requestAnimationFrame(draw);
        };

        resize();
        draw();

        const observer = new ResizeObserver(resize);
        observer.observe(canvas.parentElement as Element);

        return () => {
            window.cancelAnimationFrame(animationId);
            observer.disconnect();
        };
    }, [isDark]);

    return (
        <canvas
            ref={canvasRef}
            className='dashboard-candle-bg'
            aria-hidden='true'
        />
    );
};
