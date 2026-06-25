import { useCallback, useEffect, useState } from 'react';
import { clearCSRFToken, validateCSRFToken } from '@/components/shared/utils/config/config';
import { getPostLoginRedirectUrl } from '@/constants/oauth';
import { clearAuthData } from '@/utils/auth-utils';

/**
 * OAuth callback parameters extracted from URL
 */
export interface OAuthCallbackParams {
    code: string | null;
    state: string | null;
    error: string | null;
    error_description: string | null;
}

/**
 * ELITE callback account data (acct1, token1, cur1 format)
 */
export interface EliteAccount {
    accountId: string;
    token: string;
    currency: string;
}

/**
 * ELITE callback parameters extracted from URL
 */
export interface EliteCallbackParams {
    accounts: EliteAccount[];
}

/**
 * OAuth callback processing result
 */
export interface OAuthCallbackResult {
    isProcessing: boolean;
    isValid: boolean;
    params: OAuthCallbackParams;
    eliteParams: EliteCallbackParams | null;
    isEliteCallback: boolean;
    error: string | null;
    cleanupURL: () => void;
}

/**
 * Custom hook to handle OAuth callback flow
 *
 * This hook:
 * 1. Extracts OAuth parameters (code, state, error) from URL
 * 2. Validates CSRF token (state parameter)
 * 3. Returns the authorization code and a cleanup function
 *
 * Note: Call cleanupURL() after you've processed the authorization code
 *
 * @returns OAuth callback processing result with cleanupURL function
 *
 * @example
 * ```tsx
 * const { isProcessing, isValid, params, error, cleanupURL } = useOAuthCallback();
 *
 * useEffect(() => {
 *   if (!isProcessing && isValid && params.code) {
 *     // Exchange code for tokens
 *     exchangeCodeForTokens(params.code).then(() => {
 *       cleanupURL(); // Clean up after processing
 *     });
 *   }
 * }, [isProcessing, isValid, params.code]);
 * ```
 */

/**
 * Helper function to parse ELITE callback parameters
 * ELITE OAuth returns account data directly: acct1, token1, cur1, acct2, token2, cur2, etc.
 */
const parseEliteParameters = (urlParams: URLSearchParams): EliteAccount[] => {
    const accounts: EliteAccount[] = [];
    let index = 1;

    while (true) {
        const accountId = urlParams.get(`acct${index}`);
        const token = urlParams.get(`token${index}`);
        const currency = urlParams.get(`cur${index}`);

        if (!accountId || !token) break;

        accounts.push({
            accountId,
            token,
            currency: currency || 'USD',
        });

        index++;
    }

    return accounts;
};

export const useOAuthCallback = (): OAuthCallbackResult => {
    const [result, setResult] = useState<Omit<OAuthCallbackResult, 'cleanupURL'>>({
        isProcessing: true,
        isValid: false,
        params: {
            code: null,
            state: null,
            error: null,
            error_description: null,
        },
        eliteParams: null,
        isEliteCallback: false,
        error: null,
    });

    // Cleanup function that can be called by the consuming component
    const cleanupURL = useCallback(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('scope');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');

        // Also clean up ELITE callback parameters
        let index = 1;
        while (true) {
            const acctKey = `acct${index}`;
            const tokenKey = `token${index}`;
            const curKey = `cur${index}`;

            if (!url.searchParams.has(acctKey) && !url.searchParams.has(tokenKey)) break;

            url.searchParams.delete(acctKey);
            url.searchParams.delete(tokenKey);
            url.searchParams.delete(curKey);

            index++;
        }

        // After OAuth, send users into the trading app on the dashboard tab.
        if (url.pathname === '/callback') {
            sessionStorage.removeItem('oauth_pending');
            const postLogin = sessionStorage.getItem('post_login_redirect');
            sessionStorage.removeItem('post_login_redirect');
            if (postLogin?.startsWith('/app')) {
                const [pathPart, hashPart] = postLogin.split('#');
                url.pathname = pathPart || '/app';
                url.hash = hashPart ? `#${hashPart}` : '#dashboard';
            } else {
                const fallback = getPostLoginRedirectUrl('dashboard');
                const [pathPart, hashPart] = fallback.split('#');
                url.pathname = pathPart || '/app';
                url.hash = hashPart ? `#${hashPart}` : '#dashboard';
            }
        }
        // Avoid manually dispatching POP navigation events: React Router blockers
        // can warn/fail when a POP occurs for a location not created by the router.
        // If we need to exit `/callback`, do a real navigation; otherwise just
        // replace the URL (no navigation needed).
        if (window.location.pathname === '/callback') {
            window.location.replace(url.toString());
        } else {
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Extract OAuth parameters
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const error_description = urlParams.get('error_description');

        console.log('[useOAuthCallback] URL Analysis:', {
            pathname: window.location.pathname,
            search: window.location.search,
            code: code ? `${code.substring(0, 30)}...` : null,
            state: state ? `${state.substring(0, 30)}...` : null,
            error,
        });

        // Check for ELITE callback format (acct1, token1, cur1)
        const acct1 = urlParams.get('acct1');
        const token1 = urlParams.get('token1');
        const isEliteCallback = acct1 !== null && token1 !== null;

        // Check if this is an OAuth callback (has code or error parameter) OR ELITE callback
        const isOAuthCallback = code !== null || error !== null || state !== null || isEliteCallback;

        if (!isOAuthCallback) {
            // If user lands on `/callback` without OAuth params (e.g. refresh or direct visit),
            // return them to the main app route.
            if (window.location.pathname === '/callback') {
                window.location.replace(`${window.location.origin}${getPostLoginRedirectUrl('dashboard')}`);
            }

            // Clear stale oauth_pending flag on normal page load (not during OAuth flow)
            if (window.location.pathname !== '/callback') {
                sessionStorage.removeItem('oauth_pending');
            }

            // Not an OAuth callback, mark as complete
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code: null, state: null, error: null, error_description: null },
                eliteParams: null,
                isEliteCallback: false,
                error: null,
            });
            return;
        }

        // Handle ELITE callback (no state validation needed for ELITE)
        if (isEliteCallback) {
            console.log('%c🔐 ELITE Callback Detected', 'color: #FF6B00; font-weight: bold;');
            const eliteAccounts = parseEliteParameters(urlParams);
            console.log('%c📋 ELITE Accounts:', 'color: #FF6B00;', eliteAccounts);

            setResult({
                isProcessing: false,
                isValid: true,
                params: { code: null, state: null, error: null, error_description: null },
                eliteParams: { accounts: eliteAccounts },
                isEliteCallback: true,
                error: null,
            });
            return;
        }

        // Handle OAuth error response
        if (error) {
            console.error('OAuth error:', error, error_description);
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                eliteParams: null,
                isEliteCallback: false,
                error: error_description || error,
            });

            cleanupURL();
            return;
        }

        // Validate CSRF token (state parameter)
        console.log('[useOAuthCallback] CSRF Validation:', {
            state: state ? `${state.substring(0, 30)}...` : null,
            storedToken: sessionStorage.getItem('oauth_csrf_token')
                ? `${sessionStorage.getItem('oauth_csrf_token')!.substring(0, 30)}...`
                : null,
            tokenTimestamp: sessionStorage.getItem('oauth_csrf_token_timestamp'),
        });

        if (!state) {
            console.error('[DEBUG] Missing state parameter in OAuth callback');
            clearAuthData();
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                eliteParams: null,
                isEliteCallback: false,
                error: 'Missing state parameter - potential security threat',
            });

            window.location.replace(window.location.origin);
            return;
        }

        if (!validateCSRFToken(state)) {
            console.error('[DEBUG] CSRF token validation failed - potential security threat');
            console.error('Expected state:', sessionStorage.getItem('oauth_csrf_token'));
            console.error('Received state:', state);
            clearAuthData();
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                eliteParams: null,
                isEliteCallback: false,
                error: 'CSRF token validation failed',
            });
            // Keep URL with error details visible for debugging
            return;
        }

        // CSRF validation passed
        clearCSRFToken();

        // Validate that we have the authorization code
        if (!code) {
            console.error('%c❌ Missing authorization code in OAuth callback', 'color: red; font-weight: bold;');
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                eliteParams: null,
                isEliteCallback: false,
                error: 'Missing authorization code after CSRF validation passed',
            });
            return;
        }

        setResult({
            isProcessing: false,
            isValid: true,
            params: { code, state, error, error_description },
            eliteParams: null,
            isEliteCallback: false,
            error: null,
        });
    }, [cleanupURL]); // Run only once on mount

    return {
        ...result,
        cleanupURL,
    };
};
