// Updated to use brand configuration from brand.config.json
// Logo is now customizable for white-labeling
import brandConfig from '@/../brand.config.json';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { BrandLogo } from './BrandLogo';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    // Get logo configuration from brand.config.json
    const logoConfig = brandConfig.platform.logo;
    const logoUrl = logoConfig.link_url || '/';

    return (
        <a href={logoUrl} className='app-header__logo' aria-label={localize('Home')}>
            <BrandLogo
                width={isDesktop ? 280 : 180}
                height={isDesktop ? 56 : 40}
                className='app-header__logo-img'
            />
        </a>
    );
};
