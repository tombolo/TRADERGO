import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.trade_stop = {
    init() {
        this.jsonInit(this.definition());
        this.setNextStatement(false);
    },
    definition() {
        return {
            message0: localize('Stop trading'),
            colour: window.Blockly.Colours.Special1.colour,
            colourSecondary: window.Blockly.Colours.Special1.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special1.colourTertiary,
            previousStatement: null,
            tooltip: localize('Stop the bot and end the trading loop.'),
            category: window.Blockly.Categories.After_Purchase,
        };
    },
    meta() {
        return {
            display_name: localize('Stop trading'),
            description: localize(
                'This block stops your bot from placing new trades. Use it after take-profit or stop-loss conditions are met.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    restricted_parents: ['after_purchase'],
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.trade_stop = () => `
        Bot.isTradeAgain(false);
        return false;
    `;
