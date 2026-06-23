import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label='PROFIT SCOPE'>
            <span className='site-title__market'>PROFIT</span>
            <span className='site-title__hunter'>SCOPE</span>
        </span>
        <span className='site-title__tagline'>Elite Precision Trading</span>
    </div>
);
