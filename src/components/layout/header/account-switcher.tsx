import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};

    const is_bot_running = run_panel?.is_running || api_base.is_running;

    // FIX 1: Memoize resolvedActiveLoginid so it doesn't read stale localStorage on every render
    const resolvedActiveLoginid = useMemo(
        () => activeLoginid || localStorage.getItem('active_loginid') || '',
        [activeLoginid]
    );

    const fallbackAccountList = useMemo(() => {
        if (accountList?.length) return accountList;
        if (client?.account_list?.length) return client.account_list;

        const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
        const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}') as Record<
            string,
            { currency?: string; is_virtual?: number; balance?: number | string }
        >;

        const loginids = Object.keys(accountsList);
        if (loginids.length) {
            return loginids.map(loginid => {
                const acc = clientAccounts[loginid] || {};
                return {
                    loginid,
                    currency: acc.currency || 'USD',
                    balance: Number(acc.balance ?? 0),
                    is_virtual: Number(acc.is_virtual ?? (isDemoAccount(loginid) ? 1 : 0)),
                };
            });
        }

        return Object.entries(clientAccounts).map(([loginid, acc]) => ({
            loginid,
            currency: acc.currency || 'USD',
            balance: Number(acc.balance ?? 0),
            is_virtual: Number(acc.is_virtual ?? (isDemoAccount(loginid) ? 1 : 0)),
        }));
    }, [accountList, client?.account_list]);

    // FIX 2: Only truly single when we have exactly 1 account — not 0 (loading state)
    const isSingleAccount = fallbackAccountList.length === 1;
    // FIX 3: Separate canSwitch so bot-running also disables the toggle
    const canSwitch = !isSingleAccount && !is_bot_running;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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

    // FIX 4: toggleDropdown now also checks is_bot_running
    const toggleDropdown = useCallback(() => {
        if (!canSwitch) return;
        setIsOpen(prev => !prev);
    }, [canSwitch]);

    // FIX 5: handleAccountSelect now properly switches the account via the store
    const handleAccountSelect = useCallback(
        (loginid: string) => {
            if (loginid === resolvedActiveLoginid) return;
            localStorage.setItem('active_loginid', loginid);
            // Prefer store switchAccount if available, fall back to WebSocket regeneration
            if (client?.switchAccount) {
                client.switchAccount(loginid);
            } else {
                client?.checkAndRegenerateWebSocket?.();
            }
            setIsOpen(false);
        },
        [client, resolvedActiveLoginid]
    );

    const formattedAccounts = useMemo(() => {
        if (!fallbackAccountList?.length) return [];
        return fallbackAccountList
            .map(account => ({
                loginid: account.loginid,
                currency: account.currency,
                balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))),
                isVirtual: isDemoAccount(account.loginid),
                isActive: account.loginid === resolvedActiveLoginid,
            }))
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [fallbackAccountList, resolvedActiveLoginid]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance } = activeAccount;

    // FIX 6: Compute disabledReason correctly — bot running takes priority over single account
    const disabledReason = is_bot_running
        ? 'Stop the bot to switch accounts'
        : isSingleAccount
          ? 'Only one account is available'
          : '';

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    // FIX 7: role/tabIndex/aria only when actually interactive (canSwitch, not just !isSingleAccount)
                    role={canSwitch ? 'button' : undefined}
                    tabIndex={canSwitch ? 0 : -1}
                    aria-expanded={canSwitch ? isOpen : undefined}
                    aria-haspopup={canSwitch ? 'listbox' : undefined}
                    className={classNames('acc-info acc-info--compact', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': canSwitch,
                        'acc-info--switch-disabled': !canSwitch,
                    })}
                    title={disabledReason}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (canSwitch && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true' />
                    <div className='acc-info__content acc-info__content--compact'>
                        <span className='acc-info__sr-only'>
                            {isVirtual ? (
                                <Localize i18n_default_text='Demo account' />
                            ) : (
                                <Localize i18n_default_text='Real account' />
                            )}
                        </span>
                        <div className='acc-info__strip'>
                            <span
                                className={classNames('acc-info__flag', {
                                    'acc-info__flag--usa': !isVirtual,
                                    'acc-info__flag--demo': isVirtual,
                                })}
                                aria-hidden='true'
                            />
                            <span
                                className={classNames('acc-info__mode-badge', {
                                    'acc-info__mode-badge--virtual': isVirtual,
                                })}
                            >
                                {isVirtual ? (
                                    <Localize i18n_default_text='Demo' />
                                ) : (
                                    <Localize i18n_default_text='Live' />
                                )}
                            </span>
                            <span className='acc-info__strip-divider' />
                            {(typeof balance !== 'undefined' || !currency) && (
                                <div className='acc-info__figures'>
                                    {!currency ? (
                                        <p
                                            data-testid='dt_balance'
                                            className='acc-info__balance acc-info__balance--no-currency'
                                        >
                                            <Localize i18n_default_text='No currency assigned' />
                                        </p>
                                    ) : (
                                        <>
                                            <span data-testid='dt_balance' className='acc-info__balance-num'>
                                                {balance}
                                            </span>
                                            <span className='acc-info__balance-ccy'>
                                                {getCurrencyDisplayCode(currency)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                            {/* FIX 8: Only render chevron when there are multiple accounts */}
                            {!isSingleAccount && (
                                <span
                                    className={classNames('acc-info__select-arrow', {
                                        'acc-info__select-arrow--invert': isOpen,
                                        'acc-info__select-arrow--disabled': !canSwitch,
                                    })}
                                >
                                    <svg width='11' height='11' viewBox='0 0 12 12' fill='none'>
                                        <path
                                            d='M2 4L6 8L10 4'
                                            stroke='currentColor'
                                            strokeWidth='1.5'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                    </svg>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </AccountInfoWrapper>

            {/* FIX 9: Guard dropdown render — don't show if bot running or single account */}
            {isOpen && canSwitch && (
                <div className='acc-dropdown' role='listbox'>
                    {formattedAccounts.map(account => (
                        <div
                            key={account.loginid}
                            role='option'
                            aria-selected={account.isActive}
                            tabIndex={account.isActive ? -1 : 0}
                            className={classNames('acc-dropdown__account', {
                                'acc-dropdown__account--selected': account.isActive,
                                'acc-dropdown__account--virtual': account.isVirtual,
                            })}
                            onClick={() => {
                                if (!account.isActive) handleAccountSelect(account.loginid);
                            }}
                            onKeyDown={e => {
                                if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleAccountSelect(account.loginid);
                                }
                            }}
                        >
                            <Text
                                size='xxxs'
                                className={classNames('acc-dropdown__account-type', {
                                    'acc-dropdown__account-type--virtual': account.isVirtual,
                                })}
                            >
                                {account.isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            <Text size='xs' weight='bold' className='acc-dropdown__balance'>
                                {account.currency ? (
                                    `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                ) : (
                                    <Localize i18n_default_text='No currency assigned' />
                                )}
                            </Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;