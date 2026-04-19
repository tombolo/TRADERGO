import React, { useEffect, useState, useCallback, useRef } from 'react';
import './trader.scss';

interface ClientAccount {
    [key: string]: {
        currency?: string;
    };
}

interface DTraderAutoLoginProps {
    /** Base or full URL; normalized to `https://<host>/dtrader` for the embed entry */
    dtraderUrl?: string;
    appId?: number;
    defaultSymbol?: string;
}

/** SSO params must be on the iframe URL — embedded app reads them on first paint (applyEmbedSessionFromUrl). */

/**
 * Resolves the canonical DTrader embed path: `https://<host>/dtrader`
 * Accepts `https://host.vercel.app`, `https://host.vercel.app/`, or `https://host.vercel.app/dtrader`.
 */
function normalizeDTraderEmbedBaseUrl(configured: string): string {
    const trimmed = configured.trim();
    const withScheme = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        throw new Error('Invalid DTrader URL protocol');
    }
    if (u.protocol === 'http:') {
        u.protocol = 'https:';
    }
    const path = u.pathname.replace(/\/$/, '') || '';
    const embedPath = path.endsWith('/dtrader') ? path : '/dtrader';
    return `${u.origin}${embedPath}`;
}

function validateDTraderHost(embedBaseUrl: string): boolean {
    try {
        const { hostname } = new URL(embedBaseUrl);
        const trustedDomains = ['dtradergo.vercel.app', 'deriv.com', 'deriv-dtrader.vercel.app', 'deriv-dta.vercel.app'];
        return trustedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
        return false;
    }
}

/** OAuth access token for WebSocket/API — prefer per-account token from accountsList. */
function getAccessTokenForAccount(activeLoginId: string | undefined): string | undefined {
    if (!activeLoginId) return undefined;
    try {
        const raw = localStorage.getItem('accountsList') || '{}';
        const accountsList = JSON.parse(raw) as Record<string, string>;
        const fromList = accountsList[activeLoginId];
        if (fromList) return fromList;
    } catch {
        // ignore
    }
    return localStorage.getItem('authToken') || undefined;
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

    const buildIframeUrl = useCallback(
        (accessToken?: string, loginId?: string) => {
            let embedBase: string;
            try {
                embedBase = normalizeDTraderEmbedBaseUrl(dtraderUrl);
            } catch {
                setError('Invalid DTrader URL');
                setIsLoading(false);
                return;
            }

            if (!validateDTraderHost(embedBase)) {
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

                const extra = new URLSearchParams({
                    chart_type: 'area',
                    interval: '1t',
                    symbol: defaultSymbol,
                    trade_type: 'accumulator',
                    app_id: appId.toString(),
                    lang: 'EN',
                });
                // Do not add embed_sso=1 here: it is only for manual URL testing (see DTrader docs). Real iframe SSO uses acct1 + token1 on Vercel and locally.

                // Per spec: acct1 & token1 must be encoded; keep tokens only in parent until iframe loads.
                const parts: string[] = [];
                if (accessToken && loginId) {
                    parts.push(`acct1=${encodeURIComponent(loginId)}`, `token1=${encodeURIComponent(accessToken)}`);
                    parts.push(`cur1=${encodeURIComponent(currency)}`);
                }

                const rest = extra.toString();
                const query = parts.length ? `${parts.join('&')}&${rest}` : rest;
                const url = `${embedBase}?${query}`;
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
            const activeLoginId = localStorage.getItem('active_loginid') || undefined;
            const accessToken = getAccessTokenForAccount(activeLoginId);
            buildIframeUrl(accessToken, activeLoginId);
        } catch (err) {
            console.error('Auth check failed:', err);
            setError('Authentication check failed');
            setIsLoading(false);
        }
    }, [buildIframeUrl]);

    useEffect(() => {
        checkAuthAndUpdate();

        const handleStorageChange = (e: StorageEvent) => {
            if (
                e.key === 'authToken' ||
                e.key === 'active_loginid' ||
                e.key === 'clientAccounts' ||
                e.key === 'accountsList'
            ) {
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
                    type='button'
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
                key={iframeSrc}
                src={iframeSrc}
                title='DTrader Trading Platform'
                style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    backgroundColor: '#f5f5f5',
                    minHeight: 0,
                }}
                allow='clipboard-read; clipboard-write; fullscreen *'
                allowFullScreen
                loading='eager'
            />
        </div>
    );
};

export default DTraderAutoLogin;
