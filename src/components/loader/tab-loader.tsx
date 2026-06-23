import OrbitDotsLoader from './orbit-dots-loader';

type TTabLoaderProps = {
    message: string;
};

const TabLoader = ({ message }: TTabLoaderProps) => {
    return (
        <div className='app-root'>
            <OrbitDotsLoader />
            <div className='load-message'>{message}</div>
        </div>
    );
};

export default TabLoader;
