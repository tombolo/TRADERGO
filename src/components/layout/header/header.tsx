import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDerivAuthActions } from '@/hooks/useDerivAuthActions';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { getAccountId } from '@/utils/account-helpers';
import { clearStaleSessionIfUnauthorized, hasStoredSession } from '@/utils/auth-utils';
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
    const { handleLogin, handleSignup, isLoginLoading } = useDerivAuthActions();
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
        const oauthJustCompleted = sessionStorage.getItem('oauth_just_completed');
        const fromRecentOAuth =
            oauthJustCompleted !== null && Date.now() - Number(oauthJustCompleted) < 30_000;
        return fromUrl || fromStorage || fromRecentOAuth;
    });

    const { data: activeAccount } = useActiveAccount({
        allBalanceData: client?.all_accounts_balance,
        directBalance: client?.balance,
    });

    const handleLogout = useLogout();

    const hasSession = hasStoredSession();

    /** Prefer live API auth; fall back to stored session while authorize completes. */
    const resolvedLoginId = useMemo(() => {
        const fromStream = `${activeLoginid || authData?.loginid || ''}`.trim();
        if (fromStream) return fromStream;

        const stored = `${getAccountId() || ''}`.trim();
        if (stored && stored !== 'oauth_session' && hasSession) {
            return stored;
        }

        if (isAuthorized) {
            return `${accountList?.[0]?.loginid || ''}`.trim();
        }

        return '';
    }, [activeLoginid, authData?.loginid, isAuthorized, accountList, hasSession]);

    // Clear OAuth-pending flag only after WebSocket authorize succeeds.
    useEffect(() => {
        if (!isOAuthPending || !isAuthorized) return;

        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_just_completed');
        setIsOAuthPending(false);
    }, [isOAuthPending, isAuthorized]);

    // Handle direct URL access with legacy token param
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        if (account_id) {
            setIsAuthorizing(true);
        }
    }, [setIsAuthorizing]);

    // Fallback timeout: show login when auth never resolves or stored tokens are invalid.
    useEffect(() => {
        if (isOAuthPending) return;

        const timer = setTimeout(() => {
            if (isAuthorized) return;

            if (is_account_regenerating || isAuthorizing) return;

            if (hasStoredSession() && !isAuthorizing) {
                clearStaleSessionIfUnauthorized();
                setAuthTimeout(true);
                return;
            }

            if (isAuthorizing && !resolvedLoginId) {
                setAuthTimeout(true);
            }
        }, isOAuthPending ? 8_000 : 6_000);

        if (isAuthorized || (resolvedLoginId && isAuthorized)) {
            if (authTimeout) setAuthTimeout(false);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [isAuthorizing, resolvedLoginId, authTimeout, isOAuthPending, isAuthorized, is_account_regenerating]);

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
        const showAccountChrome =
            Boolean(resolvedLoginId) &&
            (isAuthorized || is_account_regenerating || hasSession || isOAuthPending || isAuthorizing);

        if (showAccountChrome) {
            if (!activeAccount && (hasSession || isAuthorizing || isOAuthPending)) {
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

            return (
                <>
                    {isDesktop && !is_account_regenerating && isAuthorized && (
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

        if (
            !hasSession &&
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
        isAuthorized,
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
        hasSession,
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
