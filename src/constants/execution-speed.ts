import { syncExecutionSpeedRuntime } from '@/external/bot-skeleton/constants/execution-speed-runtime';

export const EXECUTION_SPEED_STORAGE_KEY = 'bot_execution_speed';

export type TExecutionSpeed = 'high' | 'slow';

/** Extra pause between completed contracts (seconds). */
export const EXECUTION_SPEED_PACING_SECONDS: Record<TExecutionSpeed, number> = {
    high: 0,
    slow: 4,
};

/** Multiplier applied to every `sleep()` in the bot strategy. */
export const EXECUTION_SPEED_SLEEP_MULTIPLIER: Record<TExecutionSpeed, number> = {
    high: 1,
    slow: 2,
};

declare global {
    interface Window {
        __BOT_EXECUTION_PACING_SECONDS__?: number;
        __BOT_EXECUTION_SLEEP_MULTIPLIER__?: number;
    }
}

export const getStoredExecutionSpeed = (): TExecutionSpeed => {
    try {
        const stored = localStorage.getItem(EXECUTION_SPEED_STORAGE_KEY);
        return stored === 'slow' ? 'slow' : 'high';
    } catch {
        return 'high';
    }
};

export const persistExecutionSpeed = (speed: TExecutionSpeed): void => {
    try {
        localStorage.setItem(EXECUTION_SPEED_STORAGE_KEY, speed);
    } catch {
        // ignore storage errors
    }
};

export const applyExecutionSpeedToWindow = (speed: TExecutionSpeed): void => {
    const pacing_seconds = EXECUTION_SPEED_PACING_SECONDS[speed];
    const sleep_multiplier = EXECUTION_SPEED_SLEEP_MULTIPLIER[speed];

    syncExecutionSpeedRuntime(pacing_seconds, sleep_multiplier);

    if (typeof window !== 'undefined') {
        window.__BOT_EXECUTION_PACING_SECONDS__ = pacing_seconds;
        window.__BOT_EXECUTION_SLEEP_MULTIPLIER__ = sleep_multiplier;
    }
};
