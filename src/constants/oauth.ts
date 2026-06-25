/** Must match the redirect URI registered with Deriv OAuth and used in the login request. */
export const OAUTH_CALLBACK_URL = 'https://www.derivanalysinghub.com/callback';

/** Production OAuth client — must match token exchange and login redirect. */
export const OAUTH_CLIENT_ID = '338ua9bwF5Y4uHPT4xyDs';

export const OAUTH_APP_ID = '134081';

/** Default in-app destination after OAuth completes. */
export const DEFAULT_POST_LOGIN_PATH = '/app#dashboard';

export function getPostLoginRedirectUrl(hash = 'dashboard'): string {
    return `/app#${hash.replace(/^#/, '')}`;
}

export function resolveOAuthClientId(): string {
    const fromEnv = (process.env.CLIENT_ID || process.env.APP_ID || '').trim().replace(/^['"]|['"]$/g, '');
    return fromEnv || OAUTH_CLIENT_ID;
}

/** Full-page navigation into the trading app after a successful OAuth session is stored. */
export function redirectToPostLoginApp(): void {
    sessionStorage.removeItem('oauth_pending');
    sessionStorage.setItem('oauth_just_completed', Date.now().toString());
    const postLogin = sessionStorage.getItem('post_login_redirect') || DEFAULT_POST_LOGIN_PATH;
    sessionStorage.removeItem('post_login_redirect');
    const target = postLogin.startsWith('/') ? postLogin : `/${postLogin}`;
    window.location.replace(`${window.location.origin}${target}`);
}

/** Send the user back to the public landing page when OAuth fails. */
export function redirectToHomeAfterAuthFailure(): void {
    sessionStorage.removeItem('oauth_pending');
    sessionStorage.removeItem('post_login_redirect');
    window.location.replace(`${window.location.origin}/`);
}
