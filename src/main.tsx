// Safe environment check for window.fetch in sandboxed iframe contexts
try {
  if (typeof window !== 'undefined') {
    const origFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let _activeFetch = origFetch;
    try {
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!desc || desc.configurable !== false) {
        Object.defineProperty(window, 'fetch', {
          configurable: true,
          enumerable: true,
          get() {
            return _activeFetch;
          },
          set(fn) {
            _activeFetch = fn;
          }
        });
      }
    } catch {
      // Ignore if non-configurable
    }
  }
} catch {
  // Ignore fallback
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


