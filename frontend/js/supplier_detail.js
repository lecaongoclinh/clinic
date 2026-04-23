const API_BASE = 'http://localhost:3000/api/suppliers';

function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('vi-VN');
}

function getSupplierId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadSupplierInfo(id) {
    const response = await fetch(`${API_BASE}/${id}`);
    const data = await response.json();

    document.getElementById('TenNCC').innerText = data.TenNCC || '';
    document.getElementById('SoDienThoai').innerText = data.SoDienThoai || '';
    document.getElementById('Email').innerText = data.Email || '';
    document.getElementById('MaSoThue').innerText = data.MaSoThue || '';
    document.getElementById('NguoiLienHe').innerText = data.NguoiLienHe || '';
    document.getElementById('DiaChi').innerText = data.DiaChi || '';
    document.getElementById('DieuKhoan').innerText = data.DieuKhoanThanhToan || '';
}

async function loadMedicines(id) {
    const tbody = document.getElementById('medicineTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Đang tải dữ liệu...</td></tr>';

    const response = await fetch(`${API_BASE}/${id}/medicines`);
    const data = await response.json();

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 empty-state">Không có dữ liệu thuốc</td></tr>';
        window.TablePager?.reset('#supplierMedicineList');
        window.TablePager?.attach('#supplierMedicineList', { pageSize: 8 });
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr>
            <td class="text-center">${item.MaThuoc}</td>
            <td class="fw-semibold">${item.TenThuoc}</td>
            <td>${item.HoatChat || ''}</td>
            <td class="text-center">${item.HamLuong || ''}</td>
            <td class="text-center">${item.DangBaoChe || ''}</td>
            <td class="text-end fw-semibold">${formatCurrency(item.GiaTrungBinh || item.GiaNhap)}</td>
            <td class="text-center">${Number(item.TongTon || 0).toLocaleString('vi-VN')}</td>
        </tr>
    `).join('');

    window.TablePager?.reset('#supplierMedicineList');
    window.TablePager?.attach('#supplierMedicineList', { pageSize: 8 });
}

async function loadImports(id) {
    const tbody = document.getElementById('importTable');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Đang tải dữ liệu...</td></tr>';

    const response = await fetch(`${API_BASE}/${id}/imports`);
    const data = await response.json();

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 empty-state">Chưa có lịch sử nhập thuốc</td></tr>';
        window.TablePager?.reset('#supplierImportList');
        window.TablePager?.attach('#supplierImportList', { pageSize: 8 });
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr>
            <td class="text-center">${item.MaPN}</td>
            <td class="text-center">${formatDate(item.NgayNhap)}</td>
            <td class="text-end fw-semibold">${formatCurrency(item.TongTien)}</td>
            <td class="text-center">${item.LoaiPhieu || ''}</td>
            <td class="text-center">${item.TenKho || ''}</td>
        </tr>
    `).join('');

    window.TablePager?.reset('#supplierImportList');
    window.TablePager?.attach('#supplierImportList', { pageSize: 8 });
}

document.addEventListener('DOMContentLoaded', async () => {
    const id = getSupplierId();

    if (!id) {
        alert('Thiếu mã nhà cung cấp');
        return;
    }

    try {
        await loadSupplierInfo(id);
        await loadMedicines(id);
        await loadImports(id);
    } catch (error) {
        console.error('Lỗi tải chi tiết nhà cung cấp:', error);
        alert('Không thể tải chi tiết nhà cung cấp');
    }
});
