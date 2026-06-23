import { getRoundedNumber } from '@/components/shared';
import { api_base } from '../../api/api-base';
import { contract as broadcastContract, contractStatus } from '../utils/broadcast';
import { openContractReceived, sell } from './state/actions';

export default Engine =>
    class OpenContract extends Engine {
        observeOpenContract() {
            if (!api_base.api) return;
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data.msg_type === 'proposal_open_contract') {
                    const contract = data.proposal_open_contract;
                    const incomingId = contract?.contract_id;
                    const expected = this.contractId;

                    if (!contract) {
                        // eslint-disable-next-line no-console
                        console.log('[DBot:OpenContract] proposal_open_contract message with empty contract payload');
                        return;
                    }

                    // Old TradeEngine instances keep their WebSocket listener after a new Interpreter is created
                    // without clearing api_base subscriptions — they have no contractId. Skip silently.
                    // POC can also arrive before the buy response sets contractId (common on 2nd+ trades).
                    if (expected == null || expected === '') {
                        if (this.awaitingContractId && incomingId != null) {
                            this.contractId = String(incomingId);
                        } else {
                            return;
                        }
                    }

                    const idMatch = this.expectedContractId(incomingId);

                    if (!idMatch) {
                        // eslint-disable-next-line no-console
                        console.log('[DBot:OpenContract] proposal_open_contract ignored (contract id mismatch)', {
                            expected_engine_id: expected,
                            expected_type: typeof expected,
                            incoming_id: incomingId,
                            incoming_type: typeof incomingId,
                            normalized_equal:
                                expected != null && incomingId != null ? String(incomingId) === String(expected) : null,
                            contract_status: contract.status,
                            is_sold: contract.is_sold,
                        });
                        return;
                    }

                    this.setContractFlags(contract);

                    this.data.contract = contract;

                    // eslint-disable-next-line no-console
                    console.log('[DBot:OpenContract] proposal_open_contract applied', {
                        contract_id: incomingId,
                        status: contract.status,
                        is_sold: this.isSold,
                        is_expired: this.isExpired,
                        is_valid_to_sell: this.isSellAvailable,
                        has_entry_tick: this.hasEntryTick,
                    });

                    broadcastContract({ accountID: api_base.account_info.loginid, ...contract });

                    if (this.isSold || this.isExpired) {
                        this.contractId = '';
                        clearTimeout(this.transaction_recovery_timeout);
                        this.updateTotals(contract);
                        // eslint-disable-next-line no-console
                        console.log('[DBot:OpenContract] contract closed / sold → emitting contract.sold');
                        contractStatus({
                            id: 'contract.sold',
                            data: contract.transaction_ids.sell,
                            contract,
                        });

                        if (this.afterPromise) {
                            this.afterPromise();
                        }

                        this.store.dispatch(sell());
                    } else {
                        // eslint-disable-next-line no-console
                        console.log('[DBot:OpenContract] open contract update → dispatch openContractReceived');
                        this.store.dispatch(openContractReceived());
                    }
                }
            });
            api_base.pushSubscription(subscription);
        }

        waitForAfter() {
            return new Promise(resolve => {
                this.afterPromise = resolve;
            });
        }

        setContractFlags(contract) {
            const { is_expired, is_valid_to_sell, is_sold, entry_tick } = contract;

            this.isSold = Boolean(is_sold);
            this.isSellAvailable = !this.isSold && Boolean(is_valid_to_sell);
            this.isExpired = Boolean(is_expired);
            this.hasEntryTick = Boolean(entry_tick);
        }

        expectedContractId(contractId) {
            if (this.contractId == null || this.contractId === '' || contractId == null) {
                return false;
            }
            // Buy response and streaming updates may disagree on number vs string IDs.
            return String(contractId) === String(this.contractId);
        }

        getSellPrice() {
            const { bid_price: bidPrice, buy_price: buyPrice, currency } = this.data.contract;
            return getRoundedNumber(Number(bidPrice) - Number(buyPrice), currency);
        }
    };
