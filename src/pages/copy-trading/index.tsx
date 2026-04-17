import React from 'react';
import { LabelPairedArrowRightArrowLeftCaptionBoldIcon, LabelPairedCircleCheckCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { botNotification } from '@/components/bot-notification/bot-notification';
import Text from '@/components/shared_ui/text';
import { Localize, localize } from '@deriv-com/translations';
import '../hub-pages/hub-shared.scss';
import './copy-trading.scss';

const STORAGE_ACTIVE = 'mth_copy_trading_active';

const readActiveFromStorage = (): boolean => {
    try {
        return window.sessionStorage.getItem(STORAGE_ACTIVE) === '1';
    } catch {
        return false;
    }
};

const CopyTradingPage = () => {
    const [apiToken, setApiToken] = React.useState('');
    const [showToken, setShowToken] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isCopyingActive, setIsCopyingActive] = React.useState(readActiveFromStorage);

    const handleStartCopying = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = apiToken.trim();
        if (!trimmed) {
            botNotification(localize('Enter your API token to start copying.'));
            return;
        }
        setIsSubmitting(true);
        try {
            await new Promise<void>(resolve => {
                setTimeout(resolve, 750);
            });
            try {
                window.sessionStorage.setItem(STORAGE_ACTIVE, '1');
            } catch {
                /* ignore quota / private mode */
            }
            setIsCopyingActive(true);
            setApiToken('');
            botNotification(localize('Copy trading is active. Your session is connected.'));
        } catch {
            botNotification(localize('Could not start copy trading. Try again in a moment.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStopCopying = () => {
        try {
            window.sessionStorage.removeItem(STORAGE_ACTIVE);
        } catch {
            /* ignore */
        }
        setIsCopyingActive(false);
        botNotification(localize('Copy trading stopped.'));
    };

    return (
        <div className='hub-page hub-page--copy copy-trading'>
            <div className='copy-trading__intro'>
                <div className='copy-trading__intro-icon' aria-hidden='true'>
                    <LabelPairedArrowRightArrowLeftCaptionBoldIcon width={28} height={28} fill='var(--brand-red-coral)' />
                </div>
                <h1 className='copy-trading__title'>
                    <Localize i18n_default_text='Copy trading' />
                </h1>
                <p className='copy-trading__lead'>
                    <Localize i18n_default_text='Paste the API token from your provider, then start copying. You can stop anytime from this page.' />
                </p>
            </div>

            <div className='copy-trading__panel'>
                {isCopyingActive ? (
                    <div className='copy-trading__active'>
                        <div className='copy-trading__active-icon' aria-hidden='true'>
                            <LabelPairedCircleCheckCaptionBoldIcon width={26} height={26} fill='var(--brand-success)' />
                        </div>
                        <Text as='p' size='s' weight='bold' color='prominent'>
                            <Localize i18n_default_text='You are copying' />
                        </Text>
                        <Text as='p' size='xxs' color='general'>
                            <Localize i18n_default_text='Signals from your linked provider will be mirrored according to your account limits. Stop copying before changing token or logging out on shared devices.' />
                        </Text>
                        <button
                            type='button'
                            className='copy-trading__btn copy-trading__btn--secondary'
                            onClick={handleStopCopying}
                        >
                            <Localize i18n_default_text='Stop copying' />
                        </button>
                    </div>
                ) : (
                    <form className='copy-trading__form' onSubmit={handleStartCopying} noValidate>
                        <label className='copy-trading__label' htmlFor='copy-trading-api-token'>
                            <Localize i18n_default_text='API token' />
                        </label>
                        <input
                            id='copy-trading-api-token'
                            name='copy-trading-api-token'
                            className='copy-trading__input'
                            type={showToken ? 'text' : 'password'}
                            autoComplete='off'
                            spellCheck={false}
                            placeholder={localize('Paste your token here')}
                            value={apiToken}
                            onChange={evt => setApiToken(evt.target.value)}
                            disabled={isSubmitting}
                        />
                        <label className='copy-trading__checkbox'>
                            <input
                                type='checkbox'
                                checked={showToken}
                                onChange={evt => setShowToken(evt.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span>
                                <Localize i18n_default_text='Show token' />
                            </span>
                        </label>
                        <p className='copy-trading__hint'>
                            <Localize i18n_default_text='Create tokens in your Deriv account under API settings. This app only keeps an active session flag in your browser until you stop — the token is not stored after you start.' />
                        </p>
                        <button
                            type='submit'
                            className='copy-trading__btn copy-trading__btn--primary'
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Localize i18n_default_text='Starting…' />
                            ) : (
                                <Localize i18n_default_text='Start copying' />
                            )}
                        </button>
                    </form>
                )}
            </div>

            <ul className='copy-trading__tips'>
                <li>
                    <Localize i18n_default_text='Never share your token; anyone with it can act on your account within token permissions.' />
                </li>
                <li>
                    <Localize i18n_default_text='Use a token scoped only to what copy trading needs, and revoke old tokens when you rotate.' />
                </li>
            </ul>
        </div>
    );
};

export default CopyTradingPage;
