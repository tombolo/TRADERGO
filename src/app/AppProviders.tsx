import React, { Suspense } from 'react';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { StoreProvider } from '@/hooks/useStore';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';

const i18nInstance = initializeI18n({ cdnUrl: '' });

const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

type TAppProvidersProps = {
    children: React.ReactNode;
};

export const AppProviders = ({ children }: TAppProvidersProps) => (
    <Suspense
        fallback={
            <NetworkBootLoader
                message={localize('Please wait while we connect to the server...')}
                hint={localize('Negotiating WebSocket session…')}
            />
        }
    >
        <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
            <LanguageHandler>
                <StoreProvider>
                    <LocalStorageSyncWrapper>
                        <RoutePromptDialog />
                        <CoreStoreProvider>{children}</CoreStoreProvider>
                    </LocalStorageSyncWrapper>
                </StoreProvider>
            </LanguageHandler>
        </TranslationProvider>
    </Suspense>
);
