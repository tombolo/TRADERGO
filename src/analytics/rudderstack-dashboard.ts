type TEventPayload = Record<string, unknown>;

const trackDashboardEvent = (event_name: string, payload: TEventPayload = {}) => {
    if (typeof window === 'undefined') return;

    const analytics = (window as Window & { analytics?: { track?: (name: string, data?: TEventPayload) => void } })
        .analytics;
    analytics?.track?.(event_name, payload);
};

export const rudderStackSendDashboardClickEvent = (payload: TEventPayload = {}) => {
    trackDashboardEvent('dbot_dashboard_click_event', payload);
};

export const rudderStackSendAnnouncementClickEvent = (payload: TEventPayload = {}) => {
    trackDashboardEvent('dbot_announcement_click_event', payload);
};

export const rudderStackSendAnnouncementActionEvent = (payload: TEventPayload = {}) => {
    trackDashboardEvent('dbot_announcement_action_event', payload);
};
