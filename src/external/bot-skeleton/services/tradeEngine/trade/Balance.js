import { getFormattedText } from '@/components/shared';
import DBotStore from '../../../scratch/dbot-store';
import { api_base } from '../../api/api-base';
import { info } from '../utils/broadcast';

let balance_string = '';

export default Engine =>
    class Balance extends Engine {
        observeBalance() {
            if (!api_base.api) return;
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data?.msg_type === 'balance' && data?.balance) {
                    const {
                        balance: { balance: b, currency },
                    } = data;

                    balance_string = getFormattedText(b, currency);

                    // Update the client store so the header balance reflects the change immediately.
                    const { client } = DBotStore.instance;
                    if (client) {
                        client.setBalance(String(b));
                        const loginid =
                            data.balance?.loginid || data.loginid || client.loginid;
                        if (loginid && client.all_accounts_balance) {
                            const prev = client.all_accounts_balance;
                            const prevAccounts = prev?.accounts ?? {};
                            client.setAllAccountsBalance({
                                ...prev,
                                accounts: {
                                    ...prevAccounts,
                                    [loginid]: {
                                        ...(prevAccounts[loginid] ?? {}),
                                        balance: b,
                                        currency:
                                            currency ||
                                            prevAccounts[loginid]?.currency ||
                                            client.currency,
                                        loginid,
                                    },
                                },
                            });
                        }
                    }

                    if (this.accountInfo) info({ accountID: this.accountInfo.loginid, balance: balance_string });
                }
            });
            api_base.pushSubscription(subscription);
        }

        // eslint-disable-next-line class-methods-use-this
        getBalance(type) {
            const { client } = DBotStore.instance;
            const balance = (client && client.balance) || 0;

            balance_string = getFormattedText(balance, client.currency, false);
            return type === 'STR' ? balance_string : balance;
        }
    };
