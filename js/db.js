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
    // 1. Cek & pindahin kalau masih pakai key lama (shadow_state)
    let oldState = localStorage.getItem('shadow_state');
    if(oldState) {
      localStorage.setItem('owi_fintrack_state', oldState);
      localStorage.removeItem('shadow_state');
    }

    const s = localStorage.getItem('owi_fintrack_state');
    if (s) {
      const p = JSON.parse(s);
      // Pastikan data yang kebaca itu object, biar gak crash
      if (p && typeof p === 'object') {
        Object.assign(state, p);
      }
      
      // 2. Validasi array penting biar gak crash kalau ada data yang korup saat parse
      if(!state.accounts || !state.accounts.length) state.accounts = [{ id:'dompet-utama', name:'Dompet Utama', type:'Cash', balance:0, permanent:true }];
      if(!state.mutations) state.mutations = [];
      if(!state.transactions) state.transactions = [];
      if(!state.debts) state.debts = [];
      if(!state.receivables) state.receivables = [];
      if(!state.logs) state.logs = [];
    }
  } catch(e) {
    console.error("🚨 Gagal memuat data dari LocalStorage. Data mungkin korup atau penuh.", e);
  }
}

export function saveState() {
  try {
    // Coba simpan dulu
    localStorage.setItem('owi_fintrack_state', JSON.stringify(state));
  } catch(e) {
    console.error("🚨 GAGAL MENYIMPAN: LocalStorage penuh! Menghapus bukti foto demi menyimpan data transaksi...", e);
    
    // PLAN B: Kalau penuh, backup data di memory, hapus semua foto, coba simpan lagi
    const backupReceivables = JSON.parse(JSON.stringify(state.receivables)); 
    const backupPhoto = state.userPhoto;
    
    // Hapus semua foto biar ukuran file jadi kecil
    state.receivables.forEach(r => r.receiptImage = null);
    state.userPhoto = null;

    try {
      // Coba simpan lagi tanpa foto
      localStorage.setItem('owi_fintrack_state', JSON.stringify(state));
      alert("⚠️ Memori penyimpanan penuh! Beberapa foto bukti tagihan & foto profil terhapus otomatis agar data saldo & transaksi Anda tidak hilang.");
    } catch(e2) {
      console.error("🚨 GAGAL TOTAL: Tidak bisa menyimpan meski tanpa foto.", e2);
      // Kembalikan state di memory ke semula biar gak kepotong di session ini
      state.receivables = backupReceivables;
      state.userPhoto = backupPhoto;
      alert("❌ Penyimpanan penuh parah! Data tidak bisa disimpan. Harap reset aplikasi di menu Setting.");
    }
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
