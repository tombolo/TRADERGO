import React from 'react';
import {
    LabelPairedBookmarkCaptionFillIcon,
    LabelPairedCircleStarCaptionBoldIcon,
    LabelPairedThumbsUpCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import '../hub-pages/hub-shared.scss';
import './free-bits.scss';

const FreeBitsPage = () => {
    return (
        <div className='hub-page hub-page--free-bits'>
            <div className='hub-page__hero'>
                <div className='hub-page__hero-icon' aria-hidden='true'>
                    <LabelPairedCircleStarCaptionBoldIcon width={28} height={28} fill='#ffffff' />
                </div>
                <h1 className='hub-page__title'>
                    <Localize i18n_default_text='Free Bits' />
                </h1>
                <p className='hub-page__subtitle'>
                    <Localize i18n_default_text='Curated tips, quick wins, and bite-sized resources to level up your bot trading — no fluff, just value.' />
                </p>
                <div className='hub-page__badge-row'>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Weekly drops' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Zero cost' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Actionable' />
                    </span>
                </div>
            </div>
            <div className='hub-page__grid'>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedBookmarkCaptionFillIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Starter packs' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Ready-made checklist flows and workspace presets you can plug into the Bot Builder in minutes.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedThumbsUpCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Pro tips' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Short lessons on risk, stake sizing, and when to pause — written for real market conditions.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedCircleStarCaptionBoldIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Community highlights' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text="See what's working for other traders and remix ideas into your own strategies." />
                    </p>
                </article>
            </div>
        </div>
    );
};

export default FreeBitsPage;
