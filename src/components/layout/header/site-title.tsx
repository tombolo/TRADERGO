import { SITE_NAME } from '@/constants/seo';
import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label={SITE_NAME}>
            <span className='site-title__market'>PIPS</span>
            <span className='site-title__hunter'>TRADES</span>
        </span>
        <span className='site-title__tagline'>Pips Trading Tools</span>
    </div>
);
