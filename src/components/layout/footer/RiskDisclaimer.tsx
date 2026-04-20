import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslations } from '@deriv-com/translations';
import { LegacyClose1pxIcon, LegacyWarningIcon } from '@deriv/quill-icons/Legacy';
import Text from '@/components/shared_ui/text';
import Button from '@/components/shared_ui/button';
import './risk-disclaimer.scss';

const RiskDisclaimer = () => {
    const { localize } = useTranslations();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const modal_root = typeof document !== 'undefined' ? document.getElementById('modal_root') : null;

    const modal =
        isOpen &&
        modal_root &&
        ReactDOM.createPortal(
            <div
                className='risk-disclaimer-overlay'
                role='dialog'
                aria-modal='true'
                aria-labelledby='risk-disclaimer-title'
                onClick={() => setIsOpen(false)}
            >
                <div className='risk-disclaimer-container' onClick={e => e.stopPropagation()}>
                    <div className='risk-disclaimer-container__accent' aria-hidden />
                    <div className='risk-disclaimer-container__header'>
                        <div className='risk-disclaimer-container__header-main'>
                            <span className='risk-disclaimer-container__header-icon-wrap' aria-hidden>
                                <LegacyWarningIcon className='risk-disclaimer-container__header-icon' />
                            </span>
                            <Text
                                as='h2'
                                id='risk-disclaimer-title'
                                weight='bold'
                                className='risk-disclaimer-container__title'
                            >
                                {localize('Risk Disclaimer')}
                            </Text>
                        </div>
                        <button
                            type='button'
                            className='risk-disclaimer-container__close'
                            onClick={() => setIsOpen(false)}
                            aria-label={localize('Close')}
                        >
                            <LegacyClose1pxIcon
                                height='20px'
                                width='20px'
                                fill='currentColor'
                                className='icon-general-fill-path'
                            />
                        </button>
                    </div>
                    <div className='risk-disclaimer-container__body'>
                        <p className='risk-disclaimer-container__lead'>
                            {localize(
                                'Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk.'
                            )}
                        </p>
                        <h3 className='risk-disclaimer-container__section-title'>
                            {localize('Please ensure you understand these risks:')}
                        </h3>
                        <ul className='risk-disclaimer-container__risk-list'>
                            <li>{localize('You may lose some or all of your invested capital')}</li>
                            <li>{localize('Currency conversion affects your profit/loss')}</li>
                            <li>{localize('Markets can be volatile and unpredictable')}</li>
                        </ul>
                        <div className='risk-disclaimer-container__callout' role='note'>
                            {localize('Important: Never trade with borrowed money or funds you cannot afford to lose.')}
                        </div>
                        <p className='risk-disclaimer-container__closing'>
                            {localize(
                                'By continuing, you confirm that you understand these risks and that you are aware that Deriv does not provide investment advice.'
                            )}
                        </p>
                    </div>
                    <div className='risk-disclaimer-container__footer'>
                        <Button
                            has_effect
                            className='risk-disclaimer-container__submit'
                            text={localize('Close')}
                            onClick={() => setIsOpen(false)}
                            primary
                            large
                        />
                    </div>
                </div>
            </div>,
            modal_root
        );

    return (
        <>
            <button type='button' className='risk-disclaimer-trigger' onClick={() => setIsOpen(true)}>
                {localize('Risk Disclaimer')}
            </button>
            {modal}
        </>
    );
};

export default RiskDisclaimer;
