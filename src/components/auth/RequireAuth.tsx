import React from 'react';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import { useApiBase } from '@/hooks/useApiBase';
import { clearStaleSessionIfUnauthorized, hasStoredSession } from '@/utils/auth-utils';
import { localize } from '@deriv-com/translations';

type TRequireAuthProps = {
    children: React.ReactNode;
};

const SESSION_VERIFY_TIMEOUT_MS = 12_000;

/**
 * Blocks `/app` until the user has a valid Deriv session.
 * Unauthenticated visitors are sent to the landing page; intended tab is preserved for post-login redirect.
 */
const RequireAuth = observer(({ children }: TRequireAuthProps) => {
    const location = useLocation();
    const { isAuthorized, isAuthorizing, activeLoginid } = useApiBase();
    const hasSession = hasStoredSession();
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

    const isAuthenticated = isAuthorized || Boolean(activeLoginid);

    if (sessionTimedOut && !isAuthenticated) {
        const hash = location.hash || '#dashboard';
        sessionStorage.setItem('post_login_redirect', `/app${hash}`);
        return <Navigate to='/' replace />;
    }

    if (!isAuthenticated) {
        const shouldWaitForAuth =
            (isAuthorizing || isOAuthPending || isRecentOAuth) && (hasSession || isOAuthPending || isRecentOAuth);

        if (shouldWaitForAuth) {
            return (
                <NetworkBootLoader
                    message={localize('Please wait while we connect to the server...')}
                    hint={localize('Verifying your session…')}
                />
            );
        }

        if (hasSession) {
            clearStaleSessionIfUnauthorized();
        }

        const hash = location.hash || '#dashboard';
        sessionStorage.setItem('post_login_redirect', `/app${hash}`);

        return <Navigate to='/' replace />;
    }

    sessionStorage.removeItem('oauth_just_completed');

    return <>{children}</>;
});

export default RequireAuth;
