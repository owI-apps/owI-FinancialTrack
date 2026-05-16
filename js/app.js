import { loadState, getState } from './db.js';
import { applyI18n, setLang } from './i18n.js';
import { initCoreUI, setTheme, updateGreeting, updateDashTime } from './ui.js';
import { initDashboard } from './pages/dashboard.js';
import { initMutation } from './pages/mutation.js';
import { initTransaction } from './pages/transaction.js'; // <-- Tambahin ini

/* ===== INITIALIZATION ===== */

loadState();
const state = getState();

initCoreUI();
lucide.createIcons();

setLang(state.lang || 'id');
setTheme(state.theme || 'light');
applyI18n();
updateGreeting();
updateDashTime();

initDashboard();

/* ===== EVENT LISTENERS ===== */
window.addEventListener('pageChange', (e) => {
  const page = e.detail.page;
  
  if(page === 'dashboard') {
    import('./pages/dashboard.js').then(mod => mod.initDashboard());
  }
  
  if(page === 'mutasi') {
    import('./pages/mutation.js').then(mod => mod.initMutation());
  }
  
  if(page === 'tambah') { // <-- Tambah blok ini
    import('./pages/transaction.js').then(mod => mod.initTransaction());
  }
});

window.addEventListener('langChange', () => {
  import('./pages/dashboard.js').then(mod => mod.initDashboard());
  import('./pages/mutation.js').then(mod => mod.renderMutasiHistory());
  import('./pages/transaction.js').then(mod => { // <-- Tambah blok ini
    mod.renderActHistory();
    if($('#actForm').innerHTML !== '') mod.renderActForm(); // Re-render form kalau lagi terbuka
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
