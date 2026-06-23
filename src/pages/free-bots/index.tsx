import React from 'react';
import { observer } from 'mobx-react-lite';
import { Localize } from '@deriv-com/translations';
import { DBOT_TABS } from '@/constants/bot-contents';
import { save_types } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { v4 as uuidv4 } from 'uuid';
import {
    folderBadgeLabel,
    getAllFreeBotsSorted,
    getBotAvatarUrls,
    getBotDescription,
    getBotUsingCount,
    type TFreeBotFile,
} from '@/xml/free-bots/registry';
import './free-bots.scss';

const BotAvatarStack = ({ bot }: { bot: TFreeBotFile }) => {
    const [a, b, c] = getBotAvatarUrls(bot);
    return (
        <div className='free-bots__avatars' aria-hidden='true'>
            <img className='free-bots__avatar' src={a} alt='' width={36} height={36} loading='lazy' decoding='async' />
            <img className='free-bots__avatar' src={b} alt='' width={36} height={36} loading='lazy' decoding='async' />
            <img className='free-bots__avatar' src={c} alt='' width={36} height={36} loading='lazy' decoding='async' />
        </div>
    );
};

const FreeBotsPage = observer(() => {
    const { dashboard, load_modal } = useStore();
    const { setActiveTab } = dashboard;
    const bots = React.useMemo(() => getAllFreeBotsSorted(), []);

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
            <div className='free-bots__grid'>
                {bots.map(bot => {
                    const usingCount = getBotUsingCount(bot);
                    return (
                        <article key={`${bot.folder}-${bot.name}`} className='free-bots__card'>
                            <div className='free-bots__card-top'>
                                <h3 className='free-bots__card-name'>{bot.name}</h3>
                                <span className='free-bots__card-folder'>{folderBadgeLabel(bot.folder)}</span>
                            </div>
                            <p className='free-bots__card-desc'>{getBotDescription(bot)}</p>
                            <p className='free-bots__card-meta'>
                                <Localize
                                    i18n_default_text='{{folder}} • XML strategy'
                                    values={{ folder: folderBadgeLabel(bot.folder) }}
                                />
                            </p>
                            <div className='free-bots__card-footer'>
                                <div className='free-bots__social'>
                                    <BotAvatarStack bot={bot} />
                                    <span className='free-bots__using'>
                                        <Localize i18n_default_text='+{{count}} using' values={{ count: usingCount }} />
                                    </span>
                                </div>
                                <button
                                    type='button'
                                    className='free-bots__load-btn'
                                    onClick={() => openInBuilder(bot)}
                                >
                                    <Localize i18n_default_text='Load bot' />
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
});

export default FreeBotsPage;
