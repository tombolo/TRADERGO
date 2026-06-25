import React from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import RiskDisclaimer from '@/components/layout/footer/RiskDisclaimer';
import { BrandLogo } from '@/components/layout/app-logo/BrandLogo';
import { TAB_HASH_SEGMENTS } from '@/constants/bot-contents';
import { SITE_URL } from '@/constants/seo';
import { useApiBase } from '@/hooks/useApiBase';
import { useDerivAuthActions } from '@/hooks/useDerivAuthActions';
import { MarketTicker } from '@/pages/dashboard/market-ticker';
import { Localize, localize } from '@deriv-com/translations';
import './landing.scss';

type TTestimonial = {
    initials: string;
    name: string;
    role: string;
    quote: string;
    color: string;
};

const TESTIMONIALS: TTestimonial[] = [
    {
        initials: 'MW',
        name: 'Mercy Wanjiku',
        role: 'Step Index Trader — Kenya',
        quote: 'The free bots and analysis tools helped me structure trades without guessing every session.',
        color: '#bef264',
    },
    {
        initials: 'JK',
        name: 'James Kariuki',
        role: 'Volatility Trader — Nairobi',
        quote: 'Bulk Trader and the dashboard give me a focused workspace — exactly what I needed for Deriv.',
        color: '#67e8f9',
    },
    {
        initials: 'AN',
        name: 'Amina Ndlovu',
        role: 'Synthetic Indices — South Africa',
        quote: 'I load strategies fast, run them with confidence, and track results in one place.',
        color: '#fcd34d',
    },
    {
        initials: 'DO',
        name: 'David Ochieng',
        role: 'Even/Odd Specialist — Uganda',
        quote: 'Clean interface, live tick stats, and bot builder — this hub feels built for serious traders.',
        color: '#fda4af',
    },
    {
        initials: 'LT',
        name: 'Linet Tanui',
        role: 'Copy Trading — Tanzania',
        quote: 'From free bots to charts and analysis tools — everything is in one Deriv-focused workspace.',
        color: '#c4b5fd',
    },
];

const ChevronRight = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
        <path
            d='M6 3L11 8L6 13'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
);

const PulseIcon = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path d='M4 12H7L9 6L13 18L15 12H20' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
);

const BoltIcon = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
            d='M13 2L4 14H11L10 22L20 10H13L13 2Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinejoin='round'
        />
    </svg>
);

const hasStoredSession = (): boolean => {
    try {
        const loginid = localStorage.getItem('active_loginid');
        const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}') as Record<string, string>;
        return Boolean(loginid && accountsList[loginid]);
    } catch {
        return false;
    }
};

const LandingPage = observer(() => {
    const navigate = useNavigate();
    const { isAuthorized, activeLoginid } = useApiBase();
    const { handleLogin, handleSignup, isLoginLoading } = useDerivAuthActions();
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const testimonialsRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const hash = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
        if (hash && (TAB_HASH_SEGMENTS as readonly string[]).includes(hash)) {
            setIsRedirecting(true);
            navigate(`/app#${hash}`, { replace: true });
            return;
        }

        if (isAuthorized || activeLoginid || hasStoredSession()) {
            setIsRedirecting(true);
            navigate('/app#dashboard', { replace: true });
        }
    }, [isAuthorized, activeLoginid, navigate]);

    const scrollToTestimonials = () => {
        testimonialsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (isRedirecting) {
        return <div className='landing-page__redirecting'>{localize('Opening your dashboard...')}</div>;
    }

    const domain = SITE_URL.replace(/^https?:\/\//, '');

    return (
        <div className='landing-page'>
            <div className='landing-page__bg' aria-hidden='true' />

            <header className='landing-page__header'>
                <div className='landing-page__brand'>
                    <BrandLogo width={120} height={36} className='landing-page__logo' />
                    <div className='landing-page__brand-text'>
                        <div className='landing-page__wordmark'>
                            <span>DERIV ANALYSING </span>
                            <span className='landing-page__wordmark-accent'>HUB</span>
                        </div>
                        <span className='landing-page__powered'>
                            <Localize i18n_default_text='Powered by Deriv tools' />
                        </span>
                    </div>
                </div>

                <span className='landing-page__domain'>{domain}</span>

                <div className='landing-page__auth'>
                    <button
                        type='button'
                        className='landing-page__btn landing-page__btn--ghost'
                        onClick={handleLogin}
                        disabled={isLoginLoading}
                    >
                        {isLoginLoading ? localize('Signing in...') : localize('Log in')}
                    </button>
                    <button
                        type='button'
                        className='landing-page__btn landing-page__btn--primary'
                        onClick={handleSignup}
                        disabled={isLoginLoading}
                    >
                        <Localize i18n_default_text='Get Started' />
                    </button>
                </div>
            </header>

            <div className='landing-page__ticker-wrap'>
                <MarketTicker />
            </div>

            <section className='landing-page__hero'>
                <span className='landing-page__badge'>
                    <Localize i18n_default_text='Free Deriv bots, automation, and trading tools in one workspace' />
                </span>

                <h1 className='landing-page__title'>
                    <Localize i18n_default_text='Welcome to' />{' '}
                    <span className='landing-page__title-accent'>
                        <Localize i18n_default_text='Deriv Analysing Hub' />
                    </span>
                </h1>

                <p className='landing-page__subtitle'>
                    <Localize i18n_default_text='Structured trading, built for focus. Build, load, and run Deriv bot strategies from a focused workspace made for everyday traders.' />
                </p>

                <div className='landing-page__cta-row'>
                    <button
                        type='button'
                        className='landing-page__btn landing-page__btn--primary landing-page__btn--hero-primary'
                        onClick={handleLogin}
                        disabled={isLoginLoading}
                    >
                        <PulseIcon />
                        {isLoginLoading ? localize('Signing in...') : localize('Log in and Trade')}
                        <ChevronRight />
                    </button>
                    <button
                        type='button'
                        className='landing-page__btn landing-page__btn--hero-secondary'
                        onClick={handleSignup}
                        disabled={isLoginLoading}
                    >
                        <BoltIcon />
                        <Localize i18n_default_text='Create Free Account' />
                    </button>
                </div>

                <button type='button' className='landing-page__explore' onClick={scrollToTestimonials}>
                    <Localize i18n_default_text='Explore trader stories' /> ↓
                </button>
            </section>

            <section className='landing-page__testimonials' ref={testimonialsRef} aria-label={localize('Testimonials')}>
                <div className='landing-page__testimonials-track'>
                    {TESTIMONIALS.map(item => (
                        <article key={item.name} className='landing-page__card'>
                            <div className='landing-page__card-top'>
                                <span className='landing-page__avatar' style={{ background: item.color }}>
                                    {item.initials}
                                </span>
                                <div className='landing-page__card-meta'>
                                    <p className='landing-page__card-name'>{item.name}</p>
                                    <p className='landing-page__card-role'>{item.role}</p>
                                </div>
                            </div>
                            <div className='landing-page__stars' aria-label={localize('5 out of 5 stars')}>
                                ★★★★★
                            </div>
                            <p className='landing-page__quote'>{item.quote}</p>
                        </article>
                    ))}
                </div>
            </section>

            <RiskDisclaimer />
        </div>
    );
});

export default LandingPage;
