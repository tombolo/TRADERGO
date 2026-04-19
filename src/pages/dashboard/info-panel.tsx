import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Modal from '@/components/shared_ui/modal';
import Text from '@/components/shared_ui/text';
import { DBOT_TABS } from '@/constants/bot-contents';
import useIsTNCNeeded from '@/hooks/useIsTNCNeeded';
import { useStore } from '@/hooks/useStore';
import { LegacyClose1pxIcon } from '@deriv/quill-icons/Legacy';
import {
    StandaloneBullhornRegularIcon,
    LabelPairedCircleInfoCaptionBoldIcon,
    LegacyGuide1pxIcon,
    LabelPairedChevronsRightCaptionRegularIcon,
} from '@deriv/quill-icons';
import { useDevice } from '@deriv-com/ui';
import { SIDEBAR_INTRO } from './constants';

const InfoPanel = observer(() => {
    const { isDesktop } = useDevice();
    const { dashboard } = useStore();
    const is_tnc_needed = useIsTNCNeeded();
    const [is_tour_open, setIsTourOpen] = React.useState(false);

    const {
        is_info_panel_visible,
        setActiveTab,
        setActiveTabTutorial,
        setInfoPanelVisibility,
        setFaqTitle,
    } = dashboard;
    const switchTab = (link: boolean, label: string, faq_id: string) => {
        const tutorial_link = link ? setActiveTab(DBOT_TABS.TUTORIAL) : null;
        const tutorial_label = label === 'Guide' ? setActiveTabTutorial(0) : setActiveTabTutorial(1);
        setFaqTitle(faq_id);
        return {
            tutorial_link,
            tutorial_label,
        };
    };

    const handleClose = () => {
        if (isDesktop) return;
        setInfoPanelVisibility(false);
        setIsTourOpen(false);
        localStorage.setItem('dbot_should_show_info', JSON.stringify(Date.now()));
    };

    React.useEffect(() => {
        if (is_tnc_needed) {
            setIsTourOpen(false);
        } else {
            if (is_info_panel_visible) {
                setIsTourOpen(true);
            } else {
                setIsTourOpen(false);
            }
        }
    }, [is_tnc_needed, is_info_panel_visible]);

    const renderInfo = () => (
        <div className='db-info-panel'>
            {!isDesktop && (
                <div data-testid='close-icon' className='db-info-panel__close-action' onClick={handleClose}>
                    <LegacyClose1pxIcon height='18px' width='18px' fill='var(--text-prominent)' />
                </div>
            )}

            <div className='db-info-panel__header'>
                <div className='db-info-panel__spectrum' aria-hidden />
                <div className='db-info-panel__header-icon'>
                    <StandaloneBullhornRegularIcon
                        height={isDesktop ? '28px' : '22px'}
                        width={isDesktop ? '28px' : '22px'}
                        fill='#dc2626'
                    />
                </div>
                <Text
                    color='prominent'
                    lineHeight={isDesktop ? 'xl' : 'l'}
                    size={isDesktop ? 'sm' : 's'}
                    weight='bold'
                    as='h1'
                    className='db-info-panel__title'
                >
                    Welcome to TRADER GO
                </Text>
                <Text
                    color='general'
                    lineHeight={isDesktop ? 'l' : 'm'}
                    size={isDesktop ? 's' : 'xxs'}
                    as='p'
                    className='db-info-panel__subtitle'
                >
                    Build and deploy automated trades without coding
                </Text>
            </div>

            <div className='db-info-panel__content'>
                <div className='db-info-panel__cards'>
                    {SIDEBAR_INTRO()
                        .slice(1)
                        .map(sidebar_item => {
                            const { label, content, link } = sidebar_item;
                            const isGuide = label === 'Get Started';

                            return (
                                <div
                                    key={`${label}-${content}`}
                                    className={classNames('db-info-panel__card', {
                                        'db-info-panel__card--guide': isGuide,
                                        'db-info-panel__card--faq': !isGuide,
                                    })}
                                    onClick={() => link && switchTab(link, label, content[0]?.faq_id || '')}
                                >
                                    <div className='db-info-panel__card-icon'>
                                        {isGuide ? (
                                            <LegacyGuide1pxIcon
                                                height={isDesktop ? '22px' : '18px'}
                                                width={isDesktop ? '22px' : '18px'}
                                                fill='#15803d'
                                            />
                                        ) : (
                                            <LabelPairedCircleInfoCaptionBoldIcon
                                                height={isDesktop ? '22px' : '18px'}
                                                width={isDesktop ? '22px' : '18px'}
                                                fill='#1d4ed8'
                                            />
                                        )}
                                    </div>

                                    <div className='db-info-panel__card-content'>
                                        <Text
                                            color='prominent'
                                            lineHeight={isDesktop ? 'l' : 'm'}
                                            size={isDesktop ? 'xsm' : 'xs'}
                                            weight='bold'
                                            as='h3'
                                            className='db-info-panel__card-title'
                                        >
                                            {label}
                                        </Text>

                                        {content.map(text => (
                                            <Text
                                                key={`info-panel-tour${text.data}`}
                                                className={classNames('db-info-panel__card-item', {
                                                    'db-info-panel__card-item--clickable': link,
                                                })}
                                                color='general'
                                                lineHeight={isDesktop ? 'm' : 's'}
                                                as='p'
                                                size={isDesktop ? 's' : 'xxs'}
                                            >
                                                {text.data}
                                            </Text>
                                        ))}
                                    </div>

                                    {link && (
                                        <div className='db-info-panel__card-arrow'>
                                            <LabelPairedChevronsRightCaptionRegularIcon
                                                height={isDesktop ? '20px' : '16px'}
                                                width={isDesktop ? '20px' : '16px'}
                                                fill='currentColor'
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );

    return isDesktop ? (
        <div
            className={classNames('tab__dashboard__info-panel', 'db-info-panel-context', {
                /* Desktop: always docked open; visibility flag only affects mobile modal */
                'tab__dashboard__info-panel--active': true,
            })}
        >
            {renderInfo()}
        </div>
    ) : (
        <Modal
            className='statistics__modal statistics__modal--mobile'
            is_open={is_tour_open}
            toggleModal={handleClose}
            width={'440px'}
        >
            <Modal.Body className='db-info-panel-context'>{renderInfo()}</Modal.Body>
        </Modal>
    );
});

export default InfoPanel;
