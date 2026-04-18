import { Loader } from '@deriv-com/ui';

type TTabLoaderProps = {
    message: string;
};

const TabLoader = ({ message }: TTabLoaderProps) => {
    return (
        <div className='app-root'>
            <Loader />
            <div className='load-message'>{message}</div>
        </div>
    );
};

export default TabLoader;
