import { ComponentProps } from 'react';
import { StandaloneBarsRegularIcon } from '@deriv/quill-icons/Standalone';
import './toggle-button.scss';

type TToggleButton = {
    onClick: ComponentProps<'button'>['onClick'];
};

const ToggleButton = ({ onClick }: TToggleButton) => (
    <button className='toggle-button' onClick={onClick}>
        <StandaloneBarsRegularIcon />
    </button>
);

export default ToggleButton;
