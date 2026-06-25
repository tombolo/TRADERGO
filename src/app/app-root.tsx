import { lazy, Suspense, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import NetworkBootLoader from '@/components/loader/network-boot-loader';
import { api_base } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import './app-root.scss';

const AppContent = lazy(() => import('./app-content'));

const AppRootLoader = () => (
    <NetworkBootLoader message={localize('Loading...')} hint={localize('Initializing secure API connection…')} />
);

const ErrorComponentWrapper = observer(() => {
    const { common } = useStore();

    if (!common.error) return null;

    return (
        <ErrorComponent
            header={common.error?.header}
            message={common.error?.message}
            redirect_label={common.error?.redirect_label}
            redirectOnClick={common.error?.redirectOnClick}
            should_clear_error_on_click={common.error?.should_clear_error_on_click}
            setError={common.setError}
            redirect_to={common.error?.redirect_to}
            should_redirect={common.error?.should_redirect}
        />
    );
});

const AppRoot = () => {
    const store = useStore();
    const initStarted = useRef(false);

    useEffect(() => {
        if (initStarted.current) return;
        initStarted.current = true;

        const oauthJustCompleted = sessionStorage.getItem('oauth_just_completed');
        const maxAttempts = oauthJustCompleted ? 3 : 1;

        const initializeApi = async () => {
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    if (attempt > 0) {
                        const { clearDerivApiInstance } = await import('@/external/bot-skeleton/services/api/appId');
                        clearDerivApiInstance();
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } else if (oauthJustCompleted) {
                        const { clearDerivApiInstance } = await import('@/external/bot-skeleton/services/api/appId');
                        clearDerivApiInstance();
                    }

                    await api_base.init(attempt > 0);
                    break;
                } catch (error) {
                    console.error(`API initialization failed (attempt ${attempt + 1}/${maxAttempts}):`, error);
                    if (attempt === maxAttempts - 1) {
                        break;
                    }
                }
            }
        };

        void initializeApi();
    }, []);

    if (!store) return <AppRootLoader />;

    return (
        <Suspense fallback={<AppRootLoader />}>
            <ErrorBoundary root_store={store}>
                <ErrorComponentWrapper />
                <AppContent />
            </ErrorBoundary>
        </Suspense>
    );
};

export default AppRoot;
