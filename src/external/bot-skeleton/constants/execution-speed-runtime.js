let pacing_seconds = 0;
let sleep_multiplier = 1;

export const syncExecutionSpeedRuntime = (pacing, multiplier) => {
    pacing_seconds = Math.max(0, Number(pacing) || 0);
    sleep_multiplier = Math.max(1, Number(multiplier) || 1);
};

export const getExecutionPacingSeconds = () => pacing_seconds;

export const getExecutionSleepMultiplier = () => sleep_multiplier;

export const waitForExecutionPacing = () => {
    const seconds = getExecutionPacingSeconds();

    if (seconds <= 0) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000);
    });
};
