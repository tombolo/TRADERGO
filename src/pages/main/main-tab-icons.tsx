import classNames from 'classnames';
import type { IconType } from 'react-icons';
import {
    MdAnalytics,
    MdCandlestickChart,
    MdExtension,
    MdSmartToy,
    MdSpaceDashboard,
    MdStackedLineChart,
    MdSwapHoriz,
} from 'react-icons/md';

const TAB_ICON_PX = 22;

export type MainTabIconVariant =
    | 'dashboard'
    | 'bot-builder'
    | 'free-bots'
    | 'trader'
    | 'copy-trading'
    | 'charts'
    | 'analysis';

const ICONS: Record<MainTabIconVariant, IconType> = {
    dashboard: MdSpaceDashboard,
    'bot-builder': MdExtension,
    'free-bots': MdSmartToy,
    trader: MdStackedLineChart,
    'copy-trading': MdSwapHoriz,
    charts: MdCandlestickChart,
    analysis: MdAnalytics,
};

type MainTabIconProps = {
    variant: MainTabIconVariant;
    className?: string;
};

/**
 * Colored tab icons for main navigation; inactive tabs use pastel accents, active tab forces white via SCSS.
 */
export const MainTabIcon = ({ variant, className }: MainTabIconProps) => {
    const Icon = ICONS[variant];
    return (
        <span className={classNames('main-tab-icon', `main-tab-icon--${variant}`, className)} aria-hidden>
            <Icon size={TAB_ICON_PX} />
        </span>
    );
};
