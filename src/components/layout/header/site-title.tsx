import { SITE_NAME } from '@/constants/seo';
import './site-title.scss';

const [brandPrimary, brandAccent] = SITE_NAME.split(' ');

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label={SITE_NAME}>
            <span className='site-title__market'>{brandPrimary}</span>
            <span className='site-title__hunter'>{brandAccent}</span>
        </span>
        <span className='site-title__tagline'>Trader Go Tools</span>
    </div>
);
