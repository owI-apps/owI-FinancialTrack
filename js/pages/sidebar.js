import { $, $$, formatRp, parseRpInput, setupRpInputs } from '../utils.js';
import { getState, saveState, addLog } from '../db.js';
import { t, getLang, applyI18n } from '../i18n.js';
import { toast, closeSB, setTheme } from '../ui.js';
import { updateDashboardSaldo, renderDashboardWallets, updateDashBadges, updateFinancialHealth, renderDynamicSaran } from './dashboard.js';

const accTypeIcons = {'Cash':'wallet','Bank':'landmark','E-Wallet':'smartphone','Crypto':'bitcoin','Asuransi':'shield'};
let editingAccountId = null;

/* ===== IMAGE COMPRESSOR ===== */
function compressImg(file, mw=400, q=.6) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); let w=img.width, h=img.height;
        if(w>mw){h=(mw/w)*h; w=mw} c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h); res(c.toDataURL('image/jpeg',q));
      };
      img.onerror=rej; img.src=e.target.result;
    };
    r.onerror=rej; r.readAsDataURL(file);
  });
}

/* ===== PROFILE ===== */
function populateProfileForm() {
  const state = getState();
  $('#profileName').value = state.userName;
  $('#profileEmail').value = state.userEmail;
  $('#profilePhone').value = state.userPhone;
  updateProfilePhotoPreview();
  updateAboutLogo();
}

function updateProfilePhotoPreview() {
  const state = getState();
  const img = $('#profilePhotoImg');
  const icon = $('#profilePhotoIcon');
  if(state.userPhoto) { img.src = state.userPhoto; img.style.display = 'block'; icon.style.display = 'none'; }
  else { img.style.display = 'none'; icon.style.display = ''; }
}

function updateLogoWithPhoto() {
  const state = getState();
  const headerBtn = $('#logoBtn');
  const sbLogo = $('#sbLogo');

  if(state.userPhoto) {
    headerBtn.innerHTML = `<img src="${state.userPhoto}" alt="owI" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    // Hapus text owI di sidebar logo, ganti img
    const sbOldImg = sbLogo.querySelector('.sb-user-photo');
    if(sbOldImg) sbOldImg.remove();
    const sbOldAr = sbLogo.querySelector('.logo-ar');
    if(sbOldAr) sbOldAr.style.display = 'none';
    
    const newImg = document.createElement('img');
    newImg.className = 'sb-user-photo';
    newImg.src = state.userPhoto;
    newImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0';
    sbLogo.style.position = 'relative';
    sbLogo.appendChild(newImg);
  } else {
    headerBtn.innerHTML = `<span class="logo-ar">owI</span>`;
    const sbOldImg = sbLogo.querySelector('.sb-user-photo');
    if(sbOldImg) sbOldImg.remove();
    const sbOldAr = sbLogo.querySelector('.logo-ar');
    if(sbOldAr) sbOldAr.style.display = '';
  }
}

function updateAboutLogo() {
  const state = getState();
  const el = $('#aboutLogo');
  if(!el) return;
  const ar = el.querySelector('.logo-ar');
  let img = el.querySelector('img');

  if(state.userPhoto) {
    if(!img) { img = document.createElement('img'); el.appendChild(img); }
    img.src = state.userPhoto;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0';
    el.style.position = 'relative';
    if(ar) ar.style.display = 'none';
  } else {
    if(img) img.remove();
    if(ar) ar.style.display = '';
  }
}

/* ===== CHART OF ACCOUNT ===== */
export function renderCOA() {
  const state = getState();
  const list = $('#coaList');
  if(!list) return;

  list.innerHTML = '';
  state.accounts.forEach(acc => {
    const icon = accTypeIcons[acc.type] || 'wallet';
    const card = document.createElement('div'); card.className = 'coa-card';
    card.innerHTML = `
      <div class="coa-card-icon"><i data-lucide="${icon}"></i></div>
      <div class="coa-card-info">
        <div class="coa-card-name">${acc.name} ${acc.permanent ? '<span class="perm-badge">'+t('permanent')+'</span>' : ''}</div>
        <div class="coa-card-type">${acc.type}</div>
      </div>
      <div class="coa-card-actions">
        <button class="coa-btn" data-edit="${acc.id}" title="Edit"><i data-lucide="pencil"></i></button>
        ${acc.permanent ? '' : `<button class="coa-btn" data-delete="${acc.id}" title="Hapus"><i data-lucide="trash-2"></i></button>`}
      </div>`;
    list.appendChild(card);
  });
  lucide.createIcons();

  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    const a = state.accounts.find(x => x.id === btn.dataset.edit);
    if(!a) return;
    if(a.permanent) openEditDompet(a); else openEditAccount(a);
  }));

  list.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
    const delAcc = state.accounts.find(a => a.id === btn.dataset.delete);
    if(!delAcc) return;
    addLog('coa', 'Akun dihapus', '"'+delAcc.name+'"');
    state.accounts = state.accounts.filter(a => a.id !== btn.dataset.delete);
    saveState();
    renderCOA(); renderDashboardWallets(); updateDashboardSaldo(); updateFinancialHealth(); renderDynamicSaran();
    toast(t('account_deleted'));
  }));
}

function openEditDompet(acc) {
  editingAccountId = null;
  $('#editDompetBalance').value = acc.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  $('#editModalTitle').textContent = t('edit_main_wallet');
  $('#editDompetModal').classList.add('active');
}

function openEditAccount(acc) {
  editingAccountId = acc.id;
  $('#editDompetBalance').value = acc.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  $('#editModalTitle').textContent = 'Edit ' + acc.name;
  $('#editDompetModal').classList.add('active');
}

/* ===== INIT SIDEBAR ===== */
export function initSidebar() {
  const state = getState();
  
  // Sync Profile UI
  $('#dashUserName').textContent = state.userName;
  updateLogoWithPhoto();

  // 1. Profile Photo
  const photoBtn = $('#profilePhotoBtn');
  const photoInput = $('#photoInput');
  if(photoBtn && !photoBtn.dataset.bound) {
    photoBtn.dataset.bound = 'true';
    photoBtn.addEventListener('click', () => photoInput.click());
  }
  if(photoInput && !photoInput.dataset.bound) {
    photoInput.dataset.bound = 'true';
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if(!file) return;
      if(!file.type.startsWith('image/')) { toast(t('image_only')); return; }
      if(file.size > 2*1024*1024) { toast(t('max_2mb')); return; }
      try {
        const compressed = await compressImg(file);
        const state = getState();
        state.userPhoto = compressed;
        saveState();
        updateProfilePhotoPreview(); updateLogoWithPhoto(); updateAboutLogo();
        addLog('profile', 'Foto profil diubah');
        toast(t('photo_changed'));
      } catch(err) { toast('Error processing image'); }
    });
  }

  // 2. Save Profile
  const saveProfileBtn = $('#profileSaveBtn');
  if(saveProfileBtn && !saveProfileBtn.dataset.bound) {
    saveProfileBtn.dataset.bound = 'true';
    saveProfileBtn.addEventListener('click', () => {
      const name = $('#profileName').value.trim();
      if(!name) { toast(t('name_empty')); $('#profileName').focus(); return; }
      const state = getState();
      state.userName = name;
      state.userEmail = $('#profileEmail').value.trim();
      state.userPhone = $('#profilePhone').value.trim();
      addLog('profile', 'Profile diperbarui', 'Nama: '+name);
      saveState();
      $('#dashUserName').textContent = name;
      toast(t('profile_saved'));
    });
  }

  // 3. COA Add Button
  const coaAddBtn = $('#coaAddBtn');
  if(coaAddBtn && !coaAddBtn.dataset.bound) {
    coaAddBtn.dataset.bound = 'true';
    coaAddBtn.addEventListener('click', () => {
      $('#newAccName').value = ''; $('#newAccType').value = ''; $('#newAccBalance').value = '';
      $('#addAccountModal').classList.add('active');
      setupRpInputs($('#addAccountModal'));
    });
  }

  // 4. COA Add Account Modal
  const addAccCancel = $('#addAccCancel');
  const addAccPost = $('#addAccPost');
  if(addAccCancel && !addAccCancel.dataset.bound) {
    addAccCancel.dataset.bound = 'true';
    addAccCancel.addEventListener('click', () => $('#addAccountModal').classList.remove('active'));
  }
  if(addAccPost && !addAccPost.dataset.bound) {
    addAccPost.dataset.bound = 'true';
    addAccPost.addEventListener('click', () => {
      const name = $('#newAccName').value.trim();
      const type = $('#newAccType').value;
      const balance = parseRpInput($('#newAccBalance'));
      if(!name) { toast(t('name_required')); return; }
      if(!type) { toast(t('type_required')); return; }
      if(balance < 0) { toast(t('no_negative')); return; }
      $('#addAccountModal')._pending = {name, type, balance};
      $('#addAccountModal').classList.remove('active');
      $('#confirmModal').classList.add('active');
    });
  }

  // 5. Confirm Add Account
  const confirmEdit = $('#confirmEdit');
  const confirmYes = $('#confirmYes');
  if(confirmEdit && !confirmEdit.dataset.bound) {
    confirmEdit.dataset.bound = 'true';
    confirmEdit.addEventListener('click', () => {
      $('#confirmModal').classList.remove('active');
      setTimeout(() => $('#addAccountModal').classList.add('active'), 200);
    });
  }
  if(confirmYes && !confirmYes.dataset.bound) {
    confirmYes.dataset.bound = 'true';
    confirmYes.addEventListener('click', () => {
      const data = $('#addAccountModal')._pending;
      if(!data) return;
      const state = getState();
      state.accounts.push({id:'acc-'+Date.now(), name:data.name, type:data.type, balance:data.balance, permanent:false});
      addLog('coa', 'Akun ditambahkan', '"'+data.name+'" ('+data.type+')');
      saveState();
      renderCOA(); renderDashboardWallets(); updateDashboardSaldo();
      toast(`"${data.name}" ${t('account_added')}`);
      $('#confirmModal').classList.remove('active');
      $('#addAccountModal')._pending = null;
    });
  }

  // 6. Edit Saldo Modal
  const editDompetCancel = $('#editDompetCancel');
  const editDompetSave = $('#editDompetSave');
  if(editDompetCancel && !editDompetCancel.dataset.bound) {
    editDompetCancel.dataset.bound = 'true';
    editDompetCancel.addEventListener('click', () => { $('#editDompetModal').classList.remove('active'); editingAccountId=null; });
  }
  if(editDompetSave && !editDompetSave.dataset.bound) {
    editDompetSave.dataset.bound = 'true';
    editDompetSave.addEventListener('click', () => {
      const val = parseRpInput($('#editDompetBalance'));
      if(isNaN(val) || val < 0) { toast(t('invalid_amount')); return; }
      const state = getState();
      if(editingAccountId) {
        const acc = state.accounts.find(a => a.id === editingAccountId);
        if(acc) { addLog('coa', 'Saldo akun diperbarui', '"'+acc.name+'" -> '+formatRp(val)); acc.balance = val; }
      } else {
        const d = state.accounts.find(a => a.id === 'dompet-utama');
        if(d) { addLog('coa', 'Saldo akun diperbarui', '"'+d.name+'" -> '+formatRp(val)); d.balance = val; }
      }
      saveState();
      renderCOA(); renderDashboardWallets(); updateDashboardSaldo(); updateFinancialHealth(); renderDynamicSaran();
      toast(t('main_wallet_updated'));
      editingAccountId = null;
      $('#editDompetModal').classList.remove('active');
    });
  }

  // 7. Reset App
  const resetYes = $('#resetYes');
  if(resetYes && !resetYes.dataset.bound) {
    resetYes.dataset.bound = 'true';
    resetYes.addEventListener('click', () => {
      localStorage.removeItem('owi_fintrack_state');
      closeSB();
      setTimeout(() => location.reload(), 300);
    });
  }
}
