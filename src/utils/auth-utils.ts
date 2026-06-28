/**
 * Utility functions for authentication-related operations
 */
import { getLoginId } from '@/external/bot-skeleton/services/api/appId';

export const AUTH_SITE_ORIGIN_KEY = 'auth_site_origin';
export const AUTH_INFO_STORAGE_KEY = 'auth_info';
export const ACCOUNT_SWITCH_IN_PROGRESS_KEY = 'account_switch_in_progress';

export const markAccountSwitchInProgress = (): void => {
    try {
        sessionStorage.setItem(ACCOUNT_SWITCH_IN_PROGRESS_KEY, String(Date.now()));
    } catch {
        // ignore
    }
};

export const clearAccountSwitchInProgress = (): void => {
    try {
        sessionStorage.removeItem(ACCOUNT_SWITCH_IN_PROGRESS_KEY);
    } catch {
        // ignore
    }
};

export const isAccountSwitchInProgress = (): boolean => {
    try {
        return sessionStorage.getItem(ACCOUNT_SWITCH_IN_PROGRESS_KEY) !== null;
    } catch {
        return false;
    }
};

/** Read OAuth bearer from session or local storage when still valid. */
export const getValidPersistedAuthInfo = (): { access_token: string; expires_at?: number } | null => {
    for (const storage of [sessionStorage, localStorage]) {
        try {
            const raw = storage.getItem(AUTH_INFO_STORAGE_KEY);
            if (!raw) continue;

            const parsed = JSON.parse(raw) as { access_token?: string; expires_at?: number };
            if (!parsed?.access_token) continue;
            if (parsed.expires_at && Date.now() >= parsed.expires_at) continue;

            return { access_token: parsed.access_token, expires_at: parsed.expires_at };
        } catch {
            // ignore
        }
    }
    return null;
};

/** Mirror auth_info into both storages so sessions survive tab close and browser restarts. */
export const mirrorAuthInfoStorage = (authInfo: {
    access_token: string;
    expires_at?: number;
    [key: string]: unknown;
}): void => {
    try {
        const serialized = JSON.stringify(authInfo);
        sessionStorage.setItem(AUTH_INFO_STORAGE_KEY, serialized);
        localStorage.setItem(AUTH_INFO_STORAGE_KEY, serialized);
    } catch {
        // ignore
    }
};

/** Promote session-only auth_info into localStorage for returning visitors. */
export const syncAuthInfoAcrossStorages = (): void => {
    try {
        const fromSession = sessionStorage.getItem(AUTH_INFO_STORAGE_KEY);
        const fromLocal = localStorage.getItem(AUTH_INFO_STORAGE_KEY);
        if (fromSession && !fromLocal) {
            localStorage.setItem(AUTH_INFO_STORAGE_KEY, fromSession);
        } else if (fromLocal && !fromSession) {
            sessionStorage.setItem(AUTH_INFO_STORAGE_KEY, fromLocal);
        }
    } catch {
        // ignore
    }
};
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

        const authInfo = getValidPersistedAuthInfo();
        if (authInfo?.access_token) {
            return true;
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

        sessionStorage.removeItem(AUTH_INFO_STORAGE_KEY);
        localStorage.removeItem(AUTH_INFO_STORAGE_KEY);
        sessionStorage.removeItem('deriv_accounts');
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_just_completed');
        sessionStorage.removeItem('oauth_csrf_token');
        sessionStorage.removeItem('oauth_csrf_token_timestamp');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_code_verifier_timestamp');
        sessionStorage.removeItem('elite_temp_token');
        sessionStorage.removeItem(ACCOUNT_SWITCH_IN_PROGRESS_KEY);
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
