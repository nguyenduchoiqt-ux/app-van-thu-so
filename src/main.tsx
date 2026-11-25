import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const APP_STORAGE_VERSION = 'v5_quangtri_khesanh';
const LEGACY_BANNED_REGEX = /thanh\s*h[oó]a|ba\s*[đd][iì]nh|nguy[eễ]n\s*v[aă]n\s*an|l[eê]\s*ho[aà]ng\s*nam/i;

function sanitizeLegacyStorage(): void {
  try {
    const currentVersion = localStorage.getItem('vts_version');
    let hasLegacyData = false;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      if (LEGACY_BANNED_REGEX.test(val)) {
        hasLegacyData = true;
        break;
      }
    }

    if (currentVersion !== APP_STORAGE_VERSION || hasLegacyData) {
      const savedGeminiKey = localStorage.getItem('vts_gemini_api_key');
      const savedGeminiModel = localStorage.getItem('vts_gemini_model');
      const savedGeminiModelsCache = localStorage.getItem('vts_gemini_available_models');
      localStorage.clear();
      localStorage.setItem('vts_version', APP_STORAGE_VERSION);
      if (savedGeminiKey) localStorage.setItem('vts_gemini_api_key', savedGeminiKey);
      if (savedGeminiModel) localStorage.setItem('vts_gemini_model', savedGeminiModel);
      if (savedGeminiModelsCache) {
        localStorage.setItem('vts_gemini_available_models', savedGeminiModelsCache);
      }
    }
  } catch {
    // ignore storage errors
  }
}

sanitizeLegacyStorage();

// Tự động kiểm tra và cập nhật Service Worker mới nhất để tránh kẹt cache cũ
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {});
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
