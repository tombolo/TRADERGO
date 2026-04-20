import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import { CurrencyIcon } from '@/components/currency/currency-icon';
import Text from '@/components/shared_ui/text';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { isDemoAccount, isSpecialCaseLoginId } from '@/utils/account-helpers';
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

        // 1) reactive stream accounts
        accountList?.forEach(acc => addAccount(acc.loginid, acc.currency, acc.balance, acc.is_virtual));
        // 2) mobx client cache
        client?.account_list?.forEach(acc => addAccount(acc.loginid, acc.currency, acc.balance, acc.is_virtual));
        // 3) oauth stored accounts in session storage
        DerivWSAccountsService.getStoredAccounts()?.forEach(acc =>
            addAccount(acc.account_id, acc.currency, acc.balance, acc.account_type === 'demo')
        );
        // 4) local storage maps
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
    const canSwitchAccounts = fallbackAccountList.length > 1;
    const demoLoginid = useMemo(
        () => fallbackAccountList.find(acc => isDemoAccount(acc.loginid))?.loginid,
        [fallbackAccountList]
    );

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
        console.log(`${debugPrefix} toggle dropdown`, {
            previousIsOpen: isOpen,
            resolvedActiveLoginid,
            fallbackAccountList,
        });
        setIsOpen(prev => !prev);
    }, [debugPrefix, fallbackAccountList, hasAccounts, isOpen, resolvedActiveLoginid, updateDropdownPosition]);

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
        const mappedAccounts = fallbackAccountList
            .map(account => {
                const mapped_balance_loginid =
                    isSpecialCaseLoginId(account.loginid) && demoLoginid ? demoLoginid : account.loginid;
                const demo_account_row = demoLoginid
                    ? fallbackAccountList.find(item => item.loginid === demoLoginid)
                    : undefined;
                const accountBalance =
                    client?.all_accounts_balance?.accounts?.[mapped_balance_loginid]?.balance ??
                    (isSpecialCaseLoginId(account.loginid) ? demo_account_row?.balance : undefined) ??
                    account.balance ??
                    0;
                if (isSpecialCaseLoginId(account.loginid)) {
                    console.log('[SpecialAccount][AccountSwitcher] Account row balance mapping', {
                        account_loginid: account.loginid,
                        mapped_balance_loginid,
                        demoLoginid,
                        mapped_balance: client?.all_accounts_balance?.accounts?.[mapped_balance_loginid]?.balance,
                        fallback_balance: account.balance,
                        final_balance: accountBalance,
                    });
                }

                return {
                    loginid: account.loginid,
                    currency: account.currency,
                    balance: addComma(Number(accountBalance).toFixed(getDecimalPlaces(account.currency))),
                    isVirtual:
                        typeof account.is_virtual !== 'undefined'
                            ? Boolean(account.is_virtual)
                            : isDemoAccount(account.loginid),
                    isActive: account.loginid === resolvedActiveLoginid,
                    raw_is_virtual: account.is_virtual,
                };
            })
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));

        console.log(`${debugPrefix} formatted dropdown accounts`, {
            resolvedActiveLoginid,
            formattedAccounts: mappedAccounts,
        });

        return mappedAccounts;
    }, [client?.all_accounts_balance?.accounts, demoLoginid, fallbackAccountList, resolvedActiveLoginid]);

    useEffect(() => {
        console.log(`${debugPrefix} state snapshot`, {
            activeLoginidFromStream: activeLoginid,
            activeLoginidFromLocalStorage: localStorage.getItem('active_loginid'),
            resolvedActiveLoginid,
            hasAccounts,
            canSwitchAccounts,
            fallbackCount: fallbackAccountList.length,
            isOpen,
        });
    }, [activeLoginid, canSwitchAccounts, fallbackAccountList.length, hasAccounts, isOpen, resolvedActiveLoginid]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance, loginid } = activeAccount;

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
                    <div className='acc-info__summary'>
                        <span className='acc-info__id-icon' aria-hidden='true'>
                            <CurrencyIcon currency={currency?.toLowerCase()} isVirtual={isVirtual} />
                        </span>
                        <div className='acc-info__identity'>
                            <p className='acc-info__currency-code'>
                                {!currency ? (
                                    <Localize i18n_default_text='No currency assigned' />
                                ) : (
                                    getCurrencyDisplayCode(currency)
                                )}
                            </p>
                            {loginid ? (
                                <p className='acc-info__loginid' data-testid='dt_acc_loginid'>
                                    {loginid.length > 5 ? `${loginid.slice(0, 5)}...` : loginid}
                                </p>
                            ) : null}
                        </div>
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
                                <span className='acc-dropdown__icon' aria-hidden='true'>
                                    <CurrencyIcon
                                        currency={account.currency?.toLowerCase()}
                                        isVirtual={account.isVirtual}
                                    />
                                </span>
                                <div className='acc-dropdown__identity'>
                                    <Text size='xs' weight='bold' className='acc-dropdown__currency-code'>
                                        {account.currency ? (
                                            getCurrencyDisplayCode(account.currency)
                                        ) : (
                                            <Localize i18n_default_text='No currency assigned' />
                                        )}
                                    </Text>
                                    <Text size='xxs' className='acc-dropdown__loginid'>
                                        {account.loginid}
                                    </Text>
                                </div>
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
