import { $, $$, formatRp } from '../utils.js';
import { getState } from '../db.js';
import { t, getLang } from '../i18n.js';

let histFilter = 'all';

/* ===== RENDER RIWAYAT ===== */
export function renderHistory() {
  const state = getState();
  const container = $('#historyContainer');
  if(!container) return;

  let items = [];

  // Gabung Transaksi
  state.transactions.forEach(tr => {
    items.push({
      id: tr.id,
      type: tr.type === 'income' ? 'inc' : 'exp',
      cat: 'trx',
      title: tr.categoryName,
      sub: tr.accountName + (tr.note ? ' · ' + tr.note : ''),
      amount: tr.amount,
      sign: tr.type === 'income' ? '+' : '-',
      timestamp: tr.timestamp
    });
  });

  // Gabung Mutasi
  state.mutations.forEach(m => {
    items.push({
      id: m.id,
      type: 'mut',
      cat: 'mut',
      title: m.fromName + ' → ' + m.toName,
      sub: '',
      amount: m.amount,
      sign: '-',
      timestamp: m.timestamp
    });
  });

  // Gabung Log
  (state.logs || []).forEach(l => {
    items.push({
      id: l.id,
      type: 'log',
      cat: 'log',
      title: l.action,
      sub: l.detail || '',
      amount: 0,
      sign: '',
      timestamp: l.timestamp
    });
  });

  // Sort berdasarkan timestamp terbaru
  items.sort((a, b) => b.timestamp - a.timestamp);

  // Filter berdasarkan tab
  if(histFilter === 'trx') items = items.filter(i => i.cat === 'trx');
  else if(histFilter === 'mut') items = items.filter(i => i.cat === 'mut');
  else if(histFilter === 'log') items = items.filter(i => i.cat === 'log');

  // Hitung Summary
  const filteredTrx = items.filter(i => i.cat === 'trx');
  const sumInc = filteredTrx.filter(i => i.type === 'inc').reduce((s, i) => s + i.amount, 0);
  const sumExp = filteredTrx.filter(i => i.type === 'exp').reduce((s, i) => s + i.amount, 0);
  const sumMut = items.filter(i => i.cat === 'mut').reduce((s, i) => s + i.amount, 0);

  // Build Tabs HTML
  const tabs = [
    {key:'all', label:t('hist_all')},
    {key:'trx', label:t('hist_trx')},
    {key:'mut', label:t('hist_mut')},
    {key:'log', label:t('hist_log')}
  ];

  let html = '<div class="hist-tabs">';
  tabs.forEach(tab => {
    html += `<button class="hist-tab${histFilter === tab.key ? ' active' : ''}" data-hf="${tab.key}">${tab.label}</button>`;
  });
  html += '</div>';

  // Build Summary HTML
  html += `
    <div class="hist-summary">
      <div class="hist-sum-card"><div class="hist-sum-val inc">${formatRp(sumInc)}</div><div class="hist-sum-lbl">${t('hist_income')}</div></div>
      <div class="hist-sum-card"><div class="hist-sum-val exp">${formatRp(sumExp)}</div><div class="hist-sum-lbl">${t('hist_expense')}</div></div>
      <div class="hist-sum-card"><div class="hist-sum-val mut">${formatRp(sumMut)}</div><div class="hist-sum-lbl">${t('hist_transfer')}</div></div>
    </div>
    <div class="hist-count">${items.length} ${t('hist_total_items')}</div>
  `;

  // Jika Kosong
  if(!items.length) {
    html += `
      <div class="ph">
        <div class="ph-icon"><i data-lucide="history"></i></div>
        <div class="ph-t">${t('history_empty')}</div>
        <div class="ph-s">${t('history_empty_sub')}</div>
      </div>`;
    container.innerHTML = html;
    lucide.createIcons();
    bindTabEvents(container);
    return;
  }

  // Group by Date
  const groups = {};
  items.forEach(item => {
    const d = new Date(item.timestamp);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const dayN = getLang()==='id'?['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthN = getLang()==='id'?['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']:['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  const now = new Date();
  const todayK = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const yest = new Date(now); yest.setDate(yest.getDate()-1);
  const yestK = yest.getFullYear()+'-'+String(yest.getMonth()+1).padStart(2,'0')+'-'+String(yest.getDate()).padStart(2,'0');

  const typeLabels = {
    inc: getLang()==='id'?'Pemasukan':'Income', 
    exp: getLang()==='id'?'Pengeluaran':'Expense', 
    mut: getLang()==='id'?'Mutasi':'Transfer', 
    log: 'Log'
  };
  const typeIcons = {inc:'trending-up', exp:'trending-down', mut:'arrow-left-right', log:'clipboard-list'};

  // Render Groups
  Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(dateKey => {
    const d = new Date(dateKey+'T12:00:00');
    let label;
    if(dateKey === todayK) label = t('hist_today');
    else if(dateKey === yestK) label = t('hist_yesterday');
    else label = dayN[d.getDay()] + ', ' + d.getDate() + ' ' + monthN[d.getMonth()] + ' ' + d.getFullYear();

    html += '<div class="hist-date-group">';
    html += `<div class="hist-date-label">${label}</div>`;
    
    groups[dateKey].forEach(item => {
      const tIcon = typeIcons[item.type] || 'circle';
      const tLabel = typeLabels[item.type] || item.type;
      html += `
        <div class="hist-item h-${item.type}">
          <div class="hist-item-top">
            <span class="hist-item-type t-${item.type}"><i data-lucide="${tIcon}" style="width:10px;height:10px"></i>${tLabel}</span>
            ${item.amount ? `<span class="hist-item-amount ${item.type}">${item.sign}${formatRp(item.amount)}</span>` : ''}
          </div>
          <div class="hist-item-title">${item.title}</div>
          ${item.sub ? `<div class="hist-item-sub"><i data-lucide="info" style="width:12px;height:12px"></i>${item.sub}</div>` : ''}
        </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
  lucide.createIcons();
  bindTabEvents(container);
}

/* ===== BIND TAB EVENTS ===== */
function bindTabEvents(container) {
  container.querySelectorAll('.hist-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      histFilter = tab.dataset.hf;
      renderHistory();
    });
  });
}

/* ===== INIT ===== */
export function initHistory() {
  histFilter = 'all'; // Reset filter setiap pindah halaman
  renderHistory();
}
