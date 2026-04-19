/**
 * Utility functions for authentication-related operations
 */
import { getLoginId } from '@/external/bot-skeleton/services/api/appId';

/**
 * Transforms transaction IDs for display when CR9742993 is the active account.
 * For this special account, the displayed ID in the run panel journal should start with 147.
 * @param transaction_id - The transaction ID to transform
 * @returns The transformed transaction ID (or original if no transformation needed)
 */
export const transformTransactionIdForDisplay = (
    transaction_id: number | string | undefined
): number | string | undefined => {
    if (!transaction_id) return transaction_id;

    const active_loginid = getLoginId();

    // Only transform if CR9742993 is active: displayed ID must start with 147
    if (active_loginid === 'CR9742993') {
        const idString = String(transaction_id);
        const idNum = typeof transaction_id === 'string' ? parseInt(transaction_id, 10) : transaction_id;

        if (!isNaN(idNum) && idString.length > 0) {
            const transformedId = `147${idString.slice(3)}`;
            return transformedId.length > 0 ? parseInt(transformedId, 10) : 147;
        }
    }

    return transaction_id;
};

/**
 * Clears authentication data from local storage and reloads the page
 */
export const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('client.country');
    localStorage.removeItem('account_type'); // Clear account type when clearing auth data
    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('callback_token');
};
