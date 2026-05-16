import { $, $$, formatRp, autoFitText, initAutoFit } from '../utils.js';
import { getState, saveState, addLog } from '../db.js';
import { t, getLang } from '../i18n.js';
import { openSB, showSBPage } from '../ui.js';

const accTypeIcons = {'Cash':'wallet','Bank':'landmark','E-Wallet':'smartphone','Crypto':'bitcoin','Asuransi':'shield'};

// Kategori untuk referensi saran (akan digunakan juga di halaman lain nanti)
const incomeSources = [
  {id:'gaji',label:{id:'Gaji',en:'Salary'}},
  {id:'freelance',label:{id:'Freelance',en:'Freelance'}},
  {id:'investasi',label:{id:'Investasi',en:'Investment'}},
  {id:'bonus',label:{id:'Bonus',en:'Bonus'}},
  {id:'transfer_masuk',label:{id:'Transfer Masuk',en:'Transfer In'}},
  {id:'lainnya_inc',label:{id:'Lainnya',en:'Others'}}
];
const expenseCats = [
  {id:'makanan',label:{id:'Makanan & Minuman',en:'Food & Drinks'}},
  {id:'transportasi',label:{id:'Transportasi',en:'Transportation'}},
  {id:'belanja',label:{id:'Belanja',en:'Shopping'}},
  {id:'tagihan',label:{id:'Tagihan & Utilitas',en:'Bills & Utilities'}},
  {id:'hiburan',label:{id:'Hiburan',en:'Entertainment'}},
  {id:'kesehatan',label:{id:'Kesehatan',en:'Healthcare'}},
  {id:'pendidikan',label:{id:'Pendidikan',en:'Education'}},
  {id:'transfer_keluar',label:{id:'Transfer Keluar',en:'Transfer Out'}},
  {id:'lainnya_exp',label:{id:'Lainnya',en:'Others'}}
];

/* ===== TOTAL SALDO ===== */
export function getTotalBalance() {
  const state = getState();
  return state.accounts.reduce((s,a) => s + (a.balance||0), 0);
}

/* ===== UPDATE SALDO ===== */
export function updateDashboardSaldo() {
  const el = $('#dashTotalSaldo');
  if(!el) return;
  el.textContent = formatRp(getTotalBalance());
  autoFitText(el);
}

/* ===== RENDER DOMPET ===== */
export function renderDashboardWallets() {
  const state = getState();
  const walletGrid = $('#walletGrid');
  if(!walletGrid) return;
  
  walletGrid.innerHTML = '';
  state.accounts.forEach(acc => {
    const icon = accTypeIcons[acc.type] || 'wallet';
    const card = document.createElement('div');
    card.className = 'w-card';
    card.innerHTML = `
      ${!acc.permanent ? '<div class="w-card-type">'+acc.type+'</div>' : ''}
      <div class="w-card-lbl"><i data-lucide="${icon}" style="width:13px;height:13px"></i>${acc.name}</div>
      <div class="w-card-val auto-fit">${formatRp(acc.balance)}</div>
    `;
    walletGrid.appendChild(card);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'w-add';
  addBtn.setAttribute('aria-label', t('add_account'));
  addBtn.innerHTML = `<i data-lucide="plus"></i><span>${t('add_wallet')}</span>`;
  addBtn.addEventListener('click', () => {
    openSB();
    setTimeout(() => { showSBPage('coa'); lucide.createIcons(); }, 400);
  });
  walletGrid.appendChild(addBtn);

  lucide.createIcons();
  requestAnimationFrame(initAutoFit);
}

/* ===== COMPARISON (HARI INI & BULAN INI) ===== */
export function updateDashboardComparison() {
  const state = getState();
  const now = new Date();
  const todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const monthStr = todayStr.slice(0,7);
  
  let todayInc=0, todayExp=0, monthInc=0, monthExp=0;
  
  state.transactions.forEach(tr => {
    if(tr.date === todayStr) {
      if(tr.type==='income') todayInc+=tr.amount; else todayExp+=tr.amount;
    }
    if(tr.date && tr.date.slice(0,7) === monthStr) {
      if(tr.type==='income') monthInc+=tr.amount; else monthExp+=tr.amount;
    }
  });

  const el = id => document.getElementById(id);
  
  // Hari Ini
  el('dashTodayInc').textContent = formatRp(todayInc);
  el('dashTodayExp').textContent = formatRp(todayExp);
  const todayNet = todayInc - todayExp;
  const todayNetEl = el('dashTodayNet');
  todayNetEl.textContent = (todayNet>=0?'+':'')+formatRp(Math.abs(todayNet));
  todayNetEl.className = 'cmp-net '+(todayNet>0?'pos':todayNet<0?'neg':'zero');
  
  el('dashTodayIncBar').dataset.w = todayInc>0?'100%':'0%';
  el('dashTodayExpBar').dataset.w = todayInc>0?Math.min(100,Math.round(todayExp/todayInc*100))+'%':'0%';
  el('dashTodayIncBar').style.width = el('dashTodayIncBar').dataset.w;
  el('dashTodayExpBar').style.width = el('dashTodayExpBar').dataset.w;

  // Bulan Ini
  el('dashMonthInc').textContent = formatRp(monthInc);
  el('dashMonthExp').textContent = formatRp(monthExp);
  const monthNet = monthInc - monthExp;
  const monthNetEl = el('dashMonthNet');
  monthNetEl.textContent = (monthNet>=0?'+':'')+formatRp(Math.abs(monthNet));
  monthNetEl.className = 'cmp-net '+(monthNet>0?'pos':monthNet<0?'neg':'zero');
  
  el('dashMonthIncBar').dataset.w = monthInc>0?'100%':'0%';
  el('dashMonthExpBar').dataset.w = monthInc>0?Math.min(100,Math.round(monthExp/monthInc*100))+'%':'0%';
  el('dashMonthIncBar').style.width = el('dashMonthIncBar').dataset.w;
  el('dashMonthExpBar').style.width = el('dashMonthExpBar').dataset.w;
}

/* ===== BADGES (UTANG & PIUTANG) ===== */
export function updateDashBadges() {
  const state = getState();
  const el = $('#dashBadges');
  if(!el) return;
  
  const activeDebts = state.debts.filter(d => (d.totalDebt - d.paidAmount) > 0);
  const activeRecvs = state.receivables.filter(r => (r.amount - r.paidAmount) > 0);
  
  let nearDue = activeDebts.filter(d => {
    if(!d.dueDate) return false;
    const due = new Date(d.dueDate+'T00:00:00'); 
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((due-today)/(864e5)); 
    return diff >= 0 && diff <= 1;
  });
  
  const totalRecvRemaining = activeRecvs.reduce((s,r) => s + (r.amount - r.paidAmount), 0);

  el.innerHTML = `
    <div class="badge badge-utang">
      <div class="badge-icon"><i data-lucide="alert-circle"></i></div>
      <div class="badge-title">${t('debt_bill')}</div>
      <div class="badge-count">${activeDebts.length} <span style="font-size:.75rem;font-weight:500">${t('bills')}</span></div>
      ${nearDue.length ? `<div class="badge-warn"><span class="badge-warn-dot"></span>${t('due_tomorrow')}</div><div class="badge-sub">${t('within_7_days')}</div>` : '<div class="badge-sub">'+t('within_7_days')+'</div>'}
    </div>
    <div class="badge badge-piutang">
      <div class="badge-icon"><i data-lucide="hand-coins"></i></div>
      <div class="badge-title">${t('receivable')}</div>
      <div class="badge-count auto-fit">${formatRp(totalRecvRemaining)}</div>
      <div class="badge-sub">${activeRecvs.length>0 ? activeRecvs.length+' '+t('recv_count_label') : t('no_recv_label')}</div>
    </div>`;
    
  lucide.createIcons();
  requestAnimationFrame(initAutoFit);
}

/* ===== HELPER: DATA BULANAN ===== */
function getMonthData() {
  const state = getState();
  const now = new Date();
  const monthStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  let inc=0, exp=0;
  state.transactions.forEach(tr => {
    if(tr.date && tr.date.slice(0,7) === monthStr) {
      if(tr.type==='income') inc+=tr.amount; else exp+=tr.amount;
    }
  });
  return {inc, exp};
}

/* ===== HELPER: KALKULASI SKOR KEUANGAN ===== */
function calcHealthScore() {
  const state = getState();
  const {inc, exp} = getMonthData();
  if(inc===0 && exp===0) return {score:0, savingsRatio:0, debtRatio:0, emergencyMonths:0, level:'none'};

  const totalBalance = getTotalBalance();
  const activeDebts = state.debts.filter(d => (d.totalDebt - d.paidAmount) > 0);
  const totalDebtRemaining = activeDebts.reduce((s,d) => s + (d.totalDebt - d.paidAmount), 0);

  const savingsRatio = inc>0 ? ((inc-exp)/inc)*100 : 0;
  const debtRatio = totalBalance>0 ? (totalDebtRemaining/totalBalance)*100 : 0;
  const emergencyMonths = exp>0 ? (totalBalance/exp) : 0;

  let score = 50; 
  if(savingsRatio>=30) score+=25; else if(savingsRatio>=20) score+=20; else if(savingsRatio>=10) score+=12; else if(savingsRatio>=0) score+=5; else score-=10;
  if(debtRatio<=0) score+=15; else if(debtRatio<=20) score+=10; else if(debtRatio<=50) score+=3; else if(debtRatio<=100) score-=5; else score-=15;
  if(emergencyMonths>=6) score+=10; else if(emergencyMonths>=3) score+=7; else if(emergencyMonths>=1) score+=3; else score-=5;

  score = Math.max(0, Math.min(100, Math.round(score)));
  let level='poor';
  if(score>=80) level='excellent'; else if(score>=60) level='good'; else if(score>=40) level='fair';

  return {score, savingsRatio:Math.round(savingsRatio), debtRatio:Math.round(debtRatio), emergencyMonths:Math.round(emergencyMonths*10)/10, level};
}

/* ===== FINANCIAL HEALTH GAUGE ===== */
export function updateFinancialHealth() {
  const data = calcHealthScore();
  const gaugeNum = $('#gaugeNum');
  const healthStatus = $('#healthStatus');
  const healthDesc = $('#healthDesc');
  const healthMetrics = $('#healthMetrics');
  const gaugeEl = $('#gaugeFill');

  if(!gaugeEl) return;

  if(data.level==='none'){
    gaugeNum.textContent='--'; gaugeNum.style.color='var(--muted)';
    healthStatus.textContent='--'; healthStatus.style.color='var(--muted)';
    healthDesc.textContent=t('health_no_data');
    healthMetrics.innerHTML='';
    gaugeEl.style.strokeDashoffset='157';
    return;
  }

  const offset = 157*(1-data.score/100);
  gaugeEl.style.strokeDashoffset = offset;

  const colorMap = {excellent:'var(--health-excellent)',good:'var(--health-good)',fair:'var(--health-fair)',poor:'var(--health-poor)'};
  const color = colorMap[data.level]||'var(--accent)';
  gaugeEl.setAttribute('stroke', color);
  gaugeNum.textContent = data.score; gaugeNum.style.color = color;

  const labelMap = {excellent:t('excellent'),good:t('good'),fair:t('fair'),poor:t('poor')};
  healthStatus.textContent = labelMap[data.level]; healthStatus.style.color = color;

  const descMap = {excellent:'health_excellent_desc',good:'health_good_desc',fair:'health_fair_desc',poor:'health_poor_desc'};
  healthDesc.textContent = t(descMap[data.level]);

  const savingsColor = data.savingsRatio>=20?'var(--green)':data.savingsRatio>=0?'var(--amber)':'var(--red)';
  const debtColor = data.debtRatio<=20?'var(--green)':data.debtRatio<=50?'var(--amber)':'var(--red)';
  const efColor = data.emergencyMonths>=3?'var(--green)':data.emergencyMonths>=1?'var(--amber)':'var(--red)';

  healthMetrics.innerHTML = `
    <div class="hm"><div class="hm-val" style="color:${savingsColor}">${Math.max(0,data.savingsRatio)}%</div><div class="hm-lbl">${t('savings_ratio')}</div></div>
    <div class="hm"><div class="hm-val" style="color:${debtColor}">${data.debtRatio}%</div><div class="hm-lbl">${t('debt_ratio')}</div></div>
    <div class="hm"><div class="hm-val" style="color:${efColor}">${data.emergencyMonths}x</div><div class="hm-lbl">${t('emergency_fund')}</div></div>`;
}

/* ===== SARAN DINAMIS ===== */
export function renderDynamicSaran() {
  const list = $('#saranList');
  if(!list) return;
  const saran = [];
  const data = calcHealthScore();
  const {inc, exp} = getMonthData();
  const state = getState();
  const activeDebts = state.debts.filter(d => (d.totalDebt - d.paidAmount) > 0);
  const activeRecvs = state.receivables.filter(r => (r.amount - r.paidAmount) > 0);

  let nearDueDebt = null;
  activeDebts.forEach(d => {
    if(!d.dueDate) return;
    const due = new Date(d.dueDate+'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((due-today)/(864e5));
    if(diff>=0 && diff<=3 && !nearDueDebt) nearDueDebt = d;
  });
  
  if(nearDueDebt) saran.push({title:t('saran_pay_debt_title'), desc:t('saran_pay_debt_desc')+' "'+nearDueDebt.name+'."'});
  if(activeRecvs.length>0){
    const totalRecv = activeRecvs.reduce((s,r) => s + (r.amount - r.paidAmount), 0);
    saran.push({title:t('saran_collect_recv_title'), desc:t('saran_collect_recv_desc')+' '+formatRp(totalRecv)+'.'});
  }
  if(data.level!=='none' && data.savingsRatio<20) saran.push({title:t('saran_increase_savings_title'), desc:t('saran_increase_savings_desc')+' ('+Math.max(0,data.savingsRatio)+'%).'});
  
  if(exp>0){
    const catTotals = {};
    const m = new Date().getMonth();
    state.transactions.forEach(tr => {
      if(tr.type==='expense'){
        const trMonth = tr.date ? new Date(tr.date+'T00:00:00').getMonth() : new Date(tr.timestamp).getMonth();
        if(trMonth===m) catTotals[tr.categoryId] = (catTotals[tr.categoryId]||0) + tr.amount;
      }
    });
    const sorted = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
    if(sorted.length>0){
      const topCat = sorted[0];
      const topPct = Math.round(topCat[1]/exp*100);
      if(topPct>=25){
        const allCats = [...incomeSources, ...expenseCats];
        const catObj = allCats.find(c => c.id===topCat[0]);
        const catName = catObj ? (catObj.label[getLang()]||catObj.label.id) : topCat[0];
        saran.push({title:t('saran_reduce_expense_title'), desc:`${catName} ${topPct}% ${getLang()==='id'?'dari total pengeluaran':'of total expenses'} — ${formatRp(topCat[1])}.`});
      }
    }
  }
  
  if(activeDebts.length>0 && !nearDueDebt){
    const hasOverdue = activeDebts.some(d => {
      if(!d.dueDate) return false;
      const due = new Date(d.dueDate+'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
      return Math.ceil((due-today)/(864e5)) < 0;
    });
    if(!hasOverdue) saran.push({title:t('saran_no_overdue_title'), desc:t('saran_no_overdue_desc')});
  }
  
  if(data.level!=='none' && data.emergencyMonths<3 && exp>0) saran.push({title:t('saran_emergency_title'), desc:`${t('saran_emergency_desc')} (${formatRp(exp*3)}).`});
  if(data.level!=='none' && inc>exp && inc>0) saran.push({title:t('saran_positive_flow_title'), desc:t('saran_positive_flow_desc')+' '+formatRp(inc-exp)+'.'});
  if(data.level==='none') saran.push({title:t('saran_start_recording_title'), desc:t('saran_start_recording_desc')});

  if(!saran.length){
    list.innerHTML = '<li class="saran-empty">'+t('health_no_data')+'</li>';
    return;
  }

  list.innerHTML = '';
  saran.slice(0,4).forEach((s,i) => {
    const li = document.createElement('li'); li.className = 'saran-item';
    li.innerHTML = `<div class="saran-num">${i+1}</div><div class="saran-text"><div class="saran-main">${s.title}</div><div class="saran-detail">${s.desc}</div></div>`;
    list.appendChild(li);
  });
}

/* ===== ANIMASI DASHBOARD ===== */
export function animateDashboard() {
  const dashCards = $$('#pg-dashboard .dc');
  dashCards.forEach(c => c.classList.remove('vis'));
  dashCards.forEach(c => { const d = parseInt(c.dataset.delay)||0; setTimeout(()=>c.classList.add('vis'), 50+d); });
  setTimeout(() => {
    $$('.bar-f').forEach(b => {
      b.style.width='0'; 
      requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width=b.dataset.w; }));
    });
  }, 200);
}

/* ===== INIT DASHBOARD ===== */
export function initDashboard() {
  const state = getState();
  $('#dashUserName').textContent = state.userName;
  
  updateDashboardSaldo();
  renderDashboardWallets();
  updateDashboardComparison();
  updateDashBadges();
  updateFinancialHealth();
  renderDynamicSaran();
  animateDashboard();
}
