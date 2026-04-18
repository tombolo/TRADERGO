import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import OnboardTourHandler from '../tutorials/dbot-tours/onboarding-tour';
import Announcements from './announcements';
import Cards from './cards';
import InfoPanel from './info-panel';

const SpeedLabPanelLazy = React.lazy(() =>
    import('./speed-lab').then(m => ({ default: m.SpeedLabPanel }))
);

const KingOfMatchesPanelLazy = React.lazy(() =>
    import('./king-of-matches').then(m => ({ default: m.KingOfMatchesPanel }))
);

type TMobileIconGuide = {
    handleTabChange: (active_number: number) => void;
};

const DashboardComponent = observer(({ handleTabChange }: TMobileIconGuide) => {
    const { load_modal, dashboard, client } = useStore();
    const { dashboard_strategies } = load_modal;
    const { active_tab, active_tour } = dashboard;
    const has_dashboard_strategies = !!dashboard_strategies?.length;
    const { isDesktop, isTablet } = useDevice();
    const [is_speed_lab_open, setIsSpeedLabOpen] = React.useState(false);
    const [is_king_of_matches_open, setIsKingOfMatchesOpen] = React.useState(false);

    const closeSpeedLab = React.useCallback(() => setIsSpeedLabOpen(false), []);
    const closeKingOfMatches = React.useCallback(() => setIsKingOfMatchesOpen(false), []);

    const openSpeedLab = React.useCallback(() => {
        setIsKingOfMatchesOpen(false);
        setIsSpeedLabOpen(true);
    }, []);

    const openKingOfMatches = React.useCallback(() => {
        setIsSpeedLabOpen(false);
        setIsKingOfMatchesOpen(true);
    }, []);

    React.useEffect(() => {
        if (!is_speed_lab_open && !is_king_of_matches_open) return undefined;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            closeSpeedLab();
            closeKingOfMatches();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [is_speed_lab_open, is_king_of_matches_open, closeSpeedLab, closeKingOfMatches]);

    return (
        <React.Fragment>
            <div
                className={classNames('tab__dashboard', {
                    'tab__dashboard--tour-active': active_tour,
                })}
            >
                <div className='tab__dashboard__content'>
                    <div
                        className={classNames('tab__dashboard__kom-stage', {
                            'tab__dashboard__kom-stage--open': is_king_of_matches_open,
                        })}
                    >
                        <div className='tab__dashboard__kom-track'>
                            <div
                                className='tab__dashboard__kom-pane tab__dashboard__kom-pane--kom'
                                role='dialog'
                                aria-modal={is_king_of_matches_open}
                                aria-labelledby={
                                    is_king_of_matches_open ? 'king-of-matches-heading' : undefined
                                }
                                aria-label={!is_king_of_matches_open ? localize('King of Matches') : undefined}
                                aria-hidden={!is_king_of_matches_open}
                            >
                                {is_king_of_matches_open ? (
                                    <React.Suspense fallback={null}>
                                        <KingOfMatchesPanelLazy onClose={closeKingOfMatches} />
                                    </React.Suspense>
                                ) : null}
                            </div>
                            <div className='tab__dashboard__kom-pane tab__dashboard__kom-pane--shell'>
                                <div
                                    className={classNames('tab__dashboard__speed-lab-stage', {
                                        'tab__dashboard__speed-lab-stage--open': is_speed_lab_open,
                                    })}
                                >
                                    <div className='tab__dashboard__speed-lab-track'>
                                        <div className='tab__dashboard__speed-lab-pane tab__dashboard__speed-lab-pane--main'>
                                            {client.is_logged_in && (
                                                <Announcements
                                                    is_mobile={!isDesktop}
                                                    is_tablet={isTablet}
                                                    handleTabChange={handleTabChange}
                                                />
                                            )}
                                            <div className='quick-panel'>
                                                <div
                                                    className={classNames('tab__dashboard__header', {
                                                        'tab__dashboard__header--listed':
                                                            isDesktop && has_dashboard_strategies,
                                                    })}
                                                >
                                                    {!has_dashboard_strategies && (
                                                        <Text
                                                            className='title'
                                                            as='h2'
                                                            color='prominent'
                                                            size={isDesktop ? 'sm' : 's'}
                                                            lineHeight='xxl'
                                                            weight='bold'
                                                        >
                                                            {localize('Load or build your bot')}
                                                        </Text>
                                                    )}
                                                    <Text
                                                        as='p'
                                                        color='prominent'
                                                        lineHeight='s'
                                                        size={isDesktop ? 's' : 'xxs'}
                                                        className={classNames('subtitle', {
                                                            'subtitle__has-list': has_dashboard_strategies,
                                                        })}
                                                    >
                                                        {localize(
                                                            'Import a bot from your computer or Google Drive, build it from scratch, or start with a quick strategy.'
                                                        )}
                                                    </Text>
                                                </div>
                                                <Cards
                                                    has_dashboard_strategies={has_dashboard_strategies}
                                                    is_mobile={!isDesktop}
                                                    onOpenSpeedLab={openSpeedLab}
                                                    onOpenKingOfMatches={openKingOfMatches}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className='tab__dashboard__speed-lab-pane tab__dashboard__speed-lab-pane--lab'
                                            role='dialog'
                                            aria-modal={is_speed_lab_open}
                                            aria-labelledby={
                                                is_speed_lab_open ? 'speed-lab-heading' : undefined
                                            }
                                            aria-label={!is_speed_lab_open ? localize('Speed Lab') : undefined}
                                            aria-hidden={!is_speed_lab_open}
                                        >
                                            {is_speed_lab_open ? (
                                                <React.Suspense fallback={null}>
                                                    <SpeedLabPanelLazy onClose={closeSpeedLab} />
                                                </React.Suspense>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <InfoPanel />
            {active_tab === 0 && <OnboardTourHandler is_mobile={!isDesktop} />}
        </React.Fragment>
    );
});

export default DashboardComponent;
