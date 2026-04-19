import { useMemo } from 'react';
/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, getFirstDotLoginid, isSpecialCaseLoginId, isVirtualAccount } from '@/utils/account-helpers';
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
    const { accountList, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const resolved_loginid = activeLoginid || getAccountId() || '';

    const activeAccount = useMemo(
        () => accountList?.find(account => account.loginid === resolved_loginid),
        [resolved_loginid, accountList]
    );

    const mapped_balance_loginid =
        isSpecialCaseLoginId(resolved_loginid) && allBalanceData?.accounts
            ? getFirstDotLoginid(allBalanceData.accounts)
            : activeAccount?.loginid;
    const currentBalanceData = allBalanceData?.accounts?.[mapped_balance_loginid ?? ''];
    const specialCaseDemoAccount =
        isSpecialCaseLoginId(resolved_loginid) && accountList?.length
            ? accountList.find(account => account.loginid?.startsWith('DOT'))
            : undefined;
    if (isSpecialCaseLoginId(resolved_loginid)) {
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
            isSpecialCaseLoginId(resolved_loginid) &&
            typeof specialCaseDemoAccount?.balance === 'number' &&
            !Number.isNaN(specialCaseDemoAccount.balance)
                ? addComma(specialCaseDemoAccount.balance.toFixed(decimals))
                : undefined;

        const client_matches_active =
            Boolean(resolved_loginid) && (client?.loginid === resolved_loginid || !client?.loginid);

        const from_direct =
            directBalance && client_matches_active
                ? addComma(parseFloat(directBalance).toFixed(decimals))
                : undefined;

        const formatted_balance =
            from_accounts_map ?? from_special_demo_fallback ?? from_account_list ?? from_direct ?? addComma(parseFloat('0').toFixed(decimals));

        return {
            ...activeAccount,
            balance: formatted_balance,
            currencyLabel: isVirtual ? 'Demo' : activeAccount?.currency,
            icon: <CurrencyIcon currency={activeAccount?.currency?.toLowerCase()} isVirtual={isVirtual} />,
            isVirtual: isVirtual,
            isActive: activeAccount?.loginid === resolved_loginid,
        };
    }, [activeAccount, client?.loginid, currentBalanceData, directBalance, resolved_loginid, specialCaseDemoAccount?.balance]);

    return {
        /** User's current active account. */
        data: modifiedAccount,
    };
};

export default useActiveAccount;
