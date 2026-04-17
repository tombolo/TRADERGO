import arenaBabaking2 from './ARENA/Babaking2.xml';
import arenaEnhancedAutoSwitchOver2bot from './ARENA/EnhancedAutoSwitchOver2bot.xml';
import arenaHITnRUNPRO from './ARENA/HITnRUNPRO.xml';
import arenaHuRmYAUTOBoTBYHURMYFXKE from './ARENA/HuRmYAUTOBoTBYHURMYFXKE.xml';
import arenaHuRmYSPEEDBOTPROv2 from './ARENA/HuRmYSPEEDBOTPROv2.xml';
import arenaM27AutoSwitchbot2024 from './ARENA/M27AutoSwitchbot2024.xml';
import arenaMIKetheG from './ARENA/MIKetheG.xml';
import arenaSTATESDigitSwitcher from './ARENA/STATESDigitSwitcher.xml';
import arenaUnderOverAutoSwitch from './ARENA/UnderOverAutoSwitch.xml';
import arenaVx from './ARENA/Vx.xml';
import hunterAibot from './HUNTER/Aibot.xml';
import hunterAutoDifferbylegoo from './HUNTER/AutoDifferbylegoo.xml';
import hunterDollarprinterbotOrignal from './HUNTER/DollarprinterbotOrignal.xml';
import hunterKillermarketAIV22024New from './HUNTER/KillermarketAIV22024New.xml';
import hunterMAIUNDER3NEW from './HUNTER/MAIUNDER3NEW.xml';
import hunterMARKETKILLERBOT from './HUNTER/MARKETKILLERBOT.xml';
import hunterMartingaleMatchesDiffers from './HUNTER/martingale_matches_differs.xml';
import wizardAutovolt5Probot1 from './WIZARD/Autovolt5Probot1.xml';
import wizardDerivwizard1 from './WIZARD/Derivwizard1.xml';
import wizardDerivwizard2 from './WIZARD/Derivwizard2.xml';
import wizardDollarflipper from './WIZARD/Dollarflipper.xml';
import wizardDollarminer from './WIZARD/Dollarminer.xml';
import wizardEvenOddAutoSwitcher from './WIZARD/EvenOddAutoSwitcher.xml';
import wizardRiseFallswitcherBot from './WIZARD/RiseFallswitcherBot.xml';
import wizardUnderoverAutoswitch from './WIZARD/UnderoverAutoswitch.xml';

export type TFreeBotFile = {
    folder: string;
    /** Display title derived from filename */
    name: string;
    xml: string;
};

const titleFromFileKey = (key: string) =>
    key
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim();

const entries: TFreeBotFile[] = [
    { folder: 'ARENA', name: titleFromFileKey('Babaking2'), xml: arenaBabaking2 },
    { folder: 'ARENA', name: titleFromFileKey('EnhancedAutoSwitchOver2bot'), xml: arenaEnhancedAutoSwitchOver2bot },
    { folder: 'ARENA', name: titleFromFileKey('HITnRUNPRO'), xml: arenaHITnRUNPRO },
    { folder: 'ARENA', name: titleFromFileKey('HuRmYAUTOBoTBYHURMYFXKE'), xml: arenaHuRmYAUTOBoTBYHURMYFXKE },
    { folder: 'ARENA', name: titleFromFileKey('HuRmYSPEEDBOTPROv2'), xml: arenaHuRmYSPEEDBOTPROv2 },
    { folder: 'ARENA', name: titleFromFileKey('M27AutoSwitchbot2024'), xml: arenaM27AutoSwitchbot2024 },
    { folder: 'ARENA', name: titleFromFileKey('MIKetheG'), xml: arenaMIKetheG },
    { folder: 'ARENA', name: titleFromFileKey('STATESDigitSwitcher'), xml: arenaSTATESDigitSwitcher },
    { folder: 'ARENA', name: titleFromFileKey('UnderOverAutoSwitch'), xml: arenaUnderOverAutoSwitch },
    { folder: 'ARENA', name: titleFromFileKey('Vx'), xml: arenaVx },
    { folder: 'HUNTER', name: titleFromFileKey('Aibot'), xml: hunterAibot },
    { folder: 'HUNTER', name: titleFromFileKey('AutoDifferbylegoo'), xml: hunterAutoDifferbylegoo },
    { folder: 'HUNTER', name: titleFromFileKey('DollarprinterbotOrignal'), xml: hunterDollarprinterbotOrignal },
    { folder: 'HUNTER', name: titleFromFileKey('KillermarketAIV22024New'), xml: hunterKillermarketAIV22024New },
    { folder: 'HUNTER', name: titleFromFileKey('MAIUNDER3NEW'), xml: hunterMAIUNDER3NEW },
    { folder: 'HUNTER', name: titleFromFileKey('MARKETKILLERBOT'), xml: hunterMARKETKILLERBOT },
    { folder: 'HUNTER', name: titleFromFileKey('martingale_matches_differs'), xml: hunterMartingaleMatchesDiffers },
    { folder: 'WIZARD', name: titleFromFileKey('Autovolt5Probot1'), xml: wizardAutovolt5Probot1 },
    { folder: 'WIZARD', name: titleFromFileKey('Derivwizard1'), xml: wizardDerivwizard1 },
    { folder: 'WIZARD', name: titleFromFileKey('Derivwizard2'), xml: wizardDerivwizard2 },
    { folder: 'WIZARD', name: titleFromFileKey('Dollarflipper'), xml: wizardDollarflipper },
    { folder: 'WIZARD', name: titleFromFileKey('Dollarminer'), xml: wizardDollarminer },
    { folder: 'WIZARD', name: titleFromFileKey('EvenOddAutoSwitcher'), xml: wizardEvenOddAutoSwitcher },
    { folder: 'WIZARD', name: titleFromFileKey('RiseFallswitcherBot'), xml: wizardRiseFallswitcherBot },
    { folder: 'WIZARD', name: titleFromFileKey('UnderoverAutoswitch'), xml: wizardUnderoverAutoswitch },
];

export const FREE_BOT_FOLDER_ORDER = ['ARENA', 'HUNTER', 'WIZARD'] as const;

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
        case 'ARENA':
            return 'Arena';
        case 'HUNTER':
            return 'Hunter';
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
    ARENA: 'Fast-paced digit and volatility blocks for short runs.',
    HUNTER: 'Directional setups with filters and guarded exits.',
    WIZARD: 'Switches contracts and stakes in one workspace.',
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
