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
    const s = localStorage.getItem('owi_fintrack_state');
    if (s) { const p = JSON.parse(s); Object.assign(state, p); }
  } catch(e) {}
}

export function saveState() {
  try { localStorage.setItem('owi_fintrack_state', JSON.stringify(state)); } catch(e) {}
}

export function getState() { return state; }
export function setState(newState) { state = {...state, ...newState}; saveState(); }

export function addLog(type, action, detail) {
  if(!state.logs) state.logs=[];
  state.logs.push({id:'log-'+Date.now(), type, action, detail:detail||'', timestamp:Date.now()});
  saveState();
}
