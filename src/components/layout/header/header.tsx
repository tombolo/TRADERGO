import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { generateOAuthURL } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { getAccountId } from '@/utils/account-helpers';
import { navigateToTransfer } from '@/utils/transfer-utils';
import { Localize } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import './header.scss';

const AppHeader = observer(() => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid, setIsAuthorizing, authData, isAuthorized, accountList } = useApiBase();
    const { client } = useStore() ?? {};
    const [authTimeout, setAuthTimeout] = useState(false);
    const is_account_regenerating = client?.is_account_regenerating || false;

    // Detect OAuth callback on mount (before App.tsx cleans up the URL).
    // When ?code=...&state=... is present the full auth flow can take 7-15 s
    // (token exchange → accounts fetch → OTP → WebSocket auth), so we must
    // suppress the short fallback timeout and keep the spinner throughout.
    // Also check sessionStorage since cleanupURL() may redirect and reset URL params.
    const [isOAuthPending, setIsOAuthPending] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = Boolean(params.get('code') && params.get('state'));
        const fromStorage = sessionStorage.getItem('oauth_pending') === 'true';
        return fromUrl || fromStorage;
    });

    const { data: activeAccount } = useActiveAccount({
        allBalanceData: client?.all_accounts_balance,
        directBalance: client?.balance,
    });

    const handleLogout = useLogout();

    /** Prefer API stream ids; after OAuth, localStorage / account list can lead React state briefly. */
    const resolvedLoginId = useMemo(() => {
        const fromStream = `${activeLoginid || authData?.loginid || ''}`.trim();
        if (fromStream) return fromStream;
        if (!isAuthorized) return '';
        const stored = `${getAccountId() || ''}`.trim();
        if (stored) return stored;
        return `${accountList?.[0]?.loginid || ''}`.trim();
    }, [activeLoginid, authData?.loginid, isAuthorized, accountList]);

    // Clear OAuth-pending flag once the account is set (auth succeeded)
    // or after a generous timeout in case something goes wrong.
    useEffect(() => {
        if (!isOAuthPending) return;

        if (resolvedLoginId) {
            sessionStorage.removeItem('oauth_pending');
            setIsOAuthPending(false);
            return;
        }

        // Safety net: give up after 30 s and let the normal flow decide
        const timer = setTimeout(() => {
            sessionStorage.removeItem('oauth_pending');
            setIsOAuthPending(false);
        }, 30_000);
        return () => clearTimeout(timer);
    }, [isOAuthPending, resolvedLoginId]);

    // Handle direct URL access with legacy token param
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        if (account_id) {
            setIsAuthorizing(true);
        }
    }, [setIsAuthorizing]);

    // Fallback timeout: show login button if auth never resolves.
    // Suppressed during the OAuth callback flow (isOAuthPending = true).
    // Use 20s instead of 5s to allow for slower OAuth flows (7-15s) without flashing login buttons.
    useEffect(() => {
        if (isOAuthPending) return;

        const timer = setTimeout(() => {
            // Do not call setIsAuthorizing here: it must stay in sync with api-base / isAuthorizing$.
            // authTimeout alone switches the UI to login; resolvedLoginId still wins when auth completes.
            if (isAuthorizing && !resolvedLoginId) {
                setAuthTimeout(true);
            }
        }, 20_000);

        if (resolvedLoginId || !isAuthorizing) {
            if (authTimeout) setAuthTimeout(false);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [isAuthorizing, resolvedLoginId, authTimeout, isOAuthPending]);

    useEffect(() => {
        if (resolvedLoginId && authTimeout) {
            setAuthTimeout(false);
        }
    }, [resolvedLoginId, authTimeout]);

    const handleSignup = useCallback(async () => {
        try {
            setIsAuthorizing(true);
            sessionStorage.setItem('oauth_pending', 'true');
            const oauthUrl = await generateOAuthURL('registration');
            if (oauthUrl) {
                window.location.replace(oauthUrl);
            } else {
                console.error('Failed to generate OAuth URL for signup');
                sessionStorage.removeItem('oauth_pending');
                setIsAuthorizing(false);
            }
        } catch (error) {
            console.error('Signup redirection failed:', error);
            sessionStorage.removeItem('oauth_pending');
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const handleLogin = useCallback(async () => {
        try {
            // Set authorizing state immediately when login is clicked
            setIsAuthorizing(true);
            sessionStorage.setItem('oauth_pending', 'true');

            // Generate OAuth URL with CSRF token and PKCE parameters
            const oauthUrl = await generateOAuthURL();

            if (oauthUrl) {
                // Redirect to OAuth URL
                window.location.replace(oauthUrl);
            } else {
                console.error('Failed to generate OAuth URL');
                sessionStorage.removeItem('oauth_pending');
                setIsAuthorizing(false);
            }
        } catch (error) {
            console.error('Login redirection failed:', error);
            // Reset authorizing state if redirection fails
            sessionStorage.removeItem('oauth_pending');
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const handleTransfer = useCallback(() => {
        const transferCurrency = authData?.currency;
        if (!transferCurrency) {
            console.error('No currency available for transfer');
            return;
        }
        navigateToTransfer(transferCurrency);
    }, [authData?.currency]);

    const renderAccountSection = useCallback(
        (position: 'left' | 'right' = 'right') => {
            // Show account switcher and logout when user is fully authenticated
            if (resolvedLoginId && !is_account_regenerating) {
                if (position === 'left' && !isDesktop) {
                    // Keep mobile left section clean (menu + logo only).
                    return null;
                } else if (position === 'right') {
                    // For right section - transfer button (and account switcher on desktop)
                    return (
                        <div className={clsx('auth-actions', { 'auth-actions--mobile-balance': !isDesktop })}>
                            {isDesktop && (
                                <Button
                                    primary
                                    className='auth-actions__btn auth-actions__btn--transfer'
                                    disabled={client?.is_logging_out || !authData?.currency}
                                    onClick={handleTransfer}
                                >
                                    <Localize i18n_default_text='Transfer' />
                                </Button>
                            )}
                            {isDesktop ? (
                                <div className='account-info'>
                                    <AccountSwitcher activeAccount={activeAccount} />
                                </div>
                            ) : (
                                <div className='account-info account-info--mobile-corner'>
                                    <AccountSwitcher activeAccount={activeAccount} />
                                </div>
                            )}
                        </div>
                    );
                }
            }
            // Show login button only when fully settled (not during OAuth flow)
            else if (
                position === 'right' &&
                !isOAuthPending &&
                ((!is_account_regenerating && !isAuthorizing && !resolvedLoginId) || authTimeout)
            ) {
                return (
                    <div className='auth-actions'>
                        <Button className='auth-actions__btn auth-actions__btn--login' onClick={handleLogin}>
                            <Localize i18n_default_text='Log in' />
                        </Button>
                        <Button className='auth-actions__btn auth-actions__btn--signup' onClick={handleSignup}>
                            <Localize i18n_default_text='Sign up' />
                        </Button>
                    </div>
                );
            }
            // Default: Show spinner during loading states or when authorizing
            else if (position === 'right') {
                return (
                    <div className='auth-actions auth-actions--loading'>
                        <svg
                            className='auth-actions__spinner'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                        >
                            <circle
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='2.5'
                                strokeLinecap='round'
                                strokeDasharray='31.416'
                                strokeDashoffset='10'
                            />
                        </svg>
                    </div>
                );
            }

            return null;
        },
        [
            isAuthorizing,
            isDesktop,
            resolvedLoginId,
            client,
            activeAccount,
            authTimeout,
            is_account_regenerating,
            isOAuthPending,
            authData,
            handleLogin,
            handleSignup,
            handleTransfer,
        ]
    );

    if (client?.should_hide_header) return null;

    return (
        <>
            <Header
                className={clsx('app-header', {
                    'app-header--desktop': isDesktop,
                    'app-header--mobile': !isDesktop,
                })}
            >
                <Wrapper variant='left'>
                    <MobileMenu onLogout={handleLogout} />
                    <AppLogo />
                    {isDesktop ? <MenuItems /> : renderAccountSection('left')}
                </Wrapper>
                <Wrapper variant='right'>{renderAccountSection('right')}</Wrapper>
            </Header>
        </>
    );
});

export default AppHeader;
