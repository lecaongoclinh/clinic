const API_SERVICES = 'http://localhost:3000/api/services';

const state = {
    services: [],
    packages: [],
    configs: [],
    specialties: [],
    filtered: [],
    activeTab: 'services',
    editingId: null,
    editingPackageId: null,
    modal: null,
    packageModal: null,
    configModal: null,
    advancedModal: null,
    advancedFilters: {
        giaTu: '',
        giaDen: '',
        maChuyenKhoa: '',
        canDatTruoc: '',
        canChiDinhBacSi: ''
    }
};

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function mapLoaiText(loai) {
    if (loai === 'KhamBenh') return 'Khám bệnh';
    if (loai === 'XetNghiem') return 'Xét nghiệm';
    if (loai === 'SieuAm') return 'Siêu âm';
    return loai || 'Chưa phân loại';
}

function mapLoaiTagClass(loai) {
    if (loai === 'KhamBenh') return 'tag-blue';
    if (loai === 'XetNghiem') return 'tag-orange';
    if (loai === 'SieuAm') return 'tag-purple';
    return 'tag-blue';
}

function getStatusInfo(value) {
    const active = value === true || value === 1 || value === '1' || value === undefined || value === null;
    return active
        ? { text: 'Đang áp dụng', className: 'status-active' }
        : { text: 'Ngừng áp dụng', className: 'status-inactive' };
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Lỗi API');
    return data;
}

function renderStats(list) {
    const total = list.length;
    const active = list.filter(item => item.TrangThai === true || item.TrangThai === 1 || item.TrangThai === '1' || item.TrangThai == null).length;
    const avg = total ? Math.round(list.reduce((sum, item) => sum + Number(item.Gia || 0), 0) / total) : 0;

    const groupCount = {};
    list.forEach(item => {
        const key = mapLoaiText(item.Loai);
        groupCount[key] = (groupCount[key] || 0) + 1;
    });

    let topGroup = '-';
    let topCount = 0;

    Object.keys(groupCount).forEach(key => {
        if (groupCount[key] > topCount) {
            topCount = groupCount[key];
            topGroup = key;
        }
    });

    document.getElementById('totalServices').textContent = total;
    document.getElementById('activeServices').textContent = active;
    document.getElementById('topGroup').textContent = topGroup;
    document.getElementById('topGroupNote').textContent = topCount ? `${topCount} dịch vụ trong nhóm này` : 'Chưa có dữ liệu';
    document.getElementById('avgPrice').textContent = formatMoney(avg);
}

function renderTable(list) {
    const tbody = document.getElementById('servicesTableBody');
    const summary = document.getElementById('tableSummary');

    if (!tbody || !summary) return;

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">Không có dữ liệu dịch vụ</td>
            </tr>
        `;
        summary.textContent = 'Không có dịch vụ phù hợp';
        return;
    }

    tbody.innerHTML = list.map(item => {
        const status = getStatusInfo(item.TrangThai);
        return `
            <tr>
                <td><div class="service-code">${item.MaDV || ('DV-' + String(item.MaDichVu).padStart(3, '0'))}</div></td>
                <td>
                    <div class="service-name">${item.TenDichVu || ''}</div>
                    <div class="service-sub">${item.MoTa || 'Dịch vụ lâm sàng của phòng khám'}</div>
                </td>
                <td><span class="tag-pill ${mapLoaiTagClass(item.Loai)}">${mapLoaiText(item.Loai)}</span></td>
                <td class="fw-bold">${formatMoney(item.Gia)}</td>
                <td>${item.MoTa || 'Chưa cập nhật mô tả'}</td>
                <td><span class="status-dot ${status.className}">${status.text}</span></td>
                <td class="text-center action-cell">
                    <div class="action-group">
                        <button class="action-btn" title="Sửa" onclick="editService(${item.MaDichVu})">
                            <i class="fa fa-pen"></i>
                        </button>
                        <button class="action-btn" title="Xóa" onclick="deleteService(${item.MaDichVu})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="action-btn" title="Cấu hình" onclick="openConfigModal(${item.MaDichVu})">
                            <i class="fa fa-cog"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    summary.textContent = `Hiển thị ${list.length} / ${state.services.length} dịch vụ`;
}

function renderPackages(list) {
    const wrapMain = document.getElementById('packagesGrid');
    const wrapTab = document.getElementById('packagesGridTab');

    const html = !list.length
        ? `<div class="text-muted px-2">Chưa có gói dịch vụ</div>`
        : list.map(item => `
            <div class="col-lg-6">
                <div class="package-card">
                    <div class="d-flex gap-3">
                        <div class="package-image">
                            <i class="fa ${item.BieuTuong || 'fa-heartbeat'}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="package-name">${item.TenGoi}</div>
                            <div class="package-price">${formatMoney(item.GiaGoi)}</div>
                            <div class="package-meta">
                                <span class="meta-pill">${item.SoDichVu || 0} dịch vụ</span>
                                <span class="meta-pill">${item.TrangThai == 1 ? 'Đang áp dụng' : 'Ngừng áp dụng'}</span>
                            </div>
                            <div class="service-sub mb-2">${item.MoTa || 'Chưa có mô tả gói dịch vụ'}</div>
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-light package-btn" onclick="editPackage(${item.MaGoi})">Sửa gói</button>
                                <button class="btn btn-light package-btn" onclick="deletePackage(${item.MaGoi})">Xóa gói</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    if (wrapMain) wrapMain.innerHTML = html;
    if (wrapTab) wrapTab.innerHTML = html;
}

function renderConfigs(list) {
    const tbody = document.getElementById('configsTableBody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">Chưa có cấu hình dịch vụ</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(item => `
        <tr>
            <td>${item.MaDV || ''}</td>
            <td>${item.TenDichVu || ''}</td>
            <td>${item.ThoiLuongPhut || 15} phút</td>
            <td>${Number(item.CanDatTruoc) === 1 ? 'Có' : 'Không'}</td>
            <td>${Number(item.CanChiDinhBacSi) === 1 ? 'Có' : 'Không'}</td>
            <td>${item.TenChuyenKhoa || 'Chưa gán'}</td>
            <td class="text-center">
                <button class="action-btn" onclick="openConfigModal(${item.MaDichVu})" title="Sửa cấu hình">
                    <i class="fa fa-pen"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function applyFilter() {
    const keyword = (
        document.getElementById('tableSearchInput')?.value.trim() ||
        document.getElementById('headerSearchInput')?.value.trim() ||
        ''
    ).toLowerCase();

    const type = document.getElementById('typeFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    state.filtered = state.services.filter(item => {
        const matchesKeyword = !keyword || [
            item.MaDV,
            item.TenDichVu,
            item.Loai,
            item.MoTa,
            item.TenChuyenKhoa
        ].filter(Boolean).join(' ').toLowerCase().includes(keyword);

        const matchesType = !type || item.Loai === type;

        const itemStatus = (item.TrangThai === true || item.TrangThai === 1 || item.TrangThai === '1' || item.TrangThai == null) ? '1' : '0';
        const matchesStatus = !status || itemStatus === status;

        const gia = Number(item.Gia || 0);
        const matchesGiaTu = !state.advancedFilters.giaTu || gia >= Number(state.advancedFilters.giaTu);
        const matchesGiaDen = !state.advancedFilters.giaDen || gia <= Number(state.advancedFilters.giaDen);
        const matchesChuyenKhoa = !state.advancedFilters.maChuyenKhoa || Number(item.MaChuyenKhoa) === Number(state.advancedFilters.maChuyenKhoa);
        const matchesDatTruoc = state.advancedFilters.canDatTruoc === '' || Number(item.CanDatTruoc || 0) === Number(state.advancedFilters.canDatTruoc);
        const matchesChiDinh = state.advancedFilters.canChiDinhBacSi === '' || Number(item.CanChiDinhBacSi || 0) === Number(state.advancedFilters.canChiDinhBacSi);

        return matchesKeyword && matchesType && matchesStatus && matchesGiaTu && matchesGiaDen && matchesChuyenKhoa && matchesDatTruoc && matchesChiDinh;
    });

    renderStats(state.filtered.length ? state.filtered : state.services);
    renderTable(state.filtered);
}

async function loadDashboard() {
    const data = await fetchJson(`${API_SERVICES}/dashboard`);
    state.services = Array.isArray(data.services) ? data.services : [];
    state.packages = Array.isArray(data.packages) ? data.packages : [];
    state.configs = Array.isArray(data.configs) ? data.configs : [];
    state.specialties = Array.isArray(data.specialties) ? data.specialties : [];
    state.filtered = [...state.services];

    renderStats(state.services);
    renderTable(state.filtered);
    renderPackages(state.packages);
    renderConfigs(state.configs);
    renderSpecialtyOptions();
    renderPackageServiceOptions();
}

function renderSpecialtyOptions() {
    const select = document.getElementById('advMaChuyenKhoa');
    const configSelect = document.getElementById('ConfigMaChuyenKhoa');
    if (select) {
        select.innerHTML = `<option value="">Tất cả chuyên khoa</option>` +
            state.specialties.map(item => `<option value="${item.MaChuyenKhoa}">${item.TenChuyenKhoa}</option>`).join('');
    }
    if (configSelect) {
        configSelect.innerHTML = `<option value="">Chưa gán chuyên khoa</option>` +
            state.specialties.map(item => `<option value="${item.MaChuyenKhoa}">${item.TenChuyenKhoa}</option>`).join('');
    }
}

function renderPackageServiceOptions(selected = []) {
    const wrap = document.getElementById('packageServiceOptions');
    if (!wrap) return;

    wrap.innerHTML = state.services.map(item => `
        <div class="form-check">
            <input class="form-check-input package-service-checkbox" type="checkbox" value="${item.MaDichVu}" id="pkg_service_${item.MaDichVu}"
                ${selected.includes(Number(item.MaDichVu)) ? 'checked' : ''}>
            <label class="form-check-label" for="pkg_service_${item.MaDichVu}">
                ${item.MaDV} - ${item.TenDichVu}
            </label>
        </div>
    `).join('');
}

function openCreateModal() {
    state.editingId = null;
    document.getElementById('serviceModalTitle').textContent = 'Thêm dịch vụ';
    document.getElementById('TenDichVu').value = '';
    document.getElementById('Loai').value = 'KhamBenh';
    document.getElementById('Gia').value = '';
    document.getElementById('TrangThai').value = '1';
    document.getElementById('MoTa').value = '';
    state.modal.show();
}

function findById(id) {
    return state.services.find(item => Number(item.MaDichVu) === Number(id));
}

window.editService = function (id) {
    const item = findById(id);
    if (!item) return;

    state.editingId = id;
    document.getElementById('serviceModalTitle').textContent = 'Cập nhật dịch vụ';
    document.getElementById('TenDichVu').value = item.TenDichVu || '';
    document.getElementById('Loai').value = item.Loai || 'KhamBenh';
    document.getElementById('Gia').value = item.Gia || '';
    document.getElementById('TrangThai').value = (item.TrangThai === false || item.TrangThai === 0 || item.TrangThai === '0') ? '0' : '1';
    document.getElementById('MoTa').value = item.MoTa || '';
    state.modal.show();
};

window.deleteService = async function (id) {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này không?')) return;

    try {
        await fetchJson(`${API_SERVICES}/${id}`, { method: 'DELETE' });
        await loadDashboard();
        applyFilter();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể xóa dịch vụ');
    }
};

async function saveService() {
    const payload = {
        TenDichVu: document.getElementById('TenDichVu').value.trim(),
        Loai: document.getElementById('Loai').value,
        Gia: Number(document.getElementById('Gia').value || 0),
        TrangThai: Number(document.getElementById('TrangThai').value),
        MoTa: document.getElementById('MoTa').value.trim()
    };

    if (!payload.TenDichVu) {
        alert('Vui lòng nhập tên dịch vụ');
        return;
    }

    if (payload.Gia < 0) {
        alert('Giá dịch vụ không hợp lệ');
        return;
    }

    try {
        if (state.editingId) {
            await fetchJson(`${API_SERVICES}/${state.editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            await fetchJson(API_SERVICES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        state.modal.hide();
        await loadDashboard();
        applyFilter();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể lưu dịch vụ');
    }
}

function openAdvancedFilterModal() {
    document.getElementById('advGiaTu').value = state.advancedFilters.giaTu || '';
    document.getElementById('advGiaDen').value = state.advancedFilters.giaDen || '';
    document.getElementById('advMaChuyenKhoa').value = state.advancedFilters.maChuyenKhoa || '';
    document.getElementById('advCanDatTruoc').value = state.advancedFilters.canDatTruoc || '';
    document.getElementById('advCanChiDinhBacSi').value = state.advancedFilters.canChiDinhBacSi || '';
    state.advancedModal.show();
}

function applyAdvancedFilters() {
    state.advancedFilters = {
        giaTu: document.getElementById('advGiaTu').value,
        giaDen: document.getElementById('advGiaDen').value,
        maChuyenKhoa: document.getElementById('advMaChuyenKhoa').value,
        canDatTruoc: document.getElementById('advCanDatTruoc').value,
        canChiDinhBacSi: document.getElementById('advCanChiDinhBacSi').value
    };
    state.advancedModal.hide();
    applyFilter();
}

function resetAdvancedFilters() {
    state.advancedFilters = {
        giaTu: '',
        giaDen: '',
        maChuyenKhoa: '',
        canDatTruoc: '',
        canChiDinhBacSi: ''
    };
    applyFilter();
}

function setActiveTab(tabName) {
    state.activeTab = tabName;

    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    const servicesSection = document.getElementById('servicesSection');
    const packagesSection = document.getElementById('packagesSection');
    const configsSection = document.getElementById('configsSection');
    const packagePreviewSection = document.getElementById('packagePreviewSection');

    if (servicesSection) servicesSection.style.display = tabName === 'services' ? '' : 'none';
    if (packagesSection) packagesSection.style.display = tabName === 'packages' ? '' : 'none';
    if (configsSection) configsSection.style.display = tabName === 'configs' ? '' : 'none';
    if (packagePreviewSection) packagePreviewSection.style.display = tabName === 'services' ? '' : 'none';
}

window.editPackage = async function (id) {
    try {
        const data = await fetchJson(`${API_SERVICES}/packages/${id}`);
        state.editingPackageId = id;

        document.getElementById('packageModalTitle').textContent = 'Cập nhật gói dịch vụ';
        document.getElementById('TenGoi').value = data.TenGoi || '';
        document.getElementById('GiaGoi').value = data.GiaGoi || 0;
        document.getElementById('TrangThaiGoi').value = Number(data.TrangThai || 1);
        document.getElementById('MoTaGoi').value = data.MoTa || '';
        document.getElementById('MauHienThi').value = data.MauHienThi || '';
        document.getElementById('BieuTuong').value = data.BieuTuong || '';

        renderPackageServiceOptions((data.ChiTiet || []).map(item => Number(item.MaDichVu)));
        state.packageModal.show();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể tải gói dịch vụ');
    }
};

window.deletePackage = async function (id) {
    if (!confirm('Bạn có chắc muốn xóa gói dịch vụ này không?')) return;

    try {
        await fetchJson(`${API_SERVICES}/packages/${id}`, { method: 'DELETE' });
        await loadDashboard();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể xóa gói dịch vụ');
    }
};

function openCreatePackageModal() {
    state.editingPackageId = null;
    document.getElementById('packageModalTitle').textContent = 'Thêm gói dịch vụ';
    document.getElementById('TenGoi').value = '';
    document.getElementById('GiaGoi').value = '';
    document.getElementById('TrangThaiGoi').value = '1';
    document.getElementById('MoTaGoi').value = '';
    document.getElementById('MauHienThi').value = '';
    document.getElementById('BieuTuong').value = 'fa-heartbeat';
    renderPackageServiceOptions([]);
    state.packageModal.show();
}

async function savePackage() {
    const selectedServices = [...document.querySelectorAll('.package-service-checkbox:checked')]
        .map(item => Number(item.value));

    const payload = {
        TenGoi: document.getElementById('TenGoi').value.trim(),
        GiaGoi: Number(document.getElementById('GiaGoi').value || 0),
        TrangThai: Number(document.getElementById('TrangThaiGoi').value || 1),
        MoTa: document.getElementById('MoTaGoi').value.trim(),
        MauHienThi: document.getElementById('MauHienThi').value.trim(),
        BieuTuong: document.getElementById('BieuTuong').value.trim(),
        DichVuIds: selectedServices,
        ChiTiet: selectedServices.map(id => ({ MaDichVu: id, SoLuong: 1, GhiChu: '' }))
    };

    if (!payload.TenGoi) {
        alert('Vui lòng nhập tên gói dịch vụ');
        return;
    }

    if (!selectedServices.length) {
        alert('Vui lòng chọn ít nhất 1 dịch vụ cho gói');
        return;
    }

    try {
        if (state.editingPackageId) {
            await fetchJson(`${API_SERVICES}/packages/${state.editingPackageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            await fetchJson(`${API_SERVICES}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        state.packageModal.hide();
        await loadDashboard();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể lưu gói dịch vụ');
    }
}

window.openConfigModal = async function (serviceId) {
    try {
        const data = await fetchJson(`${API_SERVICES}/configs/${serviceId}`);

        document.getElementById('configServiceId').value = data.MaDichVu;
        document.getElementById('configServiceName').textContent = `${data.MaDV || ''} - ${data.TenDichVu || ''}`;
        document.getElementById('ConfigThoiLuongPhut').value = data.ThoiLuongPhut || 15;
        document.getElementById('ConfigCanDatTruoc').value = Number(data.CanDatTruoc || 0);
        document.getElementById('ConfigCanChiDinhBacSi').value = Number(data.CanChiDinhBacSi || 0);
        document.getElementById('ConfigHuongDanTruocKham').value = data.HuongDanTruocKham || '';
        document.getElementById('ConfigThuTuHienThi').value = data.ThuTuHienThi || 0;
        document.getElementById('ConfigMauNhan').value = data.MauNhan || '';
        document.getElementById('ConfigMaChuyenKhoa').value = data.MaChuyenKhoa || '';

        state.configModal.show();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể tải cấu hình dịch vụ');
    }
};

async function saveConfig() {
    const serviceId = document.getElementById('configServiceId').value;

    const payload = {
        ThoiLuongPhut: Number(document.getElementById('ConfigThoiLuongPhut').value || 15),
        CanDatTruoc: Number(document.getElementById('ConfigCanDatTruoc').value || 0),
        CanChiDinhBacSi: Number(document.getElementById('ConfigCanChiDinhBacSi').value || 0),
        HuongDanTruocKham: document.getElementById('ConfigHuongDanTruocKham').value.trim(),
        ThuTuHienThi: Number(document.getElementById('ConfigThuTuHienThi').value || 0),
        MauNhan: document.getElementById('ConfigMauNhan').value.trim(),
        MaChuyenKhoa: document.getElementById('ConfigMaChuyenKhoa').value || null
    };

    try {
        await fetchJson(`${API_SERVICES}/configs/${serviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        state.configModal.hide();
        await loadDashboard();
        applyFilter();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Không thể lưu cấu hình dịch vụ');
    }
}

function bindEvents() {
    document.getElementById('createServiceBtn')?.addEventListener('click', openCreateModal);
    document.getElementById('saveServiceBtn')?.addEventListener('click', saveService);

    document.getElementById('typeFilter')?.addEventListener('change', applyFilter);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilter);
    document.getElementById('tableSearchInput')?.addEventListener('input', applyFilter);
    document.getElementById('headerSearchInput')?.addEventListener('input', applyFilter);

    document.getElementById('advancedFilterBtn')?.addEventListener('click', openAdvancedFilterModal);
    document.getElementById('applyAdvancedFilterBtn')?.addEventListener('click', applyAdvancedFilters);
    document.getElementById('resetAdvancedFilterBtn')?.addEventListener('click', resetAdvancedFilters);

    document.getElementById('createPackageBtn')?.addEventListener('click', openCreatePackageModal);
    document.getElementById('savePackageBtn')?.addEventListener('click', savePackage);
    document.getElementById('saveConfigBtn')?.addEventListener('click', saveConfig);
document.getElementById('createPackageBtnSecondary')?.addEventListener('click', openCreatePackageModal);
    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
    });
}

async function init() {
    state.modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    state.packageModal = new bootstrap.Modal(document.getElementById('packageModal'));
    state.configModal = new bootstrap.Modal(document.getElementById('configModal'));
    state.advancedModal = new bootstrap.Modal(document.getElementById('advancedFilterModal'));

    bindEvents();

    try {
        await loadDashboard();
        setActiveTab('services');
    } catch (error) {
        console.error(error);
        alert('Không thể tải dữ liệu dịch vụ');
    }
}

document.addEventListener('DOMContentLoaded', init);

Object.assign(window, {
    editService,
    deleteService,
    editPackage,
    deletePackage,
    openConfigModal
});