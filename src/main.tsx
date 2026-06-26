import { configure } from 'mobx';
import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { recoverStaleSessionForSite } from './utils/auth-utils';
import { performVersionCheck } from './utils/version-check';
import './styles/index.scss';

// Configure MobX to handle multiple instances in production builds
configure({ isolateGlobalState: true });

// Perform version check FIRST - before any other operations
performVersionCheck();

// Drop sessions tied to a previous branded domain before the app reads localStorage
recoverStaleSessionForSite();

// Always mount the app — devtools / right-click inspection are allowed for debugging.
ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
