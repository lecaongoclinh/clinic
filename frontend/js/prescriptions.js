const API_BASE = 'http://localhost:3000/api';

const state = {
    doctors: [],
    detailModal: null
};

const ROLE = {
    ADMIN: 1,
    DOCTOR: 2,
    PHARMACIST: 5
};

const $ = (id) => document.getElementById(id);

function currentRole() {
    return Number(localStorage.getItem('role'));
}

function canDispenseMedicine() {
    const role = currentRole();
    return role === ROLE.ADMIN || role === ROLE.PHARMACIST;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function statusText(status) {
    if (status === 'DaXuat') return 'Đã xuất';
    if (status === 'XuatMotPhan') return 'Xuất một phần';
    return 'Chưa xuất';
}

function statusClass(status) {
    if (status === 'DaXuat') return 'status-done';
    if (status === 'XuatMotPhan') return 'status-partial';
    return 'status-pending';
}

function stockText(status) {
    if (status === 'DuHang') return 'Đủ hàng';
    if (status === 'ThieuHang') return 'Thiếu hàng';
    return 'Hết hàng';
}

function stockClass(status) {
    if (status === 'DuHang') return 'status-done';
    if (status === 'ThieuHang') return 'status-partial';
    return 'status-out';
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function pickNumber(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return toNumber(row[key]);
        }
    }
    return 0;
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra');
    }
    return data;
}

async function loadSpecialties() {
    const data = await fetchJson(`${API_BASE}/specialty`);
    $('specialtyFilter').innerHTML = '<option value="">Tất cả khoa</option>' +
        (Array.isArray(data) ? data : []).map((item) =>
            `<option value="${item.MaChuyenKhoa}">${escapeHtml(item.TenChuyenKhoa)}</option>`
        ).join('');
}

async function loadDoctors() {
    const data = await fetchJson(`${API_BASE}/doctor`);
    state.doctors = Array.isArray(data) ? data : [];
    renderDoctorOptions();
}

function renderDoctorOptions() {
    const specialtyId = $('specialtyFilter').value;
    const doctors = specialtyId
        ? state.doctors.filter((doctor) => String(doctor.MaChuyenKhoa || '') === String(specialtyId))
        : state.doctors;

    $('doctorFilter').innerHTML = '<option value="">Tất cả bác sĩ</option>' +
        doctors.map((doctor) => `<option value="${doctor.MaNV}">${escapeHtml(doctor.HoTen)}</option>`).join('');
}

function buildQuery() {
    const params = new URLSearchParams();
    if ($('specialtyFilter').value) params.set('maChuyenKhoa', $('specialtyFilter').value);
    if ($('doctorFilter').value) params.set('maBacSi', $('doctorFilter').value);
    if ($('patientFilter').value.trim()) params.set('patient', $('patientFilter').value.trim());
    if ($('statusFilter').value) params.set('trangThai', $('statusFilter').value);
    return params.toString();
}

async function loadPrescriptions() {
    $('prescriptionsTableBody').innerHTML = '<tr><td colspan="8" class="empty-row">Đang tải dữ liệu...</td></tr>';
    try {
        const query = buildQuery();
        const data = await fetchJson(`${API_BASE}/prescriptions${query ? `?${query}` : ''}`);
        renderPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
        $('prescriptionsTableBody').innerHTML = `<tr><td colspan="8" class="empty-row text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

function renderPrescriptions(rows) {
    const showDispenseAction = canDispenseMedicine();
    $('prescriptionCount').textContent = `${rows.length} đơn thuốc`;
    if (!rows.length) {
        $('prescriptionsTableBody').innerHTML = '<tr><td colspan="8" class="empty-row">Không có đơn thuốc phù hợp</td></tr>';
        return;
    }

    $('prescriptionsTableBody').innerHTML = rows.map((item) => `
        <tr>
            <td>#${item.MaDT}</td>
            <td>${formatDateTime(item.NgayKeDon)}</td>
            <td>
                <div class="fw-semibold">${escapeHtml(item.TenBenhNhan || '')}</div>
                <small class="text-muted">${escapeHtml(item.MaBN || '')}${item.SoDienThoai ? ` - ${escapeHtml(item.SoDienThoai)}` : ''}</small>
            </td>
            <td>${escapeHtml(item.TenChuyenKhoa || '')}</td>
            <td>${escapeHtml(item.TenBacSi || '')}</td>
            <td class="text-center">${Number(item.SoLoaiThuoc || 0)}</td>
            <td class="text-center"><span class="status-badge ${statusClass(item.TrangThai)}">${statusText(item.TrangThai)}</span></td>
            <td class="text-end">
                <div class="prescription-actions">
                <button class="btn btn-outline-primary btn-sm prescription-action-btn" onclick="openPrescriptionDetail(${item.MaDT})">
                    <i class="fa fa-eye me-1"></i>Xem
                </button>
                ${showDispenseAction && ['ChuaXuat', 'XuatMotPhan'].includes(item.TrangThai) ? `
                    <a class="btn btn-outline-success btn-sm prescription-action-btn" href="capphatthuoc.html">
                        Cấp phát
                    </a>
                ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

async function openPrescriptionDetail(maDT) {
    try {
        const data = await fetchJson(`${API_BASE}/prescriptions/${maDT}`);
        if (!Array.isArray(data) || !data.length) {
            $('prescriptionDetailBody').innerHTML = '<div class="text-muted">Không có chi tiết đơn thuốc</div>';
        } else {
            const patientName = data[0].HoTen || '';
            const warning = data[0].CanhBaoKho
                ? `<div class="alert alert-warning py-2">${escapeHtml(data[0].CanhBaoKho)}</div>`
                : '';
            $('prescriptionDetailBody').innerHTML = `
                <div class="mb-3">
                    <div class="fw-bold">Đơn #${maDT}</div>
                    <div class="text-muted">Bệnh nhân: ${escapeHtml(patientName)}</div>
                    <div class="text-muted">Bác sĩ kê đơn: ${escapeHtml(data[0].TenBacSiKeDon || data[0].TenBacSi || '')}</div>
                    <div class="text-muted">Thời gian kê đơn: ${formatDateTime(data[0].NgayKeDon)}</div>
                    ${data[0].TenKhoQuay ? `<div class="text-muted">Kho cấp phát: ${escapeHtml(data[0].TenKhoQuay)}</div>` : ''}
                </div>
                ${warning}
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Thuốc</th>
                                <th class="text-center">Kê đơn</th>
                                <th class="text-center">Đã xuất</th>
                                <th class="text-center">Còn cần xuất</th>
                                <th class="text-center">Tồn kho quầy</th>
                                <th class="text-center">Có thể xuất</th>
                                <th class="text-center">Trạng thái</th>
                                <th>Cách dùng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((row) => {
                                const soLuongKe = pickNumber(row, ['SoLuongKe', 'SoLuong']);
                                const soLuongDaXuat = pickNumber(row, ['SoLuongDaXuat']);
                                const conCanXuat = pickNumber(row, ['SoLuongConCanXuat']);
                                const tonKhoQuay = pickNumber(row, ['TonKhoQuay', 'TongTonQuay']);
                                const coTheXuat = pickNumber(row, ['CoTheXuat', 'SoLuongCoTheXuat']);
                                const soLuongThieu = pickNumber(row, ['SoLuongThieu']);
                                return `
                                    <tr>
                                        <td>${escapeHtml(row.TenThuoc || '')}</td>
                                        <td class="text-center fw-bold">${soLuongKe}</td>
                                        <td class="text-center fw-bold" style="color: ${soLuongDaXuat < soLuongKe ? '#dc3545' : '#198754'}">
                                            ${soLuongDaXuat}
                                        </td>
                                        <td class="text-center">${conCanXuat}</td>
                                        <td class="text-center fw-semibold">${tonKhoQuay}</td>
                                        <td class="text-center fw-semibold">${coTheXuat}</td>
                                        <td class="text-center">
                                            <span class="status-badge ${stockClass(row.TrangThaiTon)}">${stockText(row.TrangThaiTon)}</span>
                                            ${soLuongThieu > 0 ? `<div class="small text-danger">Thiếu ${soLuongThieu}</div>` : ''}
                                        </td>
                                        <td>${escapeHtml(row.LieuDung || row.CachDung || '')}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
        }
        state.detailModal.show();
    } catch (error) {
        alert(error.message);
    }
}

function resetFilters() {
    $('specialtyFilter').value = '';
    renderDoctorOptions();
    $('doctorFilter').value = '';
    $('patientFilter').value = '';
    $('statusFilter').value = '';
    loadPrescriptions();
}

document.addEventListener('DOMContentLoaded', async () => {
    state.detailModal = new bootstrap.Modal($('prescriptionDetailModal'));

    $('specialtyFilter').addEventListener('change', () => {
        renderDoctorOptions();
        loadPrescriptions();
    });
    $('doctorFilter').addEventListener('change', loadPrescriptions);
    $('statusFilter').addEventListener('change', loadPrescriptions);
    $('applyFiltersBtn').addEventListener('click', loadPrescriptions);
    $('resetFiltersBtn').addEventListener('click', resetFilters);
    $('patientFilter').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadPrescriptions();
    });

    await Promise.all([loadSpecialties(), loadDoctors()]);
    await loadPrescriptions();
});

window.openPrescriptionDetail = openPrescriptionDetail;
