/** Canonical site URL — keep in sync with index.html, robots.txt, and sitemap.xml */
export const SITE_URL = 'https://derivanalysinghub.com';

export const SITE_NAME = 'DERIV ANALYSING HUB';

export const SITE_LOGO_PATH = '/assets/images/MERRICK.png';

export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;

/** Open Graph / Twitter card image */
export const OG_IMAGE = SITE_LOGO_URL;
export const OG_IMAGE_WIDTH = 612;
export const OG_IMAGE_HEIGHT = 408;

export const THEME_COLOR = '#22c55e';

export const SEO_KEYWORDS = [
    'DERIV ANALYSING HUB',
    'derivanalysinghub.com',
    'DERIV ANALYSING HUB home',
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
    'deriv analysing hub',
].join(', ');

export const DEFAULT_TITLE =
    'DERIV ANALYSING HUB (derivanalysinghub.com) | Home — Binary Tools, Trade Scheme, Dollar Printer & Deriv Tools';

export const DEFAULT_DESCRIPTION =
    'DERIV ANALYSING HUB (derivanalysinghub.com) is your home for market analysis, binary tools, trade schemes, and Dollar Printer strategies. Build automated bots with Deriv tools, Deriv academy guides, and no-code bot builder.';

export const TAB_SEO: Record<string, { title: string; description: string }> = {
    home: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
    },
    dashboard: {
        title: 'DERIV ANALYSING HUB Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'DERIV ANALYSING HUB dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
    bot_builder: {
        title: 'DERIV ANALYSING HUB Bot Builder | Deriv Tools & Automated Trading',
        description:
            'Build automated trading bots with DERIV ANALYSING HUB bot builder. Visual blocks, Deriv tools, and binary tools — no coding required.',
    },
    free_bots: {
        title: 'DERIV ANALYSING HUB Free Bots | Dollar Printer & Binary Tools',
        description:
            'Download free trading bots including Dollar Printer strategies. DERIV ANALYSING HUB free bots for Deriv and binary tools.',
    },
    bulk_trader: {
        title: 'DERIV ANALYSING HUB Bulk Trader | Even/Odd & Binary Tools',
        description:
            'Bulk trade Even/Odd contracts on DERIV ANALYSING HUB — live tick analysis, digit distribution, and fast bulk execution.',
    },
    trader: {
        title: 'DERIV ANALYSING HUB Trader | Deriv Trading Platform',
        description:
            'Trade on Deriv with DERIV ANALYSING HUB — integrated trader, binary tools, and Deriv tools in one platform.',
    },
    copy_trading: {
        title: 'DERIV ANALYSING HUB Copy Trading | Trade Scheme & Deriv Tools',
        description:
            'Copy trading on DERIV ANALYSING HUB — follow trade schemes and strategies with Deriv tools support.',
    },
    chart: {
        title: 'DERIV ANALYSING HUB Charts | Binary Tools & Market Analysis',
        description: 'Live charts and market analysis on DERIV ANALYSING HUB — binary tools for Deriv traders.',
    },
    analysis_tools: {
        title: 'DERIV ANALYSING HUB Analysis Tools | Deriv Academy & Binary Tools',
        description:
            'Technical analysis on DERIV ANALYSING HUB — Deriv academy style insights and binary tools.',
    },
    app: {
        title: 'DERIV ANALYSING HUB Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'DERIV ANALYSING HUB dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
};

export function getTabFromHash(): string {
    const segment = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    return segment || (window.location.pathname.startsWith('/app') ? 'dashboard' : 'home');
}
