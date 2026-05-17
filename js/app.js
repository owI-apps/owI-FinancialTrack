import { loadState, getState } from './db.js';
import { applyI18n, setLang } from './i18n.js';
import { initCoreUI, setTheme, updateGreeting, updateDashTime } from './ui.js';
import { initDashboard } from './pages/dashboard.js';
import { initMutation } from './pages/mutation.js';
import { initTransaction } from './pages/transaction.js';
import { initBills } from './pages/bills.js';
import { initHistory } from './pages/history.js';
import { initSidebar } from './pages/sidebar.js';

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
    import('./pages/dashboard.js').then(mod => mod.initDashboard());
  }
  if(page === 'mutasi') {
    import('./pages/mutation.js').then(mod => mod.initMutation());
  }
  if(page === 'tambah') {
    import('./pages/transaction.js').then(mod => mod.initTransaction());
  }
  if(page === 'tagihan') {
    import('./pages/bills.js').then(mod => mod.initBills());
  }
  if(page === 'riwayat') {
    import('./pages/history.js').then(mod => mod.initHistory());
  }
});

window.addEventListener('langChange', () => {
  import('./pages/dashboard.js').then(mod => mod.initDashboard());
  import('./pages/mutation.js').then(mod => mod.renderMutasiHistory());
  import('./pages/transaction.js').then(mod => mod.renderActHistory());
  import('./pages/bills.js').then(mod => mod.renderTagList());
  import('./pages/history.js').then(mod => mod.renderHistory());
  import('./pages/sidebar.js').then(mod => mod.renderCOA()); 
});

/* ===== SERVICE WORKER ===== */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW terdaftar:', r.scope))
      .catch(e => console.log('SW gagal:', e));
  });
}
