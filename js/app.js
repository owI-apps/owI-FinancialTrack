import { loadState, getState } from './db.js';
import { applyI18n, setLang } from './i18n.js';
import { initCoreUI, setTheme, updateGreeting, updateDashTime } from './ui.js';
import { initDashboard } from './pages/dashboard.js';

/* ===== INITIALIZATION ===== */

// 1. Load State dari LocalStorage
loadState();
const state = getState();

// 2. Init Core UI (Sidebar, Bottom Nav, Modals, Listeners)
initCoreUI();

// 3. Render awal icons (Lucide)
lucide.createIcons();

// 4. Apply State ke UI (Bahasa, Tema, Teks)
setLang(state.lang || 'id');
setTheme(state.theme || 'light');
applyI18n();
updateGreeting();
updateDashTime();

// 5. Init Halaman Dashboard
initDashboard();

/* ===== EVENT LISTENERS ===== */

// Listener ketika pindah halaman via Bottom Nav
window.addEventListener('pageChange', (e) => {
  const page = e.detail.page;
  
  if(page === 'dashboard') {
    import('./pages/dashboard.js').then(mod => {
      mod.initDashboard(); // Refresh data & animasi ulang
    });
  }
  
  // Nanti halaman lain ditambah di sini
  // if(page === 'mutasi') { ... }
});

// Listener ketika ganti bahasa (biar data dinamis di dashboard ikut ke-translate)
window.addEventListener('langChange', () => {
  import('./pages/dashboard.js').then(mod => {
    mod.initDashboard(); 
  });
});

/* ===== SERVICE WORKER ===== */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW terdaftar:', r.scope))
      .catch(e => console.log('SW gagal:', e));
  });
}
