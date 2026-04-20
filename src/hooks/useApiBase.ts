import { useEffect, useState } from 'react';
import {
    account_list$,
    authData$,
    CONNECTION_STATUS,
    connectionStatus$,
    isAuthorized$,
    isAuthorizing$,
    setIsAuthorizing as setIsAuthorizingStream,
} from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { TAuthData } from '@/types/api-types';

export const useApiBase = () => {
    const [connectionStatus, setConnectionStatus] = useState<CONNECTION_STATUS>(CONNECTION_STATUS.UNKNOWN);
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    const [isAuthorizing, setIsAuthorizingState] = useState<boolean>(true); // Synced from isAuthorizing$
    const [accountList, setAccountList] = useState<TAuthData['account_list']>([]);
    const [authData, setAuthData] = useState<TAuthData | null>(null);
    const [activeLoginid, setActiveLoginid] = useState<string>('');

    useEffect(() => {
        const connectionStatusSubscription = connectionStatus$.subscribe(status => {
            setConnectionStatus(status as CONNECTION_STATUS);
        });

        const isAuthorizedSubscription = isAuthorized$.subscribe(isAuthorized => {
            setIsAuthorized(isAuthorized);
        });

        const isAuthorizingSubscription = isAuthorizing$.subscribe(isAuthorizing => {
            setIsAuthorizingState(isAuthorizing);
        });
        const accountListSubscription = account_list$.subscribe(accountList => {
            setAccountList(accountList);
        });
        const authDataSubscription = authData$.subscribe(authData => {
            setAuthData(authData);
            setActiveLoginid(authData?.loginid ?? '');
        });

        return () => {
            connectionStatusSubscription.unsubscribe();
            isAuthorizedSubscription.unsubscribe();
            isAuthorizingSubscription.unsubscribe();
            accountListSubscription.unsubscribe();
            authDataSubscription.unsubscribe();
        };
    }, []);

    return {
        connectionStatus,
        isAuthorized,
        isAuthorizing,
        accountList,
        authData,
        activeLoginid,
        /** Updates the shared authorizing flag (same source api-base uses). */
        setIsAuthorizing: setIsAuthorizingStream,
    };
};
