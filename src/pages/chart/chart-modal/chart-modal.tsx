import { Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { OrbitDotsLoaderSuspenseFallback } from '@/components/loader/orbit-dots-loader';
import { useDevice } from '@deriv-com/ui';
import ChartModalDesktop from './chart-modal-desktop';

export const ChartModal = observer(() => {
    const { isDesktop } = useDevice();
    return <Suspense fallback={<OrbitDotsLoaderSuspenseFallback />}>{isDesktop && <ChartModalDesktop />}</Suspense>;
});

export default ChartModal;
