import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import RiskDisclaimer from '@/components/layout/footer/RiskDisclaimer';
import AIButton from '@/components/ai-button/AIButton';
// Social media banner import is disabled for now; uncomment when ready to enable it.
// import LandingBanner from '@/components/landing-banner/LandingBanner';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';
import { StoreProvider } from '@/hooks/useStore';
import { AuthRoutingService } from '@/services/auth-routing.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import './app-root.scss';

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));

// Translations CDN is optional — requires TRANSLATIONS_CDN_URL, R2_PROJECT_NAME, and CROWDIN_BRANCH_NAME env vars.
// Without these, the app defaults to English. See user-guide/03-white-labeling.md#translations for setup instructions.
const i18nInstance = initializeI18n({ cdnUrl: '' });

/**
 * Component wrapper to handle language URL parameter
 * Uses the useLanguageFromURL hook to process language switching
 */
const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path='/'
            element={
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
                                    <CoreStoreProvider>
                                        <>
                                            {/* <LandingBanner /> */}
                                            <Layout />
                                            <RiskDisclaimer />
                                            <AIButton />
                                        </>
                                    </CoreStoreProvider>
                                </LocalStorageSyncWrapper>
                            </StoreProvider>
                        </LanguageHandler>
                    </TranslationProvider>
                </Suspense>
            }
        >
            {/* All child routes will be passed as children to Layout */}
            <Route index element={<AppRoot />} />
            {/* OAuth redirect target (must match Deriv-registered redirect_uri) */}
            <Route path='callback' element={<AppRoot />} />
        </Route>
    )
);

/**
 * Helper function to process ELITE callback and store session data
 *
 * IMPORTANT: This function ONLY handles storage and delegation to api-base.
 * The actual authorization flow happens in api-base when the WebSocket connects,
 * which detects auth_system='ELITE' and calls authorize() on the open WebSocket.
 *
 * We do NOT call authorize() here because:
 * 1. The WebSocket created here isn't fully open yet
 * 2. api-base's main WebSocket handles authorization properly
 * 3. Creating separate WebSocket instances creates race conditions
 */
async function processEliteCallback(accounts: any[]): Promise<void> {
    if (accounts.length === 0) {
        console.error('❌ No ELITE accounts found in callback');
        return;
    }

    console.log('%c🔐 Processing ELITE Callback - Storing session data', 'color: #FF6B00; font-weight: bold;');

    try {
        // Build accountsList and clientAccounts from callback parameters
        // IMPORTANT: Merge with existing accounts to avoid losing data
        const existingAccountsList = JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<string, string>;
        const existingClientAccounts = JSON.parse(localStorage.getItem('clientAccounts') || '{}') as Record<
            string,
            { loginid: string; token: string; currency: string }
        >;

        const accountsList = { ...existingAccountsList };
        const clientAccounts = { ...existingClientAccounts };

        for (const account of accounts) {
            accountsList[account.accountId] = account.token;
            clientAccounts[account.accountId] = {
                loginid: account.accountId,
                token: account.token,
                currency: account.currency || 'USD',
            };
        }

        console.log('%c✅ Parsed tokens from callback:', 'color: #FF6B00;', {
            accounts: Object.keys(accountsList),
            mergedWithExisting: Object.keys(existingAccountsList).length > 0,
        });

        // Store to localStorage (for getToken() to find the token)
        localStorage.setItem('accountsList', JSON.stringify(accountsList));
        localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

        // NOTE: Do NOT pre-populate sessionStorage.deriv_accounts here
        // Let the authorize() response populate it with real account_list data
        // If we pre-populate, api-base won't use the account_list from authorize response
        console.log('%c✅ ELITE CALLBACK: Token stored for authorize() to use', 'color: #FF6B00;');

        // Select the first account as active
        const firstAccountId = accounts[0].accountId;
        const firstToken = accounts[0].token;

        localStorage.setItem('authToken', firstToken);
        localStorage.setItem('active_loginid', firstAccountId);

        console.log('%c✅ Stored accounts and selected active account:', 'color: #FF6B00;', {
            activeLoginId: firstAccountId,
            accountCount: accounts.length,
        });

        // Set auth system to ELITE
        // This flag is critical - api-base checks this to know which authorization flow to use
        sessionStorage.setItem('auth_system', 'ELITE');
        localStorage.setItem('auth_system', 'ELITE');

        // Set logged_state cookie for session persistence
        const domain = window.location.hostname.split('.').slice(-2).join('.');
        try {
            const { default: Cookies } = await import('js-cookie');
            Cookies.set('logged_state', 'true', {
                domain: domain,
                expires: 30,
                path: '/',
                secure: window.location.protocol === 'https:',
            });
        } catch (cookieError) {
            const maxAge = 30 * 24 * 60 * 60;
            const secure = window.location.protocol === 'https:';
            document.cookie = `logged_state=true; path=/; domain=${domain}; max-age=${maxAge}${secure ? '; secure' : ''}`;
        }

        console.log('%c✅ ELITE callback processed - auth_system set to ELITE', 'color: #FF6B00; font-weight: bold;', {
            activeLoginId: firstAccountId,
            accountCount: accounts.length,
            // Authorization will happen in api-base when WebSocket opens
        });

        // Clean up OAuth flags
        sessionStorage.removeItem('elite_oauth_flow_in_progress');
        localStorage.removeItem('elite_oauth_flow_in_progress');
        sessionStorage.removeItem('oauth_pending');
        AuthRoutingService.setRoutingInProgress(false);
    } catch (error) {
        console.error('❌ Error processing ELITE callback:', error);
        AuthRoutingService.setRoutingInProgress(false);
    }
}

/**
 * Main App component
 *
 * Responsibilities:
 * 1. OAuth callback handling (via useOAuthCallback hook)
 * 2. Account switching from URL (via useAccountSwitching hook)
 * 3. Router provider setup
 *
 * All complex logic has been extracted into custom hooks for better maintainability
 */
function App() {
    // Handle OAuth callback flow (CSRF validation + code extraction)
    const { isProcessing, isValid, params, eliteParams, isEliteCallback, error, cleanupURL } = useOAuthCallback();

    // Handle account switching via URL parameter
    useAccountSwitching();

    // Process ELITE callback
    React.useEffect(() => {
        if (!isProcessing && isValid && isEliteCallback && eliteParams?.accounts) {
            processEliteCallback(eliteParams.accounts)
                .then(() => {
                    cleanupURL();
                })
                .catch(err => {
                    console.error('Failed to process ELITE callback:', err);
                    cleanupURL();
                });
        }
    }, [isProcessing, isValid, isEliteCallback, eliteParams, cleanupURL]);

    // Process the authorization code when OAuth callback is valid
    React.useEffect(() => {
        console.log('[OAuth] Checking conditions:', {
            isProcessing,
            isValid,
            hasCode: !!params.code,
            isEliteCallback,
            shouldProcess: !isProcessing && isValid && params.code && !isEliteCallback,
        });

        if (!isProcessing && isValid && params.code && !isEliteCallback) {
            // Log which type of callback we're processing
            const isEliteFlow = sessionStorage.getItem('elite_oauth_flow_in_progress') === 'true';
            console.log('%c🔐 Processing OAuth callback', 'color: blue; font-weight: bold;', {
                code_length: params.code.length,
                is_elite_flow: isEliteFlow,
            });

            // Exchange authorization code for access token
            OAuthTokenExchangeService.exchangeCodeForToken(params.code)
                .then(response => {
                    if (response.access_token) {
                        console.log('%c✅ Token exchange successful', 'color: green; font-weight: bold;');
                        console.log('%c📋 Auth system:', 'color: green;', sessionStorage.getItem('auth_system'));
                        cleanupURL();
                    } else if (response.error) {
                        console.error('❌ Token exchange failed:', response.error);
                        console.error('Error description:', response.error_description);
                        cleanupURL();
                    }
                })
                .catch(error => {
                    console.error('❌ Token exchange request failed:', error);
                    cleanupURL();
                });
        } else if (!isProcessing && error) {
            console.error('OAuth callback error:', error);
            // Ensure we never stay stuck on /callback with hidden layout.
            cleanupURL();
        }
    }, [isProcessing, isValid, params.code, error, cleanupURL, isEliteCallback]);

    return <RouterProvider router={router} />;
}

export default App;
