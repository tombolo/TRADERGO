import { localize } from '@deriv-com/translations';

export type TSidebarItem = {
    label: string;
    content: { data: string; faq_id?: string }[];
    link: boolean;
};

export const SIDEBAR_INTRO = (): TSidebarItem[] => [
    {
        label: localize('Welcome to TRADING TOOL'),
        content: [
            {
                data: localize('Build and deploy automated trades without coding'),
            },
            {
                data: localize(
                    'Create sophisticated trading bots using our drag-and-drop visual interface. No programming experience needed.'
                ),
            },
        ],
        link: false,
    },
    {
        label: localize('Get Started'),
        content: [{ data: localize('Learn how to build your first automated trading bot') }],
        link: true,
    },
    {
        label: localize('Quick Answers'),
        content: [
            {
                data: localize('What is Deriv Bot?'),
                faq_id: 'faq-0',
            },
            {
                data: localize('Where do I find the blocks I need?'),
                faq_id: 'faq-1',
            },
            {
                data: localize('How do I remove blocks from the workspace?'),
                faq_id: 'faq-2',
            },
        ],
        link: true,
    },
];
