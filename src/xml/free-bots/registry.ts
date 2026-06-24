import wizardDollarminer from './WIZARD/Dollarminer.xml';

export type TFreeBotFile = {
    folder: string;
    /** Display title derived from filename */
    name: string;
    xml: string;
};

const MASTER_BOT_NAME = 'DERIV ANALYSING HUB MASTER BOT';

const entries: TFreeBotFile[] = [
    { folder: 'WIZARD', name: MASTER_BOT_NAME, xml: wizardDollarminer },
];

export const FREE_BOT_FOLDER_ORDER = ['WIZARD'] as const;

export const getFreeBotsByFolder = (): Record<string, TFreeBotFile[]> => {
    const map: Record<string, TFreeBotFile[]> = {};
    for (const folder of FREE_BOT_FOLDER_ORDER) {
        map[folder] = [];
    }
    for (const bot of entries) {
        if (!map[bot.folder]) map[bot.folder] = [];
        map[bot.folder].push(bot);
    }
    for (const key of Object.keys(map)) {
        map[key].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return map;
};

export const folderBadgeLabel = (folder: string): string => {
    switch (folder) {
        case 'WIZARD':
            return 'Wizard';
        default:
            return folder;
    }
};

const djb2 = (str: string): number => {
    let hash = 5381;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
};

/** Stable “social proof” count per bot (not live analytics). */
export const getBotUsingCount = (bot: TFreeBotFile): number => 24 + (djb2(`${bot.folder}:${bot.name}`) % 2847);

const folderDescriptionLine: Record<string, string> = {
    WIZARD: 'Flagship strategy — switches contracts and stakes in one workspace.',
};

export const getBotDescription = (bot: TFreeBotFile): string =>
    folderDescriptionLine[bot.folder] ?? 'Ready-made strategy blocks.';

/** Three portrait URLs for overlapping avatars (deterministic per bot). */
export const getBotAvatarUrls = (bot: TFreeBotFile): [string, string, string] => {
    const h = djb2(bot.name);
    const img = (offset: number) => `https://i.pravatar.cc/96?img=${1 + ((h + offset) % 70)}`;
    return [img(0), img(11), img(29)];
};

export const getAllFreeBotsSorted = (): TFreeBotFile[] => {
    const map = getFreeBotsByFolder();
    return FREE_BOT_FOLDER_ORDER.flatMap(folder => map[folder] ?? []);
};
