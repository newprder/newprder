import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted and bundled with the build, so every device renders the same
// typeface. Only the latin subset and the two weights in use are loaded.
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/courier-prime/latin-400-italic.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
