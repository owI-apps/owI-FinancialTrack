let state = {
  userName: 'User', userEmail: '', userPhone: '', userPhoto: null,
  theme: 'light', lang: 'id',
  accounts: [{ id:'dompet-utama', name:'Dompet Utama', type:'Cash', balance:0, permanent:true }],
  mutations: [],
  transactions: [],
  debts: [],
  receivables: [],
  logs: []
};

let isStateInitialized = false;

export function loadState() {
  try {
    // Pindahin data dari key lama ke key baru kalau ada
    const oldState = localStorage.getItem('shadow_state');
    if(oldState) {
      localStorage.setItem('owi_fintrack_state', oldState);
      localStorage.removeItem('shadow_state');
    }

    const s = localStorage.getItem('owi_fintrack_state');
    if (s) {
      const p = JSON.parse(s);
      if (p && typeof p === 'object') {
        Object.assign(state, p);
        isStateInitialized = true;
      }
    } else {
      isStateInitialized = true; // Pertama kali pakai
    }
    
    // Validasi array penting biar gak crash
    if(!state.accounts || !state.accounts.length) state.accounts = [{ id:'dompet-utama', name:'Dompet Utama', type:'Cash', balance:0, permanent:true }];
    if(!state.mutations) state.mutations = [];
    if(!state.transactions) state.transactions = [];
    if(!state.debts) state.debts = [];
    if(!state.receivables) state.receivables = [];
    if(!state.logs) state.logs = [];

  } catch(e) {
    console.error("DB Error: Gagal memuat data. Penyimpanan mungkin korup atau penuh.", e);
    // Jangan set flag true, agar saveState() ditolak dan data lama tidak tertimpa
  }
}

export function saveState() {
  if (!isStateInitialized) return; // Abaikan kalau data awal gagal dimuat

  try {
    localStorage.setItem('owi_fintrack_state', JSON.stringify(state));
  } catch(e) {
    console.error("DB Error: Penyimpanan penuh! Menghapus foto bukti otomatis...", e);
    
    // Plan B: Hapus foto biar ukuran mengecil
    state.receivables.forEach(r => r.receiptImage = null);
    state.userPhoto = null;

    try {
      localStorage.setItem('owi_fintrack_state', JSON.stringify(state));
      alert("⚠️ Memori penuh! Foto bukti & profil dihapus otomatis agar data saldo Anda tersimpan.");
    } catch(e2) {
      console.error("DB Error: Gagal total menyimpan data.", e2);
      alert("❌ Penyimpanan penuh parah! Data gagal disimpan.");
    }
  }
}

export function getState() { return state; }
export function setState(newState) { state = {...state, ...newState}; saveState(); }

export function addLog(type, action, detail) {
  if(!state.logs) state.logs=[];
  if(state.logs.length > 50) state.logs.shift(); // Batasi log biar gak penuh
  state.logs.push({id:'log-'+Date.now(), type, action, detail:detail||'', timestamp:Date.now()});
  saveState();
}
