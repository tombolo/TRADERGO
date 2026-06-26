import { isLocal } from '@/components/shared/utils/config/config';
import { renderDevToolsBlockedScreen } from '@/utils/devtools-blocked-screen';

const DEVTOOLS_PROTECTION_ACTIVE = false;

const DEVTOOLS_SIZE_THRESHOLD = 160;
const DEVTOOLS_POLL_INTERVAL_MS = 500;
const DEBUGGER_TIMING_THRESHOLD_MS = 100;

type TDevToolsProtectionState = {
    blocked: boolean;
    listenersAttached: boolean;
    pollTimer: ReturnType<typeof setInterval> | null;
};

const state: TDevToolsProtectionState = {
    blocked: false,
    listenersAttached: false,
    pollTimer: null,
};

/** Mobile Safari reports large outer/inner gaps from browser chrome, not devtools. */
const isMobileBrowser = (): boolean => {
    if (typeof navigator === 'undefined') return false;

    const ua = navigator.userAgent || '';

    if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;

    // iPad on iOS 13+ may report as Mac with touch
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

export const isDevToolsProtectionEnabled = (): boolean => {
    if (!DEVTOOLS_PROTECTION_ACTIVE) return false;
    if (process.env.NODE_ENV === 'development') return false;
    if (isLocal()) return false;
    if (isMobileBrowser()) return false;
    return true;
};

const isDevToolsOpenByDimensions = (): boolean => {
    if (isMobileBrowser()) return false;

    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;

    return widthGap > DEVTOOLS_SIZE_THRESHOLD || heightGap > DEVTOOLS_SIZE_THRESHOLD;
};

const isDevToolsOpenByDebuggerTiming = (): boolean => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    return performance.now() - start > DEBUGGER_TIMING_THRESHOLD_MS;
};

export const isDevToolsOpen = (): boolean => {
    if (!isDevToolsProtectionEnabled()) return false;

    if (isDevToolsOpenByDimensions()) return true;

    try {
        return isDevToolsOpenByDebuggerTiming();
    } catch {
        return false;
    }
};

const clearAppDom = (): void => {
    const root = document.getElementById('root');
    const modalRoot = document.getElementById('modal_root');
    const popupRoot = document.getElementById('popup_root');

    if (root) root.innerHTML = '';
    if (modalRoot) modalRoot.innerHTML = '';
    if (popupRoot) popupRoot.innerHTML = '';
};

const blockPageAccess = (): void => {
    if (state.blocked) return;

    state.blocked = true;
    clearAppDom();
    renderDevToolsBlockedScreen();

    if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
};

const isInspectionShortcut = (event: KeyboardEvent): boolean => {
    const key = event.key.toLowerCase();

    if (key === 'f12') return true;

    const usesPrimaryModifier = event.ctrlKey || event.metaKey;
    const usesSecondaryModifier = event.shiftKey || event.altKey;

    if (!usesPrimaryModifier) return false;

    if (usesSecondaryModifier && ['i', 'j', 'c'].includes(key)) return true;

    if (event.ctrlKey && key === 'u') return true;

    return false;
};

const preventInspectionShortcut = (event: KeyboardEvent): void => {
    if (!isInspectionShortcut(event)) return;

    event.preventDefault();
    event.stopPropagation();
};

const preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
};

const handleDevToolsDetected = (): void => {
    blockPageAccess();
};

const startDevToolsPolling = (): void => {
    if (state.pollTimer) return;

    state.pollTimer = setInterval(() => {
        if (isDevToolsOpen()) {
            handleDevToolsDetected();
        }
    }, DEVTOOLS_POLL_INTERVAL_MS);
};

const attachProtectionListeners = (): void => {
    if (state.listenersAttached) return;

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventInspectionShortcut, true);

    state.listenersAttached = true;
};

export const initDevToolsProtection = (): boolean => {
    if (!isDevToolsProtectionEnabled()) return true;

    if (typeof window !== 'undefined' && (window as Window & { __DEVTOOLS_BLOCKED__?: boolean }).__DEVTOOLS_BLOCKED__) {
        blockPageAccess();
        return false;
    }

    if (isDevToolsOpen()) {
        blockPageAccess();
        return false;
    }

    attachProtectionListeners();
    startDevToolsPolling();

    return true;
};
