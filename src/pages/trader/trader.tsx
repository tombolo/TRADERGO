import React, { useEffect, useState, useCallback, useRef } from 'react';
import './trader.scss';

interface ClientAccount {
    [key: string]: {
        currency?: string;
        // Add other account properties as needed
    };
}

interface DTraderAutoLoginProps {
    dtraderUrl?: string;
    appId?: number;
    defaultSymbol?: string;
}

const DTraderAutoLogin: React.FC<DTraderAutoLoginProps> = ({
    dtraderUrl = 'https://deriv-dtrader.vercel.app/dtrader',
    appId = 114793,
    defaultSymbol = '1HZ100V',
}) => {
    const [iframeSrc, setIframeSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const authCheckInterval = useRef<NodeJS.Timeout>();

    const validateDtraderUrl = (url: string): boolean => {
        try {
            const { hostname } = new URL(url);
            // Add your trusted domains here
            const trustedDomains = ['deriv-dta.vercel.app', 'deriv.com', 'deriv-dtrader.vercel.app'];
            return trustedDomains.some(domain => hostname.endsWith(domain));
        } catch {
            return false;
        }
    };

    const buildIframeUrl = useCallback(
        (token: string, loginId: string) => {
            if (!validateDtraderUrl(dtraderUrl)) {
                setError('Invalid DTrader URL');
                setIsLoading(false);
                return;
            }

            try {
                const clientAccountsStr = localStorage.getItem('clientAccounts') || '{}';
                let currency = 'USD';

                try {
                    const clientAccounts: ClientAccount = JSON.parse(clientAccountsStr);
                    if (clientAccounts[loginId]?.currency) {
                        currency = clientAccounts[loginId].currency!;
                    }
                } catch (error) {
                    console.error('Error parsing client accounts:', error);
                    setError('Error loading account information');
                }

                const params = new URLSearchParams({
                    acct1: loginId,
                    token1: token,
                    cur1: currency,
                    lang: 'EN',
                    app_id: appId.toString(),
                    chart_type: 'area',
                    interval: '1t',
                    symbol: defaultSymbol,
                    trade_type: 'over_under',
                });

                const url = `${dtraderUrl}?${params.toString()}`;
                setIframeSrc(url);
                setError(null);
            } catch (err) {
                console.error('Error building iframe URL:', err);
                setError('Failed to initialize trading interface');
            } finally {
                setIsLoading(false);
            }
        },
        [appId, defaultSymbol, dtraderUrl]
    );

    const checkAuthAndUpdate = useCallback(() => {
        try {
            const authToken = localStorage.getItem('authToken');
            const activeLoginId = localStorage.getItem('active_loginid');

            if (authToken && activeLoginId) {
                buildIframeUrl(authToken, activeLoginId);
            } else {
                setIframeSrc(`${dtraderUrl}?chart_type=area&interval=1t&symbol=${defaultSymbol}&trade_type=over_under`);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setError('Authentication check failed');
            setIsLoading(false);
        }
    }, [buildIframeUrl, defaultSymbol, dtraderUrl]);

    useEffect(() => {
        checkAuthAndUpdate();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'authToken' || e.key === 'active_loginid' || e.key === 'clientAccounts') {
                checkAuthAndUpdate();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Set up interval with cleanup
        authCheckInterval.current = setInterval(checkAuthAndUpdate, 5000); // Reduced frequency to 5 seconds

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (authCheckInterval.current) {
                clearInterval(authCheckInterval.current);
            }
        };
    }, [checkAuthAndUpdate]);

    if (error) {
        return (
            <div
                style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#ff4444',
                    backgroundColor: '#fff5f5',
                    borderRadius: '4px',
                    margin: '20px',
                }}
            >
                <p>{error}</p>
                <button
                    onClick={checkAuthAndUpdate}
                    style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        backgroundColor: '#4a90e2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '300px',
                    flexDirection: 'column',
                    gap: '15px',
                }}
            >
                <div className='spinner'></div>
                <p>Loading DTrader...</p>
                <style jsx>{`
                    @keyframes spin {
                        0% {
                            transform: rotate(0deg);
                        }
                        100% {
                            transform: rotate(360deg);
                        }
                    }
                    .spinner {
                        border: 4px solid rgba(0, 0, 0, 0.1);
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        border-left-color: #4a90e2;
                        animation: spin 1s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className='trader-container'
            style={{
                width: '100%',
                height: '79vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <style jsx>{`
                @media (max-width: 768px) {
                    .trader-container {
                        height: 71vh !important;
                    }
                }
            `}</style>
            <iframe
                src={iframeSrc}
                title='DTrader Trading Platform'
                style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    backgroundColor: '#f5f5f5',
                    minHeight: 0, // Allows the iframe to shrink below its content size
                }}
                sandbox='allow-same-origin allow-scripts allow-popups allow-forms'
                allow='clipboard-read; clipboard-write'
                loading='eager'
            />
        </div>
    );
};

export default DTraderAutoLogin;
