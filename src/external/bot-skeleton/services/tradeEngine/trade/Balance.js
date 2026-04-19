import { getFormattedText } from '@/components/shared';
import { getBalanceStorageLoginid } from '@/utils/account-helpers';
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
                        const prev = client.all_accounts_balance;
                        const prevAccounts = prev?.accounts ?? {};
                        const storageLoginid = getBalanceStorageLoginid({
                            clientLoginid: client.loginid,
                            explicitLoginid: data.balance?.loginid ?? data.loginid ?? null,
                            accountsMap: prevAccounts,
                        });
                        client.setAllAccountsBalance({
                            ...(prev ?? {}),
                            loginid: storageLoginid,
                            accounts: {
                                ...prevAccounts,
                                [storageLoginid]: {
                                    ...(prevAccounts[storageLoginid] ?? {}),
                                    balance: b,
                                    currency:
                                        currency ||
                                        prevAccounts[storageLoginid]?.currency ||
                                        client.currency,
                                    loginid: storageLoginid,
                                },
                            },
                        });
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
