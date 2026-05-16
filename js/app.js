import { $, $$, initAutoFit, setupRpInputs } from './utils.js';
import { loadState, getState, saveState, addLog } from './db.js';
import { t, applyI18n, getLang, setLang } from './i18n.js';
import { toast, updateGreeting, updateDashTime, initCoreUI, setTheme, openSB, closeSB, showSBPage, closeAllModals } from './ui.js';

// Init DB
loadState();
const state = getState();

// Init UI
initCoreUI();
lucide.createIcons();

// Sync State to UI
currentLang = state.lang || 'id';
setLang(currentLang);
setTheme(state.theme || 'light');
applyI18n();
updateGreeting();
updateDashTime();

 $('#dashUserName').textContent = state.userName;
if(state.userPhoto) {
  // render photo if exists
}

// Dashboard Animate
const dashCards = $$('#pg-dashboard .dc');
function animateDashboard() {
  dashCards.forEach(c => c.classList.remove('vis'));
  dashCards.forEach(c => { const d = parseInt(c.dataset.delay)||0; setTimeout(()=>c.classList.add('vis'), 50+d); });
  setTimeout(()=>{$$('.bar-f').forEach(b=>{b.style.width='0'; requestAnimationFrame(()=>requestAnimationFrame(()=>{b.style.width=b.dataset.w}))})}, 200);
}
animateDashboard();

// Temporary: render static wallets (akan dipindah ke pages/dashboard.js nanti)
function renderDashboardWallets() {
  const walletGrid = $('#walletGrid');
  walletGrid.innerHTML = '';
  const accTypeIcons = {'Cash':'wallet','Bank':'landmark','E-Wallet':'smartphone','Crypto':'bitcoin','Asuransi':'shield'};
  state.accounts.forEach(acc => {
    const icon = accTypeIcons[acc.type]||'wallet';
    const card = document.createElement('div'); card.className = 'w-card';
    card.innerHTML = `<div class="w-card-lbl"><i data-lucide="${icon}" style="width:13px;height:13px"></i>${acc.name}</div><div class="w-card-val auto-fit">${formatRp(acc.balance)}</div>`;
    walletGrid.appendChild(card);
  });
  const addBtn = document.createElement('button'); addBtn.className = 'w-add';
  addBtn.innerHTML = '<i data-lucide="plus"></i><span>'+t('add_wallet')+'</span>';
  walletGrid.appendChild(addBtn);
  lucide.createIcons();
  requestAnimationFrame(initAutoFit);
}

function formatRp(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}

function getTotalBalance() { return state.accounts.reduce((s,a)=>s+(a.balance||0),0); }

 $('#dashTotalSaldo').textContent = formatRp(getTotalBalance());
renderDashboardWallets();

// Page Change Listener
window.addEventListener('pageChange', (e) => {
  if(e.detail.page === 'dashboard') animateDashboard();
  // nanti panggil module pages di sini
});

// Service Worker
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(e=>console.log('SW gagal:',e));
  });
}
