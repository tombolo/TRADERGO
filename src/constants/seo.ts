/** Canonical site URL — keep in sync with index.html, robots.txt, and sitemap.xml */
export const SITE_URL = 'https://smarttraderstool.com';

export const SITE_NAME = 'SMART TRADERS';

export const SITE_LOGO_PATH = '/assets/images/MERRICK.png';

export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;

/** Open Graph / Twitter card image */
export const OG_IMAGE = SITE_LOGO_URL;
export const OG_IMAGE_WIDTH = 612;
export const OG_IMAGE_HEIGHT = 408;

export const THEME_COLOR = '#22c55e';

export const SEO_KEYWORDS = [
    'SMART TRADERS',
    'smarttraderstool.com',
    'SMART TRADERS home',
    'smart traders tool',
    'binary tools',
    'trade scheme',
    'dollar printer',
    'Deriv',
    'Deriv tools',
    'Deriv academy',
    'Deriv bot',
    'automated trading',
    'trading bot builder',
    'binary options bot',
    'Deriv trading platform',
    'market analysis',
    'smart trading tools',
].join(', ');

export const DEFAULT_TITLE =
    'SMART TRADERS (smarttraderstool.com) | Home — Binary Tools, Trade Scheme, Dollar Printer & Deriv Tools';

export const DEFAULT_DESCRIPTION =
    'SMART TRADERS (smarttraderstool.com) is your home for market analysis, binary tools, trade schemes, and Dollar Printer strategies. Build automated bots with Deriv tools, Deriv academy guides, and no-code bot builder.';

export const TAB_SEO: Record<string, { title: string; description: string }> = {
    home: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
    },
    dashboard: {
        title: 'SMART TRADERS Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'SMART TRADERS dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
    bot_builder: {
        title: 'SMART TRADERS Bot Builder | Deriv Tools & Automated Trading',
        description:
            'Build automated trading bots with SMART TRADERS bot builder. Visual blocks, Deriv tools, and binary tools — no coding required.',
    },
    free_bots: {
        title: 'SMART TRADERS Free Bots | Dollar Printer & Binary Tools',
        description:
            'Download free trading bots including Dollar Printer strategies. SMART TRADERS free bots for Deriv and binary tools.',
    },
    bulk_trader: {
        title: 'SMART TRADERS Bulk Trader | Even/Odd & Binary Tools',
        description:
            'Bulk trade Even/Odd contracts on SMART TRADERS — live tick analysis, digit distribution, and fast bulk execution.',
    },
    trader: {
        title: 'SMART TRADERS Trader | Deriv Trading Platform',
        description:
            'Trade on Deriv with SMART TRADERS — integrated trader, binary tools, and Deriv tools in one platform.',
    },
    copy_trading: {
        title: 'SMART TRADERS Copy Trading | Trade Scheme & Deriv Tools',
        description:
            'Copy trading on SMART TRADERS — follow trade schemes and strategies with Deriv tools support.',
    },
    chart: {
        title: 'SMART TRADERS Charts | Binary Tools & Market Analysis',
        description: 'Live charts and market analysis on SMART TRADERS — binary tools for Deriv traders.',
    },
    analysis_tools: {
        title: 'SMART TRADERS Analysis Tools | Deriv Academy & Binary Tools',
        description:
            'Technical analysis on SMART TRADERS — Deriv academy style insights and binary tools.',
    },
    app: {
        title: 'SMART TRADERS Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'SMART TRADERS dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
};

export function getTabFromHash(): string {
    const segment = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    return segment || (window.location.pathname.startsWith('/app') ? 'dashboard' : 'home');
}
