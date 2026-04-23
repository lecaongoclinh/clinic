const urlParams = new URLSearchParams(window.location.search);
const medicineId = urlParams.get('id');

const API_MEDICINE = 'http://localhost:3000/api/medicines';
const API_BATCH = 'http://localhost:3000/api/batches';

let batchData = [];
let medicineInfo = null;

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('vi-VN');
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function getLotStatus(hanSuDung) {
    if (!hanSuDung) {
        return { key: 'KhongRo', text: 'Không rõ', className: 'badge-secondary' };
    }

    const today = new Date();
    const expiry = new Date(hanSuDung);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry - today) / 86400000);

    if (diffDays < 0) {
        return { key: 'HetHan', text: 'Hết hạn', className: 'badge-danger' };
    }

    if (diffDays <= 90) {
        return { key: 'SapHetHan', text: 'Sắp hết hạn', className: 'badge-warning text-dark' };
    }

    return { key: 'ConHan', text: 'Còn hạn', className: 'badge-success' };
}

function getMedicineStatusText(value) {
    if (value === true || value === 1 || value === '1') return 'Đang kinh doanh';
    if (value === false || value === 0 || value === '0') return 'Ngừng kinh doanh';
    return 'Đang kinh doanh';
}

async function loadMedicine() {
    const response = await fetch(`${API_MEDICINE}/${medicineId}`);
    medicineInfo = await response.json();

    document.getElementById('TenThuoc').innerText = medicineInfo.TenThuoc || '';
    document.getElementById('HoatChat').innerText = medicineInfo.HoatChat || '';
    document.getElementById('HamLuong').innerText = medicineInfo.HamLuong || '';
    document.getElementById('DangBaoChe').innerText = medicineInfo.DangBaoChe || '';
    document.getElementById('QuyCach').innerText = medicineInfo.QuyCachDongGoi || '';
    document.getElementById('GiaBan').innerText = formatMoney(medicineInfo.GiaBan);
    document.getElementById('Hang').innerText = medicineInfo.HangSanXuat || '';
    document.getElementById('Nuoc').innerText = medicineInfo.NuocSanXuat || '';
    document.getElementById('NhietDo').innerText = medicineInfo.NhietDoBaoQuan || '';
    document.getElementById('MaVach').innerText = medicineInfo.MaVach || '';
    document.getElementById('Loai').innerText = medicineInfo.LoaiThuoc || '';
    document.getElementById('TrangThai').innerText = getMedicineStatusText(medicineInfo.TrangThai);
    document.getElementById('TongTon').innerText = Number(medicineInfo.TongTon || 0).toLocaleString('vi-VN');
}

async function loadBatches(id) {
    const response = await fetch(`${API_BATCH}/by-medicine/${id}`);
    batchData = await response.json();
    applyBatchFilter();
}

function renderTable(rows) {
    const tbody = document.getElementById('batchTable');

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 empty-state">Không có lô thuốc phù hợp</td></tr>';
        window.TablePager?.reset('#batchListTable');
        window.TablePager?.attach('#batchListTable', { pageSize: 8 });
        return;
    }

    tbody.innerHTML = rows.map((item) => {
        const status = getLotStatus(item.HanSuDung);
        const nhietDo = item.NhietDoBaoQuan || medicineInfo?.NhietDoBaoQuan || 'Chưa cập nhật';

        return `
            <tr>
                <td class="text-center">${item.MaLo}</td>
                <td class="text-center fw-semibold">${item.SoLo || ''}</td>
                <td class="text-center">${formatDate(item.NgaySanXuat)}</td>
                <td class="text-center">${formatDate(item.HanSuDung)}</td>
                <td class="text-center">${Number(item.Ton || 0).toLocaleString('vi-VN')}</td>
                <td class="text-end fw-semibold">${formatMoney(item.GiaNhap)}</td>
                <td class="text-center">${item.TenKho || ''}</td>
                <td class="text-center">${nhietDo}</td>
                <td class="text-center"><span class="badge ${status.className}">${status.text}</span></td>
            </tr>
        `;
    }).join('');

    window.TablePager?.reset('#batchListTable');
    window.TablePager?.attach('#batchListTable', { pageSize: 8 });
}

function applyBatchFilter() {
    const keyword = document.getElementById('searchBatch').value.trim().toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    const filteredRows = batchData.filter((item) => {
        const status = getLotStatus(item.HanSuDung);
        const haystack = [item.SoLo, item.TenKho, item.NhietDoBaoQuan, item.MaLo]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const matchesKeyword = !keyword || haystack.includes(keyword);
        const matchesStatus = !statusFilter || status.key === statusFilter;
        return matchesKeyword && matchesStatus;
    });

    renderTable(filteredRows);
}

function resetBatchFilter() {
    document.getElementById('searchBatch').value = '';
    document.getElementById('statusFilter').value = '';
    renderTable(batchData);
}

async function init() {
    if (!medicineId) {
        alert('Không tìm thấy thuốc cần xem chi tiết');
        return;
    }

    try {
        await loadMedicine();
        await loadBatches(medicineId);
    } catch (error) {
        console.error('Lỗi tải dữ liệu thuốc:', error);
        alert('Không thể tải thông tin thuốc');
    }
}

document.getElementById('searchBatch').addEventListener('input', applyBatchFilter);
document.getElementById('statusFilter').addEventListener('change', applyBatchFilter);
document.getElementById('applyBatchSearch').addEventListener('click', applyBatchFilter);
document.getElementById('resetBatchSearch').addEventListener('click', resetBatchFilter);

document.addEventListener('DOMContentLoaded', init);
