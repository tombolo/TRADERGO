// connection-status-stream.ts (This will manage our observable stream)
import { BehaviorSubject } from 'rxjs';
import { isEliteSpecialCaseLoginId, isSpecialCaseLoginId, logSpecialAccountDebug } from '@/utils/account-helpers';
import { TAuthData } from '@/types/api-types';

export enum CONNECTION_STATUS {
    OPENED = 'opened',
    CLOSED = 'closed',
    UNKNOWN = 'unknown',
}

// Initial connection status will be 'unknown'
export const connectionStatus$ = new BehaviorSubject<string>('unknown');
export const isAuthorizing$ = new BehaviorSubject<boolean>(false);
export const isAuthorized$ = new BehaviorSubject<boolean>(false);
export const account_list$ = new BehaviorSubject<TAuthData['account_list']>([]);
export const authData$ = new BehaviorSubject<TAuthData | null>(null);

// Create functions to easily update status
export const setConnectionStatus = (status: CONNECTION_STATUS) => {
    connectionStatus$.next(status);
};

// Set the authorized status
export const setIsAuthorized = (isAuthorized: boolean) => {
    const active_loginid = localStorage.getItem('active_loginid');
    if (isSpecialCaseLoginId(active_loginid)) {
        logSpecialAccountDebug('setIsAuthorized', { active_loginid, isAuthorized });
    }
    isAuthorized$.next(isAuthorized);
};

// Set the authorizing status
export const setIsAuthorizing = (isAuthorizing: boolean) => {
    isAuthorizing$.next(isAuthorizing);
};

// Set the account list
export const setAccountList = (accountList: TAuthData['account_list']) => {
    account_list$.next(accountList);
};

// Set the auth data
export const setAuthData = (authData: TAuthData | null) => {
    const active_loginid = localStorage.getItem('active_loginid');
    const should_keep_special_loginid =
        isSpecialCaseLoginId(active_loginid) && Boolean(authData?.loginid?.startsWith('DOT'));
    const should_keep_elite_special_loginid =
        isEliteSpecialCaseLoginId(active_loginid) && Boolean(authData?.loginid?.startsWith('VRTC'));

    if (should_keep_special_loginid) {
        logSpecialAccountDebug('setAuthData_preserve_rot', {
            active_loginid,
            auth_loginid: authData?.loginid,
            balance: authData?.balance,
            blocked_overwrite: true,
        });
    }
    if (should_keep_elite_special_loginid) {
        console.log(
            '%c[ELITE_SPECIAL_CASE_LOGINID] setAuthData: preserving CR loginid in localStorage — blocking overwrite with VRTC',
            'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
            { active_loginid, auth_loginid: authData?.loginid }
        );
    }

    if (authData?.loginid && !should_keep_special_loginid && !should_keep_elite_special_loginid) {
        localStorage.setItem('active_loginid', authData.loginid);
    }
    authData$.next(authData);
};
