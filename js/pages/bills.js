import { $, $$, formatRp, parseRpInput, setupRpInputs } from '../utils.js';
import { getState, saveState, addLog } from '../db.js';
import { t, getLang } from '../i18n.js';
import { toast } from '../ui.js';
import { updateDashBadges, updateFinancialHealth, renderDynamicSaran, updateDashboardSaldo, renderDashboardWallets } from './dashboard.js';

let tagType = null;
let tagConfirmCb = null;
let tagPayCb = null;

/* ===== HELPERS ===== */
function getDueInfo(ds) {
  if(!ds) return {text:'', cls:'tag-badge-ok'};
  const due = new Date(ds+'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((due-today)/(864e5));
  if(diff>7) return {text:t('due_in')+' '+diff+' '+t('days'), cls:'tag-badge-ok'};
  if(diff>0) return {text:t('due_in')+' '+diff+' '+t('days'), cls:'tag-badge-warn'};
  if(diff===0) return {text:t('due_today'), cls:'tag-badge-due'};
  return {text:t('overdue')+' '+Math.abs(diff)+' '+t('days'), cls:'tag-badge-overdue'};
}

function compressImg(file, mw=800, q=.6) {
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

function renderTagActions() {
  renderTagList();
  updateDashBadges();
  updateFinancialHealth();
  renderDynamicSaran();
  updateDashboardSaldo();
  renderDashboardWallets();
}

/* ===== RENDER LIST ===== */
export function renderTagList() {
  const state = getState();
  const container = $('#tagList');
  if(!container) return;

  if(!tagType) {
    // Tampilan Awal (Semua)
    const allDebts = state.debts.filter(d => (d.totalDebt-d.paidAmount)>0);
    const allRecvs = state.receivables.filter(r => (r.amount-r.paidAmount)>0);
    
    if(!allDebts.length && !allRecvs.length) {
      container.innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_bills')}</div><div class="tag-empty-s">${t('no_bills_sub')}</div></div>`;
      lucide.createIcons();
      return;
    }
    let html = '';
    if(allDebts.length) {
      html += '<div style="font-size:.72rem;font-weight:600;color:var(--red);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">'+t('debt')+'</div>';
      allDebts.forEach(d => html += generateDebtCard(d));
    }
    if(allRecvs.length) {
      html += '<div style="font-size:.72rem;font-weight:600;color:var(--amber);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;margin-top:'+(allDebts.length?'16':'0')+'px">'+t('receivable')+'</div>';
      allRecvs.forEach(r => html += generateRecvCard(r));
    }
    container.innerHTML = html;
  } else if(tagType === 'debt') {
    const items = state.debts.filter(d => (d.totalDebt-d.paidAmount)>0);
    if(!items.length) {
      container.innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_debts')}</div><div class="tag-empty-s">${t('no_debts_sub')}</div></div>`;
      lucide.createIcons();
      return;
    }
    container.innerHTML = items.map(d => generateDebtCard(d)).join('');
  } else if(tagType === 'receivable') {
    const items = state.receivables.filter(r => (r.amount-r.paidAmount)>0);
    if(!items.length) {
      container.innerHTML = `<div class="tag-empty"><div class="tag-empty-t">${t('no_recvs')}</div><div class="tag-empty-s">${t('no_recvs_sub')}</div></div>`;
      lucide.createIcons();
      return;
    }
    container.innerHTML = items.map(r => generateRecvCard(r)).join('');
  }
  
  lucide.createIcons();
  bindTagCardEvents();
}

function generateDebtCard(d) {
  const di = getDueInfo(d.dueDate); const rem = d.totalDebt-d.paidAmount;
  return `<div class="tag-card">
    <div class="tag-card-head"><div><div class="tag-card-name">${d.name}</div>${d.description?'<div class="tag-card-desc">'+d.description+'</div>':''}</div><span class="tag-badge ${di.cls}">${di.text}</span></div>
    <div class="tag-info"><div class="tag-info-item"><span>${t('installment')}</span><span>${formatRp(d.installmentAmount)}</span></div><div class="tag-info-item"><span>${t('total')}</span><span>${formatRp(d.totalDebt)}</span></div><div class="tag-info-item"><span>${t('paid')}</span><span>${formatRp(d.paidAmount)}</span></div><div class="tag-info-item"><span>${t('remaining')}</span><span>${formatRp(rem)}</span></div></div>
    <div class="tag-actions"><button class="tag-act-btn primary" data-dfull="${d.id}">${t('full_pay')}</button><button class="tag-act-btn primary" data-dmin="${d.id}">${t('min_pay')}</button><button class="tag-act-btn danger" data-ddel="${d.id}">${t('delete')}</button></div>
  </div>`;
}

function generateRecvCard(r) {
  const rem = r.amount-r.paidAmount;
  return `<div class="tag-card">
    <div class="tag-card-head"><div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1"><div class="tag-card-name">${r.name}</div><div class="tag-card-desc">${t('borrow_date')}: ${r.borrowDate}</div>${r.contact?'<div class="tag-card-desc">'+t('contact')+': '+r.contact+'</div>':''}</div>${r.receiptImage?'<div class="tag-recv-img" data-rimg="'+r.id+'"><img src="'+r.receiptImage+'" alt="Bukti"></div>':'<div class="tag-recv-img"><i data-lucide="image"></i></div>'}</div></div>
    <div class="tag-info"><div class="tag-info-item"><span>${t('nominal')}</span><span>${formatRp(r.amount)}</span></div><div class="tag-info-item"><span>${t('received')}</span><span>${formatRp(r.paidAmount)}</span></div><div class="tag-info-item"><span>${t('remaining')}</span><span>${formatRp(rem)}</span></div></div>
    <div class="tag-actions"><button class="tag-act-btn primary" data-rfull="${r.id}">${t('full_pay')}</button><button class="tag-act-btn primary" data-rcicil="${r.id}">${t('cicil_pay')}</button><button class="tag-act-btn danger" data-rdel="${r.id}">${t('delete')}</button></div>
  </div>`;
}

function bindTagCardEvents() {
  const state = getState();
  $$('[data-rimg]').forEach(b => b.addEventListener('click', () => {
    const rv = state.receivables.find(x => x.id===b.dataset.rimg);
    if(rv && rv.receiptImage) { $('#tagImgView').src=rv.receiptImage; $('#tagImgModal').classList.add('active'); }
  }));
  $$('[data-dfull]').forEach(b => b.addEventListener('click', () => handleDebtFull(b.dataset.dfull)));
  $$('[data-dmin]').forEach(b => b.addEventListener('click', () => handleDebtMin(b.dataset.dmin)));
  $$('[data-ddel]').forEach(b => b.addEventListener('click', () => handleDebtDel(b.dataset.ddel)));
  $$('[data-rfull]').forEach(b => b.addEventListener('click', () => handleRecvFull(b.dataset.rfull)));
  $$('[data-rcicil]').forEach(b => b.addEventListener('click', () => handleRecvCicil(b.dataset.rcicil)));
  $$('[data-rdel]').forEach(b => b.addEventListener('click', () => handleRecvDel(b.dataset.rdel)));
}

/* ===== RENDER FORM ===== */
function renderTagForm() {
  const formContainer = $('#tagForm');
  if(!tagType) { formContainer.innerHTML = ''; return; }

  const state = getState();
  const today = new Date().toISOString().slice(0,10);

  if(tagType === 'debt') {
    formContainer.innerHTML = `<div class="tag-form">
      <div class="form-group"><label class="form-label">${t('debt_name')}</label><input type="text" class="form-input" id="tdName" placeholder="${getLang()==='id'?'Contoh: KUR BRI':'e.g. KUR BRI'}"></div>
      <div class="form-group"><label class="form-label">${t('description')}</label><input type="text" class="form-input" id="tdDesc" placeholder="${getLang()==='id'?'Contoh: Pinjaman modal usaha':'e.g. Business capital loan'}"></div>
      <div class="form-group"><label class="form-label">${t('tenor')}</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input type="number" class="form-input" id="tdPaid" placeholder="${getLang()==='id'?'Sudah bayar':'Paid'}" min="0"><input type="number" class="form-input" id="tdTenor" placeholder="${getLang()==='id'?'Total tenor':'Total tenor'}" min="1"></div></div>
      <div class="form-group"><label class="form-label">${t('installment')}</label><input type="text" inputmode="numeric" class="form-input" id="tdInstall" placeholder="0" data-fmt-rp></div>
      <div class="form-group"><label class="form-label">${t('due_date')}</label><input type="date" class="form-input" id="tdDue" value="${today}"></div>
      <button class="form-btn form-btn-primary" id="tdAdd">${t('add_debt')}</button>
    </div>`;
    
    setupRpInputs(formContainer);
    $('#tdAdd').addEventListener('click', () => {
      const name=$('#tdName').value.trim(), paid=parseInt($('#tdPaid').value)||0, tenor=parseInt($('#tdTenor').value)||0, inst=parseRpInput($('#tdInstall')), due=$('#tdDue').value;
      const remainingTenor=Math.max(0,tenor-paid); const total=remainingTenor*inst;
      if(!name){toast(t('name_required'));return} if(tenor<1){toast(t('tenor_required'));return} if(inst<=0||total<=0){toast(t('invalid_amount'));return} if(!due){toast(t('name_required'));return}
      const desc=paid+'/'+tenor;
      state.debts.push({id:'d-'+Date.now(),name,description:desc,installmentAmount:inst,totalDebt:total,dueDate:due,paidAmount:0,createdAt:Date.now()});
      addLog('tagihan','Tambah hutang','"'+name+'" '+formatRp(total));
      saveState();
      
      // RESET KE TAMPILAN SEMUA SETELAH TAMBAH HUTANG
      tagType = null; 
      $('#tagDebtBtn').classList.remove('on-d');
      $('#tagRecvBtn').classList.remove('on-r');
      formContainer.innerHTML = '';
      
      renderTagActions();
      toast(t('debt_added'));
    });
  } else {
    let pendingImg = null;
    formContainer.innerHTML = `<div class="tag-form">
      <div class="form-group"><label class="form-label">${t('party_name')}</label><input type="text" class="form-input" id="trName" placeholder="${getLang()==='id'?'Contoh: Tuan Adi':'e.g. Mr. Adi'}"></div>
      <div class="form-group"><label class="form-label">${t('borrow_date')}</label><input type="date" class="form-input" id="trDate" value="${today}"></div>
      <div class="form-group"><label class="form-label">${t('nominal')}</label><input type="text" inputmode="numeric" class="form-input" id="trAmount" placeholder="0" data-fmt-rp></div>
      <div class="form-group"><label class="form-label">Sumber Dana</label><select class="form-input" id="trSource">${state.accounts.map(a=>'<option value="'+a.id+'">'+a.name+'</option>').join('')}</select></div>
      <div class="form-group"><label class="form-label">${t('contact')}</label><input type="text" class="form-input" id="trContact" placeholder="08xxxxxxxxxx"></div>
      <div class="form-group"><label class="form-label">${t('receipt')}</label><div class="tag-upload-wrap"><div class="tag-upload" id="trUpload"><i data-lucide="camera"></i><span>${t('tap_to_upload')}</span></div><input type="file" accept="image/*" class="hidden-input" id="trFile"></div></div>
      <button class="form-btn form-btn-primary" id="trAdd">${t('add_recv')}</button>
    </div>`;

    lucide.createIcons();
    setupRpInputs(formContainer);
    
    $('#trUpload').addEventListener('click', () => $('#trFile').click());
    $('#trFile').addEventListener('change', async e => {
      const f=e.target.files[0]; if(!f) return;
      if(!f.type.startsWith('image/')){toast(t('image_only'));return} if(f.size>2*1024*1024){toast(t('img_max_2mb'));return}
      try { 
        pendingImg = await compressImg(f); 
        const wrap=$('#trUpload'); wrap.innerHTML='<img src="'+pendingImg+'" alt="Bukti">'; wrap.style.borderStyle='solid'; wrap.style.borderColor='var(--accent)';
      } catch(err) { toast('Error compressing image'); }
    });

    $('#trAdd').addEventListener('click', () => {
      const name=$('#trName').value.trim(), date=$('#trDate').value, amount=parseRpInput($('#trAmount')), contact=$('#trContact').value.trim(), sourceId=$('#trSource').value;
      if(!name){toast(t('name_required'));return} if(amount<=0){toast(t('invalid_amount'));return} if(!date){toast(t('name_required'));return}
      const srcAcc=state.accounts.find(a=>a.id===sourceId);
      if(!srcAcc||srcAcc.balance<amount){toast(t('mut_insufficient'));return}
      srcAcc.balance-=amount;
      state.receivables.push({id:'r-'+Date.now(),name,borrowDate:date,amount,contact,sourceAccountId:sourceId,receiptImage:pendingImg||null,paidAmount:0,createdAt:Date.now()});
      addLog('tagihan','Tambah piutang','"'+name+'" '+formatRp(amount));
      saveState();
      
      // RESET KE TAMPILAN SEMUA SETELAH TAMBAH PIUTANG
      tagType = null; 
      $('#tagDebtBtn').classList.remove('on-d');
      $('#tagRecvBtn').classList.remove('on-r');
      formContainer.innerHTML = '';
      
      renderTagActions();
      toast(t('recv_added'));
    });
  }
}

/* ===== MODAL HELPERS ===== */
function openTagConfirm(msg, btnTxt, cb, accounts, defaultAccId) {
  $('#tagConfirmMsg').textContent=msg; $('#tagConfirmYes').textContent=btnTxt;
  const old=document.getElementById('tagConfirmSource'); if(old) old.parentElement.remove();
  if(accounts && accounts.length) {
    const g=document.createElement('div'); g.className='form-group';
    g.innerHTML=`<label class="form-label">Masuk ke Akun</label><select class="form-input" id="tagConfirmSource">${accounts.map(a=>`<option value="${a.id}"${a.id===defaultAccId?' selected':''}>${a.name}</option>`).join('')}</select>`;
    $('#tagConfirmMsg').after(g);
  }
  tagConfirmCb=cb; $('#tagConfirmModal').classList.add('active');
}

function openTagPay(title, cb, accounts, defaultAccId, amountStr, isReadonly, labelText) {
  $('#tagPayTitle').textContent=title; $('#tagPayAmount').value=amountStr||''; $('#tagPayAmount').readOnly=!!isReadonly;
  const old=document.getElementById('tagPaySource'); if(old) old.parentElement.remove();
  if(accounts && accounts.length) {
    const g=document.createElement('div'); g.className='form-group';
    g.innerHTML=`<label class="form-label">${labelText||'Masuk ke Akun'}</label><select class="form-input" id="tagPaySource">${accounts.map(a=>`<option value="${a.id}"${a.id===defaultAccId?' selected':''}>${a.name}</option>`).join('')}</select>`;
    $('#tagPayAmount').parentElement.before(g);
  }
  tagPayCb=cb; $('#tagPayModal').classList.add('active');
}

/* ===== DEBT HANDLERS ===== */
function handleDebtFull(id) {
  const state = getState(); const d=state.debts.find(x=>x.id===id); if(!d) return;
  const rem=d.totalDebt-d.paidAmount; const pay=Math.min(d.installmentAmount,rem);
  const payStr=pay.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  openTagPay(t('full_pay'), () => {
    const sel=document.getElementById('tagPaySource'); const accId=sel?sel.value:null;
    const acc=state.accounts.find(a=>a.id===accId); if(!acc){toast(t('choose_account'));return}
    if(acc.balance<pay){toast(t('mut_insufficient'));return}
    acc.balance-=pay; d.paidAmount+=pay; if(d.paidAmount>=d.totalDebt) d.paidAmount=d.totalDebt;
    if(d.description){d.description=d.description.replace(/(\d+)\s*\/\s*(\d+)/,(m,num,den)=>{const next=parseInt(num)+1;return next<=parseInt(den)?next+'/'+den:m})}
    addLog('tagihan','Bayar hutang','"'+d.name+'" sebesar '+formatRp(pay));
    saveState(); renderTagActions(); toast(t('debt_paid'));
  }, state.accounts, null, payStr, true, 'Bayar Dari Akun');
}

function handleDebtMin(id) {
  const state = getState();
  openTagPay(t('min_pay'), () => {
    const amt=parseRpInput($('#tagPayAmount')); if(amt<=0){toast(t('invalid_amount'));return}
    const d=state.debts.find(x=>x.id===id); if(!d) return;
    const rem=d.totalDebt-d.paidAmount; if(amt>rem){toast(t('invalid_amount'));return}
    const sel=document.getElementById('tagPaySource'); const accId=sel?sel.value:null;
    const acc=state.accounts.find(a=>a.id===accId); if(!acc){toast(t('choose_account'));return}
    if(acc.balance<amt){toast(t('mut_insufficient'));return}
    acc.balance-=amt; d.paidAmount+=amt;
    addLog('tagihan','Cicil hutang','"'+d.name+'" sebesar '+formatRp(amt));
    saveState(); renderTagActions(); toast(t('debt_paid'));
  }, state.accounts, null, '', false, 'Bayar Dari Akun');
}

function handleDebtDel(id) {
  openTagConfirm(t('will_delete_debt'), t('yes'), () => {
    const state = getState(); state.debts=state.debts.filter(x=>x.id!==id);
    addLog('tagihan','Hapus hutang','');
    saveState(); renderTagActions(); toast(t('debt_deleted'));
  });
}

/* ===== RECEIVABLE HANDLERS ===== */
function handleRecvFull(id) {
  const state = getState(); const r=state.receivables.find(x=>x.id===id); if(!r) return;
  const rem=r.amount-r.paidAmount;
  openTagConfirm(r.name+' '+t('will_recv_full')+' '+formatRp(rem)+'?', t('received_btn'), () => {
    const sel=document.getElementById('tagConfirmSource'); const accId=sel?sel.value:r.sourceAccountId;
    const acc=state.accounts.find(a=>a.id===accId); if(acc) acc.balance+=rem;
    r.paidAmount=r.amount;
    addLog('tagihan','Terima piutang full','"'+r.name+'" sebesar '+formatRp(rem));
    saveState(); renderTagActions(); toast(t('recv_received'));
  }, state.accounts, r.sourceAccountId);
}

function handleRecvCicil(id) {
  const state = getState(); const r=state.receivables.find(x=>x.id===id); if(!r) return;
  openTagPay(t('cicil_pay'), () => {
    const amt=parseRpInput($('#tagPayAmount')); if(amt<=0){toast(t('invalid_amount'));return}
    const rem=r.amount-r.paidAmount; if(amt>rem){toast(t('invalid_amount'));return}
    const sel=document.getElementById('tagPaySource'); const accId=sel?sel.value:r.sourceAccountId;
    const acc=state.accounts.find(a=>a.id===accId); if(acc) acc.balance+=amt;
    r.paidAmount+=amt;
    addLog('tagihan','Cicil terima piutang','"'+r.name+'" sebesar '+formatRp(amt));
    saveState(); renderTagActions(); toast(t('recv_received'));
  }, state.accounts, r.sourceAccountId, '', false, 'Masuk ke Akun');
}

function handleRecvDel(id) {
  openTagConfirm(t('will_delete_recv'), t('yes'), () => {
    const state = getState(); state.receivables=state.receivables.filter(x=>x.id!==id);
    addLog('tagihan','Hapus piutang','');
    saveState(); renderTagActions(); toast(t('recv_deleted'));
  });
}

/* ===== INIT ===== */
export function initBills() {
  // PENTING: Selalu reset filter ke SEMUA pas halaman dibuka
  tagType = null; 
  const debtBtn = $('#tagDebtBtn');
  const recvBtn = $('#tagRecvBtn');
  
  if(debtBtn) debtBtn.classList.remove('on-d');
  if(recvBtn) recvBtn.classList.remove('on-r');
  $('#tagForm').innerHTML = '';

  if(debtBtn && !debtBtn.dataset.bound) {
    debtBtn.dataset.bound='true';
    debtBtn.addEventListener('click', () => {
      if(tagType==='debt'){tagType=null; debtBtn.classList.remove('on-d'); $('#tagForm').innerHTML=''; renderTagList(); return}
      tagType='debt'; debtBtn.classList.add('on-d'); recvBtn.classList.remove('on-r');
      $('#tagList').innerHTML=''; renderTagForm();
    });
  }

  if(recvBtn && !recvBtn.dataset.bound) {
    recvBtn.dataset.bound='true';
    recvBtn.addEventListener('click', () => {
      if(tagType==='receivable'){tagType=null; recvBtn.classList.remove('on-r'); $('#tagForm').innerHTML=''; renderTagList(); return}
      tagType='receivable'; recvBtn.classList.add('on-r'); debtBtn.classList.remove('on-d');
      $('#tagList').innerHTML=''; renderTagForm();
    });
  }

  // Modal Confirm
  const confirmNo=$('#tagConfirmNo'); const confirmYes=$('#tagConfirmYes');
  if(confirmNo && !confirmNo.dataset.bound) { confirmNo.dataset.bound='true'; confirmNo.addEventListener('click',()=>$('#tagConfirmModal').classList.remove('active')); }
  if(confirmYes && !confirmYes.dataset.bound) { confirmYes.dataset.bound='true'; confirmYes.addEventListener('click',()=>{ $('#tagConfirmModal').classList.remove('active'); if(tagConfirmCb)tagConfirmCb(); tagConfirmCb=null; }); }

  // Modal Pay
  const payNo=$('#tagPayNo'); const payYes=$('#tagPayYes');
  if(payNo && !payNo.dataset.bound) { payNo.dataset.bound='true'; payNo.addEventListener('click',()=>$('#tagPayModal').classList.remove('active')); }
  if(payYes && !payYes.dataset.bound) { payYes.dataset.bound='true'; payYes.addEventListener('click',()=>{ $('#tagPayModal').classList.remove('active'); if(tagPayCb)tagPayCb(); tagPayCb=null; }); }

  // Modal Image View
  const imgClose=$('#tagImgClose');
  if(imgClose && !imgClose.dataset.bound) { imgClose.dataset.bound='true'; imgClose.addEventListener('click',()=>$('#tagImgModal').classList.remove('active')); }

  // Initial render
  renderTagList();
}
