type TDeferredInstallPrompt = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const getDeferredInstallPrompt = () => {
    return (window as Window & { deferredInstallPrompt?: TDeferredInstallPrompt }).deferredInstallPrompt;
};

export const showInstallPrompt = async () => {
    const deferredInstallPrompt = getDeferredInstallPrompt();
    if (!deferredInstallPrompt) return false;

    await deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    (window as Window & { deferredInstallPrompt?: TDeferredInstallPrompt }).deferredInstallPrompt = undefined;
    return result.outcome === 'accepted';
};
