const API_BASE_URL = 'http://localhost:3000/api';
let selectedPatient = null;
let selectedAppointment = null;
let searchTimeout;
let currentTicketType = '';

function showLoading() {
    console.log('Loading...');
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.style.display = 'block';
    }
}

function hideLoading() { 
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.style.display = 'none'; 
    }
}

function showToast(type, message, duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>`;
    
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: duration });
    bsToast.show();
    
    setTimeout(() => toast.remove(), duration + 500);
}

function formatPhoneNumber(phone) {
    if (!phone) return 'Chưa có SĐT';
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
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
    
    // Khởi tạo modal khi trang load
    initializeModal();
});

function initializeModal() {
    const modalElement = document.getElementById('createTicketModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', function () {
            resetModalForm();
        });
    }
}

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
        const countEl = document.getElementById('waitingCount');
        if (countEl) countEl.textContent = data.total || 0;

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
        console.error('Error loading waiting list:', err);
    }
}

// Chọn loại phiếu khám
function selectTicketType(type) {
    currentTicketType = type;
    const typeInput = document.getElementById('selectedTicketType');
    if (typeInput) typeInput.value = type;
    
    document.getElementById('typeWalkIn')?.classList.remove('selected');
    document.getElementById('typeAppointment')?.classList.remove('selected');
    
    if (type === 'WALK_IN') {
        document.getElementById('typeWalkIn')?.classList.add('selected');
        document.getElementById('appointmentSection').style.display = 'none';
        document.getElementById('specialtySection').style.display = 'block';
    } else {
        document.getElementById('typeAppointment')?.classList.add('selected');
        document.getElementById('appointmentSection').style.display = 'block';
        document.getElementById('specialtySection').style.display = 'none';
    }
    
    clearSelectedPatient();
    selectedAppointment = null;
}

// Mở modal tạo phiếu
function openCreateTicketModal() {
    const modalEl = document.getElementById('createTicketModal');
    if (!modalEl) return;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    loadSpecialtiesToModal();
    resetModalForm();
}

// Tải danh sách chuyên khoa
async function loadSpecialtiesToModal() {
    try {
        const res = await fetch(`${API_BASE_URL}/tickets/specialties`, {
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
        console.error('Error loading specialties:', err);
        showToast('error', 'Không tải được danh sách chuyên khoa');
    }
}

// Xử lý khi thay đổi chuyên khoa
async function handleSpecialtyChange(select) {
    const specialtyId = select.value;
    console.log('Chọn chuyên khoa:', specialtyId);
    
    const doctorSelect = document.getElementById('modalDoctorSelect');
    if (!doctorSelect) return;
    
    if (!specialtyId) {
        doctorSelect.innerHTML = '<option value="">Chọn chuyên khoa trước</option>';
        doctorSelect.disabled = true;
        return;
    }
    
    doctorSelect.innerHTML = '<option value="">Đang tải danh sách bác sĩ...</option>';
    doctorSelect.disabled = true;
    
    try {
        console.log('Đang gọi API:', `${API_BASE_URL}/tickets/doctors/specialty/${specialtyId}`);
        
        const res = await fetch(`${API_BASE_URL}/tickets/doctors/specialty/${specialtyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await res.json();
        console.log('Danh sách bác sĩ:', data);
        
        doctorSelect.innerHTML = '<option value="">Hệ thống tự động xếp</option>';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.MaNV;
                
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

// Thiết lập listeners cho tìm kiếm
function setupSearchListeners() {
    const searchInput = document.getElementById('modalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(modalSearchPatients, 400);
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                modalSearchPatients();
            }
        });
    }

    const searchBtn = document.getElementById('modalSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', modalSearchPatients);
    }
    
    // Click outside để đóng kết quả tìm kiếm
    document.addEventListener('click', function(e) {
        const resultsDiv = document.getElementById('modalSearchResults');
        const searchInput = document.getElementById('modalSearchInput');
        if (resultsDiv && searchInput && !resultsDiv.contains(e.target) && !searchInput.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
}

// Tìm kiếm bệnh nhân
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
        const res = await fetch(`${API_BASE_URL}/tickets/patients/search?keyword=${encodeURIComponent(keyword)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/signin';
            return;
        }
        
        const data = await res.json();

        const resultsDiv = document.getElementById('modalSearchResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'block';

        if (data.data?.length > 0) {
            data.data.forEach(p => {
                const item = document.createElement('div');
                item.className = 'p-2 border-bottom hover-bg-light';
                item.style.cursor = 'pointer';
                item.onmouseover = () => item.classList.add('bg-light');
                item.onmouseout = () => item.classList.remove('bg-light');
                item.innerHTML = `
                    <div class="fw-bold">${p.HoTen}</div>
                    <small class="text-muted">
                        ${formatPhoneNumber(p.SoDienThoai)} • ${p.GioiTinh || 'Chưa có'} • ${p.NgaySinh ? formatDate(p.NgaySinh) : 'Chưa có ngày sinh'}
                    </small>
                `;
                item.onclick = () => selectPatientInModal(p);
                resultsDiv.appendChild(item);
            });
        } else {
            resultsDiv.innerHTML = '<p class="text-center text-muted py-3">Không tìm thấy bệnh nhân</p>';
        }
    } catch (err) {
        console.error('Search error:', err);
        showToast('error', 'Lỗi khi tìm kiếm bệnh nhân');
    }
}

// Chọn bệnh nhân
function selectPatientInModal(patient) {
    selectedPatient = patient;
    selectedAppointment = null;
    
    const selectedDiv = document.getElementById('selectedPatientInModal');
    if (selectedDiv) selectedDiv.style.display = 'block';
    
    document.getElementById('selectedPatientNameModal').textContent = patient.HoTen;
    document.getElementById('selectedPatientInfoModal').innerHTML = 
        `${formatPhoneNumber(patient.SoDienThoai)} • ${patient.GioiTinh || 'Chưa có'} • ${patient.NgaySinh ? formatDate(patient.NgaySinh) : 'Chưa có ngày sinh'}`;
    
    const resultsDiv = document.getElementById('modalSearchResults');
    if (resultsDiv) resultsDiv.style.display = 'none';
    
    const searchInput = document.getElementById('modalSearchInput');
    if (searchInput) searchInput.value = '';
    
    if (currentTicketType === 'APPOINTMENT') {
        loadPatientAppointments(patient.MaBN);
    }
}

// Tải lịch hẹn của bệnh nhân
async function loadPatientAppointments(patientId) {
    try {
        const res = await fetch(`${API_BASE_URL}/tickets/patients/${patientId}/appointments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/signin';
            return;
        }
        
        const data = await res.json();
        
        const appointmentList = document.getElementById('appointmentList');
        if (!appointmentList) return;
        
        appointmentList.innerHTML = '';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(apt => {
                const div = document.createElement('div');
                div.className = 'appointment-item p-3 border-bottom cursor-pointer';
                div.style.cursor = 'pointer';
                div.onmouseover = () => div.classList.add('bg-light');
                div.onmouseout = () => div.classList.remove('bg-light');
                div.onclick = (e) => selectAppointment(apt, e);
                div.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${formatDateTime(apt.NgayHen, apt.GioHen)}</strong>
                            <span class="badge bg-info ms-2">${apt.TrangThai === 'ChoXacNhan' ? 'Chờ xác nhận' : 'Đã xác nhận'}</span>
                        </div>
                    </div>
                    <small class="text-muted">Bác sĩ: ${apt.TenBacSi || 'Chưa phân công'}</small>
                    ${apt.LyDoKham ? `<br><small class="text-muted">Lý do: ${apt.LyDoKham}</small>` : ''}
                `;
                appointmentList.appendChild(div);
            });
        } else {
            appointmentList.innerHTML = '<p class="text-center text-muted py-3">Bệnh nhân không có lịch hẹn phù hợp</p>';
        }
    } catch (err) {
        console.error('Load appointments error:', err);
        showToast('error', 'Lỗi tải lịch hẹn');
    }
}

// Chọn lịch hẹn
function selectAppointment(appointment, event) {
    selectedAppointment = appointment;
    
    document.querySelectorAll('.appointment-item').forEach(el => {
        el.classList.remove('selected', 'bg-primary', 'text-white');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected', 'bg-primary', 'text-white');
    }
    
    showToast('success', `Đã chọn lịch hẹn ngày ${formatDateTime(appointment.NgayHen, appointment.GioHen)}`);
}

// Xóa chọn bệnh nhân
function clearSelectedPatient() {
    selectedPatient = null;
    selectedAppointment = null;
    
    const selectedDiv = document.getElementById('selectedPatientInModal');
    if (selectedDiv) selectedDiv.style.display = 'none';
    
    document.getElementById('selectedPatientNameModal').textContent = '';
    document.getElementById('selectedPatientInfoModal').innerHTML = '';
    
    const appointmentList = document.getElementById('appointmentList');
    if (appointmentList) appointmentList.innerHTML = '';
}

// Tạo phiếu khám
async function createTicket() {
    console.log('Bắt đầu tạo phiếu...');
    
    if (!currentTicketType) {
        showToast('warning', 'Vui lòng chọn loại phiếu khám');
        return;
    }
    
    if (!selectedPatient) {
        showToast('warning', 'Vui lòng chọn bệnh nhân');
        return;
    }
    

    const patientName = selectedPatient.HoTen;
    const patientPhone = selectedPatient.SoDienThoai;
    const patientMaBN = selectedPatient.MaBN;
    const ticketType = currentTicketType;
    
    console.log('Thông tin bệnh nhân đã lưu:', { patientName, patientPhone, patientMaBN });
    
    let requestData = { MaBN: patientMaBN };
    let apiUrl = '';
    
    if (ticketType === 'WALK_IN') {
        const MaChuyenKhoa = document.getElementById('modalSpecialtySelect').value;
        if (!MaChuyenKhoa) {
            showToast('warning', 'Vui lòng chọn chuyên khoa');
            return;
        }
        requestData.MaChuyenKhoa = MaChuyenKhoa;
        
        const doctorSelect = document.getElementById('modalDoctorSelect');
        if (doctorSelect && doctorSelect.value) {
            requestData.MaBacSi = doctorSelect.value;
            console.log('Bệnh nhân chọn bác sĩ:', doctorSelect.value);
        }
        
        apiUrl = `${API_BASE_URL}/tickets/walk-in`;
        
    } else if (ticketType === 'APPOINTMENT') {
        if (!selectedAppointment) {
            showToast('warning', 'Vui lòng chọn lịch hẹn');
            return;
        }
        requestData.MaLK = selectedAppointment.MaLK;
        apiUrl = `${API_BASE_URL}/tickets/appointment`;
    }

    console.log('Dữ liệu gửi:', requestData);
    showLoading();

    try {
        const token = localStorage.getItem('token');
        
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', res.status);
        
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/signin';
            return;
        }
        
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

        const ticketTypeText = ticketType === 'WALK_IN' ? 'tại chỗ' : 'hẹn trước';
        showToast('success', `Tạo phiếu ${ticketTypeText} thành công! Số thứ tự: #${data.ticket?.STT?.toString().padStart(2,'0') || '—'}`);

        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTicketModal'));
        if (modal) modal.hide();
        
        // Reset form
        resetModalForm();
        
        // Load lại danh sách chờ
        loadWaitingList();

      
        if (confirm('Bạn có muốn in phiếu khám ngay không?')) {
            printTicket({
                STT: data.ticket?.STT,
                TenBenhNhan: patientName,  
                SoDienThoai: patientPhone, 
                TenBacSi: data.ticket?.TenBacSi,
                LoaiKham: ticketType  
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
    currentTicketType = '';
    const typeInput = document.getElementById('selectedTicketType');
    if (typeInput) typeInput.value = '';
    
    document.getElementById('typeWalkIn')?.classList.remove('selected');
    document.getElementById('typeAppointment')?.classList.remove('selected');
    document.getElementById('appointmentSection').style.display = 'none';
    document.getElementById('specialtySection').style.display = 'block';
    
    clearSelectedPatient();
    
    const specialtySelect = document.getElementById('modalSpecialtySelect');
    if (specialtySelect) {
        specialtySelect.value = '';
    }
    
    const doctorSelect = document.getElementById('modalDoctorSelect');
    if (doctorSelect) {
        doctorSelect.innerHTML = '<option value="">Chọn chuyên khoa trước</option>';
        doctorSelect.disabled = true;
    }
    
    const appointmentList = document.getElementById('appointmentList');
    if (appointmentList) {
        appointmentList.innerHTML = '';
    }
    
    const searchInput = document.getElementById('modalSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    const searchResults = document.getElementById('modalSearchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
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
        <head>
            <title>Phiếu khám</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                h2 { color: #333; }
                h1 { font-size: 60px; color: #0066cc; margin: 20px 0; }
                hr { margin: 20px 0; }
                p { margin: 10px 0; }
                .info { text-align: left; max-width: 300px; margin: 0 auto; }
            </style>
        </head>
        <body>
            <h2>PHÒNG KHÁM</h2>
            <h3>PHIẾU KHÁM BỆNH</h3>
            <hr>
            <h1>#${(ticket.STT || '').toString().padStart(2, '0')}</h1>
            <div class="info">
                <p><strong>Loại:</strong> ${ticketType}</p>
                <p><strong>Bệnh nhân:</strong> ${ticket.TenBenhNhan || ''}</p>
                <p><strong>SĐT:</strong> ${formatPhoneNumber(ticket.SoDienThoai || '')}</p>
                <p><strong>Bác sĩ:</strong> ${ticket.TenBacSi || 'Hệ thống tự động xếp'}</p>
                <p><strong>Ngày:</strong> ${now.toLocaleDateString('vi-VN')}</p>
                <p><strong>Giờ:</strong> ${now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
            <hr>
            <p>Vui lòng chờ đến lượt khám</p>
            <script>
                window.onload = function() { 
                    setTimeout(function() { window.print(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Đăng xuất
function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/signin';
    }
}

// Export functions for global use
window.selectTicketType = selectTicketType;
window.openCreateTicketModal = openCreateTicketModal;
window.handleSpecialtyChange = handleSpecialtyChange;
window.createTicket = createTicket;
window.logout = logout;