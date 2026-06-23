import React from 'react';
import {
    MdAnalytics,
    MdBuild,
    MdExtension,
    MdReplay,
    MdSell,
    MdShoppingCart,
    MdTune,
} from 'react-icons/md';

type TToolboxCategoryIconProps = {
    categoryName: string;
};

const getCategoryIcon = (name: string) => {
    const key = name.toLowerCase();
    if (key.includes('trade parameter')) return { Icon: MdTune, variant: 'trade' };
    if (key.includes('purchase')) return { Icon: MdShoppingCart, variant: 'purchase' };
    if (key.includes('sell')) return { Icon: MdSell, variant: 'sell' };
    if (key.includes('restart')) return { Icon: MdReplay, variant: 'restart' };
    if (key.includes('analysis')) return { Icon: MdAnalytics, variant: 'analysis' };
    if (key.includes('utility')) return { Icon: MdBuild, variant: 'utility' };
    return { Icon: MdExtension, variant: 'default' };
};

const ToolboxCategoryIcon = ({ categoryName }: TToolboxCategoryIconProps) => {
    const { Icon, variant } = getCategoryIcon(categoryName);
    return (
        <span className={`db-toolbox__cat-icon db-toolbox__cat-icon--${variant}`} aria-hidden>
            <Icon />
        </span>
    );
};

export default ToolboxCategoryIcon;
