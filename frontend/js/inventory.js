const API = 'http://localhost:3000/api/inventory';
const API_BATCH = 'http://localhost:3000/api/batches';
const API_KHO = 'http://localhost:3000/api/kho';
const API_SUPPLIERS = 'http://localhost:3000/api/suppliers';
const API_MEDICINES = 'http://localhost:3000/api/medicines';

let inventoryData = [];
let warningData = null;
let stockCardData = [];
let auditHistoryData = [];
let auditTemplateData = [];
let filterDebounceTimer = null;
let currentLotId = null;
let currentLotDetail = null;

function formatMoney(x) {
    return `${Number(x || 0).toLocaleString('vi-VN')} đ`;
}

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('vi-VN');
}

function formatDateTime(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleString('vi-VN');
}

function getStatusText(status) {
    switch (status) {
        case 'HetHan': return 'Hết hạn';
        case 'SapHetHan': return 'Sắp hết hạn';
        case 'DaHuy': return 'Đã hủy';
        default: return 'Còn hạn';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'HetHan': return 'status-danger';
        case 'SapHetHan': return 'status-warning';
        case 'DaHuy': return 'status-info';
        default: return '';
    }
}

function renderEmptyRow(colspan, text) {
    return `<tr><td colspan="${colspan}" class="empty-state">${text}</td></tr>`;
}

function resetAndAttachPager(selector) {
    window.TablePager?.reset(selector);
    window.TablePager?.attach(selector);
}

function getStockThreshold() {
    const selected = Number(document.getElementById('warningStockFilter')?.value || 0);
    return selected > 0 ? selected : 20;
}

function getWarningSearchKeyword() {
    return document.getElementById('warningSearchInput')?.value.trim().toLowerCase() || '';
}

function filterWarningRows(rows = [], quantityKey = 'Ton') {
    const keyword = getWarningSearchKeyword();
    const threshold = Number(document.getElementById('warningStockFilter')?.value || 0);

    return rows.filter((row) => {
        const quantity = Number(row[quantityKey] ?? row.TongTon ?? 0);
        const haystack = [row.TenThuoc, row.SoLo, row.TenKho, row.TenNCC, row.LyDo].join(' ').toLowerCase();
        const matchesKeyword = !keyword || haystack.includes(keyword);
        const matchesThreshold = !threshold || quantity <= threshold;
        return matchesKeyword && matchesThreshold;
    });
}

function getStockCardDescription(row) {
    switch (row.Loai) {
        case 'Nhap': return `Nhập hàng${row.GhiChu ? ` - ${row.GhiChu}` : ''}`;
        case 'Xuat': return `Xuất kho${row.GhiChu ? ` - ${row.GhiChu}` : ''}`;
        case 'Huy': return `Xuất hủy${row.GhiChu ? ` - ${row.GhiChu}` : ''}`;
        case 'KiemKe': return `Điều chỉnh kiểm kê${row.GhiChu ? ` - ${row.GhiChu}` : ''}`;
        default: return row.DienGiai || 'Biến động kho';
    }
}

function renderInventoryTable(data) {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = renderEmptyRow(10, 'Không có dữ liệu tồn kho');
        resetAndAttachPager('#inventoryTable');
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr onclick="handleRowClick(event, ${item.MaLo})">
            <td>${item.TenThuoc}<br><small style="color:#666;">${item.HoatChat || ''}</small></td>
            <td class="text-center">${item.SoLo}</td>
            <td class="text-center">${formatDate(item.NgaySanXuat)}</td>
            <td class="text-center">${formatDate(item.HanSuDung)}</td>
            <td class="text-center">${Number(item.Ton || 0).toLocaleString('vi-VN')}</td>
            <td class="text-end">${formatMoney(item.GiaNhap)}</td>
            <td class="text-center">${item.TenKho || ''}</td>
            <td class="text-center">${item.TenNCC || ''}</td>
            <td class="text-center"><span class="status-badge ${getStatusClass(item.TrangThai)}">${getStatusText(item.TrangThai)}</span></td>
            <td class="text-center" onclick="event.stopPropagation()">
                <button class="action-icon btn-edit" onclick="editItem(${item.MaLo}); event.stopPropagation()" title="Chỉnh sửa"><i class="fa fa-edit"></i></button>
                <button class="action-icon btn-transfer" onclick="transferStock(${item.MaLo}); event.stopPropagation()" title="Điều chuyển"><i class="fa fa-exchange-alt"></i></button>
                <button class="action-icon btn-delete" onclick="deleteItem(${item.MaLo}); event.stopPropagation()" title="Hủy"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    resetAndAttachPager('#inventoryTable');
}

function renderStats(data) {
    let totalValue = 0;
    let expired = 0;
    let warning = 0;
    let low = 0;

    data.forEach((item) => {
        const ton = Number(item.Ton) || 0;
        const gia = Number(item.GiaNhap) || 0;
        totalValue += ton * gia;
        if (item.TrangThai === 'HetHan') expired += 1;
        if (item.TrangThai === 'SapHetHan') warning += 1;
        if (ton < 10) low += 1;
    });

    document.querySelector('.card-blue h4').innerText = formatMoney(totalValue);
    document.querySelector('.card-red h4').innerText = `${expired} Lô`;
    document.querySelector('.card-orange h4').innerText = `${warning} Lô`;
    document.querySelector('.card-sky h4').innerText = low;
}

function buildInventoryParams() {
    const params = new URLSearchParams();
    const search = document.getElementById('searchInput').value.trim();
    const MaKho = document.getElementById('warehouseFilter').value;
    const TrangThai = document.getElementById('statusFilter').value;
    const MaNCC = document.getElementById('providerFilter').value;

    if (search) params.set('search', search);
    if (MaKho) params.set('MaKho', MaKho);
    if (TrangThai) params.set('TrangThai', TrangThai);
    if (MaNCC) params.set('MaNCC', MaNCC);

    return params;
}

function buildInventoryUrl() {
    const params = buildInventoryParams();
    const query = params.toString();
    return query ? `${API}?${query}` : API;
}

async function loadInventory() {
    try {
        const response = await fetch(buildInventoryUrl());
        inventoryData = await response.json();
        renderInventoryTable(inventoryData);
        renderStats(inventoryData);
    } catch (error) {
        console.error('Lỗi load inventory:', error);
    }
}

function applyFilter() {
    loadInventory();
}

function scheduleApplyFilter(delay = 300) {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => applyFilter(), delay);
}

function renderSimpleWarningTable(selector, rows, columns, emptyText) {
    const tbody = document.querySelector(`${selector} tbody`);
    if (!rows || !rows.length) {
        tbody.innerHTML = renderEmptyRow(columns.length, emptyText);
        resetAndAttachPager(selector);
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            ${columns.map((column) => `<td class="${column.className || ''}">${column.render(row)}</td>`).join('')}
        </tr>
    `).join('');

    resetAndAttachPager(selector);
}

function renderWarnings() {
    if (!warningData) return;

    const selectedRange = document.getElementById('warningRangeFilter').value;
    const nearExpiryMap = {
        '3': warningData.near3Months,
        '6': warningData.near6Months,
        '9': warningData.near9Months
    };

    const expiredRows = filterWarningRows(warningData.expired, 'Ton');
    const nearRows = filterWarningRows(nearExpiryMap[selectedRange] || [], 'Ton');
    const lowRows = filterWarningRows(warningData.lowStock, 'TongTon');
    const recalledRows = filterWarningRows(warningData.recalled, 'SoLuong');

    renderSimpleWarningTable('#expiredWarningTable', expiredRows, [
        { render: (row) => row.TenThuoc },
        { render: (row) => row.SoLo, className: 'text-center' },
        { render: (row) => formatDate(row.HanSuDung), className: 'text-center' },
        { render: (row) => Number(row.Ton) || 0, className: 'text-center' },
        { render: (row) => row.TenKho || '', className: 'text-center' },
        { render: (row) => row.TenNCC || '', className: 'text-center' }
    ], 'Không có lô hết hạn');

    renderSimpleWarningTable('#nearWarningTable', nearRows, [
        { render: (row) => row.TenThuoc },
        { render: (row) => row.SoLo, className: 'text-center' },
        { render: (row) => formatDate(row.HanSuDung), className: 'text-center' },
        { render: (row) => Number(row.Ton) || 0, className: 'text-center' },
        { render: (row) => row.TenKho || '', className: 'text-center' },
        { render: (row) => `${Math.max(Number(row.ConLaiNgay) || 0, 0)} ngày`, className: 'text-center' }
    ], 'Không có lô cận date trong khoảng đã chọn');

    renderSimpleWarningTable('#lowStockWarningTable', lowRows, [
        { render: (row) => row.TenThuoc },
        { render: (row) => Number(row.TongTon) || 0, className: 'text-center' },
        { render: (row) => Number(row.DinhMucToiThieu) || warningData.minStock, className: 'text-center' }
    ], 'Không có thuốc dưới định mức');

    renderSimpleWarningTable('#recalledWarningTable', recalledRows, [
        { render: (row) => row.TenThuoc },
        { render: (row) => row.SoLo, className: 'text-center' },
        { render: (row) => formatDateTime(row.NgayHuy), className: 'text-center' },
        { render: (row) => Number(row.SoLuong) || 0, className: 'text-center' },
        { render: (row) => row.LyDo || '', className: 'text-center' },
        { render: (row) => row.TenKho || '', className: 'text-center' }
    ], 'Chưa có lô bị đình chỉ hoặc thu hồi');
}

async function loadWarnings() {
    try {
        const params = new URLSearchParams({ minStock: getStockThreshold() });
        const response = await fetch(`${API}/warnings?${params.toString()}`);
        warningData = await response.json();
        renderWarnings();
    } catch (error) {
        console.error('Lỗi load warnings:', error);
    }
}

function renderStockCard() {
    const tbody = document.querySelector('#stockCardTable tbody');
    if (!stockCardData.length) {
        tbody.innerHTML = renderEmptyRow(7, 'Chưa có giao dịch phù hợp để hiển thị thẻ kho');
        resetAndAttachPager('#stockCardTable');
        return;
    }

    tbody.innerHTML = stockCardData.map((row) => `
        <tr>
            <td class="text-center">${formatDateTime(row.NgayThang)}</td>
            <td class="text-center">${row.SoChungTu || ''}</td>
            <td>${row.TenThuoc || ''}</td>
            <td>${getStockCardDescription(row)}</td>
            <td class="text-center">${Number(row.SoLuongNhap) || 0}</td>
            <td class="text-center">${Number(row.SoLuongXuat) || 0}</td>
            <td class="text-center fw-semibold">${Number(row.TonCuoiKy) || 0}</td>
        </tr>
    `).join('');

    resetAndAttachPager('#stockCardTable');
}

async function loadStockCard() {
    try {
        const params = new URLSearchParams();
        const MaThuoc = document.getElementById('historyMedicineFilter').value;
        const MaKho = document.getElementById('historyWarehouseFilter').value;
        const dateFrom = document.getElementById('historyDateFrom').value;
        const dateTo = document.getElementById('historyDateTo').value;

        if (!MaThuoc) {
            stockCardData = [];
            renderStockCard();
            const tbody = document.querySelector('#stockCardTable tbody');
            tbody.innerHTML = renderEmptyRow(7, 'Vui lòng chọn thuốc để xem thẻ kho và cột tồn cuối chính xác');
            resetAndAttachPager('#stockCardTable');
            return;
        }

        params.set('MaThuoc', MaThuoc);
        if (MaKho) params.set('MaKho', MaKho);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const response = await fetch(`${API}/stock-card?${params.toString()}`);
        stockCardData = await response.json();
        renderStockCard();
    } catch (error) {
        console.error('Lỗi load stock card:', error);
    }
}

function renderAuditHistory() {
    const tbody = document.querySelector('#auditHistoryTable tbody');
    const dateFrom = document.getElementById('auditDateFrom')?.value;
    const dateTo = document.getElementById('auditDateTo')?.value;
    const filteredRows = auditHistoryData.filter((row) => {
        const auditDate = new Date(row.NgayKiemKe);
        if (Number.isNaN(auditDate.getTime())) return true;

        const fromOk = !dateFrom || auditDate >= new Date(`${dateFrom}T00:00:00`);
        const toOk = !dateTo || auditDate <= new Date(`${dateTo}T23:59:59`);
        return fromOk && toOk;
    });

    if (!filteredRows.length) {
        tbody.innerHTML = renderEmptyRow(8, 'Chưa có đợt kiểm kê nào');
        resetAndAttachPager('#auditHistoryTable');
        return;
    }

    tbody.innerHTML = filteredRows.map((row) => `
        <tr>
            <td class="text-center">KK-${row.MaKK}</td>
            <td class="text-center">${formatDateTime(row.NgayKiemKe)}</td>
            <td class="text-center">${row.TenKho || ''}</td>
            <td class="text-center">${row.NguoiKiem || ''}</td>
            <td class="text-center"><span class="status-badge ${row.KetQua === 'Lech' ? 'status-warning' : ''}">${row.KetQua === 'Lech' ? 'Lệch' : 'Cân bằng'}</span></td>
            <td class="text-center">${row.TrangThai === 'DaDuyet' ? 'Đã duyệt' : 'Chưa cân bằng'}</td>
            <td class="text-center">${Number(row.TongChenhLech) || 0}</td>
            <td class="text-center">
                <button class="action-icon btn-edit" onclick="viewAuditDetails(${row.MaKK})" title="Xem chi tiết"><i class="fa fa-eye"></i></button>
                ${row.TrangThai === 'DaDuyet' ? '' : `<button class="action-icon btn-transfer" onclick="balanceAudit(${row.MaKK})" title="Cân bằng kho"><i class="fa fa-balance-scale"></i></button>`}
            </td>
        </tr>
    `).join('');

    resetAndAttachPager('#auditHistoryTable');
}

async function loadAudits() {
    try {
        const MaKho = document.getElementById('auditWarehouseFilter').value;
        const query = MaKho ? `?MaKho=${MaKho}` : '';
        const response = await fetch(`${API}/audits${query}`);
        auditHistoryData = await response.json();
        renderAuditHistory();
    } catch (error) {
        console.error('Lỗi load audits:', error);
    }
}

function renderAuditTemplate() {
    const tbody = document.querySelector('#auditTemplateTable tbody');
    if (!auditTemplateData.length) {
        tbody.innerHTML = renderEmptyRow(7, 'Không có lô thuốc để kiểm kê');
        resetAndAttachPager('#auditTemplateTable');
        return;
    }

    tbody.innerHTML = auditTemplateData.map((row, index) => `
        <tr>
            <td>${row.TenThuoc}</td>
            <td class="text-center">${row.SoLo}</td>
            <td class="text-center">${row.TenKho || ''}</td>
            <td class="text-center">${Number(row.TonHeThong) || 0}</td>
            <td><input type="number" min="0" class="form-control audit-input" id="auditActual_${index}" value="${Number(row.TonHeThong) || 0}" oninput="updateAuditDiff(${index}, ${Number(row.TonHeThong) || 0})"></td>
            <td class="text-center fw-semibold" id="auditDiff_${index}">0</td>
            <td><input type="text" class="form-control" id="auditReason_${index}" placeholder="Hao hụt, hư hỏng, quên nhập phiếu..."></td>
        </tr>
    `).join('');

    resetAndAttachPager('#auditTemplateTable');
}

function updateAuditDiff(index, systemQty) {
    const actualValue = Number(document.getElementById(`auditActual_${index}`).value) || 0;
    document.getElementById(`auditDiff_${index}`).innerText = actualValue - systemQty;
}

async function openAuditModal() {
    try {
        const MaKho = document.getElementById('auditWarehouseFilter').value;
        const query = MaKho ? `?MaKho=${MaKho}` : '';
        const response = await fetch(`${API}/audit-template${query}`);
        auditTemplateData = await response.json();
        renderAuditTemplate();
        new bootstrap.Modal(document.getElementById('auditCreateModal')).show();
    } catch (error) {
        console.error('Lỗi mở audit modal:', error);
    }
}

async function submitAudit() {
    try {
        const MaKho = document.getElementById('auditWarehouseFilter').value || null;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const details = auditTemplateData.map((row, index) => ({
            MaLo: row.MaLo,
            SoLuongThucTe: Number(document.getElementById(`auditActual_${index}`).value) || 0,
            LyDo: document.getElementById(`auditReason_${index}`).value.trim()
        }));

        await fetch(`${API}/audits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ MaKho, MaNhanVien: user?.MaNV || null, details })
        });

        bootstrap.Modal.getInstance(document.getElementById('auditCreateModal')).hide();
        loadAudits();
    } catch (error) {
        console.error('Lỗi tạo audit:', error);
    }
}

async function viewAuditDetails(id) {
    const response = await fetch(`${API}/audits/${id}`);
    const data = await response.json();
    const tbody = document.querySelector('#auditDetailTable tbody');

    if (!data.length) {
        tbody.innerHTML = renderEmptyRow(6, 'Không có chi tiết kiểm kê');
    } else {
        tbody.innerHTML = data.map((row) => `
            <tr>
                <td>${row.TenThuoc}</td>
                <td class="text-center">${row.SoLo}</td>
                <td class="text-center">${Number(row.SoLuongHeThong) || 0}</td>
                <td class="text-center">${Number(row.SoLuongThucTe) || 0}</td>
                <td class="text-center">${Number(row.ChenhLech) || 0}</td>
                <td>${row.LyDo || ''}</td>
            </tr>
        `).join('');
    }

    resetAndAttachPager('#auditDetailTable');
    new bootstrap.Modal(document.getElementById('auditDetailModal')).show();
}

async function balanceAudit(id) {
    await fetch(`${API}/audits/${id}/balance`, { method: 'POST' });
    await Promise.all([loadAudits(), loadInventory(), loadWarnings()]);
}

async function fetchLotDetail(id) {
    const response = await fetch(`${API}/${id}`);
    currentLotDetail = await response.json();
    return currentLotDetail;
}

function handleRowClick(event, id) {
    if (event.target.closest('button')) return;
    viewDetail(id);
}

async function viewDetail(id) {
    const data = await fetchLotDetail(id);

    document.getElementById('detailContent').innerHTML = `
        <div class="row g-3">
            <div class="col-md-6"><b>Thuốc:</b> ${data.TenThuoc}</div>
            <div class="col-md-6"><b>Đơn vị tính:</b> ${data.DonViCoBan || ''}</div>
            <div class="col-md-6"><b>Hoạt chất:</b> ${data.HoatChat || ''}</div>
            <div class="col-md-6"><b>Hàm lượng:</b> ${data.HamLuong || ''}</div>
            <div class="col-md-6"><b>Dạng:</b> ${data.DangBaoChe || ''}</div>
            <div class="col-md-6"><b>Quy cách:</b> ${data.QuyCach || ''}</div>
            <div class="col-md-6"><b>Tồn hiện tại:</b> ${Number(data.Ton || 0).toLocaleString('vi-VN')}</div>
            <div class="col-md-6"><b>Kho:</b> ${data.TenKho || ''}</div>
            <div class="col-md-6"><b>Nhà cung cấp:</b> ${data.TenNCC || ''}</div>
            <div class="col-md-6"><b>Giá nhập:</b> ${formatMoney(data.GiaNhap)}</div>
            <div class="col-12"><b>Ghi chú:</b> ${data.GhiChu || 'Không có'}</div>
        </div>
    `;

    const historyResponse = await fetch(`${API}/history/${id}`);
    const historyData = await historyResponse.json();
    document.getElementById('historyContent').innerHTML = historyData.length
        ? historyData.map((row) => `<div>${formatDateTime(row.Ngay)} - ${row.SoChungTu || ''} - ${row.DienGiai || ''} - SL: ${row.SoLuong}</div>`).join('')
        : "<div class='text-muted'>Chưa có lịch sử giao dịch</div>";

    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

async function editItem(id) {
    currentLotId = id;
    const data = await fetchLotDetail(id);
    document.getElementById('editLotInfo').innerHTML = `Lô ${data.SoLo} - ${data.TenThuoc}`;
    document.getElementById('editExpiry').value = data.HanSuDung ? new Date(data.HanSuDung).toISOString().slice(0, 10) : '';
    document.getElementById('editPrice').value = Number(data.GiaNhap || 0);
    document.getElementById('editUnit').value = data.DonViCoBan || '';
    document.getElementById('editNote').value = data.GhiChu || '';
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

async function saveEdit() {
    try {
        await fetch(`${API_BATCH}/${currentLotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                HanSuDung: document.getElementById('editExpiry').value,
                GiaNhap: Number(document.getElementById('editPrice').value) || 0
            })
        });

        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        await Promise.all([loadInventory(), loadWarnings()]);
    } catch (error) {
        console.error('Lỗi cập nhật lô:', error);
        alert('Không thể cập nhật thông tin lô');
    }
}

async function transferStock(id) {
    currentLotId = id;
    const data = await fetchLotDetail(id);
    document.getElementById('transferLotInfo').innerHTML = `
        <div><b>Mã lô:</b> ${data.SoLo || ''}</div>
        <div><b>Hạn dùng:</b> ${formatDate(data.HanSuDung)}</div>
        <div><b>Tồn hiện tại:</b> ${Number(data.Ton || 0).toLocaleString('vi-VN')} ${data.DonViCoBan || ''}</div>
    `;
    document.getElementById('transferQty').value = Number(data.Ton || 0);
    document.getElementById('transferQty').max = Number(data.Ton || 0);
    new bootstrap.Modal(document.getElementById('transferModal')).show();
}

async function confirmTransfer() {
    const qty = Number(document.getElementById('transferQty').value) || 0;
    const maxQty = Number(currentLotDetail?.Ton || 0);

    if (qty <= 0) {
        alert('Số lượng điều chuyển phải lớn hơn 0');
        return;
    }

    if (qty > maxQty) {
        alert('Số lượng điều chuyển không được vượt quá số lượng tồn của lô');
        return;
    }

    const response = await fetch(`${API}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            MaLo: currentLotId,
            MaKhoMoi: document.getElementById('transferKho').value,
            SoLuong: qty,
            LyDo: document.getElementById('transferReason').value
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        alert(data.error || data.message || 'Không thể điều chuyển lô thuốc');
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
    await loadInventory();
}

async function deleteItem(id) {
    currentLotId = id;
    const data = await fetchLotDetail(id);
    document.getElementById('deleteQty').value = Number(data.Ton || 0);
    document.getElementById('deleteQty').max = Number(data.Ton || 0);
    document.getElementById('deleteLotInfo').innerText = `Lô ${data.SoLo || ''} - ${data.TenThuoc || ''}`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDelete() {
    const qty = Number(document.getElementById('deleteQty').value) || 0;
    const maxQty = Number(currentLotDetail?.Ton || 0);
    const approver = document.getElementById('deleteApprover').value.trim();
    const documentCode = document.getElementById('deleteDocument').value.trim();

    if (qty <= 0 || qty > maxQty) {
        alert('Số lượng hủy phải lớn hơn 0 và không vượt quá tồn hiện tại');
        return;
    }

    if (!approver && !documentCode) {
        alert('Vui lòng nhập người xác nhận hoặc mã biên bản hủy');
        return;
    }

    await fetch(`${API}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            MaLo: currentLotId,
            SoLuong: qty,
            LyDo: `${document.getElementById('deleteReason').value}${approver ? ` | Người xác nhận: ${approver}` : ''}${documentCode ? ` | Mã biên bản: ${documentCode}` : ''}`
        })
    });

    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    await Promise.all([loadInventory(), loadWarnings(), loadAudits()]);
}

async function fillSelect(url, selectors, placeholder, valueKey, labelKey) {
    const response = await fetch(url);
    const data = await response.json();

    selectors.forEach((selector) => {
        const el = document.getElementById(selector);
        if (!el) return;
        el.innerHTML = `<option value="">${placeholder}</option>` + data.map((item) => `<option value="${item[valueKey]}">${item[labelKey]}</option>`).join('');
    });

    return data;
}

async function loadFilters() {
    await fillSelect(API_KHO, ['warehouseFilter', 'historyWarehouseFilter', 'auditWarehouseFilter', 'transferKho'], 'Tất cả kho', 'MaKho', 'TenKho');
    await fillSelect(API_SUPPLIERS, ['providerFilter'], 'Tất cả NCC', 'MaNCC', 'TenNCC');
    await fillSelect(API_MEDICINES, ['historyMedicineFilter'], 'Tất cả thuốc', 'MaThuoc', 'TenThuoc');
}

function bindRealtimeFilters() {
    document.getElementById('searchInput')?.addEventListener('input', () => scheduleApplyFilter());
    ['warehouseFilter', 'statusFilter', 'providerFilter'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', applyFilter);
    });
    document.getElementById('warningSearchInput')?.addEventListener('input', () => renderWarnings());
    document.getElementById('warningRangeFilter')?.addEventListener('change', renderWarnings);
    document.getElementById('warningStockFilter')?.addEventListener('change', async () => {
        await loadWarnings();
    });
    ['historyMedicineFilter', 'historyWarehouseFilter', 'historyDateFrom', 'historyDateTo'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', () => loadStockCard());
    });
    ['auditWarehouseFilter', 'auditDateFrom', 'auditDateTo'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', () => loadAudits());
    });
}

function bindTabEvents() {
    document.querySelectorAll('#inventoryTabs .nav-link').forEach((tab) => {
        tab.addEventListener('shown.bs.tab', async (event) => {
            const target = event.target.getAttribute('href');
            if (target === '#warning') await loadWarnings();
            if (target === '#history') await loadStockCard();
            if (target === '#audit') await loadAudits();
        });
    });
}

function createImport() {
    window.location.href = 'imports.html';
}

function createExport() {
    window.location.href = 'dispense.html';
}

function downloadTableCsv(tableSelector, fileName) {
    const rows = Array.from(document.querySelectorAll(`${tableSelector} tr`));
    const csv = rows
        .filter((row) => row.style.display !== 'none')
        .map((row) => Array.from(row.children).map((cell) => `"${cell.innerText.replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function exportReport() {
    const activeTab = document.querySelector('#inventoryTabs .nav-link.active')?.getAttribute('href');

    if (activeTab === '#current') {
        const params = buildInventoryParams().toString();
        const url = params ? `${API}/export?${params}` : `${API}/export`;
        window.open(url, '_blank');
        return;
    }

    if (activeTab === '#warning') {
        downloadTableCsv('#nearWarningTable', 'inventory-warning.csv');
        return;
    }

    if (activeTab === '#history') {
        downloadTableCsv('#stockCardTable', 'inventory-stock-card.csv');
        return;
    }

    if (activeTab === '#audit') {
        downloadTableCsv('#auditHistoryTable', 'inventory-audit-history.csv');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadFilters();
    bindRealtimeFilters();
    bindTabEvents();
    await loadInventory();
    await loadWarnings();
    await loadAudits();
});

Object.assign(window, {
    applyFilter,
    loadWarnings,
    loadStockCard,
    loadAudits,
    openAuditModal,
    submitAudit,
    viewAuditDetails,
    balanceAudit,
    createImport,
    createExport,
    exportReport,
    editItem,
    saveEdit,
    transferStock,
    deleteItem,
    confirmTransfer,
    confirmDelete,
    handleRowClick,
    viewDetail,
    updateAuditDiff
});
