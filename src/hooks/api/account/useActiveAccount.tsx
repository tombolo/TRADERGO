import { useMemo } from 'react';
/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, isVirtualAccount } from '@/utils/account-helpers';
/* [/AI] */
import { CurrencyIcon } from '@/components/currency/currency-icon';
import { addComma, getDecimalPlaces } from '@/components/shared';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
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

    const demoLoginid = useMemo(() => accountList?.find(acc => isDemoAccount(acc.loginid))?.loginid, [accountList]);

    const balanceLoginid =
        activeAccount?.loginid === 'ROT90168653' && demoLoginid ? demoLoginid : (activeAccount?.loginid ?? '');

    const currentBalanceData = allBalanceData?.accounts?.[balanceLoginid];

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

        const client_matches_active =
            Boolean(resolved_loginid) && (client?.loginid === resolved_loginid || !client?.loginid);

        const from_direct =
            directBalance && client_matches_active
                ? addComma(parseFloat(directBalance).toFixed(decimals))
                : undefined;

        const formatted_balance = from_accounts_map ?? from_account_list ?? from_direct ?? addComma(parseFloat('0').toFixed(decimals));

        return {
            ...activeAccount,
            balance: formatted_balance,
            currencyLabel: isVirtual ? 'Demo' : activeAccount?.currency,
            icon: <CurrencyIcon currency={activeAccount?.currency?.toLowerCase()} isVirtual={isVirtual} />,
            isVirtual: isVirtual,
            isActive: activeAccount?.loginid === resolved_loginid,
        };
    }, [activeAccount, client?.loginid, currentBalanceData, directBalance, resolved_loginid]);

    return {
        /** User's current active account. */
        data: modifiedAccount,
    };
};

export default useActiveAccount;
