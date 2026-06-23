import { configure } from 'mobx';
import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
// Removed AnalyticsInitializer import - analytics dependency removed
// See migrate-docs/ANALYTICS_IMPLEMENTATION_GUIDE.md for re-implementation
import { initDevToolsProtection } from './utils/devtools-protection';
import { performVersionCheck } from './utils/version-check';
import './styles/index.scss';

// Configure MobX to handle multiple instances in production builds
configure({ isolateGlobalState: true });

// Perform version check FIRST - before any other operations
performVersionCheck();

// Block app access when developer tools are open (production / non-local only)
if (initDevToolsProtection()) {
    // Removed AnalyticsInitializer() call - analytics dependency removed
    ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
}
