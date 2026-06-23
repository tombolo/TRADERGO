import React from 'react';
import classNames from 'classnames';
import {
    MdAutorenew,
    MdCandlestickChart,
    MdFolderOpen,
    MdRedo,
    MdShowChart,
    MdSort,
    MdUndo,
    MdZoomIn,
    MdZoomOut,
} from 'react-icons/md';

type TToolbarActionIconProps = {
    variant:
        | 'reset'
        | 'import'
        | 'sort'
        | 'charts'
        | 'tradingview'
        | 'undo'
        | 'redo'
        | 'zoom-in'
        | 'zoom-out';
    disabled?: boolean;
    id?: string;
    testId?: string;
    onClick?: () => void;
};

const ICONS = {
    reset: MdAutorenew,
    import: MdFolderOpen,
    sort: MdSort,
    charts: MdShowChart,
    tradingview: MdCandlestickChart,
    undo: MdUndo,
    redo: MdRedo,
    'zoom-in': MdZoomIn,
    'zoom-out': MdZoomOut,
} as const;

const ToolbarActionIcon = ({ variant, disabled, id, testId, onClick }: TToolbarActionIconProps) => {
    const Icon = ICONS[variant];
    return (
        <span
            id={id}
            data-testid={testId}
            role='button'
            tabIndex={disabled ? -1 : 0}
            className={classNames('toolbar__icon-btn', `toolbar__icon-btn--${variant}`, {
                'toolbar__icon-btn--disabled': disabled,
            })}
            onClick={disabled ? undefined : onClick}
            onKeyDown={e => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick?.();
                }
            }}
        >
            <Icon aria-hidden />
        </span>
    );
};

export default ToolbarActionIcon;
