/** Show a browser alert when the bot hits stop loss or take profit. */
export const shouldShowHaltAlert = (message: string | Error, sound?: string): boolean => {
    void message;
    void sound;
    // Disable blocking browser alerts; journal + sound are enough feedback.
    return false;
};

export const showHaltAlert = (message: string | Error): void => {
    void message;
};
