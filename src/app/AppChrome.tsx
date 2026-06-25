import AIButton from '@/components/ai-button/AIButton';
import RiskDisclaimer from '@/components/layout/footer/RiskDisclaimer';
import Layout from '@/components/layout';

/** Trading app shell: header, main outlet, footer, global widgets. */
const AppChrome = () => (
    <>
        <Layout />
        <RiskDisclaimer />
        <AIButton />
    </>
);

export default AppChrome;
