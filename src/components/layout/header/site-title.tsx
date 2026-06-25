import { SITE_NAME } from '@/constants/seo';
import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label={SITE_NAME}>
            <span className='site-title__market'>SMART</span>
            <span className='site-title__hunter'>TRADERS</span>
        </span>
        <span className='site-title__tagline'>Smart Trading Tools</span>
    </div>
);
