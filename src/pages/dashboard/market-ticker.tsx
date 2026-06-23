import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { api_base } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '@/hooks/useApiBase';

type TTickerMarket = {
    id: string;
    label: string;
    symbol: string;
    tone: 'blue' | 'red' | 'green' | 'yellow' | 'cyan' | 'orange';
    seed: number;
};

type TTickerQuote = {
    price: number;
    direction: 'up' | 'down' | 'flat';
};

const TICKER_MARKETS: TTickerMarket[] = [
    { id: 'vol-75', label: 'VOL 75', symbol: 'R_75', tone: 'blue', seed: 34341.7524 },
    { id: 'vol-100', label: 'VOL 100', symbol: 'R_100', tone: 'red', seed: 1004.8014 },
    { id: 'vol-10', label: 'VOL 10', symbol: 'R_10', tone: 'yellow', seed: 10101.8054 },
    { id: 'vol-25', label: 'VOL 25', symbol: 'R_25', tone: 'green', seed: 2841.5521 },
    { id: 'bull', label: 'BULL MARKET', symbol: 'RDBULL', tone: 'cyan', seed: 1004.8014 },
    { id: 'bear', label: 'BEAR MARKET', symbol: 'RDBEAR', tone: 'orange', seed: 1008.8014 },
    { id: 'vol-50', label: 'VOL 50', symbol: 'R_50', tone: 'green', seed: 152.4421 },
    { id: 'vol-150', label: 'VOL 150', symbol: '1HZ150V', tone: 'blue', seed: 892.1188 },
];

const formatPrice = (value: number): string => {
    if (value >= 1000) return value.toFixed(4);
    if (value >= 100) return value.toFixed(3);
    return value.toFixed(2);
};

const TickerArrow = ({ direction }: { direction: TTickerQuote['direction'] }) => {
    if (direction === 'flat') {
        return <span className='market-ticker__arrow market-ticker__arrow--flat'>•</span>;
    }

    return (
        <span
            className={`market-ticker__arrow market-ticker__arrow--${direction}`}
            aria-hidden='true'
        >
            {direction === 'up' ? '▲' : '▼'}
        </span>
    );
};

const TickerItem = ({
    market,
    quote,
}: {
    market: TTickerMarket;
    quote: TTickerQuote;
}) => (
    <div className={`market-ticker__item market-ticker__item--${market.tone}`}>
        <span className='market-ticker__label'>{market.label}</span>
        <span className='market-ticker__price'>{formatPrice(quote.price)}</span>
        <TickerArrow direction={quote.direction} />
    </div>
);

export const MarketTicker = observer(() => {
    const { connectionStatus } = useApiBase();
    const [quotes, setQuotes] = useState<Record<string, TTickerQuote>>(() =>
        Object.fromEntries(
            TICKER_MARKETS.map(market => [market.id, { price: market.seed, direction: 'flat' as const }])
        )
    );

    const items = useMemo(
        () =>
            TICKER_MARKETS.map(market => ({
                market,
                quote: quotes[market.id] ?? { price: market.seed, direction: 'flat' as const },
            })),
        [quotes]
    );

    useEffect(() => {
        const isLive = connectionStatus === CONNECTION_STATUS.OPENED && Boolean(api_base.api);
        const cleanups: Array<() => void> = [];
        const previousPrices: Record<string, number> = Object.fromEntries(
            TICKER_MARKETS.map(market => [market.symbol, market.seed])
        );

        const updateQuote = (symbol: string, nextPrice: number) => {
            const market = TICKER_MARKETS.find(entry => entry.symbol === symbol);
            if (!market) return;

            const previous = previousPrices[symbol] ?? nextPrice;
            previousPrices[symbol] = nextPrice;

            setQuotes(current => ({
                ...current,
                [market.id]: {
                    price: nextPrice,
                    direction: nextPrice > previous ? 'up' : nextPrice < previous ? 'down' : 'flat',
                },
            }));
        };

        if (isLive) {
            const subscription = api_base.api?.onMessage().subscribe((msg: unknown) => {
                const data = (msg as { data?: { msg_type?: string; tick?: { symbol?: string; quote?: number } } })
                    ?.data;
                if (data?.msg_type !== 'tick' || !data.tick?.symbol || data.tick.quote == null) return;
                updateQuote(data.tick.symbol, Number(data.tick.quote));
            });

            if (subscription) {
                cleanups.push(() => subscription.unsubscribe());
            }

            TICKER_MARKETS.forEach(market => {
                api_base.api
                    ?.send({ ticks: market.symbol, subscribe: 1 })
                    .catch(() => undefined);
            });
        } else {
            const intervalId = window.setInterval(() => {
                setQuotes(current => {
                    const next = { ...current };

                    TICKER_MARKETS.forEach(market => {
                        const previous = next[market.id]?.price ?? market.seed;
                        const delta = (Math.random() - 0.48) * (market.seed > 1000 ? 2.4 : 0.08);
                        const price = Math.max(0.01, previous + delta);

                        next[market.id] = {
                            price,
                            direction: price > previous ? 'up' : price < previous ? 'down' : 'flat',
                        };
                    });

                    return next;
                });
            }, 1400);

            cleanups.push(() => window.clearInterval(intervalId));
        }

        return () => {
            cleanups.forEach(cleanup => cleanup());
        };
    }, [connectionStatus]);

    const trackItems = [...items, ...items];

    return (
        <div className='market-ticker' aria-label='Live market prices'>
            <div className='market-ticker__fade market-ticker__fade--left' aria-hidden='true' />
            <div className='market-ticker__fade market-ticker__fade--right' aria-hidden='true' />
            <div className='market-ticker__track'>
                {trackItems.map(({ market, quote }, index) => (
                    <TickerItem key={`${market.id}-${index}`} market={market} quote={quote} />
                ))}
            </div>
        </div>
    );
});
