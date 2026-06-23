import { getSocketURL } from '@/components/shared';
import {
    getDotLoginidFromSession,
    getVrtcLoginidFromSession,
    isEliteSpecialCaseLoginId,
    isSpecialCaseLoginId,
    logSpecialAccountDebug,
} from '@/utils/account-helpers';
import { getAuthSystem } from '@/utils/auth-system-helpers';
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
                console.log('[AuthTrace] websocket_connected', { url: wsURL });
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
    const auth_system = getAuthSystem();
    const dot_loginid = Object.keys(client_accounts || {}).find(loginid => loginid.startsWith('DOT'));
    const vrtc_loginid = Object.keys(client_accounts || {}).find(loginid => loginid.startsWith('VRTC'));

    if (isSpecialCaseLoginId(active_loginid)) {
        logSpecialAccountDebug('getToken_enter', {
            active_loginid,
            accountsList_keys: Object.keys(client_accounts || {}),
            dot_loginid_from_map: dot_loginid,
            has_dot_key: Boolean(dot_loginid && client_accounts[dot_loginid]),
            has_rot_key: Boolean(active_loginid && client_accounts[active_loginid]),
        });

        if (dot_loginid && client_accounts[dot_loginid]) {
            logSpecialAccountDebug('getToken_branch', {
                branch: 'dot_from_accountsList',
                active_loginid,
                selected_dot_loginid: dot_loginid,
                token: client_accounts[dot_loginid],
                total_accounts: Object.keys(client_accounts || {}).length,
            });
            return {
                token: client_accounts[dot_loginid] ?? undefined,
                account_id: dot_loginid,
            };
        }
        // OAuth often stores the same bearer under every loginid; DOT key may be missing from the map.
        const session_dot = getDotLoginidFromSession();
        const rot_token = active_loginid ? client_accounts[active_loginid] : undefined;
        const first_token = Object.values(client_accounts || {}).find(v => typeof v === 'string' && v.length > 0);
        const shared_token = rot_token || first_token;
        if (session_dot && typeof shared_token === 'string' && shared_token.length > 0) {
            logSpecialAccountDebug('getToken_branch', {
                branch: 'session_dot_with_shared_token',
                active_loginid,
                session_dot,
                has_rot_key: Boolean(rot_token),
                used_rot_token: Boolean(rot_token),
                used_first_token: !rot_token && Boolean(first_token),
                token: shared_token,
            });
            return {
                token: shared_token,
                account_id: session_dot,
            };
        }
        logSpecialAccountDebug('getToken_failed', {
            active_loginid,
            accounts_keys: Object.keys(client_accounts || {}),
            session_dot,
            reason: 'no_dot_token_resolved',
        });
    }

    if (isEliteSpecialCaseLoginId(active_loginid)) {
        if (vrtc_loginid && client_accounts[vrtc_loginid]) {
            console.log(
                '%c[ELITE_SPECIAL_CASE_LOGINID] getToken: using VRTC demo token for CR real account',
                'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                { active_loginid, selected_vrtc_loginid: vrtc_loginid, total_accounts: Object.keys(client_accounts || {}).length }
            );
            return {
                token: client_accounts[vrtc_loginid] ?? undefined,
                account_id: vrtc_loginid,
            };
        }
        // VRTC key may be missing from accountsList — fall back to session + shared token.
        const session_vrtc = getVrtcLoginidFromSession();
        const cr_token = active_loginid ? client_accounts[active_loginid] : undefined;
        const first_token = Object.values(client_accounts || {}).find(v => typeof v === 'string' && v.length > 0);
        const shared_token = cr_token || first_token;
        if (session_vrtc && typeof shared_token === 'string' && shared_token.length > 0) {
            console.log(
                '%c[ELITE_SPECIAL_CASE_LOGINID] getToken: using session VRTC id with shared OAuth token',
                'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                { active_loginid, session_vrtc, has_cr_key: Boolean(cr_token) }
            );
            return {
                token: shared_token,
                account_id: session_vrtc,
            };
        }
        console.warn(
            '%c[ELITE_SPECIAL_CASE_LOGINID] getToken: CR account active but no VRTC token could be resolved',
            'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
            { active_loginid, accounts_keys: Object.keys(client_accounts || {}), session_vrtc }
        );
    }

    const active_account = client_accounts && active_loginid ? client_accounts[active_loginid] : undefined;

    // ELITE callback can briefly restore auth_system/accountsList before active_loginid.
    // Keep authorization progressing by using the first available session token.
    if (!active_loginid && auth_system === 'ELITE') {
        const first_loginid = Object.keys(client_accounts || {}).find(loginid => {
            const token = client_accounts[loginid];
            return typeof token === 'string' && token.length > 0;
        });
        if (first_loginid) {
            return {
                token: client_accounts[first_loginid],
                account_id: first_loginid,
            };
        }
    }

    return {
        token: typeof active_account === 'string' ? active_account : undefined,
        account_id: active_loginid ?? undefined,
    };
};

export const V2GetActiveToken = () => getToken()?.token;

export const V2GetActiveClientId = () => getToken()?.account_id;
