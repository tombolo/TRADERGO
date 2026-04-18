//kept sometihings commented beacuse of mobx to integrate popup functionality here
import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import GoogleDrive from '@/components/load-modal/google-drive';
import Dialog from '@/components/shared_ui/dialog';
import MobileFullPageModal from '@/components/shared_ui/mobile-full-page-modal';
import Text from '@/components/shared_ui/text';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import {
    DashboardAnalysisIcon,
    DashboardBotBuilderIcon,
    DashboardFlipCloudIcon,
    DashboardFlipDiceIcon,
    DashboardFlipFolderIcon,
    DashboardFlipGaugeIcon,
    DashboardFlipGearIcon,
    DashboardFlipPieIcon,
    DashboardFlipRocketIcon,
    DashboardGoogleDriveIcon,
    DashboardKingOfMatchesIcon,
    DashboardLocalDeviceIcon,
    DashboardMyComputerIcon,
    DashboardQuickStrategyIcon,
    DashboardSpeedLabIcon,
} from './dashboard-card-icons';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { rudderStackSendOpenEvent } from '../../analytics/rudderstack-common-events';
import { rudderStackSendDashboardClickEvent } from '../../analytics/rudderstack-dashboard';

type TCardProps = {
    has_dashboard_strategies: boolean;
    is_mobile: boolean;
    onOpenSpeedLab: () => void;
    onOpenKingOfMatches: () => void;
};

type TCardArray = {
    id: string;
    icon: React.ReactElement;
    icon_back: React.ReactElement;
    content: React.ReactElement;
    callback: () => void;
};

const DASHBOARD_CARD_FLIP_INTERVAL_MS = 5000;
const DASHBOARD_CARD_FLIP_STAGGER_MS = 75;

const Cards = observer(({ is_mobile, has_dashboard_strategies, onOpenSpeedLab, onOpenKingOfMatches }: TCardProps) => {
    const { dashboard, load_modal, quick_strategy } = useStore();
    const { toggleLoadModal, setActiveTabIndex } = load_modal;
    const { isDesktop } = useDevice();
    const { onCloseDialog, dialog_options, is_dialog_open, setActiveTab, setPreviewOnPopup } = dashboard;
    const { setFormVisibility } = quick_strategy;

    /** `true` = back face (alternate icon); toggles every `DASHBOARD_CARD_FLIP_INTERVAL_MS`. */
    const [card_flip_show_alt, setCardFlipShowAlt] = React.useState(false);

    React.useEffect(() => {
        const id = window.setInterval(() => {
            setCardFlipShowAlt(v => !v);
        }, DASHBOARD_CARD_FLIP_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, []);

    const openGoogleDriveDialog = () => {
        toggleLoadModal();
        setActiveTabIndex(is_mobile ? 1 : 2);
        setActiveTab(DBOT_TABS.BOT_BUILDER);
    };

    const openFileLoader = () => {
        toggleLoadModal();
        setActiveTabIndex(is_mobile ? 0 : 1);
        setActiveTab(DBOT_TABS.BOT_BUILDER);
    };

    const actions: TCardArray[] = [
        {
            id: 'my-computer',
            icon: is_mobile ? (
                <DashboardLocalDeviceIcon height='32px' width='32px' />
            ) : (
                <DashboardMyComputerIcon height='32px' width='32px' />
            ),
            icon_back: <DashboardFlipFolderIcon height='32px' width='32px' />,
            content: is_mobile ? <Localize i18n_default_text='Local' /> : <Localize i18n_default_text='My computer' />,
            callback: () => {
                openFileLoader();
                rudderStackSendOpenEvent({
                    subpage_name: 'bot_builder',
                    subform_source: 'dashboard',
                    subform_name: 'load_strategy',
                    load_strategy_tab: 'local',
                });
            },
        },
        {
            id: 'google-drive',
            icon: <DashboardGoogleDriveIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipCloudIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='Google Drive' />,
            callback: () => {
                openGoogleDriveDialog();
                rudderStackSendOpenEvent({
                    subpage_name: 'bot_builder',
                    subform_source: 'dashboard',
                    subform_name: 'load_strategy',
                    load_strategy_tab: 'google drive',
                });
            },
        },
        {
            id: 'bot-builder',
            icon: <DashboardBotBuilderIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipGearIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='Bot builder' />,
            callback: () => {
                setActiveTab(DBOT_TABS.BOT_BUILDER);
                rudderStackSendDashboardClickEvent({
                    dashboard_click_name: 'bot_builder',
                    subpage_name: 'bot_builder',
                });
            },
        },
        {
            id: 'quick-strategy',
            icon: <DashboardQuickStrategyIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipRocketIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='Quick strategy' />,
            callback: () => {
                setActiveTab(DBOT_TABS.BOT_BUILDER);
                setFormVisibility(true);
                rudderStackSendOpenEvent({
                    subpage_name: 'bot_builder',
                    subform_source: 'dashboard',
                    subform_name: 'quick_strategy',
                });
            },
        },
        {
            id: 'analysis',
            icon: <DashboardAnalysisIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipPieIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='Analysis' />,
            callback: () => {
                setActiveTab(DBOT_TABS.ANALYSIS_TOOLS);
            },
        },
        {
            id: 'king-of-matches',
            icon: <DashboardKingOfMatchesIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipDiceIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='King of Matches' />,
            callback: () => {
                onOpenKingOfMatches();
            },
        },
        {
            id: 'speed-lab',
            icon: <DashboardSpeedLabIcon height='32px' width='32px' />,
            icon_back: <DashboardFlipGaugeIcon height='32px' width='32px' />,
            content: <Localize i18n_default_text='Speed Lab' />,
            callback: () => {
                onOpenSpeedLab();
            },
        },
    ];

    return React.useMemo(
        () => (
            <div
                className={classNames('tab__dashboard__table', {
                    'tab__dashboard__table--minimized': has_dashboard_strategies && is_mobile,
                })}
            >
                <div
                    className={classNames('tab__dashboard__table__tiles', {
                        'tab__dashboard__table__tiles--minimized': has_dashboard_strategies && is_mobile,
                    })}
                    id='tab__dashboard__table__tiles'
                >
                    {actions.map((icons, index) => {
                        const { icon, icon_back, content, callback, id } = icons;
                        const stagger_ms = index * DASHBOARD_CARD_FLIP_STAGGER_MS;
                        return (
                            <div
                                key={id}
                                className={classNames('tab__dashboard__table__block', {
                                    'tab__dashboard__table__block--minimized': has_dashboard_strategies && is_mobile,
                                })}
                                role='presentation'
                            >
                                <div
                                    className={classNames('tab__dashboard__table__flip-scene', {
                                        'tab__dashboard__table__flip-scene--revealed': card_flip_show_alt,
                                    })}
                                    style={
                                        {
                                            '--db-card-flip-delay': `${stagger_ms}ms`,
                                        } as React.CSSProperties
                                    }
                                >
                                    <div className='tab__dashboard__table__flip-inner'>
                                        <div className='tab__dashboard__table__flip-face tab__dashboard__table__flip-face--front'>
                                            <button
                                                type='button'
                                                className={classNames(
                                                    'tab__dashboard__table__images',
                                                    `tab__dashboard__table__images--${id}`,
                                                    {
                                                        'tab__dashboard__table__images--minimized': has_dashboard_strategies,
                                                    }
                                                )}
                                                onClick={() => {
                                                    callback();
                                                }}
                                            >
                                                {icon}
                                            </button>
                                        </div>
                                        <div className='tab__dashboard__table__flip-face tab__dashboard__table__flip-face--back'>
                                            <button
                                                type='button'
                                                className={classNames(
                                                    'tab__dashboard__table__images',
                                                    'tab__dashboard__table__images--flip-back',
                                                    `tab__dashboard__table__images--${id}`,
                                                    {
                                                        'tab__dashboard__table__images--minimized': has_dashboard_strategies,
                                                    }
                                                )}
                                                onClick={() => {
                                                    callback();
                                                }}
                                            >
                                                <span className='tab__dashboard__table__flip-back-shine' aria-hidden />
                                                {icon_back}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type='button'
                                    className='tab__dashboard__table__block-label-btn'
                                    onClick={() => callback()}
                                >
                                    <Text color='prominent' size={is_mobile ? 'xxs' : 'xs'}>
                                        {content}
                                    </Text>
                                </button>
                            </div>
                        );
                    })}

                    {!isDesktop ? (
                        <Dialog
                            title={dialog_options.title}
                            is_visible={is_dialog_open}
                            onCancel={onCloseDialog}
                            is_mobile_full_width
                            className='dc-dialog__wrapper--google-drive'
                            has_close_icon
                        >
                            <GoogleDrive />
                        </Dialog>
                    ) : (
                        <MobileFullPageModal
                            is_modal_open={is_dialog_open}
                            className='load-strategy__wrapper'
                            header={localize('Load strategy')}
                            onClickClose={() => {
                                setPreviewOnPopup(false);
                                onCloseDialog();
                            }}
                            height_offset='80px'
                            page_overlay
                        >
                            <div label='Google Drive' className='google-drive-label'>
                                <GoogleDrive />
                            </div>
                        </MobileFullPageModal>
                    )}
                </div>
            </div>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [is_dialog_open, has_dashboard_strategies, onOpenSpeedLab, onOpenKingOfMatches, card_flip_show_alt]
    );
});

export default Cards;
