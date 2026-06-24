import './site-title.scss';

/**
 * Desktop brand wordmark — sits beside the logo in the header.
 */
export const SiteTitle = () => (
    <div className='site-title'>
        <span className='site-title__wordmark' aria-label='TRADER GO'>
            <span className='site-title__market'>TRADER</span>
            <span className='site-title__hunter'>GO</span>
        </span>
        <span className='site-title__tagline'>Elite Precision Trading</span>
    </div>
);
