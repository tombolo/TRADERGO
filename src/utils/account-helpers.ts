// Account and device utility functions
// Moved from src/analytics/utils.ts during analytics cleanup

export const MAX_MOBILE_WIDTH = 926;
export const ACCOUNT_TYPE_KEY = 'account_type';

/** ROT accounts that share the DOT-wallet / demo-mapping behaviour (see getBalanceStorageLoginid). */
/** ROT accounts that share the DOT-wallet / demo-mapping behaviour (see getBalanceStorageLoginid). */
export const SPECIAL_CASE_LOGINIDS = Object.freeze(['ROT91693802', 'ROT90223057', 'ROT92069221', 'ROT90173861', 'ROT913079', 'ROT90381018', 'ROT90173861', 'ROT9018653', 'ROT91383014'] as const);
/** ELITE real accounts that must operate on their paired VRTC demo account for all API calls. */
export const ELITE_SPECIAL_CASE_LOGINIDS = Object.freeze(['CR927015', 'CR3700786', 'CR7658355'] as const);

const SPECIAL_CASE_LOGINID_SET = new Set<string>(SPECIAL_CASE_LOGINIDS);
const ELITE_SPECIAL_CASE_LOGINID_SET = new Set<string>(ELITE_SPECIAL_CASE_LOGINIDS);

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

const SPECIAL_ACCOUNT_LOG_STYLE =
    'background:#b34700;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;';

/** Redact tokens / OTP values before logging. */
const sanitizeSpecialAccountLogData = (data?: Record<string, unknown>): Record<string, unknown> | undefined => {
    if (!data) return undefined;
    const out: Record<string, unknown> = { ...data };
    for (const key of Object.keys(out)) {
        const v = out[key];
        if (typeof v !== 'string') continue;
        const lower = key.toLowerCase();
        if (lower.includes('token') || lower.includes('otp') || lower === 'authorize') {
            out[key] = v.length > 12 ? `${v.slice(0, 8)}…(${v.length})` : '[redacted]';
        }
        if (lower.includes('url') && v.includes('otp=')) {
            out[key] = v.replace(/otp=[^&]+/, 'otp=[redacted]');
        }
    }
    return out;
};

/**
 * Structured debug log for ROT special-case accounts only.
 * Pass `active_loginid` / `activeLoginId` in `data` when localStorage may not be set yet.
 */
export const logSpecialAccountDebug = (step: string, data?: Record<string, unknown>): void => {
    const active_loginid =
        (typeof data?.active_loginid === 'string' && data.active_loginid) ||
        (typeof data?.activeLoginId === 'string' && data.activeLoginId) ||
        localStorage.getItem('active_loginid') ||
        '';
    if (!isSpecialCaseLoginId(active_loginid)) return;

    const payload = sanitizeSpecialAccountLogData({
        active_loginid,
        step,
        timestamp: new Date().toISOString(),
        ...data,
    });
    console.log(`%c[SpecialAccount][${step}]`, SPECIAL_ACCOUNT_LOG_STYLE, payload);
};

/** Returns true when loginid is a CR real account that must operate on its paired VRTC demo. */
export const isEliteSpecialCaseLoginId = (loginid?: string | null): boolean =>
    Boolean(loginid && ELITE_SPECIAL_CASE_LOGINID_SET.has(loginid));

export const getFirstDotLoginid = (accounts?: Record<string, unknown> | null): string | undefined => {
    if (!accounts || typeof accounts !== 'object') return undefined;
    return Object.keys(accounts).find(loginid => loginid.startsWith('DOT'));
};

/** First VRTC account from an accounts map — paired demo for ELITE special-case CR accounts. */
export const getFirstVrtcLoginid = (accounts?: Record<string, unknown> | null): string | undefined => {
    if (!accounts || typeof accounts !== 'object') return undefined;
    return Object.keys(accounts).find(loginid => loginid.startsWith('VRTC'));
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

/** First VRTC account from OAuth session when balance map is not seeded yet (ELITE special-case CR flow). */
export const getVrtcLoginidFromSession = (): string | undefined => {
    try {
        const raw = sessionStorage.getItem('deriv_accounts');
        if (!raw) return undefined;
        const accounts = JSON.parse(raw) as Array<{ account_id?: string }>;
        return accounts?.find(a => a.account_id?.startsWith('VRTC'))?.account_id;
    } catch {
        return undefined;
    }
};

/**
 * Loginid key used in `all_accounts_balance.accounts` for balance writes.
 * - ZOOM special-case ROT ids are remapped to the paired DOT wallet.
 * - ELITE special-case CR ids are remapped to the paired VRTC demo account.
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
        const dotFromMap = getFirstDotLoginid(accountsMap ?? null);
        const dotFromSession = getDotLoginidFromSession();
        const resolved = (exp && exp.startsWith('DOT') ? exp : null) ?? dotFromMap ?? dotFromSession ?? clientLoginid;
        logSpecialAccountDebug('getBalanceStorageLoginid', {
            clientLoginid,
            explicitLoginid,
            dotFromMap,
            dotFromSession,
            resolved,
        });
        return resolved;
    }
    if (isEliteSpecialCaseLoginId(clientLoginid)) {
        const exp = explicitLoginid?.trim();
        const vrtcFromMap = getFirstVrtcLoginid(accountsMap ?? null);
        const vrtcFromSession = getVrtcLoginidFromSession();
        const resolved = (exp && exp.startsWith('VRTC') ? exp : null) ?? vrtcFromMap ?? vrtcFromSession ?? clientLoginid;
        console.log(
            '%c[ELITE_SPECIAL_CASE_LOGINID] getBalanceStorageLoginid: remapping CR → VRTC demo for balance storage',
            'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
            { clientLoginid, explicitLoginid, vrtcFromMap, vrtcFromSession, resolved }
        );
        return resolved;
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
