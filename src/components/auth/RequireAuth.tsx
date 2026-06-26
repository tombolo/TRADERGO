import React from 'react';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import { useApiBase } from '@/hooks/useApiBase';
import { clearStaleSessionIfUnauthorized, hasStoredSession } from '@/utils/auth-utils';
import { getAccountId } from '@/utils/account-helpers';
import { localize } from '@deriv-com/translations';

type TRequireAuthProps = {
    children: React.ReactNode;
};

const SESSION_VERIFY_TIMEOUT_MS = 12_000;

/**
 * Blocks `/app` until the user has a valid Deriv session.
 * Unauthenticated visitors are sent to the landing page; intended tab is preserved for post-login redirect.
 *
 * While verifying auth, children still mount (behind the loader) so AppRoot can run api_base.init().
 */
const RequireAuth = observer(({ children }: TRequireAuthProps) => {
    const location = useLocation();
    const { isAuthorized, isAuthorizing, activeLoginid } = useApiBase();
    const hasSession = hasStoredSession();
    const storedLoginId = getAccountId();
    const hasValidStoredAccount =
        Boolean(storedLoginId) && storedLoginId !== 'oauth_session' && hasSession;
    const isOAuthPending = sessionStorage.getItem('oauth_pending') === 'true';
    const oauthJustCompleted = sessionStorage.getItem('oauth_just_completed');
    const isRecentOAuth =
        oauthJustCompleted !== null && Date.now() - Number(oauthJustCompleted) < 30_000;
    const [sessionTimedOut, setSessionTimedOut] = React.useState(false);

    React.useEffect(() => {
        if (isAuthorized || !hasSession || isOAuthPending || isRecentOAuth) {
            return;
        }

        const timer = window.setTimeout(() => {
            if (!isAuthorized) {
                clearStaleSessionIfUnauthorized();
                setSessionTimedOut(true);
            }
        }, SESSION_VERIFY_TIMEOUT_MS);

        return () => window.clearTimeout(timer);
    }, [hasSession, isAuthorized, isOAuthPending, isRecentOAuth]);

    React.useEffect(() => {
        if (isAuthorized) {
            setSessionTimedOut(false);
        }
    }, [isAuthorized]);

    const isAuthenticated = isAuthorized || Boolean(activeLoginid) || hasValidStoredAccount;

    if (!hasSession && !isOAuthPending && !isRecentOAuth) {
        const hash = location.hash || '#dashboard';
        sessionStorage.setItem('post_login_redirect', `/app${hash}`);
        return <Navigate to='/' replace />;
    }

    if (sessionTimedOut && !isAuthenticated) {
        const hash = location.hash || '#dashboard';
        sessionStorage.setItem('post_login_redirect', `/app${hash}`);
        return <Navigate to='/' replace />;
    }

    const shouldShowAuthLoader =
        !isAuthorized &&
        (isAuthorizing || isOAuthPending || isRecentOAuth) &&
        (hasSession || isOAuthPending || isRecentOAuth);

    if (!isAuthenticated && !shouldShowAuthLoader) {
        if (hasSession) {
            clearStaleSessionIfUnauthorized();
        }

        const hash = location.hash || '#dashboard';
        sessionStorage.setItem('post_login_redirect', `/app${hash}`);

        return <Navigate to='/' replace />;
    }

    if (isAuthenticated) {
        sessionStorage.removeItem('oauth_just_completed');
    }

    return (
        <>
            {shouldShowAuthLoader && (
                <NetworkBootLoader
                    message={localize('Please wait while we connect to the server...')}
                    hint={localize('Verifying your session…')}
                />
            )}
            {children}
        </>
    );
});

export default RequireAuth;
