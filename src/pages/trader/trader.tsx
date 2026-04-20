import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Balance } from '@deriv/api-types';
import { api_base } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import type ClientStore from '@/stores/client-store';
import { getDotLoginidFromSession, getFirstDotLoginid, isSpecialCaseLoginId } from '@/utils/account-helpers';
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
        if (hostname.endsWith('.vercel.app')) return true;
        const trustedDomains = ['dtradergo.vercel.app', 'deriv.com', 'deriv-dtrader.vercel.app', 'deriv-dta.vercel.app'];
        return trustedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
        return false;
    }
}

function parseAccountsList(): Record<string, string> {
    try {
        const raw = localStorage.getItem('accountsList') || '{}';
        return JSON.parse(raw) as Record<string, string>;
    } catch {
        return {};
    }
}

/**
 * Login + token for the DTrader iframe (`acct1` / `token1`).
 * Prefer the active account; fall back when `active_loginid` is missing from `accountsList`
 * (OAuth still stores the same access_token under each account_id key).
 *
 * Special-case ROT: DTrader always uses the paired DOT wallet (never ROT as `acct1`).
 */
function resolveDTraderEmbedCredentials(): { loginId?: string; accessToken?: string } {
    const activeLoginId = localStorage.getItem('active_loginid') || undefined;
    const accountsList = parseAccountsList();
    const specialActive = Boolean(activeLoginId && isSpecialCaseLoginId(activeLoginId));

    const dotLoginId = getFirstDotLoginid(accountsList) ?? getDotLoginidFromSession();
    const preferredLoginId = specialActive ? dotLoginId : activeLoginId;

    if (preferredLoginId && accountsList[preferredLoginId]) {
        return { loginId: preferredLoginId, accessToken: accountsList[preferredLoginId] };
    }

    if (specialActive) {
        const dotPair = Object.entries(accountsList).find(
            ([id, token]) => id.startsWith('DOT') && typeof token === 'string' && token.length > 0
        );
        if (dotPair) {
            return { loginId: dotPair[0], accessToken: dotPair[1] };
        }
    }

    const firstPair = Object.entries(accountsList).find(
        ([id, token]) =>
            typeof token === 'string' &&
            token.length > 0 &&
            !(specialActive && isSpecialCaseLoginId(id))
    );
    if (firstPair) {
        return { loginId: firstPair[0], accessToken: firstPair[1] };
    }

    const oauthToken = OAuthTokenExchangeService.getAuthInfo()?.access_token;
    if (oauthToken) {
        const loginForEmbed = specialActive ? dotLoginId : activeLoginId;
        if (loginForEmbed && !isSpecialCaseLoginId(loginForEmbed)) {
            return { loginId: loginForEmbed, accessToken: oauthToken };
        }
        try {
            const raw = sessionStorage.getItem('deriv_accounts');
            const accounts = raw ? (JSON.parse(raw) as Array<{ account_id?: string }>) : [];
            const id = specialActive
                ? accounts.find(a => a.account_id?.startsWith('DOT'))?.account_id
                : accounts.find(a => a.account_id)?.account_id;
            if (id && (!specialActive || !isSpecialCaseLoginId(id))) {
                return { loginId: id, accessToken: oauthToken };
            }
        } catch {
            // ignore
        }
    }

    const legacy = localStorage.getItem('authToken') || undefined;
    if (legacy) {
        const loginForLegacy = specialActive ? dotLoginId : activeLoginId;
        if (loginForLegacy && !isSpecialCaseLoginId(loginForLegacy)) {
            return { loginId: loginForLegacy, accessToken: legacy };
        }
    }

    return {};
}

const DTRADER_BALANCE_POLL_MS = 3500;

/**
 * DTrader runs in a third-party iframe with its own WS session; parent balance stream does not see those trades.
 * One-shot `balance()` on the parent's authorized API keeps header / MobX balances in sync while this page is open.
 */
function mergePollBalanceIntoClient(client: ClientStore, raw: { balance?: unknown; error?: unknown }): void {
    if (raw?.error) return;
    const payload = raw?.balance;
    if (payload == null) return;

    if (typeof payload === 'object' && payload !== null && 'accounts' in payload) {
        const incoming = payload as Balance;
        const prev = client.all_accounts_balance;
        const prevAccounts = prev?.accounts ?? {};
        const nextAccounts = { ...prevAccounts, ...(incoming.accounts ?? {}) };
        client.setAllAccountsBalance({
            ...(prev ?? {}),
            ...incoming,
            accounts: nextAccounts,
        } as Balance);
        return;
    }

    if (typeof payload === 'object' && payload !== null && 'loginid' in payload && typeof (payload as { balance?: unknown }).balance === 'number') {
        const slot = payload as { loginid: string; balance: number; currency?: string };
        const accountsNow = client.all_accounts_balance?.accounts ?? {};
        const updated: Balance = {
            ...(client.all_accounts_balance ?? {}),
            loginid: slot.loginid,
            accounts: {
                ...accountsNow,
                [slot.loginid]: {
                    ...(accountsNow[slot.loginid] ?? {}),
                    balance: slot.balance,
                    currency: slot.currency ?? accountsNow[slot.loginid]?.currency,
                    loginid: slot.loginid,
                },
            },
        };
        client.setAllAccountsBalance(updated);
    }
}

const DTraderAutoLogin: React.FC<DTraderAutoLoginProps> = ({
    dtraderUrl = 'https://dtradergo.vercel.app/dtrader',
    appId = 121364,
    defaultSymbol = '1HZ100V',
}) => {
    const { connectionStatus, isAuthorized } = useApiBase();
    const { client } = useStore() ?? {};
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
            const { loginId, accessToken } = resolveDTraderEmbedCredentials();
            buildIframeUrl(accessToken, loginId);
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
        // `storage` does not fire in the same tab — refresh after OAuth popups / focus.
        window.addEventListener('focus', checkAuthAndUpdate);
        authCheckInterval.current = setInterval(checkAuthAndUpdate, 5000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', checkAuthAndUpdate);
            if (authCheckInterval.current) {
                clearInterval(authCheckInterval.current);
            }
        };
    }, [checkAuthAndUpdate]);

    useEffect(() => {
        if (!client || !isAuthorized || connectionStatus !== CONNECTION_STATUS.OPENED) return;

        const poll = () => {
            if (document.visibilityState !== 'visible') return;
            const api = api_base.api;
            if (!api?.balance) return;
            void api
                .balance()
                .then(res => mergePollBalanceIntoClient(client, res))
                .catch(() => undefined);
        };

        poll();
        const intervalId = window.setInterval(poll, DTRADER_BALANCE_POLL_MS);
        return () => clearInterval(intervalId);
    }, [client, connectionStatus, isAuthorized]);

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
