import { observer } from 'mobx-react-lite';
import { MdSearch } from 'react-icons/md';
import { LegacyCloseCircle1pxBlackIcon } from '@deriv/quill-icons/Legacy';

type TSearchIcon = {
    search: string;
    is_search_loading: boolean;
    onClick: () => void;
};

const SearchIcon = observer(({ search, is_search_loading, onClick }: TSearchIcon) => {
    if (!search) {
        return <MdSearch className='db-toolbox__search-icon' aria-hidden />;
    }
    if (is_search_loading) return <div className='loader' data-testid='loader' />;
    return (
        <LegacyCloseCircle1pxBlackIcon
            onClick={onClick}
            height='18px'
            width='18px'
            fill='#2749d8'
            className='db-toolbox__search-clear'
        />
    );
});

export default SearchIcon;
