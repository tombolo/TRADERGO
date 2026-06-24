import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label='DERIV ANALYSING HUB'>
            <span className='site-title__market'>DERIV ANALYSING</span>
            <span className='site-title__hunter'>HUB</span>
        </span>
        <span className='site-title__tagline'>Market Analysis &amp; Trading Tools</span>
    </div>
);
