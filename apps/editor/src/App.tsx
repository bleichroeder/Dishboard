import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.js';
import { Layout } from './components/Layout.js';
import { IntegrationsPage } from './routes/IntegrationsPage.js';
import { LoginPage } from './routes/LoginPage.js';
import { MenuEditorPage } from './routes/MenuEditorPage.js';
import { MenuListPage } from './routes/MenuListPage.js';
import { SchedulePage } from './routes/SchedulePage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<MenuListPage />} />
        <Route path="menus/:slug" element={<MenuEditorPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <div className="splash">Loading…</div>;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
