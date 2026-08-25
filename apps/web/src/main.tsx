import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { DEMO } from './api';
import { DemoBanner } from './components/DemoBanner';
import './styles/poster.css';
import './styles/app.css';

/* The demo is a plain static bundle that may be served from a subpath or an
   opaque host, so it routes on the hash. The real build uses real URLs. */
const Router = DEMO ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
      <DemoBanner />
    </Router>
  </StrictMode>
);
