import React from 'react';
import { Localize } from '@deriv-com/translations';
import './analysis-tools.scss';

const NUNTOOL_ORIGIN = 'https://nuntool.vercel.app/';

const AnalysisToolsPage = () => {
    return (
        <div className='analysis-tools-page'>
            <div className='analysis-tools-page__chrome'>
                <span className='analysis-tools-page__label'>
                    <Localize i18n_default_text='Analysis tools' />
                </span>
            </div>
            <iframe
                title='Analysis tools'
                className='analysis-tools-page__iframe'
                src={NUNTOOL_ORIGIN}
                loading='lazy'
                referrerPolicy='strict-origin-when-cross-origin'
            />
        </div>
    );
};

export default AnalysisToolsPage;
