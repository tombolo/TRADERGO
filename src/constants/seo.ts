/** Canonical site URL — keep in sync with index.html, robots.txt, and sitemap.xml */
export const SITE_URL = 'https://pipstrades.pro';

export const SITE_DOMAIN = 'pipstrades.pro';

export const SITE_NAME = 'PIPS TRADES';

export const SITE_LOGO_PATH = '/assets/images/MERRICK.png';

export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;

/** Open Graph / Twitter card image */
export const OG_IMAGE = SITE_LOGO_URL;
export const OG_IMAGE_WIDTH = 612;
export const OG_IMAGE_HEIGHT = 408;

export const THEME_COLOR = '#10b981';

export const SEO_KEYWORDS = [
    'PIPS TRADES',
    'pipstrades.pro',
    'PIPS TRADES home',
    'pips trades',
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
    'pips trading tools',
].join(', ');

export const DEFAULT_TITLE =
    'PIPS TRADES (pipstrades.pro) | Home — Binary Tools, Trade Scheme, Dollar Printer & Deriv Tools';

export const DEFAULT_DESCRIPTION =
    'PIPS TRADES (pipstrades.pro) is your home for market analysis, binary tools, trade schemes, and Dollar Printer strategies. Build automated bots with Deriv tools, Deriv academy guides, and no-code bot builder.';

export const TAB_SEO: Record<string, { title: string; description: string }> = {
    home: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
    },
    dashboard: {
        title: 'PIPS TRADES Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'PIPS TRADES dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
    bot_builder: {
        title: 'PIPS TRADES Bot Builder | Deriv Tools & Automated Trading',
        description:
            'Build automated trading bots with PIPS TRADES bot builder. Visual blocks, Deriv tools, and binary tools — no coding required.',
    },
    free_bots: {
        title: 'PIPS TRADES Free Bots | Dollar Printer & Binary Tools',
        description:
            'Download free trading bots including Dollar Printer strategies. PIPS TRADES free bots for Deriv and binary tools.',
    },
    bulk_trader: {
        title: 'PIPS TRADES Bulk Trader | Even/Odd & Binary Tools',
        description:
            'Bulk trade Even/Odd contracts on PIPS TRADES — live tick analysis, digit distribution, and fast bulk execution.',
    },
    trader: {
        title: 'PIPS TRADES Trader | Deriv Trading Platform',
        description:
            'Trade on Deriv with PIPS TRADES — integrated trader, binary tools, and Deriv tools in one platform.',
    },
    copy_trading: {
        title: 'PIPS TRADES Copy Trading | Trade Scheme & Deriv Tools',
        description:
            'Copy trading on PIPS TRADES — follow trade schemes and strategies with Deriv tools support.',
    },
    chart: {
        title: 'PIPS TRADES Charts | Binary Tools & Market Analysis',
        description: 'Live charts and market analysis on PIPS TRADES — binary tools for Deriv traders.',
    },
    analysis_tools: {
        title: 'PIPS TRADES Analysis Tools | Deriv Academy & Binary Tools',
        description:
            'Technical analysis on PIPS TRADES — Deriv academy style insights and binary tools.',
    },
    app: {
        title: 'PIPS TRADES Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'PIPS TRADES dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
};

export function getTabFromHash(): string {
    const segment = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    return segment || (window.location.pathname.startsWith('/app') ? 'dashboard' : 'home');
}
