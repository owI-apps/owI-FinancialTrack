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

export function loadState() {
  try {
    // Cek kalau masih pakai key lama, pindahin ke key baru
    let oldState = localStorage.getItem('shadow_state');
    if(oldState) {
      localStorage.setItem('owi_fintrack_state', oldState);
      localStorage.removeItem('shadow_state');
    }

    const s = localStorage.getItem('owi_fintrack_state');
    if (s) {
      const p = JSON.parse(s);
      Object.assign(state, p);
      
      // Validasi penting biar gak crash kalau ada data yang korup
      if(!state.accounts || !state.accounts.length) state.accounts = [{ id:'dompet-utama', name:'Dompet Utama', type:'Cash', balance:0, permanent:true }];
      if(!state.mutations) state.mutations = [];
      if(!state.transactions) state.transactions = [];
      if(!state.debts) state.debts = [];
      if(!state.receivables) state.receivables = [];
      if(!state.logs) state.logs = [];
    }
  } catch(e) {
    console.error("Gagal memuat data dari LocalStorage:", e);
  }
}

export function saveState() {
  try {
    localStorage.setItem('owi_fintrack_state', JSON.stringify(state));
  } catch(e) {
    console.error("🚨 GAGAL MENYIMPAN: LocalStorage penuh! (Kemungkinan karena foto bukti tagihan terlalu besar). Hapus beberapa tagihan atau foto bukti.", e);
    // Bisa ditambahin logika auto-delete foto bukti kalau perlu
  }
}

export function getState() { return state; }
export function setState(newState) { state = {...state, ...newState}; saveState(); }

export function addLog(type, action, detail) {
  if(!state.logs) state.logs=[];
  // Batasi log maksimal 50 entries biar localStorage gampang penuh
  if(state.logs.length > 50) state.logs.shift(); 
  state.logs.push({id:'log-'+Date.now(), type, action, detail:detail||'', timestamp:Date.now()});
  saveState();
}
