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

// Tab indices match the rendering order in src/pages/main/main.tsx
export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    FREE_BOTS: 2,
    TUTORIAL: 3,
    COPY_TRADING: 4,
    CHART: 5,
    ANALYSIS_TOOLS: 6,
});

/** URL hash segments for main tabs (order must match tab index). */
export const TAB_HASH_SEGMENTS = [
    'dashboard',
    'bot_builder',
    'free_bots',
    'trader',
    'copy_trading',
    'chart',
    'analysis_tools',
] as const;

export const MAX_STRATEGIES = 10;

// Tab element IDs — order must match the tab rendering order in main.tsx
export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-free-bots',
    'id-trader',
    'id-copy-trading',
    'id-charts',
    'id-analysis-tools',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
