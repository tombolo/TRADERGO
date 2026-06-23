import { TAB_HASH_SEGMENTS } from '@/constants/bot-contents';

export const getActiveTabUrl = () => {
    const current_tab_number = localStorage.getItem('active_tab');
    const raw = Number(current_tab_number);
    const index = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), TAB_HASH_SEGMENTS.length - 1) : 0;
    const current_tab_name = TAB_HASH_SEGMENTS[index];

    const current_url = window.location.href.split('#')[0];
    const active_tab_url = `${current_url}#${current_tab_name}`;
    return active_tab_url;
};
