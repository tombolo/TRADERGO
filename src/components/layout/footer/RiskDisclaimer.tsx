import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTranslations } from '@deriv-com/translations';
import { LegacyClose1pxIcon, LegacyWarningIcon } from '@deriv/quill-icons/Legacy';
import Text from '@/components/shared_ui/text';
import Button from '@/components/shared_ui/button';
import './risk-disclaimer.scss';

const RiskDisclaimer = () => {
    const { localize } = useTranslations();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);
    const initialButtonPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleDragStart = (clientX: number, clientY: number) => {
        if (triggerRef.current) {
            hasDragged.current = false;
            const rect = triggerRef.current.getBoundingClientRect();
            dragStartPos.current = { x: clientX, y: clientY };
            initialButtonPos.current = { x: position.x, y: position.y };
            setDragOffset({
                x: clientX - rect.left,
                y: clientY - rect.top,
            });
            setIsDragging(true);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        handleDragStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        if (e.touches.length > 0) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
            if (!isDragging) return;

            const moveDistance = Math.sqrt(
                Math.pow(clientX - dragStartPos.current.x, 2) + Math.pow(clientY - dragStartPos.current.y, 2)
            );

            if (moveDistance > 5) {
                hasDragged.current = true;
            }

            const deltaX = clientX - dragStartPos.current.x;
            const deltaY = clientY - dragStartPos.current.y;

            setPosition({
                x: initialButtonPos.current.x + deltaX,
                y: initialButtonPos.current.y + deltaY,
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleEnd);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleEnd);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleEnd);
            };
        }
    }, [isDragging]);

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
            <button
                ref={triggerRef}
                type='button'
                className='risk-disclaimer-trigger'
                onClick={() => {
                    if (!hasDragged.current) {
                        setIsOpen(true);
                    }
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {localize('Risk Disclaimer')}
            </button>
            {modal}
        </>
    );
};

export default RiskDisclaimer;
