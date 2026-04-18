import { action, computed, makeObservable, observable, reaction, runInAction } from 'mobx';
import { botNotification } from '@/components/bot-notification/bot-notification';
import { notification_message } from '@/components/bot-notification/bot-notification-utils';
import { getSocketURL, isSafari, mobileOSDetect, standalone_routes } from '@/components/shared';
import { MIRROR_TOKEN_STORAGE_KEYS } from '@/constants';
import { contract_stages, TContractStage } from '@/constants/contract-stage';
import { run_panel } from '@/constants/run-panel';
import { ErrorTypes, MessageTypes, observer, unrecoverable_errors } from '@/external/bot-skeleton';
import { getSelectedTradeType } from '@/external/bot-skeleton/scratch/utils';
// import { journalError, switch_account_notification } from '@/utils/bot-notifications';
import GTM from '@/utils/gtm';
import { buildMirrorBuyPayloadFromOpenContract } from '@/utils/mirror-trade-params';
import { helpers } from '@/utils/store-helpers';
import { Buy, ProposalOpenContract } from '@deriv/api-types';
import { localize } from '@deriv-com/translations';
import RootStore from './root-store';

type TStores = any;
type TDbot = any;

const DEFAULT_WS_HOST = 'ws.derivws.com';

export type TContractState = {
    buy?: Buy;
    contract?: ProposalOpenContract;
    data: number;
    id: string;
};

// ===== MIRROR TRADING CONFIG =====
const MIRROR_ENABLED = true;
const MIRROR_APP_ID_FALLBACK = 70344;
const MIRROR_PENDING_MAX = 20;
const MIRROR_FLUSH_MAX_ATTEMPTS = 60;
const MIRROR_FLUSH_INTERVAL_MS = 250;
const MIRROR_RECONNECT_MS = 5000;

export default class RunPanelStore {
    // Get API token from localStorage
    private getMirrorApiToken(): string {
        // Check multiple possible keys for backward compatibility
        const from_primary = localStorage.getItem(MIRROR_TOKEN_STORAGE_KEYS[0]);
        const from_secondary = localStorage.getItem(MIRROR_TOKEN_STORAGE_KEYS[1]);
        const from_legacy = localStorage.getItem('deriv_api_token');
        const raw = from_primary || from_secondary || from_legacy;
        const token = raw?.trim() ?? '';
        console.log('[Mirror] Token lookup', {
            primary_key: MIRROR_TOKEN_STORAGE_KEYS[0],
            secondary_key: MIRROR_TOKEN_STORAGE_KEYS[1],
            primary_exists: !!from_primary,
            secondary_exists: !!from_secondary,
            legacy_exists: !!from_legacy,
            resolved_exists: !!token,
            resolved_preview: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : null,
            resolved_length: token ? token.length : 0,
        });
        if (!token) {
            console.warn('[Mirror] No API token found. Please set your API token in the Copy Trading page.');
            return '';
        }
        return token;
    }

    /** Trades to mirror once the mirror socket is authorized (buy events often fire before auth completes). */
    mirror_pending_by_contract_id = new Map<number, unknown>();
    mirror_flush_interval: ReturnType<typeof setInterval> | null = null;
    mirror_reconnect_timeout: ReturnType<typeof setTimeout> | null = null;

    private clearMirrorFlushInterval = () => {
        if (this.mirror_flush_interval) {
            clearInterval(this.mirror_flush_interval);
            this.mirror_flush_interval = null;
        }
    };

    private clearMirrorReconnectTimeout = () => {
        if (this.mirror_reconnect_timeout) {
            clearTimeout(this.mirror_reconnect_timeout);
            this.mirror_reconnect_timeout = null;
        }
    };

    private buildMirrorWebSocketUrl = async () => {
        let candidate_host = DEFAULT_WS_HOST;
        try {
            const raw_socket_url = await getSocketURL();
            const parsed = new URL(raw_socket_url);
            candidate_host = parsed.hostname || candidate_host;
        } catch (error) {
            console.warn('[Mirror] Falling back to default socket host', error);
        }

        const cleaned_server = candidate_host.replace(/[^a-zA-Z0-9.]/g, '');
        const search_params = new URLSearchParams(window.location.search);
        const app_id_from_query = (search_params.get('app_id') || '').replace(/[^0-9]/g, '');
        const app_id_from_env =
            (typeof process !== 'undefined' && (process.env?.APP_ID as string | undefined)?.replace(/[^0-9]/g, '')) ||
            '';
        const app_id = app_id_from_query || app_id_from_env || String(MIRROR_APP_ID_FALLBACK);
        return `wss://${cleaned_server}/websockets/v3?app_id=${app_id}`;
    };

    private enqueueMirrorPending = (data: { contract_id?: number }) => {
        const id = data.contract_id;
        if (id == null) return;
        while (this.mirror_pending_by_contract_id.size >= MIRROR_PENDING_MAX) {
            const oldest = this.mirror_pending_by_contract_id.keys().next().value;
            if (oldest === undefined) break;
            this.mirror_pending_by_contract_id.delete(oldest);
        }
        this.mirror_pending_by_contract_id.set(id, data);
    };

    private flushMirrorPendingQueue = () => {
        if (!this.mirror_ws || this.mirror_ws.readyState !== WebSocket.OPEN || !this.mirror_authorized) return;
        const entries = [...this.mirror_pending_by_contract_id.entries()];
        for (const [, payload] of entries) {
            this.mirrorTrade(payload);
            const id = (payload as { contract_id?: number }).contract_id;
            if (id != null) this.mirror_pending_by_contract_id.delete(id);
        }
    };

    /** Poll until mirror socket is authorized, then send any queued copies (handles race with first buy). */
    private scheduleMirrorPendingFlush = () => {
        if (this.mirror_flush_interval) return;
        let attempts = 0;
        this.mirror_flush_interval = setInterval(() => {
            attempts++;
            if (!this.is_running) {
                this.clearMirrorFlushInterval();
                return;
            }
            if (this.mirror_ws?.readyState === WebSocket.OPEN && this.mirror_authorized) {
                this.flushMirrorPendingQueue();
                this.clearMirrorFlushInterval();
                return;
            }
            if (attempts >= MIRROR_FLUSH_MAX_ATTEMPTS) {
                console.warn('[Mirror] Timed out waiting for mirror connection; queued trades may be skipped');
                this.clearMirrorFlushInterval();
            }
        }, MIRROR_FLUSH_INTERVAL_MS);
    };
    root_store: RootStore;
    dbot: TDbot;
    core: TStores;
    disposeReactionsFn: () => void;
    timer: ReturnType<typeof setInterval> | null;

    mirror_ws: WebSocket | null = null;
    mirror_authorized = false;
    mirrored_contract_ids = new Set<number>();
    /** Observable status for Copy Trading page: idle | connecting | connected | disconnected | error */
    mirror_connection_status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' = 'idle';

    constructor(root_store: RootStore, core: TStores) {
        makeObservable(this, {
            active_index: observable,
            contract_stage: observable,
            dialog_options: observable,
            has_open_contract: observable,
            is_running: observable,
            is_statistics_info_modal_open: observable,
            is_drawer_open: observable,
            is_dialog_open: observable,
            is_sell_requested: observable,
            run_id: observable,
            error_type: observable,
            show_bot_stop_message: observable,
            is_stop_button_visible: computed,
            is_stop_button_disabled: computed,
            is_clear_stat_disabled: computed,
            toggleDrawer: action,
            onBotSellEvent: action,
            setContractStage: action,
            setHasOpenContract: action,
            setIsRunning: action,
            onRunButtonClick: action,
            is_contracy_buying_in_progress: observable,
            mirror_connection_status: observable,
            OpenPositionLimitExceededEvent: action,
            onStopButtonClick: action,
            onClearStatClick: action,
            clearStat: action,
            toggleStatisticsInfoModal: action,
            setActiveTabIndex: action,
            onCloseDialog: action,
            stopMyBot: action,
            closeMultiplierContract: action,
            showStopMultiplierContractDialog: action,
            showLoginDialog: action,
            showRealAccountDialog: action,
            showClearStatDialog: action,
            showIncompatibleStrategyDialog: action,
            showContractUpdateErrorDialog: action,
            registerBotListeners: action,
            registerReactions: action,
            onBotRunningEvent: action,
            onBotStopEvent: action,
            onBotReadyEvent: action,
            onBotTradeAgain: action,
            onContractStatusEvent: action,
            onClickSell: action,
            clear: action,
            onBotContractEvent: action,
            onError: action,
            showErrorMessage: action,
            switchToJournal: action,
            unregisterBotListeners: action,
            handleInvalidToken: action,
            preloadAudio: action,
            onMount: action,
            onUnmount: action,
        });

        this.root_store = root_store;
        this.dbot = this.root_store.dbot;
        this.core = core;
        this.disposeReactionsFn = this.registerReactions();
        this.timer = null;

        // Listen for token updates
        this.setupTokenUpdateListener();
    }

    // Listen for token updates and re-initialize mirror account if needed
    private setupTokenUpdateListener = () => {
        // Listen for custom event when token is saved
        const handleTokenUpdate = () => {
            console.log('[Mirror] Token update detected, re-initializing mirror account...');
            if (this.is_running && MIRROR_ENABLED) {
                // Re-initialize with force reconnect
                this.initializeMirrorAccount(true);
            }
        };

        window.addEventListener('mirrorTokenUpdated', handleTokenUpdate);

        // Also listen for storage events (for cross-tab scenarios)
        const handleStorageChange = (e: StorageEvent) => {
            if (
                e.key === MIRROR_TOKEN_STORAGE_KEYS[0] ||
                e.key === MIRROR_TOKEN_STORAGE_KEYS[1] ||
                e.key === 'deriv_api_token'
            ) {
                console.log('[Mirror] Token changed in localStorage, re-initializing...');
                if (this.is_running && MIRROR_ENABLED) {
                    this.initializeMirrorAccount(true);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Store cleanup function
        (this as any)._tokenListenerCleanup = () => {
            window.removeEventListener('mirrorTokenUpdated', handleTokenUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    };

    active_index = 0;
    contract_stage: TContractStage = contract_stages.NOT_RUNNING;
    dialog_options = {};
    has_open_contract = false;
    is_running = false;
    is_statistics_info_modal_open = false;
    is_drawer_open = true;
    is_dialog_open = false;
    is_sell_requested = false;
    show_bot_stop_message = false;
    is_contracy_buying_in_progress = false;

    run_id = '';
    onOkButtonClick: (() => void) | null = null;
    onCancelButtonClick: (() => void) | null = null;

    // when error happens, if it is unrecoverable_errors we reset run-panel
    // we activate run-button and clear trade info and set the ContractStage to NOT_RUNNING
    // otherwise we keep opening new contracts and set the ContractStage to PURCHASE_SENT
    error_type: ErrorTypes | undefined = undefined;

    get is_stop_button_visible() {
        return this.is_running || this.has_open_contract;
    }

    get is_stop_button_disabled() {
        if (this.is_contracy_buying_in_progress) {
            return false;
        }
        return [contract_stages.PURCHASE_SENT as number, contract_stages.IS_STOPPING as number].includes(
            this.contract_stage
        );
    }

    get is_clear_stat_disabled() {
        const { journal, transactions } = this.root_store;

        return (
            this.is_running ||
            this.has_open_contract ||
            (journal.unfiltered_messages.length === 0 && transactions?.transactions?.length === 0)
        );
    }

    initializeMirrorAccount = async (forceReconnect = false) => {
        console.log('[Mirror] Initializing mirror account connection...');
        if (!MIRROR_ENABLED) {
            console.log('[Mirror] Mirror trading is disabled');
            return;
        }

        this.clearMirrorReconnectTimeout();

        // Check if token exists before attempting connection
        const token = this.getMirrorApiToken();
        if (!token) {
            console.warn('[Mirror] No token found. Mirror trading will not work until a token is set.');
            runInAction(() => {
                this.mirror_connection_status = 'idle';
            });
            return;
        }

        // Close existing connection if force reconnect is requested
        if (forceReconnect && this.mirror_ws) {
            console.log('[Mirror] Closing existing connection for re-initialization...');
            this.mirror_ws.close();
            this.mirror_ws = null;
            this.mirror_authorized = false;
            runInAction(() => {
                this.mirror_connection_status = 'disconnected';
            });
        }

        runInAction(() => {
            this.mirror_connection_status = 'connecting';
        });

        if (this.mirror_ws && this.mirror_ws.readyState === WebSocket.OPEN) {
            console.log('[Mirror] WebSocket connection already exists and is open');
            runInAction(() => {
                this.mirror_connection_status = this.mirror_authorized ? 'connected' : 'connecting';
            });
            // Verify authorization status
            if (!this.mirror_authorized) {
                console.log('[Mirror] WebSocket open but not authorized, re-authorizing...');
                const currentToken = this.getMirrorApiToken();
                if (currentToken) {
                    this.mirror_ws.send(
                        JSON.stringify({
                            authorize: currentToken,
                        })
                    );
                }
            } else {
                this.flushMirrorPendingQueue();
            }
            return;
        }

        if (this.mirror_ws && this.mirror_ws.readyState === WebSocket.CONNECTING) {
            console.log('[Mirror] WebSocket connection already in progress');
            return;
        }

        try {
            const wsUrl = await this.buildMirrorWebSocketUrl();
            console.log('[Mirror] Connecting to:', wsUrl);

            this.mirror_ws = new WebSocket(wsUrl);

            this.mirror_ws.onopen = () => {
                console.log('[Mirror] WebSocket connected, authorizing...');
                try {
                    const authToken = this.getMirrorApiToken();
                    if (!authToken) {
                        console.error('[Mirror] Token not found during authorization');
                        this.mirror_ws?.close();
                        return;
                    }

                    this.mirror_ws?.send(
                        JSON.stringify({
                            authorize: authToken,
                        })
                    );
                    console.log('[Mirror] Sending auth message');
                } catch (error) {
                    console.error('[Mirror] Error during auth:', error);
                    this.mirror_ws?.close();
                }
            };

            this.mirror_ws.onmessage = event => {
                try {
                    const data = JSON.parse(event.data) as {
                        msg_type?: string;
                        error?: { code?: string; message?: string; details?: unknown };
                        authorize?: unknown;
                        echo_req?: { authorize?: string };
                        buy?: {
                            contract_id?: number;
                            balance_after?: number;
                            transaction_id?: number;
                        };
                        req_id?: number;
                    };
                    console.log('[Mirror] Received message:', data);

                    const is_authorize_reply =
                        data.msg_type === 'authorize' || typeof data.echo_req?.authorize === 'string';

                    if (is_authorize_reply) {
                        if (data.error) {
                            console.error('[Mirror] ❌ Authorization failed:', data.error);
                            this.mirror_authorized = false;
                            runInAction(() => {
                                this.mirror_connection_status = 'error';
                            });
                            // If authorization fails, close connection to allow retry
                            if (data.error.code === 'InvalidToken' || data.error.code === 'AuthorizationRequired') {
                                console.error(
                                    '[Mirror] Invalid token. Please check your API token in the Copy Trading page.'
                                );
                                this.mirror_ws?.close();
                            }
                        } else if (data.authorize) {
                            this.mirror_authorized = true;
                            runInAction(() => {
                                this.mirror_connection_status = 'connected';
                            });
                            console.log('[Mirror] ✅ Successfully authorized with mirror account');
                            console.log('[Mirror] Account details:', {
                                balance: (data.authorize as { balance?: string })?.balance,
                                currency: (data.authorize as { currency?: string })?.currency,
                                email: (data.authorize as { email?: string })?.email,
                                user_id: (data.authorize as { user_id?: number })?.user_id,
                            });
                            this.flushMirrorPendingQueue();
                        }
                    } else if (data.error) {
                        console.error('[Mirror] ❌ Error from server:', {
                            code: data.error?.code,
                            message: data.error?.message,
                            details: data.error?.details,
                        });
                        const echo = data.echo_req as { buy?: unknown } | undefined;
                        if (data.msg_type === 'buy' || echo?.buy !== undefined) {
                            const msg = data.error?.message || data.error?.code || 'Unknown error';
                            this.root_store.journal.onError(
                                `[Mirror copy] Could not place trade on follower account: ${String(msg)}`
                            );
                        }
                    } else if (data.msg_type === 'buy') {
                        console.log('[Mirror] 🛒 Buy response:', {
                            contract_id: data.buy?.contract_id,
                            req_id: data.req_id,
                            balance_after: data.buy?.balance_after,
                            transaction_id: data.buy?.transaction_id,
                        });
                    } else if (data.msg_type) {
                        console.log(`[Mirror] 🔄 Received ${data.msg_type} message`);
                    }
                } catch (error) {
                    console.error('[Mirror] ❌ Error processing message:', error);
                }
            };

            this.mirror_ws.onerror = error => {
                console.error('[Mirror] WebSocket error:', error);
                this.mirror_authorized = false;
                runInAction(() => {
                    this.mirror_connection_status = 'error';
                });
            };

            this.mirror_ws.onclose = event => {
                console.log(`[Mirror] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
                this.mirror_ws = null;
                this.mirror_authorized = false;
                runInAction(() => {
                    this.mirror_connection_status = 'disconnected';
                });

                this.clearMirrorReconnectTimeout();
                if (this.is_running) {
                    console.log(`[Mirror] Attempting to reconnect in ${MIRROR_RECONNECT_MS / 1000} seconds...`);
                    this.mirror_reconnect_timeout = setTimeout(() => {
                        this.mirror_reconnect_timeout = null;
                        this.initializeMirrorAccount();
                    }, MIRROR_RECONNECT_MS);
                }
            };
        } catch (error) {
            console.error('[Mirror] Error initializing WebSocket:', error);
        }
    };

    setShowBotStopMessage = (show_bot_stop_message: boolean) => {
        this.show_bot_stop_message = show_bot_stop_message;
        if (!show_bot_stop_message) return;
        const handleNotificationClick = () => {
            const contract_type = getSelectedTradeType();
            const url = new URL(standalone_routes.positions);
            url.searchParams.set('contract_type_bots', contract_type);

            const getQueryParams = new URLSearchParams(window.location.search);
            const account = getQueryParams.get('account') || sessionStorage.getItem('query_param_currency') || '';

            if (account) {
                url.searchParams.set('account', account);
            }

            window.location.assign(url.toString());
        };

        botNotification(notification_message().bot_stop, {
            label: localize('Reports'),
            onClick: handleNotificationClick,
        });
    };

    performSelfExclusionCheck = async () => {
        const self_exclusion = (this.root_store as RootStore & { self_exclusion?: { checkRestriction: () => Promise<void> } })
            .self_exclusion;
        if (self_exclusion?.checkRestriction) {
            await self_exclusion.checkRestriction();
        }
    };

    onRunButtonClick = async () => {
        let timer_counter = 1;
        if (window.sendRequestsStatistic) {
            performance.clearMeasures();
            // Log is sent every 10 seconds for 5 minutes
            this.timer = setInterval(() => {
                window.sendRequestsStatistic(true);
                performance.clearMeasures();
                if (timer_counter === 12) {
                    clearInterval(this.timer as NodeJS.Timeout);
                } else {
                    timer_counter++;
                }
            }, 10000);
        }
        const { summary_card } = this.root_store;
        const self_exclusion = (
            this.root_store as RootStore & {
                self_exclusion?: {
                    should_bot_run: boolean;
                    setIsRestricted: (is_restricted: boolean) => void;
                };
            }
        ).self_exclusion;
        const { client, ui } = this.core;
        const is_ios = mobileOSDetect() === 'iOS';
        this.dbot.saveRecentWorkspace();
        this.dbot.unHighlightAllBlocks();
        if (!client.is_logged_in) {
            this.showLoginDialog();
            return;
        }

        /**
         * Due to Apple's policy on cellular data usage in ios audioElement.play() should be initially called on
         * user action(e.g click/touch) to be downloaded, otherwise throws an error. Also it should be called
         * syncronously, so keep above await.
         */
        if (is_ios || isSafari()) this.preloadAudio();

        if (self_exclusion && !self_exclusion.should_bot_run) {
            self_exclusion.setIsRestricted(true);
            return;
        }
        self_exclusion?.setIsRestricted(false);

        this.registerBotListeners();

        if (!this.dbot.shouldRunBot()) {
            this.unregisterBotListeners();
            return;
        }

        ui?.setAccountSwitcherDisabledMessage(
            localize(
                'Account switching is disabled while your bot is running. Please stop your bot before switching accounts.'
            )
        );
        runInAction(() => {
            this.setIsRunning(true);
            ui.setPromptHandler(true);
            this.toggleDrawer(true);
            this.run_id = `run-${Date.now()}`;

            summary_card.clear();
            this.setContractStage(contract_stages.STARTING);
            if (MIRROR_ENABLED) {
                this.initializeMirrorAccount();
            }

            this.dbot.runBot();
        });
        this.setShowBotStopMessage(false);
    };

    onStopButtonClick = () => {
        this.is_contracy_buying_in_progress = false;
        const { is_multiplier } = this.root_store.summary_card;

        if (is_multiplier) {
            this.showStopMultiplierContractDialog();
        } else {
            this.stopBot();
        }
    };

    onStopBotClick = () => {
        const { is_multiplier } = this.root_store.summary_card;
        const { summary_card } = this.root_store;

        if (is_multiplier) {
            this.showStopMultiplierContractDialog();
        } else {
            this.stopBot();
            summary_card.clear();
            this.setShowBotStopMessage(true);
        }
    };

    stopBot = () => {
        const { ui } = this.core;

        this.dbot.stopBot();

        ui.setPromptHandler(false);

        if (this.error_type) {
            // when user click stop button when there is a error but bot is retrying
            this.setContractStage(contract_stages.NOT_RUNNING);
            ui.setAccountSwitcherDisabledMessage();
            this.setIsRunning(false);
        } else if (this.has_open_contract) {
            // when user click stop button when bot is running
            this.setContractStage(contract_stages.IS_STOPPING);
        } else {
            // when user click stop button before bot start running
            this.setContractStage(contract_stages.NOT_RUNNING);
            this.unregisterBotListeners();
            ui.setAccountSwitcherDisabledMessage();
            this.setIsRunning(false);
        }

        if (this.error_type) {
            this.error_type = undefined;
        }

        if (this.timer) {
            clearInterval(this.timer);
        }
        if (window.sendRequestsStatistic) {
            window.sendRequestsStatistic(true);
            performance.clearMeasures();
        }
        this.clearMirrorReconnectTimeout();
        this.clearMirrorFlushInterval();
        this.mirror_pending_by_contract_id.clear();
        this.mirrored_contract_ids.clear();

        if (this.mirror_ws) {
            this.mirror_ws.close();
            this.mirror_ws = null;
            this.mirror_authorized = false;
            runInAction(() => {
                this.mirror_connection_status = 'idle';
            });
        }

        // Keep mirrorTokenUpdated / storage listeners for the next run — removing them here broke token updates until reload.
    };

    onClearStatClick = () => {
        this.showClearStatDialog();
    };

    clearStat = () => {
        const { summary_card, journal, transactions } = this.root_store;

        this.setIsRunning(false);
        this.setHasOpenContract(false);
        this.clear();
        journal.clear();
        summary_card.clear();
        transactions.clear();
        this.setContractStage(contract_stages.NOT_RUNNING);
    };

    toggleStatisticsInfoModal = () => {
        this.is_statistics_info_modal_open = !this.is_statistics_info_modal_open;
    };

    toggleDrawer = (is_open: boolean) => {
        this.is_drawer_open = is_open;
    };

    setActiveTabIndex = (index: number) => {
        this.active_index = index;
    };

    onCloseDialog = () => {
        this.is_dialog_open = false;
    };

    stopMyBot = () => {
        const { summary_card, quick_strategy } = this.root_store;
        const { ui } = this.core;
        const { toggleStopBotDialog } = quick_strategy;

        ui.setPromptHandler(false);
        this.dbot.terminateBot();
        this.onCloseDialog();
        summary_card.clear();
        toggleStopBotDialog();
        if (this.timer) {
            clearInterval(this.timer);
        }
        if (window.sendRequestsStatistic) {
            window.sendRequestsStatistic(true);
            performance.clearMeasures();
        }
    };

    closeMultiplierContract = () => {
        const { quick_strategy } = this.root_store;
        const { toggleStopBotDialog } = quick_strategy;

        this.onClickSell();
        this.stopBot();
        this.onCloseDialog();
        toggleStopBotDialog();
    };

    showStopMultiplierContractDialog = () => {
        const { summary_card } = this.root_store;
        const { ui } = this.core;

        this.onOkButtonClick = () => {
            ui.setPromptHandler(false);
            this.dbot.terminateBot();
            if (this.timer) {
                clearInterval(this.timer);
            }
            if (window.sendRequestsStatistic) {
                window.sendRequestsStatistic(true);
                performance.clearMeasures();
            }
            this.onCloseDialog();
            summary_card.clear();
        };
        this.onCancelButtonClick = () => {
            this.onClickSell();
            this.stopBot();
            this.onCloseDialog();
        };
        this.dialog_options = {
            title: localize('Keep your current contract?'),
            message: helpers.keep_current_contract,
            ok_button_text: localize('Keep my contract'),
            cancel_button_text: localize('Close my contract'),
        };
        this.is_dialog_open = true;
    };

    showLoginDialog = () => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Please log in'),
            message: localize('You need to log in to run the bot.'),
        };
        this.is_dialog_open = true;
    };

    showRealAccountDialog = () => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize("Deriv Bot isn't quite ready for real accounts"),
            message: localize('Please switch to your demo account to run your Deriv Bot.'),
        };
        this.is_dialog_open = true;
    };

    showClearStatDialog = () => {
        this.onOkButtonClick = () => {
            this.clearStat();
            this.onCloseDialog();
        };
        this.onCancelButtonClick = this.onCloseDialog;
        this.dialog_options = {
            title: localize('Are you sure?'),
            message: localize(
                'This will clear all data in the summary, transactions, and journal panels. All counters will be reset to zero.'
            ),
        };
        this.is_dialog_open = true;
    };

    showIncompatibleStrategyDialog = () => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Import error'),
            message: localize('This strategy is currently not compatible with Deriv Bot.'),
        };
        this.is_dialog_open = true;
    };

    showContractUpdateErrorDialog = (message?: string) => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Contract Update Error'),
            message,
        };
        this.is_dialog_open = true;
    };

    registerBotListeners = () => {
        const { summary_card, transactions } = this.root_store;

        observer.register('bot.running', this.onBotRunningEvent);
        observer.register('bot.sell', this.onBotSellEvent);
        observer.register('bot.stop', this.onBotStopEvent);
        observer.register('bot.bot_ready', this.onBotReadyEvent);
        observer.register('bot.click_stop', this.onStopButtonClick);
        observer.register('bot.trade_again', this.onBotTradeAgain);
        observer.register('contract.status', this.onContractStatusEvent);
        observer.register('bot.contract', this.onBotContractEvent);
        observer.register('bot.contract', summary_card.onBotContractEvent);
        observer.register('bot.contract', transactions.onBotContractEvent);
        observer.register('Error', this.onError);
        observer.register('bot.recoverOpenPositionLimitExceeded', this.OpenPositionLimitExceededEvent);
    };

    OpenPositionLimitExceededEvent = () => (this.is_contracy_buying_in_progress = true);

    registerReactions = () => {
        const { client, common } = this.core;
        // eslint-disable-next-line prefer-const
        let disposeIsSocketOpenedListener: (() => void) | undefined, disposeLogoutListener: (() => void) | undefined;

        const registerIsSocketOpenedListener = () => {
            // TODO: fix notifications
            if (common.is_socket_opened) {
                disposeIsSocketOpenedListener = reaction(
                    () => client.loginid,
                    loginid => {
                        if (loginid && this.is_running) {
                            // TODO: fix notifications
                            // notifications.addNotificationMessage(switch_account_notification());
                        }
                        this.dbot.terminateBot();
                        this.unregisterBotListeners();
                    }
                );
            } else if (typeof disposeLogoutListener === 'function') {
                disposeLogoutListener();
            }
        };

        registerIsSocketOpenedListener();

        disposeLogoutListener = reaction(
            () => common.is_socket_opened,
            () => registerIsSocketOpenedListener()
        );

        const disposeStopBotListener = reaction(
            () => !this.is_running,
            () => {
                if (!this.is_running) this.setContractStage(contract_stages.NOT_RUNNING);
            }
        );

        return () => {
            if (typeof disposeIsSocketOpenedListener === 'function') {
                disposeIsSocketOpenedListener();
            }

            if (typeof disposeLogoutListener === 'function') {
                disposeLogoutListener();
            }

            if (typeof disposeStopBotListener === 'function') {
                disposeStopBotListener();
            }
        };
    };

    onBotRunningEvent = () => {
        this.setHasOpenContract(true);

        // prevent new version update
        const ignore_new_version = new Event('IgnorePWAUpdate');
        document.dispatchEvent(ignore_new_version);
        const self_exclusion = (
            this.root_store as RootStore & {
                self_exclusion?: {
                    should_bot_run: boolean;
                    run_limit: number;
                };
            }
        ).self_exclusion;

        if (self_exclusion?.should_bot_run && self_exclusion.run_limit !== -1) {
            self_exclusion.run_limit -= 1;
            if (self_exclusion.run_limit < 0) {
                this.onStopButtonClick();
            }
        }
    };

    onBotSellEvent = () => {
        this.is_sell_requested = true;
    };

    onBotStopEvent = () => {
        const { summary_card } = this.root_store;
        const self_exclusion = (
            this.root_store as RootStore & {
                self_exclusion?: {
                    resetSelfExclusion: () => void;
                };
            }
        ).self_exclusion;
        const { ui } = this.core;
        const indicateBotStopped = () => {
            this.error_type = undefined;
            this.setContractStage(contract_stages.NOT_RUNNING);
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
            self_exclusion?.resetSelfExclusion?.();
        };
        if (this.error_type === ErrorTypes.RECOVERABLE_ERRORS) {
            // Bot should indicate it started in below cases:
            // - When error happens it's a recoverable error
            const { shouldRestartOnError = false, timeMachineEnabled = false } =
                this.dbot?.interpreter?.bot?.tradeEngine?.options ?? {};
            const is_bot_recoverable = shouldRestartOnError || timeMachineEnabled;

            if (is_bot_recoverable) {
                this.error_type = undefined;
                this.setContractStage(contract_stages.PURCHASE_SENT);
            } else {
                this.setIsRunning(false);
                indicateBotStopped();
            }
        } else if (this.error_type === ErrorTypes.UNRECOVERABLE_ERRORS) {
            // Bot should indicate it stopped in below cases:
            // - When error happens and it's an unrecoverable error
            this.setIsRunning(false);
            indicateBotStopped();
        } else if (this.has_open_contract) {
            // Bot should indicate the contract is closed in below cases:
            // - When bot was running and an error happens
            this.error_type = undefined;
            this.is_sell_requested = false;
            this.setContractStage(contract_stages.CONTRACT_CLOSED);
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
            self_exclusion?.resetSelfExclusion?.();
        }
    };

    onBotSellEvent = () => {
        this.is_sell_requested = true;
    };

    onBotStopEvent = () => {
        const { summary_card } = this.root_store;
        const self_exclusion = (
            this.root_store as RootStore & {
                self_exclusion?: {
                    resetSelfExclusion: () => void;
                };
            }
        ).self_exclusion;
        const { ui } = this.core;
        const indicateBotStopped = () => {
            this.error_type = undefined;
            this.setContractStage(contract_stages.NOT_RUNNING);
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
            self_exclusion?.resetSelfExclusion?.();
        };
        if (this.error_type === ErrorTypes.RECOVERABLE_ERRORS) {
            // Bot should indicate it started in below cases:
            // - When error happens it's a recoverable error
            const { shouldRestartOnError = false, timeMachineEnabled = false } =
                this.dbot?.interpreter?.bot?.tradeEngine?.options ?? {};
            const is_bot_recoverable = shouldRestartOnError || timeMachineEnabled;

            if (is_bot_recoverable) {
                this.error_type = undefined;
                this.setContractStage(contract_stages.PURCHASE_SENT);
            } else {
                this.setIsRunning(false);
                indicateBotStopped();
            }
        } else if (this.error_type === ErrorTypes.UNRECOVERABLE_ERRORS) {
            // Bot should indicate it stopped in below cases:
            // - When error happens and it's an unrecoverable error
            this.setIsRunning(false);
            indicateBotStopped();
        } else if (this.has_open_contract) {
            // Bot should indicate the contract is closed in below cases:
            // - When bot was running and an error happens
            this.error_type = undefined;
            this.is_sell_requested = false;
            this.setContractStage(contract_stages.CONTRACT_CLOSED);
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
            self_exclusion?.resetSelfExclusion?.();
        }

        this.setHasOpenContract(false);

        summary_card.clearContractUpdateConfigValues();

        // listen for new version update
        const listen_new_version = new Event('ListenPWAUpdate');
        document.dispatchEvent(listen_new_version);
    };

    onBotReadyEvent = () => {
        this.setIsRunning(false);
        observer.unregisterAll('bot.bot_ready');
    };

    onBotTradeAgain = (is_trade_again: boolean) => {
        if (!is_trade_again) {
            this.stopBot();
        }
    };

    onContractStatusEvent = (contract_status: TContractState) => {
        switch (contract_status.id) {
            case 'contract.purchase_sent': {
                this.setContractStage(contract_stages.PURCHASE_SENT);
                break;
            }
            case 'contract.purchase_received': {
                this.is_contracy_buying_in_progress = false;
                this.setContractStage(contract_stages.PURCHASE_RECEIVED);

                const { buy } = contract_status;
                const { is_virtual } = this.core.client;

                if (!is_virtual && buy) {
                    GTM?.pushDataLayer?.({ event: 'dbot_purchase', buy_price: buy.buy_price });
                }

                break;
            }

            case 'contract.sold': {
                this.is_sell_requested = false;
                this.setContractStage(contract_stages.CONTRACT_CLOSED);
                if (contract_status.contract) GTM.onTransactionClosed(contract_status.contract);
                break;
            }
            default:
                break;
        }
    };

    onClickSell = () => {
        const { is_multiplier } = this.root_store.summary_card;

        if (is_multiplier) {
            this.setContractStage(contract_stages.IS_STOPPING);
        }

        this.dbot.interpreter.bot.getInterface().sellAtMarket();
    };

    clear = () => {
        observer.emit('statistics.clear');
    };

    onBotContractEvent = (data: any) => {
        console.log('[Mirror] Received bot contract event:', data);

        // Detect leader buy as soon as buy transaction exists.
        // Some fast contracts may skip or race past `status: open`, so don't require it.
        const isBuyEvent = data?.transaction_ids?.buy && data?.buy_price != null && data?.contract_id != null;

        if (!isBuyEvent) {
            console.log('[Mirror] Ignoring bot contract event (not a buy event)', {
                contract_id: data?.contract_id,
                status: data?.status,
                has_transaction_buy: !!data?.transaction_ids?.buy,
                has_buy_price: data?.buy_price != null,
            });
            return;
        }

        if (!MIRROR_ENABLED) return;

        const token = this.getMirrorApiToken();
        if (!token) {
            console.log('[Mirror] No mirror token; skipping copy');
            return;
        }

        console.log('[Mirror] ✅ BUY detected, mirroring trade');

        const ws_ready = this.mirror_ws?.readyState === WebSocket.OPEN;
        const can_send_now = ws_ready && this.mirror_authorized;

        if (can_send_now) {
            this.mirrorTrade(data);
            return;
        }

        this.enqueueMirrorPending(data);

        if (!this.mirror_ws || this.mirror_ws.readyState === WebSocket.CLOSED) {
            console.log('[Mirror] WebSocket not open, initializing...');
            this.initializeMirrorAccount();
        } else if (ws_ready && !this.mirror_authorized) {
            const authToken = this.getMirrorApiToken();
            if (authToken) {
                console.log('[Mirror] Socket open but not authorized yet; sending authorize');
                this.mirror_ws.send(JSON.stringify({ authorize: authToken }));
            }
        }

        this.scheduleMirrorPendingFlush();
    };

    private mirrorTrade = (data: any) => {
        // 🛡 Prevent duplicate mirroring
        if (this.mirrored_contract_ids.has(data.contract_id)) {
            console.log('[Mirror] Contract already mirrored, skipping duplicate');
            return;
        }

        const mirror_payload = buildMirrorBuyPayloadFromOpenContract(data as Record<string, unknown>);
        if (!mirror_payload) {
            console.warn('[Mirror] Could not derive buy parameters from open contract; skipping mirror', {
                contract_id: data.contract_id,
                contract_type: data.contract_type,
            });
            return;
        }

        this.mirrored_contract_ids.add(data.contract_id);

        const mirrorBuyRequest = {
            ...mirror_payload,
            passthrough: {
                source: 'deriv_bot_mirror',
                original_contract_id: data.contract_id,
            },
            req_id: Date.now(),
        };

        console.log('[Mirror] 🚀 Sending mirror BUY:', mirrorBuyRequest);
        console.log('[Mirror] Mirror send pre-check', {
            ws_exists: !!this.mirror_ws,
            ws_state: this.mirror_ws?.readyState,
            ws_state_label:
                this.mirror_ws?.readyState === WebSocket.CONNECTING
                    ? 'CONNECTING'
                    : this.mirror_ws?.readyState === WebSocket.OPEN
                      ? 'OPEN'
                      : this.mirror_ws?.readyState === WebSocket.CLOSING
                        ? 'CLOSING'
                        : this.mirror_ws?.readyState === WebSocket.CLOSED
                          ? 'CLOSED'
                          : 'UNKNOWN',
            mirror_authorized: this.mirror_authorized,
            contract_id: data.contract_id,
            contract_type: data.contract_type,
            buy_price: data.buy_price,
            token_available_now: !!this.getMirrorApiToken(),
        });
        try {
            this.mirror_ws?.send(JSON.stringify(mirrorBuyRequest));
            console.log('[Mirror] Mirror BUY sent to websocket', {
                req_id: mirrorBuyRequest.req_id,
                original_contract_id: data.contract_id,
            });
        } catch (error) {
            console.error('[Mirror] ❌ Error sending mirror trade:', error);
            // Reset connection state on error
            if (this.mirror_ws) {
                this.mirror_ws.close();
                this.mirror_ws = null;
                this.mirror_authorized = false;
                runInAction(() => {
                    this.mirror_connection_status = 'error';
                });
            }
        }
    };

    onError = (data: { error: any }) => {
        // data.error for API errors, data for code errors
        const error = data.error || data;
        if (unrecoverable_errors.includes(error.code)) {
            this.root_store.summary_card.clear();
            this.error_type = ErrorTypes.UNRECOVERABLE_ERRORS;
        } else {
            this.error_type = ErrorTypes.RECOVERABLE_ERRORS;
        }

        const error_message = error?.message;
        this.showErrorMessage(error_message);
    };

    showErrorMessage = (data: string | Error) => {
        const { journal } = this.root_store;
        const { ui } = this.core;
        journal.onError(data);
        if (journal.journal_filters.some(filter => filter === MessageTypes.ERROR)) {
            this.toggleDrawer(true);
            this.setActiveTabIndex(run_panel.JOURNAL);
            ui.setPromptHandler(false);
        } else {
            // TODO: fix notifications
            // notifications.addNotificationMessage(journalError(this.switchToJournal));
            // notifications.removeNotificationMessage({ key: 'bot_error' });

        const cleanup_token_listener = (this as { _tokenListenerCleanup?: () => void })._tokenListenerCleanup;
        cleanup_token_listener?.();
        }
    };

    switchToJournal = () => {
        const { journal } = this.root_store;
        journal.journal_filters.push(MessageTypes.ERROR);
        this.setActiveTabIndex(run_panel.JOURNAL);
        this.toggleDrawer(true);

        // TODO: fix notifications
        // notifications.toggleNotificationsModal();
        // notifications.removeNotificationByKey({ key: 'bot_error' });
    };

    unregisterBotListeners = () => {
        observer.unregisterAll('bot.running');
        observer.unregisterAll('bot.stop');
        observer.unregisterAll('bot.click_stop');
        observer.unregisterAll('bot.trade_again');
        observer.unregisterAll('contract.status');
        observer.unregisterAll('bot.contract');
        observer.unregisterAll('Error');
    };

    setContractStage = (contract_stage: TContractStage) => {
        this.contract_stage = contract_stage;
    };

    setHasOpenContract = (has_open_contract: boolean) => {
        this.has_open_contract = has_open_contract;
    };

    setIsRunning = (is_running: boolean) => {
        this.is_running = is_running;
    };

    onMount = () => {
        const { journal } = this.root_store;
        observer.register('ui.log.error', this.showErrorMessage);
        observer.register('ui.log.notify', journal.onNotify);
        observer.register('ui.log.success', journal.onLogSuccess);
        observer.register('client.invalid_token', this.handleInvalidToken);
    };

    onUnmount = () => {
        const { journal, summary_card, transactions } = this.root_store;

        if (!this.is_running) {
            this.unregisterBotListeners();
            this.disposeReactionsFn();
            journal.disposeReactionsFn();
            summary_card.disposeReactionsFn();
            transactions.disposeReactionsFn();
        }

        observer.unregisterAll('ui.log.error');
        observer.unregisterAll('ui.log.notify');
        observer.unregisterAll('ui.log.success');
        observer.unregisterAll('client.invalid_token');
        }
    };

    switchToJournal = () => {
        const { journal } = this.root_store;
        journal.journal_filters.push(MessageTypes.ERROR);
        this.setActiveTabIndex(run_panel.JOURNAL);
        this.toggleDrawer(true);

        // TODO: fix notifications
        // notifications.toggleNotificationsModal();
        // notifications.removeNotificationByKey({ key: 'bot_error' });
    };

    unregisterBotListeners = () => {
        observer.unregisterAll('bot.running');
        observer.unregisterAll('bot.stop');
        observer.unregisterAll('bot.click_stop');
        observer.unregisterAll('bot.trade_again');
        observer.unregisterAll('contract.status');
        observer.unregisterAll('bot.contract');
        observer.unregisterAll('Error');
    };

    setContractStage = (contract_stage: TContractStage) => {
        this.contract_stage = contract_stage;
    };

    setHasOpenContract = (has_open_contract: boolean) => {
        this.has_open_contract = has_open_contract;
    };

    setIsRunning = (is_running: boolean) => {
        this.is_running = is_running;
    };

    onMount = () => {
        const { journal } = this.root_store;
        observer.register('ui.log.error', this.showErrorMessage);
        observer.register('ui.log.notify', journal.onNotify);
        observer.register('ui.log.success', journal.onLogSuccess);
        observer.register('client.invalid_token', this.handleInvalidToken);
    };

    onUnmount = () => {
        const { journal, summary_card, transactions } = this.root_store;

        if (!this.is_running) {
            this.unregisterBotListeners();
            this.disposeReactionsFn();
            journal.disposeReactionsFn();
            summary_card.disposeReactionsFn();
            transactions.disposeReactionsFn();
        }

        observer.unregisterAll('ui.log.error');
        observer.unregisterAll('ui.log.notify');
        observer.unregisterAll('ui.log.success');
        observer.unregisterAll('client.invalid_token');
    };

    handleInvalidToken = async () => {
        this.setActiveTabIndex(run_panel.SUMMARY);
    };

    preloadAudio = () => {
        const strategy_sounds = this.dbot.getStrategySounds() as string[];

        strategy_sounds.forEach((sound: string) => {
            const audioElement = document.getElementById(sound) as HTMLAudioElement | null;
            if (!audioElement) return;
            audioElement.muted = true;
            audioElement.play().catch(() => {
                // suppressing abort error, thrown on immediate .pause()
            });
            audioElement.pause();
            audioElement.muted = false;
        });
    };
}
