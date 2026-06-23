import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import './login-disclaimer.scss';

const ZuriSmall = () => (
    <svg viewBox='0 0 120 140' className='zuri-small' xmlns='http://www.w3.org/2000/svg'>
        {/* Head */}
        <circle cx='60' cy='45' r='25' fill='#FFD700' strokeWidth='1.5' stroke='#FFA500' />

        {/* Eyes */}
        <circle cx='52' cy='40' r='3.5' fill='#000' />
        <circle cx='68' cy='40' r='3.5' fill='#000' />
        <circle cx='53' cy='39' r='1.2' fill='#fff' />
        <circle cx='69' cy='39' r='1.2' fill='#fff' />

        {/* Smile */}
        <path d='M 52 48 Q 60 53 68 48' stroke='#000' strokeWidth='1.2' fill='none' strokeLinecap='round' />

        {/* Blush */}
        <circle cx='44' cy='44' r='2.5' fill='#FF69B4' opacity='0.6' />
        <circle cx='76' cy='44' r='2.5' fill='#FF69B4' opacity='0.6' />

        {/* Body */}
        <rect x='45' y='72' width='30' height='28' rx='6' fill='#FF6B9D' strokeWidth='1.5' stroke='#FF1493' />

        {/* Arms */}
        <rect x='28' y='78' width='17' height='12' rx='6' fill='#FFD700' strokeWidth='1.5' stroke='#FFA500' />
        <rect x='75' y='78' width='17' height='12' rx='6' fill='#FFD700' strokeWidth='1.5' stroke='#FFA500' />

        {/* Star crown */}
        <polygon points='60,15 64,28 78,28 68,36 72,49 60,41 48,49 52,36 42,28 56,28' fill='#FF1493' />
    </svg>
);

const LoginDisclaimer = observer(() => {
    const { client } = useStore();
    const [isVisible, setIsVisible] = useState(() => !client?.is_logged_in);

    useEffect(() => {
        // Show the container only when the user is NOT logged in (logged out, no session)
        const shouldShow = !client?.is_logged_in;
        setIsVisible(shouldShow);

        console.log('[LoginDisclaimer] State updated:', {
            is_logged_in: client?.is_logged_in,
            shouldShow,
            clientStore: !!client,
        });
    }, [client?.is_logged_in]);

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className='login-disclaimer-notice'>
            <div className='login-disclaimer-notice__icon'>
                <ZuriSmall />
            </div>

            <div className='login-disclaimer-notice__content'>
                <h3 className='login-disclaimer-notice__title'>{localize('Choose Your Login Method')}</h3>
                <p className='login-disclaimer-notice__text'>
                    {localize('Legacy Users')} → {localize('Use legacy login')} |
                    <span className='login-disclaimer-notice__divider' />
                    {localize('New Users')} → {localize('Use new API')}
                </p>
            </div>

            <button
                className='login-disclaimer-notice__close'
                onClick={handleClose}
                aria-label='Close notice'
                type='button'
            >
                ✕
            </button>
        </div>
    );
});

export default LoginDisclaimer;
