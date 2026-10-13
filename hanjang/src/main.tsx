import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
import '@fontsource/gowun-dodum/400.css';
import '@fontsource/nanum-pen-script/400.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
