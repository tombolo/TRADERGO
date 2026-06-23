import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label='SOFT TRADES'>
            <span className='site-title__market'>SOFT</span>
            <span className='site-title__hunter'>TRADES</span>
        </span>
        <span className='site-title__tagline'>Elite Precision Trading</span>
    </div>
);
