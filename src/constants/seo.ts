/** Canonical site URL — keep in sync with index.html, robots.txt, and sitemap.xml */
export const SITE_URL = 'https://softtrades.pro';

export const SITE_NAME = 'SOFT TRADES';

export const SITE_LOGO_PATH = '/assets/images/MERRICK.png';

export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`;

/** Open Graph / Twitter card image (SOFT TRADES logo) */
export const OG_IMAGE = SITE_LOGO_URL;
export const OG_IMAGE_WIDTH = 612;
export const OG_IMAGE_HEIGHT = 408;

export const THEME_COLOR = '#22c55e';

export const SEO_KEYWORDS = [
    'SOFT TRADES',
    'softtrades.pro',
    'SOFT TRADES home',
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
].join(', ');

export const DEFAULT_TITLE =
    'SOFT TRADES | Home — Binary Tools, Trade Scheme, Dollar Printer & Deriv Tools';

export const DEFAULT_DESCRIPTION =
    'SOFT TRADES (softtrades.pro) is your home for binary tools, trade schemes, and Dollar Printer strategies. Build automated bots with Deriv tools, Deriv academy guides, and no-code bot builder — trade smarter.';

export const TAB_SEO: Record<string, { title: string; description: string }> = {
    dashboard: {
        title: 'SOFT TRADES Dashboard | Binary Tools & Trade Scheme Home',
        description:
            'SOFT TRADES dashboard — load bots, use binary tools, trade schemes, and Dollar Printer strategies with Deriv tools.',
    },
    bot_builder: {
        title: 'SOFT TRADES Bot Builder | Deriv Tools & Automated Trading',
        description:
            'Build automated trading bots with SOFT TRADES bot builder. Visual blocks, Deriv tools, and binary tools — no coding required.',
    },
    free_bots: {
        title: 'SOFT TRADES Free Bots | Dollar Printer & Binary Tools',
        description:
            'Download free trading bots including Dollar Printer strategies. SOFT TRADES free bots for Deriv and binary tools.',
    },
    trader: {
        title: 'SOFT TRADES Trader | Deriv Trading Platform',
        description: 'Trade on Deriv with SOFT TRADES — integrated trader, binary tools, and Deriv tools in one platform.',
    },
    copy_trading: {
        title: 'SOFT TRADES Copy Trading | Trade Scheme & Deriv Tools',
        description: 'Copy trading on SOFT TRADES — follow trade schemes and strategies with Deriv tools support.',
    },
    chart: {
        title: 'SOFT TRADES Charts | Binary Tools & Market Analysis',
        description: 'Live charts and market analysis on SOFT TRADES — binary tools for Deriv traders.',
    },
    analysis_tools: {
        title: 'SOFT TRADES Analysis Tools | Deriv Academy & Binary Tools',
        description: 'Technical analysis on SOFT TRADES — Deriv academy style insights and binary tools.',
    },
};

export function getTabFromHash(): string {
    const segment = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    return segment || 'dashboard';
}
