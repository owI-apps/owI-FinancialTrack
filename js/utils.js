export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

export function formatRp(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) {
    const v = abs / 1e12;
    return sign + 'Rp ' + (v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')) + ' T';
  }
  if (abs >= 1e10) {
    const v = abs / 1e9;
    return sign + 'Rp ' + (v % 1 === 0 ? v : v.toFixed(1).replace('.', ',')) + ' M';
  }
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}

export function fmtRpInput(el) {
  let raw = el.value.replace(/\D/g, '');
  if (raw === '') { el.value = ''; return; }
  el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseRpInput(el) {
  if (!el) return 0;
  return parseInt(el.value.replace(/\D/g, '')) || 0;
}

export function autoFitText(el) {
  if(!el) return;
  const style = getComputedStyle(el);
  const maxW = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (maxW <= 0) return;
  el.style.fontSize = '';
  const orig = parseFloat(style.fontSize);
  if (el.scrollWidth <= maxW) return;
  const min = orig * 0.6;
  let size = orig;
  while (size > min && el.scrollWidth > maxW) { size -= 0.5; el.style.fontSize = size + 'px'; }
}

export function initAutoFit() {
  $$('.auto-fit').forEach(el => {
    autoFitText(el);
    new ResizeObserver(() => autoFitText(el)).observe(el);
  });
}

export function setupRpInputs(container = document) {
  if (!container) return; // Critical fix biar gak crash kalau container null
  container.querySelectorAll('[data-fmt-rp]').forEach(el => {
    if (el.dataset.fmtBound) return; // Cegah duplicate listener
    el.dataset.fmtBound = 'true';
    el.addEventListener('input', () => fmtRpInput(el));
    el.addEventListener('focus', () => el.select());
    el.addEventListener('blur', () => { if (!el.value) el.value = ''; });
  });
}
