import { getSocketURL } from '@/components/shared';
import { isSpecialCaseLoginId } from '@/utils/account-helpers';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import APIMiddleware from './api-middleware';

/**
 * Singleton instance management for DerivAPI
 */
let derivApiInstance = null;
let derivApiPromise = null;
let currentWebSocketURL = null;

/**
 * Clears the singleton instance (useful for logout or forced reconnection)
 */
export const clearDerivApiInstance = () => {
    if (derivApiInstance?.connection) {
        try {
            derivApiInstance.connection.close();
        } catch (error) {
            console.error('[DerivAPI] Error closing WebSocket:', error);
        }
    }
    derivApiInstance = null;
    derivApiPromise = null;
    currentWebSocketURL = null;
};

/**
 * Generates a Deriv API instance with WebSocket connection using singleton pattern
 * Prevents multiple WebSocket connections by reusing existing instance
 * Now supports async WebSocket URL fetching with authenticated flow
 * @param {boolean} forceNew - Force creation of new instance (default: false)
 * @returns Promise with DerivAPIBasic instance
 */
export const generateDerivApiInstance = async (forceNew = false) => {
    // If forcing new instance, clear existing one
    if (forceNew) {
        console.log('[DerivAPI] Forcing new instance creation');
        clearDerivApiInstance();
    }

    // If there's already an instance, check its state
    if (derivApiInstance) {
        const readyState = derivApiInstance.connection?.readyState;
        // Return existing instance if it's connecting or open
        if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
            console.log('[DerivAPI] Reusing existing instance (state:', readyState, ')');
            return derivApiInstance;
        } else {
            // Connection is closed or closing, clear it
            console.log('[DerivAPI] Existing instance not usable (state:', readyState, '), creating new');
            clearDerivApiInstance();
        }
    }

    // If there's already a creation in progress, return that promise
    if (derivApiPromise) {
        console.log('[DerivAPI] Reusing existing creation promise');
        return derivApiPromise;
    }

    // Create new instance
    derivApiPromise = (async () => {
        try {
            // Await the async getSocketURL() function
            const wsURL = await getSocketURL();

            // Check if URL changed (account switch scenario)
            if (currentWebSocketURL && currentWebSocketURL !== wsURL) {
                console.log('[DerivAPI] WebSocket URL changed, clearing old instance');
                clearDerivApiInstance();
            }

            currentWebSocketURL = wsURL;

            console.log('[DerivAPI] Creating new WebSocket connection to:', wsURL);
            const deriv_socket = new WebSocket(wsURL);
            const deriv_api = new DerivAPIBasic({
                connection: deriv_socket,
                middleware: new APIMiddleware({}),
            });

            // Store the instance immediately (don't wait for connection)
            derivApiInstance = deriv_api;

            // Set up close handler to clear instance
            deriv_socket.addEventListener('close', () => {
                console.log('[DerivAPI] WebSocket connection closed');
                if (derivApiInstance === deriv_api) {
                    derivApiInstance = null;
                    currentWebSocketURL = null;
                }
            });

            // Log when connection opens
            deriv_socket.addEventListener('open', () => {
                console.log('[DerivAPI] WebSocket connection established');
            });

            deriv_socket.addEventListener('error', error => {
                console.error('[DerivAPI] WebSocket connection error:', error);
            });

            return deriv_api;
        } catch (error) {
            console.error('[DerivAPI] Error creating instance:', error);
            derivApiPromise = null;
            derivApiInstance = null;
            throw error;
        } finally {
            // Clear the promise after a short delay to allow reuse during concurrent calls
            setTimeout(() => {
                derivApiPromise = null;
            }, 100);
        }
    })();

    return derivApiPromise;
};

export const getLoginId = () => {
    const login_id = localStorage.getItem('active_loginid');
    if (login_id && login_id !== 'null') return login_id;
    return null;
};

export const V2GetActiveAccountId = () => {
    const account_id = localStorage.getItem('active_loginid');
    if (account_id && account_id !== 'null') return account_id;
    return null;
};

export const getToken = () => {
    const active_loginid = getLoginId();
    const client_accounts = JSON.parse(localStorage.getItem('accountsList') ?? '{}');
    const dot_loginid_from_local_map = Object.keys(client_accounts || {}).find(loginid => loginid.startsWith('DOT'));
    const dot_loginid_from_stored_accounts = DerivWSAccountsService.getStoredAccounts()?.find(account =>
        account.account_id.startsWith('DOT')
    )?.account_id;
    const dot_loginid = dot_loginid_from_local_map || dot_loginid_from_stored_accounts;

    if (isSpecialCaseLoginId(active_loginid) && dot_loginid) {
        const dot_token_from_map = client_accounts[dot_loginid];
        const fallback_oauth_token = OAuthTokenExchangeService.getAccessToken();
        const resolved_dot_token =
            typeof dot_token_from_map === 'string'
                ? dot_token_from_map
                : typeof fallback_oauth_token === 'string'
                  ? fallback_oauth_token
                  : undefined;
        console.log('[SpecialAccount][getToken] Using DOT token for ROT account', {
            active_loginid,
            selected_dot_loginid: dot_loginid,
            has_token: Boolean(resolved_dot_token),
            token_source: typeof dot_token_from_map === 'string' ? 'accountsList' : 'oauth_access_token',
            total_accounts: Object.keys(client_accounts || {}).length,
        });
        return {
            token: resolved_dot_token,
            account_id: dot_loginid,
        };
    }
    if (isSpecialCaseLoginId(active_loginid)) {
        console.warn('[SpecialAccount][getToken] ROT account active but no DOT account found in accountsList', {
            active_loginid,
            accounts_keys: Object.keys(client_accounts || {}),
        });
    }

    const active_account = client_accounts && active_loginid ? client_accounts[active_loginid] : undefined;
    return {
        token: typeof active_account === 'string' ? active_account : undefined,
        account_id: active_loginid ?? undefined,
    };
};

export const V2GetActiveToken = () => getToken()?.token;

export const V2GetActiveClientId = () => getToken()?.account_id;
