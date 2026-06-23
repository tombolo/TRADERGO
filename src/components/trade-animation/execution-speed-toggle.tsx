import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { TExecutionSpeed } from '@/constants/execution-speed';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

type TExecutionSpeedToggle = {
    disabled?: boolean;
};

const ExecutionSpeedToggle = observer(({ disabled = false }: TExecutionSpeedToggle) => {
    const { run_panel } = useStore();
    const { execution_speed, setExecutionSpeed } = run_panel;
    const is_slow = execution_speed === 'slow';

    const handleToggle = () => {
        if (disabled) return;
        const next_speed: TExecutionSpeed = is_slow ? 'high' : 'slow';
        setExecutionSpeed(next_speed);
    };

    return (
        <div className='execution-speed'>
            <div className='execution-speed__copy'>
                <span className='execution-speed__label'>{localize('Execution')}</span>
                <span className='execution-speed__value'>{is_slow ? localize('SLOW') : localize('FAST')}</span>
            </div>
            <button
                type='button'
                className={classNames('execution-speed__switch', {
                    'execution-speed__switch--slow': is_slow,
                })}
                onClick={handleToggle}
                disabled={disabled}
                aria-pressed={is_slow}
                aria-label={
                    is_slow
                        ? localize('Execution speed is slow. Click to switch to fast.')
                        : localize('Execution speed is fast. Click to switch to slow.')
                }
            >
                <span className='execution-speed__switch-thumb' />
            </button>
        </div>
    );
});

export default ExecutionSpeedToggle;
