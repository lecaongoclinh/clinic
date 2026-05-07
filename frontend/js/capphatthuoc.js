'use strict';

// ─── API Endpoints ────────────────────────────────────────────────────────────
const API_DISPENSE   = 'http://localhost:3000/api/dispense';
const API_BOOTSTRAP  = `${API_DISPENSE}/bootstrap`;
const API_PENDING    = `${API_DISPENSE}/prescriptions/pending`;

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
    allPrescriptions: [],   // raw list from server
    currentPrescription: null,  // { header, items, listInfo }
    medicineStatus: {},     // { [MaThuoc]: 'in' | 'out' | null }
    warehouseId: null,
    modal: null,
    submitting: false
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDate(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN');
}

function formatDateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleString('vi-VN');
}

function formatMoney(v) {
    return `${Number(v || 0).toLocaleString('vi-VN')} đ`;
}

/** Minutely elapsed since NgayKeDon — used to flag "urgent" (>60 min) */
function minutesAgo(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function showToast(msg, type = '') {
    const wrap = el('toastWrap');
    const div = document.createElement('div');
    div.className = `toast-msg ${type}`;
    div.textContent = msg;
    wrap.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Lỗi API');
    return data;
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadData() {
    try {
        const boot = await fetchJson(API_BOOTSTRAP);
        // pick first warehouse
        const warehouses = boot.warehouses || [];
        state.warehouseId = warehouses[0]?.MaKho || null;

        state.allPrescriptions = Array.isArray(boot.pendingPrescriptions)
            ? boot.pendingPrescriptions
            : [];

        populateFilters();
        renderCards();
    } catch (err) {
        console.error(err);
        el('rxGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-exclamation-triangle"></i>
            <h6>Không tải được dữ liệu</h6>
            <p>${escapeHtml(err.message)}</p>
        </div>`;
    }
}

async function refreshData() {
    try {
        const data = await fetchJson(API_PENDING);
        state.allPrescriptions = Array.isArray(data) ? data : [];
        populateFilters();
        renderCards();
        showToast('Đã cập nhật danh sách', 'success');
    } catch (err) {
        showToast('Không thể làm mới: ' + err.message, 'error');
    }
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function uniqueBy(list, key) {
    const seen = new Set();
    return list.filter(item => {
        const v = String(item[key] ?? '');
        if (!v || seen.has(v)) return false;
        seen.add(v);
        return true;
    });
}

function populateFilters() {
    const specialties = uniqueBy(state.allPrescriptions, 'MaChuyenKhoa')
        .sort((a, b) => String(a.TenChuyenKhoa || '').localeCompare(String(b.TenChuyenKhoa || ''), 'vi'));

    const specialtyEl = el('filterSpecialty');
    const prevSp = specialtyEl.value;
    specialtyEl.innerHTML = '<option value="">Tất cả khoa</option>' +
        specialties.map(s => `<option value="${s.MaChuyenKhoa}">${escapeHtml(s.TenChuyenKhoa || 'Chưa cập nhật')}</option>`).join('');
    if (prevSp) specialtyEl.value = prevSp;

    populateDoctorFilter();
}

function populateDoctorFilter() {
    const spId = el('filterSpecialty').value;
    const source = spId
        ? state.allPrescriptions.filter(p => String(p.MaChuyenKhoa || '') === spId)
        : state.allPrescriptions;

    const doctors = uniqueBy(source, 'MaBacSi')
        .sort((a, b) => String(a.TenBacSi || '').localeCompare(String(b.TenBacSi || ''), 'vi'));

    const doctorEl = el('filterDoctor');
    const prevDr = doctorEl.value;
    doctorEl.innerHTML = '<option value="">Tất cả bác sĩ</option>' +
        doctors.map(d => `<option value="${d.MaBacSi}">${escapeHtml(d.TenBacSi || 'Chưa cập nhật')}</option>`).join('');
    if (doctors.some(d => String(d.MaBacSi) === prevDr)) doctorEl.value = prevDr;
}

function getFiltered() {
    const spId   = el('filterSpecialty').value;
    const drId   = el('filterDoctor').value;
    const kw     = el('filterPatient').value.trim().toLowerCase();
    const sort   = el('filterSort').value;

    return [...state.allPrescriptions]
        .filter(p => !spId || String(p.MaChuyenKhoa || '') === spId)
        .filter(p => !drId || String(p.MaBacSi || '') === drId)
        .filter(p => {
            if (!kw) return true;
            return `${p.MaBN || ''} ${p.HoTen || ''}`.toLowerCase().includes(kw);
        })
        .sort((a, b) => {
            const ta = new Date(a.NgayKeDon || 0).getTime();
            const tb = new Date(b.NgayKeDon || 0).getTime();
            return sort === 'oldest' ? ta - tb : tb - ta;
        });
}

// ─── Render prescription cards ────────────────────────────────────────────────
function renderCards() {
    const list = getFiltered();
    const grid = el('rxGrid');
    el('pendingCount').textContent = list.length;

    if (!list.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <i class="fas fa-check-circle" style="color:#22c55e;"></i>
                <h6>Không có đơn thuốc chờ cấp phát</h6>
                <p class="text-muted" style="font-size:13px;">Tất cả đơn thuốc đã được xuất hoặc chưa có đơn mới.</p>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(p => rxCardHtml(p)).join('');
}

function rxCardHtml(p) {
    const mins = minutesAgo(p.NgayKeDon);
    const isUrgent = mins > 60;
    const badgeClass = isUrgent ? 'rx-badge-pending rx-badge-urgent' : 'rx-badge-pending';
    const badgeText  = isUrgent ? `⏰ Chờ ${mins} phút` : 'Chưa xuất';

    const soLoai  = Number(p.SoLoaiThuoc  || 0);
    const tongSL  = Number(p.TongSoLuong  || 0);
    const tongTien = Number(p.TongTien    || 0);

    return `
    <div class="rx-card" id="rx-${p.MaDT}">
        <div class="rx-card-header">
            <div style="min-width:0;flex:1;">
                <div class="rx-card-id">Đơn #${escapeHtml(p.MaDT)}</div>
                <div class="rx-card-patient">${escapeHtml(p.HoTen || 'Chưa có tên bệnh nhân')}</div>
            </div>
            <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="rx-card-meta">
            <i class="fas fa-hospital-alt"></i> ${escapeHtml(p.TenChuyenKhoa || 'Chưa cập nhật khoa')}
        </div>
        <div class="rx-card-meta">
            <i class="fas fa-user-md"></i> ${escapeHtml(p.TenBacSi || 'Chưa cập nhật bác sĩ')}
        </div>
        <div class="rx-card-meta">
            <i class="fas fa-stethoscope"></i> ${escapeHtml(p.ChuanDoan || 'Chưa có chẩn đoán')}
        </div>
        <div class="rx-card-meta">
            <i class="far fa-clock"></i> Kê đơn: ${formatDateTime(p.NgayKeDon)}
        </div>
        <hr class="rx-divider">
        <div class="rx-stats">
            <div class="rx-stat">
                <span class="rx-stat-val">${soLoai}</span>
                <span class="rx-stat-lbl">Loại thuốc</span>
            </div>
            <div class="rx-stat">
                <span class="rx-stat-val">${tongSL}</span>
                <span class="rx-stat-lbl">Tổng SL</span>
            </div>
            <div class="rx-stat">
                <span class="rx-stat-val" style="font-size:12px;">${formatMoney(tongTien)}</span>
                <span class="rx-stat-lbl">Trị giá</span>
            </div>
        </div>
        <div class="rx-card-footer">
            <button class="btn-dispense" onclick="openDispenseModal(${p.MaDT})">
                <i class="fas fa-pills"></i> Xuất thuốc
            </button>
        </div>
    </div>`;
}

// ─── Modal: open & populate ───────────────────────────────────────────────────
async function openDispenseModal(maDT) {
    const listInfo = state.allPrescriptions.find(p => String(p.MaDT) === String(maDT)) || {};

    // show modal immediately, load data async
    el('dispenseModalLabel').textContent = 'Cấp phát thuốc';
    el('modalSubtitle').textContent = `Đơn #${maDT} — ${listInfo.HoTen || ''}`;
    el('modalInfoStrip').innerHTML = buildInfoStripSkeleton();
    el('medRows').innerHTML = '<div class="text-muted text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>Đang tải...</div>';
    el('confirmDispenseBtn').disabled = true;
    el('progressLabel').textContent = '— / — đã xác nhận';
    el('progressBar').style.width = '0%';
    el('footerHint').textContent = 'Xác nhận từng loại thuốc còn/hết hàng trước khi xuất';

    state.modal.show();
    state.medicineStatus = {};

    try {
        const data = await fetchJson(`${API_DISPENSE}/prescriptions/${maDT}?MaKho=${state.warehouseId || ''}`);
        state.currentPrescription = { ...data, listInfo };
        renderModalContent(data, listInfo);
    } catch (err) {
        el('medRows').innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    }
}

function buildInfoStripSkeleton() {
    return `<div class="info-item"><label>—</label><span>—</span></div>`.repeat(6);
}

function renderModalContent(data, listInfo) {
    const header = data.header || {};
    const items  = data.items  || [];

    // ── Info strip ──
    el('modalInfoStrip').innerHTML = `
        <div class="info-item"><label>Mã đơn</label><span>#${escapeHtml(header.MaDT || listInfo.MaDT)}</span></div>
        <div class="info-item"><label>Ngày kê đơn</label><span>${formatDateTime(header.NgayKeDon)}</span></div>
        <div class="info-item"><label>Bệnh nhân</label><span>${escapeHtml(header.HoTen || listInfo.HoTen || '—')}</span></div>
        <div class="info-item"><label>Khoa</label><span>${escapeHtml(listInfo.TenChuyenKhoa || '—')}</span></div>
        <div class="info-item"><label>Bác sĩ</label><span>${escapeHtml(listInfo.TenBacSi || '—')}</span></div>
        <div class="info-item"><label>Chẩn đoán</label><span>${escapeHtml(listInfo.ChuanDoan || header.ChuanDoan || '—')}</span></div>
    `;

    // ── Medicine rows ──
    if (!items.length) {
        el('medRows').innerHTML = '<div class="text-muted text-center py-3">Không có thuốc trong đơn</div>';
        updateProgress();
        return;
    }

    // init status as null (unset)
    items.forEach(item => { state.medicineStatus[item.MaThuoc] = null; });

    el('medRows').innerHTML = items.map(item => medRowHtml(item)).join('');
    updateProgress();
}

function medRowHtml(item) {
    const lots = (item.allocations || []).map(a =>
        `<span class="badge bg-light text-dark border me-1" style="font-size:11px;">Lô ${escapeHtml(a.SoLo || '?')} (${a.SoLuongXuat}, HSD ${formatDate(a.HanSuDung)})</span>`
    ).join('');

    return `
    <div class="med-row" id="med-row-${item.MaThuoc}" data-mathuoc="${item.MaThuoc}">
        <div class="med-row-info">
            <div class="med-row-name">${escapeHtml(item.TenThuoc || '—')}</div>
            <div class="med-row-hoat-chat">${escapeHtml(item.HoatChat || '')}</div>
            <div class="med-row-detail">
                <strong>${Number(item.SoLuong || 0)}</strong> ${escapeHtml(item.DonViCoBan || item.DonVi || '')}
                ${lots ? `<div style="margin-top:4px;">${lots}</div>` : ''}
            </div>
            ${item.LieuDung ? `<div class="med-row-dose"><i class="fas fa-info-circle me-1"></i>${escapeHtml(item.LieuDung)}</div>` : ''}
        </div>
        <div class="med-row-actions">
            <button class="btn-stock btn-stock-in"
                    id="btn-in-${item.MaThuoc}"
                    onclick="setMedStatus(${item.MaThuoc}, 'in')"
                    title="Còn hàng — bốc đủ">
                <i class="fas fa-check"></i> Còn hàng
            </button>
            <button class="btn-stock btn-stock-out"
                    id="btn-out-${item.MaThuoc}"
                    onclick="setMedStatus(${item.MaThuoc}, 'out')"
                    title="Hết hàng — không đủ thuốc">
                <i class="fas fa-times"></i> Hết hàng
            </button>
        </div>
    </div>`;
}

// ─── Stock status toggle ──────────────────────────────────────────────────────
function setMedStatus(maThuoc, status) {
    state.medicineStatus[maThuoc] = status;

    // update buttons
    const btnIn  = el(`btn-in-${maThuoc}`);
    const btnOut = el(`btn-out-${maThuoc}`);
    const row    = el(`med-row-${maThuoc}`);

    if (btnIn)  btnIn.classList.toggle('active',  status === 'in');
    if (btnOut) btnOut.classList.toggle('active', status === 'out');

    if (row) {
        row.classList.remove('is-in', 'is-out');
        if (status === 'in')  row.classList.add('is-in');
        if (status === 'out') row.classList.add('is-out');
    }

    updateProgress();
}

function updateProgress() {
    const statuses = Object.values(state.medicineStatus);
    const total    = statuses.length;
    const confirmed = statuses.filter(s => s !== null).length;
    const allDone   = confirmed === total && total > 0;

    el('progressLabel').textContent = `${confirmed} / ${total} đã xác nhận`;
    el('progressBar').style.width   = total > 0 ? `${Math.round(confirmed / total * 100)}%` : '0%';

    const confirmBtn = el('confirmDispenseBtn');
    confirmBtn.disabled = !allDone || state.submitting;

    if (allDone) {
        const outCount = statuses.filter(s => s === 'out').length;
        if (outCount > 0) {
            el('footerHint').innerHTML = `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle me-1"></i>${outCount} loại thuốc hết hàng — sẽ ghi nhận thiếu trong phiếu</span>`;
        } else {
            el('footerHint').innerHTML = `<span style="color:#16a34a;"><i class="fas fa-check-circle me-1"></i>Đủ thuốc — sẵn sàng xuất</span>`;
        }
    } else {
        el('footerHint').textContent = 'Xác nhận từng loại thuốc còn/hết hàng trước khi xuất';
    }
}

// ─── Confirm dispense ─────────────────────────────────────────────────────────
async function confirmDispense() {
    if (state.submitting) return;
    const detail = state.currentPrescription;
    if (!detail?.header?.MaDT) { showToast('Thiếu thông tin đơn thuốc', 'error'); return; }

    const maNhanVien = localStorage.getItem('userId');
    if (!maNhanVien) { showToast('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.', 'error'); return; }

    // build items: only include "in-stock" medicines
    const allItems  = detail.items || [];
    const inItems   = allItems.filter(item => state.medicineStatus[item.MaThuoc] === 'in');
    const outItems  = allItems.filter(item => state.medicineStatus[item.MaThuoc] === 'out');

    if (!inItems.length && !outItems.length) {
        showToast('Chưa có thuốc nào được xác nhận', 'error');
        return;
    }

    // confirm if partial out
    if (outItems.length > 0) {
        const names = outItems.map(i => i.TenThuoc).join(', ');
        const ok = confirm(`Có ${outItems.length} loại thuốc hết hàng (${names}).\nChỉ xuất các thuốc còn hàng? Bấm OK để tiếp tục.`);
        if (!ok) return;
    }

    state.submitting = true;
    const btn = el('confirmDispenseBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xử lý...';

    try {
        // Step 1: create draft
        const draft = await fetchJson(API_DISPENSE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MaNhanVien: maNhanVien,
                MaKho:  state.warehouseId,
                LoaiXuat: 'BanChoBN',
                MaBN:   detail.header.MaBN  || null,
                MaDT:   detail.header.MaDT,
                NgayXuat: new Date().toISOString().slice(0, 19).replace('T', ' '),
                GhiChu: `Cấp phát theo đơn #${detail.header.MaDT}` +
                    (outItems.length ? ` | Hết hàng: ${outItems.map(i => i.TenThuoc).join(', ')}` : ''),
                items: inItems   // only in-stock items
            })
        });

        // Step 2: complete
        await fetchJson(`${API_DISPENSE}/${draft.MaPX}/complete`, { method: 'POST' });

        showToast(`✓ Đã cấp phát đơn #${detail.header.MaDT} thành công`, 'success');
        state.modal.hide();

        // remove card from list
        state.allPrescriptions = state.allPrescriptions.filter(p => String(p.MaDT) !== String(detail.header.MaDT));
        renderCards();
        populateFilters();
    } catch (err) {
        console.error(err);
        showToast('Lỗi: ' + (err.message || 'Không thể xác nhận cấp phát'), 'error');
    } finally {
        state.submitting = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check me-1"></i>Xác nhận xuất thuốc';
    }
}

// ─── Event bindings ───────────────────────────────────────────────────────────
function bindEvents() {
    el('refreshBtn').addEventListener('click', refreshData);
    el('resetFilterBtn').addEventListener('click', () => {
        el('filterSpecialty').value = '';
        el('filterDoctor').value    = '';
        el('filterPatient').value   = '';
        el('filterSort').value      = 'newest';
        populateDoctorFilter();
        renderCards();
    });

    el('filterSpecialty').addEventListener('change', () => {
        populateDoctorFilter();
        renderCards();
    });
    el('filterDoctor').addEventListener('change',  renderCards);
    el('filterSort').addEventListener('change',    renderCards);

    let debounce;
    el('filterPatient').addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(renderCards, 250);
    });

    el('confirmDispenseBtn').addEventListener('click', confirmDispense);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    state.modal = new bootstrap.Modal(el('dispenseModal'));
    bindEvents();
    loadData();
}

document.addEventListener('DOMContentLoaded', init);

// expose for inline onclick
Object.assign(window, { openDispenseModal, setMedStatus });
