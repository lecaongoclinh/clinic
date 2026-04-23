const API = 'http://localhost:3000/api/dispense';
const API_PATIENT = 'http://localhost:3000/api/patients/search';

const state = {
    items: [],
    selectedMedicine: null,
    currentDraftId: null,
    prescriptionModal: null
};

function $(id) {
    return document.getElementById(id);
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
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

    renderPrescriptionList(data.pendingPrescriptions || []);
    renderDispenseList(data.recentExports || []);
}

function renderPrescriptionList(list) {
    $('prescriptionModalList').innerHTML = list.length
        ? list.map((item) => `
            <div class="border rounded px-3 py-2 mb-2 clickable-row" style="cursor:pointer;background:#fff;" onclick="loadPrescription(${item.MaDT})">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div style="min-width:0;flex:1;">
                        <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            Đơn ${item.MaDT} - ${item.HoTen || 'Chưa có tên bệnh nhân'} - ${item.TenBacSi || 'Chưa cập nhật bác sĩ'}
                        </div>
                        <div style="font-size:13px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px;">
                            ${item.ChuanDoan || 'Chưa có chẩn đoán'} - ${formatDateTime(item.NgayKeDon)}
                        </div>
                    </div>
                    <span class="badge ${item.TrangThai === 'ChuaXuat' ? 'bg-warning text-dark' : 'bg-secondary'}">${item.TrangThai === 'DaXuat' ? 'Đã xuất' : 'Chưa xuất'}</span>
                </div>
            </div>
        `).join('')
        : '<div class="text-muted">Không có đơn thuốc chờ xuất</div>';
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
        const lotHtml = item.allocations?.map((allocation) => `<div style="font-size:12px">${allocation.SoLo} (${allocation.SoLuongXuat})</div>`).join('') || item.SoLo || '';
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
        const data = await fetchJson(`${API}/prescriptions/${maDT}?MaKho=${$('khoSelect').value}`);
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

function extractNoteText(raw, row = {}) {
    try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.note) return parsed.note;
        if (row.LoaiXuat === 'BanChoBN') return row.TenBenhNhan ? `Xuất cho ${row.TenBenhNhan}` : 'Xuất cho bệnh nhân';
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

    return {
        MaPX: state.currentDraftId,
        MaNhanVien: user.MaNV,
        MaKho: $('khoSelect').value,
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
    alert('Hoàn thành phiếu xuất thành công');
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
    $('openPrescriptionModal').addEventListener('click', () => state.prescriptionModal.show());
    $('saveDraftBtn').addEventListener('click', saveDraft);
    $('completeBtn').addEventListener('click', complete);
    $('printBtn').addEventListener('click', printDispense);
    $('cancelBtn').addEventListener('click', cancelDispense);
    $('quantity').addEventListener('input', calcRealQty);
    $('unitSelect').addEventListener('change', calcRealQty);

    let timer;
    $('searchInput').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(searchMedicine, 300);
    });
}

async function init() {
    state.prescriptionModal = new bootstrap.Modal($('prescriptionModal'));
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
    removeItem,
    selectPatient,
    selectMedicine,
    submitDispense
});
