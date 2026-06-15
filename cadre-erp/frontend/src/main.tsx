import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.addEventListener('error', (event) => {
  document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Global Error:</h1><pre>${event.error?.stack || event.message || event}</pre></div>`;
});

window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Unhandled Promise Rejection:</h1><pre>${event.reason?.stack || event.reason}</pre></div>`;
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (e: any) {
  document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Render Error:</h1><pre>${e.stack || e.message}</pre></div>`;
}
