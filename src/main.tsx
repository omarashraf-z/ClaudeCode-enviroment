import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import './styles/poster.css';
import './styles/app.css';

/* Hash routing: the site is a folder of static files on GitHub Pages, so
   there is no server to rewrite /reserve back to index.html. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>
);
