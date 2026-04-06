// Suppress EVM wallet extension conflicts
if (typeof window !== "undefined") { try { Object.defineProperty(window, "ethereum", { writable: true, configurable: true }); } catch(_) {} }

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
