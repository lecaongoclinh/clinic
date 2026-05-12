const API_BASE = 'http://localhost:3000/api/suppliers';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Lỗi API');
    return data;
}

async function loadSupplierInfo(id) {
    const data = await fetchJson(`${API_BASE}/${id}`);

    document.getElementById('TenNCC').innerText = data.TenNCC || '';
    document.getElementById('SoDienThoai').innerText = data.SoDienThoai || '';
    document.getElementById('Email').innerText = data.Email || '';
    document.getElementById('MaSoThue').innerText = data.MaSoThue || '';
    document.getElementById('NguoiLienHe').innerText = data.NguoiLienHe || '';
    document.getElementById('DiaChi').innerText = data.DiaChi || '';
    document.getElementById('DieuKhoan').innerText = data.DieuKhoanThanhToan || '';

    const statusEl = document.getElementById('TrangThai');
    if (statusEl) statusEl.innerText = Number(data.TrangThai ?? 1) === 1 ? 'Active' : 'inactive';
}

async function loadMedicines(id) {
    const tbody = document.getElementById('medicineTable');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Đang tải dữ liệu...</td></tr>';

    const data = await fetchJson(`${API_BASE}/${id}/medicines`);

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 empty-state">Không có dữ liệu thuốc</td></tr>';
        window.TablePager?.reset('#supplierMedicineList');
        window.TablePager?.attach('#supplierMedicineList', { pageSize: 8 });
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr>
            <td class="text-center">${escapeHtml(item.MaThuoc)}</td>
            <td class="fw-semibold">${escapeHtml(item.TenThuoc)}</td>
            <td>${escapeHtml(item.HoatChat || '')}</td>
            <td class="text-center">${escapeHtml(item.HamLuong || '')}</td>
            <td class="text-center">${escapeHtml(item.DangBaoChe || '')}</td>
            <td class="text-end fw-semibold">${formatCurrency(item.GiaTrungBinh || item.GiaNhap)}</td>
            <td class="text-center">${Number(item.TongTon || 0).toLocaleString('vi-VN')}</td>
            <td class="text-center">${Number(item.SoLoConTon || 0).toLocaleString('vi-VN')}</td>
            <td class="text-center">
                <a class="btn btn-sm btn-outline-primary" href="medicine-detail.html?id=${encodeURIComponent(item.MaThuoc)}">Xem</a>
            </td>
        </tr>
    `).join('');

    window.TablePager?.reset('#supplierMedicineList');
    window.TablePager?.attach('#supplierMedicineList', { pageSize: 8 });
}

async function loadImports(id) {
    const tbody = document.getElementById('importTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Đang tải dữ liệu...</td></tr>';

    const data = await fetchJson(`${API_BASE}/${id}/imports`);

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 empty-state">Chưa có lịch sử nhập thuốc</td></tr>';
        window.TablePager?.reset('#supplierImportList');
        window.TablePager?.attach('#supplierImportList', { pageSize: 8 });
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr>
            <td class="text-center">${escapeHtml(item.MaPN)}</td>
            <td class="text-center">${formatDate(item.NgayNhap)}</td>
            <td class="text-end fw-semibold">${formatCurrency(item.TongTien)}</td>
            <td class="text-center">${escapeHtml(item.LoaiPhieu || '')}</td>
            <td class="text-center">${escapeHtml(item.TenKho || '')}</td>
            <td class="text-center">${escapeHtml(item.TrangThai || '')}</td>
            <td class="text-center">
                <a class="btn btn-sm btn-outline-primary" href="import_detail.html?id=${encodeURIComponent(item.MaPN)}">Xem</a>
            </td>
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
        alert(error.message || 'Không thể tải chi tiết nhà cung cấp');
    }
});
