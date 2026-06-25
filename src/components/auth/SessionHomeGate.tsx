import { Navigate } from 'react-router-dom';
import { TAB_HASH_SEGMENTS } from '@/constants/bot-contents';
import { hasStoredSession } from '@/utils/auth-utils';

/** Resolves `/app#…` target from the current landing URL hash. */
export function resolveAppEntryFromLocation(): string {
    const hash = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    if (hash && (TAB_HASH_SEGMENTS as readonly string[]).includes(hash)) {
        return `/app#${hash}`;
    }
    return '/app#dashboard';
}

/**
 * Sends returning users with a stored session straight to the app instead of
 * rendering the marketing landing page first.
 */
export default function SessionHomeGate({ children }: { children: React.ReactNode }) {
    if (hasStoredSession()) {
        return <Navigate to={resolveAppEntryFromLocation()} replace />;
    }

    return <>{children}</>;
}
