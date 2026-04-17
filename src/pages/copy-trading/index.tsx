import React from 'react';
import { LabelPairedArrowsRotateCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { botNotification } from '@/components/bot-notification/bot-notification';
import { Localize, localize } from '@deriv-com/translations';
import './copy-trading.scss';

const TOKENS_KEY = 'mth_copy_trading_tokens';
const ACTIVE_KEY = 'mth_copy_trading_active';
const DERIV_API_TOKEN_URL = 'https://app.deriv.com/account/api-token';
const TUTORIAL_URL = 'https://www.youtube.com/results?search_query=Deriv+API+token';

const loadTokens = (): string[] => {
    try {
        const raw = window.localStorage.getItem(TOKENS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
};

const saveTokens = (tokens: string[]) => {
    try {
        window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch {
        /* ignore */
    }
};

const readActive = (): boolean => {
    try {
        return window.sessionStorage.getItem(ACTIVE_KEY) === '1';
    } catch {
        return false;
    }
};

const maskToken = (t: string): string => {
    if (t.length <= 4) return '••••';
    return `••••${t.slice(-4)}`;
};

const CopyTradingPage = () => {
    const [input, setInput] = React.useState('');
    const [tokens, setTokens] = React.useState<string[]>(() => loadTokens());
    const [isCopying, setIsCopying] = React.useState(() => readActive());
    const [isStarting, setIsStarting] = React.useState(false);

    const syncFromStorage = React.useCallback(() => {
        setTokens(loadTokens());
        botNotification(localize('Synced.'));
    }, []);

    const handleAdd = () => {
        const v = input.trim();
        if (!v) {
            botNotification(localize('Enter a client token first.'));
            return;
        }
        if (tokens.includes(v)) {
            botNotification(localize('This token is already added.'));
            return;
        }
        const next = [...tokens, v];
        saveTokens(next);
        setTokens(next);
        setInput('');
        botNotification(localize('Token added.'));
    };

    const handleStart = async () => {
        if (tokens.length === 0) {
            botNotification(localize('Add at least one token above.'));
            return;
        }
        setIsStarting(true);
        try {
            await new Promise<void>(r => setTimeout(r, 500));
            window.sessionStorage.setItem(ACTIVE_KEY, '1');
            setIsCopying(true);
            botNotification(localize('Copy trading started.'));
        } catch {
            botNotification(localize('Something went wrong. Try again.'));
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = () => {
        window.sessionStorage.removeItem(ACTIVE_KEY);
        setIsCopying(false);
        botNotification(localize('Copy trading stopped.'));
    };

    const primary = tokens.length ? tokens[tokens.length - 1] : '';

    return (
        <div className='copy-trading'>
            <div className='copy-trading__badge'>
                <Localize i18n_default_text='Real account — copy trading' />
            </div>

            <div className='copy-trading__card'>
                <h2 className='copy-trading__h2'>
                    <Localize i18n_default_text='Add tokens to Replicator' />
                </h2>
                <p className='copy-trading__muted'>
                    <Localize i18n_default_text='Tokens you add are saved in this browser for mirror trades.' />
                </p>
                <div className='copy-trading__input-row'>
                    <input
                        className='copy-trading__field'
                        type='password'
                        autoComplete='off'
                        spellCheck={false}
                        placeholder={localize('Enter Client token')}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                    />
                    <button type='button' className='copy-trading__add' onClick={handleAdd}>
                        <Localize i18n_default_text='Add' />
                    </button>
                    <button type='button' className='copy-trading__sync' onClick={syncFromStorage} title={localize('Sync')}>
                        <LabelPairedArrowsRotateCaptionBoldIcon width={18} height={18} fill='#ffffff' />
                        <Localize i18n_default_text='Sync' />
                    </button>
                </div>
                <div className='copy-trading__links'>
                    <a className='copy-trading__link copy-trading__link--video' href={TUTORIAL_URL} target='_blank' rel='noreferrer noopener'>
                        <span className='copy-trading__yt' aria-hidden='true' />
                        <Localize i18n_default_text='Tutorial' />
                    </a>
                    <a className='copy-trading__link' href={DERIV_API_TOKEN_URL} target='_blank' rel='noreferrer noopener'>
                        <Localize i18n_default_text='Get API token on Deriv' />
                    </a>
                </div>
            </div>

            <div className='copy-trading__card'>
                <h3 className='copy-trading__h3'>
                    <Localize i18n_default_text='Saved follower token' />
                </h3>
                <div className='copy-trading__token-panel'>
                    <div className='copy-trading__token-bar'>
                        <Localize i18n_default_text='TOKEN' />
                    </div>
                    <div className='copy-trading__token-body'>
                        {primary ? (
                            <span className='copy-trading__token-value'>{maskToken(primary)}</span>
                        ) : (
                            <span className='copy-trading__token-empty'>
                                <Localize i18n_default_text='None — add a token above' />
                            </span>
                        )}
                        <span className={`copy-trading__pill ${primary ? 'copy-trading__pill--set' : ''}`}>
                            {primary ? <Localize i18n_default_text='SET' /> : <Localize i18n_default_text='NOT SET' />}
                        </span>
                    </div>
                </div>
                <p className='copy-trading__fine'>
                    <Localize i18n_default_text='Stored on this device only. Mirroring uses this token with Deriv when your bot runs.' />
                </p>
            </div>

            <div className='copy-trading__card copy-trading__card--footer'>
                <span className='copy-trading__count'>
                    <Localize i18n_default_text='Total Clients added: {{n}}' values={{ n: tokens.length }} />
                </span>
                {isCopying ? (
                    <button type='button' className='copy-trading__stop' onClick={handleStop}>
                        <Localize i18n_default_text='Stop copy trading' />
                    </button>
                ) : (
                    <button type='button' className='copy-trading__start' disabled={isStarting} onClick={() => void handleStart()}>
                        {isStarting ? <Localize i18n_default_text='Starting…' /> : <Localize i18n_default_text='Start Copy Trading' />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CopyTradingPage;
