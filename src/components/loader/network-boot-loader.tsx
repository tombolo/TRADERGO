import { useEffect, useState } from 'react';
import { SITE_NAME } from '@/constants/seo';
import './network-boot-loader.scss';

let hasNetworkBootLoaderEntered = false;

type NetworkBootLoaderProps = {
    message?: string;
    hint?: string;
};

export default function NetworkBootLoader({ message, hint }: NetworkBootLoaderProps) {
    const [shouldAnimateEntry] = useState(() => !hasNetworkBootLoaderEntered);
    const [progress, setProgress] = useState(12);

    useEffect(() => {
        hasNetworkBootLoaderEntered = true;
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setProgress(current => {
                if (current >= 92) return current;
                const step = 2 + Math.random() * 6;
                return Math.min(92, current + step);
            });
        }, 420);

        return () => window.clearInterval(interval);
    }, []);

    const displayProgress = Math.round(progress);

    return (
        <div
            className={`network-boot ${shouldAnimateEntry ? 'network-boot--entry' : ''}`}
            role='status'
            aria-live='polite'
            aria-busy='true'
            aria-label={message || 'Loading trading platform'}
            data-testid='dt_network_boot_loader'
        >
            <div className='network-boot__bg' aria-hidden />

            <div className='network-boot__panel'>
                <h1 className='network-boot__brand'>{SITE_NAME}</h1>
                <p className='network-boot__tagline'>Trading Workspace</p>

                <div className='network-boot__dots' aria-hidden>
                    <span className='network-boot__dot' />
                    <span className='network-boot__dot' />
                    <span className='network-boot__dot' />
                </div>

                <p className='network-boot__status'>{message || 'Loading your Deriv accounts...'}</p>
                {hint && <p className='network-boot__hint'>{hint}</p>}

                <div className='network-boot__progress-wrap'>
                    <div className='network-boot__progress-bar' aria-hidden>
                        <div
                            className='network-boot__progress-fill'
                            style={{ width: `${displayProgress}%` }}
                        />
                    </div>
                    <div className='network-boot__progress-meta'>
                        <span>Boot sequence</span>
                        <span>{displayProgress}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
