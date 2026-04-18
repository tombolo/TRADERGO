import React, { useEffect, useState, useCallback, useRef } from 'react';
import './trader.scss';

interface ClientAccount {
    [key: string]: {
        currency?: string;
    };
}

interface DTraderAutoLoginProps {
    dtraderUrl?: string;
    appId?: number;
    defaultSymbol?: string;
}

const DTraderAutoLogin: React.FC<DTraderAutoLoginProps> = ({
    dtraderUrl = 'https://dtradergo.vercel.app/dtrader',
    appId = 121364,
    defaultSymbol = '1HZ100V',
}) => {
    const [iframeSrc, setIframeSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const authCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const validateDtraderUrl = (url: string): boolean => {
        try {
            const { hostname } = new URL(url);
            const trustedDomains = ['dtradergo.vercel.app', 'deriv.com', 'deriv-dtrader.vercel.app'];
            return trustedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
        } catch {
            return false;
        }
    };

    const buildIframeUrl = useCallback(
        (token?: string, loginId?: string) => {
            if (!validateDtraderUrl(dtraderUrl)) {
                setError('Invalid DTrader URL');
                setIsLoading(false);
                return;
            }

            try {
                let currency = 'USD';
                const clientAccountsStr = localStorage.getItem('clientAccounts') || '{}';

                try {
                    const clientAccounts: ClientAccount = JSON.parse(clientAccountsStr);
                    if (loginId && clientAccounts[loginId]?.currency) {
                        currency = clientAccounts[loginId].currency || 'USD';
                    }
                } catch (parseError) {
                    console.error('Error parsing client accounts:', parseError);
                }

                const params = new URLSearchParams({
                    chart_type: 'area',
                    interval: '1t',
                    symbol: defaultSymbol,
                    trade_type: 'accumulator',
                    app_id: appId.toString(),
                    lang: 'EN',
                });

                if (token && loginId) {
                    params.set('acct1', loginId);
                    params.set('token1', token);
                    params.set('cur1', currency);
                }

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
            const authToken = localStorage.getItem('authToken') || undefined;
            const activeLoginId = localStorage.getItem('active_loginid') || undefined;

            buildIframeUrl(authToken, activeLoginId);
        } catch (err) {
            console.error('Auth check failed:', err);
            setError('Authentication check failed');
            setIsLoading(false);
        }
    }, [buildIframeUrl]);

    useEffect(() => {
        checkAuthAndUpdate();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'authToken' || e.key === 'active_loginid' || e.key === 'clientAccounts') {
                checkAuthAndUpdate();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        authCheckInterval.current = setInterval(checkAuthAndUpdate, 5000);

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
                        color: '#fff',
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
                <div
                    style={{
                        border: '4px solid rgba(0, 0, 0, 0.1)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        borderLeftColor: '#4a90e2',
                        animation: 'dtrader-spin 1s linear infinite',
                    }}
                />
                <p>Loading DTrader...</p>
                <style>
                    {`
                        @keyframes dtrader-spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
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
            <iframe
                src={iframeSrc}
                title='DTrader Trading Platform'
                style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    backgroundColor: '#f5f5f5',
                    minHeight: 0,
                }}
                sandbox='allow-same-origin allow-scripts allow-popups allow-forms allow-downloads'
                allow='clipboard-read; clipboard-write'
                loading='eager'
            />
        </div>
    );
};

export default DTraderAutoLogin;