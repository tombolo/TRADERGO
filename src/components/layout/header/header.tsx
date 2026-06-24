import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { getAccountId } from '@/utils/account-helpers';
import { navigateToTransfer } from '@/utils/transfer-utils';
import { StandaloneCircleUserRegularIcon } from '@deriv/quill-icons/Standalone';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper, Tooltip } from '@deriv-com/ui';
import { api_base } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { AppLogo } from '../app-logo';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import { SiteTitle } from './site-title';
import './header.scss';

const AppHeader = observer(() => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid, setIsAuthorizing, authData, isAuthorized, accountList, connectionStatus } = useApiBase();
    const { client } = useStore() ?? {};
    const [authTimeout, setAuthTimeout] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
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

        // Safety net: give up quickly and let normal flow decide.
        const timer = setTimeout(() => {
            sessionStorage.removeItem('oauth_pending');
            setIsOAuthPending(false);
        }, 4_000);
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
    // Keep fallback short to avoid prolonged loading perception.
    useEffect(() => {
        if (isOAuthPending) return;

        const timer = setTimeout(() => {
            // Do not call setIsAuthorizing here: it must stay in sync with api-base / isAuthorizing$.
            // authTimeout alone switches the UI to login; resolvedLoginId still wins when auth completes.
            if (isAuthorizing && !resolvedLoginId) {
                setAuthTimeout(true);
            }
        }, 4_000);

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

    // Poll balance to populate account switcher and header with account balances
    useEffect(() => {
        if (!client || !isAuthorized || connectionStatus !== CONNECTION_STATUS.OPENED) return;

        const pollBalance = () => {
            if (document.visibilityState !== 'visible') return;
            const api = api_base.api;
            if (!api?.balance) return;
            void api
                .balance()
                .then(res => {
                    if (res?.error) return;
                    const payload = res?.balance;
                    if (payload == null) return;

                    // Handle full accounts balance response
                    if (typeof payload === 'object' && payload !== null && 'accounts' in payload) {
                        const incoming = payload as any;
                        const prev = client.all_accounts_balance;
                        const prevAccounts = prev?.accounts ?? {};
                        const nextAccounts = { ...prevAccounts, ...(incoming.accounts ?? {}) };
                        client.setAllAccountsBalance({
                            ...(prev ?? {}),
                            ...incoming,
                            accounts: nextAccounts,
                        });
                        return;
                    }

                    // Handle single account balance update
                    if (
                        typeof payload === 'object' &&
                        payload !== null &&
                        'loginid' in payload &&
                        typeof (payload as any).balance === 'number'
                    ) {
                        const slot = payload as any;
                        const accountsNow = client.all_accounts_balance?.accounts ?? {};
                        const updated = {
                            ...(client.all_accounts_balance ?? {}),
                            loginid: slot.loginid,
                            accounts: {
                                ...accountsNow,
                                [slot.loginid]: {
                                    ...(accountsNow[slot.loginid] ?? {}),
                                    balance: slot.balance,
                                    currency: slot.currency ?? accountsNow[slot.loginid]?.currency,
                                    loginid: slot.loginid,
                                },
                            },
                        };
                        client.setAllAccountsBalance(updated);
                    }
                })
                .catch(() => undefined);
        };

        pollBalance();
        const intervalId = window.setInterval(pollBalance, 5000);
        return () => clearInterval(intervalId);
    }, [client, isAuthorized, connectionStatus]);

    const handleSignup = useCallback(async () => {
        window.location.href = 'https://partner-tracking.deriv.com/click?a=21435&o=1&c=3&link_id=1';
    }, []);

    const handleLogin = useCallback(async () => {
        try {
            setIsLoginLoading(true);
            setIsAuthorizing(true);

            // Clear any previous ELITE OAuth flags to prevent misidentification
            sessionStorage.removeItem('elite_oauth_flow_in_progress');
            localStorage.removeItem('elite_oauth_flow_in_progress');
            sessionStorage.removeItem('elite_temp_token');
            localStorage.removeItem('elite_temp_token');

            sessionStorage.setItem('oauth_pending', 'true');
            console.log('[AuthTrace] login_click', { flow: 'UNIFIED' });

            // Generate CSRF token (state parameter) - 32 random bytes as base64url
            const csrfArray = new Uint8Array(32);
            crypto.getRandomValues(csrfArray);
            const csrfToken = btoa(String.fromCharCode(...csrfArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            sessionStorage.setItem('oauth_csrf_token', csrfToken);
            sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());

            // Generate PKCE code verifier - 32 random bytes as base64url
            const verifierArray = new Uint8Array(32);
            crypto.getRandomValues(verifierArray);
            const codeVerifier = btoa(String.fromCharCode(...verifierArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            sessionStorage.setItem('oauth_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());

            // Generate PKCE code challenge - SHA-256 hash of verifie
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const codeChallenge = btoa(String.fromCharCode(...hashArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // Build exact OAuth URL
            const clientId = '338ua9bwF5Y4uHPT4xyDs'; // ZOOM clien
            const appId = '134081';
            const redirectUri = 'https://www.derivanalysinghub.com/callback';
            const scope = 'trade';

            const oauthUrl = `https://auth.deriv.com/oauth2/auth?scope=${scope}&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfToken}&code_challenge=${codeChallenge}&code_challenge_method=S256&app_id=${appId}`;

            console.log('[AuthTrace] Generated OAuth URL:', {
                url: oauthUrl,
                client_id: clientId,
                app_id: appId,
                redirect_uri: redirectUri,
                state: csrfToken,
                code_challenge: codeChallenge,
            });

            window.location.replace(oauthUrl);
        } catch (error) {
            console.error('Login redirection failed:', error);
            sessionStorage.removeItem('oauth_pending');
            setIsLoginLoading(false);
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

    const { localize } = useTranslations();

    const renderAccountSection = useCallback(() => {
        // Show account switcher and logout when user is fully authenticated
        if (resolvedLoginId && !is_account_regenerating) {
            return (
                <>
                    {isDesktop && (
                        <Button
                            primary
                            className='manage-funds-button'
                            text={localize('Manage funds')}
                            onClick={handleTransfer}
                            disabled={client?.is_logging_out || !authData?.currency}
                        />
                    )}

                    <AccountSwitcher activeAccount={activeAccount} />

                    {isDesktop && (
                        <Tooltip
                            as='a'
                            href='#'
                            tooltipContent={localize('Manage account settings')}
                            tooltipPosition='bottom'
                            className='app-header__account-settings'
                        >
                            <StandaloneCircleUserRegularIcon className='app-header__profile_icon' />
                        </Tooltip>
                    )}
                </>
            );
        }
        // Show login/signup buttons only when fully settled (not during OAuth flow)
        if (
            !isOAuthPending &&
            ((!is_account_regenerating && (!isAuthorizing || isLoginLoading) && !resolvedLoginId) || authTimeout)
        ) {
            return (
                <div className='auth-actions'>
                    <Button tertiary onClick={handleLogin} disabled={isLoginLoading}>
                        {isLoginLoading ? (
                            <span className='signin-text'>
                                <Localize i18n_default_text='Signing in...' />
                            </span>
                        ) : (
                            <Localize i18n_default_text='Log in' />
                        )}
                    </Button>
                    <Button primary onClick={handleSignup} disabled={isLoginLoading}>
                        <Localize i18n_default_text='Sign up' />
                    </Button>
                </div>
            );
        }

        // Default: Show spinner during loading states or when authorizing
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
    }, [
        isAuthorizing,
        isDesktop,
        resolvedLoginId,
        client,
        activeAccount,
        authTimeout,
        handleLogin,
        handleSignup,
        handleTransfer,
        is_account_regenerating,
        isOAuthPending,
        authData,
        isLoginLoading,
        localize,
    ]);

    if (client?.should_hide_header) return null;

    return (
        <Header
            className={clsx('app-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <Wrapper variant='left'>
                <div className='app-header__brand'>
                    <AppLogo />
                    {isDesktop && <SiteTitle />}
                </div>
                <MobileMenu onLogout={handleLogout} />
                {isDesktop && <MenuItems />}
            </Wrapper>
            <Wrapper variant='right'>{renderAccountSection()}</Wrapper>
        </Header>
    );
});

export default AppHeader;
