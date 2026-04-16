import React from 'react';
import { observer } from 'mobx-react-lite';
import { LabelPairedPuzzlePieceTwoCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import { DBOT_TABS } from '@/constants/bot-contents';
import { save_types } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { v4 as uuidv4 } from 'uuid';
import {
    folderBadgeLabel,
    FREE_BOT_FOLDER_ORDER,
    getFreeBotsByFolder,
    type TFreeBotFile,
} from '@/xml/free-bots/registry';
import './free-bots.scss';

const FreeBotsPage = observer(() => {
    const { dashboard, load_modal } = useStore();
    const { setActiveTab } = dashboard;
    const byFolder = React.useMemo(() => getFreeBotsByFolder(), []);

    const openInBuilder = (bot: TFreeBotFile) => {
        load_modal.queueStrategyForBuilder({
            id: uuidv4(),
            name: bot.name,
            xml: bot.xml,
            save_type: save_types.LOCAL,
            timestamp: Date.now(),
        });
        setActiveTab(DBOT_TABS.BOT_BUILDER);
    };

    return (
        <div className='free-bots-page'>
            <header className='free-bots__header'>
                <h1 className='free-bots__title'>
                    <Localize i18n_default_text='Free bots' />
                </h1>
                <p className='free-bots__subtitle'>
                    <Localize i18n_default_text='Pick a ready-made strategy by collection. Tap a card to open it in Bot Builder.' />
                </p>
            </header>

            {FREE_BOT_FOLDER_ORDER.map(folder => {
                const bots = byFolder[folder] ?? [];
                if (!bots.length) return null;
                return (
                    <section className='free-bots__section' key={folder}>
                        <div className='free-bots__section-head'>
                            <span className='free-bots__section-badge'>{folderBadgeLabel(folder)}</span>
                            <h2 className='free-bots__section-title'>
                                {folderBadgeLabel(folder)} <Localize i18n_default_text='collection' />
                            </h2>
                        </div>
                        <div className='free-bots__grid'>
                            {bots.map(bot => (
                                <button
                                    key={`${folder}-${bot.name}`}
                                    type='button'
                                    className='free-bots__card'
                                    onClick={() => openInBuilder(bot)}
                                >
                                    <span className='free-bots__card-icon' aria-hidden='true'>
                                        <LabelPairedPuzzlePieceTwoCaptionBoldIcon
                                            height={22}
                                            width={22}
                                            fill='var(--brand-red-coral)'
                                        />
                                    </span>
                                    <p className='free-bots__card-name'>{bot.name}</p>
                                    <p className='free-bots__card-hint'>
                                        <Localize i18n_default_text='Open in Bot Builder' />
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
});

export default FreeBotsPage;
