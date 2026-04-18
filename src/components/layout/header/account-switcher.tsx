import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, minWidth: 320 });
    const { accountList, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const fallbackAccountList = useMemo(() => {
        if (accountList?.length) return accountList;
        if (client?.account_list?.length) return client.account_list;
        const storedAccounts = DerivWSAccountsService.getStoredAccounts();
        if (storedAccounts?.length) {
            return storedAccounts.map(acc => ({
                loginid: acc.account_id,
                currency: acc.currency || 'USD',
                balance: Number(acc.balance ?? 0),
                is_virtual: acc.account_type === 'demo' ? 1 : 0,
            }));
        }

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

    const resolvedActiveLoginid = activeLoginid || localStorage.getItem('active_loginid') || '';
    const hasAccounts = fallbackAccountList.length > 0;
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
        const minWidth = Math.max(280, trigger.width + 140);
        const maxLeft = Math.max(8, window.innerWidth - minWidth - 8);
        setDropdownPosition({
            top: trigger.bottom + 6,
            left: Math.max(8, Math.min(trigger.right - minWidth, maxLeft)),
            minWidth,
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

    const toggleDropdown = useCallback(() => {
        if (!hasAccounts) return;
        updateDropdownPosition();
        setIsOpen(prev => !prev);
    }, [hasAccounts, updateDropdownPosition]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket?.();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!fallbackAccountList.length) return [];
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
    const showChevron = true;

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
                    className={classNames('acc-info', {
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
                    <span className='acc-info__id' aria-hidden='true'></span>
                    <div className='acc-info__content'>
                        <div className='acc-info__account-type-header'>
                            <Text as='p' size='xs' className='acc-info__account-type'>
                                {isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            <span
                                className={classNames('acc-info__select-arrow', {
                                    'acc-info__select-arrow--invert': isOpen,
                                    'acc-info__select-arrow--disabled': !canSwitchAccounts,
                                })}
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
                        </div>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                <p
                                    data-testid='dt_balance'
                                    className={classNames('acc-info__balance', {
                                        'acc-info__balance--no-currency': !currency && !isVirtual,
                                    })}
                                >
                                    {!currency ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        `${balance} ${getCurrencyDisplayCode(currency)}`
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
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
                            minWidth: `${dropdownPosition.minWidth}px`,
                            zIndex: 2147483646,
                        }}
                    >
                        {formattedAccounts.map(account => (
                            <div
                                key={account.loginid}
                                role='option'
                                aria-selected={account.isActive}
                                tabIndex={0}
                                className={classNames('acc-dropdown__account', {
                                    'acc-dropdown__account--selected': account.isActive,
                                    'acc-dropdown__account--virtual': account.isVirtual,
                                })}
                                onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
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
                    </div>,
                    document.body
                )}
        </div>
    );
});

export default AccountSwitcher;