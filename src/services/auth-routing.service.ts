import { setAuthSystem } from '@/utils/auth-system-helpers';
import { DerivAccount } from './derivws-accounts.service';

export type AuthRoute = 'ELITE' | 'ZOOM' | 'UNKNOWN';

export class AuthRoutingService {
    private static readonly ROUTING_FLAG_KEY = 'auth_routing_in_progress';

    static setRoutingInProgress(isInProgress: boolean): void {
        if (isInProgress) {
            sessionStorage.setItem(this.ROUTING_FLAG_KEY, 'true');
        } else {
            sessionStorage.removeItem(this.ROUTING_FLAG_KEY);
        }
    }

    static isRoutingInProgress(): boolean {
        return sessionStorage.getItem(this.ROUTING_FLAG_KEY) === 'true';
    }

    static detectRouteFromAccounts(accounts: DerivAccount[]): AuthRoute {
        const accountIds = (accounts || []).map(account => account.account_id).filter(Boolean);
        console.log('%c🧭 [AuthRouting] Account list received:', 'color: #5C2A9D; font-weight: bold;', {
            count: accountIds.length,
            account_ids: accountIds,
        });

        if (accountIds.length === 0) {
            console.warn('%c⚠️ [AuthRouting] No accounts returned - route UNKNOWN', 'color: orange;');
            return 'UNKNOWN';
        }

        const hasElitePattern = accountIds.some(
            accountId => accountId.startsWith('CR') || accountId.startsWith('VRTC')
        );
        const detectedRoute: AuthRoute = hasElitePattern ? 'ELITE' : 'ZOOM';

        console.log('%c✅ [AuthRouting] Route detected:', 'color: #5C2A9D; font-weight: bold;', {
            route: detectedRoute,
            hasElitePattern,
        });

        return detectedRoute;
    }

    static applyDetectedRoute(route: AuthRoute): void {
        if (route === 'ELITE') {
            setAuthSystem('ELITE');
            localStorage.setItem('auth_system', 'ELITE');
            return;
        }

        if (route === 'ZOOM') {
            setAuthSystem('ZOOM');
            localStorage.setItem('auth_system', 'ZOOM');
        }
    }
}
