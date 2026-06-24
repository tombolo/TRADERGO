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
import henryAlphaVersion2026Edition from './HENRY/AlphaVersion2026Edition.xml';
import henryExpertSpeedBotByCHOSENDOLLARPRINTERFX from './HENRY/ExpertSpeedBotByCHOSENDOLLARPRINTERFX.xml';
import henrySignalSniperAutoBot from './HENRY/SignalSniperAutoBot.xml';
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

const formatBotName = (filename: string): string => {
    const base = filename.replace(/\.xml$/i, '');
    const spaced = base
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/(\d)([A-Za-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();

    return spaced
        .split(' ')
        .map(word =>
            word.length <= 3 && word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(' ');
};

const bot = (folder: string, file: string, xml: string): TFreeBotFile => ({
    folder,
    name: formatBotName(file),
    xml,
});

const entries: TFreeBotFile[] = [
    bot('ARENA', 'Babaking2.xml', arenaBabaking2),
    bot('ARENA', 'EnhancedAutoSwitchOver2bot.xml', arenaEnhancedAutoSwitchOver2bot),
    bot('ARENA', 'HITnRUNPRO.xml', arenaHITnRUNPRO),
    bot('ARENA', 'HuRmYAUTOBoTBYHURMYFXKE.xml', arenaHuRmYAUTOBoTBYHURMYFXKE),
    bot('ARENA', 'HuRmYSPEEDBOTPROv2.xml', arenaHuRmYSPEEDBOTPROv2),
    bot('ARENA', 'M27AutoSwitchbot2024.xml', arenaM27AutoSwitchbot2024),
    bot('ARENA', 'MIKetheG.xml', arenaMIKetheG),
    bot('ARENA', 'STATESDigitSwitcher.xml', arenaSTATESDigitSwitcher),
    bot('ARENA', 'UnderOverAutoSwitch.xml', arenaUnderOverAutoSwitch),
    bot('ARENA', 'Vx.xml', arenaVx),
    bot('HENRY', 'AlphaVersion2026Edition.xml', henryAlphaVersion2026Edition),
    bot('HENRY', 'ExpertSpeedBotByCHOSENDOLLARPRINTERFX.xml', henryExpertSpeedBotByCHOSENDOLLARPRINTERFX),
    bot('HENRY', 'SignalSniperAutoBot.xml', henrySignalSniperAutoBot),
    bot('HUNTER', 'Aibot.xml', hunterAibot),
    bot('HUNTER', 'AutoDifferbylegoo.xml', hunterAutoDifferbylegoo),
    bot('HUNTER', 'DollarprinterbotOrignal.xml', hunterDollarprinterbotOrignal),
    bot('HUNTER', 'KillermarketAIV22024New.xml', hunterKillermarketAIV22024New),
    bot('HUNTER', 'MAIUNDER3NEW.xml', hunterMAIUNDER3NEW),
    bot('HUNTER', 'MARKETKILLERBOT.xml', hunterMARKETKILLERBOT),
    bot('HUNTER', 'martingale_matches_differs.xml', hunterMartingaleMatchesDiffers),
    bot('WIZARD', 'Autovolt5Probot1.xml', wizardAutovolt5Probot1),
    bot('WIZARD', 'Derivwizard1.xml', wizardDerivwizard1),
    bot('WIZARD', 'Derivwizard2.xml', wizardDerivwizard2),
    bot('WIZARD', 'Dollarflipper.xml', wizardDollarflipper),
    bot('WIZARD', 'Dollarminer.xml', wizardDollarminer),
    bot('WIZARD', 'EvenOddAutoSwitcher.xml', wizardEvenOddAutoSwitcher),
    bot('WIZARD', 'RiseFallswitcherBot.xml', wizardRiseFallswitcherBot),
    bot('WIZARD', 'UnderoverAutoswitch.xml', wizardUnderoverAutoswitch),
];

export const FREE_BOT_FOLDER_ORDER = ['WIZARD', 'ARENA', 'HENRY', 'HUNTER'] as const;

export const getFreeBotsByFolder = (): Record<string, TFreeBotFile[]> => {
    const map: Record<string, TFreeBotFile[]> = {};
    for (const folder of FREE_BOT_FOLDER_ORDER) {
        map[folder] = [];
    }
    for (const entry of entries) {
        if (!map[entry.folder]) map[entry.folder] = [];
        map[entry.folder].push(entry);
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
        case 'ARENA':
            return 'Arena';
        case 'HENRY':
            return 'Henry';
        case 'HUNTER':
            return 'Hunter';
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
    WIZARD: 'Wizard strategies — contract switching and stake automation.',
    ARENA: 'Arena bots — speed and auto-switch trading setups.',
    HENRY: 'Henry collection — signal and speed-based strategies.',
    HUNTER: 'Hunter bots — differ, martingale, and market-killer styles.',
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
