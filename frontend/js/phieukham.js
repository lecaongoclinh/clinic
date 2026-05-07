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

let selectedMedicines   = [];

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
function statusLabel(s) {
    return { ChoKham:'Đang chờ', WAITING:'Đang chờ', DangKham:'Đang khám', IN_PROGRESS:'Đang khám',
             DaKham:'Đã khám', DONE:'Đã khám', BoVe:'Đã hủy', CANCELLED:'Đã hủy' }[s] || s;
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
    document.getElementById('dateLabel').textContent =
        'Ngày ' + new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    // Username
    const uname = localStorage.getItem('username') || (isDoctor ? 'Bác sĩ' : 'Lễ tân');
    ['usernameSidebar','navbarUserName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = uname;
    });

    // Nút tạo phiếu
    if (canManage) document.getElementById('btnCreateTicket').style.display = '';

    // Modals
    benhanModal = new bootstrap.Modal(document.getElementById('benhanModal'));
    createModal = new bootstrap.Modal(document.getElementById('createTicketModal'));
    kedonModal  = new bootstrap.Modal(document.getElementById('kedonModal'));

    // Search
    const inp = document.getElementById('searchInput');
    const clr = document.getElementById('clearSearch');
    inp.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        clr.style.display = inp.value ? '' : 'none';
        searchTimeout = setTimeout(() => { currentPage = 1; applyFilter(); }, 280);
    });
    clr.addEventListener('click', () => {
        inp.value = ''; clr.style.display = 'none';
        currentPage = 1; applyFilter();
    });

    // Modal search (bệnh nhân)
    document.getElementById('modalSearchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(modalSearchPatients, 300);
    });
    document.getElementById('modalSearchBtn').addEventListener('click', modalSearchPatients);

    // Modal search thuốc
    const searchThuocInp = document.getElementById('kd_searchThuoc');
    if (searchThuocInp) {
        searchThuocInp.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchMedicines, 300);
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
            actionBtn = `<button class="btn btn-sm btn-success" onclick="openBenhanModal('${ticketData}')">
                <i class="fa fa-check-circle me-1"></i>Khám xong</button>`;
        } else if (isDone) {
            if (t.DaKeDon) {
                actionBtn = `<button class="btn btn-sm btn-secondary" disabled>
                    <i class="fa fa-check me-1"></i>Đã kê đơn</button>`;
            } else {
                actionBtn = `<button class="btn btn-sm btn-warning text-white" onclick="openKedonModal('${ticketData}')">
                    <i class="fa fa-pills me-1"></i>Kê đơn thuốc</button>`;
            }
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
          <span class="status-badge badge ${statusClass(t.TrangThai)}">${statusLabel(t.TrangThai)}</span>
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
              <i class="fa fa-times me-1"></i>Hủy</button>` : ''}
          ${isCancelled ? `<span class="text-muted small"><i class="fa fa-ban me-1"></i>Đã hủy</span>` : ''}
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
            // Thử route khác
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

// ── Hủy phiếu ────────────────────────────────────────────────────────────────
async function cancelTicket(maPK) {
    if (!confirm('Xác nhận hủy phiếu khám này?')) return;
    try {
        const res  = await fetch(`${API_BASE_URL}/tickets/${maPK}/cancel`, { method:'PATCH', headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi hủy phiếu');
        showToast('success', 'Đã hủy phiếu khám');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

// ── Vào khám (ChoKham → DangKham) ─────────────────────────────────────────────
async function startExam(maPK) {
    try {
        const res  = await fetch(`${API_BASE_URL}/tickets/${maPK}/start`, { method: 'PATCH', headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
        showToast('success', 'Đã bắt đầu khám bệnh nhân');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

// ── Kê đơn thuốc ─────────────────────────────────────────────────────────────
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
    const kw = document.getElementById('kd_searchThuoc').value.trim();
    const resDiv = document.getElementById('kd_searchResult');
    if (!kw) { resDiv.innerHTML = ''; return; }

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
    if (selectedMedicines.find(x => x.MaThuoc === m.MaThuoc)) {
        showToast('warning', 'Thuốc này đã được chọn');
        return;
    }
    selectedMedicines.push({ ...m, inputSoLuong: 1, inputLieuDung: '' });
    renderSelectedMedicines();
}

function removeMedicine(id) {
    selectedMedicines = selectedMedicines.filter(x => x.MaThuoc !== id);
    renderSelectedMedicines();
}

function updateMedicineInput(id, field, value) {
    const med = selectedMedicines.find(x => x.MaThuoc === id);
    if (med) med[field] = value;
}

function renderSelectedMedicines() {
    const tbody = document.getElementById('kd_selectedMedicines');
    if (!selectedMedicines.length) {
        tbody.innerHTML = '<tr id="kd_emptyRow"><td colspan="5" class="text-center text-muted py-4">Chưa có thuốc nào được chọn</td></tr>';
        return;
    }

    tbody.innerHTML = selectedMedicines.map(m => `
        <tr>
            <td class="align-middle">
                <div class="fw-bold">${m.TenThuoc}</div>
                ${m.QuyCachDongGoi ? `<small class="text-muted" style="font-size:0.75rem">${m.QuyCachDongGoi}</small>` : ''}
            </td>
            <td class="align-middle text-center">
                <span class="badge bg-info">${m.TongTon || 0}</span><br>
                <small class="text-muted" style="font-size:0.75rem">${m.DonViCoBan || 'viên'}</small>
            </td>
            <td class="align-middle">
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control" min="1" max="${m.TongTon||9999}" value="${m.inputSoLuong}" 
                        onchange="updateMedicineInput(${m.MaThuoc}, 'inputSoLuong', parseInt(this.value)||1)">
                    <span class="input-group-text">${m.DonViCoBan || 'viên'}</span>
                </div>
            </td>
            <td class="align-middle">
                <input type="text" class="form-control form-control-sm" placeholder="VD: Sáng 1, chiều 1" value="${m.inputLieuDung}"
                    onchange="updateMedicineInput(${m.MaThuoc}, 'inputLieuDung', this.value)">
            </td>
            <td class="align-middle text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="removeMedicine(${m.MaThuoc})"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function submitKedon() {
    const maPK = document.getElementById('kd_maPK').dataset.mapk;
    
    if (!selectedMedicines.length) {
        showToast('warning', 'Vui lòng chọn ít nhất 1 loại thuốc');
        return;
    }

    // Validate
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

    const btn = document.getElementById('btnSubmitKedon');
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
        
        showToast('success', 'Đã lưu đơn thuốc thành công');
        kedonModal.hide();
        await loadWaitingList();
    } catch (e) {
        showToast('error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-2"></i>Lưu đơn thuốc';
    }
}

// ── Tạo phiếu khám (admin / lễ tân) ─────────────────────────────────────────
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
    const kw = inp.value.trim();
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
        if (!(data.data||[]).length) res.innerHTML = '<div class="text-muted p-2">Không tìm thấy bệnh nhân</div>';
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

function clearSelectedPatient() {
    selectedPatient = selectedAppointment = null;
    document.getElementById('selectedPatientInModal').style.display = 'none';
    const al = document.getElementById('appointmentList');
    if (al) al.innerHTML = '';
}

async function loadPatientAppointments(maBN) {
    const al = document.getElementById('appointmentList');
    if (!al) return;
    al.innerHTML = '<div class="text-muted p-2">Đang tải lịch hẹn...</div>';
    try {
        const res  = await fetch(`${API_BASE_URL}/patients/${maBN}/appointments`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);
        const apps = data.data || [];
        if (!apps.length) { al.innerHTML = '<div class="text-muted p-2">Bệnh nhân không có lịch hẹn.</div>'; return; }
        al.innerHTML = apps.map(a => `
            <button type="button" class="list-group-item list-group-item-action appointment-item"
                onclick='selectAppointment(${JSON.stringify(a).replace(/'/g,"&apos;")})'>
                <div class="fw-bold">${new Date(a.NgayHen).toLocaleDateString('vi-VN')}</div>
                <small class="text-muted">${a.TenChuyenKhoa||''} - ${a.TenBacSi||''}</small>
            </button>`).join('');
    } catch (e) { al.innerHTML = `<div class="text-danger p-2">${e.message}</div>`; }
}

function selectAppointment(a) {
    selectedAppointment = a;
    document.querySelectorAll('.appointment-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function createTicket() {
    if (!canManage) { showToast('warning', 'Không có quyền tạo phiếu'); return; }
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
            if (!mk) { showToast('warning', 'Chọn chuyên khoa'); return; }
            if (!mb) { showToast('warning', 'Chọn bác sĩ'); return; }
            body = { MaBN: selectedPatient.MaBN, MaChuyenKhoa: Number(mk), MaBacSi: Number(mb) };
        }
        const res  = await fetch(url, { method:'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi tạo phiếu');
        createModal.hide();
        resetModalForm();
        showToast('success', 'Đã tạo phiếu khám thành công');
        await loadWaitingList();
    } catch (e) { showToast('error', e.message); }
}

function resetModalForm() {
    selectedPatient = selectedAppointment = null;
    document.getElementById('selectedTicketType').value = 'WALK_IN';
    document.getElementById('appointmentSection').style.display = 'none';
    document.getElementById('specialtySection').style.display = 'block';
    document.getElementById('selectedPatientInModal').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('modalSearchResults').innerHTML = '';
    document.getElementById('appointmentList').innerHTML = '';
    document.getElementById('modalSpecialtySelect').value = '';
    const dr = document.getElementById('modalDoctorSelect');
    dr.innerHTML = '<option value="">-- Chọn chuyên khoa trước --</option>';
    dr.disabled = true;
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
window.selectAppointment     = selectAppointment;
window.createTicket          = createTicket;
window.cancelTicket          = cancelTicket;
window.startExam             = startExam;
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
