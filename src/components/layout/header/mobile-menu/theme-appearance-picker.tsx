import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import { LegacyThemeDarkIcon, LegacyThemeLightIcon } from '@deriv/quill-icons/Legacy';
import { Localize, useTranslations } from '@deriv-com/translations';

const ThemeAppearancePicker = observer(() => {
    const { localize } = useTranslations();
    const { is_dark_mode_on, applyDarkMode } = useThemeSwitcher();

    return (
        <div className='mobile-menu__theme-picker'>
            <p className='mobile-menu__theme-picker__title'>
                <Localize i18n_default_text='Appearance' />
            </p>
            <div
                className='mobile-menu__theme-picker__grid'
                role='group'
                aria-label={localize('Theme')}
            >
                <button
                    type='button'
                    className={clsx('mobile-menu__theme-option', 'mobile-menu__theme-option--light', {
                        'mobile-menu__theme-option--selected': !is_dark_mode_on,
                    })}
                    aria-pressed={!is_dark_mode_on}
                    aria-label={localize('Light theme')}
                    onClick={() => applyDarkMode(false)}
                >
                    <span className='mobile-menu__theme-option__icon-wrap' aria-hidden>
                        <LegacyThemeLightIcon iconSize='sm' />
                    </span>
                    <span className='mobile-menu__theme-option__label'>
                        <Localize i18n_default_text='Light' />
                    </span>
                    <span className='mobile-menu__theme-option__hint'>
                        <Localize i18n_default_text='Bright surfaces, crisp contrast' />
                    </span>
                </button>
                <button
                    type='button'
                    className={clsx('mobile-menu__theme-option', 'mobile-menu__theme-option--dark', {
                        'mobile-menu__theme-option--selected': is_dark_mode_on,
                    })}
                    aria-pressed={is_dark_mode_on}
                    aria-label={localize('Dark theme')}
                    onClick={() => applyDarkMode(true)}
                >
                    <span className='mobile-menu__theme-option__icon-wrap' aria-hidden>
                        <LegacyThemeDarkIcon iconSize='sm' />
                    </span>
                    <span className='mobile-menu__theme-option__label'>
                        <Localize i18n_default_text='Dark' />
                    </span>
                    <span className='mobile-menu__theme-option__hint'>
                        <Localize i18n_default_text='Easier on the eyes in low light' />
                    </span>
                </button>
            </div>
        </div>
    );
});

export default ThemeAppearancePicker;
