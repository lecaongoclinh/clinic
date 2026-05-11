const API = 'http://localhost:3000/api/dispense';
const API_PATIENT = 'http://localhost:3000/api/patients/search';

const state = {
    items: [],
    selectedMedicine: null,
    currentDraftId: null,
    prescriptionModal: null,
    prescriptionDetailModal: null,
    pendingPrescriptions: [],
    selectedPrescription: null
};

const ROLE = {
    ADMIN: 1,
    PHARMACIST: 5,
    WAREHOUSE: 6
};

function $(id) {
    return document.getElementById(id);
}

function currentRole() {
    return Number(localStorage.getItem('role'));
}

function isPharmacistMode() {
    return currentRole() === ROLE.PHARMACIST;
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN');
}

function setDefaultNgayXuat() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    $('ngayXuat').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Lỗi API');
    return data;
}

function toggleDynamicFields() {
    const loai = $('loaiXuat').value;

    if (state.items.length > 0) {
        $('loaiXuat').value = $('maDT').value ? 'BanChoBN' : $('loaiXuat').value;
    }

    $('patientField').classList.toggle('hidden-dynamic', loai !== 'BanChoBN');
    $('departmentField').classList.toggle('hidden-dynamic', loai !== 'NoiBo');
    $('supplierField').classList.toggle('hidden-dynamic', loai !== 'TraNCC');
    $('reasonField').classList.toggle('hidden-dynamic', loai !== 'Huy');
}

async function loadBootstrap() {
    const data = await fetchJson(`${API}/bootstrap`);

    $('khoSelect').innerHTML = (data.warehouses || []).map((item) => `<option value="${item.MaKho}">${item.TenKho}</option>`).join('');
    $('departmentSelect').innerHTML = '<option value="">Chọn khoa</option>' + (data.departments || []).map((item) => `<option value="${item.MaChuyenKhoa}">${item.TenChuyenKhoa}</option>`).join('');
    $('supplierSelect').innerHTML = '<option value="">Chọn NCC</option>' + (data.suppliers || []).map((item) => `<option value="${item.MaNCC}">${item.TenNCC}</option>`).join('');

    state.pendingPrescriptions = data.pendingPrescriptions || [];
    populatePrescriptionFilters();
    renderPrescriptionList();
    renderDispenseList(data.recentExports || []);
}

function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

function applyRoleMode() {
    if (!isPharmacistMode()) return;

    document.title = 'Cấp phát thuốc';
    setText('formTitle', 'Thông tin cấp phát');
    setText('dateLabel', 'Ngày cấp phát');
    setText('cartTitle', 'Thuốc cấp phát theo đơn');
    setText('historyTitle', 'Danh sách phiếu cấp phát');
    setText('prescriptionModalTitle', 'Danh sách đơn thuốc chờ cấp phát');
    setText('submitDispenseBtn', 'Tạo phiếu cấp phát');
    setText('confirmPrescriptionDispenseBtn', 'Xác nhận cấp phát');

    $('exportTypeField')?.classList.add('role-hidden');
    $('loaiXuat').value = 'BanChoBN';
}

function uniqueBy(list, key) {
    const seen = new Set();
    return list.filter((item) => {
        const value = item[key];
        if (!value || seen.has(String(value))) return false;
        seen.add(String(value));
        return true;
    });
}

function populatePrescriptionFilters() {
    const currentSpecialty = $('prescriptionSpecialtyFilter')?.value || '';
    const currentDoctor = $('prescriptionDoctorFilter')?.value || '';

    const specialties = uniqueBy(state.pendingPrescriptions, 'MaChuyenKhoa')
        .sort((a, b) => String(a.TenChuyenKhoa || '').localeCompare(String(b.TenChuyenKhoa || ''), 'vi'));
    $('prescriptionSpecialtyFilter').innerHTML = '<option value="">Tất cả khoa</option>' +
        specialties.map((item) => `<option value="${item.MaChuyenKhoa}">${escapeHtml(item.TenChuyenKhoa || 'Chưa cập nhật')}</option>`).join('');
    $('prescriptionSpecialtyFilter').value = currentSpecialty;

    renderPrescriptionDoctorOptions(currentDoctor);
}

function renderPrescriptionDoctorOptions(selectedValue = '') {
    const specialtyId = $('prescriptionSpecialtyFilter').value;
    const doctors = uniqueBy(
        specialtyId
            ? state.pendingPrescriptions.filter((item) => String(item.MaChuyenKhoa || '') === String(specialtyId))
            : state.pendingPrescriptions,
        'MaBacSi'
    ).sort((a, b) => String(a.TenBacSi || '').localeCompare(String(b.TenBacSi || ''), 'vi'));

    $('prescriptionDoctorFilter').innerHTML = '<option value="">Tất cả bác sĩ</option>' +
        doctors.map((item) => `<option value="${item.MaBacSi}">${escapeHtml(item.TenBacSi || 'Chưa cập nhật')}</option>`).join('');
    $('prescriptionDoctorFilter').value = doctors.some((item) => String(item.MaBacSi) === String(selectedValue)) ? selectedValue : '';
}

function getFilteredPrescriptions() {
    const specialtyId = $('prescriptionSpecialtyFilter').value;
    const doctorId = $('prescriptionDoctorFilter').value;
    const patientKeyword = $('prescriptionPatientFilter').value.trim().toLowerCase();
    const sortMode = $('prescriptionSortFilter').value;

    return [...state.pendingPrescriptions]
        .filter((item) => !specialtyId || String(item.MaChuyenKhoa || '') === String(specialtyId))
        .filter((item) => !doctorId || String(item.MaBacSi || '') === String(doctorId))
        .filter((item) => {
            if (!patientKeyword) return true;
            const text = `${item.MaBN || ''} ${item.HoTen || ''}`.toLowerCase();
            return text.includes(patientKeyword);
        })
        .sort((a, b) => {
            const dateA = new Date(a.NgayKeDon || 0).getTime();
            const dateB = new Date(b.NgayKeDon || 0).getTime();
            return sortMode === 'oldest' ? dateA - dateB : dateB - dateA;
        });
}

function renderPrescriptionList() {
    const list = getFilteredPrescriptions();
    $('prescriptionModalList').innerHTML = list.length
        ? list.map((item) => `
            <div class="prescription-card">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div style="min-width:0;flex:1;">
                        <div class="prescription-card-title">
                            Đơn #${item.MaDT} - ${escapeHtml(item.HoTen || 'Chưa có tên bệnh nhân')}
                        </div>
                        <div class="prescription-card-meta">
                            ${escapeHtml(item.TenChuyenKhoa || 'Chưa cập nhật khoa')} - ${escapeHtml(item.TenBacSi || 'Chưa cập nhật bác sĩ')}
                        </div>
                        <div class="prescription-card-meta">
                            ${escapeHtml(item.ChuanDoan || 'Chưa có chẩn đoán')} - ${formatDateTime(item.NgayKeDon)}
                        </div>
                    </div>
                    <span class="badge bg-warning text-dark">Chưa xuất</span>
                </div>
                <div class="prescription-card-actions">
                    <div class="text-muted small">${Number(item.SoLoaiThuoc || 0)} thuốc - ${Number(item.TongSoLuong || 0)} đơn vị - ${formatMoney(item.TongTien || 0)}</div>
                    <button class="btn btn-primary btn-sm" type="button" onclick="openPendingPrescriptionDetail(${item.MaDT})">
                        ${isPharmacistMode() ? 'Cấp phát' : 'Xuất thuốc'}
                    </button>
                </div>
            </div>
        `).join('')
        : '<div class="text-muted">Không có đơn thuốc chờ xuất phù hợp</div>';
}

async function refreshPendingPrescriptions() {
    const data = await fetchJson(`${API}/prescriptions/pending`);
    state.pendingPrescriptions = Array.isArray(data) ? data : [];
    populatePrescriptionFilters();
    renderPrescriptionList();
}

async function searchMedicine() {
    const keyword = $('searchInput').value.trim();
    const box = $('medicineList');

    if (!keyword) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    const data = await fetchJson(`${API}/catalog?search=${encodeURIComponent(keyword)}&MaKho=${$('khoSelect').value}`);

    if (!data.length) {
        box.style.display = 'block';
        box.innerHTML = '<div class="p-2">Không tìm thấy thuốc</div>';
        return;
    }

    box.style.display = 'block';
    box.innerHTML = data.map((item) => {
        const ten = (item.TenThuoc || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const donVi = (item.DonViCoBan || '').replace(/'/g, "\\'").replace(/"/g, '\\"');

        return `
            <div class="item" onclick="selectMedicine(${item.MaThuoc}, '${ten}', '${donVi}')">
                <strong>${item.TenThuoc}</strong><br>
                <small>${item.HoatChat || ''}</small><br>
                <span style="font-size:12px;color:#666">Tồn: ${item.TongTon || 0} ${item.DonViCoBan || ''} | FEFO: ${formatDate(item.HanGanNhat)}</span>
            </div>
        `;
    }).join('');
}

async function selectMedicine(maThuoc, tenThuoc, donViCoBan) {
    state.selectedMedicine = { MaThuoc: maThuoc, TenThuoc: tenThuoc, DonViCoBan: donViCoBan || '' };
    $('searchInput').value = tenThuoc;

    try {
        const units = await fetchJson(`http://localhost:3000/api/quy-doi?MaThuoc=${maThuoc}`);
        $('unitSelect').innerHTML = units.map((item) => `<option value="${item.SoLuong}">${item.TenDonVi}</option>`).join('');
        calcRealQty();
    } catch (error) {
        console.error(error);
        $('unitSelect').innerHTML = '';
        $('realQty').value = '';
        alert('Không thể tải đơn vị quy đổi');
    }

    $('medicineList').style.display = 'none';
    $('medicineList').innerHTML = '';
}

function calcRealQty() {
    const qty = Number($('quantity').value || 0);
    const ratio = Number($('unitSelect').value || 1);
    $('realQty').value = qty * ratio;
}

async function addMedicine() {
    if (!state.selectedMedicine) {
        alert('Chưa chọn thuốc');
        return;
    }

    const soLuongNhap = Number($('quantity').value || 0);
    const soLuongThuc = Number($('realQty').value || 0);

    if (soLuongNhap <= 0 || soLuongThuc <= 0) {
        alert('Số lượng phải lớn hơn 0');
        return;
    }

    try {
        const preview = await fetchJson(`${API}/catalog/${state.selectedMedicine.MaThuoc}/preview?MaKho=${$('khoSelect').value}&SoLuong=${soLuongThuc}`);
        state.items.push({
            ...preview,
            MaThuoc: state.selectedMedicine.MaThuoc,
            TenThuoc: state.selectedMedicine.TenThuoc,
            SoLuongNhap: soLuongNhap,
            DonViNhap: $('unitSelect').selectedOptions[0]?.text || '',
            SoLuong: soLuongThuc,
            DonViCoBan: state.selectedMedicine.DonViCoBan || '',
            DonGia: preview.DonGia || 0,
            noiDung: $('loaiXuat').value === 'NoiBo'
                ? $('departmentSelect').selectedOptions[0]?.text || ''
                : $('loaiXuat').value === 'TraNCC'
                    ? $('supplierSelect').selectedOptions[0]?.text || ''
                    : $('loaiXuat').value === 'Huy'
                        ? $('reasonInput').value || ''
                        : ''
        });

        renderTable();
        $('quantity').value = '';
        $('realQty').value = '';
        $('searchInput').value = '';
        $('unitSelect').innerHTML = '';
        state.selectedMedicine = null;
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không đủ tồn để xuất');
    }
}

function renderTable() {
    const tbody = $('cartTable');

    if (!state.items.length) {
        tbody.innerHTML = '';
        $('totalMoney').textContent = '0 đ';
        return;
    }

    tbody.innerHTML = state.items.map((item, index) => {
        const lotHtml = item.allocations?.map((allocation) => {
            const kho = allocation.TenKho ? ` - ${escapeHtml(allocation.TenKho)}` : '';
            return `<div style="font-size:12px">${escapeHtml(allocation.SoLo || '')} (${allocation.SoLuongXuat})${kho}</div>`;
        }).join('') || item.SoLo || '';
        const hsdHtml = item.allocations?.map((allocation) => `<div style="font-size:12px">${formatDate(allocation.HanSuDung)}</div>`).join('') || formatDate(item.HanSuDung);
        const thanhTien = Number(item.ThanhTien || (Number(item.DonGia || 0) * Number(item.SoLuong || 0)));
        const noiDung = [
            item.noiDung || '',
            item.SoLuongNhap && item.DonViNhap ? `${$('maDT').value ? 'Bệnh nhân' : 'Nhận'}: ${item.SoLuongNhap} ${item.DonViNhap}` : ''
        ].filter(Boolean).join('<br>');

        return `
            <tr>
                <td><strong>${item.TenThuoc}</strong></td>
                <td>${lotHtml}</td>
                <td>${hsdHtml}</td>
                <td class="text-center">${item.SoLuong}</td>
                <td class="text-center">${item.DonViCoBan || ''}</td>
                <td class="text-end">${formatMoney(item.DonGia)}</td>
                <td class="text-end">${formatMoney(thanhTien)}</td>
                <td>${noiDung}</td>
                <td class="text-center"><button class="btn btn-sm btn-danger" onclick="removeItem(${index})">Xóa</button></td>
            </tr>
        `;
    }).join('');

    const total = state.items.reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0);
    $('totalMoney').textContent = formatMoney(total);
}

function removeItem(index) {
    state.items.splice(index, 1);
    renderTable();
}

async function loadPrescription(maDT) {
    try {
        const data = await fetchJson(`${API}/prescriptions/${maDT}`);
        $('maDT').value = maDT;
        $('loaiXuat').value = 'BanChoBN';
        $('maBN').value = data.header?.MaBN || '';
        $('patientKeyword').value = data.header?.HoTen || '';
        $('patientResult').innerHTML = data.header?.HoTen ? `<div class="badge bg-success">${data.header.HoTen}</div>` : '';
        toggleDynamicFields();

        state.items = data.items || [];
        renderTable();
        state.prescriptionModal.hide();
    } catch (error) {
        console.error(error);
        alert('Không thể tải đơn thuốc');
    }
}

async function openPendingPrescriptionDetail(maDT) {
    try {
        const data = await fetchJson(`${API}/prescriptions/${maDT}`);
        state.selectedPrescription = data;
        const header = data.header || {};
        const listInfo = state.pendingPrescriptions.find((item) => String(item.MaDT) === String(maDT)) || {};
        const items = data.items || [];

        $('prescriptionDispenseDetailBody').innerHTML = `
            <div class="prescription-detail-meta">
                <div><strong>Đơn:</strong> #${escapeHtml(maDT)}</div>
                <div><strong>Ngày kê:</strong> ${formatDateTime(header.NgayKeDon)}</div>
                <div><strong>Bệnh nhân:</strong> ${escapeHtml(header.HoTen || listInfo.HoTen || '')}</div>
                <div><strong>Khoa:</strong> ${escapeHtml(listInfo.TenChuyenKhoa || 'Chưa cập nhật')}</div>
                <div><strong>Bác sĩ:</strong> ${escapeHtml(listInfo.TenBacSi || 'Chưa cập nhật')}</div>
                <div><strong>Chẩn đoán:</strong> ${escapeHtml(listInfo.ChuanDoan || 'Chưa có chẩn đoán')}</div>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th>Thuốc</th>
                            <th class="text-center">SL</th>
                            <th>Đơn vị</th>
                            <th>Lô bốc theo FEFO</th>
                            <th>Cách dùng</th>
                            <th class="text-end">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item) => `
                            <tr>
                                <td><strong>${escapeHtml(item.TenThuoc || '')}</strong><br><small class="text-muted">${escapeHtml(item.HoatChat || '')}</small></td>
                                <td class="text-center">${Number(item.SoLuong || 0)}</td>
                                <td>${escapeHtml(item.DonViCoBan || item.DonVi || '')}</td>
                                <td>${(item.allocations || []).map((lot) => {
                                    const kho = lot.TenKho ? ` - ${escapeHtml(lot.TenKho)}` : '';
                                    return `${escapeHtml(lot.SoLo || '')} (${Number(lot.SoLuongXuat || 0)}, HSD ${formatDate(lot.HanSuDung)})${kho}`;
                                }).join('<br>')}</td>
                                <td>${escapeHtml(item.LieuDung || '')}</td>
                                <td class="text-end">${formatMoney(item.ThanhTien || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        state.prescriptionDetailModal.show();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể tải chi tiết đơn thuốc');
    }
}

async function confirmPrescriptionDispense() {
    const detail = state.selectedPrescription;
    if (!detail?.header?.MaDT || !detail.items?.length) {
        alert('Chưa có đơn thuốc để xác nhận');
        return;
    }

    const button = $('confirmPrescriptionDispenseBtn');
    button.disabled = true;
    button.textContent = 'Đang xác nhận...';

    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.MaNV) throw new Error('Thiếu thông tin nhân viên');

        const draft = await fetchJson(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MaNhanVien: user.MaNV,
                MaKho: null,
                LoaiXuat: 'BanChoBN',
                MaBN: detail.header.MaBN || null,
                MaDT: detail.header.MaDT,
                NgayXuat: $('ngayXuat').value,
                GhiChu: `Theo đơn #${detail.header.MaDT}`,
                items: detail.items
            })
        });

        await fetchJson(`${API}/${draft.MaPX}/complete`, { method: 'POST' });
        alert(isPharmacistMode() ? 'Đã xác nhận cấp phát thuốc' : 'Đã xác nhận xuất thuốc');
        state.prescriptionDetailModal.hide();
        state.prescriptionModal.hide();
        state.selectedPrescription = null;
        resetForm();
        await loadBootstrap();
    } catch (error) {
        console.error(error);
        alert(error.message || (isPharmacistMode() ? 'Không thể xác nhận cấp phát thuốc' : 'Không thể xác nhận xuất thuốc'));
    } finally {
        button.disabled = false;
        button.textContent = isPharmacistMode() ? 'Xác nhận cấp phát' : 'Xác nhận xuất thuốc';
    }
}

function extractNoteText(raw, row = {}) {
    try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.note) return parsed.note;
        if (row.LoaiXuat === 'BanChoBN') {
            if (isPharmacistMode()) return row.TenBenhNhan ? `Cấp phát cho ${row.TenBenhNhan}` : 'Cấp phát cho bệnh nhân';
            return row.TenBenhNhan ? `Xuất cho ${row.TenBenhNhan}` : 'Xuất cho bệnh nhân';
        }
        if (row.LoaiXuat === 'NoiBo') return parsed?.meta?.TenKhoa || 'Xuất nội bộ';
        if (row.LoaiXuat === 'TraNCC') return parsed?.meta?.TenNCC || 'Trả nhà cung cấp';
        if (row.LoaiXuat === 'Huy') return parsed?.meta?.LyDo || 'Hủy thuốc';
        return raw || '';
    } catch {
        return raw || '';
    }
}

function renderDispenseList(list) {
    const tbody = document.querySelector('#dispenseTable tbody');
    if (!list?.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có phiếu xuất</td></tr>';
        window.TablePager?.reset('#dispenseTable');
        window.TablePager?.attach('#dispenseTable', { pageSize: 6 });
        return;
    }

    tbody.innerHTML = list.map((item) => `
        <tr>
            <td class="text-center">${item.MaPX}</td>
            <td class="text-center">${item.LoaiXuat || ''}</td>
            <td class="text-center">${formatDateTime(item.NgayXuat)}</td>
            <td class="text-center">${item.TrangThai || ''}</td>
            <td>${extractNoteText(item.GhiChu, item)}</td>
            <td class="text-end">${formatMoney(item.TongTien || 0)}</td>
        </tr>
    `).join('');

    window.TablePager?.reset('#dispenseTable');
    window.TablePager?.attach('#dispenseTable', { pageSize: 6 });
}

async function searchPatient() {
    const keyword = $('patientKeyword').value.trim();
    if (!keyword) return;

    const data = await fetchJson(`${API_PATIENT}?tenBN=${encodeURIComponent(keyword)}`);
    $('patientResult').innerHTML = data.map((item) => `
        <button class="btn btn-sm btn-outline-secondary me-2 mb-2" onclick="selectPatient('${item.MaBN}','${item.HoTen}')">${item.HoTen}</button>
    `).join('');
}

function selectPatient(maBN, hoTen) {
    $('maBN').value = maBN;
    $('patientKeyword').value = hoTen;
    $('patientResult').innerHTML = `<div class="badge bg-success">${hoTen}</div>`;
}

function getPayload() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.MaNV) throw new Error('Thiếu thông tin nhân viên');
    if (isPharmacistMode() && !$('maDT').value) {
        throw new Error('Cấp phát thuốc phải chọn đơn thuốc của bệnh nhân');
    }

    return {
        MaPX: state.currentDraftId,
        MaNhanVien: user.MaNV,
        MaKho: $('maDT').value ? null : $('khoSelect').value,
        LoaiXuat: $('loaiXuat').value,
        MaBN: $('maBN').value || null,
        MaDT: $('maDT').value || null,
        MaKhoa: $('departmentSelect').value || null,
        MaNCC: $('supplierSelect').value || null,
        LyDo: $('reasonInput').value || '',
        NgayXuat: $('ngayXuat').value,
        GhiChu: $('ghiChu').value,
        items: state.items
    };
}

async function saveDraft() {
    const data = await fetchJson(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload())
    });
    state.currentDraftId = data.MaPX;
    alert('Đã lưu phiếu tạm');
}

async function complete() {
    if (!state.currentDraftId) {
        const draft = await fetchJson(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getPayload())
        });
        state.currentDraftId = draft.MaPX;
    }

    await fetchJson(`${API}/${state.currentDraftId}/complete`, { method: 'POST' });
    alert(isPharmacistMode() ? 'Hoàn thành phiếu cấp phát thành công' : 'Hoàn thành phiếu xuất thành công');
    resetForm();
    await loadBootstrap();
}

async function submitDispense() {
    if (!state.items.length) {
        alert('Chưa có thuốc trong phiếu');
        return;
    }
    await complete();
}

function resetForm() {
    state.items = [];
    state.currentDraftId = null;
    state.selectedMedicine = null;
    $('cartTable').innerHTML = '';
    $('totalMoney').textContent = '0 đ';
    $('maDT').value = '';
    $('maBN').value = '';
    $('patientKeyword').value = '';
    $('patientResult').innerHTML = '';
    $('searchInput').value = '';
    $('unitSelect').innerHTML = '';
    $('quantity').value = '';
    $('realQty').value = '';
    $('medicineList').innerHTML = '';
    $('medicineList').style.display = 'none';
    $('ghiChu').value = '';
    $('reasonInput').value = '';
    $('departmentSelect').value = '';
    $('supplierSelect').value = '';
    $('loaiXuat').value = 'BanChoBN';
    setDefaultNgayXuat();
    toggleDynamicFields();
}

function printDispense() {
    window.print();
}

function cancelDispense() {
    if (!state.items.length && !state.currentDraftId) {
        resetForm();
        return;
    }

    if (confirm('Hủy thao tác hiện tại và xóa dữ liệu đang nhập?')) {
        resetForm();
    }
}

function bindEvents() {
    $('loaiXuat').addEventListener('change', toggleDynamicFields);
    $('addMedicineBtn').addEventListener('click', addMedicine);
    $('searchPatientBtn').addEventListener('click', searchPatient);
    $('openPrescriptionModal').addEventListener('click', async () => {
        state.prescriptionModal.show();
        await refreshPendingPrescriptions();
    });
    $('saveDraftBtn').addEventListener('click', saveDraft);
    $('completeBtn').addEventListener('click', complete);
    $('confirmPrescriptionDispenseBtn').addEventListener('click', confirmPrescriptionDispense);
    $('printBtn').addEventListener('click', printDispense);
    $('cancelBtn').addEventListener('click', cancelDispense);
    $('quantity').addEventListener('input', calcRealQty);
    $('unitSelect').addEventListener('change', calcRealQty);
    $('prescriptionSpecialtyFilter').addEventListener('change', () => {
        renderPrescriptionDoctorOptions();
        renderPrescriptionList();
    });
    $('prescriptionDoctorFilter').addEventListener('change', renderPrescriptionList);
    $('prescriptionPatientFilter').addEventListener('input', renderPrescriptionList);
    $('prescriptionSortFilter').addEventListener('change', renderPrescriptionList);

    let timer;
    $('searchInput').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(searchMedicine, 300);
    });
}

async function init() {
    state.prescriptionModal = new bootstrap.Modal($('prescriptionModal'));
    state.prescriptionDetailModal = new bootstrap.Modal($('prescriptionDispenseDetailModal'));
    applyRoleMode();
    bindEvents();
    setDefaultNgayXuat();
    toggleDynamicFields();
    await loadBootstrap();
}

document.addEventListener('click', (event) => {
    setTimeout(() => {
        if (!event.target.closest('#searchInput') && !event.target.closest('#medicineList')) {
            $('medicineList').style.display = 'none';
        }
    }, 100);
});

document.addEventListener('DOMContentLoaded', init);

Object.assign(window, {
    loadPrescription,
    openPendingPrescriptionDetail,
    removeItem,
    selectPatient,
    selectMedicine,
    submitDispense
});
