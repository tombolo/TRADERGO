import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
/* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
/* [/AI] */
import ToolbarActionIcon from './toolbar-action-icons';
import ToolbarIcon from './toolbar-icon';

const WorkspaceGroup = observer(() => {
    const { dashboard, toolbar, load_modal } = useStore();
    const { setPreviewOnPopup, setChartModalVisibility, setTradingViewModalVisibility } = dashboard;
    const { has_redo_stack, has_undo_stack, onResetClick, onSortClick, onUndoClick, onZoomInOutClick } = toolbar;
    const { toggleLoadModal } = load_modal;
    const { isDesktop } = useDevice();

    return (
        <div className='toolbar__wrapper'>
            <div className='toolbar__group toolbar__group-btn' data-testid='dt_toolbar_group_btn'>
                <ToolbarIcon
                    popover_message={localize('Reset')}
                    icon={
                        <ToolbarActionIcon
                            variant='reset'
                            id='db-toolbar__reset-button'
                            testId='dt_toolbar_reset_button'
                            onClick={onResetClick}
                        />
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Import')}
                    icon={
                        <ToolbarActionIcon
                            variant='import'
                            id='db-toolbar__import-button'
                            testId='dt_toolbar_import_button'
                            onClick={() => {
                                setPreviewOnPopup(true);
                                toggleLoadModal();
                            }}
                        />
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Sort blocks')}
                    icon={
                        <ToolbarActionIcon
                            variant='sort'
                            id='db-toolbar__sort-button'
                            testId='dt_toolbar_sort_button'
                            onClick={onSortClick}
                        />
                    }
                />
                {isDesktop && (
                    <>
                        <div className='vertical-divider' />
                        <ToolbarIcon
                            popover_message={localize('Charts')}
                            icon={
                                <ToolbarActionIcon
                                    variant='charts'
                                    id='db-toolbar__charts-button'
                                    onClick={() => setChartModalVisibility()}
                                />
                            }
                        />
                        <ToolbarIcon
                            popover_message={localize('TradingView Chart')}
                            icon={
                                <ToolbarActionIcon
                                    variant='tradingview'
                                    id='db-toolbar__tradingview-button'
                                    onClick={() => setTradingViewModalVisibility()}
                                />
                            }
                        />
                    </>
                )}
                <div className='vertical-divider' />
                <ToolbarIcon
                    popover_message={localize('Undo')}
                    icon={
                        <ToolbarActionIcon
                            variant='undo'
                            id='db-toolbar__undo-button'
                            testId='dt_toolbar_undo_button'
                            disabled={!has_undo_stack}
                            onClick={() => onUndoClick(false)}
                        />
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Redo')}
                    icon={
                        <ToolbarActionIcon
                            variant='redo'
                            id='db-toolbar__redo-button'
                            testId='dt_toolbar_redo_button'
                            disabled={!has_redo_stack}
                            onClick={() => onUndoClick(true)}
                        />
                    }
                />
                <div className='vertical-divider' />
                <ToolbarIcon
                    popover_message={localize('Zoom in')}
                    icon={
                        <ToolbarActionIcon
                            variant='zoom-in'
                            id='db-toolbar__zoom-in-button'
                            testId='dt_toolbar_zoom_in_button'
                            onClick={() => onZoomInOutClick(true)}
                        />
                    }
                />
                <ToolbarIcon
                    popover_message={localize('Zoom out')}
                    icon={
                        <ToolbarActionIcon
                            variant='zoom-out'
                            id='db-toolbar__zoom-out'
                            testId='dt_toolbar_zoom_out_button'
                            onClick={() => onZoomInOutClick(false)}
                        />
                    }
                />
            </div>
        </div>
    );
});

export default WorkspaceGroup;
