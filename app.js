/* =================================================
   PENCATAT PENGELUARAN & ANGGARAN
   app.js — satu file, semua logika termasuk Chart.js
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
  '#34d399', '#fb7185', '#fbbf24', '#a78bfa',
  '#60a5fa', '#f472b6', '#4ade80', '#facc15',
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
    const index = Object.keys(WARNA_KATEGORI).length % WARNA_CADANGAN.length;
    WARNA_KATEGORI[kategori] = WARNA_CADANGAN[index];
  }
  return WARNA_KATEGORI[kategori];
}

function escapeHtml(teks) {
  return String(teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* -------------------------------------------------
   3. NOTIFIKASI TOAST
   ------------------------------------------------- */

function tampilkanToast(pesan, tipe) {
  tipe = tipe || 'sukses';
  const kontainer = document.getElementById('toastContainer');
  const ikon = { sukses: '✅', error: '❌', info: 'ℹ️', peringatan: '⚠️' };

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + tipe;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon">${ikon[tipe] || 'ℹ️'}</span>
    <span class="toast-msg">${escapeHtml(pesan)}</span>
    <button class="toast-close" aria-label="Tutup notifikasi">✕</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', function () {
    buangToast(toast);
  });

  kontainer.appendChild(toast);
  requestAnimationFrame(function () { toast.classList.add('toast-masuk'); });
  setTimeout(function () { buangToast(toast); }, 3500);
}

function buangToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove('toast-masuk');
  toast.classList.add('toast-keluar');
  toast.addEventListener('animationend', function () {
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
  const dataTransaksi = localStorage.getItem(STORAGE_KEY);
  const dataKategori  = localStorage.getItem(CATEGORIES_KEY);
  const dataLimit     = localStorage.getItem(LIMIT_KEY);

  transaksiList    = dataTransaksi ? JSON.parse(dataTransaksi) : [];
  kategoriList     = dataKategori  ? JSON.parse(dataKategori)  : ['Makanan', 'Transportasi', 'Hiburan'];
  batasPengeluaran = dataLimit     ? JSON.parse(dataLimit)     : 0;
}

/* -------------------------------------------------
   5. TEMA GELAP / TERANG
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
  const hasil = {};
  transaksiList.forEach(function (t) {
    if (!hasil[t.kategori]) hasil[t.kategori] = 0;
    hasil[t.kategori] += Number(t.jumlah);
  });
  return hasil;
}

function perbaruiChart() {
  const elCanvas = document.getElementById('spendingChart');
  const elEmpty  = document.getElementById('chartEmpty');
  if (!elCanvas || !elEmpty) return;

  const perKategori = hitungPerKategori();
  const labels      = Object.keys(perKategori);
  const data        = Object.values(perKategori);
  const warna       = labels.map(ambilWarna);
  const tema        = document.documentElement.getAttribute('data-theme');
  const warnaTeks   = tema === 'dark' ? '#e8e8f0' : '#1a1a2e';
  const warnaBorder = tema === 'dark' ? '#1a1a24' : '#ffffff';

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
    chartInstance.data.datasets[0].borderColor        = warnaBorder;
    chartInstance.options.plugins.legend.labels.color = warnaTeks;
    chartInstance.update();
    return;
  }

  const ctx = elCanvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data           : data,
        backgroundColor: warna,
        borderColor    : warnaBorder,
        borderWidth    : 3,
        hoverOffset    : 10,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: true,
      animation: { animateRotate: true, duration: 600 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color        : warnaTeks,
            font         : { size: 12, family: "'Segoe UI', system-ui, sans-serif" },
            padding      : 16,
            usePointStyle: true,
            pointStyle   : 'circle',
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const nilai  = context.parsed;
              const total  = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
              const persen = ((nilai / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatRupiah(nilai)} (${persen}%)`;
            },
          },
        },
      },
    },
  });
}

/* -------------------------------------------------
   7. RENDER KATEGORI (select asli)
   ------------------------------------------------- */

function renderKategori() {
  const el = document.getElementById('category');
  const pilihanSaatIni = el.value;
  el.innerHTML = '<option value="">-- Pilih Kategori --</option>';
  kategoriList.forEach(function (kat) {
    const opsi = document.createElement('option');
    opsi.value = kat; opsi.textContent = kat;
    el.appendChild(opsi);
  });
  el.value = pilihanSaatIni;
}

/* -------------------------------------------------
   8. HITUNG & RENDER SALDO
   ------------------------------------------------- */

function hitungTotal() {
  return transaksiList.reduce(function (total, t) { return total + Number(t.jumlah); }, 0);
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
   9. URUTKAN TRANSAKSI
   ------------------------------------------------- */

function urutkanTransaksi(list) {
  const urutan  = elSortBy.value;
  const salinan = [...list];
  switch (urutan) {
    case 'date-asc'   : return salinan.sort(function (a, b) { return a.waktu - b.waktu; });
    case 'date-desc'  : return salinan.sort(function (a, b) { return b.waktu - a.waktu; });
    case 'amount-asc' : return salinan.sort(function (a, b) { return a.jumlah - b.jumlah; });
    case 'amount-desc': return salinan.sort(function (a, b) { return b.jumlah - a.jumlah; });
    case 'category'   : return salinan.sort(function (a, b) { return a.kategori.localeCompare(b.kategori, 'id'); });
    default           : return salinan;
  }
}

/* -------------------------------------------------
   10. RENDER DAFTAR TRANSAKSI
   ------------------------------------------------- */

function badgeAttr(kategori) {
  const defaultKat = ['Makanan', 'Transportasi', 'Hiburan'];
  return defaultKat.includes(kategori)
    ? `data-kat="${escapeHtml(kategori)}"`
    : `data-kat-custom="${escapeHtml(kategori)}"`;
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

  const listTerurut = urutkanTransaksi(transaksiList);
  const totalSaldo  = hitungTotal();

  listTerurut.forEach(function (t) {
    const li = document.createElement('li');
    if (batasPengeluaran > 0 && totalSaldo > batasPengeluaran) {
      li.classList.add('over-limit');
    }
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHtml(t.nama)}</span>
        <span class="transaction-amount">${formatRupiah(t.jumlah)}</span>
        <span class="transaction-category" ${badgeAttr(t.kategori)}>${escapeHtml(t.kategori)}</span>
      </div>
      <button class="btn-delete" data-id="${t.id}" aria-label="Hapus transaksi ${escapeHtml(t.nama)}">
        Hapus
      </button>
    `;
    elTransactionList.appendChild(li);
  });
}

/* -------------------------------------------------
   11. RENDER SEMUA UI
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
  let valid = true;
  const nama     = elItemName.value.trim();
  const jumlah   = elAmount.value.trim();
  const kategori = elCategory.value;

  elItemNameError.textContent = '';
  elAmountError.textContent   = '';
  elCategoryError.textContent = '';

  if (!nama)                        { elItemNameError.textContent = 'Nama item tidak boleh kosong.'; valid = false; }
  if (!jumlah || Number(jumlah) <= 0) { elAmountError.textContent   = 'Jumlah harus lebih dari 0.';   valid = false; }
  if (!kategori)                    { elCategoryError.textContent = 'Pilih salah satu kategori.';    valid = false; }

  return valid;
}

function tambahTransaksi(event) {
  event.preventDefault();

  if (!validasiForm()) {
    tampilkanToast('Harap lengkapi semua field!', 'error');
    return;
  }

  const transaksi = {
    id      : buatId(),
    nama    : elItemName.value.trim(),
    jumlah  : Number(elAmount.value),
    kategori: elCategory.value,
    waktu   : Date.now(),
  };

  transaksiList.unshift(transaksi);
  simpanData();
  renderSemua();

  tampilkanToast(`"${transaksi.nama}" — ${formatRupiah(transaksi.jumlah)} berhasil ditambahkan!`, 'sukses');

  const total = hitungTotal();
  if (batasPengeluaran > 0 && total > batasPengeluaran) {
    setTimeout(function () {
      tampilkanToast('Total pengeluaran melebihi batas yang ditentukan!', 'peringatan');
    }, 500);
  }

  elTransactionForm.reset();
  elItemNameError.textContent = '';
  elAmountError.textContent   = '';
  elCategoryError.textContent = '';

  const categoryDisplay = document.getElementById('categoryDisplay');
  if (categoryDisplay) categoryDisplay.textContent = '-- Pilih Kategori --';
  const categoryOptions = document.getElementById('categoryOptions');
  if (categoryOptions) {
    categoryOptions.querySelectorAll('.custom-option').forEach(function (el) {
      el.classList.remove('active');
    });
  }

  elItemName.focus();
}

/* -------------------------------------------------
   13. HAPUS TRANSAKSI
   ------------------------------------------------- */

function hapusTransaksi(event) {
  const tombol = event.target.closest('.btn-delete');
  if (!tombol) return;

  const id        = tombol.dataset.id;
  const ditemukan = transaksiList.find(function (t) { return t.id === id; });

  transaksiList = transaksiList.filter(function (t) { return t.id !== id; });
  simpanData();
  renderSemua();

  if (ditemukan) {
    tampilkanToast(`"${ditemukan.nama}" berhasil dihapus.`, 'info');
  }
}

/* -------------------------------------------------
   14. TAMBAH KATEGORI KUSTOM
   ------------------------------------------------- */

function tambahKategoriKustom() {
  const nama = elNewCategory.value.trim();

  if (!nama) {
    elNewCategory.focus();
    tampilkanToast('Nama kategori tidak boleh kosong.', 'error');
    return;
  }

  const sudahAda = kategoriList.some(function (k) {
    return k.toLowerCase() === nama.toLowerCase();
  });

  if (sudahAda) {
    tampilkanToast(`Kategori "${nama}" sudah ada.`, 'peringatan');
    return;
  }

  kategoriList.push(nama);
  simpanData();
  renderKategori();
  renderKategoriCustom();
  tampilkanToast(`Kategori "${nama}" berhasil ditambahkan!`, 'sukses');

  elNewCategory.value = '';
  elNewCategory.focus();
}

/* -------------------------------------------------
   15. BATAS PENGELUARAN
   ------------------------------------------------- */

function simpanBatas() {
  const nilai = Number(elSpendingLimit.value);
  if (nilai < 0) {
    tampilkanToast('Batas pengeluaran tidak boleh negatif.', 'error');
    return;
  }
  batasPengeluaran = nilai;
  simpanData();
  renderSaldo();
  renderTransaksi();

  tampilkanToast(
    nilai === 0
      ? 'Batas pengeluaran dinonaktifkan.'
      : `Batas pengeluaran diatur ke ${formatRupiah(nilai)}.`,
    nilai === 0 ? 'info' : 'sukses'
  );
}

function muatNilaiBatas() {
  if (batasPengeluaran > 0) elSpendingLimit.value = batasPengeluaran;
}

/* -------------------------------------------------
   16. INISIALISASI ELEMEN DOM
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
elNewCategory.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); tambahKategoriKustom(); }
});
elSetLimitBtn.addEventListener('click', simpanBatas);
elSortBy.addEventListener('change', renderTransaksi);

/* -------------------------------------------------
   18. CUSTOM DROPDOWN
   ------------------------------------------------- */

function buatCustomDropdown(wrapperId, triggerId, displayId, optionsId, selectId, onChange) {
  const trigger  = document.getElementById(triggerId);
  const display  = document.getElementById(displayId);
  const optsList = document.getElementById(optionsId);
  const selectEl = document.getElementById(selectId);

  if (!trigger || !optsList || !selectEl) return;

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = optsList.classList.contains('open');
    tutupSemuaDropdown();
    if (!isOpen) {
      optsList.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  optsList.addEventListener('click', function (e) {
    const opsi = e.target.closest('.custom-option');
    if (!opsi) return;

    const nilai = opsi.dataset.value;
    const teks  = opsi.textContent.trim();

    if (display) display.textContent = teks;
    optsList.querySelectorAll('.custom-option').forEach(function (el) { el.classList.remove('active'); });
    opsi.classList.add('active');
    selectEl.value = nilai;
    tutupSemuaDropdown();
    if (onChange) onChange(nilai);
  });

  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
    if (e.key === 'Escape') tutupSemuaDropdown();
  });
}

function tutupSemuaDropdown() {
  document.querySelectorAll('.custom-select-options.open').forEach(function (el) { el.classList.remove('open'); });
  document.querySelectorAll('.custom-select-trigger[aria-expanded="true"]').forEach(function (el) { el.setAttribute('aria-expanded', 'false'); });
}

document.addEventListener('click', tutupSemuaDropdown);

/* -------------------------------------------------
   19. RENDER KATEGORI KE CUSTOM DROPDOWN
   ------------------------------------------------- */

function renderKategoriCustom() {
  const optsList = document.getElementById('categoryOptions');
  const selectEl = document.getElementById('category');
  if (!optsList) return;

  const pilihanSaatIni = selectEl.value;
  const placeholder    = optsList.querySelector('.placeholder-option');
  optsList.innerHTML   = '';
  if (placeholder) optsList.appendChild(placeholder);

  const ikonDefault = { 'Makanan': '🍜', 'Transportasi': '🚗', 'Hiburan': '🎮' };

  kategoriList.forEach(function (kat) {
    if (optsList.querySelector(`[data-value="${CSS.escape(kat)}"]`)) return;

    const li         = document.createElement('li');
    li.className     = 'custom-option';
    li.dataset.value = kat;
    li.setAttribute('role', 'option');

    if (['Makanan', 'Transportasi', 'Hiburan'].includes(kat)) {
      li.dataset.kat = kat;
    } else {
      li.dataset.katCustom = kat;
    }

    li.textContent = `${ikonDefault[kat] || '🏷️'} ${kat}`;
    optsList.appendChild(li);

    if (!selectEl.querySelector(`option[value="${kat}"]`)) {
      const opsi = document.createElement('option');
      opsi.value = kat; opsi.textContent = kat;
      selectEl.appendChild(opsi);
    }
  });

  selectEl.value = pilihanSaatIni;
}

/* -------------------------------------------------
   20. JALANKAN APLIKASI
   ------------------------------------------------- */

(function init() {
  muatData();
  muatTema();
  renderKategori();
  renderKategoriCustom();

  buatCustomDropdown('categoryWrapper', 'categoryTrigger', 'categoryDisplay', 'categoryOptions', 'category', null);
  buatCustomDropdown('sortWrapper', 'sortTrigger', 'sortDisplay', 'sortOptions', 'sortBy', function () { renderTransaksi(); });

  muatNilaiBatas();
  renderSemua();
})();
