import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import artesIcon from './assets/logo.png';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const favicon = document.querySelector<HTMLLinkElement>(
  'link[rel="icon"]'
);

if (favicon) {
  favicon.href = artesIcon;
}

// Pede ao navegador para não apagar os dados do app sozinho.
navigator.storage?.persist?.()