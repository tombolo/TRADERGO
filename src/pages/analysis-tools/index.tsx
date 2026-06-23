import React from 'react';
import './analysis-tools.scss';

const NUNTOOL_ORIGIN = 'https://nuntool-pearl.vercel.app/';

const AnalysisToolsPage = () => {
    return (
        <div className='analysis-tools-page'>
            <iframe
                title='ANALYSIS HUBs'
                className='analysis-tools-page__iframe'
                src={NUNTOOL_ORIGIN}
                loading='lazy'
                referrerPolicy='strict-origin-when-cross-origin'
            />
        </div>
    );
};

export default AnalysisToolsPage;
