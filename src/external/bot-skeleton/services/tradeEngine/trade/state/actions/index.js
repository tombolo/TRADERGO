import * as constants from '../constants';

const dispatchIfScopeIs = ({ dispatch, getState, data, scope }) => {
    const { scope: currentScope } = getState();
    if (currentScope === scope) {
        dispatch(data);
    }
};

export const start = () => (dispatch, getState) =>
    dispatchIfScopeIs({ dispatch, getState, data: { type: constants.START }, scope: constants.STOP });

export const proposalsReady = () => ({ type: constants.PROPOSALS_READY });

export const clearProposals = () => ({ type: constants.CLEAR_PROPOSALS });

export const purchaseSuccessful = () => (dispatch, getState) => {
    const { scope: currentScope } = getState();
    if (currentScope === constants.BEFORE_PURCHASE || currentScope === constants.DURING_PURCHASE) {
        dispatch({ type: constants.PURCHASE_SUCCESSFUL });
    }
};

export const openContractReceived = () => (dispatch, getState) => {
    const { scope: currentScope } = getState();
    // POC can land before purchaseSuccessful flips scope; accept both scopes.
    if (currentScope === constants.BEFORE_PURCHASE || currentScope === constants.DURING_PURCHASE) {
        dispatch({ type: constants.OPEN_CONTRACT });
    }
};

export const sell = () => (dispatch, getState) =>
    dispatchIfScopeIs({ dispatch, getState, data: { type: constants.SELL }, scope: constants.DURING_PURCHASE });
