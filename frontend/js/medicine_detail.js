const urlParams = new URLSearchParams(window.location.search);
const medicineId = urlParams.get('id');

const API_MEDICINE = 'http://localhost:3000/api/medicines';
const API_BATCH = 'http://localhost:3000/api/batches';

let batchData = [];
let medicineInfo = null;
let filterTimer = null;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('vi-VN');
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function getLotStatus(item) {
    if (item.TrangThai === 'DaHuy') return { key: 'DaHuy', text: 'Đã hủy', className: 'badge-secondary' };
    if (item.TrangThai === 'HetHan') return { key: 'HetHan', text: 'Hết hạn', className: 'badge-danger' };
    if (item.TrangThai === 'SapHetHan') return { key: 'SapHetHan', text: 'Sắp hết hạn', className: 'badge-warning' };
    if (item.TrangThai === 'ConHan') return { key: 'ConHan', text: 'Còn hạn', className: 'badge-success' };

    if (!item.HanSuDung) return { key: 'KhongRo', text: 'Không rõ', className: 'badge-secondary' };
    const today = new Date();
    const expiry = new Date(item.HanSuDung);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / 86400000);
    if (diffDays < 0) return { key: 'HetHan', text: 'Hết hạn', className: 'badge-danger' };
    if (diffDays <= 90) return { key: 'SapHetHan', text: 'Sắp hết hạn', className: 'badge-warning' };
    return { key: 'ConHan', text: 'Còn hạn', className: 'badge-success' };
}

function getMedicineStatusText(value) {
    return value === false || value === 0 || value === '0' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
}

function getTypeText(value) {
    switch (value) {
        case 'ThuocKeDon': return 'Thuốc kê đơn';
        case 'KhongKeDon': return 'Không kê đơn';
        case 'VatTuYTe': return 'Vật tư y tế';
        default: return value || '';
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Lỗi tải dữ liệu');
    return data;
}

async function loadMedicine() {
    medicineInfo = await fetchJson(`${API_MEDICINE}/${medicineId}`);

    document.getElementById('TenThuoc').innerText = medicineInfo.TenThuoc || '';
    document.getElementById('HoatChat').innerText = medicineInfo.HoatChat || '';
    document.getElementById('HamLuong').innerText = medicineInfo.HamLuong || '';
    document.getElementById('DangBaoChe').innerText = medicineInfo.DangBaoChe || '';
    document.getElementById('QuyCach').innerText = medicineInfo.QuyCachDongGoi || '';
    document.getElementById('DonViCoBan').innerText = medicineInfo.DonViCoBan || '';
    document.getElementById('GiaBan').innerText = formatMoney(medicineInfo.GiaBan);
    document.getElementById('Hang').innerText = medicineInfo.HangSanXuat || '';
    document.getElementById('Nuoc').innerText = medicineInfo.NuocSanXuat || '';
    document.getElementById('NhietDo').innerText = medicineInfo.NhietDoBaoQuan || '';
    document.getElementById('MaVach').innerText = medicineInfo.MaVach || '';
    document.getElementById('Loai').innerText = getTypeText(medicineInfo.LoaiThuoc);
    document.getElementById('TrangThai').innerText = getMedicineStatusText(medicineInfo.TrangThai);
    document.getElementById('TongTon').innerText = Number(medicineInfo.TongTon || 0).toLocaleString('vi-VN');
}

function buildBatchQuery() {
    const params = new URLSearchParams();
    const status = document.getElementById('statusFilter')?.value || '';
    const includeZeroStock = document.getElementById('includeZeroStock')?.checked;
    const includeCancelled = document.getElementById('includeCancelled')?.checked;
    if (status) params.set('status', status);
    if (includeZeroStock) params.set('includeZeroStock', 'true');
    if (includeCancelled || status === 'DaHuy') params.set('includeCancelled', 'true');
    return params.toString();
}

async function loadBatches() {
    const query = buildBatchQuery();
    batchData = await fetchJson(`${API_BATCH}/by-medicine/${medicineId}${query ? `?${query}` : ''}`);
    applyBatchFilter();
}

function renderTable(rows) {
    const tbody = document.getElementById('batchTable');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 empty-state">Không có lô thuốc phù hợp</td></tr>';
        window.TablePager?.reset('#batchListTable');
        return;
    }

    tbody.innerHTML = rows.map((item) => {
        const status = getLotStatus(item);
        const nhietDo = item.NhietDoBaoQuan || medicineInfo?.NhietDoBaoQuan || 'Chưa cập nhật';
        return `
            <tr>
                <td class="text-center">${item.MaLo}</td>
                <td class="text-center fw-semibold">${escapeHtml(item.SoLo || '')}</td>
                <td class="text-center">${formatDate(item.NgaySanXuat)}</td>
                <td class="text-center">${formatDate(item.HanSuDung)}</td>
                <td class="text-center">${Number(item.Ton || 0).toLocaleString('vi-VN')}</td>
                <td class="text-end fw-semibold">${formatMoney(item.GiaNhap)}</td>
                <td class="text-center">${escapeHtml(item.TenKho || '')}</td>
                <td class="text-center">${escapeHtml(item.TenNCC || '')}</td>
                <td class="text-center">${escapeHtml(nhietDo)}</td>
                <td class="text-center"><span class="badge ${status.className}">${status.text}</span></td>
            </tr>
        `;
    }).join('');

    window.TablePager?.reset('#batchListTable');
    window.TablePager?.attach('#batchListTable', { pageSize: 8 });
}

function applyBatchFilter() {
    const keyword = document.getElementById('searchBatch').value.trim().toLowerCase();
    const filteredRows = batchData.filter((item) => {
        const haystack = [item.SoLo, item.TenKho, item.TenNCC, item.NhietDoBaoQuan, item.MaLo]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return !keyword || haystack.includes(keyword);
    });
    renderTable(filteredRows);
}

function scheduleBatchFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyBatchFilter, 250);
}

async function resetBatchFilter() {
    document.getElementById('searchBatch').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('includeZeroStock').checked = false;
    document.getElementById('includeCancelled').checked = false;
    await loadBatches();
}

function goImport() {
    window.location.href = `imports.html?MaThuoc=${encodeURIComponent(medicineId)}`;
}

function goDispense() {
    window.location.href = `dispense.html?MaThuoc=${encodeURIComponent(medicineId)}`;
}

function goInventory() {
    window.location.href = `inventory.html?MaThuoc=${encodeURIComponent(medicineId)}`;
}

function bindEvents() {
    document.getElementById('statusFilter')?.addEventListener('change', loadBatches);
    document.getElementById('includeZeroStock')?.addEventListener('change', loadBatches);
    document.getElementById('includeCancelled')?.addEventListener('change', loadBatches);
}

async function init() {
    if (!medicineId) {
        alert('Không tìm thấy thuốc cần xem chi tiết');
        return;
    }
    try {
        bindEvents();
        await loadMedicine();
        await loadBatches();
    } catch (error) {
        console.error('Lỗi tải dữ liệu thuốc:', error);
        alert(error.message || 'Không thể tải thông tin thuốc');
    }
}

document.addEventListener('DOMContentLoaded', init);
Object.assign(window, {
    goImport,
    goDispense,
    goInventory,
    loadBatches,
    applyBatchFilter,
    resetBatchFilter
});
