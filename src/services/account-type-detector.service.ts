import { ErrorLogger } from '@/utils/error-logger';

/**
 * Result from account type detection
 */
export interface DetectionResult {
    accountType: 'ELITE' | 'ZOOM';
    loginid: string;
    currency: string;
    isVirtual: boolean;
}

/**
 * Service for detecting whether an account belongs to the old ELITE system
 * or the new ZOOM system based on the authorize response structure
 *
 * Detection logic:
 * - ELITE accounts have rich account data with fields like: account_category, broker, created_at, landing_company_name
 * - ZOOM accounts have minimal account data with only: balance, currency, is_virtual, loginid
 */
export class AccountTypeDetectorService {
    /**
     * Detects if an account belongs to old (ELITE) or new (ZOOM) system
     * by inspecting the authorize response structure
     *
     * @param authorizeResponse - Response from authorize endpoint
     * @returns DetectionResult with accountType and basic account info
     * @throws Error if no account found in response
     */
    static detectAccountType(authorizeResponse: any): DetectionResult {
        try {
            console.log(
                '%c🔎 AccountTypeDetector: Analyzing authorize response...',
                'color: purple;',
                authorizeResponse
            );

            const firstAccount = authorizeResponse?.authorize?.account_list?.[0];

            if (!firstAccount) {
                console.warn('%c⚠️  No account found in authorize response', 'color: purple;');
                throw new Error('No account found in authorize response');
            }

            console.log('%c📋 First account from response:', 'color: purple;', firstAccount);

            // Check for ELITE-specific fields
            // ELITE accounts have these fields, ZOOM accounts don't
            const hasAccountCategory = firstAccount.account_category !== undefined;
            const hasBroker = firstAccount.broker !== undefined;
            const hasCreatedAt = firstAccount.created_at !== undefined;
            const hasLandingCompany = firstAccount.landing_company_name !== undefined;

            console.log('%c🏷️  Account field analysis:', 'color: purple;', {
                hasAccountCategory,
                hasBroker,
                hasCreatedAt,
                hasLandingCompany,
            });

            const isELITE = hasAccountCategory || hasBroker || hasCreatedAt || hasLandingCompany;

            const result: DetectionResult = {
                accountType: isELITE ? 'ELITE' : 'ZOOM',
                loginid: firstAccount.loginid,
                currency: firstAccount.currency || 'USD',
                isVirtual: Boolean(firstAccount.is_virtual),
            };

            console.log(
                `%c✅ Account Type Confirmed: ${result.accountType}`,
                isELITE
                    ? 'color: #FF6B00; font-weight: bold; font-size: 13px;'
                    : 'color: green; font-weight: bold; font-size: 13px;',
                {
                    loginid: result.loginid,
                    currency: result.currency,
                    isVirtual: result.isVirtual,
                }
            );

            ErrorLogger.info('AccountTypeDetector', `Account detected as: ${result.accountType}`, {
                loginid: result.loginid,
                currency: result.currency,
                isVirtual: result.isVirtual,
            });

            return result;
        } catch (error) {
            console.error('%c❌ AccountTypeDetector error:', 'color: red;', error);
            ErrorLogger.error('AccountTypeDetector', 'Error detecting account type', error);
            throw error;
        }
    }

    /**
     * Converts ELITE account format to ZOOM DerivAccount format for UI consistency
     *
     * @param eliteAccounts - Array of ELITE account objects
     * @returns Array of accounts in ZOOM DerivAccount format
     */
    static convertEliteAccountsToZoomFormat(eliteAccounts: any[]): any[] {
        try {
            return eliteAccounts.map(account => ({
                account_id: account.loginid,
                balance: account.balance?.toString() || '0',
                currency: account.currency || 'USD',
                group: account.landing_company_name || 'default',
                status: account.is_disabled ? 'disabled' : 'active',
                account_type: account.is_virtual ? 'demo' : 'real',
            }));
        } catch (error) {
            ErrorLogger.error('AccountTypeDetector', 'Error converting ELITE accounts to ZOOM format', error);
            throw error;
        }
    }
}
