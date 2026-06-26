/**
 * Utility functions for authentication-related operations
 */
import { getLoginId } from '@/external/bot-skeleton/services/api/appId';

export const AUTH_SITE_ORIGIN_KEY = 'auth_site_origin';

/** Registrable domain keys for sites that may have left stale sessions in storage. */
const LEGACY_AUTH_SITE_ORIGINS = new Set([
    'smarttraderstool.com',
    'smartderiv.pro',
    'pipstrades.pro',
]);

/** True when localStorage has an active login id and matching account token. */
export const hasStoredSession = (): boolean => {
    try {
        const loginid = localStorage.getItem('active_loginid');
        const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
        if (loginid && accountsList[loginid]) {
            return true;
        }

        const authInfoRaw = sessionStorage.getItem('auth_info');
        if (authInfoRaw) {
            const authInfo = JSON.parse(authInfoRaw) as { access_token?: string; expires_at?: number };
            if (authInfo.access_token && (!authInfo.expires_at || Date.now() < authInfo.expires_at)) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
};

/** Normalized site key (apex domain) used to detect cross-domain stale sessions. */
export const getAuthSiteOriginKey = (): string => {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
        return host;
    }
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : host;
};

/** Record which site last established the stored session. */
export const stampAuthSiteOrigin = (): void => {
    try {
        localStorage.setItem(AUTH_SITE_ORIGIN_KEY, getAuthSiteOriginKey());
    } catch {
        // ignore
    }
};

/**
 * Clears authentication data from storage.
 * Call when tokens are invalid or the user switched to a new branded domain.
 */
export const clearAuthData = (): void => {
    try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('active_loginid');
        localStorage.removeItem('client.country');
        localStorage.removeItem('account_type');
        localStorage.removeItem('accountsList');
        localStorage.removeItem('clientAccounts');
        localStorage.removeItem('callback_token');
        localStorage.removeItem('auth_system');
        localStorage.removeItem('elite_oauth_flow_in_progress');

        sessionStorage.removeItem('auth_info');
        sessionStorage.removeItem('deriv_accounts');
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_just_completed');
        sessionStorage.removeItem('oauth_csrf_token');
        sessionStorage.removeItem('oauth_csrf_token_timestamp');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_code_verifier_timestamp');
        sessionStorage.removeItem('elite_temp_token');
    } catch {
        // ignore
    }
};

/**
 * If the user has a session from another site (rebrand / www vs apex), wipe it before React boots.
 * @returns true when stale auth data was cleared
 */
export const recoverStaleSessionForSite = (): boolean => {
    try {
        const current = getAuthSiteOriginKey();
        const stored = localStorage.getItem(AUTH_SITE_ORIGIN_KEY);

        if (!hasStoredSession()) {
            stampAuthSiteOrigin();
            return false;
        }

        const isLegacyOrigin = stored ? LEGACY_AUTH_SITE_ORIGINS.has(stored) : false;
        const originMismatch = Boolean(stored && stored !== current);

        if (originMismatch || isLegacyOrigin) {
            clearAuthData();
            stampAuthSiteOrigin();
            return true;
        }

        if (!stored) {
            stampAuthSiteOrigin();
        }

        return false;
    } catch {
        return false;
    }
};

/**
 * Clears invalid stored sessions after WebSocket auth fails to resolve.
 * @returns true when auth data was cleared
 */
export const clearStaleSessionIfUnauthorized = (): boolean => {
    if (!hasStoredSession()) {
        return false;
    }
    clearAuthData();
    return true;
};

/**
 * Transforms transaction IDs for display when CR9742993 is the active account.
 * For this special account, the displayed ID in the run panel journal should start with 147.
 * @param transaction_id - The transaction ID to transform
 * @returns The transformed transaction ID (or original if no transformation needed)
 */
export const transformTransactionIdForDisplay = (
    transaction_id: number | string | undefined
): number | string | undefined => {
    if (!transaction_id) return transaction_id;

    const active_loginid = getLoginId();

    // Only transform if CR9742993 is active: displayed ID must start with 147
    if (active_loginid === 'CR9742993') {
        const idString = String(transaction_id);
        const idNum = typeof transaction_id === 'string' ? parseInt(transaction_id, 10) : transaction_id;

        if (!isNaN(idNum) && idString.length > 0) {
            const transformedId = `147${idString.slice(3)}`;
            return transformedId.length > 0 ? parseInt(transformedId, 10) : 147;
        }
    }

    return transaction_id;
};
