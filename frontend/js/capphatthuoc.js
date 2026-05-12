'use strict';

const API_DISPENSE = 'http://localhost:3000/api/dispense';
const API_PENDING = `${API_DISPENSE}/prescriptions/pending`;
const API_DISPENSE_WAREHOUSE = `${API_DISPENSE}/dispense-warehouse`;

const state = {
    allPrescriptions: [],
    currentPrescription: null,
    warehouseId: null,
    dispenseWarehouse: null,
    modal: null,
    submitting: false
};

function el(id) { return document.getElementById(id); }

function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d) ? '-' : d.toLocaleDateString('vi-VN');
}

function formatDateTime(v) {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d) ? '-' : d.toLocaleString('vi-VN');
}

function formatMoney(v) {
    return `${Number(v || 0).toLocaleString('vi-VN')} đ`;
}

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

async function loadData() {
    try {
        const [pendingPrescriptions, warehouse] = await Promise.all([
            fetchJson(API_PENDING),
            fetchJson(API_DISPENSE_WAREHOUSE)
        ]);

        state.warehouseId = warehouse?.MaKho || null;
        state.dispenseWarehouse = warehouse || null;
        if (!state.warehouseId) throw new Error('Chưa cấu hình kho cấp phát');

        state.allPrescriptions = Array.isArray(pendingPrescriptions) ? pendingPrescriptions : [];
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
    const spId = el('filterSpecialty').value;
    const drId = el('filterDoctor').value;
    const kw = el('filterPatient').value.trim().toLowerCase();
    const sort = el('filterSort').value;

    return [...state.allPrescriptions]
        .filter(p => !spId || String(p.MaChuyenKhoa || '') === spId)
        .filter(p => !drId || String(p.MaBacSi || '') === drId)
        .filter(p => !kw || `${p.MaBN || ''} ${p.HoTen || ''}`.toLowerCase().includes(kw))
        .sort((a, b) => {
            const ta = new Date(a.NgayKeDon || 0).getTime();
            const tb = new Date(b.NgayKeDon || 0).getTime();
            return sort === 'oldest' ? ta - tb : tb - ta;
        });
}

function renderCards() {
    const list = getFiltered();
    const grid = el('rxGrid');
    el('pendingCount').textContent = list.length;

    if (!list.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <i class="fas fa-check-circle" style="color:#22c55e;"></i>
                <h6>Không có đơn thuốc chờ cấp phát</h6>
                <p class="text-muted" style="font-size:13px;">Tất cả đơn thuốc đã được xử lý hoặc chưa có đơn mới.</p>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(p => rxCardHtml(p)).join('');
}

function rxCardHtml(p) {
    const mins = minutesAgo(p.NgayKeDon);
    const isUrgent = mins > 60;
    const badgeClass = isUrgent ? 'rx-badge-pending rx-badge-urgent' : 'rx-badge-pending';
    const badgeText = isUrgent ? `Chờ ${mins} phút` : 'Chưa xuất';

    return `
    <div class="rx-card" id="rx-${p.MaDT}">
        <div class="rx-card-header">
            <div style="min-width:0;flex:1;">
                <div class="rx-card-id">Đơn #${escapeHtml(p.MaDT)}</div>
                <div class="rx-card-patient">${escapeHtml(p.HoTen || 'Chưa có tên bệnh nhân')}</div>
            </div>
            <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="rx-card-meta"><i class="fas fa-hospital-alt"></i> ${escapeHtml(p.TenChuyenKhoa || 'Chưa cập nhật khoa')}</div>
        <div class="rx-card-meta"><i class="fas fa-user-md"></i> ${escapeHtml(p.TenBacSi || 'Chưa cập nhật bác sĩ')}</div>
        <div class="rx-card-meta"><i class="fas fa-stethoscope"></i> ${escapeHtml(p.ChuanDoan || 'Chưa có chẩn đoán')}</div>
        <div class="rx-card-meta"><i class="far fa-clock"></i> Kê đơn: ${formatDateTime(p.NgayKeDon)}</div>
        <hr class="rx-divider">
        <div class="rx-stats">
            <div class="rx-stat"><span class="rx-stat-val">${Number(p.SoLoaiThuoc || 0)}</span><span class="rx-stat-lbl">Loại thuốc</span></div>
            <div class="rx-stat"><span class="rx-stat-val">${Number(p.TongSoLuong || 0)}</span><span class="rx-stat-lbl">Tổng SL</span></div>
            <div class="rx-stat"><span class="rx-stat-val" style="font-size:12px;">${formatMoney(p.TongTien)}</span><span class="rx-stat-lbl">Trị giá kê</span></div>
        </div>
        <div class="rx-card-footer">
            <button class="btn-dispense" onclick="openDispenseModal(${p.MaDT})">
                <i class="fas fa-pills"></i> Xuất thuốc
            </button>
        </div>
    </div>`;
}

async function openDispenseModal(maDT) {
    const listInfo = state.allPrescriptions.find(p => String(p.MaDT) === String(maDT)) || {};

    el('dispenseModalLabel').textContent = 'Cấp phát thuốc';
    el('modalSubtitle').textContent = `Đơn #${maDT} - ${listInfo.HoTen || ''}`;
    el('modalInfoStrip').innerHTML = buildInfoStripSkeleton();
    el('medRows').innerHTML = '<div class="text-muted text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>Đang tải...</div>';
    el('confirmDispenseBtn').disabled = true;
    el('progressLabel').textContent = '- / - có thể xuất';
    el('progressBar').style.width = '0%';
    el('footerHint').textContent = 'Hệ thống đang kiểm tra tồn Kho Quầy Thuốc';

    state.modal.show();

    try {
        const data = await fetchJson(`${API_DISPENSE}/prescriptions/${maDT}`);
        state.currentPrescription = { ...data, listInfo };
        state.warehouseId = data.header?.MaKho || state.warehouseId;
        renderModalContent(data, listInfo);
    } catch (err) {
        el('medRows').innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    }
}

function buildInfoStripSkeleton() {
    return `<div class="info-item"><label>-</label><span>-</span></div>`.repeat(6);
}

function renderModalContent(data, listInfo) {
    const header = data.header || {};
    const items = data.items || [];

    el('modalInfoStrip').innerHTML = `
        <div class="info-item"><label>Mã đơn</label><span>#${escapeHtml(header.MaDT || listInfo.MaDT)}</span></div>
        <div class="info-item"><label>Ngày kê đơn</label><span>${formatDateTime(header.NgayKeDon)}</span></div>
        <div class="info-item"><label>Bệnh nhân</label><span>${escapeHtml(header.HoTen || listInfo.HoTen || '-')}</span></div>
        <div class="info-item"><label>Kho cấp phát</label><span>${escapeHtml(header.TenKho || state.dispenseWarehouse?.TenKho || 'Kho Quầy Thuốc')}</span></div>
        <div class="info-item"><label>Bác sĩ</label><span>${escapeHtml(listInfo.TenBacSi || '-')}</span></div>
        <div class="info-item"><label>Chẩn đoán</label><span>${escapeHtml(listInfo.ChuanDoan || header.ChuanDoan || '-')}</span></div>
    `;

    if (!items.length) {
        el('medRows').innerHTML = '<div class="text-muted text-center py-3">Không có thuốc trong đơn</div>';
        updateProgress();
        return;
    }

    el('medRows').innerHTML = items.map(item => medRowHtml(item)).join('');
    updateProgress();
}

function medRowHtml(item) {
    const status = item.TrangThaiTon || 'HetHang';
    const statusMap = {
        DuHang: { label: 'Đủ hàng', className: 'bg-success' },
        ThieuHang: { label: 'Thiếu hàng', className: 'bg-warning text-dark' },
        HetHang: { label: 'Hết hàng', className: 'bg-danger' }
    };
    const statusInfo = statusMap[status] || statusMap.HetHang;
    const prescribed = Number(item.SoLuongKe ?? item.SoLuong ?? 0);
    const available = Number(item.TongTonQuay || 0);
    const exportable = Number(item.SoLuongCoTheXuat || 0);
    const shortage = Number(item.SoLuongThieu || 0);
    const rowClass = status === 'DuHang' ? 'is-in' : (status === 'HetHang' ? 'is-out' : '');
    const lots = (item.allocations || []).map(a =>
        `<span class="badge bg-light text-dark border me-1" style="font-size:11px;">Lô ${escapeHtml(a.SoLo || '?')} (${a.SoLuongXuat}, HSD ${formatDate(a.HanSuDung)})</span>`
    ).join('');
    const warnings = (item.warnings || [])
        .filter(w => w.code === 'near_expiry')
        .map(w => `<div class="text-warning small mt-1"><i class="fas fa-exclamation-triangle me-1"></i>${escapeHtml(w.message)}</div>`)
        .join('');

    return `
    <div class="med-row ${rowClass}" id="med-row-${item.MaThuoc}" data-mathuoc="${item.MaThuoc}">
        <div class="med-row-info">
            <div class="med-row-name">${escapeHtml(item.TenThuoc || '-')}</div>
            <div class="med-row-hoat-chat">${escapeHtml(item.HoatChat || '')}</div>
            <div class="med-row-detail">
                Kê đơn: <strong>${prescribed}</strong> ${escapeHtml(item.DonViCoBan || item.DonVi || '')}
                <span class="ms-2">Tồn quầy: <strong>${available}</strong></span>
                <span class="ms-2">Có thể xuất: <strong>${exportable}</strong></span>
                ${shortage ? `<span class="ms-2 text-danger">Thiếu: <strong>${shortage}</strong></span>` : ''}
                ${lots ? `<div style="margin-top:4px;">${lots}</div>` : ''}
                ${warnings}
            </div>
            ${item.LieuDung ? `<div class="med-row-dose"><i class="fas fa-info-circle me-1"></i>${escapeHtml(item.LieuDung)}</div>` : ''}
        </div>
        <div class="med-row-actions">
            <span class="badge ${statusInfo.className}" style="font-size:12px;">${statusInfo.label}</span>
        </div>
    </div>`;
}

function updateProgress() {
    const items = state.currentPrescription?.items || [];
    const total = items.length;
    const exportableCount = items.filter(item => Number(item.SoLuongCoTheXuat || 0) > 0).length;
    const shortageCount = items.filter(item => Number(item.SoLuongThieu || 0) > 0).length;

    el('progressLabel').textContent = `${exportableCount} / ${total} có thể xuất`;
    el('progressBar').style.width = total > 0 ? `${Math.round(exportableCount / total * 100)}%` : '0%';

    const confirmBtn = el('confirmDispenseBtn');
    confirmBtn.disabled = exportableCount === 0 || state.submitting;

    if (exportableCount === 0 && total > 0) {
        el('footerHint').innerHTML = `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle me-1"></i>Toàn bộ đơn hết hàng tại Kho Quầy Thuốc</span>`;
    } else if (shortageCount > 0) {
        el('footerHint').innerHTML = `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle me-1"></i>${shortageCount} thuốc thiếu hàng, hệ thống sẽ ghi chú phần thiếu</span>`;
    } else {
        el('footerHint').innerHTML = `<span style="color:#16a34a;"><i class="fas fa-check-circle me-1"></i>Đủ hàng tại Kho Quầy Thuốc, sẵn sàng xuất</span>`;
    }
}

async function confirmDispense() {
    if (state.submitting) return;
    const detail = state.currentPrescription;
    if (!detail?.header?.MaDT) { showToast('Thiếu thông tin đơn thuốc', 'error'); return; }

    const maNhanVien = localStorage.getItem('userId');
    if (!maNhanVien) { showToast('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.', 'error'); return; }

    const allItems = detail.items || [];
    const exportItems = allItems
        .filter(item => Number(item.SoLuongCoTheXuat || 0) > 0)
        .map(item => ({
            ...item,
            SoLuong: Number(item.SoLuongCoTheXuat || 0),
            GhiChu: Number(item.SoLuongThieu || 0) > 0 ? `Thiếu ${Number(item.SoLuongThieu || 0)} so với đơn` : ''
        }));
    const shortageItems = allItems
        .filter(item => Number(item.SoLuongThieu || 0) > 0)
        .map(item => ({
            MaThuoc: item.MaThuoc,
            TenThuoc: item.TenThuoc,
            SoLuongKe: Number(item.SoLuongKe || item.SoLuong || 0),
            SoLuongCoTheXuat: Number(item.SoLuongCoTheXuat || 0),
            SoLuongThieu: Number(item.SoLuongThieu || 0)
        }));

    if (!exportItems.length) {
        showToast('Toàn bộ đơn đều hết hàng tại Kho Quầy Thuốc', 'error');
        return;
    }

    if (shortageItems.length > 0) {
        const ok = confirm(`Có ${shortageItems.length} thuốc thiếu hàng. Chỉ xuất phần có sẵn và ghi chú phần thiếu?`);
        if (!ok) return;
    }

    state.submitting = true;
    const btn = el('confirmDispenseBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xử lý...';

    try {
        const shortageNote = shortageItems.length
            ? ` | Thiếu hàng: ${shortageItems.map(i => `${i.TenThuoc} thiếu ${i.SoLuongThieu}`).join('; ')}`
            : '';
        const draft = await fetchJson(API_DISPENSE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MaNhanVien: maNhanVien,
                MaKho: detail.header.MaKho,
                LoaiXuat: 'BanChoBN',
                MaBN: detail.header.MaBN || null,
                MaDT: detail.header.MaDT,
                NgayXuat: new Date().toISOString().slice(0, 19).replace('T', ' '),
                GhiChu: `Cấp phát theo đơn #${detail.header.MaDT}${shortageNote}`,
                isPartialDispense: shortageItems.length > 0,
                shortageItems,
                items: exportItems
            })
        });

        await fetchJson(`${API_DISPENSE}/${draft.MaPX}/complete`, { method: 'POST' });

        showToast(`Đã cấp phát đơn #${detail.header.MaDT} thành công`, 'success');
        state.modal.hide();

        if (!shortageItems.length) {
            state.allPrescriptions = state.allPrescriptions.filter(p => String(p.MaDT) !== String(detail.header.MaDT));
        }
        await refreshData();
    } catch (err) {
        console.error(err);
        showToast('Lỗi: ' + (err.message || 'Không thể xác nhận cấp phát'), 'error');
    } finally {
        state.submitting = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check me-1"></i>Xác nhận xuất thuốc';
        updateProgress();
    }
}

function bindEvents() {
    el('refreshBtn').addEventListener('click', refreshData);
    el('resetFilterBtn').addEventListener('click', () => {
        el('filterSpecialty').value = '';
        el('filterDoctor').value = '';
        el('filterPatient').value = '';
        el('filterSort').value = 'newest';
        populateDoctorFilter();
        renderCards();
    });

    el('filterSpecialty').addEventListener('change', () => {
        populateDoctorFilter();
        renderCards();
    });
    el('filterDoctor').addEventListener('change', renderCards);
    el('filterSort').addEventListener('change', renderCards);

    let debounce;
    el('filterPatient').addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(renderCards, 250);
    });

    el('confirmDispenseBtn').addEventListener('click', confirmDispense);
}

function init() {
    state.modal = new bootstrap.Modal(el('dispenseModal'));
    bindEvents();
    loadData();
}

document.addEventListener('DOMContentLoaded', init);

Object.assign(window, { openDispenseModal });
