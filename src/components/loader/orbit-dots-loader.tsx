import classNames from 'classnames';
import './orbit-dots-loader.scss';

type OrbitDotsLoaderProps = {
    className?: string;
    /** Visually hidden label for assistive tech */
    label?: string;
};

export default function OrbitDotsLoader({ className, label = 'Loading' }: OrbitDotsLoaderProps) {
    return (
        <div
            className={classNames('orbit-dots-loader', className)}
            role='status'
            aria-busy='true'
            aria-label={label}
        />
    );
}

/** Use inside Suspense when no message is needed */
export function OrbitDotsLoaderSuspenseFallback() {
    return (
        <div className='orbit-dots-loader-wrap'>
            <OrbitDotsLoader />
        </div>
    );
}
