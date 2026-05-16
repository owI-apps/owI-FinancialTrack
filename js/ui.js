import { $, $$ } from './utils.js';
import { getState, saveState } from './db.js';
import { t, applyI18n, getLang } from './i18n.js';

let toastT = null;

export function toast(msg) {
  const toastEl = $('#toast');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastT) clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

export function updateGreeting() {
  const h = new Date().getHours();
  const greetTime = $('#greetTime');
  const greetHello = $('#greetHello');
  greetTime.textContent = h>=5&&h<12 ? t('greet_morning') : h>=12&&h<17 ? t('greet_afternoon') : h>=17&&h<20 ? t('greet_evening') : t('greet_night');
  greetHello.textContent = t('hello');
}

export function updateDashTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const dayNames = getLang()==='id'?['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  $('#dashTime').textContent = t('last_update')+' '+dayNames[now.getDay()]+', '+h+':'+m;
}

export function openSB() {
  $('#sidebar').classList.add('active');
  $('#sbOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  showSBMenu();
}

export function closeSB() {
  $('#sidebar').classList.remove('active');
  $('#sbOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

export function showSBMenu() {
  $('#sbMenu').style.display = '';
  $$('.sb-page').forEach(p => p.classList.remove('active'));
  $$('.sb-item').forEach(i => i.classList.remove('active'));
}

export function showSBPage(key) {
  $('#sbMenu').style.display = 'none';
  $$('.sb-page').forEach(p => p.classList.remove('active'));
  const tgt = $(`#sb-${key}`);
  if(tgt) { void tgt.offsetWidth; tgt.classList.add('active'); }
  $('#sidebar').scrollTop = 0;
}

export function closeAllModals() {
  $$('.modal-overlay').forEach(m => m.classList.remove('active'));
}

export function setTheme(theme) {
  const state = getState();
  state.theme = theme;
  saveState();
  document.documentElement.setAttribute('data-theme', theme);
  $('#themeToggle').classList.toggle('on', theme==='dark');
  document.querySelector('meta[name="theme-color"]').content = theme==='dark' ? '#1a210f' : '#85a633';
}

export function initCoreUI() {
  // Header scroll
  window.addEventListener('scroll', () => $('#header').classList.toggle('scrolled', window.scrollY > 4), {passive:true});

  // Sidebar
  $('#logoBtn').addEventListener('click', openSB);
  $('#sbClose').addEventListener('click', closeSB);
  $('#sbOverlay').addEventListener('click', closeSB);

  // SB Items (PENTING: Dispatch event biar sidebar.js tau halaman apa yang dibuka)
  $$('.sb-item[data-sb]').forEach(item => item.addEventListener('click', () => {
    const key = item.dataset.sb;
    showSBPage(key);
    lucide.createIcons();
    window.dispatchEvent(new CustomEvent('sidebarPageChange', { detail: { page: key } }));
  }));

  // SB Back
  $$('.sb-back[data-back]').forEach(btn => btn.addEventListener('click', () => { showSBMenu(); lucide.createIcons(); }));

  // Escape key
  document.addEventListener('keydown', e => { if(e.key==='Escape') { closeSB(); closeAllModals(); } });

  // Bottom Nav
  $$('.ni[data-pg]').forEach(n => n.addEventListener('click', () => {
    $$('.ni').forEach(x => x.classList.remove('active'));
    n.classList.add('active');
    $$('.pg').forEach(p => p.classList.remove('active'));
    const tgt = $(`#pg-${n.dataset.pg}`);
    if(tgt) { void tgt.offsetWidth; tgt.classList.add('active'); }
    window.scrollTo({top:0, behavior:'smooth'});
    window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: n.dataset.pg } }));
  }));

  // Global Modal Close
  $$('.modal-overlay').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('active'); }));
  
  // Theme Toggle
  $('#themeToggle').addEventListener('click', () => setTheme(getState().theme==='dark'?'light':'dark'));

  // Language Toggle
  $$('.lang-btn').forEach(b => b.addEventListener('click', () => {
    const lang = b.dataset.lang;
    const state = getState(); state.lang = lang; saveState();
    setLang(lang); applyI18n();
    $$('.lang-btn').forEach(x => x.classList.toggle('active', x.dataset.lang===lang));
    document.documentElement.lang = lang;
    updateGreeting(); updateDashTime();
    window.dispatchEvent(new CustomEvent('langChange'));
  }));

  // Reset
  $('#resetBtn').addEventListener('click', () => $('#resetModal').classList.add('active'));
  $('#resetCancel').addEventListener('click', () => $('#resetModal').classList.remove('active'));
  $('#resetYes').addEventListener('click', () => { localStorage.removeItem('owi_fintrack_state'); closeSB(); setTimeout(()=>location.reload(),300); });

  // Donate & Logout (UPDATE LINK TRAKTEER)
  const donateAction = () => { closeSB(); window.open('https://trakteer.id/owi_apps/gift'); };
  $('#donateBtn').addEventListener('click', donateAction);
  $('#donateBtnSide').addEventListener('click', donateAction);
  $('#logoutBtn').addEventListener('click', () => { closeSB(); toast(t('logout_soon')); });

  // PWA Install
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#installBtn').classList.add('visible'); });
  $('#installBtn').addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if(outcome==='accepted') toast(t('installed'));
    deferredPrompt = null;
    $('#installBtn').classList.remove('visible');
  });

  // Online/Offline
  const updateOnline = () => $('#offBanner').classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();
}
