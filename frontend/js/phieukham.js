// ── Constants ──────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:3000/api';

const role        = Number(localStorage.getItem('role'));
const canManage   = role === 1 || role === 3;            // admin / lễ tân
const isDoctor    = role === 2;
const currentUserId = Number(localStorage.getItem('userId')) || getUserIdFromToken();

// ── State ───────────────────────────────────────────────────────────────────
let allTickets      = [];     // toàn bộ phiếu từ API
let filteredTickets = [];     // sau khi search
let currentPage     = 1;
const PAGE_SIZE     = 9;

let selectedPatient     = null;
let selectedAppointment = null;
let doctorRequestId     = 0;
let searchTimeout       = null;
let benhanModal         = null;
let createModal         = null;
let kedonModal          = null;
let examModal           = null;
let serviceResultModal  = null;
let currentExamTicket   = null;
let currentExamState    = null;
let serviceAddPanelOpen = true;
let medicineAddPanelOpen = true;

let selectedMedicines   = [];
let clinicalServices    = [];
let selectedServices    = [];

// ── Helpers ─────────────────────────────────────────────────────────────────
function getUserIdFromToken() {
    try {
        const p = (localStorage.getItem('token') || '').split('.')[1];
        if (!p) return null;
        return Number(JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))).id);
    } catch { return null; }
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

function setModalSearchError(message = '') {
    const inp = document.getElementById('modalSearchInput');
    const err = document.getElementById('modalSearchError');
    if (inp) inp.classList.toggle('is-invalid', Boolean(message));
    if (err) {
        err.textContent = message;
        err.style.display = message ? 'block' : 'none';
    }
}

function validateModalSearchInput() {
    const inp = document.getElementById('modalSearchInput');
    if (!inp) return true;

    const raw = inp.value;
    const digits = raw.replace(/\D/g, '');
    if (raw !== digits) {
        inp.value = digits;
        setModalSearchError('Chỉ được nhập số CCCD, không nhập họ tên.');
        const res = document.getElementById('modalSearchResults');
        if (res) {
            res.style.display = 'none';
            res.innerHTML = '';
        }
        return false;
    }

    setModalSearchError('');
    return true;
}

function showToast(type, msg, ms = 3500) {
    let box = document.querySelector('.toast-container');
    if (!box) {
        box = Object.assign(document.createElement('div'), {
            className: 'toast-container position-fixed top-0 end-0 p-3'
        });
        document.body.appendChild(box);
    }
    const bg = type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger';
    const t  = document.createElement('div');
    t.className = `toast align-items-center text-white bg-${bg} border-0`;
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    box.appendChild(t);
    new bootstrap.Toast(t).show();
    setTimeout(() => t.remove(), ms);
}

function fmtDT(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return '—';
    return d.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtDate(v) {
    if (!v) return '—';
    const text = String(v).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [y, m, d] = text.split('-');
        return `${d}/${m}/${y}`;
    }
    const date = new Date(v);
    return isNaN(date) ? '—' : date.toLocaleDateString('vi-VN');
}
function formatCurrency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + ' đ';
}
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? jsonHeaders() : authHeaders()),
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Không thể xử lý yêu cầu');
    }
    return data;
}
function statusLabel(s) {
    return { ChoKham:'Đang chờ', WAITING:'Đang chờ', DangKham:'Đang khám', IN_PROGRESS:'Đang khám',
             DaKham:'Đã khám', DONE:'Đã khám', BoVe:'Bỏ khám', CANCELLED:'Bỏ khám' }[s] || s;
}
function statusClass(s) {
    if (['ChoKham','WAITING'].includes(s))     return 'status-chokham';
    if (['DangKham','IN_PROGRESS'].includes(s)) return 'status-dangkham';
    if (['DaKham','DONE'].includes(s))          return 'status-dakham';
    return 'status-cancelled';
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) { window.location.href = 'signin.html'; return; }

    // Date label
    const dateLabel = document.getElementById('dateLabel');
    if (dateLabel) {
        dateLabel.textContent = 'Ngày ' + new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    }

    // Username
    const uname = localStorage.getItem('fullName') || localStorage.getItem('username') || (isDoctor ? 'Bác sĩ' : 'Lễ tân');
    ['usernameSidebar','navbarUserName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = uname;
    });

    // Nút tạo phiếu
    const btnCreateTicket = document.getElementById('btnCreateTicket');
    if (canManage && btnCreateTicket) btnCreateTicket.style.display = '';

    // Modals
    const benhanModalEl = document.getElementById('benhanModal');
    if (benhanModalEl) benhanModal = new bootstrap.Modal(benhanModalEl);
    
    const createTicketModalEl = document.getElementById('createTicketModal');
    if (createTicketModalEl) createModal = new bootstrap.Modal(createTicketModalEl);
    
    const kedonModalEl = document.getElementById('kedonModal');
    if (kedonModalEl) kedonModal = new bootstrap.Modal(kedonModalEl);
    
    const examModalEl = document.getElementById('examModal');
    if (examModalEl) {
        examModal = new bootstrap.Modal(examModalEl);
        examModalEl.addEventListener('hidden.bs.modal', () => {
            currentExamTicket = null;
            currentExamState = null;
            selectedServices = [];
            selectedMedicines = [];
            serviceAddPanelOpen = true;
            medicineAddPanelOpen = true;
        });
    }
    
    const serviceResultModalEl = document.getElementById('serviceResultModal');
    if (serviceResultModalEl) serviceResultModal = new bootstrap.Modal(serviceResultModalEl);

    // Search
    const inp = document.getElementById('searchInput');
    const clr = document.getElementById('clearSearch');
    if (inp && clr) {
        inp.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            clr.style.display = inp.value ? '' : 'none';
            searchTimeout = setTimeout(() => { currentPage = 1; applyFilter(); }, 280);
        });
        clr.addEventListener('click', () => {
            inp.value = ''; clr.style.display = 'none';
            currentPage = 1; applyFilter();
        });
    }

    // Modal search thuốc
    ['ex_kd_searchThuoc', 'kd_searchThuoc'].forEach((id) => {
        const searchThuocInp = document.getElementById(id);
        if (!searchThuocInp) return;
        searchThuocInp.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchMedicines, 300);
        });
    });

    // Modal search dịch vụ
    const searchServiceInp = document.getElementById('ex_searchService');
    if (searchServiceInp) {
        searchServiceInp.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchServices, 300);
        });
    }

    // Modal search (bệnh nhân)
    const modalSearchInput = document.getElementById('modalSearchInput');
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            if (!validateModalSearchInput()) return;
            searchTimeout = setTimeout(modalSearchPatients, 300);
        });
    }
    const modalSearchBtn = document.getElementById('modalSearchBtn');
    if (modalSearchBtn) {
        modalSearchBtn.addEventListener('click', () => {
            clearTimeout(searchTimeout);
            if (!validateModalSearchInput()) return;
            modalSearchPatients();
        });
    }

    loadWaitingList();
});

// ── Load phiếu khám ──────────────────────────────────────────────────────────
async function loadWaitingList() {
    const grid = document.getElementById('ticketGrid');
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">
        <i class="fa fa-spinner fa-spin fa-2x mb-2"></i><br>Đang tải...</div>`;

    try {
        const url = isDoctor && currentUserId
            ? `${API_BASE_URL}/tickets/waiting?maBacSi=${currentUserId}`
            : `${API_BASE_URL}/tickets/waiting`;

        const res  = await fetch(url, { headers: authHeaders() });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Lỗi tải dữ liệu');

        allTickets = data.data || [];
        currentPage = 1;
        applyFilter();
    } catch (e) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger"><i class="fa fa-exclamation-triangle me-2"></i>${e.message}</div>`;
    }
}

// ── Filter + Render ───────────────────────────────────────────────────────────
function applyFilter() {
    const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    filteredTickets = q
        ? allTickets.filter(t =>
            (t.TenBenhNhan || '').toLowerCase().includes(q) ||
            (t.SoCCCD      || '').toLowerCase().includes(q) ||
            (t.MaPhieu     || '').toLowerCase().includes(q))
        : [...allTickets];

    updateStats();
    renderPage();
}

function updateStats() {
    const all = allTickets;
    document.getElementById('cntTotal').textContent      = all.length;
    document.getElementById('cntWaiting').textContent    = all.filter(t => ['ChoKham','WAITING'].includes(t.TrangThai)).length;
    document.getElementById('cntInProgress').textContent = all.filter(t => ['DangKham','IN_PROGRESS'].includes(t.TrangThai)).length;
    document.getElementById('cntDone').textContent       = all.filter(t => ['DaKham','DONE'].includes(t.TrangThai)).length;
    document.getElementById('waitingCount')?.style && (document.getElementById('waitingCount').textContent = all.length);
}

function renderPage() {
    const grid  = document.getElementById('ticketGrid');
    const total = filteredTickets.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;

    const slice = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (!slice.length) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">
            <i class="fa fa-inbox fa-3x mb-3 d-block"></i>
            ${allTickets.length ? 'Không tìm thấy phiếu khám phù hợp' : 'Chưa có phiếu khám nào hôm nay'}</div>`;
    } else {
        grid.innerHTML = slice.map(renderCard).join('');
    }

    renderPagination(total, pages);
}

function renderCard(t) {
    const isWaiting    = ['ChoKham','WAITING'].includes(t.TrangThai);
    const isInProgress = ['DangKham','IN_PROGRESS'].includes(t.TrangThai);
    const isDone       = ['DaKham','DONE'].includes(t.TrangThai);
    const isCancelled  = ['BoVe','CANCELLED'].includes(t.TrangThai);
    const canCancel    = canManage && isWaiting;

    const ticketData = encodeURIComponent(JSON.stringify(t));

    // ── Nút thao tác cho bác sĩ ──
    let actionBtn = '';
    if (isDoctor) {
        if (isWaiting) {
            actionBtn = `<button class="btn btn-sm btn-primary" onclick="startExam(${t.MaPK})">
                <i class="fa fa-stethoscope me-1"></i>Vào khám</button>`;
        } else if (isInProgress) {
            actionBtn = `<button class="btn btn-sm btn-success" onclick="openExamModal('${ticketData}')">
                <i class="fa fa-notes-medical me-1"></i>Khám bệnh</button>`;
        } else if (isDone) {
            actionBtn = `<button class="btn btn-sm btn-secondary" disabled>
                <i class="fa fa-check me-1"></i>Đã khám</button>`;
        }
    }

    return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="ticket-card card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <div class="stt-badge">${String(t.STT || '—').padStart(2,'0')}</div>
            <div>
              <div class="fw-bold fs-6">${t.TenBenhNhan || '—'}</div>
              <small style="opacity:.8">${t.MaPhieu || t.MaPK}</small>
            </div>
          </div>
          <span class="status-badge badge ${statusClass(t.TrangThai)}">${['BoVe','CANCELLED'].includes(t.TrangThai) ? 'Bỏ khám' : statusLabel(t.TrangThai)}</span>
        </div>
        <div class="card-body">
          <div class="info-row"><i class="fa fa-id-card"></i><span>CCCD: <b>${t.SoCCCD || '—'}</b></span></div>
          <div class="info-row"><i class="fa fa-phone"></i><span>${t.SoDienThoai || '—'}</span></div>
          <div class="info-row"><i class="fa fa-stethoscope"></i><span>${t.TenChuyenKhoa || '—'}</span></div>
          <div class="info-row"><i class="fa fa-door-open"></i><span>${t.TenPhong || '—'}</span></div>
          <div class="info-row"><i class="fa fa-clock"></i><span>${fmtDT(t.ThoiGianTaoHienThi || t.ThoiGianTao)}</span></div>
          ${isDoctor ? '' : `<div class="info-row"><i class="fa fa-user-md"></i><span>${t.TenBacSi || '—'}</span></div>`}
        </div>
        <div class="card-footer">
          ${actionBtn}
          ${canCancel ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelTicket(${t.MaPK})">
              <i class="fa fa-sign-out-alt me-1"></i>Bỏ khám</button>` : ''}
          ${isCancelled ? `<span class="text-muted small"><i class="fa fa-ban me-1"></i>Đã bỏ khám</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderPagination(total, pages) {
    const area = document.getElementById('paginationArea');
    const list = document.getElementById('paginationList');
    const info = document.getElementById('pageInfo');

    area.style.display = total > 0 ? '' : 'none';
    info.textContent = `Hiển thị ${Math.min((currentPage-1)*PAGE_SIZE+1, total)}–${Math.min(currentPage*PAGE_SIZE, total)} / ${total} phiếu`;

    if (pages <= 1) { list.innerHTML = ''; return; }

    let html = `<li class="page-item ${currentPage===1?'disabled':''}">
        <a class="page-link" href="#" onclick="goPage(${currentPage-1});return false">‹</a></li>`;

    for (let p = 1; p <= pages; p++) {
        if (pages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== pages) {
            if (p === 2 || p === pages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            continue;
        }
        html += `<li class="page-item ${p===currentPage?'active':''}">
            <a class="page-link" href="#" onclick="goPage(${p});return false">${p}</a></li>`;
    }

    html += `<li class="page-item ${currentPage===pages?'disabled':''}">
        <a class="page-link" href="#" onclick="goPage(${currentPage+1});return false">›</a></li>`;
    list.innerHTML = html;
}

function goPage(p) {
    const pages = Math.ceil(filteredTickets.length / PAGE_SIZE);
    if (p < 1 || p > pages) return;
    currentPage = p;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Modal Khám xong / Bệnh án ─────────────────────────────────────────────────
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '—';
}

function setTabSaved(id, saved) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = saved ? 'Đã lưu' : 'Chưa lưu';
    el.className = `badge ms-1 ${saved ? 'bg-success' : 'bg-secondary'}`;
}

function getCurrentExamStatus() {
    return currentExamState?.ticket?.TrangThai || currentExamTicket?.TrangThai || '';
}

function isCurrentExamInProgress() {
    return ['DangKham', 'IN_PROGRESS'].includes(getCurrentExamStatus());
}

function setServiceAddPanelVisible(visible) {
    const hasRecord = Boolean(currentExamState?.medicalRecord?.MaBA);
    const canAdd = isCurrentExamInProgress() && !hasRecord;
    
    serviceAddPanelOpen = canAdd && Boolean(visible);
    
    const panel = document.getElementById('ex_serviceAddPanel');
    if (panel) {
        panel.querySelectorAll('input').forEach(inp => inp.disabled = !canAdd);
    }

    const addCol = document.getElementById('ex_serviceAddCol');
    const listCol = document.getElementById('ex_serviceListCol');
    const btnShow = document.getElementById('ex_btnShowServiceAdd');
    const warning = document.getElementById('ex_serviceNeedsNoRecord');
    
    if (warning) {
        warning.style.display = (isCurrentExamInProgress() && hasRecord) ? '' : 'none';
    }

    if (addCol && listCol) {
        if (serviceAddPanelOpen) {
            addCol.style.display = '';
            listCol.className = 'col-md-7';
            if (btnShow) btnShow.style.display = 'none';
        } else {
            addCol.style.display = 'none';
            listCol.className = 'col-md-12';
            if (btnShow) btnShow.style.display = canAdd ? '' : 'none';
        }
    }
    
    renderSelectedServices();
}

function showServiceAddPanel() {
    if (!isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm chỉ định');
        return;
    }
    if (currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Bệnh án đã được lưu, không thể thêm chỉ định mới');
        return;
    }
    setServiceAddPanelVisible(true);
}

function setMedicineAddPanelVisible(visible) {
    const hasBA = Boolean(currentExamState?.medicalRecord?.MaBA);
    const canAdd = isCurrentExamInProgress() && hasBA;
    
    medicineAddPanelOpen = canAdd && Boolean(visible);
    const panel = document.getElementById('ex_medicineAddPanel');
    if (panel) {
        panel.querySelectorAll('input').forEach(inp => inp.disabled = !canAdd);
        const res = document.getElementById('ex_kd_searchResult');
        if (!hasBA && res) {
            res.innerHTML = '<div class="alert alert-warning py-2 small">Cần lưu bệnh án trước khi kê đơn</div>';
        }
    }

    const addCol = document.getElementById('ex_medicineAddCol');
    const listCol = document.getElementById('ex_medicineListCol');
    const btnShow = document.getElementById('ex_btnShowMedicineAdd');

    if (addCol && listCol) {
        if (medicineAddPanelOpen) {
            addCol.style.display = '';
            listCol.className = 'col-md-7';
            if (btnShow) btnShow.style.display = 'none';
        } else {
            addCol.style.display = 'none';
            listCol.className = 'col-md-12';
            if (btnShow) btnShow.style.display = canAdd ? '' : 'none';
        }
    }

    renderSelectedMedicines();
}

function showMedicineAddPanel() {
    if (!isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm thuốc');
        return;
    }
    if (!currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Cần lưu bệnh án trước khi kê đơn thuốc');
        return;
    }
    setMedicineAddPanelVisible(true);
}

async function openExamModal(encodedData) {
    currentExamTicket = JSON.parse(decodeURIComponent(encodedData));
    currentExamState = null;
    document.getElementById('ex_loading').style.display = '';
    document.getElementById('ex_content').style.display = 'none';
    setText('ex_subtitle', `${currentExamTicket.MaPhieu || currentExamTicket.MaPK} - ${currentExamTicket.TenBenhNhan || ''}`);
    examModal.show();

    try {
        await Promise.all([
            loadClinicalServices(),
            loadExamWorkspace(currentExamTicket.MaPK)
        ]);
    } catch (error) {
        showToast('error', error.message);
    }
}

async function loadExamWorkspace(maPK) {
    const data = await fetchJson(`${API_BASE_URL}/medical-records/ticket/${maPK}/workspace`);
    currentExamState = data;
    currentExamTicket = data.ticket || currentExamTicket;

    renderExamHeader();
    renderExamForms();
    renderExamCompletionState();

    document.getElementById('ex_loading').style.display = 'none';
    document.getElementById('ex_content').style.display = '';
}

function renderExamHeader() {
    const t = currentExamState?.ticket || currentExamTicket || {};
    setText('ex_subtitle', `${t.MaPhieu || t.MaPK || '—'} - ${t.TenBenhNhan || '—'}`);
    setText('ex_tenBN', t.TenBenhNhan || '—');
    setText('ex_cccd', t.SoCCCD || t.MaBN || '—');
    setText('ex_phone', t.SoDienThoai || '—');
    setText('ex_dob', fmtDate(t.NgaySinh));
    setText('ex_gender', t.GioiTinh || '—');
    setText('ex_maPhieu', t.MaPhieu || t.MaPK || '—');
    setText('ex_stt', String(t.STT || '—').padStart(2, '0'));
    setText('ex_chuyenKhoa', t.TenChuyenKhoa || '—');
    setText('ex_phong', t.TenPhong || '—');
    setText('ex_bacSi', t.TenBacSi || '—');
    const status = document.getElementById('ex_status');
    if (status) {
        status.textContent = statusLabel(t.TrangThai);
        status.className = `badge ${statusClass(t.TrangThai)}`;
    }
}

function renderExamForms() {
    const record = currentExamState?.medicalRecord || null;
    const hasRecord = Boolean(record?.MaBA);
    const canEditExam = isCurrentExamInProgress();
    const recordLocked = hasRecord || !canEditExam;
    
    document.getElementById('ex_ba_maPK').value = currentExamTicket?.MaPK || '';
    document.getElementById('ex_ba_trieuChung').value = record?.TrieuChung || '';
    document.getElementById('ex_ba_chuanDoan').value = record?.ChuanDoan || '';
    document.getElementById('ex_ba_ghiChu').value = record?.GhiChu || '';
    document.getElementById('ex_benhanForm').classList.remove('was-validated');
    
    ['ex_ba_trieuChung', 'ex_ba_chuanDoan', 'ex_ba_ghiChu'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.readOnly = recordLocked;
    });
    
    const btnSubmitRecord = document.getElementById('ex_btnSubmitBenhan');
    if (btnSubmitRecord) btnSubmitRecord.style.display = recordLocked ? 'none' : '';
    
    const savedNotice = document.getElementById('ex_ba_savedNotice');
    if (savedNotice) {
        savedNotice.textContent = hasRecord
            ? 'Bệnh án đã được lưu. Thông tin bên dưới chỉ để xem lại.'
            : 'Phiếu khám đã kết thúc, không thể tạo hoặc thay đổi bệnh án.';
        savedNotice.style.display = recordLocked ? '' : 'none';
    }

    selectedServices = (currentExamState?.orderedServices || []).map((item) => ({
        MaDichVu: item.MaDichVu,
        TenDichVu: item.TenDichVu || item.TenMuc,
        Loai: item.LoaiDichVu || '',
        Gia: Number(item.DonGia || item.SoTien || 0),
        SoLuong: Number(item.SoLuong || 1),
        KetQua: item.KetQua || item.KetQuaDichVu || '',
        IsSaved: true
    }));
    const searchService = document.getElementById('ex_searchService');
    const searchServiceResult = document.getElementById('ex_searchServiceResult');
    if (searchService) searchService.value = '';
    if (searchServiceResult) searchServiceResult.innerHTML = '<div class="list-group-item text-muted text-center py-4">Nhập tên để tìm dịch vụ</div>';
    
    const hasSavedServices = selectedServices.some(s => s.IsSaved);
    setServiceAddPanelVisible(canEditExam && !hasSavedServices);

    selectedMedicines = (currentExamState?.prescriptionItems || []).map((item) => ({
        MaThuoc: item.MaThuoc,
        TenThuoc: item.TenThuoc,
        HoatChat: item.HoatChat || '',
        DonViCoBan: item.DonViCoBan || '',
        TongTon: item.TonKhoQuay ?? item.TongTon ?? '',
        inputSoLuong: Number(item.SoLuongKe || item.SoLuong || 1),
        inputLieuDung: item.LieuDung || item.CachDung || '',
        IsSaved: true
    }));
    const searchThuoc = document.getElementById('ex_kd_searchThuoc');
    const searchResult = document.getElementById('ex_kd_searchResult');
    if (searchThuoc) searchThuoc.value = '';
    if (searchResult) searchResult.innerHTML = '<div class="list-group-item text-muted text-center py-4">Nhập tên để tìm thuốc</div>';
    
    const hasSavedMedicines = selectedMedicines.some(m => m.IsSaved);
    setMedicineAddPanelVisible(canEditExam && !hasSavedMedicines);
}

function renderExamCompletionState() {
    const hasServices = Boolean(currentExamState?.orderedServices?.length);
    const hasRecord = Boolean(currentExamState?.medicalRecord?.MaBA);
    const hasPrescription = Boolean(currentExamState?.prescription?.MaDT && currentExamState?.prescriptionItems?.length);
    const canEditExam = isCurrentExamInProgress();

    setTabSaved('ex_tabServicesStatus', hasServices);
    setTabSaved('ex_tabRecordStatus', hasRecord);
    setTabSaved('ex_tabPrescriptionStatus', hasPrescription);

    const warning = document.getElementById('ex_prescriptionNeedsRecord');
    if (warning) warning.style.display = !canEditExam || hasRecord ? 'none' : '';
    const btnKedon = document.getElementById('ex_btnSubmitKedon');
    if (btnKedon) btnKedon.disabled = !canEditExam || !hasRecord;
    const btnFinish = document.getElementById('ex_btnFinishExam');
    if (btnFinish) btnFinish.style.display = canEditExam ? '' : 'none';
}

async function loadClinicalServices() {
    if (clinicalServices.length) return;
    try {
        const payload = await fetchJson(`${API_BASE_URL}/services/clinical/all`);
        clinicalServices = Array.isArray(payload) ? payload : (payload.data || []);
    } catch (error) {
        console.error('Lỗi tải dịch vụ:', error);
    }
}

async function searchServices() {
    if (currentExamTicket?.MaPK && !isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm chỉ định');
        return;
    }
    if (currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Bệnh án đã được lưu, không thể thêm chỉ định mới');
        return;
    }
    const input = document.getElementById('ex_searchService');
    const resDiv = document.getElementById('ex_searchServiceResult');
    if (!input || !resDiv) return;
    const kw = input.value.trim().toLowerCase();
    if (!kw) {
        resDiv.innerHTML = '<div class="list-group-item text-muted text-center py-4">Nhập tên để tìm dịch vụ</div>';
        return;
    }

    const filtered = clinicalServices.filter(s =>
        s.TenDichVu.toLowerCase().includes(kw) ||
        (s.Loai && s.Loai.toLowerCase().includes(kw))
    );

    if (!filtered.length) {
        resDiv.innerHTML = '<div class="list-group-item text-muted">Không tìm thấy dịch vụ</div>';
        return;
    }

    resDiv.innerHTML = filtered.map(s => `
        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            onclick='selectService(${JSON.stringify(s).replace(/'/g, "&apos;")})'>
            <div>
                <strong>${s.TenDichVu}</strong><br>
                <small class="text-muted">Loại: ${s.Loai || '—'} | Giá: ${formatCurrency(s.Gia)}</small>
            </div>
            <i class="fa fa-plus-circle text-primary"></i>
        </button>
    `).join('');
}

function selectService(s) {
    if (!isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm chỉ định');
        return;
    }
    if (currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Bệnh án đã được lưu, không thể thêm chỉ định mới');
        return;
    }
    const existingSaved = selectedServices.find((item) =>
        Number(item.MaDichVu) === Number(s.MaDichVu) && item.IsSaved
    );
    if (existingSaved) {
        showToast('warning', 'Dịch vụ này đã được chỉ định');
        return;
    }

    const existingDraft = selectedServices.find((item) =>
        Number(item.MaDichVu) === Number(s.MaDichVu) && !item.IsSaved
    );
    if (existingDraft) {
        existingDraft.SoLuong += 1;
    } else {
        selectedServices.push({
            MaDichVu: s.MaDichVu,
            TenDichVu: s.TenDichVu,
            Loai: s.Loai,
            Gia: Number(s.Gia || 0),
            SoLuong: 1,
            KetQua: '',
            IsSaved: false
        });
    }
    renderSelectedServices();
}

function removeSelectedService(index) {
    if (selectedServices[index]?.IsSaved) return;
    selectedServices.splice(index, 1);
    renderSelectedServices();
}

function updateSelectedServiceQty(index, value) {
    if (!selectedServices[index]) return;
    if (selectedServices[index].IsSaved) return;
    selectedServices[index].SoLuong = Math.max(Number(value || 1), 1);
    renderSelectedServices();
}

function renderSelectedServices() {
    const list = document.getElementById('ex_serviceOrderList');
    const totalEl = document.getElementById('ex_serviceOrderTotal');
    const total = selectedServices.reduce((sum, item) => sum + Number(item.Gia || 0) * Number(item.SoLuong || 1), 0);
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (!list) return;
    const canEdit = serviceAddPanelOpen;

    if (!selectedServices.length) {
        list.innerHTML = '<div class="border rounded p-3 text-muted text-center">Chưa có dịch vụ/xét nghiệm nào được chỉ định</div>';
        return;
    }

    list.innerHTML = `
        <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th>Dịch vụ</th>
                    <th class="text-center">Loại</th>
                    <th class="text-center" style="width:100px">SL</th>
                    <th class="text-end">Đơn giá</th>
                    <th class="text-end">T.Tiền</th>
                    <th class="text-center" style="width:100px">K.Quả</th>
                    <th class="text-center" style="width:100px">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${selectedServices.map((item, index) => {
                    const thanhTien = Number(item.Gia || 0) * Number(item.SoLuong || 1);
                    const hasResult = Boolean((item.KetQua || '').trim());
                    const canEditRow = canEdit && !item.IsSaved;
                    const qtyCell = canEditRow
                        ? `<input type="number" class="form-control form-control-sm" min="1" value="${item.SoLuong}" onchange="updateSelectedServiceQty(${index}, this.value)">`
                        : `<span class="fw-semibold">${Number(item.SoLuong || 1)}</span>`;
                    const removeBtn = canEditRow
                        ? `<button type="button" class="btn btn-outline-danger" onclick="removeSelectedService(${index})" title="Xóa chỉ định"><i class="fa fa-trash"></i></button>`
                        : '';
                    return `
                        <tr>
                            <td>${escapeHtml(item.TenDichVu)}</td>
                            <td class="text-center">${escapeHtml(item.Loai || '')}</td>
                            <td class="text-center">${qtyCell}</td>
                            <td class="text-end">${formatCurrency(item.Gia)}</td>
                            <td class="text-end fw-semibold">${formatCurrency(thanhTien)}</td>
                            <td class="text-center">
                                <span class="badge ${hasResult ? 'bg-success' : 'bg-secondary'}">${hasResult ? 'Đã có' : 'Chưa có'}</span>
                            </td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button type="button" class="btn btn-outline-info" onclick="viewServiceResult(${index})">
                                        <i class="fa fa-eye me-1"></i>Xem
                                    </button>
                                    ${removeBtn}
                                </div>
                            </td>
                        </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function viewServiceResult(index) {
    const item = selectedServices[index];
    if (!item) return;

    const resultText = (item.KetQua || '').trim();
    const statusText = resultText ? 'Đã có kết quả' : 'Chưa có kết quả';
    const body = document.getElementById('serviceResultBody');
    setText('serviceResultTitle', item.TenDichVu || 'Dịch vụ cận lâm sàng');
    if (body) {
        body.innerHTML = `
            <div class="table-responsive mb-3">
                <table class="table table-bordered align-middle mb-0">
                    <tbody>
                        <tr>
                            <th class="table-light" style="width:180px">Dịch vụ</th>
                            <td>${escapeHtml(item.TenDichVu || '—')}</td>
                        </tr>
                        <tr>
                            <th class="table-light">Loại</th>
                            <td>${escapeHtml(item.Loai || '—')}</td>
                        </tr>
                        <tr>
                            <th class="table-light">Số lượng</th>
                            <td>${Number(item.SoLuong || 1)}</td>
                        </tr>
                        <tr>
                            <th class="table-light">Đơn giá</th>
                            <td>${formatCurrency(item.Gia)}</td>
                        </tr>
                        <tr>
                            <th class="table-light">Trạng thái</th>
                            <td><span class="badge ${resultText ? 'bg-success' : 'bg-secondary'}">${statusText}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <label class="form-label fw-semibold">Kết quả</label>
            <div class="border rounded p-3 bg-light" style="min-height:96px">
                ${resultText ? escapeHtml(resultText).replace(/\n/g, '<br>') : '<span class="text-muted">Chưa có kết quả được nhập cho dịch vụ này.</span>'}
            </div>
        `;
    }
    serviceResultModal?.show();
}

async function submitServices() {
    if (!currentExamTicket?.MaPK) {
        showToast('warning', 'Không xác định được phiếu khám đang lưu');
        return;
    }
    if (!isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm chỉ định');
        return;
    }
    if (!selectedServices.length) {
        showToast('warning', 'Vui lòng chọn ít nhất một dịch vụ/xét nghiệm');
        return;
    }
    if (!selectedServices.some((item) => !item.IsSaved)) {
        showToast('warning', 'Chưa có chỉ định mới để lưu');
        return;
    }

    const btn = document.getElementById('ex_btnSubmitServices');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang lưu...';
    try {
        await fetchJson(`${API_BASE_URL}/invoices/visits/${currentExamTicket.MaPK}/services`, {
            method: 'POST',
            body: JSON.stringify({
                MaNhanVien: currentUserId,
                MaBA: currentExamState?.medicalRecord?.MaBA || null,
                Replace: true,
                ChiTietDichVu: selectedServices.map((item) => ({
                    MaDichVu: item.MaDichVu,
                    SoLuong: item.SoLuong
                }))
            })
        });
        showToast('success', 'Đã lưu chỉ định dịch vụ');
        await loadExamWorkspace(currentExamTicket.MaPK);
    } catch (error) {
        showToast('error', error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-1"></i>Lưu chỉ định';
    }
}

async function finishExam() {
    if (!currentExamTicket?.MaPK) return;
    const missing = [];
    if (!currentExamState?.orderedServices?.length) missing.push('chỉ định');
    if (!currentExamState?.medicalRecord?.MaBA) missing.push('bệnh án');
    if (!(currentExamState?.prescription?.MaDT && currentExamState?.prescriptionItems?.length)) missing.push('đơn thuốc');

    if (missing.length) {
        const ok = confirm(`Các phần sau chưa được lưu: ${missing.join(', ')}. Bác sĩ có chắc chắn muốn kết thúc khám không?`);
        if (!ok) return;
    }

    const btn = document.getElementById('ex_btnFinishExam');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang lưu...';
    try {
        const data = await fetchJson(`${API_BASE_URL}/tickets/${currentExamTicket.MaPK}/done`, {
            method: 'PATCH'
        });
        if (data.success === false) throw new Error(data.message || 'Không thể kết thúc khám');
        showToast('success', 'Đã kết thúc khám bệnh');
        examModal.hide();
        await loadWaitingList();
    } catch (error) {
        showToast('error', error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle me-1"></i>Khám xong';
    }
}

function openBenhanModal(encodedData) {
    const t = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('ba_maPK').value      = t.MaPK;
    document.getElementById('ba_tenBN').textContent  = t.TenBenhNhan || '—';
    document.getElementById('ba_stt').textContent    = String(t.STT || '—').padStart(2,'0');
    document.getElementById('ba_maPhieu').textContent = t.MaPhieu || t.MaPK;
    document.getElementById('ba_chuyenKhoa').textContent = t.TenChuyenKhoa || '—';
    document.getElementById('ba_phong').textContent  = t.TenPhong || '—';

    // Reset form
    document.getElementById('ba_trieuChung').value = '';
    document.getElementById('ba_chuanDoan').value  = '';
    document.getElementById('ba_ghiChu').value     = '';
    document.getElementById('benhanForm').classList.remove('was-validated');

    benhanModal.show();
}

async function submitBenhan() {
    const examModalEl = document.getElementById('examModal');
    const examMaPK = currentExamTicket?.MaPK || document.getElementById('ex_ba_maPK')?.value;
    if (examModalEl?.classList.contains('show') || examMaPK) {
        if (!isCurrentExamInProgress()) {
            showToast('warning', 'Phiếu khám đã kết thúc, không thể thay đổi bệnh án');
            return;
        }
        if (currentExamState?.medicalRecord?.MaBA) {
            showToast('warning', 'Bệnh án đã được lưu, chỉ có thể xem lại');
            return;
        }

        const form = document.getElementById('ex_benhanForm');
        const maPK = examMaPK;
        const trieuChung = document.getElementById('ex_ba_trieuChung').value.trim();
        const chuanDoan = document.getElementById('ex_ba_chuanDoan').value.trim();
        const ghiChu = document.getElementById('ex_ba_ghiChu').value.trim();

        if (!maPK) {
            showToast('warning', 'Không xác định được phiếu khám đang lưu');
            return;
        }

        form.classList.add('was-validated');
        if (!trieuChung || !chuanDoan) {
            showToast('warning', 'Vui lòng nhập đầy đủ triệu chứng và chẩn đoán');
            return;
        }

        const btn = document.getElementById('ex_btnSubmitBenhan');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang lưu...';
        try {
            await fetchJson(`${API_BASE_URL}/medical-records/ticket/${maPK}`, {
                method: 'PUT',
                body: JSON.stringify({ maPK, maBacSi: currentUserId, trieuChung, chuanDoan, ghiChu })
            });
            showToast('success', 'Đã lưu bệnh án');
            await loadExamWorkspace(maPK);
        } catch (e) {
            showToast('error', e.message || 'Không thể lưu bệnh án');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-save me-1"></i>Lưu bệnh án';
        }
        return;
    }

    const form       = document.getElementById('benhanForm');
    const maPK       = document.getElementById('ba_maPK').value;
    const trieuChung = document.getElementById('ba_trieuChung').value.trim();
    const chuanDoan  = document.getElementById('ba_chuanDoan').value.trim();
    const ghiChu     = document.getElementById('ba_ghiChu').value.trim();

    // Validate
    form.classList.add('was-validated');
    if (!trieuChung || !chuanDoan) return;

    const btn = document.getElementById('btnSubmitBenhan');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Đang lưu...';

    try {
        // 1. Tạo bệnh án
        const resBA = await fetch(`${API_BASE_URL}/medical-records`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ maPK, maBacSi: currentUserId, trieuChung, chuanDoan, ghiChu })
        });
        const dataBA = await resBA.json();
        if (!resBA.ok) throw new Error(dataBA.error || 'Không tạo được bệnh án');

        // 2. Cập nhật trạng thái phiếu → DaKham
        const resTK = await fetch(`${API_BASE_URL}/tickets/${maPK}/done`, {
            method: 'PATCH',
            headers: authHeaders()
        });
        // Nếu route /done chưa có → fallback update status qua cancel không cancel mà đổi status
        if (!resTK.ok) {
            await fetch(`${API_BASE_URL}/tickets/${maPK}/status`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify({ trangThai: 'DaKham' })
            }).catch(() => {});
        }

        benhanModal.hide();
        showToast('success', `✅ Đã lưu bệnh án và hoàn thành khám cho phiếu ${maPK}`);
        await loadWaitingList();
    } catch (e) {
        showToast('error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-circle me-2"></i>Lưu bệnh án & Khám xong';
    }
}

async function cancelTicket(maPK) {
    if (!confirm('Xác nhận bệnh nhân bỏ khám? Phiếu khám sẽ được giữ lại và chuyển trạng thái Bỏ khám.')) return;
    try {
        const res  = await fetch(`${API_BASE_URL}/tickets/${maPK}/no-show`, { method:'PATCH', headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi đánh dấu bỏ khám');
        showToast('success', 'Đã đánh dấu bệnh nhân bỏ khám');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

async function startExam(maPK) {
    try {
        const res  = await fetch(`${API_BASE_URL}/tickets/${maPK}/start`, { method: 'PATCH', headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
        showToast('success', 'Đã bắt đầu khám bệnh nhân');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

function openKedonModal(encodedData) {
    const t = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('kd_maPK').textContent = t.MaPK;
    document.getElementById('kd_tenBN').textContent = t.TenBenhNhan || '—';
    document.getElementById('kd_chuyenKhoa').textContent = t.TenChuyenKhoa || '—';
    document.getElementById('kd_maPK').dataset.mapk = t.MaPK;

    document.getElementById('kd_searchThuoc').value = '';
    document.getElementById('kd_searchResult').innerHTML = '';
    selectedMedicines = [];
    renderSelectedMedicines();

    kedonModal.show();
}

async function searchMedicines() {
    if (currentExamTicket?.MaPK && !isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm thuốc');
        return;
    }
    if (currentExamTicket?.MaPK && !currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Cần lưu bệnh án trước khi kê đơn thuốc');
        return;
    }
    const examInput = document.getElementById('ex_kd_searchThuoc');
    const legacyInput = document.getElementById('kd_searchThuoc');
    const examResult = document.getElementById('ex_kd_searchResult');
    const legacyResult = document.getElementById('kd_searchResult');
    const input = currentExamTicket?.MaPK ? examInput : (legacyInput || examInput);
    const resDiv = currentExamTicket?.MaPK ? examResult : (legacyResult || examResult);
    if (!input || !resDiv) return;
    const kw = input.value.trim();
    
    if (!kw) {
        resDiv.innerHTML = '<div class="list-group-item text-muted text-center py-4">Nhập tên để tìm thuốc</div>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/medicines`, { headers: authHeaders() });
        const data = await res.json();
        const filtered = (data || []).filter(m => m.TenThuoc.toLowerCase().includes(kw.toLowerCase()));
        
        if (!filtered.length) {
            resDiv.innerHTML = '<div class="list-group-item text-muted">Không tìm thấy thuốc</div>';
            return;
        }

        resDiv.innerHTML = filtered.map(m => `
            <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onclick='selectMedicine(${JSON.stringify(m).replace(/'/g, "&apos;")})'>
                <div>
                    <strong>${m.TenThuoc}</strong><br>
                    <small class="text-muted">
                        Tồn kho: <b>${m.TongTon || 0}</b> ${m.DonViCoBan || 'viên'}<br>
                        ${m.QuyCachDongGoi ? `<span class="text-info">${m.QuyCachDongGoi}</span>` : ''}
                    </small>
                </div>
                <i class="fa fa-plus-circle text-primary"></i>
            </button>
        `).join('');
    } catch (e) {
        resDiv.innerHTML = '<div class="list-group-item text-danger">Lỗi tìm thuốc</div>';
    }
}

function selectMedicine(m) {
    if (currentExamTicket?.MaPK && !isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm thuốc');
        return;
    }
    if (currentExamTicket?.MaPK && !currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Cần lưu bệnh án trước khi kê đơn thuốc');
        return;
    }
    const existing = selectedMedicines.find(x => Number(x.MaThuoc) === Number(m.MaThuoc));
    if (existing?.IsSaved) {
        showToast('warning', 'Thuốc này đã có trong đơn đã lưu');
        return;
    }
    if (existing) {
        showToast('warning', 'Thuốc này đã được chọn');
        return;
    }
    selectedMedicines.push({ ...m, inputSoLuong: 1, inputLieuDung: '', IsSaved: false });
    renderSelectedMedicines();
}

function removeMedicine(id) {
    selectedMedicines = selectedMedicines.filter(x => Number(x.MaThuoc) !== Number(id) || x.IsSaved);
    renderSelectedMedicines();
}

function updateMedicineInput(id, field, value) {
    const med = selectedMedicines.find(x => Number(x.MaThuoc) === Number(id));
    if (med?.IsSaved && currentExamTicket?.MaPK) return;
    if (med) med[field] = value;
}

function renderSelectedMedicines() {
    const tbody = document.getElementById('ex_kd_selectedMedicines') || document.getElementById('kd_selectedMedicines');
    if (!tbody) return;
    if (!selectedMedicines.length) {
        tbody.innerHTML = '<tr id="kd_emptyRow"><td colspan="5" class="text-center text-muted py-4">Chưa có thuốc nào được chọn</td></tr>';
        return;
    }

    const inExam = Boolean(currentExamTicket?.MaPK);
    const canEditAny = !inExam || (medicineAddPanelOpen && isCurrentExamInProgress());
    tbody.innerHTML = selectedMedicines.map(m => {
        const canEditRow = canEditAny && !m.IsSaved;
        const qtyCell = canEditRow
            ? `<div class="input-group input-group-sm">
                    <input type="number" class="form-control" min="1" max="${m.TongTon||9999}" value="${m.inputSoLuong}" 
                        onchange="updateMedicineInput(${m.MaThuoc}, 'inputSoLuong', parseInt(this.value)||1)">
                    <span class="input-group-text">${m.DonViCoBan || 'viên'}</span>
                </div>`
            : `<span class="fw-semibold">${Number(m.inputSoLuong || 1)}</span> <small class="text-muted">${escapeHtml(m.DonViCoBan || 'viên')}</small>`;
        const doseCell = canEditRow
            ? `<input type="text" class="form-control form-control-sm" placeholder="VD: Sáng 1, chiều 1" value="${escapeHtml(m.inputLieuDung || '')}"
                    onchange="updateMedicineInput(${m.MaThuoc}, 'inputLieuDung', this.value)">`
            : `<span>${escapeHtml(m.inputLieuDung || '—')}</span>`;
        const actionCell = canEditRow
            ? `<button class="btn btn-sm btn-outline-danger" onclick="removeMedicine(${m.MaThuoc})"><i class="fa fa-trash"></i></button>`
            : '<span class="badge bg-secondary">Đã lưu</span>';
        return `
            <tr>
                <td class="align-middle">
                    <div class="fw-bold">${escapeHtml(m.TenThuoc || '')}</div>
                    ${m.QuyCachDongGoi ? `<small class="text-muted" style="font-size:0.75rem">${escapeHtml(m.QuyCachDongGoi)}</small>` : ''}
                </td>
                <td class="align-middle text-center">
                    <span class="badge bg-info">${escapeHtml(m.TongTon || 0)}</span><br>
                    <small class="text-muted" style="font-size:0.75rem">${escapeHtml(m.DonViCoBan || 'viên')}</small>
                </td>
                <td class="align-middle">${qtyCell}</td>
                <td class="align-middle">${doseCell}</td>
                <td class="align-middle text-center">${actionCell}</td>
            </tr>
        `;
    }).join('');
}

async function submitKedon() {
    const maPK = currentExamTicket?.MaPK || document.getElementById('kd_maPK')?.dataset.mapk;
    if (currentExamTicket?.MaPK && !isCurrentExamInProgress()) {
        showToast('warning', 'Phiếu khám đã kết thúc, không thể thêm hoặc sửa đơn thuốc');
        return;
    }
    if (currentExamTicket?.MaPK && !currentExamState?.medicalRecord?.MaBA) {
        showToast('warning', 'Cần lưu bệnh án trước khi kê đơn thuốc');
        return;
    }
    
    if (!selectedMedicines.length) {
        showToast('warning', 'Vui lòng chọn ít nhất 1 loại thuốc');
        return;
    }
    if (currentExamTicket?.MaPK && !selectedMedicines.some((m) => !m.IsSaved)) {
        showToast('warning', 'Chưa có thuốc mới để lưu');
        return;
    }

    const invalid = selectedMedicines.find(m => !m.inputSoLuong || m.inputSoLuong < 1 || !m.inputLieuDung.trim());
    if (invalid) {
        showToast('warning', 'Vui lòng nhập đầy đủ số lượng và liều dùng cho tất cả các thuốc');
        return;
    }

    const items = selectedMedicines.map(m => ({
        maThuoc: m.MaThuoc,
        soLuong: m.inputSoLuong,
        lieuDung: m.inputLieuDung.trim()
    }));

    const btn = document.getElementById('ex_btnSubmitKedon') || document.getElementById('btnSubmitKedon');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Đang lưu...';

    try {
        const res = await fetch(`${API_BASE_URL}/prescriptions`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ maPK, medicines: items })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi lưu đơn thuốc');
        
        showToast('success', 'Đã lưu đơn thuốc');
        if (currentExamTicket?.MaPK) {
            await loadExamWorkspace(currentExamTicket.MaPK);
        } else {
            kedonModal.hide();
            await loadWaitingList();
        }
    } catch (e) {
        showToast('error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-2"></i>Lưu đơn thuốc';
    }
}

function openCreateTicketModal() {
    if (!canManage) { showToast('warning', 'Chỉ Admin và Lễ tân được tạo phiếu khám'); return; }
    resetModalForm();
    selectTicketType('WALK_IN');
    loadSpecialtiesToModal();
    createModal.show();
}

function selectTicketType(type) {
    const isWI = type === 'WALK_IN';
    document.getElementById('selectedTicketType').value = isWI ? 'WALK_IN' : 'APPOINTMENT';
    document.getElementById('typeWalkIn')?.classList.toggle('selected', isWI);
    document.getElementById('typeAppointment')?.classList.toggle('selected', !isWI);
    document.getElementById('appointmentSection').style.display = isWI ? 'none' : 'block';
    document.getElementById('specialtySection').style.display  = isWI ? 'block' : 'none';
    clearSelectedPatient();
    hideNewPatientForm();
}

async function loadSpecialtiesToModal() {
    try {
        const res  = await fetch(`${API_BASE_URL}/specialties`, { headers: authHeaders() });
        const data = await res.json();
        const sel  = document.getElementById('modalSpecialtySelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Chọn chuyên khoa --</option>';
        (data.data || []).forEach(sp => {
            sel.innerHTML += `<option value="${sp.MaChuyenKhoa}">${sp.TenChuyenKhoa}</option>`;
        });
    } catch { showToast('error', 'Không tải được chuyên khoa'); }
}

async function handleSpecialtyChange(sel) {
    const sid  = sel.value;
    const dr   = document.getElementById('modalDoctorSelect');
    const reqId = ++doctorRequestId;
    dr.disabled = true;
    dr.innerHTML = '<option value="">Đang tải bác sĩ...</option>';
    if (!sid) { dr.innerHTML = '<option value="">-- Chọn chuyên khoa trước --</option>'; return; }
    try {
        const res  = await fetch(`${API_BASE_URL}/doctors/specialty/${sid}`, { headers: authHeaders() });
        const data = await res.json();
        if (reqId !== doctorRequestId) return;
        const docs = (data.data || []).filter(d => String(d.MaChuyenKhoa) === String(sid));
        dr.innerHTML = '<option value="">-- Chọn bác sĩ --</option>';
        docs.forEach(d => {
            const time = d.GioBatDau && d.GioKetThuc ? ` (${d.GioBatDau.slice(0,5)}-${d.GioKetThuc.slice(0,5)})` : '';
            dr.innerHTML += `<option value="${d.MaNV}" data-room="${d.TenPhong||''}">${d.HoTen}${time}</option>`;
        });
        dr.disabled = !docs.length;
        if (dr.disabled) dr.innerHTML = '<option value="">Không có bác sĩ đang trong ca</option>';
    } catch { dr.innerHTML = '<option value="">Lỗi tải bác sĩ</option>'; }
}

async function modalSearchPatients() {
    const inp  = document.getElementById('modalSearchInput');
    const res  = document.getElementById('modalSearchResults');
    if (!inp || !res) return;
    if (!validateModalSearchInput()) return;
    const kw = inp.value.trim();
    hideNewPatientForm();
    res.style.display = 'block';
    if (kw.length < 6) { res.innerHTML = '<div class="text-muted p-2">Nhập ít nhất 6 số CCCD</div>'; return; }
    try {
        const r    = await fetch(`${API_BASE_URL}/patients/search?keyword=${encodeURIComponent(kw)}`, { headers: authHeaders() });
        const data = await r.json();
        res.innerHTML = '';
        (data.data || []).forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action border-0 border-bottom';
            btn.innerHTML = `<div class="fw-bold">${p.HoTen}</div><small class="text-muted">CCCD: ${p.SoCCCD||''} - SĐT: ${p.SoDienThoai||''}</small>`;
            btn.onclick = () => selectPatientInModal(p);
            res.appendChild(btn);
        });
        if (!(data.data||[]).length) {
            if (document.getElementById('selectedTicketType')?.value === 'APPOINTMENT') {
                res.innerHTML = '<div class="text-muted p-2">Không có lịch hẹn phù hợp với CCCD này</div>';
                return;
            }
            res.innerHTML = `
                <div class="text-muted p-2">Không tìm thấy bệnh nhân</div>
                <button type="button" class="btn btn-sm btn-primary m-2" onclick="showNewPatientForm('${kw.replace(/'/g, "\\'")}')">
                    <i class="fa fa-user-plus me-1"></i>Tạo bệnh nhân mới
                </button>
            `;
        }
    } catch { showToast('error', 'Lỗi tìm bệnh nhân'); }
}

function selectPatientInModal(p) {
    selectedPatient = p;
    document.getElementById('selectedPatientInModal').style.display = 'block';
    document.getElementById('selectedPatientNameModal').textContent = p.HoTen;
    document.getElementById('selectedPatientInfoModal').textContent = `CCCD: ${p.SoCCCD||''} - SĐT: ${p.SoDienThoai||''}`;
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';
    if (document.getElementById('selectedTicketType').value === 'APPOINTMENT') loadPatientAppointments(p.MaBN);
}

function showNewPatientForm(cccd = '') {
    const form = document.getElementById('newPatientForm');
    if (!form) return;
    form.style.display = 'block';
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('newPatientCCCD').value = cccd;
    document.getElementById('newPatientName').focus();
}

function hideNewPatientForm() {
    const form = document.getElementById('newPatientForm');
    if (form) form.style.display = 'none';
}

async function createPatientFromTicketModal() {
    const soCCCD = document.getElementById('newPatientCCCD').value.trim();
    const hoTen = document.getElementById('newPatientName').value.trim();
    const ngaySinh = document.getElementById('newPatientBirth').value;
    const soDienThoai = document.getElementById('newPatientPhone').value.trim();
    const gioiTinh = document.getElementById('newPatientGender').value;
    const diaChi = document.getElementById('newPatientAddress').value.trim();

    if (!soCCCD || !hoTen || !ngaySinh || !soDienThoai || !gioiTinh || !diaChi) {
        showToast('warning', 'Vui lòng nhập đầy đủ thông tin');
        return;
    }

    const btn = document.getElementById('btnSaveNewPatient');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Đang lưu...';

    try {
        const res = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ soCCCD, hoTen, ngaySinh, soDienThoai, gioiTinh, diaChi })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi tạo bệnh nhân');

        selectPatientInModal(data.data);
        hideNewPatientForm();
        showToast('success', 'Đã tạo bệnh nhân mới');
    } catch (e) {
        showToast('error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-2"></i>Lưu bệnh nhân';
    }
}

function clearSelectedPatient() {
    selectedPatient = selectedAppointment = null;
    document.getElementById('selectedPatientInModal').style.display = 'none';
}

async function loadPatientAppointments(maBN) {
    const al = document.getElementById('appointmentList');
    if (!al) return;
    al.innerHTML = '<div class="text-muted p-2">Đang tải lịch hẹn...</div>';
    try {
        const res  = await fetch(`${API_BASE_URL}/patients/${maBN}/appointments`, { headers: authHeaders() });
        const data = await res.json();
        const apps = data.data || [];
        if (!apps.length) { al.innerHTML = '<div class="text-muted p-2">Không có lịch hẹn.</div>'; return; }
        al.innerHTML = apps.map(a => `
            <button type="button" class="list-group-item list-group-item-action appointment-item"
                onclick='selectAppointment(${JSON.stringify(a).replace(/'/g,"&apos;")})'>
                <div class="fw-bold">${new Date(a.NgayHen).toLocaleDateString('vi-VN')}</div>
                <small class="text-muted">${a.TenChuyenKhoa||''} - ${a.TenBacSi||''}</small>
            </button>`).join('');
    } catch (e) { al.innerHTML = `<div class="text-danger p-2">Lỗi tải lịch hẹn</div>`; }
}

function selectAppointment(a) {
    selectedAppointment = a;
    document.querySelectorAll('.appointment-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function createTicket() {
    if (!canManage) return;
    if (!selectedPatient) { showToast('warning', 'Chọn bệnh nhân trước'); return; }
    const type = document.getElementById('selectedTicketType').value;
    try {
        let url = `${API_BASE_URL}/tickets/walk-in`;
        let body = null;
        if (type === 'APPOINTMENT') {
            if (!selectedAppointment) { showToast('warning', 'Chọn lịch hẹn trước'); return; }
            url  = `${API_BASE_URL}/tickets/appointment`;
            body = { MaBN: selectedPatient.MaBN, MaLK: selectedAppointment.MaLK };
        } else {
            const mk = document.getElementById('modalSpecialtySelect')?.value;
            const mb = document.getElementById('modalDoctorSelect')?.value;
            if (!mk || !mb) { showToast('warning', 'Chọn chuyên khoa và bác sĩ'); return; }
            body = { MaBN: selectedPatient.MaBN, MaChuyenKhoa: Number(mk), MaBacSi: Number(mb) };
        }
        const res  = await fetch(url, { method:'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi tạo phiếu');
        createModal.hide();
        showToast('success', 'Đã tạo phiếu khám thành công');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

function resetModalForm() {
    selectedPatient = selectedAppointment = null;
    document.getElementById('selectedTicketType').value = 'WALK_IN';
    document.getElementById('selectedPatientInModal').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';
    document.getElementById('modalSearchResults').innerHTML = '';
    hideNewPatientForm();
}

function logout() {
    ['token','username','role','userId','user'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'signin.html';
}

// ── Export globals ───────────────────────────────────────────────────────────
window.openCreateTicketModal = openCreateTicketModal;
window.selectTicketType      = selectTicketType;
window.handleSpecialtyChange = handleSpecialtyChange;
window.selectPatientInModal  = selectPatientInModal;
window.clearSelectedPatient  = clearSelectedPatient;
window.showNewPatientForm    = showNewPatientForm;
window.hideNewPatientForm    = hideNewPatientForm;
window.createPatientFromTicketModal = createPatientFromTicketModal;
window.selectAppointment     = selectAppointment;
window.createTicket          = createTicket;
window.cancelTicket          = cancelTicket;
window.startExam             = startExam;
window.openExamModal         = openExamModal;
window.showServiceAddPanel   = showServiceAddPanel;
window.showMedicineAddPanel  = showMedicineAddPanel;
window.selectService         = selectService;
window.searchServices        = searchServices;
window.removeSelectedService = removeSelectedService;
window.updateSelectedServiceQty = updateSelectedServiceQty;
window.viewServiceResult     = viewServiceResult;
window.submitServices        = submitServices;
window.finishExam            = finishExam;
window.openBenhanModal       = openBenhanModal;
window.submitBenhan          = submitBenhan;
window.openKedonModal        = openKedonModal;
window.searchMedicines       = searchMedicines;
window.selectMedicine        = selectMedicine;
window.removeMedicine        = removeMedicine;
window.updateMedicineInput   = updateMedicineInput;
window.submitKedon           = submitKedon;
window.loadWaitingList       = loadWaitingList;
window.goPage                = goPage;
window.logout                = logout;
