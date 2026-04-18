import React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { LegacyClose1pxIcon } from '@deriv/quill-icons/Legacy';
import {
    LabelPairedArrowUpArrowDownMdFillIcon,
    LabelPairedChevronDownLgRegularIcon,
    LabelPairedGaugeMaxCaptionFillIcon,
    LabelPairedGlobeMdFillIcon,
    LabelPairedGridMdFillIcon,
    LabelPairedPlayMdFillIcon,
    LabelPairedPlaybackSpeedMdFillIcon,
    LabelPairedSquareMdFillIcon,
} from '@deriv/quill-icons/LabelPaired';
import { MarketIcon } from '@/components/market/market-icon';
import { TradeTypeIcon } from '@/components/trade-type/trade-type-icon';
import Text from '@/components/shared_ui/text';
import ToggleSwitch from '@/components/shared_ui/toggle-switch/toggle-switch';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useStore } from '@/hooks/useStore';
import type { TDropdownItems, TTradeType } from '@/pages/bot-builder/quick-strategy/types';
import { Localize, localize } from '@deriv-com/translations';
import { SPEED_LAB_DEFAULT_ASSET_SYMBOL, type TSpeedLabTradingMode } from './speed-lab-constants';
import { speedLabPredictionInputValid, speedLabPredictionMode } from './speed-lab-contract-params';
import {
    SPEED_LAB_CALLPUT_TRADETYPE,
    speedLabContractTypes,
    speedLabContractsFor,
    speedLabLoadDurations,
    speedLabLoadTradeTypes,
    type TSpeedLabDurationOption,
} from './speed-lab-qs-data';
import {
    executeSpeedLabRound,
    extractSellNetProfit,
    fetchSpeedLabMarketsPreferred,
    subscribeSpeedLabTicks,
    type TSpeedLabMarketRow,
} from './speed-lab-trade';
import './speed-lab.scss';

type TSpeedLabPanelProps = {
    onClose: () => void;
};

const TRADING_MODES: {
    id: TSpeedLabTradingMode;
    title: React.ReactNode;
    description: React.ReactNode;
    icon: React.ReactNode;
}[] = [
    {
        id: 'single_fast',
        title: <Localize i18n_default_text='Single Fast' />,
        description: <Localize i18n_default_text='Buy one contract per tick' />,
        icon: (
            <LabelPairedPlaybackSpeedMdFillIcon
                className='speed-lab__mode-icon-svg'
                height='28px'
                width='28px'
                fill='currentColor'
                aria-hidden
            />
        ),
    },
    {
        id: 'multiple',
        title: <Localize i18n_default_text='Multiple' />,
        description: <Localize i18n_default_text='Buy N contracts simultaneously' />,
        icon: (
            <LabelPairedGridMdFillIcon
                className='speed-lab__mode-icon-svg'
                height='28px'
                width='28px'
                fill='currentColor'
                aria-hidden
            />
        ),
    },
    {
        id: 'hedge',
        title: <Localize i18n_default_text='Hedge' />,
        description: <Localize i18n_default_text='Buy Rise + Fall at once' />,
        icon: (
            <LabelPairedArrowUpArrowDownMdFillIcon
                className='speed-lab__mode-icon-svg'
                height='28px'
                width='28px'
                fill='currentColor'
                aria-hidden
            />
        ),
    },
    {
        id: 'multi_market',
        title: <Localize i18n_default_text='Multi-Market' />,
        description: <Localize i18n_default_text='Scan all markets, buy on best' />,
        icon: (
            <LabelPairedGlobeMdFillIcon
                className='speed-lab__mode-icon-svg'
                height='28px'
                width='28px'
                fill='currentColor'
                aria-hidden
            />
        ),
    },
];

const formatUsd = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TICK_DEBOUNCE_MS = 550;
const INTERVAL_MS = 2800;
const DIGIT_PREDICTION_OPTIONS = Array.from({ length: 10 }, (_, i) => i);
const TICK_INDEX_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export const SpeedLabPanel = ({ onClose }: TSpeedLabPanelProps) => {
    const { client } = useStore();

    const [is_running, setIsRunning] = React.useState(false);
    const [trading_mode, setTradingMode] = React.useState<TSpeedLabTradingMode>('single_fast');
    const [markets, setMarkets] = React.useState<TSpeedLabMarketRow[]>([]);
    const [markets_loading, setMarketsLoading] = React.useState(true);
    const [markets_error, setMarketsError] = React.useState<string | null>(null);
    const [selected_symbol, setSelectedSymbol] = React.useState('');
    const [market_query, setMarketQuery] = React.useState('');
    const [market_list_open, setMarketListOpen] = React.useState(false);
    /** When the asset list is open, ignore the input text for filtering until the user types (shows full list on open). */
    const [asset_filter_from_input, setAssetFilterFromInput] = React.useState(false);
    const market_wrap_ref = React.useRef<HTMLDivElement>(null);
    const markets_ref = React.useRef<TSpeedLabMarketRow[]>([]);
    const market_input_ref = React.useRef<HTMLInputElement>(null);
    const market_listbox_ref = React.useRef<HTMLUListElement>(null);
    const [market_listbox_layout, setMarketListboxLayout] = React.useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
    const selected_symbol_ref = React.useRef('');
    React.useEffect(() => {
        selected_symbol_ref.current = selected_symbol;
    }, [selected_symbol]);

    React.useEffect(() => {
        markets_ref.current = markets;
    }, [markets]);

    const [trade_types, setTradeTypes] = React.useState<TTradeType[]>([]);
    const [tradetype, setTradetype] = React.useState('');
    const [contract_options, setContractOptions] = React.useState<TDropdownItems[]>([]);
    const [contract_type_api, setContractTypeApi] = React.useState('');
    const [duration_options, setDurationOptions] = React.useState<TSpeedLabDurationOption[]>([]);
    const [duration_unit_api, setDurationUnitApi] = React.useState('t');
    const [duration_min, setDurationMin] = React.useState(1);
    const [duration_max, setDurationMax] = React.useState(10);
    const [contracts_loading, setContractsLoading] = React.useState(false);
    const [stake, setStake] = React.useState(1);
    const [stake_input, setStakeInput] = React.useState('1');
    const [duration, setDuration] = React.useState(1);
    const [duration_input, setDurationInput] = React.useState('1');
    /** Digit 0–9 or tick index 1–10 — same roles as Quick Strategy `last_digit_prediction` / trade-engine prediction. */
    const [trade_prediction, setTradePrediction] = React.useState(5);
    const [trade_every_tick, setTradeEveryTick] = React.useState(false);

    const [martingale_enabled, setMartingaleEnabled] = React.useState(false);
    const [martingale_multiplier, setMartingaleMultiplier] = React.useState(2);
    const [martingale_multiplier_input, setMartingaleMultiplierInput] = React.useState('2');
    const [martingale_max_stake, setMartingaleMaxStake] = React.useState<number | ''>('');
    const [martingale_max_stake_input, setMartingaleMaxStakeInput] = React.useState('');
    const [martingale_reset_after, setMartingaleResetAfter] = React.useState(3);
    const [martingale_reset_after_input, setMartingaleResetAfterInput] = React.useState('3');

    const [total_trades, setTotalTrades] = React.useState(0);
    const [wins, setWins] = React.useState(0);
    const [losses, setLosses] = React.useState(0);
    const [total_pnl, setTotalPnl] = React.useState(0);
    const [current_stake_display, setCurrentStakeDisplay] = React.useState(1);
    const [trade_error, setTradeError] = React.useState<string | null>(null);
    const [is_busy, setIsBusy] = React.useState(false);
    const is_busy_ref = React.useRef(false);
    React.useEffect(() => {
        is_busy_ref.current = is_busy;
    }, [is_busy]);

    const pending_contract_ids_ref = React.useRef<Set<string>>(new Set());
    const contract_buy_prices_ref = React.useRef<Map<string, number>>(new Map());
    const consecutive_losses_ref = React.useRef(0);
    const next_stake_ref = React.useRef(1);
    const last_tick_trade_ref = React.useRef(0);
    const interval_ref = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const tick_cleanup_ref = React.useRef<(() => void) | null>(null);

    const symbol_candidates = React.useMemo(
        () => markets.filter(m => m.is_open).map(m => m.symbol),
        [markets]
    );

    /** Group order matches Quick Strategy (`getSymbolsForBot` iteration order). */
    const asset_group_order = React.useMemo(() => {
        const order: string[] = [];
        const seen = new Set<string>();
        for (const m of markets) {
            const g = (m.group && m.group.trim()) || '__other__';
            if (!seen.has(g)) {
                seen.add(g);
                order.push(g);
            }
        }
        return order;
    }, [markets]);

    const asset_list_filter_query = React.useMemo(() => {
        if (market_list_open && !asset_filter_from_input) return '';
        return market_query.trim().toLowerCase();
    }, [market_list_open, asset_filter_from_input, market_query]);

    const grouped_filtered_markets = React.useMemo(() => {
        const q = asset_list_filter_query;
        const matches = (m: TSpeedLabMarketRow) =>
            !q ||
            m.display_name.toLowerCase().includes(q) ||
            m.symbol.toLowerCase().includes(q) ||
            (m.group && m.group.toLowerCase().includes(q));

        const by_group = new Map<string, TSpeedLabMarketRow[]>();
        for (const gk of asset_group_order) {
            by_group.set(gk, []);
        }
        for (const m of markets) {
            if (!matches(m)) continue;
            const gk = (m.group && m.group.trim()) || '__other__';
            if (!by_group.has(gk)) by_group.set(gk, []);
            by_group.get(gk)!.push(m);
        }
        return asset_group_order
            .map(group_key => ({ group_key, items: by_group.get(group_key) ?? [] }))
            .filter(section => section.items.length > 0);
    }, [markets, asset_list_filter_query, asset_group_order]);

    const filtered_market_count = React.useMemo(
        () => grouped_filtered_markets.reduce((n, s) => n + s.items.length, 0),
        [grouped_filtered_markets]
    );

    const qs_ready = Boolean(speedLabContractsFor());

    const hedge_available = trade_types.some(t => t.value === SPEED_LAB_CALLPUT_TRADETYPE);

    const contract_pick_ok =
        Boolean(tradetype) &&
        contract_options.length > 0 &&
        contract_options.some(c => c.value === contract_type_api);
    const duration_pick_ok = duration_options.length > 0 && duration_unit_api !== 'na';

    const prediction_pick_ok = speedLabPredictionInputValid(contract_type_api, trade_prediction);

    const can_run_session = React.useMemo(() => {
        if (markets_loading || contracts_loading || !client?.currency || !qs_ready) return false;
        if (!contract_pick_ok || !duration_pick_ok || !prediction_pick_ok) return false;
        if (trading_mode === 'hedge' && !hedge_available) return false;
        if (trading_mode === 'multi_market') return symbol_candidates.length > 0;
        return Boolean(selected_symbol);
    }, [
        client?.currency,
        contract_pick_ok,
        contracts_loading,
        duration_pick_ok,
        hedge_available,
        markets_loading,
        prediction_pick_ok,
        qs_ready,
        selected_symbol,
        symbol_candidates.length,
        trading_mode,
    ]);

    const prediction_mode = speedLabPredictionMode(contract_type_api);
    React.useEffect(() => {
        const mode = speedLabPredictionMode(contract_type_api);
        if (mode === 'selected_tick') {
            setTradePrediction(p => Math.min(10, Math.max(1, p)));
        } else if (mode === 'barrier_digit') {
            setTradePrediction(p => Math.min(9, Math.max(0, p)));
        }
    }, [contract_type_api]);

    const run_controls_disabled = !is_running && (is_busy || !can_run_session);

    React.useEffect(() => {
        let cancelled = false;
        setMarketsLoading(true);
        setMarketsError(null);
        void (async () => {
            try {
                const list = await fetchSpeedLabMarketsPreferred();
                if (cancelled) return;
                setMarkets(list);
                const prev = selected_symbol_ref.current;
                const match = list.find(m => m.symbol === prev);
                const default_sym = list.find(m => m.symbol === SPEED_LAB_DEFAULT_ASSET_SYMBOL);
                const pick =
                    match ??
                    default_sym ??
                    list.find(m => m.is_open) ??
                    list[0];
                if (pick) {
                    setSelectedSymbol(pick.symbol);
                    setMarketQuery(pick.display_name);
                } else {
                    setSelectedSymbol('');
                    setMarketQuery('');
                }
            } catch (e) {
                if (!cancelled) {
                    setMarketsError(e instanceof Error ? e.message : 'Could not load markets');
                    setMarkets([]);
                }
            } finally {
                if (!cancelled) setMarketsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client?.is_logged_in, client?.loginid]);

    React.useEffect(() => {
        if (!selected_symbol || !qs_ready) {
            setTradeTypes([]);
            setTradetype('');
            return;
        }
        let cancelled = false;
        setContractsLoading(true);
        void (async () => {
            const types = await speedLabLoadTradeTypes(selected_symbol);
            if (cancelled) return;
            setTradeTypes(types);
            setTradetype(prev => {
                if (types.some(t => t.value === prev)) return prev;
                return types[0]?.value ?? '';
            });
            setContractsLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [selected_symbol, qs_ready]);

    React.useEffect(() => {
        if (!tradetype) {
            setContractOptions([]);
            setContractTypeApi('');
            return;
        }
        const opts = speedLabContractTypes(tradetype);
        setContractOptions(opts);
        setContractTypeApi(prev => (opts.some(o => o.value === prev) ? prev : opts[0]?.value ?? ''));
    }, [tradetype]);

    React.useEffect(() => {
        if (!selected_symbol || !tradetype || !qs_ready) {
            setDurationOptions([]);
            return;
        }
        let cancelled = false;
        setContractsLoading(true);
        void (async () => {
            const durs = await speedLabLoadDurations(selected_symbol, tradetype);
            if (cancelled) return;
            setDurationOptions(durs);
            const first = durs[0];
            if (first) {
                setDurationUnitApi(first.unit_api);
                setDurationMin(first.min);
                setDurationMax(first.max);
                setDuration(d => Math.min(first.max, Math.max(first.min, d)));
            } else {
                setDurationUnitApi('t');
                setDurationMin(1);
                setDurationMax(10);
            }
            setContractsLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [selected_symbol, tradetype, qs_ready]);

    const syncMarketListboxPosition = React.useCallback(() => {
        const el = market_wrap_ref.current ?? market_input_ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setMarketListboxLayout({
            top: r.bottom + 4,
            left: r.left,
            width: Math.max(r.width, 260),
        });
    }, []);

    React.useLayoutEffect(() => {
        if (!market_list_open) {
            setMarketListboxLayout(null);
            return;
        }
        syncMarketListboxPosition();
        const el = market_input_ref.current;
        const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(() => syncMarketListboxPosition()) : null;
        if (el && ro) ro.observe(el);
        window.addEventListener('scroll', syncMarketListboxPosition, true);
        window.addEventListener('resize', syncMarketListboxPosition);
        return () => {
            ro?.disconnect();
            window.removeEventListener('scroll', syncMarketListboxPosition, true);
            window.removeEventListener('resize', syncMarketListboxPosition);
        };
    }, [market_list_open, syncMarketListboxPosition, filtered_market_count, asset_list_filter_query, markets_loading]);

    const close_asset_list = React.useCallback(() => {
        setAssetFilterFromInput(false);
        const sel = selected_symbol_ref.current;
        const row = markets_ref.current.find(m => m.symbol === sel);
        if (row) setMarketQuery(row.display_name);
        setMarketListOpen(false);
    }, []);

    const open_asset_list = React.useCallback(() => {
        if (is_running) return;
        setAssetFilterFromInput(false);
        setMarketListOpen(true);
    }, [is_running]);

    React.useEffect(() => {
        const on_doc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (market_wrap_ref.current?.contains(t)) return;
            if (market_listbox_ref.current?.contains(t)) return;
            close_asset_list();
        };
        document.addEventListener('mousedown', on_doc);
        return () => document.removeEventListener('mousedown', on_doc);
    }, [close_asset_list]);

    React.useEffect(() => {
        if (!is_running) return undefined;
        if (!api_base.api) return undefined;

        const sub = api_base.api.onMessage().subscribe((msg: { data?: Record<string, unknown> }) => {
            const data = msg?.data;
            if (!data || data.msg_type !== 'transaction') return;
            const tx = data.transaction as Record<string, unknown> | undefined;
            if (!tx || String(tx.action) !== 'sell') return;
            const cid = tx.contract_id != null ? String(tx.contract_id) : '';
            if (!cid || !pending_contract_ids_ref.current.has(cid)) return;

            pending_contract_ids_ref.current.delete(cid);
            const buy_price = contract_buy_prices_ref.current.get(cid);
            contract_buy_prices_ref.current.delete(cid);

            const profit = extractSellNetProfit(tx, buy_price);
            if (profit === null) return;

            setTotalPnl(p => p + profit);
            if (profit >= 0) {
                setWins(w => w + 1);
                consecutive_losses_ref.current = 0;
                next_stake_ref.current = stake;
            } else {
                setLosses(l => l + 1);
                if (martingale_enabled) {
                    consecutive_losses_ref.current += 1;
                    if (consecutive_losses_ref.current >= martingale_reset_after) {
                        consecutive_losses_ref.current = 0;
                        next_stake_ref.current = stake;
                    } else {
                        let next = stake * martingale_multiplier ** consecutive_losses_ref.current;
                        if (martingale_max_stake !== '') {
                            next = Math.min(next, Number(martingale_max_stake));
                        }
                        next_stake_ref.current = Math.max(0.35, next);
                    }
                }
            }
            setCurrentStakeDisplay(next_stake_ref.current);
        });
        api_base.pushSubscription(sub);
        return () => sub.unsubscribe();
    }, [
        is_running,
        martingale_enabled,
        martingale_max_stake,
        martingale_multiplier,
        martingale_reset_after,
        stake,
    ]);

    const place_round = React.useCallback(async () => {
        if (!client?.currency || !api_base.api) {
            setTradeError('Connection or account not ready');
            return;
        }
        if (trading_mode !== 'multi_market') {
            if (!selected_symbol) {
                setTradeError('Choose a valid market from the list');
                return;
            }
            const picked = markets.find(m => m.symbol === selected_symbol);
            if (picked && !picked.is_open) {
                setTradeError('This market is closed. Pick an open symbol.');
                return;
            }
        } else if (!symbol_candidates.length) {
            setTradeError('No markets loaded to scan');
            return;
        }
        if (!speedLabPredictionInputValid(contract_type_api, trade_prediction)) {
            setTradeError(
                prediction_mode === 'selected_tick'
                    ? 'Tick index must be between 1 and 10.'
                    : 'Last digit must be between 0 and 9.'
            );
            return;
        }
        setTradeError(null);
        setIsBusy(true);
        try {
            const { contracts, legs } = await executeSpeedLabRound({
                symbol: selected_symbol,
                symbol_candidates: trading_mode === 'multi_market' ? symbol_candidates : undefined,
                contract_type_api,
                duration,
                duration_unit_api,
                trade_prediction,
                stake: next_stake_ref.current,
                currency: client.currency,
                trading_mode,
            });
            setTotalTrades(t => t + contracts);
            legs.forEach(({ contract_id, buy_price }) => {
                pending_contract_ids_ref.current.add(contract_id);
                contract_buy_prices_ref.current.set(contract_id, buy_price);
            });
        } catch (e) {
            setTradeError(e instanceof Error ? e.message : 'Trade failed');
        } finally {
            setIsBusy(false);
        }
    }, [
        client?.currency,
        contract_type_api,
        duration,
        duration_unit_api,
        markets,
        prediction_mode,
        selected_symbol,
        symbol_candidates,
        trade_prediction,
        trading_mode,
    ]);

    const place_round_ref = React.useRef(place_round);
    place_round_ref.current = place_round;

    React.useEffect(() => {
        if (!is_running) {
            if (interval_ref.current) {
                clearInterval(interval_ref.current);
                interval_ref.current = null;
            }
            if (tick_cleanup_ref.current) {
                tick_cleanup_ref.current();
                tick_cleanup_ref.current = null;
            }
            return;
        }

        if (!client?.currency) return;
        if (!selected_symbol && trading_mode !== 'multi_market') return;

        const use_ticks =
            trade_every_tick && (trading_mode !== 'multi_market' || Boolean(selected_symbol));

        if (use_ticks && selected_symbol) {
            tick_cleanup_ref.current = subscribeSpeedLabTicks(selected_symbol, () => {
                const now = Date.now();
                if (now - last_tick_trade_ref.current < TICK_DEBOUNCE_MS || is_busy_ref.current) return;
                last_tick_trade_ref.current = now;
                void place_round_ref.current();
            });
        } else {
            const every_ms = trading_mode === 'multi_market' && trade_every_tick ? TICK_DEBOUNCE_MS : INTERVAL_MS;
            interval_ref.current = setInterval(() => {
                if (!is_busy_ref.current) void place_round_ref.current();
            }, every_ms);
        }

        return () => {
            if (interval_ref.current) {
                clearInterval(interval_ref.current);
                interval_ref.current = null;
            }
            if (tick_cleanup_ref.current) {
                tick_cleanup_ref.current();
                tick_cleanup_ref.current = null;
            }
        };
    }, [is_running, trade_every_tick, selected_symbol, trading_mode, client?.currency]);

    const start_stop = React.useCallback(() => {
        if (is_running) {
            setIsRunning(false);
            setTradeError(null);
            return;
        }
        if (!client?.currency) {
            setTradeError('Please log in to trade');
            return;
        }
        if (!can_run_session) {
            if (!qs_ready) {
                setTradeError('Trading services are still connecting. Try again in a moment or open the Bot tab once.');
                return;
            }
            if (!contract_pick_ok || !duration_pick_ok) {
                setTradeError('Pick a trade category, contract, and duration (same source as Quick Strategy).');
                return;
            }
            if (!prediction_pick_ok) {
                setTradeError(
                    prediction_mode === 'selected_tick'
                        ? 'Enter a tick index from 1 to 10 for High/Low tick contracts.'
                        : 'Enter a last digit from 0 to 9 for this digit contract (Over/Under, Matches/Differs).'
                );
                return;
            }
            setTradeError(
                trading_mode === 'multi_market'
                    ? 'No open markets loaded to scan'
                    : 'Choose an open market before starting'
            );
            return;
        }
        pending_contract_ids_ref.current = new Set();
        contract_buy_prices_ref.current = new Map();
        consecutive_losses_ref.current = 0;
        next_stake_ref.current = Math.max(0.35, stake);
        setCurrentStakeDisplay(next_stake_ref.current);
        setTotalTrades(0);
        setWins(0);
        setLosses(0);
        setTotalPnl(0);
        setTradeError(null);
        last_tick_trade_ref.current = 0;
        setIsRunning(true);
    }, [
        can_run_session,
        client?.currency,
        contract_pick_ok,
        duration_pick_ok,
        is_running,
        prediction_mode,
        prediction_pick_ok,
        qs_ready,
        stake,
        trading_mode,
    ]);

    const win_rate_pct =
        wins + losses > 0 ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0;

    const commit_stake_input = React.useCallback(() => {
        const n = parseFloat(stake_input);
        if (Number.isNaN(n)) {
            setStakeInput(String(stake));
            return;
        }
        const s = Math.max(0.35, n);
        setStake(s);
        setStakeInput(String(s));
        if (!is_running) {
            next_stake_ref.current = s;
            setCurrentStakeDisplay(s);
        }
    }, [is_running, stake, stake_input]);

    const commit_duration_input = React.useCallback(() => {
        const n = parseInt(duration_input, 10);
        if (Number.isNaN(n)) {
            setDurationInput(String(duration));
            return;
        }
        const next_duration = Math.min(duration_max, Math.max(duration_min, n));
        setDuration(next_duration);
        setDurationInput(String(next_duration));
    }, [duration, duration_input, duration_max, duration_min]);

    const commit_martingale_multiplier_input = React.useCallback(() => {
        const n = parseFloat(martingale_multiplier_input);
        if (Number.isNaN(n)) {
            setMartingaleMultiplierInput(String(martingale_multiplier));
            return;
        }
        const next_multiplier = Math.max(1, n);
        setMartingaleMultiplier(next_multiplier);
        setMartingaleMultiplierInput(String(next_multiplier));
    }, [martingale_multiplier, martingale_multiplier_input]);

    const commit_martingale_max_stake_input = React.useCallback(() => {
        const val = martingale_max_stake_input.trim();
        if (val === '') {
            setMartingaleMaxStake('');
            setMartingaleMaxStakeInput('');
            return;
        }
        const n = parseFloat(val);
        if (Number.isNaN(n)) {
            setMartingaleMaxStakeInput(martingale_max_stake === '' ? '' : String(martingale_max_stake));
            return;
        }
        const next_max_stake = Math.max(0.35, n);
        setMartingaleMaxStake(next_max_stake);
        setMartingaleMaxStakeInput(String(next_max_stake));
    }, [martingale_max_stake, martingale_max_stake_input]);

    const commit_martingale_reset_after_input = React.useCallback(() => {
        const n = parseInt(martingale_reset_after_input, 10);
        if (Number.isNaN(n)) {
            setMartingaleResetAfterInput(String(martingale_reset_after));
            return;
        }
        const next_reset = Math.max(1, n);
        setMartingaleResetAfter(next_reset);
        setMartingaleResetAfterInput(String(next_reset));
    }, [martingale_reset_after, martingale_reset_after_input]);

    React.useEffect(() => {
        if (document.activeElement?.id !== 'speed-lab-stake') {
            setStakeInput(String(stake));
        }
    }, [stake]);

    React.useEffect(() => {
        if (document.activeElement?.id !== 'speed-lab-duration') {
            setDurationInput(String(duration));
        }
    }, [duration]);

    React.useEffect(() => {
        if (document.activeElement?.id !== 'speed-lab-mg-mul') {
            setMartingaleMultiplierInput(String(martingale_multiplier));
        }
    }, [martingale_multiplier]);

    React.useEffect(() => {
        if (document.activeElement?.id !== 'speed-lab-mg-max') {
            setMartingaleMaxStakeInput(martingale_max_stake === '' ? '' : String(martingale_max_stake));
        }
    }, [martingale_max_stake]);

    React.useEffect(() => {
        if (document.activeElement?.id !== 'speed-lab-mg-reset') {
            setMartingaleResetAfterInput(String(martingale_reset_after));
        }
    }, [martingale_reset_after]);

    const pick_market = (m: TSpeedLabMarketRow) => {
        if (!m.is_open) return;
        setSelectedSymbol(m.symbol);
        setMarketQuery(m.display_name);
        setAssetFilterFromInput(false);
        setMarketListOpen(false);
    };

    return (
    <div className='speed-lab'>
        <div className='speed-lab__glow' aria-hidden />
        <header className='speed-lab__head'>
            <button type='button' className='speed-lab__close' onClick={onClose} aria-label='Close Speed Lab'>
                <LegacyClose1pxIcon height='18px' width='18px' fill='currentColor' className='icon-general-fill-path' />
            </button>
            <p className='speed-lab__badge'>
                <LabelPairedGaugeMaxCaptionFillIcon
                    className='speed-lab__badge-icon'
                    height='14px'
                    width='14px'
                    fill='currentColor'
                    aria-hidden
                />
                <Localize i18n_default_text='HFT' />
            </p>
            <h2 id='speed-lab-heading' className='speed-lab__title'>
                <Localize i18n_default_text='Speed Lab' />
            </h2>
            <p className='speed-lab__subtitle'>
                    <Localize i18n_default_text='High-frequency trading — all speed features in one place' />
                </p>

                <div className='speed-lab__header-bar'>
                    <button
                        type='button'
                        className={classNames('speed-lab__run-btn', { 'speed-lab__run-btn--stop': is_running })}
                        onClick={start_stop}
                        disabled={run_controls_disabled}
                    >
                        <span className='speed-lab__run-btn-inner'>
                            {is_running ? (
                                <LabelPairedSquareMdFillIcon
                                    height='18px'
                                    width='18px'
                                    fill='currentColor'
                                    aria-hidden
                                />
                            ) : (
                                <LabelPairedPlayMdFillIcon
                                    height='18px'
                                    width='18px'
                                    fill='currentColor'
                                    aria-hidden
                                />
                            )}
                            <span>
                                {is_running ? (
                                    <Localize i18n_default_text='Stop' />
                                ) : (
                                    <Localize i18n_default_text='Run' />
                                )}
                            </span>
                        </span>
                    </button>
                    <p className='speed-lab__status' role='status'>
                        {is_running ? (
                            <Localize i18n_default_text='Bot is running' />
                        ) : (
                            <Localize i18n_default_text='Bot is not running' />
                        )}
                    </p>
                </div>

                <div
                    className={classNames('speed-lab__activity-track', {
                        'speed-lab__activity-track--active': is_running,
                    })}
                    role='progressbar'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={is_running ? undefined : 0}
                    aria-label='Trade activity'
                >
                    <div className='speed-lab__activity-fill' />
                </div>
            </header>

            <div className='speed-lab__body'>
                {trade_error && (
                    <div className='speed-lab__error' role='alert'>
                        {trade_error}
                    </div>
                )}

                <section className='speed-lab__section' aria-labelledby='speed-lab-s1'>
                    <h3 className='speed-lab__section-title' id='speed-lab-s1'>
                        <Localize i18n_default_text='Trading mode' />
                    </h3>
                    <div className='speed-lab__mode-grid'>
                        {TRADING_MODES.map(mode => (
                            <button
                                key={mode.id}
                                type='button'
                                className={classNames('speed-lab__mode-card', {
                                    'speed-lab__mode-card--active': trading_mode === mode.id,
                                })}
                                onClick={() => {
                                    if (mode.id === 'hedge' && !hedge_available) return;
                                    if (mode.id === 'hedge') setTradetype(SPEED_LAB_CALLPUT_TRADETYPE);
                                    setTradingMode(mode.id);
                                }}
                                disabled={is_running || (mode.id === 'hedge' && !hedge_available)}
                                title={
                                    mode.id === 'hedge' && !hedge_available
                                        ? 'Hedge needs Rise/Fall (call/put) on this symbol — pick another asset or mode'
                                        : undefined
                                }
                            >
                                <span className='speed-lab__mode-icon'>{mode.icon}</span>
                                <span className='speed-lab__mode-title'>{mode.title}</span>
                                <span className='speed-lab__mode-desc'>{mode.description}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className='speed-lab__section' aria-labelledby='speed-lab-s2'>
                    <h3 className='speed-lab__section-title' id='speed-lab-s2'>
                        <Localize i18n_default_text='Asset' />
                    </h3>
                    <p className='speed-lab__section-lede speed-lab__section-lede--tight'>
                        <Localize i18n_default_text='Tap the field or arrow to see all assets (same groups as Quick Strategy). Type to narrow the list.' />
                    </p>
                    <div className='speed-lab__field'>
                        <label className='speed-lab__label' htmlFor='speed-lab-market-input'>
                            <Localize i18n_default_text='Asset' />
                        </label>
                        <div className='speed-lab__combobox speed-lab__asset-combobox' ref={market_wrap_ref}>
                            <input
                                ref={market_input_ref}
                                id='speed-lab-market-input'
                                className='speed-lab__input speed-lab__asset-input'
                                type='text'
                                autoComplete='off'
                                value={market_query}
                                onChange={e => {
                                    setMarketQuery(e.target.value);
                                    setAssetFilterFromInput(true);
                                    setMarketListOpen(true);
                                }}
                                onFocus={() => open_asset_list()}
                                onKeyDown={e => {
                                    if (e.key === 'Escape' && market_list_open) {
                                        e.preventDefault();
                                        close_asset_list();
                                    }
                                }}
                                disabled={is_running}
                                aria-expanded={market_list_open}
                                aria-controls='speed-lab-market-list'
                                aria-autocomplete='list'
                                placeholder={
                                    markets_loading
                                        ? localize('Loading markets…')
                                        : localize('Select asset — tap to see full list')
                                }
                            />
                            <button
                                type='button'
                                className={classNames('speed-lab__asset-dropdown-btn', {
                                    'speed-lab__asset-dropdown-btn--open': market_list_open,
                                })}
                                aria-label='Open asset list'
                                aria-expanded={market_list_open}
                                aria-controls='speed-lab-market-list'
                                disabled={is_running}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    if (market_list_open) {
                                        close_asset_list();
                                    } else {
                                        open_asset_list();
                                        market_input_ref.current?.focus();
                                    }
                                }}
                            >
                                <LabelPairedChevronDownLgRegularIcon
                                    height='22px'
                                    width='22px'
                                    fill='currentColor'
                                />
                            </button>
                            {typeof document !== 'undefined' &&
                                market_list_open &&
                                market_listbox_layout &&
                                createPortal(
                                    <ul
                                        ref={market_listbox_ref}
                                        id='speed-lab-market-list'
                                        className='speed-lab__listbox speed-lab__listbox--portal'
                                        role='listbox'
                                        style={{
                                            position: 'fixed',
                                            top: market_listbox_layout.top,
                                            left: market_listbox_layout.left,
                                            width: market_listbox_layout.width,
                                            zIndex: 12000,
                                        }}
                                    >
                                        {markets_loading ? (
                                            <li className='speed-lab__listbox-empty' role='presentation'>
                                                <span className='speed-lab__listbox-empty-text'>
                                                    <Localize i18n_default_text='Loading markets…' />
                                                </span>
                                            </li>
                                        ) : filtered_market_count === 0 ? (
                                            <li className='speed-lab__listbox-empty' role='presentation'>
                                                <span className='speed-lab__listbox-empty-text'>
                                                    {markets.length === 0 ? (
                                                        <Localize i18n_default_text='No assets available' />
                                                    ) : (
                                                        <Localize i18n_default_text='No matching assets' />
                                                    )}
                                                </span>
                                            </li>
                                        ) : (
                                            grouped_filtered_markets.map(section => (
                                                <React.Fragment key={section.group_key}>
                                                    <li className='speed-lab__listbox-group' role='presentation'>
                                                        <span className='speed-lab__listbox-group-label' aria-hidden>
                                                            {section.group_key === '__other__' ? (
                                                                <Localize i18n_default_text='Other' />
                                                            ) : (
                                                                section.group_key
                                                            )}
                                                        </span>
                                                    </li>
                                                    {section.items.map(m => (
                                                        <li key={m.symbol} role='option'>
                                                            <button
                                                                type='button'
                                                                className={classNames('speed-lab__listbox-item', {
                                                                    'speed-lab__listbox-item--closed': !m.is_open,
                                                                })}
                                                                onClick={() => pick_market(m)}
                                                                disabled={!m.is_open}
                                                                title={
                                                                    m.is_open
                                                                        ? undefined
                                                                        : 'Market is closed or suspended'
                                                                }
                                                            >
                                                                <span
                                                                    className='speed-lab__listbox-item-icon'
                                                                    aria-hidden
                                                                >
                                                                    <MarketIcon type={m.symbol} size='md' />
                                                                </span>
                                                                <span className='speed-lab__listbox-item-body'>
                                                                    <span className='speed-lab__listbox-item-label'>
                                                                        {m.display_name}
                                                                    </span>
                                                                    <span className='speed-lab__listbox-item-code'>
                                                                        {m.symbol}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </ul>,
                                    document.body
                                )}
                        </div>
                        {markets_error && (
                            <p className='speed-lab__markets-msg speed-lab__markets-msg--error' role='alert'>
                                {markets_error}
                            </p>
                        )}
                        {!markets_loading && !markets.length && !markets_error && (
                            <p className='speed-lab__markets-msg'>
                                <Localize i18n_default_text='No assets available. Check your connection and account, or open the Bot tab once to initialise symbol lists.' />
                            </p>
                        )}
                        {trading_mode === 'multi_market' && !markets_loading && markets.length > 0 && (
                            <p className='speed-lab__hint'>
                                <Localize i18n_default_text='Multi-Market scans all loaded assets each round and buys where the proposal payout is highest for your contract settings.' />
                            </p>
                        )}
                    </div>
                </section>

                <section className='speed-lab__section' aria-labelledby='speed-lab-s3'>
                    <h3 className='speed-lab__section-title' id='speed-lab-s3'>
                        <Localize i18n_default_text='Trade setup' />
                    </h3>
                    <p className='speed-lab__section-lede'>
                        <Localize i18n_default_text='Same pipeline as Quick Strategy: trade categories and contracts come from contracts_for on your account.' />
                    </p>
                    {!qs_ready && (
                        <p className='speed-lab__markets-msg speed-lab__markets-msg--error' role='status'>
                            <Localize i18n_default_text='Initializing trading API… If this stays, open the Bot tab once so the app loads contract metadata.' />
                        </p>
                    )}
                    <div className='speed-lab__field'>
                        <span className='speed-lab__label' id='speed-lab-tt-lbl'>
                            <Localize i18n_default_text='Trade categories' />
                        </span>
                        <div
                            className='speed-lab__trade-type-row'
                            role='group'
                            aria-labelledby='speed-lab-tt-lbl'
                        >
                            {contracts_loading && !trade_types.length ? (
                                <span className='speed-lab__inline-hint'>
                                    <Localize i18n_default_text='Loading trade types…' />
                                </span>
                            ) : (
                                trade_types.map(tt => (
                                    <button
                                        key={tt.value}
                                        type='button'
                                        className={classNames('speed-lab__trade-type-chip', {
                                            'speed-lab__trade-type-chip--active': tradetype === tt.value,
                                        })}
                                        onClick={() => {
                                            if (!is_running) setTradetype(tt.value);
                                        }}
                                        disabled={is_running}
                                    >
                                        <span className='speed-lab__trade-type-chip-icons'>
                                            {Array.isArray(tt.icon) && tt.icon.length
                                                ? tt.icon.map((ic, idx) => (
                                                      <TradeTypeIcon
                                                          key={`${tt.value}-${ic}-${idx}`}
                                                          type={ic}
                                                          className='speed-lab__trade-type-chip-icon'
                                                          size='sm'
                                                      />
                                                  ))
                                                : null}
                                        </span>
                                        <span className='speed-lab__trade-type-chip-text'>{tt.text}</span>
                                        {tt.group ? (
                                            <span className='speed-lab__trade-type-chip-group'>{tt.group}</span>
                                        ) : null}
                                    </button>
                                ))
                            )}
                        </div>
                        {!contracts_loading &&
                            qs_ready &&
                            selected_symbol &&
                            trade_types.length === 0 && (
                                <span className='speed-lab__inline-hint' role='status'>
                                    <Localize i18n_default_text='No trade categories for this symbol. Try another market.' />
                                </span>
                            )}
                    </div>
                    <div className='speed-lab__field'>
                        <span className='speed-lab__label' id='speed-lab-ct-lbl'>
                            <Localize i18n_default_text='Contract' />
                        </span>
                        <div
                            className='speed-lab__contract-grid'
                            role='group'
                            aria-labelledby='speed-lab-ct-lbl'
                        >
                            {contract_options.map(opt => (
                                <button
                                    key={opt.value}
                                    type='button'
                                    className={classNames('speed-lab__contract-pill', {
                                        'speed-lab__contract-pill--active': contract_type_api === opt.value,
                                    })}
                                    onClick={() => {
                                        if (!is_running) setContractTypeApi(opt.value);
                                    }}
                                    disabled={is_running}
                                >
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                        {Boolean(tradetype) &&
                            !contracts_loading &&
                            contract_options.length === 0 && (
                                <span className='speed-lab__inline-hint' role='status'>
                                    <Localize i18n_default_text='No contract types for this category on your account.' />
                                </span>
                            )}
                    </div>
                    {prediction_mode === 'barrier_digit' && (
                        <div className='speed-lab__field'>
                            <label className='speed-lab__label' htmlFor='speed-lab-prediction-digit'>
                                <Localize i18n_default_text='Last digit prediction' />
                            </label>
                            <select
                                id='speed-lab-prediction-digit'
                                className='speed-lab__select'
                                value={trade_prediction}
                                onChange={e => {
                                    setTradePrediction(Math.min(9, Math.max(0, Number(e.target.value))));
                                }}
                                disabled={is_running}
                                aria-describedby='speed-lab-prediction-digit-hint'
                            >
                                {DIGIT_PREDICTION_OPTIONS.map(digit => (
                                    <option key={digit} value={digit}>
                                        {digit}
                                    </option>
                                ))}
                            </select>
                            <p className='speed-lab__inline-hint' id='speed-lab-prediction-digit-hint'>
                                <Localize i18n_default_text='Used for Over/Under and Matches/Differs (barrier sent on the proposal, same as Quick Strategy).' />
                            </p>
                        </div>
                    )}
                    {prediction_mode === 'selected_tick' && (
                        <div className='speed-lab__field'>
                            <label className='speed-lab__label' htmlFor='speed-lab-prediction-tick'>
                                <Localize i18n_default_text='Tick index' />
                            </label>
                            <select
                                id='speed-lab-prediction-tick'
                                className='speed-lab__select'
                                value={trade_prediction}
                                onChange={e => {
                                    setTradePrediction(Math.min(10, Math.max(1, Number(e.target.value))));
                                }}
                                disabled={is_running}
                                aria-describedby='speed-lab-prediction-tick-hint'
                            >
                                {TICK_INDEX_OPTIONS.map(tick_index => (
                                    <option key={tick_index} value={tick_index}>
                                        {tick_index}
                                    </option>
                                ))}
                            </select>
                            <p className='speed-lab__inline-hint' id='speed-lab-prediction-tick-hint'>
                                <Localize i18n_default_text='High/Low tick contracts use selected_tick on the proposal (1 = first tick of the window).' />
                            </p>
                        </div>
                    )}
                    <div className='speed-lab__qs-strip' aria-label='Purchase conditions'>
                        <span className='speed-lab__qs-pill'>
                            <Localize i18n_default_text='Basis' />: Stake
                        </span>
                        <span className='speed-lab__qs-pill'>
                            <Localize i18n_default_text='Entry' />:{' '}
                            <Localize i18n_default_text='Immediate' />
                        </span>
                        <span className='speed-lab__qs-pill'>
                            <Localize i18n_default_text='Sell / exit' />:{' '}
                            <Localize i18n_default_text='At expiry (QS vanilla flow)' />
                    </span>
                </div>
                </section>

                <section className='speed-lab__section' aria-labelledby='speed-lab-s4'>
                    <h3 className='speed-lab__section-title' id='speed-lab-s4'>
                        <Localize i18n_default_text='Trade settings' />
                    </h3>
                    <div className='speed-lab__row3'>
                        <div className='speed-lab__field'>
                            <label className='speed-lab__label' htmlFor='speed-lab-stake'>
                                <Localize i18n_default_text='Stake (USD)' />
                            </label>
                            <input
                                id='speed-lab-stake'
                                className='speed-lab__input'
                                type='number'
                                min={0.35}
                                step={0.01}
                                value={stake_input}
                                onChange={e => setStakeInput(e.target.value)}
                                onBlur={commit_stake_input}
                                disabled={is_running}
                            />
                        </div>
                        <div className='speed-lab__field'>
                            <label className='speed-lab__label' htmlFor='speed-lab-duration'>
                                <Localize i18n_default_text='Duration' />
                            </label>
                            <input
                                id='speed-lab-duration'
                                className='speed-lab__input'
                                type='number'
                                min={duration_min}
                                max={duration_max}
                                step={1}
                                value={duration_input}
                                onChange={e => setDurationInput(e.target.value)}
                                onBlur={commit_duration_input}
                                disabled={is_running || !duration_options.length}
                            />
                        </div>
                        <div className='speed-lab__field'>
                            <label className='speed-lab__label' htmlFor='speed-lab-dur-unit'>
                                <Localize i18n_default_text='Duration unit' />
                            </label>
                            <select
                                id='speed-lab-dur-unit'
                                className='speed-lab__select'
                                value={duration_unit_api}
                                onChange={e => {
                                    const u = e.target.value;
                                    setDurationUnitApi(u);
                                    const row = duration_options.find(d => d.unit_api === u);
                                    if (row) {
                                        setDurationMin(row.min);
                                        setDurationMax(row.max);
                                        setDuration(d => Math.min(row.max, Math.max(row.min, d)));
                                    }
                                }}
                                disabled={is_running || !duration_options.length}
                            >
                                {duration_options.map(d => (
                                    <option key={d.unit_api} value={d.unit_api}>
                                        {d.display}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {Boolean(tradetype) &&
                        qs_ready &&
                        selected_symbol &&
                        !contracts_loading &&
                        duration_options.length === 0 && (
                            <p className='speed-lab__inline-hint' role='status'>
                                <Localize i18n_default_text='No duration range returned for this setup. Pick another category or symbol.' />
                            </p>
                        )}
                    <div
                        className={classNames('speed-lab__toggle-row', {
                            'speed-lab__toggle-row--disabled': is_running,
                        })}
                    >
                        <Text size='s' className='speed-lab__toggle-label' as='span'>
                            <Localize i18n_default_text='Trade every tick' />
                        </Text>
                        <ToggleSwitch
                            id='speed-lab-every-tick'
                            name='trade_every_tick'
                            is_enabled={trade_every_tick}
                            handleToggle={() => {
                                if (!is_running) setTradeEveryTick(v => !v);
                            }}
                        />
                    </div>
                    {trade_every_tick && (
                        <p className='speed-lab__hint'>
                            <Localize i18n_default_text='When enabled, a trade is placed on every tick received from the WebSocket.' />
                        </p>
                    )}
                </section>

                <section className='speed-lab__section' aria-labelledby='speed-lab-s5'>
                    <h3 className='speed-lab__section-title' id='speed-lab-s5'>
                        <Localize i18n_default_text='Martingale' />
                    </h3>
                    <label className='speed-lab__check-row'>
                        <input
                            type='checkbox'
                            className='speed-lab__checkbox'
                            checked={martingale_enabled}
                            onChange={() => setMartingaleEnabled(v => !v)}
                            disabled={is_running}
                        />
                        <span>
                            <Localize i18n_default_text='Enable Martingale on loss' />
                        </span>
                    </label>
                    {martingale_enabled && (
                        <div className='speed-lab__martingale-fields'>
                            <div className='speed-lab__field'>
                                <label className='speed-lab__label' htmlFor='speed-lab-mg-mul'>
                                    <Localize i18n_default_text='Multiplier' />
                                </label>
                                <input
                                    id='speed-lab-mg-mul'
                                    className='speed-lab__input'
                                    type='number'
                                    min={1}
                                    step={0.1}
                                    value={martingale_multiplier_input}
                                    onChange={e => setMartingaleMultiplierInput(e.target.value)}
                                    onBlur={commit_martingale_multiplier_input}
                                    disabled={is_running}
                                />
                            </div>
                            <div className='speed-lab__field'>
                                <label className='speed-lab__label' htmlFor='speed-lab-mg-max'>
                                    <Localize i18n_default_text='Max stake (optional)' />
                                </label>
                                <input
                                    id='speed-lab-mg-max'
                                    className='speed-lab__input'
                                    type='number'
                                    min={0.35}
                                    step={0.01}
                                    placeholder='—'
                                    value={martingale_max_stake_input}
                                    onChange={e => setMartingaleMaxStakeInput(e.target.value)}
                                    onBlur={commit_martingale_max_stake_input}
                                    disabled={is_running}
                                />
                            </div>
                            <div className='speed-lab__field'>
                                <label className='speed-lab__label' htmlFor='speed-lab-mg-reset'>
                                    <Localize i18n_default_text='Reset after (losses)' />
                                </label>
                                <input
                                    id='speed-lab-mg-reset'
                                    className='speed-lab__input'
                                    type='number'
                                    min={1}
                                    step={1}
                                    value={martingale_reset_after_input}
                                    onChange={e => setMartingaleResetAfterInput(e.target.value)}
                                    onBlur={commit_martingale_reset_after_input}
                                    disabled={is_running}
                                />
                            </div>
                        </div>
                    )}
                </section>

                <button
                    type='button'
                    className={classNames('speed-lab__cta', { 'speed-lab__cta--danger': is_running })}
                    onClick={start_stop}
                    disabled={run_controls_disabled}
                >
                    <span className='speed-lab__cta-inner'>
                        {is_running ? (
                            <LabelPairedSquareMdFillIcon
                                className='speed-lab__cta-icon'
                                height='22px'
                                width='22px'
                                fill='currentColor'
                                aria-hidden
                            />
                        ) : (
                            <LabelPairedPlayMdFillIcon
                                className='speed-lab__cta-icon'
                                height='22px'
                                width='22px'
                                fill='currentColor'
                                aria-hidden
                            />
                        )}
                        {is_running ? (
                            <Localize i18n_default_text='Stop trading' />
                        ) : (
                            <Localize i18n_default_text='Start trading' />
                        )}
                    </span>
                </button>

                {is_running && (
                    <section className='speed-lab__stats' aria-labelledby='speed-lab-stats-h'>
                        <h3 className='speed-lab__stats-title' id='speed-lab-stats-h'>
                            <Localize i18n_default_text='Live stats' />
                        </h3>
                        <div className='speed-lab__stats-grid'>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Total trades' />
                                </span>
                                <span className='speed-lab__stat-value'>{total_trades}</span>
                            </div>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Wins' />
                                </span>
                                <span className='speed-lab__stat-value speed-lab__stat-value--win'>{wins}</span>
                            </div>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Losses' />
                                </span>
                                <span className='speed-lab__stat-value speed-lab__stat-value--loss'>{losses}</span>
                            </div>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Current stake' />
                                </span>
                                <span className='speed-lab__stat-value'>${formatUsd(current_stake_display)}</span>
                            </div>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Total P/L' />
                                </span>
                                <span
                                    className={classNames('speed-lab__stat-value', {
                                        'speed-lab__stat-value--win': total_pnl > 0,
                                        'speed-lab__stat-value--loss': total_pnl < 0,
                                    })}
                                >
                                    {total_pnl >= 0 ? '+' : ''}
                                    {formatUsd(total_pnl)}
                    </span>
                </div>
                            <div className='speed-lab__stat'>
                                <span className='speed-lab__stat-label'>
                                    <Localize i18n_default_text='Win rate' />
                                </span>
                                <span className='speed-lab__stat-value'>{win_rate_pct}%</span>
                </div>
            </div>
                        <p className='speed-lab__stats-note'>
                            <Localize i18n_default_text='P/L and win/loss update when contracts settle (sell). Uses the same proposal → buy flow as Quick Strategy / the trading engine.' />
                </p>
                    </section>
                )}
            </div>
        </div>
    );
};
