const API_BASE_URL = 'http://localhost:3000/api';

let selectedPatient = null;
let selectedAppointment = null;
let currentTicket = null;
let searchTimeout = null;
let doctorRequestId = 0;

const role = Number(localStorage.getItem('role'));
const canManageTickets = role === 1 || role === 3;

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

const jsonHeaders = () => ({
    'Content-Type': 'application/json',
    ...authHeaders()
});

function showToast(type, message, duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger';
    toast.className = `toast align-items-center text-white bg-${bg} border-0`;
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    container.appendChild(toast);
    new bootstrap.Toast(toast).show();
    setTimeout(() => toast.remove(), duration);
}

function formatPhoneNumber(phone) {
    return phone || '';
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatAppointmentDateTime(ngayHen, gioHen) {
    if (!ngayHen) return '';
    const datePart = String(ngayHen).split('T')[0];
    const timePart = String(gioHen || '00:00:00').slice(0, 8);
    return formatDateTime(`${datePart}T${timePart}`);
}

function ticketStatusText(status) {
    const map = {
        WAITING: 'Đang chờ',
        IN_PROGRESS: 'Đang khám',
        DONE: 'Đã khám',
        CANCELLED: 'Đã hủy'
    };
    return map[status] || status || '';
}

function ticketTypeText(type) {
    return type === 'APPOINTMENT' ? 'Theo lịch hẹn' : 'Khám tại chỗ';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/signin';
        return;
    }

    const username = localStorage.getItem('username') || 'Lễ tân';
    document.querySelectorAll('#usernameSidebar, #navbarUserName').forEach((el) => {
        if (el) el.textContent = username;
    });

    ensurePrintModal();
    setupSearchListeners();
    loadSpecialtiesToModal();
    loadWaitingList();

    if (!canManageTickets) {
        const createButton = document.querySelector('[onclick="openCreateTicketModal()"]');
        if (createButton) createButton.style.display = 'none';
    }
});

function ensurePrintModal() {
    if (document.getElementById('printTicketModal')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal fade" id="printTicketModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-md">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Phiếu khám bệnh</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="printTicketArea" class="ticket-print-area"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        <button type="button" class="btn btn-primary" onclick="printCurrentTicket()">
                            <i class="fa fa-print me-2"></i>In phiếu khám
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(wrapper.firstElementChild);

    document.getElementById('printTicketModal').addEventListener('hidden.bs.modal', loadWaitingList);
}

function setupSearchListeners() {
    const input = document.getElementById('modalSearchInput');
    const button = document.getElementById('modalSearchBtn');

    if (input) {
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(modalSearchPatients, 300);
        });
    }
    if (button) button.addEventListener('click', modalSearchPatients);
}

function openCreateTicketModal() {
    if (!canManageTickets) {
        showToast('warning', 'Chỉ ADMIN và lễ tân được tạo phiếu khám');
        return;
    }

    resetModalForm();
    selectTicketType('WALK_IN');
    loadSpecialtiesToModal();
    new bootstrap.Modal(document.getElementById('createTicketModal')).show();
}

function selectTicketType(type) {
    const isWalkIn = type === 'WALK_IN';
    document.getElementById('selectedTicketType').value = isWalkIn ? 'WALK_IN' : 'APPOINTMENT';
    document.getElementById('typeWalkIn')?.classList.toggle('selected', isWalkIn);
    document.getElementById('typeAppointment')?.classList.toggle('selected', !isWalkIn);
    document.getElementById('appointmentSection').style.display = isWalkIn ? 'none' : 'block';
    document.getElementById('specialtySection').style.display = isWalkIn ? 'block' : 'none';
    clearSelectedPatient();
}

async function loadSpecialtiesToModal() {
    try {
        const res = await fetch(`${API_BASE_URL}/specialties`, { headers: authHeaders() });
        const data = await res.json();
        const select = document.getElementById('modalSpecialtySelect');
        if (!select) return;

        select.innerHTML = '<option value="">-- Chọn chuyên khoa --</option>';
        (data.data || []).forEach((sp) => {
            select.innerHTML += `<option value="${sp.MaChuyenKhoa}">${sp.TenChuyenKhoa}</option>`;
        });
    } catch {
        showToast('error', 'Không tải được chuyên khoa');
    }
}

async function handleSpecialtyChange(select) {
    const specialtyId = select.value;
    const doctorSelect = document.getElementById('modalDoctorSelect');
    if (!doctorSelect) return;
    const requestId = ++doctorRequestId;

    doctorSelect.disabled = true;
    doctorSelect.innerHTML = '<option value="">Đang tải bác sĩ...</option>';

    if (!specialtyId) {
        doctorSelect.innerHTML = '<option value="">-- Chọn chuyên khoa trước --</option>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/doctors/specialty/${specialtyId}`, { headers: authHeaders() });
        const data = await res.json();
        if (requestId !== doctorRequestId) return;

        doctorSelect.innerHTML = '<option value="">-- Chọn bác sĩ --</option>';
        const doctors = (data.data || []).filter((doctor) => String(doctor.MaChuyenKhoa) === String(specialtyId));
        doctors.forEach((doctor) => {
            const option = document.createElement('option');
            option.value = doctor.MaNV;
            option.dataset.room = doctor.TenPhong || '';
            option.dataset.roomId = doctor.MaPhong || '';
            const time = doctor.GioBatDau && doctor.GioKetThuc
                ? ` (${doctor.GioBatDau.slice(0, 5)}-${doctor.GioKetThuc.slice(0, 5)})`
                : '';
            const room = doctor.TenPhong ? ` - ${doctor.TenPhong}` : '';
            option.textContent = `${doctor.HoTen} - ${doctor.TenChuyenKhoa || ''}${time}${room}`;
            doctorSelect.appendChild(option);
        });

        doctorSelect.disabled = !doctors.length;
        if (doctorSelect.disabled) {
            doctorSelect.innerHTML = '<option value="">Không có bác sĩ đang trong ca làm việc</option>';
        }
    } catch {
        doctorSelect.innerHTML = '<option value="">Lỗi tải bác sĩ</option>';
        showToast('error', 'Không tải được bác sĩ');
    }
}

async function modalSearchPatients() {
    const input = document.getElementById('modalSearchInput');
    const results = document.getElementById('modalSearchResults');
    if (!input || !results) return;

    const keyword = input.value.trim();
    results.style.display = 'block';

    if (keyword.length < 6) {
        results.innerHTML = '<div class="text-muted p-2">Nhập ít nhất 6 chữ số CCCD để tìm bệnh nhân</div>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/patients/search?keyword=${encodeURIComponent(keyword)}`, {
            headers: authHeaders()
        });
        const data = await res.json();
        results.innerHTML = '';

        (data.data || []).forEach((patient) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action border-0 border-bottom';
            item.innerHTML = `
                <div class="fw-bold">${patient.HoTen}</div>
                <small class="text-muted">CCCD: ${patient.SoCCCD || ''} - SĐT: ${formatPhoneNumber(patient.SoDienThoai)}</small>`;
            item.onclick = () => selectPatientInModal(patient);
            results.appendChild(item);
        });

        if (document.getElementById('selectedTicketType').value === 'WALK_IN') {
            const createBox = document.createElement('div');
            createBox.className = 'p-3';
            createBox.innerHTML = `
                <div class="row g-2">
                    <div class="col-md-4">
                        <input class="form-control" id="quickPatientName" placeholder="Họ tên bệnh nhân">
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" id="quickPatientDob" type="date" title="Ngày sinh">
                    </div>
                    <div class="col-md-3">
                        <input class="form-control" id="quickPatientPhone" placeholder="Số điện thoại">
                    </div>
                    <div class="col-md-2">
                        <input class="form-control" id="quickPatientCCCD" placeholder="Số CCCD" value="${keyword.replace(/"/g, '&quot;')}">
                    </div>
                    <div class="col-12">
                        <button type="button" class="btn btn-outline-primary w-100" onclick="createPatientFromModal()">Thêm bệnh nhân mới</button>
                    </div>
                </div>`;
            results.appendChild(createBox);
        }

        if (!(data.data || []).length) {
            const message = document.getElementById('selectedTicketType').value === 'APPOINTMENT'
                ? 'Không tìm thấy bệnh nhân có lịch hẹn với CCCD này.'
                : 'Không tìm thấy bệnh nhân. Có thể thêm mới bên dưới.';
            results.insertAdjacentHTML('afterbegin', `<div class="text-muted p-2">${message}</div>`);
        }
    } catch {
        showToast('error', 'Lỗi tìm bệnh nhân');
    }
}

async function createPatientFromModal() {
    const hoTen = (document.getElementById('quickPatientName')?.value || '').trim();
    const ngaySinh = (document.getElementById('quickPatientDob')?.value || '').trim();
    const soDienThoai = (document.getElementById('quickPatientPhone')?.value || '').trim();
    const soCCCD = (document.getElementById('quickPatientCCCD')?.value || '').trim();

    if (!hoTen || !ngaySinh || !soDienThoai || !soCCCD) {
        showToast('warning', 'Nhập họ tên, ngày sinh, số điện thoại và số CCCD');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ hoTen, ngaySinh, soDienThoai, soCCCD })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không tạo được bệnh nhân');

        selectPatientInModal(data.data);
        showToast('success', 'Đã thêm bệnh nhân mới');
    } catch (error) {
        showToast('error', error.message);
    }
}

function selectPatientInModal(patient) {
    selectedPatient = patient;
    document.getElementById('selectedPatientInModal').style.display = 'block';
    document.getElementById('selectedPatientNameModal').textContent = patient.HoTen;
    document.getElementById('selectedPatientInfoModal').textContent = `CCCD: ${patient.SoCCCD || ''} - SĐT: ${formatPhoneNumber(patient.SoDienThoai)}`;
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';

    if (document.getElementById('selectedTicketType').value === 'APPOINTMENT') {
        loadPatientAppointments(patient.MaBN);
    }
}

function clearSelectedPatient() {
    selectedPatient = null;
    selectedAppointment = null;
    document.getElementById('selectedPatientInModal').style.display = 'none';
    const appointmentList = document.getElementById('appointmentList');
    if (appointmentList) appointmentList.innerHTML = '';
}

async function loadPatientAppointments(patientId) {
    const appointmentList = document.getElementById('appointmentList');
    if (!appointmentList) return;

    appointmentList.innerHTML = '<div class="text-muted p-2">Đang tải lịch hẹn...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/patients/${patientId}/appointments`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không tải được lịch hẹn');

        const appointments = data.data || [];
        if (!appointments.length) {
            appointmentList.innerHTML = '<div class="text-muted p-2">Bệnh nhân không có lịch hẹn hợp lệ.</div>';
            return;
        }

        appointmentList.innerHTML = appointments.map((appointment) => `
            <button type="button" class="list-group-item list-group-item-action appointment-item"
                onclick='selectAppointment(${JSON.stringify(appointment).replace(/'/g, '&apos;')})'>
                <div class="fw-bold">${formatAppointmentDateTime(appointment.NgayHen, appointment.GioHen)}</div>
                <small class="text-muted">
                    ${appointment.TenChuyenKhoa || ''} - ${appointment.TenBacSi || ''} - ${appointment.TenPhong || ''}
                </small>
            </button>
        `).join('');
    } catch (error) {
        appointmentList.innerHTML = `<div class="text-danger p-2">${error.message}</div>`;
    }
}

function selectAppointment(appointment) {
    selectedAppointment = appointment;
    document.querySelectorAll('.appointment-item').forEach((item) => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function createTicket() {
    if (!canManageTickets) {
        showToast('warning', 'Chỉ ADMIN và lễ tân được tạo phiếu khám');
        return;
    }
    if (!selectedPatient) {
        showToast('warning', 'Chọn hoặc thêm bệnh nhân trước');
        return;
    }

    const ticketType = document.getElementById('selectedTicketType').value;

    try {
        let url = `${API_BASE_URL}/tickets/walk-in`;
        let payload = null;

        if (ticketType === 'APPOINTMENT') {
            if (!selectedAppointment) {
                showToast('warning', 'Chọn lịch hẹn trước khi tạo phiếu');
                return;
            }
            url = `${API_BASE_URL}/tickets/appointment`;
            payload = {
                MaBN: selectedPatient.MaBN,
                MaLK: selectedAppointment.MaLK
            };
        } else {
            const specialtySelect = document.getElementById('modalSpecialtySelect');
            const doctorSelect = document.getElementById('modalDoctorSelect');
            const maChuyenKhoa = specialtySelect?.value;
            const maBacSi = doctorSelect?.value;

            if (!maChuyenKhoa) {
                showToast('warning', 'Chọn chuyên khoa khám');
                return;
            }
            if (!maBacSi) {
                showToast('warning', 'Chọn bác sĩ khám');
                return;
            }

            payload = {
                MaBN: selectedPatient.MaBN,
                MaChuyenKhoa: Number(maChuyenKhoa),
                MaBacSi: Number(maBacSi)
            };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không tạo được phiếu khám');

        bootstrap.Modal.getInstance(document.getElementById('createTicketModal'))?.hide();
        resetModalForm();
        openPrintTicketModal(data.ticket);
    } catch (error) {
        showToast('error', error.message);
    }
}

async function loadWaitingList() {
    try {
        const res = await fetch(`${API_BASE_URL}/tickets/waiting`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Không tải được danh sách');

        const list = document.getElementById('waitingList');
        const count = document.getElementById('waitingCount');
        if (!list) return;

        const rows = data.data || [];
        if (count) count.textContent = rows.length;

        if (!rows.length) {
            list.innerHTML = '<p class="text-center text-muted py-4">Chưa có phiếu khám hôm nay</p>';
            return;
        }

        list.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã phiếu</th>
                            <th>Bệnh nhân</th>
                            <th>CCCD</th>
                            <th>SĐT</th>
                            <th>Chuyên khoa</th>
                            <th>Bác sĩ</th>
                            <th>Phòng</th>
                            <th>Thời gian</th>
                            <th>Trạng thái</th>
                            <th class="text-end">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(renderTicketRow).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (error) {
        showToast('error', error.message);
    }
}

function renderTicketRow(ticket) {
    const waiting = ticket.TrangThai === 'WAITING';
    const cancelled = ticket.TrangThai === 'CANCELLED';
    const disabled = canManageTickets ? '' : 'disabled';
    const printDisabled = !canManageTickets || cancelled ? 'disabled' : '';
    return `
        <tr>
            <td><span class="waiting-number waiting-number-sm">${String(ticket.STT || '').padStart(2, '0')}</span></td>
            <td>${ticket.MaPhieu || ticket.MaPK}</td>
            <td>${ticket.TenBenhNhan || ''}</td>
            <td>${ticket.SoCCCD || ''}</td>
            <td>${formatPhoneNumber(ticket.SoDienThoai)}</td>
            <td>${ticket.TenChuyenKhoa || ''}</td>
            <td>${ticket.TenBacSi || ''}</td>
            <td>${ticket.TenPhong || ''}</td>
            <td>${formatDateTime(ticket.ThoiGianTaoHienThi || ticket.ThoiGianTao)}</td>
            <td><span class="badge bg-${waiting ? 'primary' : ticket.TrangThai === 'CANCELLED' ? 'secondary' : 'info'}">${ticketStatusText(ticket.TrangThai)}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" ${printDisabled} onclick="reloadAndPrintTicket(${ticket.MaPK})">
                    <i class="fa fa-print"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" ${disabled} ${waiting ? '' : 'disabled'} onclick="cancelTicket(${ticket.MaPK})">
                    <i class="fa fa-times"></i>
                </button>
            </td>
        </tr>`;
}

async function reloadAndPrintTicket(ticketId) {
    try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không tải được phiếu');
        openPrintTicketModal(data.ticket);
    } catch (error) {
        showToast('error', error.message);
    }
}

async function cancelTicket(ticketId) {
    if (!confirm('Xóa phiếu khám này?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/cancel`, {
            method: 'PATCH',
            headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không xóa được phiếu');
        showToast('success', 'Đã xóa phiếu khám');
        loadWaitingList();
    } catch (error) {
        showToast('error', error.message);
    }
}

function openPrintTicketModal(ticket) {
    currentTicket = ticket;
    document.getElementById('printTicketArea').innerHTML = renderPrintTicket(ticket);
    new bootstrap.Modal(document.getElementById('printTicketModal')).show();
}

function renderPrintTicket(ticket) {
    return `
        <div class="text-center">
            <h4 class="mb-1">PHÒNG KHÁM CLINIC</h4>
            <h5 class="mb-3">PHIẾU KHÁM BỆNH</h5>
            <div class="display-3 fw-bold text-primary">${String(ticket.STT || '').padStart(2, '0')}</div>
        </div>
        <table class="table table-borderless mt-3">
            <tr><td class="fw-bold">Mã phiếu</td><td>${ticket.MaPhieu || ticket.MaPK}</td></tr>
            <tr><td class="fw-bold">Họ tên</td><td>${ticket.TenBenhNhan || ''}</td></tr>
            <tr><td class="fw-bold">CCCD</td><td>${ticket.SoCCCD || ''}</td></tr>
            <tr><td class="fw-bold">Số điện thoại</td><td>${formatPhoneNumber(ticket.SoDienThoai)}</td></tr>
            <tr><td class="fw-bold">Chuyên khoa</td><td>${ticket.TenChuyenKhoa || ''}</td></tr>
            <tr><td class="fw-bold">Bác sĩ</td><td>${ticket.TenBacSi || ''}</td></tr>
            <tr><td class="fw-bold">Phòng khám</td><td>${ticket.TenPhong || ''}</td></tr>
            <tr><td class="fw-bold">Thời gian</td><td>${formatDateTime(ticket.ThoiGianTaoHienThi || ticket.ThoiGianTao)}</td></tr>
        </table>`;
}

function printCurrentTicket() {
    if (!currentTicket) return;
    window.print();
    setTimeout(loadWaitingList, 500);
}

function resetModalForm() {
    selectedPatient = null;
    selectedAppointment = null;
    document.getElementById('selectedTicketType').value = 'WALK_IN';
    document.getElementById('appointmentSection').style.display = 'none';
    document.getElementById('specialtySection').style.display = 'block';
    document.getElementById('selectedPatientInModal').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('modalSearchResults').innerHTML = '';
    document.getElementById('appointmentList').innerHTML = '';
    document.getElementById('modalSpecialtySelect').value = '';
    const doctorSelect = document.getElementById('modalDoctorSelect');
    doctorSelect.innerHTML = '<option value="">-- Chọn chuyên khoa trước --</option>';
    doctorSelect.disabled = true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '/signin';
}

window.openCreateTicketModal = openCreateTicketModal;
window.selectTicketType = selectTicketType;
window.handleSpecialtyChange = handleSpecialtyChange;
window.createPatientFromModal = createPatientFromModal;
window.selectPatientInModal = selectPatientInModal;
window.clearSelectedPatient = clearSelectedPatient;
window.createTicket = createTicket;
window.reloadAndPrintTicket = reloadAndPrintTicket;
window.cancelTicket = cancelTicket;
window.printCurrentTicket = printCurrentTicket;
window.logout = logout;
