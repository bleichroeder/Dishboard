import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// In production the editor is mounted at /editor; in dev it's at the root.
// import.meta.env.BASE_URL is '/editor/' in prod, '/' in dev — strip the
// trailing slash so react-router uses it as a basename.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;
import { App } from './App.js';
import { AuthProvider } from './auth.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
