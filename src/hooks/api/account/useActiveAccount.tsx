import { useMemo } from 'react';
/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, getFirstDotLoginid, getFirstVrtcLoginid, isEliteSpecialCaseLoginId, isSpecialCaseLoginId, isVirtualAccount } from '@/utils/account-helpers';
/* [/AI] */
import { CurrencyIcon } from '@/components/currency/currency-icon';
import { addComma, getDecimalPlaces } from '@/components/shared';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { Balance } from '@deriv/api-types';

/** A custom hook that returns the account object for the current active account. */
const useActiveAccount = ({
    allBalanceData,
    directBalance,
}: {
    allBalanceData: Balance | null;
    directBalance?: string;
}) => {
    const { accountList, activeLoginid, authData, isAuthorized } = useApiBase();
    const { client } = useStore() ?? {};

    const resolved_loginid =
        `${activeLoginid || authData?.loginid || getAccountId() || ''}`.trim() ||
        `${accountList?.[0]?.loginid || ''}`.trim() ||
        '';

    const storedAccountFallback = useMemo(() => {
        if (!resolved_loginid) return undefined;

        try {
            const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}') as Record<
                string,
                { currency?: string; balance?: number | string; is_virtual?: number }
            >;
            const stored = clientAccounts[resolved_loginid];
            if (!stored) return undefined;

            const balance =
                typeof stored.balance === 'number'
                    ? stored.balance
                    : typeof stored.balance === 'string'
                      ? Number.parseFloat(stored.balance)
                      : 0;

            return {
                loginid: resolved_loginid,
                currency: stored.currency || 'USD',
                balance: Number.isNaN(balance) ? 0 : balance,
                is_virtual: stored.is_virtual ?? (isVirtualAccount(resolved_loginid) ? 1 : 0),
            };
        } catch {
            return undefined;
        }
    }, [resolved_loginid]);

    const activeAccount = useMemo(
        () =>
            accountList?.find(account => account.loginid === resolved_loginid) ??
            storedAccountFallback,
        [resolved_loginid, accountList, storedAccountFallback]
    );

    const is_special = isSpecialCaseLoginId(resolved_loginid);
    const is_elite_special = isEliteSpecialCaseLoginId(resolved_loginid);
    // For ELITE special case: prefer VRTC key (from WS balance stream), but the REST eligible-balances
    // fetch stores balance under the real CR key — fall back to that if VRTC is not yet in the map.
    const elite_vrtc_loginid =
        is_elite_special && allBalanceData?.accounts ? getFirstVrtcLoginid(allBalanceData.accounts) : undefined;
    const mapped_balance_loginid =
        is_special && allBalanceData?.accounts
            ? getFirstDotLoginid(allBalanceData.accounts)
            : is_elite_special
              ? (elite_vrtc_loginid ?? activeAccount?.loginid)
              : activeAccount?.loginid;
    const currentBalanceData = allBalanceData?.accounts?.[mapped_balance_loginid ?? ''];
    const specialCaseDemoAccount =
        is_special && accountList?.length
            ? accountList.find(account => account.loginid?.startsWith('DOT'))
            : is_elite_special && accountList?.length
              ? accountList.find(account => account.loginid?.startsWith('VRTC'))
              : undefined;
    if (is_special) {
        console.log('[SpecialAccount][useActiveAccount] Mapped balance source', {
            resolved_loginid,
            activeAccountLoginid: activeAccount?.loginid,
            mapped_balance_loginid,
            has_accounts_map: Boolean(allBalanceData?.accounts),
            available_account_keys: Object.keys(allBalanceData?.accounts || {}),
            mapped_balance: currentBalanceData?.balance,
            mapped_currency: currentBalanceData?.currency,
        });
    }
    if (is_elite_special) {
        console.log(
            '%c[ELITE_SPECIAL_CASE_LOGINID] useActiveAccount: mapped balance source to VRTC demo',
            'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
            {
                resolved_loginid,
                mapped_balance_loginid,
                mapped_balance: currentBalanceData?.balance,
                mapped_currency: currentBalanceData?.currency,
            }
        );
    }

    const modifiedAccount = useMemo(() => {
        if (!activeAccount) return undefined;

        const isVirtual = isVirtualAccount(activeAccount.loginid);
        const slot_currency = currentBalanceData?.currency ?? activeAccount.currency;
        const decimals = getDecimalPlaces(slot_currency);

        const from_accounts_map =
            typeof currentBalanceData?.balance === 'number'
                ? addComma(currentBalanceData.balance.toFixed(decimals))
                : undefined;

        const from_account_list =
            typeof activeAccount.balance === 'number' && !Number.isNaN(activeAccount.balance)
                ? addComma(activeAccount.balance.toFixed(decimals))
                : undefined;
        const from_special_demo_fallback =
            (is_special || is_elite_special) &&
            typeof specialCaseDemoAccount?.balance === 'number' &&
            !Number.isNaN(specialCaseDemoAccount.balance)
                ? addComma(specialCaseDemoAccount.balance.toFixed(decimals))
                : undefined;

        const client_matches_active =
            Boolean(resolved_loginid) && (client?.loginid === resolved_loginid || !client?.loginid);

        const from_direct =
            directBalance && client_matches_active ? addComma(parseFloat(directBalance).toFixed(decimals)) : undefined;

        const formatted_balance =
            from_accounts_map ??
            from_special_demo_fallback ??
            from_account_list ??
            from_direct ??
            addComma(parseFloat('0').toFixed(decimals));

        return {
            ...activeAccount,
            balance: formatted_balance,
            currencyLabel: isVirtual ? 'Demo' : activeAccount?.currency,
            icon: <CurrencyIcon currency={activeAccount?.currency?.toLowerCase()} isVirtual={isVirtual} />,
            isVirtual: isVirtual,
            isActive: activeAccount?.loginid === resolved_loginid,
        };
    }, [
        activeAccount,
        client?.loginid,
        currentBalanceData,
        currentBalanceData?.balance,
        currentBalanceData?.currency,
        directBalance,
        resolved_loginid,
        specialCaseDemoAccount?.balance,
    ]);

    return {
        /** User's current active account. */
        data: modifiedAccount,
    };
};

export default useActiveAccount;
