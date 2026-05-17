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

// FLAG KEAMANAN: Cek apakah data berhasil dimuat
let isStateInitialized = false;

export function loadState() {
  try {
    // 1. Cek & pindahin kalau masih pakai key lama
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
        isStateInitialized = true; // TANDAI KALO DATA BERHASIL DIMUAT
      }
    } else {
      isStateInitialized = true; // Pertama kali pakai, wajar kosong
      console.log("💡 DB: Belum ada data tersimpan. Menggunakan data default.");
    }
  } catch(e) {
    console.error("🚨 DB GAGAL MEMUAT DATA! LocalStorage mungkin korup atau penuh. Aplikasi akan jalan tapi MENCEGAH penyimpanan agar data lama tidak tertimpa.", e);
    // JANGAN set isStateInitialized = true. Biarkan false agar saveState() ditolak!
  }
}

export function saveState() {
  // KEAMANAN UTAMA: Jangan pernah simpan data kalau loadState sebelumnya gagal!
  if (!isStateInitialized) {
    console.warn("⚠️ DB: PENYIMPANAN DITOLAK! Data sebelumnya gagal dimuat. Kita tidak ingin menimpa data Anda dengan data kosong.");
    return;
  }

  try {
    const jsonString = JSON.stringify(state);
    localStorage.setItem('owi_fintrack_state', jsonString);
    // Console log ini bisa lu hapus kalau udah stabil, buat sementara biarkan biar keliatan
    // console.log("💾 DB: Data berhasil disimpan. Ukuran:", jsonString.length, "karakter");
  } catch(e) {
    console.error("🚨 DB: GAGAL MENYIMPAN (Memori Penuh)!. Menghapus foto bukti otomatis...", e);
    
    // PLAN B: Hapus semua foto biar ukuran data mengecil
    state.receivables.forEach(r => r.receiptImage = null);
    state.userPhoto = null;

    try {
      const jsonString = JSON.stringify(state);
      localStorage.setItem('owi_fintrack_state', jsonString);
      console.log("✅ DB: Berhasil simpan setelah foto dihapus.");
      alert("⚠️ Memori penyimpanan penuh! Foto bukti & profil dihapus otomatis agar data saldo Anda tersimpan.");
    } catch(e2) {
      console.error("🚨 DB: GAGAL TOTAL MENYIMPAN meski tanpa foto. Data tidak tertulis.", e2);
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
