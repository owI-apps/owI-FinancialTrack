import { $, $$, formatRp, parseRpInput, setupRpInputs } from '../utils.js';
import { getState, saveState, addLog } from '../db.js';
import { t, getLang } from '../i18n.js';
import { toast } from '../ui.js';
import { updateDashboardSaldo, renderDashboardWallets, updateDashboardComparison, updateFinancialHealth, renderDynamicSaran } from './dashboard.js';

/* ===== POPULATE DROPLIST AKUN ===== */
function populateMutasiSelects() {
  const state = getState();
  const opts = state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  $('#mutasiFrom').innerHTML = opts;
  $('#mutasiTo').innerHTML = opts;
}

/* ===== RENDER RIWAYAT MUTASI ===== */
export function renderMutasiHistory() {
  const state = getState();
  const container = $('#mutasiHistory');
  if(!container) return;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recent = state.mutations.filter(m => now - m.timestamp < sevenDays).sort((a,b) => b.timestamp - a.timestamp);

  if(!recent.length){
    container.innerHTML = `
      <div class="mut-empty">
        <div class="mut-empty-icon"><i data-lucide="arrow-left-right"></i></div>
        <div class="mut-empty-t">${t('mut_empty')}</div>
        <div class="mut-empty-s">${t('mut_empty_sub')}</div>
      </div>`;
    lucide.createIcons();
    return;
  }

  const days = getLang()==='id'?['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = getLang()==='id'?['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  container.innerHTML = '<div class="mut-list">' + recent.map(m => {
    const d = new Date(m.timestamp);
    const dateStr = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    return `
      <div class="mut-item">
        <div class="mut-item-top">
          <div class="mut-item-date"><i data-lucide="calendar"></i>${dateStr}</div>
          <div class="mut-item-amount">- ${formatRp(m.amount)}</div>
        </div>
        <div class="mut-item-flow">
          <span class="mut-item-from">${m.fromName}</span>
          <i data-lucide="arrow-right"></i>
          <span class="mut-item-to">${m.toName}</span>
        </div>
      </div>`;
  }).join('') + '</div>';
  
  lucide.createIcons();
}

/* ===== INIT MUTASI & EVENT LISTENERS ===== */
export function initMutation() {
  // 1. Buka Modal Mutasi
  const openBtn = $('#mutasiOpenBtn');
  if(openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = 'true';
    openBtn.addEventListener('click', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      $('#mutasiDate').value = yyyy+'-'+mm+'-'+dd;
      $('#mutasiAmount').value = '';
      populateMutasiSelects();
      $('#mutasiModal').classList.add('active');
      setupRpInputs($('#mutasiModal')); // Init format Rp di input modal
    });
  }

  // 2. Tombol Batal di Modal Mutasi
  const cancelBtn = $('#mutasiCancel');
  if(cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = 'true';
    cancelBtn.addEventListener('click', () => {
      $('#mutasiModal').classList.remove('active');
    });
  }

  // 3. Tombol Posting (Validasi & Pindah ke Konfirmasi)
  const postBtn = $('#mutasiPost');
  if(postBtn && !postBtn.dataset.bound) {
    postBtn.dataset.bound = 'true';
    postBtn.addEventListener('click', () => {
      const date = $('#mutasiDate').value;
      const fromId = $('#mutasiFrom').value;
      const toId = $('#mutasiTo').value;
      const amount = parseRpInput($('#mutasiAmount'));

      if(!date) { toast(t('name_required')); $('#mutasiDate').focus(); return; }
      if(fromId === toId) { toast(t('mut_same_account')); return; }
      if(amount <= 0) { toast(t('invalid_amount')); $('#mutasiAmount').focus(); return; }

      const state = getState();
      const fromAcc = state.accounts.find(a => a.id === fromId);
      if(!fromAcc || fromAcc.balance < amount) { toast(t('mut_insufficient')); return; }

      // Simpan data sementara di element modal
      $('#mutasiModal')._pending = {
        date, fromId, toId, amount, 
        fromName: fromAcc.name, 
        toName: state.accounts.find(a => a.id === toId).name
      };
      
      $('#mutasiModal').classList.remove('active');
      $('#mutasiConfirmModal').classList.add('active');
    });
  }

  // 4. Tombol Edit Ulang di Modal Konfirmasi
  const confirmEditBtn = $('#mutasiConfirmEdit');
  if(confirmEditBtn && !confirmEditBtn.dataset.bound) {
    confirmEditBtn.dataset.bound = 'true';
    confirmEditBtn.addEventListener('click', () => {
      $('#mutasiConfirmModal').classList.remove('active');
      setTimeout(() => $('#mutasiModal').classList.add('active'), 200);
    });
  }

  // 5. Tombol "Benar" (Eksekusi Mutasi)
  const confirmYesBtn = $('#mutasiConfirmYes');
  if(confirmYesBtn && !confirmYesBtn.dataset.bound) {
    confirmYesBtn.dataset.bound = 'true';
    confirmYesBtn.addEventListener('click', () => {
      const pendingData = $('#mutasiModal')._pending;
      if(!pendingData) return;

      const state = getState();
      const fromAcc = state.accounts.find(a => a.id === pendingData.fromId);
      const toAcc = state.accounts.find(a => a.id === pendingData.toId);

      // Eksekusi perpindahan saldo
      if(fromAcc) fromAcc.balance -= pendingData.amount;
      if(toAcc) toAcc.balance += pendingData.amount;

      // Simpan riwayat mutasi
      state.mutations.push({
        id: 'mut-'+Date.now(),
        date: pendingData.date,
        fromId: pendingData.fromId,
        fromName: pendingData.fromName,
        toId: pendingData.toId,
        toName: pendingData.toName,
        amount: pendingData.amount,
        timestamp: Date.now()
      });

      // Tambah Log & Simpan State
      addLog('mutasi', 'Mutasi saldo', pendingData.fromName + ' -> ' + pendingData.toName + ' ' + formatRp(pendingData.amount));
      saveState();

      // Tutup modal & bersihkan pending
      $('#mutasiConfirmModal').classList.remove('active');
      $('#mutasiModal')._pending = null;

      // Update seluruh UI terkait
      renderMutasiHistory();
      updateDashboardSaldo();
      renderDashboardWallets();
      updateDashboardComparison();
      updateFinancialHealth();
      renderDynamicSaran();
      
      toast(t('mut_success'));
    });
  }

  // Render awal riwayat
  renderMutasiHistory();
}
