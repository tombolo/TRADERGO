import React from 'react';
import {
    LabelPairedBarsFilterCaptionRegularIcon,
    LabelPairedChartMixedCaptionBoldIcon,
    LabelPairedGaugeMaxCaptionRegularIcon,
    LabelPairedLightChartLineUpDownClockCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import '../hub-pages/hub-shared.scss';
import './analysis-tools.scss';

const AnalysisToolsPage = () => {
    return (
        <div className='hub-page hub-page--analysis'>
            <div className='hub-page__hero'>
                <div className='hub-page__hero-icon hub-page__hero-icon--analysis' aria-hidden='true'>
                    <LabelPairedLightChartLineUpDownClockCaptionRegularIcon width={28} height={28} fill='#ffffff' />
                </div>
                <h1 className='hub-page__title'>
                    <Localize i18n_default_text='Analysis tools' />
                </h1>
                <p className='hub-page__subtitle'>
                    <Localize i18n_default_text='A focused toolkit mindset: see the market clearly, filter noise, and decide with confidence before you hit Run.' />
                </p>
                <div className='hub-page__badge-row'>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Charts' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Signals' />
                    </span>
                    <span className='hub-page__badge'>
                        <Localize i18n_default_text='Discipline' />
                    </span>
                </div>
            </div>
            <div className='hub-page__grid'>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedChartMixedCaptionBoldIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Multi-timeframe view' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Align your bot logic with trend, range, and volatility so entries match the bigger picture.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedBarsFilterCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Smart filters' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Cut through clutter: highlight the instruments and sessions that matter for your strategy.' />
                    </p>
                </article>
                <article className='hub-page__card'>
                    <div className='hub-page__card-icon' aria-hidden='true'>
                        <LabelPairedGaugeMaxCaptionRegularIcon width={22} height={22} fill='var(--text-prominent)' />
                    </div>
                    <h2 className='hub-page__card-title'>
                        <Localize i18n_default_text='Risk meter' />
                    </h2>
                    <p className='hub-page__card-text'>
                        <Localize i18n_default_text='Keep stake and exposure in check with simple guardrails you can read at a glance.' />
                    </p>
                </article>
            </div>
        </div>
    );
};

export default AnalysisToolsPage;
