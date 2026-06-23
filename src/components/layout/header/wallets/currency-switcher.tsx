import React, { useEffect } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { FlagKenyaIcon, FlagUsaIcon } from '@deriv/quill-icons/Flags';
import { useStore } from '@/hooks/useStore';
import type { TDisplayCurrency } from '@/utils/currency-display';

import './currency-switcher.scss';

interface CurrencySwitcherProps {
    /** Active trading account ISO currency — used only when session has no saved preference yet. */
    originalCurrency: string;
    variant?: 'inline' | 'in-app-header';
    className?: string;
}

const CurrencySwitcher: React.FC<CurrencySwitcherProps> = observer(({ originalCurrency, variant, className }) => {
    const { ui } = useStore();

    useEffect(() => {
        ui.seedAppDisplayCurrencyFromAccount(originalCurrency);
    }, [originalCurrency, ui]);

    const displayCurrency = ui.app_display_currency;

    const handleSelect = (next: TDisplayCurrency, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        ui.setAppDisplayCurrency(next);
    };

    return (
        <div
            className={clsx(
                'currency-switcher-toggle',
                variant === 'inline' && 'currency-switcher-toggle--inline',
                variant === 'in-app-header' && 'currency-switcher-toggle--in-app-header',
                className
            )}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role='presentation'
        >
            <button
                type='button'
                className={[
                    'currency-switcher-toggle__btn',
                    'currency-switcher-toggle__btn--ksh',
                    displayCurrency === 'KSH' ? 'currency-switcher-toggle__btn--active' : '',
                ].join(' ')}
                aria-pressed={displayCurrency === 'KSH'}
                onClick={e => handleSelect('KSH', e)}
                title='Switch to KSH'
                aria-label='Switch to Kenyan Shilling'
            >
                <span className='currency-switcher-toggle__icon currency-switcher-toggle__icon--flag'>
                    <span className='round-country-flag' aria-hidden>
                        <FlagKenyaIcon iconSize='md' />
                    </span>
                </span>
                <span className='currency-switcher-toggle__text'>KSH</span>
            </button>

            <button
                type='button'
                className={[
                    'currency-switcher-toggle__btn',
                    'currency-switcher-toggle__btn--usd',
                    displayCurrency === 'USD' ? 'currency-switcher-toggle__btn--active' : '',
                ].join(' ')}
                aria-pressed={displayCurrency === 'USD'}
                onClick={e => handleSelect('USD', e)}
                title='Switch to USD'
                aria-label='Switch to US Dollar'
            >
                <span className='currency-switcher-toggle__icon currency-switcher-toggle__icon--flag'>
                    <span className='round-country-flag' aria-hidden>
                        <FlagUsaIcon iconSize='md' />
                    </span>
                </span>
                <span className='currency-switcher-toggle__text'>USD</span>
            </button>
        </div>
    );
});

export default CurrencySwitcher;
