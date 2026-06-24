import { ComponentProps } from 'react';
import { LabelPairedGlobeSmRegularIcon } from '@deriv/quill-icons';
import { useTranslations } from '@deriv-com/translations';
import { Text, useDevice } from '@deriv-com/ui';

type TMenuHeader = {
    hideLanguageSetting: boolean;
    openLanguageSetting: ComponentProps<'button'>['onClick'];
};

const MenuHeader = ({ hideLanguageSetting, openLanguageSetting }: TMenuHeader) => {
    const { currentLang, localize } = useTranslations();
    const { isDesktop } = useDevice();

    return (
        <div className='mobile-menu__header'>
            <div className='mobile-menu__header__title'>
                <span className='mobile-menu__header__title-main'>TRADER GO</span>
                <span className='mobile-menu__header__title-sub'>Trading Platform</span>
            </div>

            {!hideLanguageSetting && (
                <button
                    className='mobile-menu__header__language items-center'
                    onClick={openLanguageSetting}
                    aria-label={`${localize('Change language')} - ${localize('Current language')}: ${currentLang}`}
                    aria-expanded='false'
                    aria-haspopup='menu'
                >
                    <LabelPairedGlobeSmRegularIcon />
                    <Text className='ml-[0.4rem]' size={isDesktop ? 'xs' : 'sm'} weight='bold'>
                        {currentLang}
                    </Text>
                </button>
            )}
        </div>
    );
};

export default MenuHeader;
