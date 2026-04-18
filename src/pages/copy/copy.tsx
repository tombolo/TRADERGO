'use client';

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { FaSync, FaYoutube } from 'react-icons/fa';
import { formatMoney, getCurrencyDisplayCode } from '@/components/shared';
import { MIRROR_TOKEN_SESSION_BACKUP_KEY, MIRROR_TOKEN_STORAGE_KEYS } from '@/constants';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import './copy.scss';

const STORAGE_KEYS = MIRROR_TOKEN_STORAGE_KEYS;

const DERIV_API_TOKEN_URL = 'https://app.deriv.com/account/api-token';
const YT_TOKEN_HELP = 'https://www.youtube.com/results?search_query=deriv+api+token';

const TokenManager: React.FC = () => {
    const { run_panel, client, ui } = useStore();
    const [token, setToken] = useState('');
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    const mirror_status = run_panel.mirror_connection_status;
    const is_bot_running = run_panel.is_running;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        try {
            let saved = localStorage.getItem(STORAGE_KEYS[0]) || localStorage.getItem(STORAGE_KEYS[1]);
            if (!saved) {
                saved = sessionStorage.getItem(MIRROR_TOKEN_SESSION_BACKUP_KEY);
                if (saved) {
                    localStorage.setItem(STORAGE_KEYS[0], saved);
                    localStorage.setItem(STORAGE_KEYS[1], saved);
                }
            }
            if (saved) setSavedToken(saved);
            console.log('[CopyPage] Initial token load', {
                local_primary_exists: !!localStorage.getItem(STORAGE_KEYS[0]),
                local_secondary_exists: !!localStorage.getItem(STORAGE_KEYS[1]),
                session_backup_exists: !!sessionStorage.getItem(MIRROR_TOKEN_SESSION_BACKUP_KEY),
                resolved_saved_token_exists: !!saved,
                resolved_saved_token_preview: saved ? `${saved.slice(0, 4)}...${saved.slice(-4)}` : null,
            });
        } catch (e) {
            console.error('Error loading saved token:', e);
        }
    }, []);

    const saveToken = () => {
        const t = token.trim();
        if (!t) {
            setToast({ type: 'err', text: localize('Token is empty') });
            return;
        }
        if (t.length < 10) {
            setToast({ type: 'err', text: localize('Token is too short') });
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEYS[0], t);
            localStorage.setItem(STORAGE_KEYS[1], t);
            try {
                sessionStorage.setItem(MIRROR_TOKEN_SESSION_BACKUP_KEY, t);
            } catch {
                /* quota / private mode */
            }
            setSavedToken(t);
            setToken('');
            setToast({ type: 'ok', text: localize('Token saved for mirror trades') });
            console.log('[CopyPage] Token saved', {
                key_primary: STORAGE_KEYS[0],
                key_secondary: STORAGE_KEYS[1],
                token_preview: `${t.slice(0, 4)}...${t.slice(-4)}`,
                token_length: t.length,
            });
            window.dispatchEvent(new Event('mirrorTokenUpdated'));
        } catch (e) {
            console.error('Error saving token:', e);
            setToast({ type: 'err', text: localize('Failed to save token') });
        }
    };

    const syncToken = () => {
        try {
            let saved = localStorage.getItem(STORAGE_KEYS[0]) || localStorage.getItem(STORAGE_KEYS[1]);
            if (!saved) {
                saved = sessionStorage.getItem(MIRROR_TOKEN_SESSION_BACKUP_KEY);
            }
            if (saved) {
                setSavedToken(saved);
                setToast({ type: 'ok', text: localize('Synced with saved token') });
                console.log('[CopyPage] Sync token found', {
                    token_preview: `${saved.slice(0, 4)}...${saved.slice(-4)}`,
                    token_length: saved.length,
                });
            } else {
                setSavedToken(null);
                setToast({ type: 'ok', text: localize('No saved token to sync') });
                console.log('[CopyPage] Sync token not found in local/session storage');
            }
            window.dispatchEvent(new Event('mirrorTokenUpdated'));
        } catch (e) {
            console.error('Error syncing token:', e);
            setToast({ type: 'err', text: localize('Sync failed') });
        }
    };

    const removeToken = () => {
        try {
            STORAGE_KEYS.forEach((key: string) => localStorage.removeItem(key));
            sessionStorage.removeItem(MIRROR_TOKEN_SESSION_BACKUP_KEY);
            setSavedToken(null);
            setToast({ type: 'ok', text: localize('Token removed successfully') });
            console.log('[CopyPage] Token removed from local/session storage');
            window.dispatchEvent(new Event('mirrorTokenUpdated'));
        } catch (e) {
            console.error('Error removing token:', e);
            setToast({ type: 'err', text: localize('Failed to remove token') });
        }
    };

    const openAccountSwitcher = () => {
        ui.toggleAccountsDialog(true);
    };

    const handleStartCopyTrading = () => {
        if (!savedToken) {
            setToast({ type: 'err', text: localize('Add a follower token first') });
            return;
        }
        if (!is_bot_running) {
            setToast({ type: 'err', text: localize('Start your bot first to begin mirroring') });
            return;
        }
        run_panel.initializeMirrorAccount(true);
        setToast({ type: 'ok', text: localize('Mirror connection started') });
    };

    /** Same mirror / bot status copy as the original Copy Trading page — drives the status card below. */
    const getStatusBlockContent = () => {
        if (!savedToken) return null;
        if (!is_bot_running) {
            return {
                label: localize('Inactive — start your bot to mirror trades to the follower account.'),
                statusClass: 'copy-trading__status-block--inactive',
                dotClass: '',
            };
        }
        switch (mirror_status) {
            case 'connected':
                return {
                    label: localize('Connected — new contracts are mirrored to the follower account.'),
                    statusClass: 'copy-trading__status-block--active',
                    dotClass: '',
                };
            case 'connecting':
                return {
                    label: localize('Connecting to follower account…'),
                    statusClass: 'copy-trading__status-block--connecting',
                    dotClass: 'copy-trading__status-dot--pulse',
                };
            case 'error':
                return {
                    label: localize('Connection error — verify the token and permissions.'),
                    statusClass: 'copy-trading__status-block--error',
                    dotClass: '',
                };
            case 'disconnected':
                return {
                    label: localize('Disconnected — reconnecting while the bot runs.'),
                    statusClass: 'copy-trading__status-block--inactive',
                    dotClass: '',
                };
            default:
                return {
                    label: localize('Ready — will connect when the bot runs.'),
                    statusClass: 'copy-trading__status-block--inactive',
                    dotClass: '',
                };
        }
    };

    const statusContent = getStatusBlockContent();

    const formatter_currency = client.currency
        ? client.currency === 'KSH'
            ? 'KES'
            : getCurrencyDisplayCode(client.currency)
        : 'USD';

    const display_balance =
        client.balance && client.currency
            ? `${formatMoney(formatter_currency, client.balance, true)} ${getCurrencyDisplayCode(client.currency)}`
            : '—';

    const account_id = client.is_logged_in && client.loginid ? client.loginid : '—';

    const client_count = savedToken ? 1 : 0;

    return (
        <div className='copy-trading'>
            <div className='copy-trading__shell'>
                <section className='copy-trading__card copy-trading__card--top'>
                    <div className='copy-trading__top-toolbar'>
                        {client.is_virtual ? (
                            <button
                                type='button'
                                className='copy-trading__btn copy-trading__btn--green'
                                onClick={openAccountSwitcher}
                            >
                                {localize('Start Demo to Real Copy Trading')}
                            </button>
                        ) : (
                            <span className='copy-trading__pill copy-trading__pill--muted'>
                                {localize('Real account — copy trading')}
                            </span>
                        )}
                        <a
                            className='copy-trading__tutorial-badge'
                            href={YT_TOKEN_HELP}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            <FaYoutube className='copy-trading__yt-icon' aria-hidden />
                            <span>{localize('Tutorial')}</span>
                        </a>
                    </div>
                    <div className='copy-trading__account-strip' role='group' aria-label={localize('Account')}>
                        <span className='copy-trading__account-id'>{account_id}</span>
                        <span className='copy-trading__account-balance'>{display_balance}</span>
                    </div>
                </section>

                <h2 className='copy-trading__section-heading'>{localize('Add tokens to Replicator')}</h2>
                <p className='copy-trading__section-lead'>
                    {localize('Any API token you add here is saved in this browser and used for mirror trades.')}
                </p>

                <section className='copy-trading__card copy-trading__card--replicator'>
                    <div className='copy-trading__replicator-row'>
                        <input
                            id='copy-trading-token-input'
                            type='password'
                            placeholder={localize('Enter Client token')}
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            className='copy-trading__field'
                            autoComplete='off'
                            spellCheck={false}
                        />
                        <div className='copy-trading__replicator-actions'>
                            <button
                                type='button'
                                className='copy-trading__btn copy-trading__btn--cyan'
                                onClick={saveToken}
                                disabled={!token.trim()}
                            >
                                {localize('Add')}
                            </button>
                            <button
                                type='button'
                                className='copy-trading__btn copy-trading__btn--cyan copy-trading__btn--sync'
                                onClick={syncToken}
                                title={localize('Sync')}
                            >
                                <FaSync aria-hidden />
                                <span>{localize('Sync')}</span>
                            </button>
                        </div>
                    </div>
                    <div className='copy-trading__replicator-footer'>
                        <a
                            className='copy-trading__tutorial-inline'
                            href={YT_TOKEN_HELP}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            <FaYoutube className='copy-trading__yt-icon' aria-hidden />
                            {localize('Tutorial')}
                        </a>
                        <a
                            className='copy-trading__link-deriv'
                            href={DERIV_API_TOKEN_URL}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            {localize('Get API token on Deriv')}
                        </a>
                    </div>
                </section>

                <section className='copy-trading__card copy-trading__card--follower' aria-labelledby='copy-trading-follower-heading'>
                    <h3 id='copy-trading-follower-heading' className='copy-trading__subheading'>
                        {localize('Saved follower token')}
                    </h3>
                    <div className='copy-trading__credential'>
                        <div className='copy-trading__credential-main'>
                            <span className='copy-trading__credential-label'>{localize('Token')}</span>
                            <code className='copy-trading__credential-value'>
                                {savedToken
                                    ? `${savedToken.slice(0, 4)}${'·'.repeat(6)}${savedToken.slice(-4)}`
                                    : localize('None — add a token above')}
                            </code>
                            <span
                                className={classNames(
                                    'copy-trading__credential-badge',
                                    savedToken ? 'copy-trading__credential-badge--ok' : 'copy-trading__credential-badge--empty'
                                )}
                            >
                                {savedToken ? localize('Stored') : localize('Not set')}
                            </span>
                        </div>
                        {savedToken && (
                            <button
                                type='button'
                                className='copy-trading__btn copy-trading__btn--outline-danger'
                                onClick={removeToken}
                            >
                                {localize('Remove token')}
                            </button>
                        )}
                    </div>
                    {statusContent && (
                        <div
                            className={classNames('copy-trading__status-block', statusContent.statusClass)}
                            role='status'
                        >
                            <span
                                className={classNames('copy-trading__status-dot', statusContent.dotClass)}
                                style={{
                                    backgroundColor:
                                        mirror_status === 'connected'
                                            ? 'var(--status-success, #22c55e)'
                                            : mirror_status === 'error'
                                              ? 'var(--status-danger, #ef4444)'
                                              : mirror_status === 'connecting'
                                                ? 'var(--status-info, #3b82f6)'
                                                : undefined,
                                }}
                            />
                            <span className='copy-trading__status-text'>{statusContent.label}</span>
                        </div>
                    )}
                    <p className='copy-trading__privacy-note'>
                        {localize(
                            'Stored only on this device. Mirroring connects to Deriv using this token when your bot runs; it is not sent to our servers.'
                        )}
                    </p>
                </section>

                <section className='copy-trading__card copy-trading__card--summary'>
                    <p className='copy-trading__summary-text'>
                        <strong>{localize('Total Clients added:')}</strong>
                        <span className='copy-trading__summary-count'>{client_count}</span>
                    </p>
                    <div className='copy-trading__summary-side'>
                        <button
                            type='button'
                            className='copy-trading__btn copy-trading__btn--green'
                            onClick={handleStartCopyTrading}
                        >
                            {localize('Start Copy Trading')}
                        </button>
                    </div>
                </section>
            </div>

            {toast && (
                <div
                    className={classNames(
                        'copy-trading__toast',
                        toast.type === 'ok' ? 'copy-trading__toast--ok' : 'copy-trading__toast--err'
                    )}
                    role='alert'
                >
                    <span className='copy-trading__toast-icon' aria-hidden>
                        {toast.type === 'ok' ? '✓' : '!'}
                    </span>
                    <span>{toast.text}</span>
                </div>
            )}

            {isMobile && (
                <style>{`
                    .copy-trading__field { font-size: 18px !important; }
                    .copy-trading .copy-trading__btn { touch-action: manipulation; }
                `}</style>
            )}
        </div>
    );
};

export default observer(TokenManager);
