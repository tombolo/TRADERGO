/** Must match the redirect URI registered with Deriv OAuth and used in the login request. */
export const OAUTH_CALLBACK_URL = 'https://www.derivanalysinghub.com/callback';

/** Default in-app destination after OAuth completes. */
export const DEFAULT_POST_LOGIN_PATH = '/app#dashboard';

export function getPostLoginRedirectUrl(hash = 'dashboard'): string {
    return `/app#${hash.replace(/^#/, '')}`;
}
