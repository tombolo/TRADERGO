import { getAuthEnvironment } from '@/components/shared/utils/config/config';
import { isEliteSpecialCaseLoginId, isSpecialCaseLoginId, logSpecialAccountDebug } from '@/utils/account-helpers';
import brandConfig from '../../brand.config.json';

/**
 * Account information from derivatives/accounts endpoint
 */
export interface DerivAccount {
    account_id: string;
    balance: string;
    currency: string;
    group: string;
    status: string;
    account_type: 'demo' | 'real';
}

/**
 * Response from derivatives/accounts endpoint
 */
interface AccountsResponse {
    data: DerivAccount[];
}

/**
 * OTP response data (nested JSON string)
 */
interface OTPResponseData {
    url: string;
}

/**
 * Response from options/accounts/{accountId}/otp endpoint
 */
interface OTPResponse {
    data: OTPResponseData;
    // JSON string containing OTPResponseData
}

/**
 * Service for handling DerivWS account operations and WebSocket URL retrieval
 *
 * This service manages:
 * - Fetching account list from derivatives/accounts endpoint
 * - Storing accounts in sessionStorage
 * - Fetching OTP and WebSocket URL for specific accounts
 * - Managing default account selection
 * - Singleton pattern to prevent duplicate API calls
 * - Promise caching to handle concurrent requests
 */
export class DerivWSAccountsService {
    // Singleton instance for promise caching
    private static accountsFetchPromise: Promise<DerivAccount[]> | null = null;
    private static otpFetchPromises: Map<string, Promise<string>> = new Map();

    /**
     * Gets the DerivWS base URL based on environment
     * @returns DerivWS base URL (e.g., "https://api.derivws.com/trading/v1/")
     */
    private static getDerivWSBaseURL(): string {
        const environment = getAuthEnvironment();
        return brandConfig.platform.derivws.url[environment];
    }

    /**
     * Clears all cached promises (useful for testing or forced refresh)
     */
    static clearCache(): void {
        this.accountsFetchPromise = null;
        this.otpFetchPromises.clear();
    }

    /**
     * Stores accounts list in sessionStorage
     * @param accounts Array of DerivAccount objects
     */
    static storeAccounts(accounts: DerivAccount[]): void {
        sessionStorage.setItem('deriv_accounts', JSON.stringify(accounts));
    }

    /**
     * Retrieves accounts list from sessionStorage
     * @returns Array of DerivAccount objects or null if not found
     */
    static getStoredAccounts(): DerivAccount[] | null {
        try {
            const accountsStr = sessionStorage.getItem('deriv_accounts');
            if (!accountsStr) {
                return null;
            }
            return JSON.parse(accountsStr) as DerivAccount[];
        } catch (error) {
            console.error('[DerivWS] Error parsing stored accounts:', error);
            return null;
        }
    }

    /**
     * Gets the default account (first account from the list)
     * @returns DerivAccount object or null if no accounts available
     */
    static getDefaultAccount(): DerivAccount | null {
        const accounts = this.getStoredAccounts();
        if (!accounts || accounts.length === 0) {
            return null;
        }
        return accounts[0];
    }

    /**
     * Clears stored accounts from sessionStorage
     */
    static clearStoredAccounts(): void {
        sessionStorage.removeItem('deriv_accounts');
    }

    /**
     * Fetches accounts list from derivatives/accounts endpoint with singleton pattern
     * Prevents duplicate API calls by caching the promise
     * @param accessToken Bearer token from OAuth authentication
     * @returns Promise with array of DerivAccount objects
     */
    static async fetchAccountsList(accessToken: string): Promise<DerivAccount[]> {
        // If there's already a fetch in progress, return that promise
        if (this.accountsFetchPromise) {
            return this.accountsFetchPromise;
        }

        // Create new fetch promise and cache it
        this.accountsFetchPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const OptionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${OptionsDir}accounts`;

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
                }

                const data: AccountsResponse = await response.json();

                // Extract accounts array from nested data structure
                const accounts = data?.data || [];

                if (accounts.length === 0) {
                    console.warn('[DerivWS] No accounts found in response');
                }

                // Store accounts in sessionStorage for future use
                this.storeAccounts(accounts);

                return accounts;
            } catch (error) {
                console.error('[DerivWS] Error fetching accounts:', error);
                // Clear the cached promise on error so retry is possible
                this.accountsFetchPromise = null;
                throw error;
            } finally {
                // Clear the promise after completion (success or failure)
                // This allows fresh fetches on subsequent calls
                setTimeout(() => {
                    this.accountsFetchPromise = null;
                }, 100);
            }
        })();

        return this.accountsFetchPromise;
    }

    /**
     * Fetches OTP and WebSocket URL for a specific account with singleton pattern
     * Prevents duplicate OTP calls for the same account by caching the promise
     * @param accessToken Bearer token from OAuth authentication
     * @param accountId Account ID to get OTP for
     * @returns Promise with WebSocket URL
     */
    static async fetchOTPWebSocketURL(accessToken: string, accountId: string): Promise<string> {
        // Create a unique key for this account's OTP request
        const cacheKey = `${accountId}`;

        // If there's already a fetch in progress for this account, return that promise
        if (this.otpFetchPromises.has(cacheKey)) {
            return this.otpFetchPromises.get(cacheKey)!;
        }

        // Create new fetch promise and cache it
        const otpPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const optionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${optionsDir}accounts/${accountId}/otp`;

                logSpecialAccountDebug('derivws_otp_fetch_start', {
                    accountId,
                    endpoint,
                });

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch OTP: ${response.status} ${response.statusText}`);
                }

                const otpResponse: OTPResponse = await response.json();
                // Parse the nested JSON string
                const websocketURL = otpResponse.data.url;

                if (!websocketURL) {
                    throw new Error('WebSocket URL not found in OTP response');
                }

                logSpecialAccountDebug('derivws_otp_fetch_ok', {
                    accountId,
                    websocketURL,
                });
                return websocketURL;
            } catch (error) {
                logSpecialAccountDebug('derivws_otp_fetch_error', {
                    accountId,
                    error: error instanceof Error ? error.message : String(error),
                });
                console.error('[DerivWS] Error fetching OTP:', error);
                // Clear the cached promise on error so retry is possible
                this.otpFetchPromises.delete(cacheKey);
                throw error;
            } finally {
                // Clear the promise after completion (success or failure)
                // This allows fresh OTP fetches on subsequent calls
                setTimeout(() => {
                    this.otpFetchPromises.delete(cacheKey);
                }, 100);
            }
        })();

        this.otpFetchPromises.set(cacheKey, otpPromise);
        return otpPromise;
    }

    /**
     * Resets the demo balance for an Options (DOT) account via the REST API.
     * Endpoint: POST /trading/v1/options/accounts/{accountId}/reset-demo-balance
     * @param accessToken Bearer token from OAuth authentication
     * @param accountId DOT account ID whose demo balance should be reset to $10,000
     */
    static async resetDemoBalance(accessToken: string, accountId: string): Promise<void> {
        const baseURL = this.getDerivWSBaseURL();
        const optionsDir = brandConfig.platform.derivws.directories.options;
        const endpoint = `${baseURL}${optionsDir}accounts/${accountId}/reset-demo-balance`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const appId = ((globalThis as any).process?.env?.APP_ID as string | undefined) || '89928';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Deriv-App-ID': String(appId),
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let message = `Reset failed: ${response.status} ${response.statusText}`;
            try {
                const body = await response.json();
                message = body?.errors?.[0]?.message || message;
            } catch {
                // ignore JSON parse errors
            }
            throw new Error(message);
        }
    }

    /**
     * Complete flow to get authenticated WebSocket URL with optimized caching
     * 1. Check if accounts are already in sessionStorage (skip fetch on refresh)
     * 2. If not in storage, fetch accounts list
     * 3. Store accounts in sessionStorage
     * 4. Get default account (first from list)
     * 5. Fetch OTP and WebSocket URL for that account (always fresh OTP)
     *
     * @param accessToken Bearer token from OAuth authentication
     * @returns Promise with WebSocket URL
     */
    static async getAuthenticatedWebSocketURL(accessToken: string): Promise<string> {
        try {
            let accounts: DerivAccount[] | null = null;

            // Step 1: Check if accounts are already stored (optimization for refresh)
            const storedAccounts = this.getStoredAccounts();
            if (storedAccounts && storedAccounts.length > 0) {
                accounts = storedAccounts;
            } else {
                // Step 2: Fetch accounts list if not in storage
                accounts = await this.fetchAccountsList(accessToken);

                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts available');
                }
            }

            // Step 3: Resolve which account to connect as.
            // On an account switch the caller has already written the new loginid to
            // localStorage before triggering a WebSocket regeneration, so we honour
            // that selection here instead of always falling back to accounts[0].
            const activeLoginId = localStorage.getItem('active_loginid');
            let targetAccount: DerivAccount =
                (activeLoginId && accounts.find(a => a.account_id === activeLoginId)) || accounts[0];

            logSpecialAccountDebug('derivws_resolve_account_start', {
                activeLoginId,
                session_account_ids: accounts.map(a => a.account_id),
                initial_target: targetAccount.account_id,
                is_special_case: isSpecialCaseLoginId(activeLoginId),
            });

            // UI keeps active_loginid as a ROT special-case id while trades must run on the paired DOT wallet.
            // OTP / WebSocket URL is account-scoped — if we request ROT here, the session has ROT funds
            // and proposal/buy hits InsufficientBalance while the header shows demo-mapped balance.
            if (isSpecialCaseLoginId(activeLoginId)) {
                const dotAccounts = accounts.filter(a => a.account_id.startsWith('DOT'));
                const dotAccount = dotAccounts[0];
                if (dotAccount) {
                    logSpecialAccountDebug('derivws_switch_to_dot', {
                        activeLoginId,
                        selected_dot_account: dotAccount.account_id,
                        all_dot_accounts: dotAccounts.map(a => a.account_id),
                        previous_target: targetAccount.account_id,
                    });
                    targetAccount = dotAccount;
                } else {
                    logSpecialAccountDebug('derivws_switch_to_dot_skipped', {
                        activeLoginId,
                        reason: 'no_dot_account_in_session',
                        session_account_ids: accounts.map(a => a.account_id),
                    });
                }
            }
            if (isEliteSpecialCaseLoginId(activeLoginId)) {
                const vrtcAccount = accounts.find(a => a.account_id.startsWith('VRTC'));
                if (vrtcAccount) {
                    console.log(
                        '%c[ELITE_SPECIAL_CASE_LOGINID] DerivWS: CR real account detected — switching WebSocket session to paired VRTC demo',
                        'background:#006699;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
                        { activeLoginId, selected_vrtc_account: vrtcAccount.account_id }
                    );
                    targetAccount = vrtcAccount;
                }
            }

            // Step 4: Fetch OTP and WebSocket URL for the resolved account (always fresh OTP)
            logSpecialAccountDebug('derivws_final_target', {
                activeLoginId,
                otp_account_id: targetAccount.account_id,
                switched_from_rot: isSpecialCaseLoginId(activeLoginId) && targetAccount.account_id.startsWith('DOT'),
            });
            const websocketURL = await this.fetchOTPWebSocketURL(accessToken, targetAccount.account_id);
            return websocketURL;
        } catch (error) {
            console.error('[DerivWS] Error in authenticated WebSocket URL flow:', error);
            throw error;
        }
    }
}
