import { configure } from 'mobx';
import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { recoverStaleSessionForSite, syncAuthInfoAcrossStorages } from './utils/auth-utils';
import { initDevToolsProtection } from './utils/devtools-protection';
import { performVersionCheck } from './utils/version-check';
import './styles/index.scss';

// Configure MobX to handle multiple instances in production builds
configure({ isolateGlobalState: true });

// Perform version check FIRST - before any other operations
performVersionCheck();

// Drop sessions tied to a previous branded domain before the app reads localStorage
recoverStaleSessionForSite();
syncAuthInfoAcrossStorages();

// Block app access when developer tools are open (production / large screens only).
if (initDevToolsProtection()) {
    ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
}
