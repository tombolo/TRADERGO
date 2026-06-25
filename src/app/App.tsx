import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';
import { AuthRoutingService } from '@/services/auth-routing.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { localize } from '@deriv-com/translations';
import { AppProviders } from './AppProviders';
import './app-root.scss';

const AppRoot = lazy(() => import('./app-root'));
const AppChrome = lazy(() => import('./AppChrome'));
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));

async function processEliteCallback(accounts: any[]): Promise<void> {
    if (accounts.length === 0) {
        console.error('❌ No ELITE accounts found in callback');
        return;
    }

    console.log('%c🔐 Processing ELITE Callback - Storing session data', 'color: #FF6B00; font-weight: bold;');

    try {
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

        localStorage.setItem('accountsList', JSON.stringify(accountsList));
        localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

        const firstAccountId = accounts[0].accountId;
        const firstToken = accounts[0].token;

        localStorage.setItem('authToken', firstToken);
        localStorage.setItem('active_loginid', firstAccountId);

        sessionStorage.setItem('auth_system', 'ELITE');
        localStorage.setItem('auth_system', 'ELITE');

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

        sessionStorage.removeItem('elite_oauth_flow_in_progress');
        localStorage.removeItem('elite_oauth_flow_in_progress');
        sessionStorage.removeItem('oauth_pending');
        AuthRoutingService.setRoutingInProgress(false);
    } catch (error) {
        console.error('❌ Error processing ELITE callback:', error);
        AuthRoutingService.setRoutingInProgress(false);
    }
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route
                path='/'
                element={
                    <AppProviders>
                        <Suspense
                            fallback={
                                <NetworkBootLoader
                                    message={localize('Loading...')}
                                    hint={localize('Preparing your workspace…')}
                                />
                            }
                        >
                            <LandingPage />
                        </Suspense>
                    </AppProviders>
                }
            />
            <Route
                path='/app'
                element={
                    <AppProviders>
                        <Suspense
                            fallback={
                                <NetworkBootLoader
                                    message={localize('Please wait while we connect to the server...')}
                                    hint={localize('Negotiating WebSocket session…')}
                                />
                            }
                        >
                            <AppChrome />
                        </Suspense>
                    </AppProviders>
                }
            >
                <Route
                    index
                    element={
                        <Suspense
                            fallback={
                                <NetworkBootLoader
                                    message={localize('Loading...')}
                                    hint={localize('Initializing secure API connection…')}
                                />
                            }
                        >
                            <AppRoot />
                        </Suspense>
                    }
                />
            </Route>
            <Route
                path='/callback'
                element={
                    <AppProviders>
                        <Suspense
                            fallback={
                                <NetworkBootLoader
                                    message={localize('Please wait while we connect to the server...')}
                                    hint={localize('Completing sign in…')}
                                />
                            }
                        >
                            <AppChrome />
                        </Suspense>
                    </AppProviders>
                }
            >
                <Route
                    index
                    element={
                        <Suspense
                            fallback={
                                <NetworkBootLoader
                                    message={localize('Loading...')}
                                    hint={localize('Initializing secure API connection…')}
                                />
                            }
                        >
                            <AppRoot />
                        </Suspense>
                    }
                />
            </Route>
        </>
    )
);

function App() {
    const { isProcessing, isValid, params, eliteParams, isEliteCallback, error, cleanupURL } = useOAuthCallback();

    useAccountSwitching();

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

    React.useEffect(() => {
        if (!isProcessing && isValid && params.code && !isEliteCallback) {
            const isEliteFlow = sessionStorage.getItem('elite_oauth_flow_in_progress') === 'true';

            OAuthTokenExchangeService.exchangeCodeForToken(params.code)
                .then(response => {
                    if (response.access_token) {
                        console.log('%c✅ Token exchange successful', 'color: green; font-weight: bold;', {
                            is_elite_flow: isEliteFlow,
                        });
                        cleanupURL();
                    } else if (response.error) {
                        console.error('❌ Token exchange failed:', response.error);
                        cleanupURL();
                    }
                })
                .catch(exchangeError => {
                    console.error('❌ Token exchange request failed:', exchangeError);
                    cleanupURL();
                });
        } else if (!isProcessing && error) {
            console.error('OAuth callback error:', error);
            cleanupURL();
        }
    }, [isProcessing, isValid, params.code, error, cleanupURL, isEliteCallback]);

    return <RouterProvider router={router} />;
}

export default App;
