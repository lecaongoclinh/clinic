const API = 'http://localhost:3000/api/dispense';

const EXPORT_TYPES = {
    DieuChuyenNoiBo: 'Điều chuyển nội bộ',
    TraNCC: 'Trả nhà cung cấp',
    XuatHuy: 'Xuất hủy',
    VienTro: 'Xuất viện trợ',
    XuatKiemKe: 'Xuất kiểm kê',
    NoiBo: 'Nội bộ (cũ)',
    Huy: 'Hủy (cũ)',
    BanChoBN: 'Cấp phát bệnh nhân'
};

const state = {
    warehouses: [],
    suppliers: [],
    items: [],
    returnLots: [],
    selectedMedicine: null,
    currentDraftId: null
};

function $(id) { return document.getElementById(id); }

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
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function getCurrentUser() {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    return {
        MaNV: stored.MaNV || localStorage.getItem('userId'),
        HoTen: stored.HoTen || localStorage.getItem('fullName') || localStorage.getItem('username') || ''
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Lỗi API');
    return data;
}

function setDefaultNgayXuat() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    $('ngayXuat').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function fillSelect(select, rows, placeholder, valueKey, textKey) {
    select.innerHTML = `<option value="">${placeholder}</option>` +
        rows.map(row => `<option value="${row[valueKey]}">${escapeHtml(row[textKey])}</option>`).join('');
}

async function loadBootstrap() {
    const data = await fetchJson(`${API}/bootstrap`);
    state.warehouses = data.warehouses || [];
    state.suppliers = data.suppliers || [];

    fillSelect($('khoSelect'), state.warehouses, '-- Chọn kho nguồn --', 'MaKho', 'TenKho');
    fillSelect($('khoNhanSelect'), state.warehouses, '-- Chọn kho nhận --', 'MaKho', 'TenKho');
    fillSelect($('supplierSelect'), state.suppliers, '-- Chọn nhà cung cấp --', 'MaNCC', 'TenNCC');
    renderDispenseList(data.recentExports || []);
}

function toggleDynamicFields() {
    const type = $('loaiXuat').value;
    $('targetWarehouseField').classList.toggle('hidden-dynamic', type !== 'DieuChuyenNoiBo');
    $('sourceWarehouseField').className = type === 'DieuChuyenNoiBo' ? 'col-6' : 'col-12';
    $('supplierField').classList.toggle('hidden-dynamic', type !== 'TraNCC');
    $('reasonField').classList.toggle('hidden-dynamic', !['TraNCC', 'XuatHuy', 'XuatKiemKe'].includes(type));
    $('reportField').classList.toggle('hidden-dynamic', type !== 'XuatHuy');
    $('recipientField').classList.toggle('hidden-dynamic', type !== 'VienTro');

    const reasonLabel = {
        TraNCC: 'Lý do trả',
        XuatHuy: 'Lý do hủy',
        XuatKiemKe: 'Lý do kiểm kê'
    }[type] || 'Lý do';
    $('reasonLabel').textContent = reasonLabel;
    $('reasonInput').placeholder = `Nhập ${reasonLabel.toLowerCase()}`;
    updateValueColumnVisibility();
}

function shouldShowValueColumns() {
    return $('loaiXuat').value === 'TraNCC';
}

function updateValueColumnVisibility() {
    document.querySelectorAll('.value-col').forEach(cell => {
        cell.style.display = shouldShowValueColumns() ? '' : 'none';
    });
}

function clearTypeSpecificFields() {
    $('khoNhanSelect').value = '';
    $('supplierSelect').value = '';
    $('reasonInput').value = '';
    $('bienBanInput').value = '';
    $('recipientInput').value = '';
}

function clearMedicineSelection() {
    state.items = [];
    state.returnLots = [];
    state.selectedMedicine = null;
    $('cartTable').innerHTML = '';
    $('searchInput').value = '';
    $('unitSelect').innerHTML = '';
    $('quantity').value = '';
    $('realQty').value = '';
    $('medicineList').innerHTML = '';
    $('medicineList').style.display = 'none';
}

async function searchMedicine() {
    const keyword = $('searchInput').value.trim();
    const maKho = $('khoSelect').value;
    const type = $('loaiXuat').value;
    const maNCC = $('supplierSelect').value;
    const box = $('medicineList');

    if (!maKho) {
        alert('Vui lòng chọn kho nguồn trước');
        return;
    }
    if (type === 'TraNCC' && !maNCC) {
        alert('Vui lòng chọn nhà cung cấp trước khi tìm thuốc trả');
        return;
    }
    if (!keyword) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    const params = new URLSearchParams({ search: keyword, MaKho: maKho });
    if (type === 'TraNCC') params.set('MaNCC', maNCC);
    const data = await fetchJson(type === 'TraNCC'
        ? `${API}/return-lots?${params.toString()}`
        : `${API}/catalog?${params.toString()}`);
    box.style.display = 'block';
    if (type === 'TraNCC') {
        state.returnLots = data;
        box.innerHTML = data.length ? data.map((lot, index) => `
            <div class="item" onclick="selectReturnLot(${index})">
                <strong>${escapeHtml(lot.TenThuoc)}</strong> |
                <span>${escapeHtml(lot.SoLo || '')}</span> |
                <span>HSD ${formatDate(lot.HanSuDung)}</span> |
                <span>còn ${Number(lot.Ton || 0)}</span>
            </div>
        `).join('') : '<div class="p-2">Không có lô thuốc còn tồn của nhà cung cấp này trong kho nguồn</div>';
        return;
    }
    box.innerHTML = data.length ? data.map(item => {
        const ten = String(item.TenThuoc || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const donVi = String(item.DonViCoBan || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        return `
            <div class="item" onclick="selectMedicine(${item.MaThuoc}, '${ten}', '${donVi}')">
                <strong>${escapeHtml(item.TenThuoc)}</strong><br>
                <small>${escapeHtml(item.HoatChat || '')}</small><br>
                <span style="font-size:12px;color:#666">Tồn: ${item.TongTon || 0} ${escapeHtml(item.DonViCoBan || '')} | FEFO: ${formatDate(item.HanGanNhat)}</span>
            </div>
        `;
    }).join('') : '<div class="p-2">Không tìm thấy thuốc còn tồn ở kho nguồn</div>';
}

async function selectMedicine(maThuoc, tenThuoc, donViCoBan) {
    state.selectedMedicine = { MaThuoc: maThuoc, TenThuoc: tenThuoc, DonViCoBan: donViCoBan || '' };
    $('searchInput').value = tenThuoc;

    try {
        const units = await fetchJson(`http://localhost:3000/api/quy-doi?MaThuoc=${maThuoc}`);
        $('unitSelect').innerHTML = units.length
            ? units.map(item => `<option value="${item.SoLuong}">${escapeHtml(item.TenDonVi)}</option>`).join('')
            : '<option value="1">Đơn vị cơ bản</option>';
        calcRealQty();
    } catch {
        $('unitSelect').innerHTML = '<option value="1">Đơn vị cơ bản</option>';
        calcRealQty();
    }

    $('medicineList').style.display = 'none';
}

async function selectReturnLot(index) {
    const lot = state.returnLots[index];
    if (!lot) return;

    state.selectedMedicine = {
        MaThuoc: lot.MaThuoc,
        MaLo: lot.MaLo,
        TenThuoc: lot.TenThuoc,
        DonViCoBan: lot.DonViCoBan || '',
        lot
    };
    $('searchInput').value = `${lot.TenThuoc} | ${lot.SoLo}`;

    try {
        const units = await fetchJson(`http://localhost:3000/api/quy-doi?MaThuoc=${lot.MaThuoc}`);
        $('unitSelect').innerHTML = units.length
            ? units.map(item => `<option value="${item.SoLuong}">${escapeHtml(item.TenDonVi)}</option>`).join('')
            : '<option value="1">Đơn vị cơ bản</option>';
        calcRealQty();
    } catch {
        $('unitSelect').innerHTML = '<option value="1">Đơn vị cơ bản</option>';
        calcRealQty();
    }

    $('medicineList').style.display = 'none';
}

function calcRealQty() {
    const qty = Number($('quantity').value || 0);
    const ratio = Number($('unitSelect').value || 1);
    $('realQty').value = qty * ratio || '';
}

async function addMedicine() {
    if (!state.selectedMedicine) return alert('Chưa chọn thuốc');
    if (!$('khoSelect').value) return alert('Vui lòng chọn kho nguồn');
    if ($('loaiXuat').value === 'TraNCC' && !$('supplierSelect').value) {
        return alert('Vui lòng chọn nhà cung cấp trước khi thêm thuốc trả');
    }

    const soLuongNhap = Number($('quantity').value || 0);
    const soLuongThuc = Number($('realQty').value || 0);
    if (soLuongNhap <= 0 || soLuongThuc <= 0) return alert('Số lượng phải lớn hơn 0');

    try {
        if ($('loaiXuat').value === 'TraNCC') {
            const lot = state.selectedMedicine.lot;
            if (!lot?.MaLo) throw new Error('Vui lòng chọn chính xác lô cần trả');
            if (soLuongThuc > Number(lot.Ton || 0)) throw new Error('Số lượng trả vượt tồn lô');
            const donGia = Number(lot.GiaNhap || 0);
            const allocation = {
                MaLo: lot.MaLo,
                MaThuoc: lot.MaThuoc,
                MaKho: lot.MaKho,
                MaNCC: lot.MaNCC,
                SoLo: lot.SoLo,
                HanSuDung: lot.HanSuDung,
                NgaySanXuat: lot.NgaySanXuat,
                Ton: Number(lot.Ton || 0),
                SoLuongXuat: soLuongThuc,
                GiaNhap: donGia,
                DonGia: donGia,
                ThanhTien: soLuongThuc * donGia
            };

            state.items.push({
                MaThuoc: lot.MaThuoc,
                MaLo: lot.MaLo,
                TenThuoc: lot.TenThuoc,
                SoLuongNhap: soLuongNhap,
                DonViNhap: $('unitSelect').selectedOptions[0]?.text || '',
                SoLuong: soLuongThuc,
                DonViCoBan: lot.DonViCoBan || state.selectedMedicine.DonViCoBan || '',
                DonGia: donGia,
                ThanhTien: allocation.ThanhTien,
                allocations: [allocation]
            });

            renderTable();
            $('quantity').value = '';
            $('realQty').value = '';
            $('searchInput').value = '';
            $('unitSelect').innerHTML = '';
            state.selectedMedicine = null;
            return;
        }

        const params = new URLSearchParams({ MaKho: $('khoSelect').value, SoLuong: String(soLuongThuc) });
        const preview = await fetchJson(`${API}/catalog/${state.selectedMedicine.MaThuoc}/preview?${params.toString()}`);
        const totalAllocated = (preview.allocations || []).reduce((sum, lot) => sum + Number(lot.SoLuongXuat || 0), 0);
        if (totalAllocated < soLuongThuc) throw new Error('Không đủ tồn kho để xuất');

        const allocations = (preview.allocations || []).map(allocation => {
            const donGia = Number(allocation.GiaNhap || allocation.DonGia || 0);
            return {
                ...allocation,
                DonGia: donGia,
                ThanhTien: Number(allocation.SoLuongXuat || 0) * donGia
            };
        });
        const thanhTien = allocations.reduce((sum, allocation) => sum + Number(allocation.ThanhTien || 0), 0);

        state.items.push({
            ...preview,
            allocations,
            MaThuoc: state.selectedMedicine.MaThuoc,
            TenThuoc: state.selectedMedicine.TenThuoc,
            SoLuongNhap: soLuongNhap,
            DonViNhap: $('unitSelect').selectedOptions[0]?.text || '',
            SoLuong: soLuongThuc,
            DonViCoBan: state.selectedMedicine.DonViCoBan || '',
            DonGia: allocations[0]?.DonGia || 0,
            ThanhTien: thanhTien
        });

        renderTable();
        $('quantity').value = '';
        $('realQty').value = '';
        $('searchInput').value = '';
        $('unitSelect').innerHTML = '';
        state.selectedMedicine = null;
    } catch (error) {
        alert(error.message || 'Không đủ tồn để xuất');
    }
}

function renderTable() {
    updateValueColumnVisibility();
    const tbody = $('cartTable');
    if (!state.items.length) {
        tbody.innerHTML = '';
        return;
    }

    tbody.innerHTML = state.items.map((item, index) => {
        const allocations = item.allocations || [];
        const lotHtml = allocations.map(a => `<div style="font-size:12px">${escapeHtml(a.SoLo || '')}</div>`).join('');
        const hsdHtml = allocations.map(a => `<div style="font-size:12px">${formatDate(a.HanSuDung)}</div>`).join('');
        const tonHtml = allocations.map(a => `<div style="font-size:12px">${Number(a.Ton || 0)}</div>`).join('');
        const qtyHtml = allocations.map(a => `<div style="font-size:12px">${Number(a.SoLuongXuat || 0)}</div>`).join('');
        const valueCells = shouldShowValueColumns()
            ? `
                <td class="text-end value-col">${allocations.map(a => `<div style="font-size:12px">${formatMoney(a.DonGia || a.GiaNhap || 0)}</div>`).join('')}</td>
                <td class="text-end value-col">${allocations.map(a => `<div style="font-size:12px">${formatMoney(a.ThanhTien || 0)}</div>`).join('')}</td>
            `
            : '';

        return `
            <tr>
                <td><strong>${escapeHtml(item.TenThuoc)}</strong></td>
                <td>${lotHtml}</td>
                <td>${hsdHtml}</td>
                <td class="text-center">${tonHtml}</td>
                <td class="text-center">${qtyHtml}</td>
                <td class="text-center">${escapeHtml(item.DonViCoBan || '')}</td>
                <td class="text-center">${Number(item.SoLuongNhap || item.SoLuong || 0)} ${escapeHtml(item.DonViNhap || item.DonViCoBan || '')} = ${Number(item.SoLuong || 0)} ${escapeHtml(item.DonViCoBan || '')}</td>
                ${valueCells}
                <td class="text-center"><button class="btn btn-sm btn-danger" onclick="removeItem(${index})">Xóa</button></td>
            </tr>
        `;
    }).join('');
}

function removeItem(index) {
    state.items.splice(index, 1);
    renderTable();
}

function validateForm() {
    const type = $('loaiXuat').value;
    if (!state.items.length) throw new Error('Chưa có thuốc trong phiếu');
    if (!$('khoSelect').value) throw new Error('Vui lòng chọn kho nguồn');
    if (type === 'DieuChuyenNoiBo' && !$('khoNhanSelect').value) throw new Error('Vui lòng chọn kho nhận');
    if (type === 'DieuChuyenNoiBo' && $('khoNhanSelect').value === $('khoSelect').value) throw new Error('Kho nhận phải khác kho nguồn');
    if (type === 'TraNCC' && !$('supplierSelect').value) throw new Error('Vui lòng chọn nhà cung cấp');
    if (['TraNCC', 'XuatHuy', 'XuatKiemKe'].includes(type) && !$('reasonInput').value.trim()) throw new Error('Vui lòng nhập lý do');
    if (type === 'XuatHuy' && !$('bienBanInput').value.trim()) throw new Error('Vui lòng nhập mã biên bản kiểm kê');
    if (type === 'VienTro' && !$('recipientInput').value.trim()) throw new Error('Vui lòng nhập đơn vị nhận');
}

function getPayload() {
    validateForm();
    const user = getCurrentUser();
    if (!user.MaNV) throw new Error('Thiếu thông tin nhân viên');

    return {
        MaPX: state.currentDraftId,
        MaNhanVien: user.MaNV,
        MaNhanVienXuat: user.MaNV,
        MaDuocSi: user.MaNV,
        MaKho: $('khoSelect').value,
        MaKhoNhan: $('khoNhanSelect').value || null,
        TenKhoNhan: $('khoNhanSelect').selectedOptions[0]?.text || '',
        LoaiXuat: $('loaiXuat').value,
        MaNCC: $('supplierSelect').value || null,
        TenNCC: $('supplierSelect').selectedOptions[0]?.text || '',
        LyDo: $('reasonInput').value.trim(),
        BienBanKiemKe: $('bienBanInput').value.trim(),
        DonViNhan: $('recipientInput').value.trim(),
        NgayXuat: $('ngayXuat').value,
        GhiChu: $('ghiChu').value.trim(),
        items: state.items
    };
}

async function saveDraft() {
    try {
        const data = await fetchJson(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getPayload())
        });
        state.currentDraftId = data.MaPX;
        $('draftCode').textContent = data.SoPhieu || `PX-${data.MaPX}`;
        alert('Đã lưu phiếu tạm');
    } catch (error) {
        alert(error.message);
    }
}

async function complete() {
    try {
        if (!state.currentDraftId) {
            const draft = await fetchJson(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getPayload())
            });
            state.currentDraftId = draft.MaPX;
        }
        await fetchJson(`${API}/${state.currentDraftId}/complete`, { method: 'POST' });
        alert('Hoàn thành phiếu xuất kho');
        resetForm();
        await loadBootstrap();
    } catch (error) {
        alert(error.message || 'Không thể hoàn thành phiếu xuất');
    }
}

async function submitDispense() {
    await complete();
}

function resetForm() {
    state.currentDraftId = null;
    $('draftCode').textContent = '';
    clearMedicineSelection();
    $('ghiChu').value = '';
    clearTypeSpecificFields();
    setDefaultNgayXuat();
    toggleDynamicFields();
}

function parseNote(raw) {
    try {
        const parsed = raw ? JSON.parse(raw) : null;
        return {
            note: parsed?.note || raw || '',
            meta: parsed?.meta || {}
        };
    } catch {
        return { note: raw || '', meta: {} };
    }
}

function getCounterparty(row, meta) {
    if (row.LoaiXuat === 'DieuChuyenNoiBo') return meta.TenKhoNhan || `Kho #${meta.MaKhoNhan || ''}` || '—';
    if (row.LoaiXuat === 'TraNCC') return meta.TenNCC || '—';
    if (row.LoaiXuat === 'VienTro') return meta.DonViNhan || '—';
    if (row.LoaiXuat === 'XuatHuy') return '';
    if (row.LoaiXuat === 'XuatKiemKe') return '';
    return row.TenBenhNhan || '—';
}

function renderDispenseList(list) {
    const tbody = document.querySelector('#dispenseTable tbody');
    const filtered = (list || []).filter(row => row.LoaiXuat !== 'BanChoBN');
    tbody.innerHTML = filtered.length ? filtered.map(row => {
        const parsed = parseNote(row.GhiChu);
        return `
            <tr>
                <td class="text-center">PX-${String(row.MaPX).padStart(5, '0')}</td>
                <td class="text-center">${escapeHtml(EXPORT_TYPES[row.LoaiXuat] || row.LoaiXuat || '')}</td>
                <td>${escapeHtml(row.TenKho || '')}</td>
                <td>${escapeHtml(getCounterparty(row, parsed.meta))}</td>
                <td class="text-center">${formatDateTime(row.NgayXuat)}</td>
                <td>${escapeHtml(row.TenDuocSi || row.TenNhanVienXuat || row.TenNhanVien || '')}</td>
                <td class="text-center">${escapeHtml(row.TrangThai || '')}</td>
                <td class="text-end">${formatMoney(row.TongTien || 0)}</td>
                <td>${escapeHtml(parsed.meta?.LyDo || parsed.note || '')}</td>
                <td class="text-center">
                    <div class="dispense-actions">
                        <button class="btn btn-sm btn-outline-primary dispense-action-btn" onclick="viewExportDetail(${row.MaPX})">Xem</button>
                        <button class="btn btn-sm btn-outline-secondary dispense-action-btn" onclick="window.print()">In</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="10" class="text-center text-muted">Chưa có phiếu xuất kho</td></tr>';
    window.TablePager?.reset('#dispenseTable');
    window.TablePager?.attach('#dispenseTable', { pageSize: 6 });
}

function renderExportDetailItems(items = []) {
    if (!items.length) {
        return '<tr><td colspan="6" class="text-center text-muted">Phiếu chưa có dòng thuốc</td></tr>';
    }

    return items.map(item => {
        const allocations = item.allocations?.length ? item.allocations : [item];
        return allocations.map((allocation, index) => `
            <tr>
                ${index === 0 ? `<td rowspan="${allocations.length}">${escapeHtml(item.TenThuoc || '')}</td>` : ''}
                <td>${escapeHtml(allocation.SoLo || item.SoLo || '')}</td>
                <td class="text-center">${formatDate(allocation.HanSuDung || item.HanSuDung)}</td>
                <td class="text-center">${Number(allocation.SoLuongXuat || item.SoLuong || 0)}</td>
                <td class="text-end">${formatMoney(allocation.DonGia || item.DonGia || 0)}</td>
                <td class="text-end">${formatMoney(allocation.ThanhTien || item.ThanhTien || 0)}</td>
            </tr>
        `).join('');
    }).join('');
}

async function viewExportDetail(maPX) {
    try {
        const data = await fetchJson(`${API}/${maPX}`);
        const meta = data.Meta || {};
        $('exportDetailTitle').textContent = data.SoPhieu || `PX-${String(data.MaPX).padStart(5, '0')}`;
        $('exportDetailInfo').innerHTML = `
            <div><strong>Loại xuất:</strong> ${escapeHtml(EXPORT_TYPES[data.LoaiXuat] || data.LoaiXuat || '')}</div>
            <div><strong>Kho nguồn:</strong> ${escapeHtml(data.TenKho || '')}</div>
            <div><strong>Ngày xuất:</strong> ${formatDateTime(data.NgayXuat)}</div>
            <div><strong>Bác sĩ kê đơn:</strong> ${escapeHtml(data.TenBacSiKeDon || '')}</div>
            <div><strong>Thời gian kê đơn:</strong> ${formatDateTime(data.NgayKeDon)}</div>
            <div><strong>Dược sĩ cấp phát:</strong> ${escapeHtml(data.TenDuocSi || data.TenNhanVienXuat || data.TenNhanVien || '')}</div>
            <div><strong>Thời gian cấp phát:</strong> ${formatDateTime(data.NgayXuat)}</div>
            <div><strong>Trạng thái:</strong> ${escapeHtml(data.TrangThai || '')}</div>
            <div><strong>Ghi chú:</strong> ${escapeHtml(data.GhiChuText || meta.LyDo || '')}</div>
        `;
        $('exportDetailItems').innerHTML = renderExportDetailItems(data.items || []);
        new bootstrap.Modal($('exportDetailModal')).show();
    } catch (error) {
        alert(error.message || 'Không thể tải chi tiết phiếu xuất');
    }
}

function bindEvents() {
    $('loaiXuat').addEventListener('change', () => {
        clearTypeSpecificFields();
        clearMedicineSelection();
        toggleDynamicFields();
    });
    $('khoSelect').addEventListener('change', clearMedicineSelection);
    $('supplierSelect').addEventListener('change', () => {
        if ($('loaiXuat').value === 'TraNCC') clearMedicineSelection();
    });
    $('addMedicineBtn').addEventListener('click', addMedicine);
    $('saveDraftBtn').addEventListener('click', saveDraft);
    $('completeBtn').addEventListener('click', complete);
    $('printBtn').addEventListener('click', () => window.print());
    $('cancelBtn').addEventListener('click', resetForm);
    $('quantity').addEventListener('input', calcRealQty);
    $('unitSelect').addEventListener('change', calcRealQty);

    let timer;
    $('searchInput').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(searchMedicine, 300);
    });
}

async function init() {
    const username = getCurrentUser().HoTen;
    if (username) {
        const side = document.getElementById('usernameSidebar');
        const nav = document.getElementById('usernameNavbar');
        if (side) side.textContent = username;
        if (nav) nav.textContent = username;
    }
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

Object.assign(window, { removeItem, selectMedicine, selectReturnLot, submitDispense, viewExportDetail });
