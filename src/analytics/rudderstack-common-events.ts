type TEventPayload = Record<string, unknown>;

const trackEvent = (event_name: string, payload: TEventPayload = {}) => {
    if (typeof window === 'undefined') return;

    const analytics = (window as Window & { analytics?: { track?: (name: string, data?: TEventPayload) => void } })
        .analytics;
    analytics?.track?.(event_name, payload);
};

export const rudderStackSendOpenEvent = (payload: TEventPayload = {}) => {
    trackEvent('dbot_open_event', payload);
};

export const rudderStackSendCloseEvent = (payload: TEventPayload = {}) => {
    trackEvent('dbot_close_event', payload);
};
