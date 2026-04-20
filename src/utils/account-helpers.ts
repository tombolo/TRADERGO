// Account and device utility functions
// Moved from src/analytics/utils.ts during analytics cleanup

export const MAX_MOBILE_WIDTH = 926;
export const ACCOUNT_TYPE_KEY = 'account_type';

/** ROT accounts that share the DOT-wallet / demo-mapping behaviour (see getBalanceStorageLoginid). */
export const SPECIAL_CASE_LOGINIDS = Object.freeze(['ROT90168653', 'ROT90173861'] as const);

const SPECIAL_CASE_LOGINID_SET = new Set<string>(SPECIAL_CASE_LOGINIDS);

/** First special-case id; kept for callers that expect a single constant. */
export const SPECIAL_CASE_LOGINID = SPECIAL_CASE_LOGINIDS[0];

/**
 * Check if a loginid represents a demo account
 * Demo accounts have specific prefixes:
 * - VRTC: Classic demo accounts
 * - VRW: Demo wallet accounts
 * - Starts with DEM: Demo accounts with DEM prefix
 *
 * @param loginid - The account loginid to check
 * @returns true if demo account, false otherwise
 */
export const isDemoAccount = (loginid: string): boolean => {
    if (!loginid) return false;
    // Demo accounts: VRTC (classic), VRW (wallets), or DEM prefix
    return (
        loginid.startsWith('VRTC') ||
        loginid.startsWith('VRW') ||
        loginid.startsWith('DEM') ||
        loginid.startsWith('DOT')
    );
};

export const isSpecialCaseLoginId = (loginid?: string | null): boolean =>
    Boolean(loginid && SPECIAL_CASE_LOGINID_SET.has(loginid));

export const getFirstDotLoginid = (accounts?: Record<string, unknown> | null): string | undefined => {
    if (!accounts || typeof accounts !== 'object') return undefined;
    return Object.keys(accounts).find(loginid => loginid.startsWith('DOT'));
};

/** First DOT account from OAuth session when balance map is not seeded yet (special ROT flow). */
export const getDotLoginidFromSession = (): string | undefined => {
    try {
        const raw = sessionStorage.getItem('deriv_accounts');
        if (!raw) return undefined;
        const accounts = JSON.parse(raw) as Array<{ account_id?: string }>;
        return accounts?.find(a => a.account_id?.startsWith('DOT'))?.account_id;
    } catch {
        return undefined;
    }
};

/**
 * Loginid key used in `all_accounts_balance.accounts` for balance writes.
 * Only ids in `SPECIAL_CASE_LOGINIDS` are remapped to the DOT wallet that backs the websocket session.
 */
export const getBalanceStorageLoginid = (params: {
    clientLoginid: string;
    /** `loginid` from API payload when present (balance stream / buy). */
    explicitLoginid?: string | null;
    accountsMap?: Record<string, unknown> | null;
}): string => {
    const { clientLoginid, explicitLoginid, accountsMap } = params;
    if (isSpecialCaseLoginId(clientLoginid)) {
        const exp = explicitLoginid?.trim();
        if (exp && exp.startsWith('DOT')) return exp;
        return getFirstDotLoginid(accountsMap ?? null) ?? getDotLoginidFromSession() ?? clientLoginid;
    }
    const trimmed = explicitLoginid?.trim();
    return trimmed || clientLoginid;
};

/**
 * Get account type based on loginid and localStorage
 * This is the centralized function for determining account type
 * Loginid is the primary source of truth when provided
 *
 * @param loginid - Optional loginid to check (if not provided, uses localStorage only)
 * @returns 'demo' or 'real' or 'public' if cannot determine
 */
export const getAccountType = (loginid?: string): string | undefined => {
    try {
        // If loginid is provided, use it as the source of truth
        if (loginid) {
            return isDemoAccount(loginid) ? 'demo' : 'real';
        }

        // Only fallback to public when loginid is not available
        return 'public';
    } catch (error) {
        // Handle cases where localStorage is not available (SSR, private browsing, etc.)
        return 'public';
    }
};

/**
 * Gets account_id with priority: URL parameter > localStorage > null
 * @returns account_id string or null
 */
export const getAccountId = (): string | null => {
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const accountIdFromUrl = urlParams.get('account_id');

    const tokenFromUrl = urlParams.get('token');
    // Remove token from URL if present
    if (tokenFromUrl) {
        removeUrlParameter('token');
    }

    if (accountIdFromUrl) {
        // Store account ID in localStorage for future use
        localStorage.setItem('active_loginid', accountIdFromUrl);
        // Remove from URL after storing
        removeUrlParameter('account_id');
        // Return the account ID immediately as it takes precedence over localStorage
        return accountIdFromUrl;
    }

    // 2. Check localStorage
    return localStorage.getItem('active_loginid');
};

/**
 * Check if current account is virtual/demo
 * Loginid is the primary source of truth - if provided and valid, it takes precedence
 * Only falls back to localStorage when loginid is not available or empty
 *
 * @param loginid - The account loginid to check
 * @returns true if demo/virtual account, false otherwise
 */
export const isVirtualAccount = (loginid: string): boolean => {
    // If loginid is provided and valid, use it as the source of truth
    if (loginid) {
        return isDemoAccount(loginid);
    }

    // Only fallback to localStorage when loginid is not available
    try {
        const savedAccountType = localStorage.getItem(ACCOUNT_TYPE_KEY);
        return savedAccountType === 'demo';
    } catch (error) {
        return false;
    }
};

/**
 * Get device type based on screen width
 * @returns 'mobile' or 'desktop'
 */
export const getDeviceType = () => {
    // SSR safety check and use constant for breakpoint
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth <= MAX_MOBILE_WIDTH ? 'mobile' : 'desktop';
};

/**
 * Removes a parameter from the current URL without page reload
 * @param paramName - The name of the parameter to remove
 */
export const removeUrlParameter = (paramName: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete(paramName);
    window.history.replaceState({}, document.title, url.toString());
};
