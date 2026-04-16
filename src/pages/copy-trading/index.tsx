import React from 'react';
import {
    LabelPairedArrowRightArrowLeftCaptionBoldIcon,
    LabelPairedCircleCheckCaptionRegularIcon,
    LabelPairedDealProtectionCaptionRegularIcon,
    LabelPairedRightToBracketCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import '../hub-pages/hub-shared.scss';
import './copy-trading.scss';

const CopyTradingPage = () => {
    return (
        <div className='hub-page hub-page--copy'>
            <div className='hub-page__hero'>
                <div className='hub-page__hero-icon hub-page__hero-icon--copy' aria-hidden='true'>
                    <LabelPairedArrowRightArrowLeftCaptionBoldIcon
                        width={28}
                        height={28}
                        fill='var(--brand-red-coral)'
                    />
                </div>
                <h1 className='hub-page__title'>
                    <Localize i18n_default_text='Copy trading' />
                </h1>
                <p className='hub-page__subtitle'>
                    <Localize i18n_default_text="Mirror proven approaches with transparency: know what you're following, stay in control, and adapt when conditions change." />
                </p>
                <div className='hub-page__badge-row'>
                    <span className='hub-page__badge hub-page__badge--accent-red'>
                        <Localize i18n_default_text='Live ideas' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Your rules' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Pause anytime' />
                    </span>
                </div>
            </div>
            <div className='hub-page__grid'>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedRightToBracketCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Follow the flow' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Connect to strategies you trust and see the intent behind each signal before it reaches your account.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedDealProtectionCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Built-in safeguards' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Set max loss, trade caps, and cooldowns so automation never outruns your comfort zone.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedCircleCheckCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Verify & refine' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Review performance, compare to your own bots, and switch providers without friction.' />
                    </p>
                </article>
            </div>
        </div>
    );
};

export default CopyTradingPage;
