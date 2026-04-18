/**
 * Speed Lab uses the same contract discovery pipeline as Quick Strategy:
 * `contracts_for.getTradeTypesForQuickStrategy` → `getContractTypes` → `getDurations`.
 */
/** Narrow import avoids evaluating the full `bot-skeleton` barrel (and `DBot`) on dashboard load. */
import ApiHelpers from '@/external/bot-skeleton/services/api/api-helpers';
import type { TDropdownItems, TDurationUnitItem, TTradeType } from '@/pages/bot-builder/quick-strategy/types';

type TContractsForQs = {
    getTradeTypesForQuickStrategy: (symbol: string, accu?: string) => Promise<TTradeType[]>;
    getContractTypes: (tradetype: string) => TDropdownItems[];
    getDurations: (symbol: string, tradetype: string) => Promise<TDurationUnitItem[]>;
};

export function speedLabContractsFor(): TContractsForQs | null {
    const inst = ApiHelpers?.instance as { contracts_for?: TContractsForQs } | undefined;
    return inst?.contracts_for ?? null;
}

export async function speedLabLoadTradeTypes(symbol: string): Promise<TTradeType[]> {
    const cf = speedLabContractsFor();
    if (!cf || !symbol) return [];
    try {
        return (await cf.getTradeTypesForQuickStrategy(symbol, '')) ?? [];
    } catch {
        return [];
    }
}

export function speedLabContractTypes(tradetype: string): TDropdownItems[] {
    const cf = speedLabContractsFor();
    if (!cf || !tradetype) return [];
    try {
        return cf.getContractTypes(tradetype) ?? [];
    } catch {
        return [];
    }
}

export type TSpeedLabDurationOption = {
    display: string;
    unit_api: string;
    min: number;
    max: number;
};

export async function speedLabLoadDurations(symbol: string, tradetype: string): Promise<TSpeedLabDurationOption[]> {
    const cf = speedLabContractsFor();
    if (!cf || !symbol || !tradetype) return [];
    try {
        const rows = (await cf.getDurations(symbol, tradetype)) ?? [];
        return rows
            .map((d: TDurationUnitItem) => {
                const unit_api = String(d.unit ?? d.value ?? '').trim();
                const display = String(d.display ?? d.text ?? unit_api);
                return {
                    display,
                    unit_api,
                    min: Number(d.min) || 1,
                    max: Number(d.max) || 1,
                };
            })
            .filter(d => d.unit_api && d.unit_api !== 'na');
    } catch {
        return [];
    }
}

export const SPEED_LAB_CALLPUT_TRADETYPE = 'callput';
