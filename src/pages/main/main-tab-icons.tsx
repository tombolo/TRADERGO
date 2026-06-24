import classNames from 'classnames';
import type { IconType } from 'react-icons';
import {
    HiOutlineBriefcase,
    HiOutlineChartBarSquare,
    HiOutlineCog6Tooth,
    HiOutlineComputerDesktop,
    HiOutlineHome,
    HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { RiRobot2Line } from 'react-icons/ri';

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
    dashboard: HiOutlineHome,
    'bot-builder': HiOutlineCog6Tooth,
    'free-bots': RiRobot2Line,
    trader: HiOutlineComputerDesktop,
    'copy-trading': HiOutlineBriefcase,
    charts: HiOutlineChartBarSquare,
    analysis: HiOutlineMagnifyingGlass,
};

type MainTabIconProps = {
    variant: MainTabIconVariant;
    className?: string;
};

/** Outline tab icons — gold tint applied in main.scss */
export const MainTabIcon = ({ variant, className }: MainTabIconProps) => {
    const Icon = ICONS[variant];
    return (
        <span className={classNames('main-tab-icon', `main-tab-icon--${variant}`, className)} aria-hidden>
            <Icon size={TAB_ICON_PX} />
        </span>
    );
};
