import { useCallback, useState } from 'react';
import { DEFAULT_POST_LOGIN_PATH, OAUTH_APP_ID, OAUTH_CALLBACK_URL, resolveOAuthClientId } from '@/constants/oauth';
import { useApiBase } from '@/hooks/useApiBase';

const SIGNUP_URL = 'https://partner-tracking.deriv.com/click?a=21435&o=1&c=3&link_id=1';

const storeOAuthState = (csrfToken: string, codeVerifier: string) => {
    const timestamp = Date.now().toString();
    sessionStorage.setItem('oauth_csrf_token', csrfToken);
    sessionStorage.setItem('oauth_csrf_token_timestamp', timestamp);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_code_verifier_timestamp', timestamp);
    localStorage.setItem('oauth_csrf_token', csrfToken);
    localStorage.setItem('oauth_csrf_token_timestamp', timestamp);
    localStorage.setItem('oauth_code_verifier', codeVerifier);
    localStorage.setItem('oauth_code_verifier_timestamp', timestamp);
};

/**
 * Shared Deriv OAuth login + partner signup actions (header, landing page).
 */
export function useDerivAuthActions() {
    const { setIsAuthorizing } = useApiBase();
    const [isLoginLoading, setIsLoginLoading] = useState(false);

    const handleSignup = useCallback(() => {
        window.location.href = SIGNUP_URL;
    }, []);

    const handleLogin = useCallback(async () => {
        try {
            setIsLoginLoading(true);
            setIsAuthorizing(true);

            sessionStorage.removeItem('elite_oauth_flow_in_progress');
            localStorage.removeItem('elite_oauth_flow_in_progress');
            sessionStorage.removeItem('elite_temp_token');
            localStorage.removeItem('elite_temp_token');

            sessionStorage.setItem('oauth_pending', 'true');
            if (!sessionStorage.getItem('post_login_redirect')) {
                sessionStorage.setItem('post_login_redirect', DEFAULT_POST_LOGIN_PATH);
            }

            const csrfArray = new Uint8Array(32);
            crypto.getRandomValues(csrfArray);
            const csrfToken = btoa(String.fromCharCode(...csrfArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const verifierArray = new Uint8Array(32);
            crypto.getRandomValues(verifierArray);
            const codeVerifier = btoa(String.fromCharCode(...verifierArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            storeOAuthState(csrfToken, codeVerifier);

            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const codeChallenge = btoa(String.fromCharCode(...hashArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const clientId = resolveOAuthClientId();
            const appId = OAUTH_APP_ID;
            const redirectUri = OAUTH_CALLBACK_URL;
            const scope = 'trade';

            const oauthUrl = `https://auth.deriv.com/oauth2/auth?scope=${scope}&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfToken}&code_challenge=${codeChallenge}&code_challenge_method=S256&app_id=${appId}`;

            window.location.replace(oauthUrl);
        } catch (error) {
            console.error('Login redirection failed:', error);
            sessionStorage.removeItem('oauth_pending');
            setIsLoginLoading(false);
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    return { handleLogin, handleSignup, isLoginLoading };
}
