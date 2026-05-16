import { $, $$, formatRp, parseRpInput, setupRpInputs } from '../utils.js';
import { getState, saveState, addLog } from '../db.js';
import { t, getLang } from '../i18n.js';
import { toast } from '../ui.js';
import { updateDashboardSaldo, renderDashboardWallets, updateDashboardComparison, updateFinancialHealth, renderDynamicSaran } from './dashboard.js';

let actType = null;
let pendingTrx = null;

const accColors = [
  {bg:'rgba(133,166,51,.1)',bd:'rgba(133,166,51,.3)',tx:'#85a633'},
  {bg:'rgba(59,130,246,.1)',bd:'rgba(59,130,246,.3)',tx:'#3B82F6'},
  {bg:'rgba(168,85,247,.1)',bd:'rgba(168,85,247,.3)',tx:'#A855F7'},
  {bg:'rgba(234,179,8,.1)',bd:'rgba(234,179,8,.3)',tx:'#CA8A04'},
  {bg:'rgba(249,115,22,.1)',bd:'rgba(249,115,22,.3)',tx:'#EA580C'},
  {bg:'rgba(236,72,153,.1)',bd:'rgba(236,72,153,.3)',tx:'#DB2777'},
];

const incomeSources = [
  {id:'gaji',label:{id:'Gaji',en:'Salary'},icon:'briefcase'},
  {id:'freelance',label:{id:'Freelance',en:'Freelance'},icon:'laptop'},
  {id:'investasi',label:{id:'Investasi',en:'Investment'},icon:'trending-up'},
  {id:'bonus',label:{id:'Bonus',en:'Bonus'},icon:'gift'},
  {id:'transfer_masuk',label:{id:'Transfer Masuk',en:'Transfer In'},icon:'arrow-down-left'},
  {id:'lainnya_inc',label:{id:'Lainnya',en:'Others'},icon:'more-horizontal'},
];

const expenseCats = [
  {id:'makanan',label:{id:'Makanan & Minuman',en:'Food & Drinks'},icon:'utensils'},
  {id:'transportasi',label:{id:'Transportasi',en:'Transportation'},icon:'car'},
  {id:'belanja',label:{id:'Belanja',en:'Shopping'},icon:'shopping-bag'},
  {id:'tagihan',label:{id:'Tagihan & Utilitas',en:'Bills & Utilities'},icon:'file-text'},
  {id:'hiburan',label:{id:'Hiburan',en:'Entertainment'},icon:'gamepad-2'},
  {id:'kesehatan',label:{id:'Kesehatan',en:'Healthcare'},icon:'heart-pulse'},
  {id:'pendidikan',label:{id:'Pendidikan',en:'Education'},icon:'graduation-cap'},
  {id:'transfer_keluar',label:{id:'Transfer Keluar',en:'Transfer Out'},icon:'arrow-up-right'},
  {id:'lainnya_exp',label:{id:'Lainnya',en:'Others'},icon:'more-horizontal'},
];

/* ===== RENDER RIWAYAT TRANSAKSI 7 HARI TERAKHIR ===== */
export function renderActHistory() {
  const state = getState();
  const container = $('#actHistory');
  if(!container) return;

  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const recent = state.transactions.filter(tr => now - tr.timestamp < week).sort((a,b) => b.timestamp - a.timestamp);

  if(!recent.length){
    container.innerHTML = `
      <div class="act-empty">
        <div class="act-empty-t">${t('act_empty')}</div>
        <div class="act-empty-s">${t('act_empty_sub')}</div>
      </div>`;
    return;
  }

  const days = getLang()==='id'?['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = getLang()==='id'?['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  container.innerHTML = '<div class="act-list">' + recent.map(tr => {
    const d = new Date(tr.timestamp);
    const ds = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
    const cls = tr.type==='income' ? 'inc' : 'exp';
    const sign = tr.type==='income' ? '+' : '-';
    return `
      <div class="act-item ${cls}">
        <div class="act-item-info">
          <div class="act-item-cat">${tr.categoryName}</div>
          <div class="act-item-meta">${ds} · ${tr.accountName}</div>
        </div>
        <div class="act-item-amount ${cls}">${sign} ${formatRp(tr.amount)}</div>
      </div>`;
  }).join('') + '</div>';
}

/* ===== RENDER FORM TRANSAKSI ===== */
function renderActForm() {
  const formContainer = $('#actForm');
  if(!actType) { formContainer.innerHTML = ''; return; }

  const state = getState();
  const isInc = actType === 'income';
  const cats = isInc ? incomeSources : expenseCats;
  const today = new Date();
  const dateVal = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');

  let accChips = state.accounts.map((a,i) => {
    const c = accColors[i % accColors.length];
    return `<div class="chip" data-acc="${a.id}" style="--cbg:${c.bg};--cbd:${c.bd};--ctx:${c.tx}">${a.name}</div>`;
  }).join('');

  let catChips = cats.map(c => {
    return `<div class="chip" data-cat="${c.id}"><i data-lucide="${c.icon}"></i>${c.label[getLang()] || c.label.id}</div>`;
  }).join('');

  formContainer.innerHTML = `
    <div class="act-form">
      <div class="act-section-label" data-i18n="date">Tanggal</div>
      <div class="form-group" style="margin-bottom:0"><input type="date" class="form-input" id="actDate" value="${dateVal}"></div>
      
      <div class="act-section-label" data-i18n="choose_account">${t('choose_account')}</div>
      <div class="chip-grid" id="actAccChips">${accChips}</div>
      
      <div class="act-section-label">${isInc ? t('income_source') : t('expense_category')}</div>
      <div class="chip-grid" id="actCatChips">${catChips}</div>
      
      <div class="act-section-label" data-i18n="amount_rp">Nominal (Rp)</div>
      <div class="form-group" style="margin-bottom:0"><input type="text" inputmode="numeric" class="form-input" id="actAmount" placeholder="0" data-fmt-rp></div>
      
      <div class="act-section-label" data-i18n="note_optional">Keterangan (opsional)</div>
      <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="actNote" placeholder="${getLang()==='id'?'Contoh: Gaji bulan Desember':'e.g. December salary'}"></div>
      
      <button class="form-btn form-btn-primary" id="actPostBtn" style="margin-top:16px" data-i18n="posting">Posting</button>
    </div>`;

  lucide.createIcons();
  setupRpInputs(formContainer);

  const accentColor = isInc ? 'var(--green)' : 'var(--red)';
  const accentBg = isInc ? 'var(--green-l)' : 'var(--red-l)';
  const accentBd = isInc ? 'rgba(5,150,105,.3)' : 'rgba(239,68,68,.3)';

  function setupChips(container, attr) {
    container.querySelectorAll('.chip').forEach(ch => {
      ch.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(x => { x.classList.remove('sel'); x.style.background=''; x.style.borderColor=''; x.style.color=''; });
        ch.classList.add('sel');
        ch.style.background = attr==='acc' ? ch.style.getPropertyValue('--cbg') : accentBg;
        ch.style.borderColor = attr==='acc' ? ch.style.getPropertyValue('--cbd') : accentBd;
        ch.style.color = attr==='acc' ? ch.style.getPropertyValue('--ctx') : accentColor;
      });
    });
  }
  
  setupChips($('#actAccChips'), 'acc');
  setupChips($('#actCatChips'), 'cat');

  // Post Button Action
  $('#actPostBtn').addEventListener('click', () => {
    const date = $('#actDate').value;
    const accEl = $('#actAccChips').querySelector('.chip.sel');
    const catEl = $('#actCatChips').querySelector('.chip.sel');
    const amount = parseRpInput($('#actAmount'));

    if(!date) { toast(t('name_required')); return; }
    if(!accEl) { toast(t('choose_account')); return; }
    if(!catEl) { toast(isInc ? t('income_source') : t('expense_category')); return; }
    if(amount <= 0) { toast(t('invalid_amount')); return; }

    const accId = accEl.dataset.acc;
    const acc = state.accounts.find(a => a.id === accId);
    if(!acc) return;
    
    const catId = catEl.dataset.cat;
    const catObj = (isInc ? incomeSources : expenseCats).find(c => c.id === catId);
    const catName = catObj ? (catObj.label[getLang()] || catObj.label.id) : catId;
    const note = $('#actNote').value.trim();

    pendingTrx = { type: actType, date, accountId: accId, accountName: acc.name, categoryId: catId, categoryName: catName, amount, note };
    $('#trxConfirmModal').classList.add('active');
  });

  formContainer.scrollIntoView({behavior:'smooth', block:'nearest'});
}

/* ===== INIT TRANSAKSI & EVENT LISTENERS ===== */
export function initTransaction() {
  const incBtn = $('#actIncBtn');
  const expBtn = $('#actExpBtn');

  if(incBtn && !incBtn.dataset.bound) {
    incBtn.dataset.bound = 'true';
    incBtn.addEventListener('click', () => {
      if(actType === 'income') { actType = null; incBtn.classList.remove('on-inc'); $('#actForm').innerHTML = ''; renderActHistory(); return; }
      actType = 'income'; incBtn.classList.add('on-inc'); expBtn.classList.remove('on-exp');
      $('#actHistory').innerHTML = ''; renderActForm();
    });
  }

  if(expBtn && !expBtn.dataset.bound) {
    expBtn.dataset.bound = 'true';
    expBtn.addEventListener('click', () => {
      if(actType === 'expense') { actType = null; expBtn.classList.remove('on-exp'); $('#actForm').innerHTML = ''; renderActHistory(); return; }
      actType = 'expense'; expBtn.classList.add('on-exp'); incBtn.classList.remove('on-inc');
      $('#actHistory').innerHTML = ''; renderActForm();
    });
  }

  // Confirm Modal Edit
  const confirmEdit = $('#trxConfirmEdit');
  if(confirmEdit && !confirmEdit.dataset.bound) {
    confirmEdit.dataset.bound = 'true';
    confirmEdit.addEventListener('click', () => {
      $('#trxConfirmModal').classList.remove('active');
    });
  }

  // Confirm Modal Yes (Execute Transaction)
  const confirmYes = $('#trxConfirmYes');
  if(confirmYes && !confirmYes.dataset.bound) {
    confirmYes.dataset.bound = 'true';
    confirmYes.addEventListener('click', () => {
      if(!pendingTrx) return;
      const state = getState();
      const acc = state.accounts.find(a => a.id === pendingTrx.accountId);

      if(acc) {
        if(pendingTrx.type === 'income') {
          acc.balance += pendingTrx.amount;
        } else {
          if(acc.balance < pendingTrx.amount) { toast(t('mut_insufficient')); return; }
          acc.balance -= pendingTrx.amount;
        }
      }

      state.transactions.push({
        id: 'trx-'+Date.now(),
        type: pendingTrx.type,
        date: pendingTrx.date,
        accountId: pendingTrx.accountId,
        accountName: pendingTrx.accountName,
        categoryId: pendingTrx.categoryId,
        categoryName: pendingTrx.categoryName,
        amount: pendingTrx.amount,
        note: pendingTrx.note || '',
        timestamp: Date.now()
      });

      addLog('transaksi', (pendingTrx.type==='income'?'Pemasukan':'Pengeluaran') + ' dicatat', pendingTrx.categoryName + ' ' + formatRp(pendingTrx.amount));
      saveState();

      $('#trxConfirmModal').classList.remove('active');
      pendingTrx = null;

      // Reset Form & Update UI
      actType = null;
      $('#actIncBtn').classList.remove('on-inc');
      $('#actExpBtn').classList.remove('on-exp');
      
      renderActHistory();
      $('#actForm').innerHTML = '';
      updateDashboardSaldo();
      renderDashboardWallets();
      updateDashboardComparison();
      updateFinancialHealth();
      renderDynamicSaran();

      toast(t('act_success'));
    });
  }

  // Initial render
  renderActHistory();
}
