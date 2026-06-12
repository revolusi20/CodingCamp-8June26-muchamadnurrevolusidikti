/* =================================================
   PENCATAT PENGELUARAN & ANGGARAN — app.js
   ================================================= */
'use strict';

/* -------------------------------------------------
   1. KONSTANTA & STATE
   ------------------------------------------------- */
const STORAGE_KEY    = 'transaksi_data';
const CATEGORIES_KEY = 'kategori_kustom';
const LIMIT_KEY      = 'batas_pengeluaran';
const THEME_KEY      = 'tema_aplikasi';

const WARNA_KATEGORI = {
  'Makanan'     : '#7c6af7',
  'Transportasi': '#38bdf8',
  'Hiburan'     : '#f97316',
};

const WARNA_CADANGAN = [
  '#34d399','#fb7185','#fbbf24','#a78bfa',
  '#60a5fa','#f472b6','#4ade80','#facc15',
];

let transaksiList    = [];
let kategoriList     = [];
let batasPengeluaran = 0;
let chartInstance    = null;

/* -------------------------------------------------
   2. UTILITAS
   ------------------------------------------------- */
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

function buatId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function ambilWarna(kategori) {
  if (!WARNA_KATEGORI[kategori]) {
    const idx = Object.keys(WARNA_KATEGORI).length % WARNA_CADANGAN.length;
    WARNA_KATEGORI[kategori] = WARNA_CADANGAN[idx];
  }
  return WARNA_KATEGORI[kategori];
}

function escapeHtml(t) {
  return String(t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* -------------------------------------------------
   3. TOAST
   ------------------------------------------------- */
function tampilkanToast(pesan, tipe) {
  tipe = tipe || 'sukses';
  const ikon = { sukses:'✅', error:'❌', info:'ℹ️', peringatan:'⚠️' };
  const kontainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + tipe;
  toast.setAttribute('role','status');
  toast.innerHTML = `
    <span class="toast-icon">${ikon[tipe]||'ℹ️'}</span>
    <span class="toast-msg">${escapeHtml(pesan)}</span>
    <button class="toast-close" aria-label="Tutup">✕</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', function(){ buangToast(toast); });
  kontainer.appendChild(toast);
  requestAnimationFrame(function(){ toast.classList.add('toast-masuk'); });
  setTimeout(function(){ buangToast(toast); }, 3500);
}

function buangToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove('toast-masuk');
  toast.classList.add('toast-keluar');
  toast.addEventListener('animationend', function(){
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, { once: true });
}

/* -------------------------------------------------
   4. LOCAL STORAGE
   ------------------------------------------------- */
function simpanData() {
  localStorage.setItem(STORAGE_KEY,    JSON.stringify(transaksiList));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(kategoriList));
  localStorage.setItem(LIMIT_KEY,      JSON.stringify(batasPengeluaran));
}

function muatData() {
  const dt = localStorage.getItem(STORAGE_KEY);
  const dk = localStorage.getItem(CATEGORIES_KEY);
  const dl = localStorage.getItem(LIMIT_KEY);
  transaksiList    = dt ? JSON.parse(dt) : [];
  kategoriList     = dk ? JSON.parse(dk) : ['Makanan','Transportasi','Hiburan'];
  batasPengeluaran = dl ? JSON.parse(dl) : 0;
}

/* -------------------------------------------------
   5. TEMA
   ------------------------------------------------- */
function muatTema() {
  const tema = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', tema);
  elThemeToggle.textContent = tema === 'dark' ? '☀️' : '🌙';
}

function toggleTema() {
  const temaSaat = document.documentElement.getAttribute('data-theme');
  const temaBaru = temaSaat === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', temaBaru);
  elThemeToggle.textContent = temaBaru === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, temaBaru);
  perbaruiChart();
}

/* -------------------------------------------------
   6. PIE CHART
   ------------------------------------------------- */
function hitungPerKategori() {
  const h = {};
  transaksiList.forEach(function(t){
    if (!h[t.kategori]) h[t.kategori] = 0;
    h[t.kategori] += Number(t.jumlah);
  });
  return h;
}

function perbaruiChart() {
  const elCanvas = document.getElementById('spendingChart');
  const elEmpty  = document.getElementById('chartEmpty');
  if (!elCanvas || !elEmpty) return;

  const per    = hitungPerKategori();
  const labels = Object.keys(per);
  const data   = Object.values(per);
  const warna  = labels.map(ambilWarna);
  const tema   = document.documentElement.getAttribute('data-theme');
  const teks   = tema === 'dark' ? '#e8e8f0' : '#1a1a2e';
  const border = tema === 'dark' ? '#1a1a24' : '#ffffff';

  if (labels.length === 0) {
    elCanvas.style.display = 'none';
    elEmpty.hidden = false;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  elCanvas.style.display = 'block';
  elEmpty.hidden = true;

  if (chartInstance) {
    chartInstance.data.labels                          = labels;
    chartInstance.data.datasets[0].data               = data;
    chartInstance.data.datasets[0].backgroundColor    = warna;
    chartInstance.data.datasets[0].borderColor        = border;
    chartInstance.options.plugins.legend.labels.color = teks;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(elCanvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{ data, backgroundColor: warna, borderColor: border, borderWidth: 3, hoverOffset: 10 }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { animateRotate: true, duration: 600 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: teks, font: { size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          callbacks: {
            label: function(ctx){
              const total = ctx.dataset.data.reduce(function(a,b){ return a+b; }, 0);
              return ` ${ctx.label}: ${formatRupiah(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`;
            },
          },
        },
      },
    },
  });
}

/* -------------------------------------------------
   7. KATEGORI
   ------------------------------------------------- */
function renderKategori() {
  const el = document.getElementById('category');
  const val = el.value;
  el.innerHTML = '<option value="">-- Pilih Kategori --</option>';
  kategoriList.forEach(function(k){
    const o = document.createElement('option');
    o.value = k; o.textContent = k;
    el.appendChild(o);
  });
  el.value = val;
}

/* -------------------------------------------------
   8. SALDO
   ------------------------------------------------- */
function hitungTotal() {
  return transaksiList.reduce(function(t, x){ return t + Number(x.jumlah); }, 0);
}

function renderSaldo() {
  const total = hitungTotal();
  elTotalBalance.textContent = formatRupiah(total);
  if (batasPengeluaran > 0 && total > batasPengeluaran) {
    elLimitWarning.hidden = false;
    elTotalBalance.style.color = 'var(--warning)';
  } else {
    elLimitWarning.hidden = true;
    elTotalBalance.style.color = '';
  }
}

/* -------------------------------------------------
   9. URUTKAN
   ------------------------------------------------- */
function urutkanTransaksi(list) {
  const s = [...list];
  switch (elSortBy.value) {
    case 'date-asc'   : return s.sort(function(a,b){ return a.waktu  - b.waktu;  });
    case 'date-desc'  : return s.sort(function(a,b){ return b.waktu  - a.waktu;  });
    case 'amount-asc' : return s.sort(function(a,b){ return a.jumlah - b.jumlah; });
    case 'amount-desc': return s.sort(function(a,b){ return b.jumlah - a.jumlah; });
    case 'category'   : return s.sort(function(a,b){ return a.kategori.localeCompare(b.kategori,'id'); });
    default           : return s;
  }
}

/* -------------------------------------------------
   10. RENDER TRANSAKSI
   ------------------------------------------------- */
function badgeAttr(k) {
  return ['Makanan','Transportasi','Hiburan'].includes(k)
    ? `data-kat="${escapeHtml(k)}"`
    : `data-kat-custom="${escapeHtml(k)}"`;
}

function renderTransaksi() {
  elTransactionList.innerHTML = '';
  if (transaksiList.length === 0) {
    const li = document.createElement('li');
    li.id = 'emptyState';
    li.textContent = 'Belum ada transaksi. Tambahkan di atas!';
    elTransactionList.appendChild(li);
    return;
  }
  const total = hitungTotal();
  urutkanTransaksi(transaksiList).forEach(function(t){
    const li = document.createElement('li');
    if (batasPengeluaran > 0 && total > batasPengeluaran) li.classList.add('over-limit');
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHtml(t.nama)}</span>
        <span class="transaction-amount">${formatRupiah(t.jumlah)}</span>
        <span class="transaction-category" ${badgeAttr(t.kategori)}>${escapeHtml(t.kategori)}</span>
      </div>
      <button class="btn-delete" data-id="${t.id}" aria-label="Hapus ${escapeHtml(t.nama)}">Hapus</button>
    `;
    elTransactionList.appendChild(li);
  });
}

/* -------------------------------------------------
   11. RENDER SEMUA
   ------------------------------------------------- */
function renderSemua() {
  renderSaldo();
  renderTransaksi();
  perbaruiChart();
}

/* -------------------------------------------------
   12. TAMBAH TRANSAKSI
   ------------------------------------------------- */
function validasiForm() {
  let ok = true;
  elItemNameError.textContent = '';
  elAmountError.textContent   = '';
  elCategoryError.textContent = '';
  if (!elItemName.value.trim())                    { elItemNameError.textContent = 'Nama item tidak boleh kosong.'; ok = false; }
  if (!elAmount.value || Number(elAmount.value)<=0) { elAmountError.textContent   = 'Jumlah harus lebih dari 0.';   ok = false; }
  if (!elCategory.value)                           { elCategoryError.textContent = 'Pilih salah satu kategori.';   ok = false; }
  return ok;
}

function tambahTransaksi(e) {
  e.preventDefault();
  if (!validasiForm()) { tampilkanToast('Harap lengkapi semua field!','error'); return; }

  const t = {
    id      : buatId(),
    nama    : elItemName.value.trim(),
    jumlah  : Number(elAmount.value),
    kategori: elCategory.value,
    waktu   : Date.now(),
  };

  transaksiList.unshift(t);
  simpanData();
  renderSemua();
  tampilkanToast(`"${t.nama}" — ${formatRupiah(t.jumlah)} berhasil ditambahkan!`, 'sukses');

  if (batasPengeluaran > 0 && hitungTotal() > batasPengeluaran) {
    setTimeout(function(){ tampilkanToast('Total pengeluaran melebihi batas!','peringatan'); }, 500);
  }

  elTransactionForm.reset();
  elItemNameError.textContent = '';
  elAmountError.textContent   = '';
  elCategoryError.textContent = '';

  const cd = document.getElementById('categoryDisplay');
  if (cd) cd.textContent = '-- Pilih Kategori --';
  const co = document.getElementById('categoryOptions');
  if (co) co.querySelectorAll('.custom-option').forEach(function(el){ el.classList.remove('active'); });

  elItemName.focus();
}

/* -------------------------------------------------
   13. HAPUS TRANSAKSI
   ------------------------------------------------- */
function hapusTransaksi(e) {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const found = transaksiList.find(function(t){ return t.id === btn.dataset.id; });
  transaksiList = transaksiList.filter(function(t){ return t.id !== btn.dataset.id; });
  simpanData();
  renderSemua();
  if (found) tampilkanToast(`"${found.nama}" berhasil dihapus.`,'info');
}

/* -------------------------------------------------
   14. KATEGORI KUSTOM
   ------------------------------------------------- */
function tambahKategoriKustom() {
  const nama = elNewCategory.value.trim();
  if (!nama) { elNewCategory.focus(); tampilkanToast('Nama kategori tidak boleh kosong.','error'); return; }
  if (kategoriList.some(function(k){ return k.toLowerCase()===nama.toLowerCase(); })) {
    tampilkanToast(`Kategori "${nama}" sudah ada.`,'peringatan'); return;
  }
  kategoriList.push(nama);
  simpanData();
  renderKategori();
  renderKategoriCustom();
  tampilkanToast(`Kategori "${nama}" berhasil ditambahkan!`,'sukses');
  elNewCategory.value = '';
  elNewCategory.focus();
}

/* -------------------------------------------------
   15. BATAS PENGELUARAN
   ------------------------------------------------- */
function simpanBatas() {
  const nilai = Number(elSpendingLimit.value);
  if (nilai < 0) { tampilkanToast('Batas tidak boleh negatif.','error'); return; }
  batasPengeluaran = nilai;
  simpanData();
  renderSaldo();
  renderTransaksi();
  tampilkanToast(
    nilai === 0 ? 'Batas pengeluaran dinonaktifkan.' : `Batas diatur ke ${formatRupiah(nilai)}.`,
    nilai === 0 ? 'info' : 'sukses'
  );
}

function muatNilaiBatas() {
  if (batasPengeluaran > 0) elSpendingLimit.value = batasPengeluaran;
}

/* -------------------------------------------------
   16. DOM ELEMENTS
   ------------------------------------------------- */
const elThemeToggle     = document.getElementById('themeToggle');
const elTotalBalance    = document.getElementById('totalBalance');
const elSpendingLimit   = document.getElementById('spendingLimit');
const elSetLimitBtn     = document.getElementById('setLimitBtn');
const elLimitWarning    = document.getElementById('limitWarning');
const elTransactionForm = document.getElementById('transactionForm');
const elItemName        = document.getElementById('itemName');
const elAmount          = document.getElementById('amount');
const elCategory        = document.getElementById('category');
const elItemNameError   = document.getElementById('itemNameError');
const elAmountError     = document.getElementById('amountError');
const elCategoryError   = document.getElementById('categoryError');
const elNewCategory     = document.getElementById('newCategory');
const elAddCategoryBtn  = document.getElementById('addCategoryBtn');
const elTransactionList = document.getElementById('transactionList');
const elSortBy          = document.getElementById('sortBy');

/* -------------------------------------------------
   17. EVENT LISTENERS
   ------------------------------------------------- */
elThemeToggle.addEventListener('click', toggleTema);
elTransactionForm.addEventListener('submit', tambahTransaksi);
elTransactionList.addEventListener('click', hapusTransaksi);
elAddCategoryBtn.addEventListener('click', tambahKategoriKustom);
elNewCategory.addEventListener('keydown', function(e){ if(e.key==='Enter'){e.preventDefault();tambahKategoriKustom();} });
elSetLimitBtn.addEventListener('click', simpanBatas);
elSortBy.addEventListener('change', renderTransaksi);

/* -------------------------------------------------
   18. CUSTOM DROPDOWN
   ------------------------------------------------- */
function buatCustomDropdown(triggerId, displayId, optionsId, selectId, onChange) {
  const trigger  = document.getElementById(triggerId);
  const display  = document.getElementById(displayId);
  const optsList = document.getElementById(optionsId);
  const selectEl = document.getElementById(selectId);
  if (!trigger || !optsList || !selectEl) return;

  trigger.addEventListener('click', function(e){
    e.stopPropagation();
    const isOpen = optsList.classList.contains('open');
    tutupSemuaDropdown();
    if (!isOpen) { optsList.classList.add('open'); trigger.setAttribute('aria-expanded','true'); }
  });

  optsList.addEventListener('click', function(e){
    const opsi = e.target.closest('.custom-option');
    if (!opsi) return;
    if (display) display.textContent = opsi.textContent.trim();
    optsList.querySelectorAll('.custom-option').forEach(function(el){ el.classList.remove('active'); });
    opsi.classList.add('active');
    selectEl.value = opsi.dataset.value;
    tutupSemuaDropdown();
    if (onChange) onChange(opsi.dataset.value);
  });

  trigger.addEventListener('keydown', function(e){
    if (e.key==='Enter'||e.key===' '){ e.preventDefault(); trigger.click(); }
    if (e.key==='Escape') tutupSemuaDropdown();
  });
}

function tutupSemuaDropdown() {
  document.querySelectorAll('.custom-select-options.open').forEach(function(el){ el.classList.remove('open'); });
  document.querySelectorAll('.custom-select-trigger[aria-expanded="true"]').forEach(function(el){ el.setAttribute('aria-expanded','false'); });
}

document.addEventListener('click', tutupSemuaDropdown);

/* -------------------------------------------------
   19. RENDER KATEGORI KE CUSTOM DROPDOWN
   ------------------------------------------------- */
function renderKategoriCustom() {
  const optsList = document.getElementById('categoryOptions');
  const selectEl = document.getElementById('category');
  if (!optsList) return;
  const val         = selectEl.value;
  const placeholder = optsList.querySelector('.placeholder-option');
  optsList.innerHTML = '';
  if (placeholder) optsList.appendChild(placeholder);

  const ikon = { 'Makanan':'🍜','Transportasi':'🚗','Hiburan':'🎮' };
  kategoriList.forEach(function(kat){
    if (optsList.querySelector(`[data-value="${CSS.escape(kat)}"]`)) return;
    const li = document.createElement('li');
    li.className     = 'custom-option';
    li.dataset.value = kat;
    li.setAttribute('role','option');
    if (['Makanan','Transportasi','Hiburan'].includes(kat)) li.dataset.kat = kat;
    else li.dataset.katCustom = kat;
    li.textContent = `${ikon[kat]||'🏷️'} ${kat}`;
    optsList.appendChild(li);
    if (!selectEl.querySelector(`option[value="${kat}"]`)) {
      const o = document.createElement('option');
      o.value = kat; o.textContent = kat;
      selectEl.appendChild(o);
    }
  });
  selectEl.value = val;
}

/* -------------------------------------------------
   20. INIT
   ------------------------------------------------- */
(function init() {
  muatData();
  muatTema();
  renderKategori();
  renderKategoriCustom();
  buatCustomDropdown('categoryTrigger','categoryDisplay','categoryOptions','category', null);
  buatCustomDropdown('sortTrigger','sortDisplay','sortOptions','sortBy', function(){ renderTransaksi(); });
  muatNilaiBatas();
  renderSemua();
})();
