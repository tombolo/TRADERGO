type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    CHART: 2,
    TUTORIAL: 3,
    FREE_BITS: 4,
    ANALYSIS_TOOLS: 5,
    COPY_TRADING: 6,
});

/** URL hash segments for main tabs (order must match tab index). */
export const TAB_HASH_SEGMENTS = [
    'dashboard',
    'bot_builder',
    'chart',
    'tutorial',
    'free_bits',
    'analysis_tools',
    'copy_trading',
] as const;

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-tutorials',
    'id-free-bits',
    'id-analysis-tools',
    'id-copy-trading',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
