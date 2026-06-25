import { OAUTH_CALLBACK_URL } from '@/constants/oauth';
import { ErrorLogger } from '@/utils/error-logger';
import { isDemoAccount } from '@/utils/account-helpers';
import { AccountTypeDetectorService } from './account-type-detector.service';
import { setAuthSystem, setAccountTypeMetadata } from '@/utils/auth-system-helpers';
import { AuthRoutingService } from './auth-routing.service';
import brandConfig from '../../brand.config.json';

/**
 * Response from OAuth2 token exchange endpoint
 */
interface TokenExchangeResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

/**
 * Authentication information stored in sessionStorage
 */
interface AuthInfo {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number; // Timestamp when token expires
    scope?: string;
    refresh_token?: string;
}

/**
 * Service for handling OAuth2 token exchange operations
 */
export class OAuthTokenExchangeService {
    /**
     * Get the OAuth2 base URL based on environment
     * @returns OAuth2 base URL (staging or production)
     */
    private static getOAuth2BaseURL(): string {
        const environment = isProduction() ? 'production' : 'staging';
        return brandConfig.platform.auth2_url[environment];
    }

    /**
     * Get stored authentication info from sessionStorage
     * @returns AuthInfo object or null if not found or expired
     */
    static getAuthInfo(): AuthInfo | null {
        try {
            const authInfoStr = sessionStorage.getItem('auth_info');
            if (!authInfoStr) {
                return null;
            }

            const authInfo: AuthInfo = JSON.parse(authInfoStr);

            // Check if token is expired
            if (authInfo.expires_at && Date.now() >= authInfo.expires_at) {
                this.clearAuthInfo();
                return null;
            }

            return authInfo;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error parsing auth_info', error);
            return null;
        }
    }

    /**
     * Clear authentication info from sessionStorage
     */
    static clearAuthInfo(): void {
        sessionStorage.removeItem('auth_info');
    }

    /**
     * Check if user is authenticated (has valid access token)
     * @returns true if authenticated with valid token
     */
    static isAuthenticated(): boolean {
        const authInfo = this.getAuthInfo();
        return authInfo !== null && !!authInfo.access_token;
    }

    /**
     * Get the current access token
     * @returns Access token string or null
     */
    static getAccessToken(): string | null {
        const authInfo = this.getAuthInfo();
        return authInfo?.access_token || null;
    }

    /**
     * Exchange authorization code for access token
     *
     * This method exchanges the authorization code received from OAuth callback
     * for an access token that can be used to authenticate API requests.
     *
     * @param code - The authorization code from OAuth callback
     * @returns Promise with token exchange response
     *
     * @example
     * ```typescript
     * const result = await OAuthTokenExchangeService.exchangeCodeForToken('ory_ac_...');
     * if (result.access_token) {
     *   // Store token in session storage
     *   sessionStorage.setItem('access_token', result.access_token);
     * }
     * ```
     */
    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        try {
            AuthRoutingService.setRoutingInProgress(true);

            // Validate that authorization code is available for exchange
            if (!code || code.trim() === '') {
                ErrorLogger.error('OAuth', 'Authorization code is missing or empty');
                console.error('%c❌ Missing authorization code for token exchange', 'color: red; font-weight: bold;');
                AuthRoutingService.setRoutingInProgress(false);

                return {
                    error: 'missing_code',
                    error_description: 'Authorization code not available',
                };
            }

            // Check if we're returning from an ELITE OAuth flow
            // Check both sessionStorage and localStorage (sessionStorage may be lost on domain change)
            const isEliteCallback =
                sessionStorage.getItem('elite_oauth_flow_in_progress') === 'true' ||
                localStorage.getItem('elite_oauth_flow_in_progress') === 'true';
            if (isEliteCallback) {
                console.log('%c🎯 ELITE callback detected - using stored token', 'color: #FF6B00; font-weight: bold;');
                localStorage.setItem(
                    'debug_log',
                    (localStorage.getItem('debug_log') || '') + '\n🎯 ELITE callback - using stored token'
                );

                // Clear the flag from both storage locations to prevent future misidentification
                sessionStorage.removeItem('elite_oauth_flow_in_progress');
                localStorage.removeItem('elite_oauth_flow_in_progress');

                // Get the stored ELITE token (check both storage locations)
                let eliteToken = sessionStorage.getItem('elite_temp_token') || localStorage.getItem('elite_temp_token');
                if (eliteToken) {
                    // Store authentication info in sessionStorage for ELITE flow
                    const authInfo: AuthInfo = {
                        access_token: eliteToken,
                        token_type: 'bearer',
                        expires_in: 3600,
                        expires_at: Date.now() + 3600 * 1000,
                        scope: 'trade',
                    };

                    // Store as JSON string
                    sessionStorage.setItem('auth_info', JSON.stringify(authInfo));

                    // Also store token to accountsList in localStorage for getToken() to find
                    // getToken() in appId.js looks for tokens in localStorage.accountsList
                    let activeLoginid = localStorage.getItem('active_loginid');
                    if (!activeLoginid) {
                        // Set a temporary loginid for ELITE accounts until authorize response provides real one
                        activeLoginid = 'ELITE_TEMP';
                        localStorage.setItem('active_loginid', activeLoginid);
                        console.log(
                            '%c📝 Set temporary active_loginid for ELITE account:',
                            'color: #FF6B00;',
                            activeLoginid
                        );
                    }
                    const accountsList = JSON.parse(localStorage.getItem('accountsList') || '{}');
                    accountsList[activeLoginid] = eliteToken;
                    localStorage.setItem('accountsList', JSON.stringify(accountsList));

                    // Also store in clientAccounts format for ELITE compatibility
                    const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') || '{}');
                    clientAccounts[activeLoginid] = {
                        token: eliteToken,
                        currency: 'USD',
                        is_virtual: 0,
                        balance: 0,
                    };
                    localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

                    console.log('%c💾 Stored ELITE token and account info to localStorage', 'color: #FF6B00;', {
                        activeLoginid,
                        hasToken: !!eliteToken,
                    });

                    // Set logged_state cookie to indicate user is authenticated (ELITE uses this)
                    import('js-cookie').then(({ default: Cookies }) => {
                        Cookies.set('logged_state', 'true', {
                            domain: window.location.hostname.split('.').slice(-2).join('.'),
                            expires: 30,
                            path: '/',
                            secure: true,
                        });
                        console.log('%c🔐 Set logged_state cookie to true for ELITE account', 'color: #FF6B00;');
                    });

                    console.log(
                        '%c✅ ELITE token stored to sessionStorage and accountsList',
                        'color: #FF6B00; font-weight: bold;'
                    );
                    localStorage.setItem(
                        'debug_log',
                        (localStorage.getItem('debug_log') || '') +
                            '\n✅ ELITE token stored to both session and account list'
                    );

                    // Return a successful response with the stored token
                    const tokenResponse: TokenExchangeResponse = {
                        access_token: eliteToken,
                        token_type: 'bearer',
                        expires_in: 3600,
                        error: undefined,
                    };

                    // Clear temp token from both storage locations as it's been consumed
                    sessionStorage.removeItem('elite_temp_token');
                    localStorage.removeItem('elite_temp_token');

                    return tokenResponse;
                } else {
                    ErrorLogger.error('OAuth', 'ELITE callback detected but no stored token found');
                    return {
                        error: 'invalid_state',
                        error_description: 'ELITE token not found. Please try logging in again.',
                    };
                }
            }

            const baseURL = this.getOAuth2BaseURL();
            const tokenEndpoint = `${baseURL}token`;

            // Retrieve the PKCE code verifier from session storage
            const codeVerifier = getCodeVerifier();

            if (!codeVerifier) {
                ErrorLogger.error('OAuth', 'PKCE code verifier not found or expired');

                console.error(
                    '%c❌ PKCE code verifier missing (NOT falling back to ELITE)',
                    'color: red; font-weight: bold;'
                );

                // DISABLED ELITE FALLBACK - return error
                // const language = new URLSearchParams(window.location.search).get('language') || 'en';
                // const protocol = window.location.protocol;
                // const host = window.location.host;
                // const redirectUrl = `${protocol}//${host}/callback`;
                // const eliteOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=134081&l=${encodeURIComponent(language)}&brand=deriv&redirect_uri=${encodeURIComponent(redirectUrl)}`;
                // sessionStorage.setItem('elite_oauth_flow_in_progress', 'true');
                // localStorage.setItem('elite_oauth_flow_in_progress', 'true');
                // window.location.replace(eliteOAuthUrl);

                return {
                    error: 'missing_code_verifier',
                    error_description: 'PKCE code verifier not found or expired',
                };
            }
            // Prepare the request body
            // OAuth2 token exchange with PKCE requires:
            // - grant_type: 'authorization_code'
            // - code: the authorization code
            // - redirect_uri: must match the one used in authorization request
            // - client_id: your OAuth2 client ID
            // - code_verifier: the PKCE code verifier (proves we initiated the auth flow)

            const clientId = process.env.CLIENT_ID;
            if (!clientId) {
                ErrorLogger.error('OAuth', 'CLIENT_ID environment variable is not set');
                return {
                    error: 'invalid_client',
                    error_description: 'CLIENT_ID is not configured. Please set the CLIENT_ID environment variable.',
                };
            }

            const redirectUrl = OAUTH_CALLBACK_URL;

            const requestBody = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                redirect_uri: redirectUrl,
                code_verifier: codeVerifier, // PKCE: Include code verifier
            });

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                credentials: 'include', // Include cookies for session-based auth
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestBody.toString(),
            });

            // Parse response
            const data: TokenExchangeResponse = await response.json();

            // Check for errors in response
            if (data.error) {
                ErrorLogger.error('OAuth', `Token exchange error: ${data.error}`, {
                    error: data.error,
                    description: data.error_description,
                });

                console.error(
                    '%c❌ Token Exchange Error (NOT falling back to ELITE)',
                    'color: red; font-weight: bold;',
                    {
                        error: data.error,
                        error_description: data.error_description,
                        clientId: process.env.CLIENT_ID,
                        redirectUrl: redirectUrl,
                    }
                );

                // DISABLED ELITE FALLBACK - return error so we can see what's wrong
                // const language = new URLSearchParams(window.location.search).get('language') || 'en';
                // const eliteOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=134081&l=${encodeURIComponent(language)}&brand=deriv&redirect_uri=${encodeURIComponent(redirectUrl)}`;
                // sessionStorage.setItem('elite_oauth_flow_in_progress', 'true');
                // localStorage.setItem('elite_oauth_flow_in_progress', 'true');
                // window.location.replace(eliteOAuthUrl);

                return {
                    error: data.error,
                    error_description: data.error_description,
                };
            }

            // Success - log token info (without exposing the actual token)
            if (data.access_token) {
                // Clear the code verifier after successful exchange
                clearCodeVerifier();
                // Store authentication info in sessionStorage
                const authInfo: AuthInfo = {
                    access_token: data.access_token,
                    token_type: data.token_type || 'bearer',
                    expires_in: data.expires_in || 3600,
                    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
                    scope: data.scope,
                };

                // Include refresh token if provided
                if (data.refresh_token) {
                    authInfo.refresh_token = data.refresh_token;
                }

                // Store as JSON string
                sessionStorage.setItem('auth_info', JSON.stringify(authInfo));

                // Immediately fetch accounts and check account type after token exchange
                try {
                    const { DerivWSAccountsService } = await import('./derivws-accounts.service');

                    const accounts = await DerivWSAccountsService.fetchAccountsList(data.access_token);
                    console.log('[AuthTrace] first_api_result', {
                        endpoint: 'derivatives/accounts',
                        accounts_count: accounts?.length ?? 0,
                        first_loginid: accounts?.[0]?.account_id ?? null,
                    });

                    if (accounts && accounts.length > 0) {
                        const detectedRoute = AuthRoutingService.detectRouteFromAccounts(accounts);
                        AuthRoutingService.applyDetectedRoute(detectedRoute);

                        // If account list indicates ELITE pattern, route to ELITE OAuth callback flow
                        if (detectedRoute === 'ELITE') {
                            const firstAccountId = accounts[0].account_id;
                            console.log('[AuthTrace] route_detected', {
                                route: 'ELITE',
                                first_loginid: firstAccountId,
                            });
                            ErrorLogger.info(
                                'OAuth',
                                'ELITE account detected by login ID pattern - redirecting to ELITE OAuth flow',
                                {
                                    account_id: firstAccountId,
                                }
                            );

                            // Store auth system info to localStorage (not sessionStorage) because we're about to redirect to a different domain
                            localStorage.setItem('auth_system', 'ELITE');
                            setAuthSystem('ELITE');

                            // Store account type metadata to localStorage as well
                            const metadata = {
                                accountType: 'ELITE',
                                loginid: firstAccountId,
                                currency: accounts[0].currency || 'USD',
                                isVirtual: accounts[0].account_type === 'demo',
                                detected_via: 'login_id_pattern',
                            };
                            localStorage.setItem('account_type_metadata', JSON.stringify(metadata));
                            setAccountTypeMetadata(metadata);

                            // Store the token temporarily for ELITE flow
                            sessionStorage.setItem('elite_temp_token', data.access_token);
                            sessionStorage.setItem('elite_oauth_flow_in_progress', 'true');
                            localStorage.setItem('elite_oauth_flow_in_progress', 'true');
                            localStorage.setItem('elite_temp_token', data.access_token);

                            // Build redirect URL for ELITE OAuth callback
                            const protocol = window.location.protocol;
                            const host = window.location.host;
                            const redirectUrl = `${protocol}//${host}/callback`;
                            const eliteOAuthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=134081&redirect_uri=${encodeURIComponent(redirectUrl)}`;
                            console.log(
                                '[AuthTrace] ELITE account detected (NOT redirecting, continuing with ZOOM flow)',
                                { url: eliteOAuthUrl }
                            );

                            // DISABLED - continue with ZOOM flow even if ELITE pattern detected
                            // window.location.href = eliteOAuthUrl;

                            // Return early - redirect will happen before this returns
                            return {
                                access_token: data.access_token,
                                token_type: data.token_type || 'bearer',
                                expires_in: data.expires_in || 3600,
                                auth_system: 'ELITE',
                            };
                        }
                        // ZOOM account detected - continue standard flow
                        console.log('[AuthTrace] route_detected', {
                            route: 'ZOOM',
                            first_loginid: accounts[0].account_id,
                        });
                        setAuthSystem('ZOOM');
                        // Store auth_system to localStorage for persistence across domain changes (like ELITE does)
                        localStorage.setItem('auth_system', 'ZOOM');
                        setAccountTypeMetadata({
                            accountType: 'ZOOM',
                            loginid: accounts[0].account_id,
                            currency: accounts[0].currency,
                            isVirtual: accounts[0].account_type === 'demo',
                            detected_via: 'deriv_ws_endpoint',
                        });

                        // Store accounts
                        DerivWSAccountsService.storeAccounts(accounts);

                        // Keep backward-compatible local account maps populated.
                        // Several UI flows (account switcher, URL account switching, DTrader embed)
                        // still read these keys.
                        const accountsListMap: Record<string, string> = {};
                        const clientAccountsMap: Record<
                            string,
                            { currency: string; is_virtual: number; balance: number; token: string }
                        > = {};
                        accounts.forEach(account => {
                            const token_value = data.access_token as string;
                            accountsListMap[account.account_id] = token_value;
                            clientAccountsMap[account.account_id] = {
                                currency: account.currency || 'USD',
                                is_virtual: account.account_type === 'demo' ? 1 : 0,
                                balance: Number(account.balance || 0),
                                token: token_value,
                            };
                        });
                        localStorage.setItem('accountsList', JSON.stringify(accountsListMap));
                        localStorage.setItem('clientAccounts', JSON.stringify(clientAccountsMap));

                        console.log(
                            '%c[DTrader iframe] localStorage.accountsList written — these are the acct1/token1 credentials the trader iframe will use:',
                            'color: #00aaff; font-weight: bold;'
                        );
                        console.table(
                            Object.entries(accountsListMap).map(([loginid, token]) => ({
                                loginid,
                                token_prefix: token.slice(0, 16) + '...',
                                token_length: token.length,
                            }))
                        );

                        // Set the first account as active in localStorage
                        const firstAccount = accounts[0];
                        localStorage.setItem('active_loginid', firstAccount.account_id);

                        // Set account type
                        const isDemo = isDemoAccount(firstAccount.account_id);
                        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

                        console.log(
                            '%c[DTrader iframe] Active account set in localStorage:',
                            'color: #00aaff; font-weight: bold;',
                            {
                                active_loginid: firstAccount.account_id,
                                account_type: isDemo ? 'demo' : 'real',
                                currency: firstAccount.currency || 'USD',
                                iframe_will_use: `acct1=${firstAccount.account_id}&token1=${(data.access_token as string).slice(0, 16)}...`,
                            }
                        );

                        ErrorLogger.info('OAuth', 'ZOOM account detected and stored', {
                            accountType: 'ZOOM',
                            loginid: firstAccount.account_id,
                        });

                        try {
                            const { default: Cookies } = await import('js-cookie');
                            const domain = window.location.hostname.split('.').slice(-2).join('.');
                            Cookies.set('logged_state', 'true', {
                                domain,
                                expires: 30,
                                path: '/',
                                secure: window.location.protocol === 'https:',
                            });
                        } catch {
                            // Non-blocking: session is already in localStorage.
                        }

                        sessionStorage.removeItem('oauth_pending');

                        // Defer WebSocket init to the post-login /app route to avoid racing
                        // with the callback redirect and double-authorize flows.
                        return {
                            access_token: data.access_token,
                            token_type: data.token_type || 'bearer',
                            expires_in: data.expires_in || 3600,
                        };
                    } else {
                        // No accounts returned - log error (no fallback)
                        console.error(
                            '%c❌ No accounts returned from DerivWS endpoint (NOT falling back to ELITE)',
                            'color: red; font-weight: bold;',
                            { endpoint: 'derivatives/accounts' }
                        );
                        ErrorLogger.error('OAuth', 'No accounts returned from DerivWS endpoint');

                        return {
                            error: 'no_accounts_found',
                            error_description: 'No ZOOM accounts returned from API',
                        };
                    }
                } catch (error) {
                    console.error(
                        '%c❌ Error fetching accounts after token exchange (NOT falling back to ELITE)',
                        'color: red; font-weight: bold;',
                        error
                    );
                    ErrorLogger.error('OAuth', 'Error fetching accounts after token exchange', error);

                    // Return error status to caller for UI feedback
                    return {
                        error: 'account_fetch_failed',
                        error_description: `Failed to fetch ZOOM accounts: ${error instanceof Error ? error.message : String(error)}`,
                    };
                }
            }

            // If no token and no error (malformed response)
            console.error('%c❌ Malformed token response (no token, no error)', 'color: red; font-weight: bold;', {
                has_token: !!data.access_token,
                has_error: !!data.error,
                response_keys: Object.keys(data),
            });

            ErrorLogger.error('OAuth', 'Malformed token response - missing both token and error');

            return {
                error: 'malformed_response',
                error_description: 'Token exchange returned neither token nor error',
            };
        } catch (error: unknown) {
            ErrorLogger.error('OAuth', 'Token exchange network or parsing error', error);
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        } finally {
            AuthRoutingService.setRoutingInProgress(false);
        }
    }

    /**
     * Detect if the token belongs to an ELITE account by trying to use it with legacy API
     * ELITE accounts can be identified by attempting a call to legacy endpoints
     *
     * @param accessToken - Access token to test
     * @returns Promise with boolean - true if ELITE account detected
     */
    private static async detectEliteAccount(accessToken: string): Promise<boolean> {
        try {
            // Try to connect to legacy Deriv WebSocket with the access token
            // ELITE accounts will have valid accounts in the legacy system
            // This is a simple check - if WebSocket connection works with authorize,
            // it's an ELITE account

            const environment = isProduction() ? 'production' : 'staging';
            const derivws_url = brandConfig.platform.derivws.url[environment];

            // Try a quick check - if the token is recognized by ELITE system,
            // we can proceed. For now, we'll consider it ELITE if DerivWS fails.
            // The actual account data will be fetched when WebSocket initializes.

            ErrorLogger.info('OAuth', 'ELITE account detection: token will be validated via WebSocket authorize');

            // Return true - we'll let the WebSocket init handle the full validation
            return true;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error during ELITE account detection', error);
            return false;
        }
    }

    /**
     * Refresh access token using refresh token
     *
     * @param refreshToken - The refresh token
     * @returns Promise with token refresh response
     */
    static async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResponse> {
        try {
            const baseURL = this.getOAuth2BaseURL();
            const tokenEndpoint = `${baseURL}token`;

            const requestBody = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            });

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestBody.toString(),
            });

            const data: TokenExchangeResponse = await response.json();

            if (data.error) {
                ErrorLogger.error('OAuth', `Token refresh error: ${data.error}`, {
                    error: data.error,
                    description: data.error_description,
                });
                return {
                    error: data.error,
                    error_description: data.error_description,
                };
            }

            if (data.access_token) {
                // Update authentication info in sessionStorage
                const authInfo: AuthInfo = {
                    access_token: data.access_token,
                    token_type: data.token_type || 'bearer',
                    expires_in: data.expires_in || 3600,
                    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
                    scope: data.scope,
                };

                // Include refresh token if provided (or keep existing one)
                if (data.refresh_token) {
                    authInfo.refresh_token = data.refresh_token;
                } else {
                    // Keep the existing refresh token if new one not provided
                    const existingAuth = this.getAuthInfo();
                    if (existingAuth?.refresh_token) {
                        authInfo.refresh_token = existingAuth.refresh_token;
                    }
                }

                // Store updated auth info
                sessionStorage.setItem('auth_info', JSON.stringify(authInfo));
            }

            return data;
        } catch (error: unknown) {
            ErrorLogger.error('OAuth', 'Token refresh error', error);
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
