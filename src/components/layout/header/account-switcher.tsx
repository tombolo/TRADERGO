import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import { CurrencyIcon } from '@/components/currency/currency-icon';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { useLogout } from '@/hooks/useLogout';
import { isDemoAccount, isEliteSpecialCaseLoginId, isSpecialCaseLoginId } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const ChevronDown = ({ className }: { className?: string }) => (
    <svg className={className} width='12' height='12' viewBox='0 0 12 12' fill='none' aria-hidden='true'>
        <path
            d='M2 4L6 8L10 4'
            stroke='currentColor'
            strokeWidth='2.25'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
);

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const { isDesktop } = useDevice();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'real' | 'demo'>('real');
    const [isAccountsSectionOpen, setIsAccountsSectionOpen] = useState(true);
    const [resettingAccountId, setResettingAccountId] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, minWidth: 320 });
    const { accountList, activeLoginid, authorize } = useApiBase();
    const { client } = useStore() ?? {};
    const handleLogout = useLogout();
    const debugPrefix = '[AccountSwitcher]';

    const fallbackAccountList = useMemo(() => {
        const by_loginid = new Map<
            string,
            { loginid: string; currency: string; balance: number; is_virtual: number }
        >();

        const addAccount = (
            loginid?: string,
            currency?: string,
            balance?: number | string,
            is_virtual?: number | boolean
        ) => {
            if (!loginid) return;
            by_loginid.set(loginid, {
                loginid,
                currency: currency || by_loginid.get(loginid)?.currency || 'USD',
                balance: Number(balance ?? by_loginid.get(loginid)?.balance ?? 0),
                is_virtual: Number(
                    typeof is_virtual !== 'undefined'
                        ? is_virtual
                        : (by_loginid.get(loginid)?.is_virtual ?? (isDemoAccount(loginid) ? 1 : 0))
                ),
            });
        };

        accountList?.forEach(acc => addAccount(acc.loginid, acc.currency, acc.balance, acc.is_virtual));
        client?.account_list?.forEach(acc => addAccount(acc.loginid, acc.currency, acc.balance, acc.is_virtual));
        DerivWSAccountsService.getStoredAccounts()?.forEach(acc =>
            addAccount(acc.account_id, acc.currency, acc.balance, acc.account_type === 'demo')
        );
        const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
        const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}') as Record<
            string,
            { currency?: string; is_virtual?: number; balance?: number | string }
        >;
        Object.keys(accountsList).forEach(loginid => {
            const acc = clientAccounts[loginid] || {};
            addAccount(loginid, acc.currency, acc.balance, acc.is_virtual);
        });
        Object.entries(clientAccounts).forEach(([loginid, acc]) =>
            addAccount(loginid, acc.currency, acc.balance, acc.is_virtual)
        );

        const mergedAccounts = Array.from(by_loginid.values());
        console.log(`${debugPrefix} merged account sources`, {
            reactiveAccountList: accountList,
            clientAccountList: client?.account_list,
            storedAccounts: DerivWSAccountsService.getStoredAccounts(),
            localStorageAccountsList: accountsList,
            localStorageClientAccounts: clientAccounts,
            mergedAccounts,
        });

        return mergedAccounts;
    }, [accountList, client?.account_list]);

    const resolvedActiveLoginid = activeLoginid || localStorage.getItem('active_loginid') || '';
    const hasAccounts = fallbackAccountList.length > 0;

    const realAccounts = useMemo(
        () => fallbackAccountList.filter(acc => !isDemoAccount(acc.loginid)),
        [fallbackAccountList]
    );

    const demoAccounts = useMemo(
        () => fallbackAccountList.filter(acc => isDemoAccount(acc.loginid)),
        [fallbackAccountList]
    );

    const canSwitchAccounts = fallbackAccountList.length > 1;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const clickedInsideTrigger = wrapperRef.current?.contains(target);
            const clickedInsideDropdown = dropdownRef.current?.contains(target);
            if (!clickedInsideTrigger && !clickedInsideDropdown) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const updateDropdownPosition = useCallback(() => {
        if (!wrapperRef.current) return;
        const trigger = wrapperRef.current.getBoundingClientRect();
        // Match CSS: width: min(36rem, calc(100vw - 24px)) where 1rem = 10px
        const dropdownWidth = Math.min(320, window.innerWidth - 24);
        const maxLeft = Math.max(8, window.innerWidth - dropdownWidth - 8);
        setDropdownPosition({
            top: trigger.bottom + 6,
            left: Math.max(8, Math.min(trigger.right - dropdownWidth, maxLeft)),
            minWidth: dropdownWidth,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updateDropdownPosition();
        const onResize = () => updateDropdownPosition();
        const onScroll = () => updateDropdownPosition();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [isOpen, updateDropdownPosition]);

    const handleResetDemoBalance = useCallback(
        async (loginid: string) => {
            try {
                setResettingAccountId(loginid);
                console.log('[AccountSwitcher] Resetting demo balance for:', loginid);

                const currentLoginid = resolvedActiveLoginid;
                const isDotAccount = loginid.startsWith('DOT');

                // Resolve the token for the target demo account regardless of type
                const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
                const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}') as Record<
                    string,
                    { token?: string; currency?: string }
                >;
                const targetToken = accountsList[loginid] || clientAccounts[loginid]?.token;

                // ── DOT (demo wallet) accounts ─────────────────────────────────────────────
                // Use the dedicated REST endpoint:
                // POST /trading/v1/options/accounts/{accountId}/reset-demo-balance
                // No WebSocket re-authorization needed at all.
                if (isDotAccount) {
                    const accessToken =
                        OAuthTokenExchangeService.getAccessToken() ||
                        sessionStorage.getItem('elite_temp_token') ||
                        localStorage.getItem('elite_temp_token');

                    if (!accessToken) {
                        throw new Error(`No OAuth access token available to reset DOT account ${loginid}`);
                    }

                    await DerivWSAccountsService.resetDemoBalance(accessToken, loginid);
                    console.log('[AccountSwitcher] DOT demo balance reset via REST API for:', loginid);
                } else {
                    // ── Non-DOT demo accounts (VRTC, VRW, DEM) ────────────────────────────
                    if (currentLoginid !== loginid) {
                        console.log('[AccountSwitcher] Switching to account:', loginid);
                        if (targetToken) {
                            localStorage.setItem('authToken', targetToken);
                        }
                        localStorage.setItem('active_loginid', loginid);
                        client?.checkAndRegenerateWebSocket?.();
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const resetResponse = await (api_base?.api?.send({ topup_virtual: 1 }) as unknown as Promise<any>);
                    console.log('[AccountSwitcher] Reset API response:', resetResponse);
                    if (resetResponse?.error) {
                        throw resetResponse.error;
                    }

                    if (currentLoginid !== loginid) {
                        console.log('[AccountSwitcher] Switching back to original account:', currentLoginid);
                        localStorage.setItem('active_loginid', currentLoginid);
                        client?.checkAndRegenerateWebSocket?.();
                    }
                }

                // Refresh balance immediately so the UI reflects the reset
                try {
                    const balanceRes = await api_base?.api?.balance?.();
                    if (balanceRes && !balanceRes.error && client) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const payload = balanceRes.balance as any;
                        if (payload?.accounts) {
                            const prev = client.all_accounts_balance;
                            client.setAllAccountsBalance({
                                ...(prev ?? {}),
                                ...payload,
                                accounts: { ...(prev?.accounts ?? {}), ...(payload.accounts ?? {}) },
                            });
                        } else if (payload?.loginid && typeof payload.balance === 'number') {
                            const accountsNow = client.all_accounts_balance?.accounts ?? {};
                            client.setAllAccountsBalance({
                                ...(client.all_accounts_balance ?? {}),
                                loginid: payload.loginid,
                                accounts: {
                                    ...accountsNow,
                                    [payload.loginid]: {
                                        ...(accountsNow[payload.loginid] ?? {}),
                                        balance: payload.balance,
                                        currency: payload.currency ?? accountsNow[payload.loginid]?.currency,
                                        loginid: payload.loginid,
                                    },
                                },
                            });
                        }
                    }
                } catch (balErr) {
                    console.warn('[AccountSwitcher] Could not refresh balance after reset:', balErr);
                }

                setTimeout(() => {
                    setResettingAccountId(null);
                    console.log('[AccountSwitcher] Reset complete');
                }, 1000);
            } catch (error) {
                console.error('[AccountSwitcher] Failed to reset demo balance:', error);
                setResettingAccountId(null);
            }
        },
        [client, resolvedActiveLoginid]
    );

    const toggleDropdown = useCallback(() => {
        if (!hasAccounts) return;
        updateDropdownPosition();
        console.log(`${debugPrefix} toggle dropdown`, {
            previousIsOpen: isOpen,
            resolvedActiveLoginid,
            fallbackAccountList,
        });
        setIsOpen(prev => !prev);
    }, [debugPrefix, fallbackAccountList, hasAccounts, isOpen, resolvedActiveLoginid, updateDropdownPosition]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            try {
                const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
                const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}') as Record<
                    string,
                    { token?: string; currency?: string }
                >;

                const token = accountsList[loginid] || clientAccounts[loginid]?.token;
                if (token) {
                    localStorage.setItem('authToken', token);
                    console.log('[AccountSwitcher] Set authToken for account:', { loginid });
                } else {
                    console.warn('[AccountSwitcher] No token found for account:', { loginid });
                }
            } catch (error) {
                console.error('[AccountSwitcher] Error setting auth token:', error);
            }

            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket?.();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useCallback(
        (accounts: typeof fallbackAccountList) => {
            if (!accounts.length) return [];
            const mappedAccounts = accounts
                .map(account => {
                    const dotLoginid = demoAccounts.find(acc => acc.loginid?.startsWith('DOT'))?.loginid;
                    const vrtcLoginid = demoAccounts.find(acc => acc.loginid?.startsWith('VRTC'))?.loginid;
                    const is_special = isSpecialCaseLoginId(account.loginid);
                    const is_elite_special = isEliteSpecialCaseLoginId(account.loginid);
                    const mapped_balance_loginid =
                        is_special && dotLoginid
                            ? dotLoginid
                            : is_elite_special && vrtcLoginid
                              ? vrtcLoginid
                              : account.loginid;
                    const demo_account_row =
                        is_special && dotLoginid
                            ? fallbackAccountList.find(item => item.loginid === dotLoginid)
                            : is_elite_special && vrtcLoginid
                              ? fallbackAccountList.find(item => item.loginid === vrtcLoginid)
                              : undefined;
                    if (is_special) {
                        console.log(
                            '%c[SPECIAL_CASE_LOGINID] AccountSwitcher: remapping balance display for ROT account → DOT wallet',
                            'background:#b34700;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                            {
                                account_loginid: account.loginid,
                                mapped_balance_loginid,
                                balance_from_map: client?.all_accounts_balance?.accounts?.[mapped_balance_loginid]?.balance,
                                balance_from_demo_row: demo_account_row?.balance,
                            }
                        );
                    }
                    if (is_elite_special) {
                        console.log(
                            '%c[ELITE_SPECIAL_CASE_LOGINID] AccountSwitcher: remapping balance display for CR account → VRTC demo',
                            'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                            {
                                account_loginid: account.loginid,
                                mapped_balance_loginid,
                                balance_from_map: client?.all_accounts_balance?.accounts?.[mapped_balance_loginid]?.balance,
                                balance_from_demo_row: demo_account_row?.balance,
                            }
                        );
                    }
                    const accountBalance =
                        client?.all_accounts_balance?.accounts?.[mapped_balance_loginid]?.balance ??
                        ((is_special || is_elite_special) ? demo_account_row?.balance : undefined) ??
                        account.balance ??
                        0;

                    return {
                        loginid: account.loginid,
                        currency: account.currency,
                        balance: addComma(Number(accountBalance).toFixed(getDecimalPlaces(account.currency))),
                        isVirtual: Boolean(account.is_virtual),
                        isActive: account.loginid === resolvedActiveLoginid,
                    };
                })
                .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));

            return mappedAccounts;
        },
        [client?.all_accounts_balance?.accounts, demoAccounts, fallbackAccountList, resolvedActiveLoginid]
    );

    useEffect(() => {
        if (!activeAccount) return;
        setActiveTab(activeAccount.isVirtual ? 'demo' : 'real');
    }, [activeAccount?.isVirtual]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance } = activeAccount;
    const displayedAccounts = activeTab === 'demo' ? demoAccounts : realAccounts;
    const formattedDisplayedAccounts = formattedAccounts(displayedAccounts);

    const tradersHubUrl = 'https://deriv.com/traders-hub/';
    const currencyCode = currency ? getCurrencyDisplayCode(currency) : '';

    const renderBalanceText = () => {
        if (!currency) {
            return <Localize i18n_default_text='No currency assigned' />;
        }

        return (
            <>
                <span className='acc-info__balance-amount'>{balance}</span>
                <span className='acc-info__balance-currency'>{currencyCode}</span>
            </>
        );
    };

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role='button'
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-haspopup='listbox'
                    className={classNames('acc-info', 'acc-info--inline', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': hasAccounts,
                        'acc-info--switch-disabled': !hasAccounts,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true'>
                        <span className='acc-info__id-icon'>
                            <CurrencyIcon currency={currency?.toLowerCase()} isVirtual={isVirtual} />
                        </span>
                    </span>
                    {(typeof balance !== 'undefined' || !currency) && (
                        <p
                            data-testid='dt_balance'
                            className={classNames('acc-info__balance', {
                                'acc-info__balance--no-currency': !currency && !isVirtual,
                            })}
                        >
                            {renderBalanceText()}
                        </p>
                    )}
                    <span
                        className={classNames('acc-info__select-arrow', {
                            'acc-info__select-arrow--invert': isOpen,
                            'acc-info__select-arrow--disabled': !canSwitchAccounts,
                        })}
                    >
                        <ChevronDown />
                    </span>
                </div>
            </AccountInfoWrapper>
            {isOpen &&
                hasAccounts &&
                createPortal(
                    <div
                        className='acc-dropdown acc-dropdown--portal'
                        role='listbox'
                        ref={dropdownRef}
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.minWidth}px`,
                            zIndex: 2147483646,
                        }}
                    >
                        {/* Real / Demo tabs */}
                        <div className='acc-dropdown__tabs' role='tablist'>
                            <button
                                type='button'
                                role='tab'
                                aria-selected={activeTab === 'real'}
                                className={classNames('acc-dropdown__tab', {
                                    'acc-dropdown__tab--active': activeTab === 'real',
                                })}
                                onClick={() => setActiveTab('real')}
                            >
                                <Localize i18n_default_text='Real' />
                            </button>
                            <button
                                type='button'
                                role='tab'
                                aria-selected={activeTab === 'demo'}
                                className={classNames('acc-dropdown__tab', {
                                    'acc-dropdown__tab--active': activeTab === 'demo',
                                })}
                                onClick={() => setActiveTab('demo')}
                            >
                                <Localize i18n_default_text='Demo' />
                            </button>
                        </div>

                        <div className='acc-dropdown__section'>
                            <button
                                type='button'
                                className='acc-dropdown__section-header'
                                aria-expanded={isAccountsSectionOpen}
                                onClick={() => setIsAccountsSectionOpen(prev => !prev)}
                            >
                                <span className='acc-dropdown__section-title'>
                                    <Localize i18n_default_text='Deriv accounts' />
                                </span>
                                <span
                                    className={classNames('acc-dropdown__section-chevron', {
                                        'acc-dropdown__section-chevron--open': isAccountsSectionOpen,
                                    })}
                                    aria-hidden='true'
                                >
                                    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                        <path
                                            d='M2 4L6 8L10 4'
                                            stroke='currentColor'
                                            strokeWidth='1.5'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                    </svg>
                                </span>
                            </button>

                            {isAccountsSectionOpen ? (
                                <div className='acc-dropdown__list'>
                                    <div className='acc-dropdown__list-wrapper'>
                                        {formattedDisplayedAccounts.length > 0 ? (
                                            <div className='acc-dropdown__accounts'>
                                                {formattedDisplayedAccounts.map(account => (
                                                    <div
                                                        key={account.loginid}
                                                        className={classNames('acc-dropdown__account-card', {
                                                            'acc-dropdown__account-card--virtual': account.isVirtual,
                                                        })}
                                                    >
                                                        <div
                                                            role='option'
                                                            aria-selected={account.isActive}
                                                            tabIndex={0}
                                                            className={classNames('acc-dropdown__account', {
                                                                'acc-dropdown__account--selected': account.isActive,
                                                                'acc-dropdown__account--virtual': account.isVirtual,
                                                            })}
                                                            onClick={() =>
                                                                !account.isActive && handleAccountSelect(account.loginid)
                                                            }
                                                            onKeyDown={e => {
                                                                if (
                                                                    !account.isActive &&
                                                                    (e.key === 'Enter' || e.key === ' ')
                                                                ) {
                                                                    e.preventDefault();
                                                                    handleAccountSelect(account.loginid);
                                                                }
                                                            }}
                                                        >
                                                            <span className='acc-dropdown__id'>
                                                                <span className='acc-dropdown__id-icon' aria-hidden='true'>
                                                                    <CurrencyIcon
                                                                        currency={account.currency?.toLowerCase()}
                                                                        isVirtual={account.isVirtual}
                                                                    />
                                                                </span>
                                                                <span className='acc-dropdown__id-text'>
                                                                    <span className='acc-dropdown__currency-label'>
                                                                        {account.currency ? (
                                                                            getCurrencyDisplayCode(account.currency)
                                                                        ) : (
                                                                            <Localize i18n_default_text='No currency assigned' />
                                                                        )}
                                                                    </span>
                                                                    <span className='acc-dropdown__loginid'>
                                                                        {account.loginid}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                            <span className='acc-dropdown__balance-wrap'>
                                                                <span className='acc-dropdown__balance'>
                                                                    {account.currency ? (
                                                                        `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                                                    ) : (
                                                                        <Localize i18n_default_text='No currency assigned' />
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </div>
                                                        {isDemoAccount(account.loginid) && (
                                                            <div className='acc-dropdown__reset-row'>
                                                                <Button
                                                                    className='acc-dropdown__reset-btn'
                                                                    secondary
                                                                    small
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        handleResetDemoBalance(account.loginid);
                                                                    }}
                                                                    disabled={resettingAccountId === account.loginid}
                                                                >
                                                                    {resettingAccountId === account.loginid ? (
                                                                        <Localize i18n_default_text='Resetting...' />
                                                                    ) : (
                                                                        <Localize i18n_default_text='Reset Balance' />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='acc-dropdown__empty'>
                                                <Text size='xs' className='acc-dropdown__empty-text'>
                                                    <Localize i18n_default_text='No accounts available' />
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <p className='acc-dropdown__hub-link'>
                            <Localize i18n_default_text='Looking for CFD accounts?' />{' '}
                            <a
                                className='acc-dropdown__hub-link-anchor'
                                href={tradersHubUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={e => e.stopPropagation()}
                            >
                                <Localize i18n_default_text="Go to Trader's Hub" />
                            </a>
                        </p>

                        <div className='acc-dropdown__footer'>
                            <button
                                type='button'
                                className='acc-dropdown__logout'
                                onClick={() => {
                                    setIsOpen(false);
                                    handleLogout();
                                }}
                            >
                                <Localize i18n_default_text='Logout' />
                                <span className='acc-dropdown__logout-icon' aria-hidden='true'>
                                    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                                        <path
                                            d='M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6'
                                            stroke='currentColor'
                                            strokeWidth='1.25'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                        <path
                                            d='M10 11.333 13.333 8 10 4.667'
                                            stroke='currentColor'
                                            strokeWidth='1.25'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                        <path
                                            d='M13.333 8H6'
                                            stroke='currentColor'
                                            strokeWidth='1.25'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
});

export default AccountSwitcher;
