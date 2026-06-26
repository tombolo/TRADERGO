import { useState } from 'react';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FaTelegram } from 'react-icons/fa6';
import { PARTNER_SIGNUP_URL } from '@/constants/oauth';
import './landing-banner.scss';

const SOCIALS = [
    {
        id: 'facebook',
        icon: <FaFacebook />,
        label: 'Facebook',
        href: 'https://www.facebook.com/profile.php?id=61583710623756',
        color: '#7aaad4',
        bg: 'rgba(122,170,212,0.12)',
    },
    {
        id: 'instagram',
        icon: <FaInstagram />,
        label: 'Instagram',
        href: 'https://www.instagram.com/kukenyanprince123?igsh=YzljYTk1ODg3Zg==',
        color: '#e8a96a',
        bg: 'rgba(232,169,106,0.12)',
    },
    {
        id: 'youtube',
        icon: <FaYoutube />,
        label: 'YouTube',
        href: 'https://youtube.com/@kukenyanprince254?si=y2x94mTmu30iN-SB',
        color: '#d96060',
        bg: 'rgba(217,96,96,0.12)',
    },
    {
        id: 'telegram',
        icon: <FaTelegram />,
        label: 'Telegram',
        href: 'https://t.me/ku_kenyanprince',
        color: '#c4703a',
        bg: 'rgba(196,112,58,0.12)',
    },
] as const;

const LandingBanner = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => setIsVisible(false), 450);
    };

    if (!isVisible) return null;

    return (
        <div className={`landing-banner${isClosing ? ' landing-banner--closing' : ''}`}>
            <div className='landing-banner__backdrop' onClick={handleClose} />

            <div className='landing-banner__card'>
                {/* Decorative ambient orbs */}
                <div className='landing-banner__orb landing-banner__orb--1' />
                <div className='landing-banner__orb landing-banner__orb--2' />
                <div className='landing-banner__orb landing-banner__orb--3' />

                <button className='landing-banner__close' onClick={handleClose} aria-label='Close banner'>
                    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                        <path d='M1 1L13 13M13 1L1 13' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                    </svg>
                </button>

                <div className='landing-banner__content'>
                    <div className='landing-banner__eyebrow'>
                        <span className='landing-banner__dot' />
                        LIVE COMMUNITY
                        <span className='landing-banner__dot' />
                    </div>

                    <h1 className='landing-banner__title'>
                        Join the <em>SMART DERIV</em>
                        <br />
                        Inner Circle
                    </h1>

                    <p className='landing-banner__subtitle'>
                        Follow us for live trade signals, strategy breakdowns,
                        <br />
                        and real-time market alerts from the community.
                    </p>

                    <div className='landing-banner__divider' />

                    <div className='landing-banner__socials'>
                        {SOCIALS.map(({ id, icon, label, href, color, bg }) => (
                            <a
                                key={id}
                                href={href}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='landing-banner__social'
                                style={
                                    {
                                        '--sc': color,
                                        '--sb': bg,
                                    } as React.CSSProperties
                                }
                            >
                                <span className='landing-banner__social-icon'>{icon}</span>
                                <span className='landing-banner__social-label'>{label}</span>
                            </a>
                        ))}
                    </div>

                    <div className='landing-banner__deriv'>
                        <div className='landing-banner__deriv-label'>
                            <svg
                                className='landing-banner__deriv-icon'
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='none'
                            >
                                <path
                                    d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
                                    fill='currentColor'
                                />
                            </svg>
                            Don&apos;t have a Deriv account?
                        </div>
                        <a
                            href={PARTNER_SIGNUP_URL}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='landing-banner__deriv-btn'
                        >
                            <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
                                <path
                                    d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z'
                                    fill='currentColor'
                                />
                            </svg>
                            <span>Create Free Account</span>
                            <svg
                                className='landing-banner__deriv-btn-arrow'
                                width='14'
                                height='14'
                                viewBox='0 0 16 16'
                                fill='none'
                            >
                                <path
                                    d='M3 8H13M13 8L9 4M13 8L9 12'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        </a>
                    </div>

                    <div className='landing-banner__footer'>
                        <button className='landing-banner__cta' onClick={handleClose}>
                            <span>Continue to App</span>
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                                <path
                                    d='M3 8H13M13 8L9 4M13 8L9 12'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingBanner;
