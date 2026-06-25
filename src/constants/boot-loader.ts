/** Default minimum boot loader display when no session exists (ms). */
export const NETWORK_BOOT_MIN_DISPLAY_MS = 400;

/** Boot loader minimum for users who already have a stored session (ms). */
export const RETURNING_SESSION_BOOT_MS = 0;

/** Brief polish after OAuth completes (ms). */
export const POST_OAUTH_BOOT_MS = 800;

/** Resolves how long the symbols boot loader should stay visible. */
export const getBootLoaderMinDisplayMs = (): number => {
    try {
        if (sessionStorage.getItem('oauth_just_completed')) {
            return POST_OAUTH_BOOT_MS;
        }

        const loginid = localStorage.getItem('active_loginid');
        const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
        if (loginid && loginid !== 'oauth_session' && accountsList[loginid]) {
            return RETURNING_SESSION_BOOT_MS;
        }

        const authInfoRaw = sessionStorage.getItem('auth_info');
        if (authInfoRaw) {
            const authInfo = JSON.parse(authInfoRaw) as { access_token?: string; expires_at?: number };
            if (authInfo.access_token && (!authInfo.expires_at || Date.now() < authInfo.expires_at)) {
                return RETURNING_SESSION_BOOT_MS;
            }
        }
    } catch {
        // fall through
    }

    return NETWORK_BOOT_MIN_DISPLAY_MS;
};
