import { useCallback, useEffect, useMemo, useRef } from 'react';
import Cookies from 'js-cookie';
import { observer } from 'mobx-react-lite';
import { getDecimalPlaces, toMoment } from '@/components/shared';
import { FORM_ERROR_MESSAGES } from '@/components/shared/constants/form-error-messages';
import { initFormErrorMessages } from '@/components/shared/utils/validation/declarative-validation-rules';
import { api_base } from '@/external/bot-skeleton';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { TSocketResponseData } from '@/types/api-types';
import { clearInvalidTokenParams } from '@/utils/url-utils';
import { getFirstDotLoginid, isSpecialCaseLoginId } from '@/utils/account-helpers';
import type { Balance } from '@deriv/api-types';
import { useTranslations } from '@deriv-com/translations';

type TClientInformation = {
    loginid?: string;
    email?: string;
    currency?: string;
    residence?: string | null;
    first_name?: string;
    last_name?: string;
    preferred_language?: string | null;
    user_id?: number | string;
};
const CoreStoreProvider: React.FC<{ children: React.ReactNode }> = observer(({ children }) => {
    const currentDomain = useMemo(() => '.' + window.location.hostname.split('.').slice(-2).join('.'), []);
    const { isAuthorizing, isAuthorized, connectionStatus, accountList, activeLoginid } = useApiBase();

    const appInitialization = useRef(false);
    const accountInitialization = useRef(false);
    const timeInterval = useRef<NodeJS.Timeout | null>(null);
    const msg_listener = useRef<{ unsubscribe: () => void } | null>(null);
    const { client, common } = useStore() ?? {};

    const { currentLang } = useTranslations();

    const activeAccount = useMemo(
        () => accountList?.find(account => account.loginid === activeLoginid),
        [activeLoginid, accountList]
    );

    // MobX: observer only tracks observables read during render. This provider's JSX
    // is only `{children}`, so without touching balance here the component would not
    // re-render on `all_accounts_balance` updates — and the sync effect below would
    // never re-run after trades. Reading these fields subscribes this observer.
    const balanceAccountsMap = client?.all_accounts_balance?.accounts;
    const balanceStreamLoginid = client?.all_accounts_balance?.loginid;
    void balanceAccountsMap;
    void balanceStreamLoginid;

    useEffect(() => {
        const all_accounts = client?.all_accounts_balance?.accounts;
        const demo_loginid = getFirstDotLoginid(all_accounts);
        const is_special = isSpecialCaseLoginId(activeLoginid);
        const fallback_demo_account = is_special ? accountList?.find(account => account.loginid?.startsWith('DOT')) : undefined;
        const balance_loginid = is_special && demo_loginid ? demo_loginid : activeAccount?.loginid;
        const currentBalanceData = all_accounts?.[balance_loginid ?? ''];
        const fallbackBalance = fallback_demo_account?.balance;
        const fallbackCurrency = fallback_demo_account?.currency;
        if (isSpecialCaseLoginId(activeLoginid)) {
            console.log('[SpecialAccount][CoreStoreProvider] Resolving displayed balance', {
                activeLoginid,
                activeAccountLoginid: activeAccount?.loginid,
                demo_loginid,
                balance_loginid,
                has_all_accounts: Boolean(all_accounts),
                available_account_keys: Object.keys(all_accounts || {}),
                resolved_balance: currentBalanceData?.balance,
                resolved_currency: currentBalanceData?.currency,
                fallback_balance: fallbackBalance,
                fallback_currency: fallbackCurrency,
            });
        }

        if (currentBalanceData) {
            const currency = currentBalanceData.currency;
            client?.setBalance(currentBalanceData.balance.toFixed(getDecimalPlaces(currency || currentBalanceData.currency)));
            client?.setCurrency(currency || currentBalanceData.currency);
        } else if (is_special && typeof fallbackBalance === 'number') {
            const fallback_decimals = getDecimalPlaces(fallbackCurrency || 'USD');
            client?.setBalance(fallbackBalance.toFixed(fallback_decimals));
            client?.setCurrency(fallbackCurrency || 'USD');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeAccount?.loginid,
        activeLoginid,
        accountList,
        client?.all_accounts_balance,
        balanceAccountsMap,
        balanceStreamLoginid,
    ]);

    useEffect(() => {
        if (client && activeAccount && isAuthorized) {
            client?.setLoginId(activeLoginid);
            client?.setAccountList(accountList);
            client?.setIsLoggedIn(true);
        } else if (client && !isAuthorized) {
            // Ensure client shows as not logged in until authorization is complete
            client?.setIsLoggedIn(false);
        }
    }, [accountList, activeAccount, activeLoginid, client, isAuthorized]);

    useEffect(() => {
        initFormErrorMessages(FORM_ERROR_MESSAGES());

        return () => {
            if (timeInterval.current) {
                clearInterval(timeInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        if (common && currentLang) {
            common.setCurrentLanguage(currentLang);
        }
    }, [currentLang, common]);

    // Type-safe interface for API with time() method
    interface ApiWithTime {
        time(): Promise<TSocketResponseData<'time'>>;
    }

    useEffect(() => {
        const updateServerTime = () => {
            // Fixed type safety: replaced 'as any' with proper interface and runtime check
            // Ensures time() method exists before calling it
            if (!api_base.api || !('time' in api_base.api)) return;
            (api_base.api as ApiWithTime)
                .time()
                .then((res: TSocketResponseData<'time'>) => {
                    common.setServerTime(toMoment(res.time), false);
                })
                .catch(() => {
                    common.setServerTime(toMoment(Date.now()), true);
                });
        };

        // Clear any existing interval before setting up a new one
        if (timeInterval.current) {
            clearInterval(timeInterval.current);
            timeInterval.current = null;
        }

        if (client && !appInitialization.current) {
            if (!api_base?.api) return;
            appInitialization.current = true;

            // Initial time update
            updateServerTime();

            // Schedule updates every 10 seconds
            timeInterval.current = setInterval(updateServerTime, 10000);
        }

        // Cleanup on unmount or dependency change
        return () => {
            if (timeInterval.current) {
                clearInterval(timeInterval.current);
                timeInterval.current = null;
            }
        };
    }, [client, common]);

    const handleMessages = useCallback(
        // Changed parameter type from Record<string, unknown> to unknown to match onMessage signature
        async (res: unknown) => {
            if (!res) return;
            const data = (res as Record<string, unknown>).data as TSocketResponseData<'balance'>;
            const { msg_type, error } = data;

            // Handle auth errors by calling client.logout() directly instead of useLogout hook
            // This prevents redundant logout operations since useLogout internally calls client.logout()
            if (
                error?.code === 'AuthorizationRequired' ||
                error?.code === 'DisabledClient' ||
                error?.code === 'InvalidToken'
            ) {
                // Clear all URL query parameters for these auth errors
                clearInvalidTokenParams();
                // Call client store logout directly to avoid double logout
                await client?.logout();
            }

            if (msg_type === 'balance' && data && !error) {
                const balance = data.balance;
                if (!balance) return;

                if (balance?.accounts) {
                    client.setAllAccountsBalance(balance as Balance);
                    if (isSpecialCaseLoginId(localStorage.getItem('active_loginid'))) {
                        const dot_loginid = getFirstDotLoginid(balance.accounts);
                        console.log('[SpecialAccount][CoreStoreProvider] Received account-map balance update', {
                            stream_loginid: balance.loginid,
                            dot_loginid,
                            dot_balance: dot_loginid ? balance.accounts?.[dot_loginid]?.balance : undefined,
                            account_keys: Object.keys(balance.accounts || {}),
                        });
                    }
                } else if (balance?.loginid) {
                    const existing_accounts = client?.all_accounts_balance?.accounts ?? {};
                    const current_logged_in_balance = {
                        ...(existing_accounts?.[balance.loginid] ?? {}),
                        balance: balance.balance,
                        currency: balance.currency ?? existing_accounts?.[balance.loginid]?.currency,
                        loginid: balance.loginid,
                    };

                    const updatedAccounts = {
                        ...(client?.all_accounts_balance ?? {}),
                        loginid: balance.loginid,
                        accounts: {
                            ...existing_accounts,
                            [balance.loginid]: current_logged_in_balance,
                        },
                    };
                    client.setAllAccountsBalance(updatedAccounts as Balance);
                    if (isSpecialCaseLoginId(localStorage.getItem('active_loginid'))) {
                        console.log('[SpecialAccount][CoreStoreProvider] Received single-account balance update', {
                            stream_loginid: balance.loginid,
                            stream_balance: balance.balance,
                            stream_currency: balance.currency,
                            merged_account_keys: Object.keys(updatedAccounts.accounts || {}),
                        });
                    }
                }
            }
        },
        // Fixed memory leak: removed handleLogout from deps as it's not used in function body
        // Only client is actually referenced (line 129), preventing unnecessary re-subscriptions
        [client]
    );

    useEffect(() => {
        if (!isAuthorizing && client) {
            const subscription = api_base?.api?.onMessage().subscribe(handleMessages);
            // Fixed unsubscribe type - only store if subscription exists
            if (subscription) {
                msg_listener.current = { unsubscribe: subscription.unsubscribe };
            }
        }

        return () => {
            if (msg_listener.current) {
                msg_listener.current.unsubscribe?.();
            }
        };
    }, [connectionStatus, handleMessages, isAuthorizing, isAuthorized, client]);

    useEffect(() => {
        if (!isAuthorizing && isAuthorized && !accountInitialization.current && client) {
            accountInitialization.current = true;
            const client_information: TClientInformation = {
                loginid: activeAccount?.loginid,
                email: '',
                currency: client?.currency,
                residence: '',
                first_name: '',
                last_name: '',
                preferred_language: '',
                user_id:
                    (api_base.account_info &&
                    typeof api_base.account_info === 'object' &&
                    'user_id' in api_base.account_info
                        ? (api_base.account_info as { user_id: number }).user_id
                        : null) || activeLoginid,
            };

            Cookies.set('client_information', JSON.stringify(client_information), {
                domain: currentDomain,
            });
        }
    }, [isAuthorizing, isAuthorized, client, activeAccount?.loginid, activeLoginid, currentDomain]);

    return <>{children}</>;
});

export default CoreStoreProvider;
