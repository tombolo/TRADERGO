/**
 * Get the current auth system (ELITE or ZOOM)
 * Checks sessionStorage first, then falls back to localStorage (for domain changes)
 * @returns 'ELITE' | 'ZOOM' - defaults to 'ZOOM' if not set
 */
export function getAuthSystem(): 'ELITE' | 'ZOOM' {
    // Check sessionStorage first (current session)
    const sessionValue = sessionStorage.getItem('auth_system');
    if (sessionValue === 'ELITE' || sessionValue === 'ZOOM') {
        return sessionValue;
    }

    // Fall back to localStorage (persists across domain changes during OAuth flow)
    const localValue = localStorage.getItem('auth_system');
    if (localValue === 'ELITE') {
        // Restore to sessionStorage for this session
        sessionStorage.setItem('auth_system', 'ELITE');
        return 'ELITE';
    }

    return 'ZOOM';
}

/**
 * Check if current account is ELITE (old system)
 * @returns true if using ELITE auth system
 */
export function isEliteAccount(): boolean {
    return getAuthSystem() === 'ELITE';
}

/**
 * Check if current account is ZOOM (new system)
 * @returns true if using ZOOM auth system
 */
export function isZoomAccount(): boolean {
    return getAuthSystem() === 'ZOOM';
}

/**
 * Set the auth system for current session
 * @param system - 'ELITE' or 'ZOOM'
 */
export function setAuthSystem(system: 'ELITE' | 'ZOOM'): void {
    sessionStorage.setItem('auth_system', system);
}

/**
 * Clear the auth system from session
 */
export function clearAuthSystem(): void {
    sessionStorage.removeItem('auth_system');
}

/**
 * Get account type metadata stored during detection
 * Checks sessionStorage first, then falls back to localStorage (for domain changes)
 * @returns Account type metadata object or null
 */
export function getAccountTypeMetadata(): any {
    try {
        // Check sessionStorage first (current session)
        let metadata = sessionStorage.getItem('account_type_metadata');

        // Fall back to localStorage (persists across domain changes during OAuth flow)
        if (!metadata) {
            metadata = localStorage.getItem('account_type_metadata');
            if (metadata) {
                // Restore to sessionStorage for this session
                sessionStorage.setItem('account_type_metadata', metadata);
            }
        }

        return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
        console.error('Error parsing account_type_metadata', error);
        return null;
    }
}

/**
 * Store account type metadata
 * @param metadata - Account type detection result
 */
export function setAccountTypeMetadata(metadata: any): void {
    sessionStorage.setItem('account_type_metadata', JSON.stringify(metadata));
}
