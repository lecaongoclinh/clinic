
const API_BASE_URL = 'http://localhost:3000/api';
let selectedPatient = null;
let selectedAppointment = null;
let searchTimeout;
let currentTicketType = '';

function showLoading() {
    console.log('Loading...');
}

function hideLoading() { 
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.style.display = 'none'; 
    }
}

function showToast(type, message, duration = 3000) {
    let container = document.querySelector('.toast-container') || document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} border-0`;
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
    if (!phone) return 'Chưa có SĐT';
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function formatDateTime(dateString, timeString) {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('vi-VN')} ${timeString?.substring(0,5)}`;
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/signin';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.querySelectorAll('#userName, #navbarUserName').forEach(el => {
        if (el) el.textContent = user.HoTen || 'Lễ tân';
    });

    loadWaitingList();
    setInterval(loadWaitingList, 10000);
    
    setupSearchListeners();
});

// Danh sách phiếu khám chờ
async function loadWaitingList() {
    try {
        const res = await fetch(`${API_BASE_URL}/tickets/waiting`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/signin';
            return;
        }
        const data = await res.json();
        if (!data.success) throw new Error();

        const list = document.getElementById('waitingList');
        if (!list) return;
        
        list.innerHTML = '';
        document.getElementById('waitingCount').textContent = data.total || 0;

        if (data.total === 0) {
            list.innerHTML = '<p class="text-center text-muted py-4">Chưa có bệnh nhân nào trong danh sách chờ hôm nay</p>';
            return;
        }

        data.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'd-flex align-items-center p-3 border-bottom';
            
            const badgeClass = item.LoaiKham === 'appointment' ? 'badge-appointment' : 'badge-walk-in';
            const badgeText = item.LoaiKham === 'appointment' ? 'Hẹn trước' : 'Tại chỗ';
            
            div.innerHTML = `
                <div class="waiting-number me-3">${item.STT ? item.STT.toString().padStart(2,'0') : 'Hẹn trước'}</div>
                <div class="flex-grow-1">
                    <strong>${item.TenBenhNhan}</strong><br>
                    <small class="text-muted">${formatPhoneNumber(item.SoDienThoai)} • ${item.DisplayInfo || ''}</small>
                    ${item.TenBacSi ? `<small class="d-block text-primary">Bác sĩ: ${item.TenBacSi}</small>` : ''}
                </div>
                <div>
                    <span class="${badgeClass} me-2">${badgeText}</span>
                    <small class="text-muted">${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</small>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

//  loại phiếu khám
function selectTicketType(type) {
    currentTicketType = type;
    document.getElementById('selectedTicketType').value = type;
    
    // Xóa class selected của cả 2
    document.getElementById('typeWalkIn').classList.remove('selected');
    document.getElementById('typeAppointment').classList.remove('selected');
    
    // Thêm class selected cho loại được chọn
    if (type === 'WALK_IN') {
        document.getElementById('typeWalkIn').classList.add('selected');
        document.getElementById('appointmentSection').style.display = 'none';
        document.getElementById('specialtySection').style.display = 'block';
    } else {
        document.getElementById('typeAppointment').classList.add('selected');
        document.getElementById('appointmentSection').style.display = 'block';
        document.getElementById('specialtySection').style.display = 'none';
    }
    
    clearSelectedPatient();
    selectedAppointment = null;
}

// tạo phiếu
function openCreateTicketModal() {
    const modalEl = document.getElementById('createTicketModal');
    if (!modalEl) return;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    loadSpecialtiesToModal();
    resetModalForm();
}

async function loadSpecialtiesToModal() {
    try {
        const res = await fetch(`${API_BASE_URL}/specialties`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        const select = document.getElementById('modalSpecialtySelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Chọn chuyên khoa</option>';
        (data.data || []).forEach(sp => {
            select.innerHTML += `<option value="${sp.MaChuyenKhoa}">${sp.TenChuyenKhoa}</option>`;
        });
    } catch (err) {
        showToast('error', 'Không tải được danh sách chuyên khoa');
    }
}

// Hàm xử lý khi chọn chuyên khoa
async function handleSpecialtyChange(select) {
    const specialtyId = select.value;
    console.log('Chọn chuyên khoa:', specialtyId);
    
    const doctorSelect = document.getElementById('modalDoctorSelect');
    if (!doctorSelect) return;
    
    // Nếu chưa chọn chuyên khoa
    if (!specialtyId) {
        doctorSelect.innerHTML = '<option value="">Chọn chuyên khoa trước</option>';
        doctorSelect.disabled = true;
        return;
    }
    
    // Đang tải
    doctorSelect.innerHTML = '<option value="">Đang tải danh sách bác sĩ</option>';
    doctorSelect.disabled = true;
    
    try {
        console.log('Đang gọi API:', `${API_BASE_URL}/doctors/specialty/${specialtyId}`);
        
        const res = await fetch(`${API_BASE_URL}/doctors/specialty/${specialtyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await res.json();
        console.log('Danh sách bác sĩ:', data);
        
        // Reset dropdown
        doctorSelect.innerHTML = '<option value="">Hệ thống tự động xếp</option>';
        
        if (data.data && data.data.length > 0) {
            // Thêm từng bác sĩ vào dropdown
            data.data.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.MaNV;
                
                // Format hiển thị
                let displayText = doc.HoTen;
                if (doc.GioBatDau && doc.GioKetThuc) {
                    displayText += ` (${doc.GioBatDau.substring(0,5)}-${doc.GioKetThuc.substring(0,5)})`;
                }
                if (doc.TenPhong) {
                    displayText += ` - ${doc.TenPhong}`;
                }
                option.textContent = displayText;
                
                doctorSelect.appendChild(option);
            });
            doctorSelect.disabled = false;
            console.log(`Đã tải ${data.data.length} bác sĩ`);
        } else {
            doctorSelect.innerHTML = '<option value="">Không có bác sĩ làm việc hôm nay</option>';
            doctorSelect.disabled = true;
        }
        
    } catch (err) {
        console.error('Lỗi tải bác sĩ:', err);
        doctorSelect.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
        doctorSelect.disabled = true;
        showToast('error', 'Không thể tải danh sách bác sĩ');
    }
}

// Tìm kiếm bệnh nhân
function setupSearchListeners() {
    const searchInput = document.getElementById('modalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(modalSearchPatients, 400);
        });
    }

    const searchBtn = document.getElementById('modalSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', modalSearchPatients);
    }
}

async function modalSearchPatients() {
    const searchInput = document.getElementById('modalSearchInput');
    if (!searchInput) return;
    
    const keyword = searchInput.value.trim();
    if (keyword.length < 2) {
        const resultsDiv = document.getElementById('modalSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/patients/search?keyword=${encodeURIComponent(keyword)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        const resultsDiv = document.getElementById('modalSearchResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'block';

        if (data.data?.length > 0) {
            data.data.forEach(p => {
                const item = document.createElement('div');
                item.className = 'p-2 border-bottom hover-bg-light cursor-pointer';
                item.style.cursor = 'pointer';
                item.innerHTML = `
                    <div class="fw-bold">${p.HoTen}</div>
                    <small class="text-muted">
                        ${formatPhoneNumber(p.SoDienThoai)} • ${p.NgaySinh ? formatDate(p.NgaySinh) : 'Chưa có ngày sinh'}
                    </small>
                `;
                item.onclick = () => selectPatientInModal(p);
                resultsDiv.appendChild(item);
            });
        } else {
            resultsDiv.innerHTML = '<p class="text-center text-muted py-3">Không tìm thấy bệnh nhân</p>';
        }
    } catch (err) {
        showToast('error', 'Lỗi khi tìm kiếm bệnh nhân');
    }
}

function selectPatientInModal(patient) {
    selectedPatient = patient;
    document.getElementById('selectedPatientInModal').style.display = 'block';
    document.getElementById('selectedPatientNameModal').textContent = patient.HoTen;
    document.getElementById('selectedPatientInfoModal').innerHTML = 
        `${formatPhoneNumber(patient.SoDienThoai)} • ${patient.GioiTinh || ''} • ${patient.NgaySinh ? formatDate(patient.NgaySinh) : 'Chưa có ngày sinh'}`;
    document.getElementById('modalSearchResults').style.display = 'none';
    document.getElementById('modalSearchInput').value = '';
    
    // Nếu là appointment, load lịch hẹn của bệnh nhân
    if (currentTicketType === 'APPOINTMENT') {
        loadPatientAppointments(patient.MaBN);
    }
}

async function loadPatientAppointments(patientId) {
    try {
        const res = await fetch(`${API_BASE_URL}/patients/${patientId}/appointments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        
        const appointmentList = document.getElementById('appointmentList');
        appointmentList.innerHTML = '';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(apt => {
                const div = document.createElement('div');
                div.className = 'appointment-item p-2 border-bottom cursor-pointer';
                div.onclick = () => selectAppointment(apt);
                div.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <strong>${formatDateTime(apt.NgayHen, apt.GioHen)}</strong>
                        <span class="badge bg-info">${apt.TrangThai}</span>
                    </div>
                    <small>Bác sĩ: ${apt.TenBacSi || 'Chưa phân công'}</small><br>
                    <small>Lý do: ${apt.LyDoKham || 'Không có'}</small>
                `;
                appointmentList.appendChild(div);
            });
        } else {
            appointmentList.innerHTML = '<p class="text-center text-muted py-3">Bệnh nhân không có lịch hẹn</p>';
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Lỗi tải lịch hẹn');
    }
}

function selectAppointment(appointment) {
    selectedAppointment = appointment;
    
    // Highlight item được chọn
    document.querySelectorAll('.appointment-item').forEach(el => {
        el.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    showToast('success', `Đã chọn lịch hẹn ngày ${formatDateTime(appointment.NgayHen, appointment.GioHen)}`);
}

function clearSelectedPatient() {
    selectedPatient = null;
    selectedAppointment = null;
    document.getElementById('selectedPatientInModal').style.display = 'none';
}

// tạo phiếu khám
async function createTicket() {
    console.log('Bắt đầu tạo phiếu...');
    
    // Kiểm tra loại phiếu
    if (!currentTicketType) {
        showToast('warning', 'Vui lòng chọn loại phiếu khám');
        return;
    }
    
    // Kiểm tra bệnh nhân
    if (!selectedPatient) {
        showToast('warning', 'Vui lòng chọn bệnh nhân');
        return;
    }
    
    const MaBN = selectedPatient.MaBN;
    
    let requestData = {
        MaBN,
        LoaiKham: currentTicketType
    };
    
    // Xử lý theo từng loại
    if (currentTicketType === 'WALK_IN') {
        const MaChuyenKhoa = document.getElementById('modalSpecialtySelect').value;
        if (!MaChuyenKhoa) {
            showToast('warning', 'Vui lòng chọn chuyên khoa');
            return;
        }
        requestData.MaChuyenKhoa = MaChuyenKhoa;
        
        // Lấy mã bác sĩ từ dropdown (nếu có chọn)
        const doctorSelect = document.getElementById('modalDoctorSelect');
        if (doctorSelect && doctorSelect.value) {
            requestData.MaBacSi = doctorSelect.value;
            console.log('Bệnh nhân chọn bác sĩ:', doctorSelect.value);
        } else {
            console.log('Bệnh nhân không chọn bác sĩ, hệ thống sẽ tự động xếp');
        }
        
    } else if (currentTicketType === 'APPOINTMENT') {
        if (!selectedAppointment) {
            showToast('warning', 'Vui lòng chọn lịch hẹn');
            return;
        }
        requestData.MaLK = selectedAppointment.MaLK;
    }

    console.log('Dữ liệu gửi:', requestData);
    showLoading();

    try {
        const token = localStorage.getItem('token');
        
        const apiUrl = currentTicketType === 'WALK_IN' 
            ? `${API_BASE_URL}/tickets/walk-in`
            : `${API_BASE_URL}/tickets/appointment`;

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', res.status);
        
        const data = await res.json();
        console.log('Response data:', data);

        if (!res.ok) {
            if (data.message?.includes('đã có phiếu khám hôm nay')) {
                showToast('warning', data.message);
            } else {
                throw new Error(data.message || 'Không thể tạo phiếu');
            }
            return;
        }

        const ticketTypeText = currentTicketType === 'WALK_IN' ? 'tại chỗ' : 'hẹn trước';
        showToast('success', `Tạo phiếu ${ticketTypeText} thành công! Số thứ tự: #${data.ticket?.STT?.toString().padStart(2,'0') || '—'}`);

        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTicketModal'));
        if (modal) modal.hide();
        
        // Reset form
        resetModalForm();
        
        // Reload danh sách
        loadWaitingList();

        // In phiếu
        if (confirm('Bạn có muốn in phiếu khám ngay không?')) {
            printTicket(data.ticket || { 
                STT: data.ticket?.STT, 
                TenBenhNhan: selectedPatient.HoTen, 
                SoDienThoai: selectedPatient.SoDienThoai,
                TenBacSi: data.ticket?.TenBacSi,
                LoaiKham: currentTicketType
            });
        }

    } catch (err) {
        console.error('Lỗi:', err);
        showToast('error', err.message || 'Lỗi hệ thống');
    } finally {
        hideLoading();
    }
}

// Reset form
function resetModalForm() {
    // Reset loại phiếu
    currentTicketType = '';
    document.getElementById('selectedTicketType').value = '';
    document.getElementById('typeWalkIn').classList.remove('selected');
    document.getElementById('typeAppointment').classList.remove('selected');
    document.getElementById('appointmentSection').style.display = 'none';
    document.getElementById('specialtySection').style.display = 'block';
    
    // Reset bệnh nhân
    clearSelectedPatient();
    
    // Reset chuyên khoa
    const specialtySelect = document.getElementById('modalSpecialtySelect');
    if (specialtySelect) {
        specialtySelect.value = '';
    }
    
    // Reset bác sĩ
    const doctorSelect = document.getElementById('modalDoctorSelect');
    if (doctorSelect) {
        doctorSelect.innerHTML = '<option value="">-- Chọn chuyên khoa trước --</option>';
        doctorSelect.disabled = true;
    }
    
    // Reset lịch hẹn
    const appointmentList = document.getElementById('appointmentList');
    if (appointmentList) {
        appointmentList.innerHTML = '';
    }
    
    selectedAppointment = null;
}

// In phiếu
function printTicket(ticket) {
    const printWindow = window.open('', '_blank');
    const now = new Date();
    const ticketType = ticket.LoaiKham === 'APPOINTMENT' ? 'Hẹn trước' : 'Tại chỗ';
    
    printWindow.document.write(`
        <html>
        <head><title>Phiếu khám</title></head>
        <body style="font-family: Arial; text-align: center; padding: 20px;">
            <h2>PHÒNG KHÁM CLINIC</h2>
            <h3>PHIẾU KHÁM BỆNH</h3>
            <hr>
            <h1 style="font-size: 60px; color: #0066cc;">#${(ticket.STT || '').toString().padStart(2, '0')}</h1>
            <p><strong>Loại:</strong> ${ticketType}</p>
            <p><strong>Bệnh nhân:</strong> ${ticket.TenBenhNhan || ''}</p>
            <p><strong>SĐT:</strong> ${formatPhoneNumber(ticket.SoDienThoai || '')}</p>
            <p><strong>Bác sĩ:</strong> ${ticket.TenBacSi || 'Hệ thống tự động xếp'}</p>
            <p><strong>Ngày:</strong> ${now.toLocaleDateString('vi-VN')}</p>
            <p><strong>Giờ:</strong> ${now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
            <hr>
            <p>Vui lòng chờ đến lượt khám</p>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Đăng xuất
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
}

// Reset khi đóng modal
document.getElementById('createTicketModal')?.addEventListener('hidden.bs.modal', function () {
    resetModalForm();
});