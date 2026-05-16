console.log("🔥🔥🔥 OWI APP.JS V2.0 STARTED 🔥🔥🔥");

// Tambahin ?v=3 di semua import biar GitHub CDN dipaksa ngasih file terbaru!
import { loadState, getState } from './db.js?v=3';
import { applyI18n, setLang } from './i18n.js?v=3';
import { initCoreUI, setTheme, updateGreeting, updateDashTime } from './ui.js?v=3';
import { initDashboard } from './pages/dashboard.js?v=3';
import { initMutation } from './pages/mutation.js?v=3';
import { initTransaction } from './pages/transaction.js?v=3';
import { initBills } from './pages/bills.js?v=3';
import { initHistory } from './pages/history.js?v=3';
import { initSidebar } from './pages/sidebar.js?v=3';

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

// Init All Modules
initDashboard();
initSidebar();

/* ===== EVENT LISTENERS ===== */
window.addEventListener('pageChange', (e) => {
  const page = e.detail.page;
  
  if(page === 'dashboard') {
    import('./pages/dashboard.js?v=3').then(mod => mod.initDashboard());
  }
  if(page === 'mutasi') {
    import('./pages/mutation.js?v=3').then(mod => mod.initMutation());
  }
  if(page === 'tambah') {
    import('./pages/transaction.js?v=3').then(mod => mod.initTransaction());
  }
  if(page === 'tagihan') {
    import('./pages/bills.js?v=3').then(mod => mod.initBills());
  }
  if(page === 'riwayat') {
    import('./pages/history.js?v=3').then(mod => mod.initHistory());
  }
});

window.addEventListener('langChange', () => {
  import('./pages/dashboard.js?v=3').then(mod => mod.initDashboard());
  import('./pages/mutation.js?v=3').then(mod => mod.renderMutasiHistory());
  import('./pages/transaction.js?v=3').then(mod => mod.renderActHistory());
  import('./pages/bills.js?v=3').then(mod => mod.renderTagList());
  import('./pages/history.js?v=3').then(mod => mod.renderHistory());
  import('./pages/sidebar.js?v=3').then(mod => mod.renderCOA()); 
});

/* ===== SERVICE WORKER ===== */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW terdaftar:', r.scope))
      .catch(e => console.log('SW gagal:', e));
  });
}
