import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { StoreProvider } from './lib/store';
import { Compare } from './screens/Compare';
import { Guide } from './screens/Guide';
import { Planner } from './screens/Planner';
import { Properties } from './screens/Properties';
import { PropertyDetail } from './screens/PropertyDetail';
import { PropertyForm } from './screens/PropertyForm';
import { Settings } from './screens/Settings';
import { VisitMode } from './screens/VisitMode';

/**
 * HashRouter is deliberate: it works on GitHub Pages, from a file:// path and
 * from any sub-directory, with no server rewrite rules.
 */
export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Properties />} />
            <Route path="/new" element={<PropertyForm />} />
            <Route path="/p/:id" element={<PropertyDetail />} />
            <Route path="/p/:id/edit" element={<PropertyForm />} />
            <Route path="/p/:id/visit" element={<VisitMode />} />
            <Route path="/plan" element={<Planner />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
