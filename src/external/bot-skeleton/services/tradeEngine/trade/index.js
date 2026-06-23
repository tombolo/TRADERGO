import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { getLocalizedErrorMessage } from '@/constants/backend-error-messages';
import { getAuthSystem } from '@/utils/auth-system-helpers';
import { createError } from '../../../utils/error';
import { observer as globalObserver } from '../../../utils/observer';
import { api_base } from '../../api/api-base';
import { checkBlocksForProposalRequest, doUntilDone } from '../utils/helpers';
import { expectInitArg } from '../utils/sanitize';
import { proposalsReady, start } from './state/actions';
import * as constants from './state/constants';
import rootReducer from './state/reducers';
import Balance from './Balance';
import OpenContract from './OpenContract';
import Proposal from './Proposal';
import Purchase from './Purchase';
import Sell from './Sell';
import Ticks from './Ticks';
import Total from './Total';

const watchBefore = store =>
    watchScope({
        store,
        stopScope: constants.DURING_PURCHASE,
        passScope: constants.BEFORE_PURCHASE,
        passFlag: 'proposalsReady',
        allowPassOnFlagEdge: false,
        allowImmediatePass: false,
    });

const watchDuring = (store, allowImmediatePass = false) =>
    watchScope({
        store,
        stopScope: constants.STOP,
        passScope: constants.DURING_PURCHASE,
        passFlag: 'openContract',
        allowPassOnFlagEdge: true,
        allowImmediatePass,
    });

/* The watchScope function is called randomly and resets the prevTick
 * which leads to the same problem we try to solve. So prevTick is isolated
 */
let prevTick;
const watchScope = ({
    store,
    stopScope,
    passScope,
    passFlag,
    allowPassOnFlagEdge = false,
    allowImmediatePass = false,
}) => {
    const initialState = store.getState();

    if (initialState.scope === stopScope) {
        return Promise.resolve(false);
    }

    return new Promise(resolve => {
        let unsubscribe = () => {};
        let sawPassFlag = Boolean(initialState[passFlag]);

        const tryResolve = newState => {
            if (newState.scope === stopScope) {
                unsubscribe();
                resolve(false);
                return true;
            }

            if (newState.scope === passScope && newState[passFlag]) {
                unsubscribe();
                resolve(true);
                return true;
            }

            return false;
        };

        // Only after a fresh buy: openContract may already be true before subscribe runs.
        // Never immediate-pass on watch('before') — proposalsReady stays true and would spin forever.
        if (allowImmediatePass && tryResolve(initialState)) {
            return;
        }

        unsubscribe = store.subscribe(() => {
            const newState = store.getState();

            if (tryResolve(newState)) {
                return;
            }

            const passFlagTurnedOn = allowPassOnFlagEdge && Boolean(newState[passFlag]) && !sawPassFlag;
            sawPassFlag = Boolean(newState[passFlag]);

            const tickChanged = newState.newTick !== prevTick;

            // Before-purchase: only act on a new tick (avoids tight loops).
            // During-purchase: also act when openContract flips true without a new tick (2nd+ trades).
            if (!tickChanged && !passFlagTurnedOn) {
                return;
            }

            if (tickChanged) {
                prevTick = newState.newTick;
            }

            tryResolve(newState);
        });
    });
};

export default class TradeEngine extends Balance(Purchase(Sell(OpenContract(Proposal(Ticks(Total(class {}))))))) {
    constructor($scope) {
        super();
        this.observer = $scope.observer;
        this.$scope = $scope;
        this.observe();
        this.data = {
            contract: {},
            proposals: [],
        };
        this.subscription_id_for_accumulators = null;
        this.is_proposal_requested_for_accumulators = false;
        this.store = createStore(rootReducer, applyMiddleware(thunk));
    }

    init(...args) {
        const [token, options] = expectInitArg(args);
        const { symbol } = options;

        this.initArgs = args;
        this.options = options;
        this.startPromise = this.loginAndGetBalance(token);

        if (!this.checkTicksPromiseExists()) this.watchTicks(symbol);
    }

    start(tradeOptions) {
        if (!this.options) {
            throw createError('NotInitialized', getLocalizedErrorMessage('NotInitialized'));
        }

        globalObserver.emit('bot.running');

        const validated_trade_options = this.validateTradeOptions(tradeOptions);

        this.tradeOptions = { ...validated_trade_options, symbol: this.options.symbol };
        this.store.dispatch(start());
        this.checkLimits(validated_trade_options);

        this.makeDirectPurchaseDecision();
    }

    loginAndGetBalance(token) {
        if (this.token === token) {
            return Promise.resolve();
        }
        // for strategies using total runs, GetTotalRuns function is trying to get loginid and it gets called before Proposals calls.
        // the below required loginid to be set in Proposal calls where loginAndGetBalance gets resolved.
        // Earlier this used to happen as soon as we get ticks_history response and by the time GetTotalRuns gets called we have required info.
        this.accountInfo = api_base.account_info;
        this.token = api_base.token;
        return new Promise(resolve => {
            // Try to recover from a situation where API doesn't give us a correct response on
            // "proposal_open_contract" which would make the bot run forever. When there's a "sell"
            // event, wait a couple seconds for the API to give us the correct "proposal_open_contract"
            // response, if there's none after x seconds. Send an explicit request, which _should_
            // solve the issue. This is a backup!
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data.msg_type === 'transaction' && data.transaction.action === 'sell') {
                    this.transaction_recovery_timeout = setTimeout(() => {
                        const { contract } = this.data;
                        const is_same_contract = String(contract.contract_id) === String(data.transaction.contract_id);
                        const is_open_contract = contract.status === 'open';
                        if (is_same_contract && is_open_contract) {
                            doUntilDone(() => {
                                api_base.api.send({ proposal_open_contract: 1, contract_id: contract.contract_id });
                            }, ['PriceMoved']);
                        }
                    }, 1500);
                }
                resolve();
            });
            api_base.pushSubscription(subscription);
        });
    }

    observe() {
        this.observeOpenContract();
        this.observeBalance();
        this.observeProposals();
    }

    watch(watchName) {
        if (watchName === 'before') {
            return watchBefore(this.store);
        }
        const allowImmediatePass = Boolean(this.needsDuringWatchImmediatePass);
        this.needsDuringWatchImmediatePass = false;
        return watchDuring(this.store, allowImmediatePass);
    }

    makeDirectPurchaseDecision() {
        const { has_payout_block, is_basis_payout } = checkBlocksForProposalRequest();
        const authSystem = getAuthSystem();
        const isElite = authSystem === 'ELITE';

        // ELITE users MUST use proposal subscription because the direct buy API doesn't support
        // parameters in the request. They need to use: { buy: proposal_id, price }
        this.is_proposal_subscription_required = has_payout_block || is_basis_payout || isElite;

        if (this.is_proposal_subscription_required) {
            this.makeProposals({ ...this.options, ...this.tradeOptions });
            this.checkProposalReady();
        } else {
            this.store.dispatch(proposalsReady());
        }
    }
}
