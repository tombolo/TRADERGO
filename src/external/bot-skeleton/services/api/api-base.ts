/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import {
    getAccountId,
    getAccountType,
    getFirstDotLoginid,
    getFirstVrtcLoginid,
    isDemoAccount,
    isEliteSpecialCaseLoginId,
    isSpecialCaseLoginId,
    logSpecialAccountDebug,
    removeUrlParameter,
} from '@/utils/account-helpers';
/* [/AI] */
import CommonStore from '@/stores/common-store';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { resolveOAuthClientId } from '@/constants/oauth';
import { AccountTypeDetectorService } from '@/services/account-type-detector.service';
import { getAuthSystem, setAccountTypeMetadata, setAuthSystem } from '@/utils/auth-system-helpers';
import { TAuthData } from '@/types/api-types';
import type { Balance } from '@deriv/api-types';
import { clearAuthData, stampAuthSiteOrigin } from '@/utils/auth-utils';
import { handleBackendError, isBackendError } from '@/utils/error-handler';
import { activeSymbolsProcessorService } from '../../../../services/active-symbols-processor.service';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import {
    CONNECTION_STATUS,
    setAccountList,
    setAuthData,
    setConnectionStatus,
    setIsAuthorized,
    setIsAuthorizing,
} from './observables/connection-status-stream';
import ApiHelpers from './api-helpers';
import { generateDerivApiInstance, getToken, V2GetActiveAccountId } from './appId';
import chart_api from './chart-api';

type CurrentSubscription = {
    id: string;
    unsubscribe: () => void;
};

type SubscriptionPromise = Promise<{
    subscription: CurrentSubscription;
}>;

type TApiBaseApi = {
    connection: {
        readyState: keyof typeof socket_state;
        addEventListener: (event: string, callback: () => void) => void;
        removeEventListener: (event: string, callback: () => void) => void;
    };
    send: (data: unknown) => void;
    disconnect: () => void;
    authorize: (token: string) => Promise<{ authorize: TAuthData; error: unknown }>;
    balance: () => Promise<{ balance: Balance; error: unknown }>;

    onMessage: () => {
        subscribe: (callback: (message: unknown) => void) => {
            unsubscribe: () => void;
        };
    };
} & ReturnType<typeof generateDerivApiInstance>;

class APIBase {
    api: TApiBaseApi | null = null;
    token: string = '';
    account_id: string = '';
    pip_sizes = {};
    account_info = {};
    is_running = false;
    subscriptions: CurrentSubscription[] = [];
    time_interval: ReturnType<typeof setInterval> | null = null;
    has_active_symbols = false;
    is_stopping = false;
    active_symbols: any[] = [];
    current_auth_subscriptions: SubscriptionPromise[] = [];
    is_authorized = false;
    active_symbols_promise: Promise<any[] | undefined> | null = null;
    common_store: CommonStore | undefined;
    reconnection_attempts: number = 0;

    // Constants for timeouts - extracted magic numbers for better maintainability
    private readonly ACTIVE_SYMBOLS_TIMEOUT_MS = 10000; // 10 seconds
    private readonly ENRICHMENT_TIMEOUT_MS = 10000; // 10 seconds
    private readonly MAX_RECONNECTION_ATTEMPTS = 5; // Maximum number of reconnection attempts before session reset
    private readonly AUTH_CONTEXT_WAIT_TIMEOUT_MS = 2000; // Wait briefly for OAuth/account context before authorize
    private readonly AUTH_CONTEXT_WAIT_STEP_MS = 100; // Poll interval while waiting

    private identifyAccountTypeBeforeAuth(urlParams: URLSearchParams) {
        // Signal 1 (strongest): ELITE callback returns acctN/tokenN pairs directly.
        const acct1 = urlParams.get('acct1');
        const token1 = urlParams.get('token1');
        if (acct1 && token1) {
            setAuthSystem('ELITE');
            localStorage.setItem('auth_system', 'ELITE');
            return 'ELITE' as const;
        }

        // Signal 2: ZOOM OAuth2 bearer token in session — must not route to ELITE legacy WS.
        try {
            const authInfoStr = sessionStorage.getItem('auth_info');
            if (authInfoStr) {
                const authInfo = JSON.parse(authInfoStr) as { access_token?: string; expires_at?: number };
                const tokenValid =
                    Boolean(authInfo?.access_token) &&
                    (!authInfo.expires_at || Date.now() < authInfo.expires_at);
                if (tokenValid) {
                    setAuthSystem('ZOOM');
                    localStorage.setItem('auth_system', 'ZOOM');
                    return 'ZOOM' as const;
                }
            }
        } catch {
            // fall through
        }

        // Signal 3: existing auth_system from storage/session.
        const storedAuthSystem = getAuthSystem();
        if (storedAuthSystem === 'ELITE') {
            return 'ELITE' as const;
        }

        // Signal 4: account id patterns (CR/VRTC) — legacy ELITE only (not OAuth2 PKCE).
        const hasZoomOAuthBearer = (() => {
            try {
                const authInfoStr = sessionStorage.getItem('auth_info');
                if (!authInfoStr) return false;
                const authInfo = JSON.parse(authInfoStr) as { access_token?: string; expires_at?: number };
                return (
                    Boolean(authInfo?.access_token) &&
                    (!authInfo.expires_at || Date.now() < authInfo.expires_at)
                );
            } catch {
                return false;
            }
        })();

        if (!hasZoomOAuthBearer) {
            const activeLoginId = localStorage.getItem('active_loginid') || '';
            if (activeLoginId.startsWith('CR') || activeLoginId.startsWith('VRTC')) {
                setAuthSystem('ELITE');
                localStorage.setItem('auth_system', 'ELITE');
                return 'ELITE' as const;
            }

            try {
                const accountsList = JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<string, string>;
                const hasElitePattern = Object.keys(accountsList).some(
                    loginid => loginid.startsWith('CR') || loginid.startsWith('VRTC')
                );
                if (hasElitePattern) {
                    setAuthSystem('ELITE');
                    localStorage.setItem('auth_system', 'ELITE');
                    return 'ELITE' as const;
                }
            } catch (error) {
                console.warn('[APIBase] identifyAccountTypeBeforeAuth: could not parse accountsList', error);
            }
        }

        return 'ZOOM' as const;
    }

    unsubscribeAllSubscriptions = () => {
        this.current_auth_subscriptions?.forEach(subscription_promise => {
            subscription_promise.then(({ subscription }) => {
                if (subscription?.id) {
                    this.api?.send({
                        forget: subscription.id,
                    });
                }
            });
        });
        this.current_auth_subscriptions = [];
    };

    // Keep stable handler references for add/removeEventListener.
    onsocketopen = () => {
        setConnectionStatus(CONNECTION_STATUS.OPENED);

        // Reset reconnection attempts on successful connection
        this.reconnection_attempts = 0;

        void this.handleTokenExchangeIfNeeded().catch(error => {
            // Prevent "Uncaught (in promise)" from bubbling to the console and
            // leaving the UI stuck in an authorizing/loading state on mobile.
            console.error('[APIBase] handleTokenExchangeIfNeeded failed:', error);
            setIsAuthorizing(false);
        });
    };

    private async handleTokenExchangeIfNeeded() {
        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        const accountType = urlParams.get('account_type');
        const authSystem = this.identifyAccountTypeBeforeAuth(urlParams);

        // ELITE callback returns acctN/tokenN params directly in URL.
        // api-base can run before App-level callback processing writes these tokens,
        // so seed localStorage here to avoid entering authorize flow with hasToken=false.
        if (authSystem === 'ELITE') {
            const eliteAccounts: Array<{ accountId: string; token: string; currency: string }> = [];
            let index = 1;
            while (true) {
                const accountId = urlParams.get(`acct${index}`);
                const token = urlParams.get(`token${index}`);
                const currency = urlParams.get(`cur${index}`) || 'USD';
                if (!accountId || !token) break;
                eliteAccounts.push({ accountId, token, currency });
                index += 1;
            }

            console.log('[APIBase] Elite account extraction from URL params:', {
                authSystem,
                extractedAccounts: eliteAccounts.length,
                accountIds: eliteAccounts.map(a => a.accountId),
                urlParamKeys: Array.from(urlParams.keys()).filter(k => k.startsWith('acct') || k.startsWith('token')),
            });

            if (eliteAccounts.length > 0) {
                const existingAccountsList = JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<
                    string,
                    string
                >;
                const existingClientAccounts = JSON.parse(localStorage.getItem('clientAccounts') || '{}') as Record<
                    string,
                    { loginid: string; token: string; currency: string }
                >;
                eliteAccounts.forEach(({ accountId, token, currency }) => {
                    existingAccountsList[accountId] = token;
                    existingClientAccounts[accountId] = {
                        loginid: accountId,
                        token,
                        currency,
                    };
                });
                localStorage.setItem('accountsList', JSON.stringify(existingAccountsList));
                localStorage.setItem('clientAccounts', JSON.stringify(existingClientAccounts));
                if (!localStorage.getItem('active_loginid')) {
                    localStorage.setItem('active_loginid', eliteAccounts[0].accountId);
                }

                console.log('[APIBase] Stored Elite accounts to localStorage:', {
                    accountsStored: eliteAccounts.length,
                    accountsList: Object.keys(existingAccountsList),
                    clientAccounts: Object.keys(existingClientAccounts),
                    activeLoginId: localStorage.getItem('active_loginid'),
                });
            }
        }

        if (account_id) {
            localStorage.setItem('active_loginid', account_id);
            // Remove account_id from URL after storing
            removeUrlParameter('account_id');
        }
        if (accountType) {
            localStorage.setItem('account_type', accountType);
            // Remove account_type from URL after storing
            removeUrlParameter('account_type');
        }

        // Check if we have an account_id from URL or localStorage
        let activeAccountId: string | null = getAccountId();

        // Hydrate placeholder OAuth session or recover accounts from bearer token.
        const authInfo = OAuthTokenExchangeService.getAuthInfo();
        if (authInfo?.access_token && (!activeAccountId || activeAccountId === 'oauth_session')) {
            try {
                const accounts = await DerivWSAccountsService.fetchAccountsList(authInfo.access_token);
                if (accounts.length > 0) {
                    const accountsListMap: Record<string, string> = {};
                    const clientAccountsMap: Record<
                        string,
                        { currency: string; is_virtual: number; balance: number; token: string }
                    > = {};
                    accounts.forEach(account => {
                        accountsListMap[account.account_id] = authInfo.access_token;
                        clientAccountsMap[account.account_id] = {
                            currency: account.currency || 'USD',
                            is_virtual: account.account_type === 'demo' ? 1 : 0,
                            balance: Number(account.balance || 0),
                            token: authInfo.access_token,
                        };
                    });
                    localStorage.setItem('accountsList', JSON.stringify(accountsListMap));
                    localStorage.setItem('clientAccounts', JSON.stringify(clientAccountsMap));
                    localStorage.setItem('active_loginid', accounts[0].account_id);
                    localStorage.setItem('auth_system', 'ZOOM');
                    setAuthSystem('ZOOM');
                    DerivWSAccountsService.storeAccounts(accounts);
                    activeAccountId = accounts[0].account_id;
                }
            } catch (hydrateError) {
                console.warn('[APIBase] Could not hydrate OAuth account list:', hydrateError);
            }
        }

        const oauthJustCompleted = sessionStorage.getItem('oauth_just_completed');
        const isPostOAuth =
            sessionStorage.getItem('oauth_pending') === 'true' ||
            (oauthJustCompleted !== null && Date.now() - Number(oauthJustCompleted) < 30_000);

        // During OAuth callback we can briefly race with App-level storage writes.
        // Wait a short, bounded time for account/token context before authorizing.
        if (isPostOAuth) {
            const waitBudgetMs = oauthJustCompleted ? 8_000 : this.AUTH_CONTEXT_WAIT_TIMEOUT_MS;
            const startedAt = Date.now();
            while (Date.now() - startedAt < waitBudgetMs) {
                const refreshedActiveAccountId = getAccountId();
                const accountsList = JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<string, string>;
                const hasTokenForActive =
                    !!refreshedActiveAccountId &&
                    typeof accountsList[refreshedActiveAccountId] === 'string' &&
                    accountsList[refreshedActiveAccountId].length > 0;
                const hasAnyAccountToken = Object.values(accountsList).some(
                    token => typeof token === 'string' && token.length > 0
                );
                const stillRouting =
                    sessionStorage.getItem('oauth_pending') === 'true' ||
                    (oauthJustCompleted !== null && Date.now() - Number(oauthJustCompleted) < 30_000);

                if (refreshedActiveAccountId || hasTokenForActive || hasAnyAccountToken) {
                    activeAccountId = refreshedActiveAccountId;
                    break;
                }

                if (!stillRouting) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, this.AUTH_CONTEXT_WAIT_STEP_MS));
            }
        }

        // If no account_id in localStorage, check sessionStorage for accounts
        if (!activeAccountId) {
            try {
                const storedAccounts = sessionStorage.getItem('deriv_accounts');
                if (storedAccounts) {
                    const accounts = JSON.parse(storedAccounts);
                    if (accounts && accounts.length > 0 && accounts[0].account_id) {
                        // Use the first account as default
                        const accountId = accounts[0].account_id as string;
                        activeAccountId = accountId;
                        localStorage.setItem('active_loginid', accountId);

                        // Set account type based on account_id prefix
                        const isDemo = isDemoAccount(accountId);
                        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');
                    }
                }
            } catch (error) {
                console.error('[APIBase] Error reading accounts from sessionStorage:', error);
            }
        }

        // clearAuthData() removes accountsList but NOT clientAccounts.
        // If both active_loginid and accountsList are gone, rebuild them from clientAccounts
        // so the reconnect can re-authorize without losing the user's session.
        if (!activeAccountId && authSystem === 'ELITE') {
            try {
                const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') || '{}') as Record<
                    string,
                    { loginid?: string; token?: string; currency?: string }
                >;
                // Prefer the ELITE special-case CR account; fall back to any account with a token.
                const eliteSpecialId = Object.keys(clientAccounts).find(id => isEliteSpecialCaseLoginId(id));
                const anyId = Object.keys(clientAccounts).find(id => !!(clientAccounts[id] as any)?.token);
                const targetId = eliteSpecialId ?? anyId;
                if (targetId && (clientAccounts[targetId] as any)?.token) {
                    const rebuiltAccountsList: Record<string, string> = {};
                    Object.entries(clientAccounts).forEach(([id, data]: [string, any]) => {
                        if (data?.token) rebuiltAccountsList[id] = data.token;
                    });
                    localStorage.setItem('accountsList', JSON.stringify(rebuiltAccountsList));
                    localStorage.setItem('active_loginid', targetId);
                    activeAccountId = targetId;
                    console.log(
                        '%c[ELITE_SPECIAL_CASE_LOGINID] handleTokenExchangeIfNeeded: recovered auth from clientAccounts',
                        'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                        { targetId, rebuiltAccounts: Object.keys(rebuiltAccountsList) }
                    );
                }
            } catch {
                // ignore — fall through to the no-account-id path below
            }
        }

        if (!activeAccountId && authSystem === 'ELITE') {
            console.log('[AuthTrace] auth_init', { auth_system: authSystem, active_loginid: null });
            setIsAuthorizing(true);
            // For ELITE accounts, authorize will be called which returns the account list
            await this.authorizeAndSubscribe();
        } else if (activeAccountId) {
            console.log('[AuthTrace] auth_init', { auth_system: authSystem, active_loginid: activeAccountId });
            logSpecialAccountDebug('handleTokenExchange_auth_init', {
                active_loginid: activeAccountId,
                auth_system: authSystem,
                accountsList_keys: Object.keys(
                    JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<string, string>
                ),
                deriv_session_accounts: (() => {
                    try {
                        const raw = sessionStorage.getItem('deriv_accounts');
                        if (!raw) return [];
                        return (JSON.parse(raw) as Array<{ account_id?: string }>).map(a => a.account_id);
                    } catch {
                        return [];
                    }
                })(),
            });
            setIsAuthorizing(true);
            await this.authorizeAndSubscribe();
        } else {
            console.log('[AuthTrace] auth_init_skipped', { reason: 'no_account_context' });
            setIsAuthorizing(false);
        }
    }

    onsocketclose = () => {
        setConnectionStatus(CONNECTION_STATUS.CLOSED);
        this.reconnectIfNotConnected();
    };

    async init(force_create_connection = false) {
        this.toggleRunButton(true);

        if (this.api) {
            this.unsubscribeAllSubscriptions();
        }

        // Reset reconnection attempts counter on successful connection initialization
        if (!force_create_connection) {
            this.reconnection_attempts = 0;
        }

        if (!this.api || this.api?.connection.readyState !== 1 || force_create_connection) {
            if (this.api?.connection) {
                ApiHelpers.disposeInstance();
                setConnectionStatus(CONNECTION_STATUS.CLOSED);
                this.api.disconnect();
                this.api.connection.removeEventListener('open', this.onsocketopen);
                this.api.connection.removeEventListener('close', this.onsocketclose);
            }

            this.api = await generateDerivApiInstance();

            this.api?.connection.addEventListener('open', this.onsocketopen);
            this.api?.connection.addEventListener('close', this.onsocketclose);

            // Store the current account ID used for this WebSocket connection
            // This will be used to check if we need to regenerate the connection when the tab becomes active
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore) {
                const active_login_id = getAccountId();
                if (active_login_id) {
                    currentClientStore.setWebSocketLoginId(active_login_id);
                }
            }
        }

        // If we already have an open socket (e.g. init called after OAuth),
        // trigger the same flow the open event would start.
        if (this.api?.connection?.readyState === 1) {
            this.onsocketopen();
        }

        const hasAccountID = V2GetActiveAccountId();

        if (!this.has_active_symbols && !hasAccountID) {
            this.active_symbols_promise = this.getActiveSymbols().then(() => undefined);
        }

        this.initEventListeners();

        if (this.time_interval) clearInterval(this.time_interval);
        this.time_interval = null;

        chart_api.init(force_create_connection);
    }

    getConnectionStatus() {
        if (this.api?.connection) {
            const ready_state = this.api.connection.readyState;
            return socket_state[ready_state as keyof typeof socket_state] || 'Unknown';
        }
        return 'Socket not initialized';
    }

    terminate() {
        // eslint-disable-next-line no-console
        if (this.api) this.api.disconnect();
    }

    initEventListeners() {
        if (window) {
            window.addEventListener('online', this.reconnectIfNotConnected);
            window.addEventListener('focus', this.reconnectIfNotConnected);
        }
    }

    async createNewInstance(account_id: string) {
        if (this.account_id !== account_id) {
            await this.init();
        }
    }

    reconnectIfNotConnected = () => {
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            this.reconnection_attempts += 1;

            if (this.reconnection_attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
                // Reset reconnection counter
                this.reconnection_attempts = 0;

                // Properly handle logout through the API
                setIsAuthorized(false);
                setAccountList([]);
                setAuthData(null);

                // Clear necessary storage items
                localStorage.removeItem('active_loginid');
                localStorage.removeItem('account_type');
                localStorage.removeItem('accountsList');
                localStorage.removeItem('clientAccounts');
            } else {
                // If we have a stored account ID and token, mark as authorizing while reconnecting
                // This prevents the header from briefly showing login button during reconnection
                const hasStoredAccount = localStorage.getItem('active_loginid');
                const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
                const hasToken = hasStoredAccount && accountsList[hasStoredAccount];
                if (hasToken) {
                    setIsAuthorizing(true);
                }
            }

            this.init(true);
        }
    };

    async authorizeAndSubscribe() {
        if (!this.api) {
            console.error('%c❌ [APIBase] authorizeAndSubscribe: API is null', 'color: red;');
            return;
        }

        this.account_id = getAccountId() || '';
        setIsAuthorizing(true);

        try {
            const active_loginid = this.account_id;
            const token_payload = getToken();
            const hasToken = typeof token_payload?.token === 'string' && token_payload.token.length > 0;
            const ws_url =
                typeof this.api?.connection?.url === 'string'
                    ? this.api.connection.url
                    : (this.api?.connection as WebSocket | undefined)?.url;

            logSpecialAccountDebug('authorize_start', {
                active_loginid,
                hasToken,
                token_account_id: token_payload?.account_id,
                auth_system: getAuthSystem(),
                websocket_url: ws_url,
                token_matches_dot: token_payload?.account_id?.startsWith('DOT'),
                active_matches_rot: active_loginid?.startsWith('ROT'),
            });

            console.log('[AuthTrace] authorize_start', {
                hasToken,
                token_account_id: token_payload?.account_id,
                auth_system: getAuthSystem(),
            });

            let auth_or_balance;
            /** OTP-scoped WS is pre-authenticated; `authorize` rejects OAuth bearer tokens. */
            let auth_via_balance = false;
            const is_special_rot_dot = isSpecialCaseLoginId(active_loginid);
            const ws_has_otp = typeof ws_url === 'string' && ws_url.includes('otp=');
            const authSystem = getAuthSystem();

            if (OAuthTokenExchangeService.getAuthInfo()?.access_token && authSystem === 'ELITE') {
                setAuthSystem('ZOOM');
                localStorage.setItem('auth_system', 'ZOOM');
            }

            // Any OTP WebSocket URL is already scoped to the account session.
            const use_otp_balance_auth = ws_has_otp;

            if (hasToken && use_otp_balance_auth) {
                logSpecialAccountDebug('authorize_use_balance', {
                    active_loginid,
                    reason: 'otp_ws_rejects_oauth_bearer_on_authorize',
                    websocket_url: ws_url,
                    token_account_id: token_payload?.account_id,
                });
                console.log('[AuthTrace] authorize_use_balance', {
                    auth_system: 'ZOOM',
                    reason: ws_has_otp ? 'otp_scoped_websocket' : 'special_rot_dot_otp_session',
                });
                auth_or_balance = await this.api.balance();
                auth_via_balance = true;
            } else if (hasToken) {
                const zoomAuthSystem = getAuthSystem();

                // ELITE uses the built-in authorize() method (like in ELITE app)
                // ZOOM constructs a manual request with client_id
                if (zoomAuthSystem === 'ELITE') {
                    try {
                        const eliteClientId = token_payload?.account_id || active_loginid;
                        const buildEliteAuthorizeRequest = (includeClientId: boolean) => ({
                            authorize: token_payload?.token as string,
                            ...(includeClientId && eliteClientId ? { client_id: eliteClientId } : {}),
                        });

                        // Some ELITE backends reject client_id on authorize, others require it.
                        // Start with the strict payload, then retry with client_id only if requested.
                        let eliteRequest = buildEliteAuthorizeRequest(false);
                        console.log('[AuthTrace] authorize_request', { auth_system: 'ELITE', has_client_id: false });
                        try {
                            auth_or_balance = await this.api.send(eliteRequest);
                        } catch (firstError: any) {
                            const backendCode = firstError?.error?.code || firstError?.type;
                            const backendMessage = firstError?.error?.message || firstError?.message || '';
                            const requiresClientId =
                                backendCode === 'missing_required_parameter' ||
                                backendMessage.includes('Missing required parameter client_id');

                            if (!requiresClientId || !eliteClientId) {
                                throw firstError;
                            }

                            eliteRequest = buildEliteAuthorizeRequest(true);
                            console.warn('[AuthTrace] authorize_retry_with_client_id', { auth_system: 'ELITE' });
                            auth_or_balance = await this.api.send(eliteRequest);
                        }
                    } catch (authError) {
                        console.error(
                            '%c❌ [APIBase] send() threw error:',
                            'color: red; font-weight: bold;',
                            authError
                        );
                        throw authError;
                    }
                } else {
                    // ZOOM (OAuth) accounts: Send OAuth token with optional client_id.
                    // Special-case ROT accounts connect via their paired DOT OTP session —
                    // the OTP already scopes the WebSocket to the correct DOT account, so
                    // client_id is NOT sent for these accounts.  Different DOT accounts may
                    // be registered under different OAuth clients on Deriv's backend; sending
                    // an app-level client_id causes Deriv to reject the authorize call for any
                    // DOT that wasn't registered under that specific client.
                    const oauthClientId = resolveOAuthClientId();
                    const request_body: Record<string, any> = {
                        authorize: token_payload?.token as string,
                    };

                    // Omit client_id for ROT→DOT OTP sessions; include for all other ZOOM accounts.
                    if (oauthClientId && !is_special_rot_dot) {
                        request_body.client_id = oauthClientId;
                        console.log('[AuthTrace] authorize_request_with_client_id', {
                            auth_system: 'ZOOM',
                            client_id: `${oauthClientId.substring(0, 10)}...`,
                            token_type: 'OAuth Bearer Token',
                        });
                    } else if (!oauthClientId) {
                        console.warn(
                            '%c⚠️  [ZOOM Auth] CLIENT_ID not set - will try without it',
                            'color: orange; font-weight: bold;',
                            'CLIENT_ID should be set in Vercel env vars or .env.local for production'
                        );
                    } else {
                        console.log('[AuthTrace] authorize_request_no_client_id', {
                            auth_system: 'ZOOM',
                            reason: 'special_rot_dot_otp_session',
                            token_type: 'OAuth Bearer Token',
                        });
                    }

                    logSpecialAccountDebug('authorize_request', {
                        active_loginid,
                        is_special_rot_dot,
                        sends_client_id: Boolean(request_body.client_id),
                        client_id_prefix: request_body.client_id
                            ? `${String(request_body.client_id).slice(0, 10)}…`
                            : null,
                        token_account_id: token_payload?.account_id,
                        authorize: token_payload?.token,
                    });

                    try {
                        auth_or_balance = await this.api.send(request_body);
                        logSpecialAccountDebug('authorize_send_ok', {
                            active_loginid,
                            msg_type: (auth_or_balance as { msg_type?: string })?.msg_type,
                            has_authorize: Boolean((auth_or_balance as { authorize?: unknown })?.authorize),
                            has_error: Boolean((auth_or_balance as { error?: unknown })?.error),
                        });
                    } catch (firstError: any) {
                        logSpecialAccountDebug('authorize_send_error', {
                            active_loginid,
                            error_code: firstError?.error?.code,
                            error_message: firstError?.error?.message,
                            had_client_id: Boolean(request_body.client_id),
                            echo_req_keys: firstError?.echo_req ? Object.keys(firstError.echo_req) : [],
                        });
                        // Retry without client_id if: (a) it was missing/required, or (b) it was
                        // present but rejected (covers DOT accounts registered to a different client).
                        const errorCode = firstError?.error?.code || '';
                        const errorMsg = firstError?.error?.message || '';
                        const isMissingClientIdError =
                            errorCode === 'missing_required_parameter' &&
                            errorMsg.includes('client_id') &&
                            oauthClientId;
                        const isInvalidClientIdError =
                            oauthClientId &&
                            request_body.client_id &&
                            (errorCode === 'invalid_client_id' ||
                                errorCode === 'InvalidClientID' ||
                                errorMsg.toLowerCase().includes('client_id'));

                        if (isMissingClientIdError) {
                            logSpecialAccountDebug('authorize_retry', {
                                active_loginid,
                                reason: 'missing_client_id',
                                error_code: errorCode,
                            });
                            console.warn(
                                '[AuthTrace] Retrying without client_id after error:',
                                firstError.error.message
                            );
                            delete request_body.client_id;
                            auth_or_balance = await this.api.send(request_body);
                        } else if (isInvalidClientIdError) {
                            logSpecialAccountDebug('authorize_retry', {
                                active_loginid,
                                reason: 'invalid_client_id',
                                error_code: errorCode,
                            });
                            console.warn(
                                '[AuthTrace] client_id rejected by backend — retrying without it:',
                                firstError.error.message
                            );
                            delete request_body.client_id;
                            auth_or_balance = await this.api.send(request_body);
                        } else {
                            logSpecialAccountDebug('authorize_no_retry', {
                                active_loginid,
                                error_code: errorCode,
                                error_message: errorMsg,
                                reason: 'error_not_eligible_for_retry',
                            });
                            throw firstError;
                        }
                    }
                }
            } else {
                console.log('[AuthTrace] authorize_fallback_balance', { reason: 'no_token' });
                auth_or_balance = await this.api.balance();
                auth_via_balance = true;
            }

            const raw_account_data = (
                hasToken && !auth_via_balance
                    ? (auth_or_balance as { authorize?: TAuthData }).authorize
                    : (auth_or_balance as { balance?: Balance }).balance
            ) as (TAuthData & Balance) | undefined;
            const error = (auth_or_balance as { error?: unknown })?.error;

            console.log('[AuthTrace] authorize_result', {
                ok: !error && !!raw_account_data,
                loginid: raw_account_data?.loginid,
                balance: raw_account_data?.balance,
                currency: raw_account_data?.currency,
                account_list_count: raw_account_data?.account_list?.length ?? 0,
            });

            if (error) {
                const errorMessage = isBackendError(error)
                    ? handleBackendError(error)
                    : (error as any)?.message || 'Authorization failed';

                logSpecialAccountDebug('authorize_response_error', {
                    active_loginid,
                    error_code: isBackendError(error) ? error.code : (error as { code?: string })?.code,
                    error_message: errorMessage,
                    token_account_id: token_payload?.account_id,
                });

                console.error('%c❌ Authorization error:', 'color: red; font-weight: bold;', {
                    errorMessage,
                    error,
                    auth_system: getAuthSystem(),
                });

                setIsAuthorizing(false);
                return { ...error, localizedMessage: errorMessage };
            }
            if (!raw_account_data) {
                throw new Error('No account payload returned from API');
            }

            // Detect account type if not already set
            // This handles ELITE accounts that were initially detected via fallback
            if (getAuthSystem() === 'ELITE') {
                try {
                    console.log(
                        '%c📍 [APIBase] Confirming ELITE account type from authorize response...',
                        'color: #FF6B00;'
                    );
                    const detection = AccountTypeDetectorService.detectAccountType({ authorize: raw_account_data });
                    setAccountTypeMetadata({
                        accountType: detection.accountType,
                        loginid: detection.loginid,
                        currency: detection.currency,
                        isVirtual: detection.isVirtual,
                        detected_via: 'websocket_authorize',
                    });
                    console.log('%c✅ [APIBase] ELITE account confirmed!', 'color: #FF6B00; font-weight: bold;', {
                        loginid: detection.loginid,
                        currency: detection.currency,
                    });
                } catch (error) {
                    console.warn('%c⚠️  [APIBase] Could not confirm account type:', 'color: orange;', error);
                }
            }

            const is_special_case = isSpecialCaseLoginId(active_loginid);
            const is_elite_special_case = isEliteSpecialCaseLoginId(active_loginid);
            const authorized_loginid = raw_account_data?.loginid || '';
            const should_preserve_special_loginid =
                is_special_case && authorized_loginid.startsWith('DOT') && active_loginid.length > 0;
            const should_preserve_elite_special_loginid =
                is_elite_special_case && authorized_loginid.startsWith('VRTC') && active_loginid.length > 0;
            const display_loginid =
                should_preserve_special_loginid || should_preserve_elite_special_loginid
                    ? active_loginid
                    : authorized_loginid;
            if (is_special_case) {
                logSpecialAccountDebug('authorize_success_mapped', {
                    active_loginid,
                    authorized_loginid,
                    display_loginid,
                    should_preserve_special_loginid,
                    special_case_balance_loginid: should_preserve_special_loginid
                        ? getFirstDotLoginid(raw_account_data?.accounts ?? null)
                        : undefined,
                    balance: raw_account_data?.balance,
                    account_keys: raw_account_data?.accounts
                        ? Object.keys(raw_account_data.accounts)
                        : [],
                });
            }
            if (is_elite_special_case) {
                console.log(
                    '%c[ELITE_SPECIAL_CASE_LOGINID] authorizeAndSubscribe: auth response mapped',
                    'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                    {
                        active_loginid,
                        authorized_loginid,
                        display_loginid,
                        should_preserve_elite_special_loginid,
                        has_accounts_map: Boolean(
                            raw_account_data?.accounts && Object.keys(raw_account_data.accounts).length > 0
                        ),
                    }
                );
            }
            const normalized_account_data = {
                ...raw_account_data,
                loginid: display_loginid,
            };
            const normalized_balance_accounts = raw_account_data?.accounts || {};
            const special_case_balance_loginid = should_preserve_special_loginid
                ? getFirstDotLoginid(normalized_balance_accounts)
                : should_preserve_elite_special_loginid
                  ? getFirstVrtcLoginid(normalized_balance_accounts)
                  : undefined;

            this.account_info = {
                balance: normalized_account_data?.balance,
                currency: normalized_account_data?.currency,
                loginid: normalized_account_data?.loginid,
            };
            this.token = (token_payload?.token as string) || '';

            const account_type = getAccountType(normalized_account_data?.loginid);
            const currentAccount = normalized_account_data?.loginid
                ? {
                      balance: normalized_account_data.balance,
                      currency: normalized_account_data.currency || 'USD',
                      is_virtual: account_type === 'real' ? 0 : 1,
                      loginid: normalized_account_data.loginid,
                  }
                : null;

            // Build full account list from sessionStorage (populated during OAuth flow)
            // Falls back to just the current account if sessionStorage has no data
            let storedAccounts = DerivWSAccountsService.getStoredAccounts();
            console.log('%c📦 [APIBase] Account list building:', 'color: cyan;', {
                storedAccounts_count: storedAccounts?.length,
                auth_system: getAuthSystem(),
                has_account_list_in_response: !!raw_account_data?.account_list,
                account_list: raw_account_data?.account_list,
            });

            // For ELITE accounts, if no accounts stored yet, create from authorize response
            if (!storedAccounts && getAuthSystem() === 'ELITE' && raw_account_data?.account_list) {
                try {
                    console.log('%c💾 [APIBase] Converting ELITE account list to ZOOM format...', 'color: #FF6B00;', {
                        account_count: raw_account_data.account_list.length,
                    });
                    // Convert ELITE account list to ZOOM format and store
                    const convertedAccounts = AccountTypeDetectorService.convertEliteAccountsToZoomFormat(
                        raw_account_data.account_list
                    );
                    DerivWSAccountsService.storeAccounts(convertedAccounts);
                    storedAccounts = convertedAccounts;
                    console.log(
                        '%c✅ [APIBase] ELITE accounts stored in ZOOM format:',
                        'color: #FF6B00; font-weight: bold;',
                        convertedAccounts
                    );
                } catch (error) {
                    console.warn('%c⚠️  [APIBase] Could not convert ELITE accounts:', 'color: orange;', error);
                }
            }

            const accountList =
                storedAccounts && storedAccounts.length > 0
                    ? storedAccounts
                          .filter(a => !a.status || a.status === 'active')
                          .map(a => ({
                              balance: parseFloat(a.balance) || 0,
                              currency: a.currency || 'USD',
                              is_virtual: a.account_type === 'demo' ? 1 : 0,
                              loginid: a.account_id,
                          }))
                    : currentAccount
                      ? [currentAccount]
                      : [];
            if (should_preserve_special_loginid && currentAccount) {
                const has_special_row = accountList.some(account => account.loginid === active_loginid);
                if (!has_special_row) {
                    accountList.unshift({
                        ...currentAccount,
                        loginid: active_loginid,
                    });
                }
            }

            console.log('%c💰 [APIBase] FETCHING ACCOUNT BALANCES FOR ELITE:', 'color: #FF6B00; font-weight: bold;', {
                accountCount: accountList.length,
                loginids: accountList.map(a => a.loginid),
                authSystem: getAuthSystem(),
            });

            setAccountList(accountList); // Observable stream
            setAuthData({
                balance: normalized_account_data?.balance,
                currency: normalized_account_data?.currency,
                loginid: normalized_account_data?.loginid,
                is_virtual: account_type === 'real' ? 0 : 1,
                account_list: accountList,
            });

            // Run optional ELITE balance enrichment in background so header/account UI
            // can appear immediately after authorize instead of waiting on extra requests.
            if (getAuthSystem() === 'ELITE' && accountList.length > 0) {
                void (async () => {
                    try {
                        // ELITE special-case CR accounts (e.g. CR3700786) must NOT be included here.
                        // The WS session is authenticated as the paired VRTC demo account, so sending
                        // {balance:1, loginid:'CR...'} is rejected with AuthorizationRequired.
                        // That error flows through the onMessage listener and triggers a full logout,
                        // wiping localStorage and crashing the reconnect.  Their balance arrives via
                        // the ongoing VRTC balance subscription started in subscribe() instead.
                        const eligibleAccounts = accountList.filter(
                            account =>
                                account.loginid === normalized_account_data?.loginid &&
                                !isEliteSpecialCaseLoginId(account.loginid)
                        );

                        const balancePromises = eligibleAccounts.map(async account => {
                            try {
                                const req_loginid = account.loginid;
                                const balanceRequest = { balance: 1, loginid: req_loginid };
                                console.log(
                                    `%c📤 [APIBase] Sending balance request for ${account.loginid}:`,
                                    'color: #FF6B00;',
                                    balanceRequest
                                );
                                const balanceResponse = await this.api?.send?.(balanceRequest);
                                console.log(
                                    `%c💵 [APIBase] Balance response for ${account.loginid}:`,
                                    'color: #FF6B00;',
                                    balanceResponse
                                );
                                return { loginid: account.loginid, balance: balanceResponse?.balance };
                            } catch (err) {
                                console.warn(
                                    `%c⚠️  [APIBase] Could not fetch balance for ${account.loginid}:`,
                                    'color: orange;',
                                    err
                                );
                                return { loginid: account.loginid, balance: null };
                            }
                        });

                        const balances = await Promise.all(balancePromises);
                        console.log(
                            '%c💳 [APIBase] Eligible balances fetched for ELITE accounts:',
                            'color: #FF6B00; font-weight: bold;',
                            balances
                        );

                        balances.forEach(({ loginid, balance: balResponse }) => {
                            const account = accountList.find(a => a.loginid === loginid);
                            if (account && balResponse?.balance) {
                                account.balance = balResponse.balance || 0;
                            }
                        });

                        // Push enriched balances back to observables after initial render.
                        setAccountList([...accountList]);
                    } catch (error) {
                        console.warn(
                            '%c⚠️  [APIBase] Could not fetch ELITE account balances:',
                            'color: orange;',
                            error
                        );
                    }
                })();
            }

            // // Set account_type in localStorage based on loginid prefix using centralized utility
            const loginid = normalized_account_data?.loginid || '';
            const isDemo = isDemoAccount(loginid);

            if (isDemo) {
                localStorage.setItem('account_type', 'demo');
            } else {
                localStorage.setItem('account_type', 'real');
            }

            console.log(
                '%c✅ [APIBase] Authorization successful!',
                'color: green; font-weight: bold; font-size: 13px;',
                {
                    loginid: normalized_account_data?.loginid,
                    balance: normalized_account_data?.balance,
                    currency: normalized_account_data?.currency,
                    account_count: accountList.length,
                    auth_system: getAuthSystem(),
                    account_list_with_balances: accountList.map(a => ({
                        loginid: a.loginid,
                        balance: a.balance,
                        currency: a.currency,
                        is_virtual: a.is_virtual,
                    })),
                }
            );

            console.log('%c🎯 [APIBase] Setting observable streams for header:', 'color: green; font-weight: bold;', {
                setAccountList_called: true,
                accountList_length: accountList.length,
                setAuthData_called: true,
                authData_loginid: normalized_account_data?.loginid,
                authData_balance: normalized_account_data?.balance,
                authData_currency: normalized_account_data?.currency,
            });

            globalObserver.emit('api.authorize', {
                account_list: accountList,
                current_account: {
                    loginid: normalized_account_data?.loginid,
                    currency: normalized_account_data?.currency || 'USD',
                    is_virtual: account_type === 'real' ? 0 : 1,
                    balance:
                        typeof normalized_account_data?.balance === 'number'
                            ? normalized_account_data.balance
                            : undefined,
                },
            });

            // Update the WebSocket login ID in the client store
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore && normalized_account_data?.loginid) {
                currentClientStore.setWebSocketLoginId(normalized_account_data.loginid);
            }
            if (currentClientStore) {
                currentClientStore.setIsAccountRegenerating(false);
            }

            if (
                currentClientStore &&
                normalized_balance_accounts &&
                typeof normalized_balance_accounts === 'object' &&
                Object.keys(normalized_balance_accounts).length > 0
            ) {
                currentClientStore.setAllAccountsBalance({
                    ...(raw_account_data as Balance),
                    ...(should_preserve_special_loginid && special_case_balance_loginid
                        ? {
                              loginid: active_loginid,
                          }
                        : null),
                } as Balance);
                if (is_special_case) {
                    console.log(
                        '[SpecialAccount][authorizeAndSubscribe] Seeded all_accounts_balance from auth payload',
                        {
                            active_loginid,
                            special_case_balance_loginid,
                            account_keys: Object.keys(normalized_balance_accounts),
                        }
                    );
                }
            }

            setIsAuthorized(true);
            this.is_authorized = true;
            stampAuthSiteOrigin();

            localStorage.setItem('client_account_details', JSON.stringify(accountList));
            localStorage.setItem('client.country', (raw_account_data as any)?.country);

            if (normalized_account_data?.loginid) {
                localStorage.setItem('active_loginid', normalized_account_data.loginid);
            }

            if (this.has_active_symbols) {
                this.toggleRunButton(false);
            } else {
                this.active_symbols_promise = this.getActiveSymbols();
            }
            this.subscribe();
        } catch (e) {
            console.error(
                '%c❌ [APIBase] authorizeAndSubscribe() caught exception:',
                'color: red; font-weight: bold;',
                {
                    auth_system: getAuthSystem(),
                    account_id: this.account_id,
                    error: e,
                    errorMessage: (e as any)?.message,
                    errorStack: (e as any)?.stack,
                }
            );
            if (isSpecialCaseLoginId(this.account_id)) {
                const err = e as { error?: { code?: string; message?: string }; echo_req?: Record<string, unknown> };
                logSpecialAccountDebug('authorize_exception', {
                    active_loginid: this.account_id,
                    error_code: err?.error?.code,
                    error_message: err?.error?.message,
                    echo_req: err?.echo_req,
                });
            }
            if (isEliteSpecialCaseLoginId(this.account_id)) {
                console.error(
                    '%c[ELITE_SPECIAL_CASE_LOGINID] authorizeAndSubscribe: unhandled auth exception',
                    'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                    { active_loginid: this.account_id, error: e }
                );
            }
            this.is_authorized = false;
            // Preserve active_loginid + accountsList for special-case accounts so the reconnect
            // can re-authorize. clearAuthData() wipes both unconditionally; a transient error
            // must not destroy the identity that the user explicitly selected.
            const saved_loginid = localStorage.getItem('active_loginid');
            const saved_accounts_list = localStorage.getItem('accountsList');
            const hasOAuthBearer = Boolean(OAuthTokenExchangeService.getAuthInfo()?.access_token);
            const is_special_login =
                isSpecialCaseLoginId(saved_loginid) || isEliteSpecialCaseLoginId(saved_loginid);

            if (!hasOAuthBearer && !is_special_login) {
                clearAuthData();
            } else if (is_special_login && saved_loginid) {
                clearAuthData();
                localStorage.setItem('active_loginid', saved_loginid);
                if (saved_accounts_list) {
                    localStorage.setItem('accountsList', saved_accounts_list);
                }
                console.log(
                    '%c[SPECIAL_CASE] authorizeAndSubscribe catch: restored active_loginid + accountsList after clearAuthData',
                    'background:#555;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                    { saved_loginid }
                );
            } else if (hasOAuthBearer && saved_loginid && saved_accounts_list) {
                console.warn(
                    '[APIBase] authorize failed but OAuth bearer session preserved — user can retry without re-login'
                );
            }
            setIsAuthorized(false);
            const failedClientStore = globalObserver.getState('client.store');
            if (failedClientStore) {
                failedClientStore.setIsAccountRegenerating(false);
            }
            globalObserver.emit('Error', e);
        } finally {
            console.log(
                '%c🏁 [APIBase] authorizeAndSubscribe() finally block - setIsAuthorizing(false)',
                'color: cyan;'
            );
            setIsAuthorizing(false);
        }
    }

    async subscribe() {
        const isElite = getAuthSystem() === 'ELITE';
        const subscribeToStream = (streamName: string) => {
            return doUntilDone(
                () => {
                    const subscription = this.api?.send({
                        [streamName]: 1,
                        subscribe: 1,
                        ...(streamName === 'balance' && !isElite ? { account: 'all' } : {}),
                    });

                    if (subscription) {
                        this.current_auth_subscriptions.push(subscription);
                    }
                    return subscription;
                },
                [],
                this
            );
        };

        const streamsToSubscribe = ['balance', 'transaction', 'proposal_open_contract'];

        await Promise.all(streamsToSubscribe.map(subscribeToStream));
    }

    getActiveSymbols = async () => {
        if (!this.api) {
            throw new Error('API connection not available for fetching active symbols');
        }

        try {
            // Add timeout to prevent hanging
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Active symbols fetch timeout')), this.ACTIVE_SYMBOLS_TIMEOUT_MS)
            );

            const activeSymbolsPromise = doUntilDone(() => this.api?.send({ active_symbols: 'brief' }), [], this);

            const apiResult = await Promise.race([activeSymbolsPromise, timeout]);

            const { active_symbols = [], error = {} } = apiResult as any;

            if (error && Object.keys(error).length > 0) {
                throw new Error(`Active symbols API error: ${error.message || 'Unknown error'}`);
            }

            if (!active_symbols.length) {
                throw new Error('No active symbols received from API');
            }

            this.has_active_symbols = true;

            // Process active symbols using the dedicated service with fallback
            try {
                const enrichmentTimeout = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Enrichment timeout')), this.ENRICHMENT_TIMEOUT_MS)
                );

                const enrichmentPromise = activeSymbolsProcessorService.processActiveSymbols(active_symbols);
                const processedResult = await Promise.race([enrichmentPromise, enrichmentTimeout]);

                this.active_symbols = processedResult.enrichedSymbols;
                this.pip_sizes = processedResult.pipSizes;
            } catch (enrichmentError) {
                console.warn('Symbol enrichment failed, using raw symbols:', enrichmentError);
                // Fallback to raw symbols if enrichment fails
                this.active_symbols = active_symbols;
                this.pip_sizes = {};
            }

            this.toggleRunButton(false);
            return this.active_symbols;
        } catch (error) {
            console.error('Failed to fetch and process active symbols:', error);
            throw error;
        }
    };

    toggleRunButton = (toggle: boolean) => {
        const run_button = document.querySelector('#db-animation__run-button');
        if (!run_button) return;
        (run_button as HTMLButtonElement).disabled = toggle;
    };

    setIsRunning(toggle = false) {
        this.is_running = toggle;
    }

    pushSubscription(subscription: CurrentSubscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        // Resetting timeout resolvers
        const global_timeouts = globalObserver.getState('global_timeouts') ?? [];

        global_timeouts.forEach((_: unknown, i: number) => {
            clearTimeout(i);
        });
    }
}

export const api_base = new APIBase();