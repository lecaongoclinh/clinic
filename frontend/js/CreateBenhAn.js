document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'signin.html';
        return;
    }

    const username = localStorage.getItem('username') || '';
    const usernameSidebar = document.getElementById('usernameSidebar');
    if (usernameSidebar) {
        usernameSidebar.textContent = username;
    }

    // Form elements
    const specialtyFilter = document.getElementById('specialtyFilter');
    const doctorFilter = document.getElementById('doctorFilter');
    const patientSearchInput = document.getElementById('patientSearchInput');
    const btnFilter = document.getElementById('btnFilter');
    const examTicketsList = document.getElementById('examTicketsList');
    const emptyState = document.getElementById('emptyState');

    // Modal elements
    const createRecordModal = new bootstrap.Modal(document.getElementById('createRecordModal'));
    const modalPatientName = document.getElementById('modalPatientName');
    const modalPatientDOB = document.getElementById('modalPatientDOB');
    const modalPatientGender = document.getElementById('modalPatientGender');
    const modalDoctorName = document.getElementById('modalDoctorName');
    const modalSpecialty = document.getElementById('modalSpecialty');
    const modalVisitDate = document.getElementById('modalVisitDate');
    const modalMaPK = document.getElementById('modalMaPK');
    const modalMaBacSi = document.getElementById('modalMaBacSi');
    const modalMaBN = document.getElementById('modalMaBN');
    const modalTrieuChung = document.getElementById('modalTrieuChung');
    const modalChuanDoan = document.getElementById('modalChuanDoan');
    const modalGhiChu = document.getElementById('modalGhiChu');
    const btnSaveCreateRecord = document.getElementById('btnSaveCreateRecord');

    let allTickets = [];
    let allSpecialties = [];
    let allDoctors = [];

    function authHeaders(hasBody = false) {
        const headers = { Authorization: `Bearer ${token}` };
        if (hasBody) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders(Boolean(options.body)),
                ...(options.headers || {})
            }
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Không thể xử lý yêu cầu');
        }

        return data;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatDate(value) {
        if (!value) return 'N/A';
        const text = String(value);
        const isoDate = text.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            const [year, month, day] = isoDate.split('-');
            return `${day}/${month}/${year}`;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? text : date.toLocaleDateString('vi-VN');
    }

    function formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    // Load specialties
    async function loadSpecialties() {
        try {
            const payload = await fetchJson(`${API_BASE}/medical-records/specialties`);
            allSpecialties = Array.isArray(payload) ? payload : payload.data || [];

            allSpecialties.forEach((specialty) => {
                specialtyFilter.add(new Option(specialty.TenChuyenKhoa, specialty.MaChuyenKhoa));
            });
        } catch (error) {
            console.error('Lỗi load chuyên khoa:', error);
        }
    }

    // Load doctors - this would need an API endpoint
    // For now, we'll filter doctors from exam tickets
    function updateDoctorsList() {
        const doctors = new Map();
        allTickets.forEach(ticket => {
            if (ticket.MaBacSi && ticket.TenBacSi) {
                doctors.set(ticket.MaBacSi, ticket.TenBacSi);
            }
        });

        // Clear existing options except first
        while (doctorFilter.options.length > 1) {
            doctorFilter.remove(1);
        }

        // Add doctor options
        doctors.forEach((name, id) => {
            doctorFilter.add(new Option(name, id));
        });
    }

    // Load exam tickets
    async function loadExamTickets() {
        try {
            const params = new URLSearchParams();
            params.append('limit', '100');
            params.append('page', '1');

            const response = await fetchJson(`${API_BASE}/medical-records/exam-tickets?${params.toString()}`);
            allTickets = response.data || [];
            updateDoctorsList();
            filterAndRenderTickets();
        } catch (error) {
            console.error('Lỗi load phiếu khám:', error);
            emptyState.style.display = 'block';
            examTicketsList.innerHTML = '';
        }
    }

    // Filter exam tickets
    function filterAndRenderTickets() {
        const specialtyValue = specialtyFilter.value;
        const doctorValue = doctorFilter.value;
        const patientSearch = patientSearchInput.value.trim().toLowerCase();

        let filtered = allTickets;

        // Filter by specialty
        if (specialtyValue) {
            filtered = filtered.filter(ticket => ticket.MaChuyenKhoa == specialtyValue);
        }

        // Filter by doctor
        if (doctorValue) {
            filtered = filtered.filter(ticket => ticket.MaBacSi == doctorValue);
        }

        // Filter by patient search
        if (patientSearch) {
            filtered = filtered.filter(ticket => {
                const fullName = String(ticket.TenBenhNhan || '').toLowerCase();
                const patientId = String(ticket.MaBenhNhan || ticket.MaBN || '').toLowerCase();
                return fullName.includes(patientSearch) || patientId.includes(patientSearch);
            });
        }

        // Filter by status (done or ongoing - not cancelled, not pending)
        filtered = filtered.filter(ticket => {
            const status = String(ticket.TrangThai || '');
            return status === 'DaKham' || status === 'DangKham' || status === 'Completed' || status === 'InProgress';
        });

        renderExamTickets(filtered);
    }

    // Render exam tickets as cards
    function renderExamTickets(tickets) {
        examTicketsList.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tickets.forEach((ticket, index) => {
            const statusBadgeClass = ticket.TrangThai === 'DangKham' || ticket.TrangThai === 'InProgress' ? 'badge-ongoing' : 'badge-done';
            const statusText = ticket.TrangThai === 'DangKham' || ticket.TrangThai === 'InProgress' ? 'Đang khám' : 'Đã khám xong';

            const card = document.createElement('div');
            card.className = 'exam-ticket-card';
            card.innerHTML = `
                <div class="exam-ticket-info">
                    <div class="patient-info">
                        <strong>#${escapeHtml(ticket.MaPK)} - ${escapeHtml(ticket.TenBenhNhan)}</strong>
                        <small>ID: ${escapeHtml(ticket.MaBenhNhan)} | ${formatDate(ticket.NgaySinh)}</small>
                        <small>Bác sĩ: ${escapeHtml(ticket.TenBacSi || 'Chưa được gán')}</small>
                        <small>Chuyên khoa: ${escapeHtml(ticket.TenChuyenKhoa || 'N/A')}</small>
                        <small>Ngày khám: ${formatDate(ticket.NgayKham)}</small>
                    </div>
                    <div class="text-end">
                        <div class="mb-2">
                            <span class="badge-status ${statusBadgeClass}">${statusText}</span>
                        </div>
                        <button class="btn btn-sm btn-primary btn-create-record" data-index="${index}">
                            <i class="fa fa-plus me-1"></i>Tạo Bệnh Án
                        </button>
                    </div>
                </div>
            `;
            examTicketsList.appendChild(card);
        });

        // Add event listeners for create buttons
        document.querySelectorAll('.btn-create-record').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                openCreateRecordModal(filtered[index]);
            });
        });
    }

    // Open create record modal
    function openCreateRecordModal(ticket) {
        // Fill modal with ticket data
        modalMaPK.value = ticket.MaPK;
        modalMaBacSi.value = ticket.MaBacSi || '';
        modalMaBN.value = ticket.MaBenhNhan || ticket.MaBN || '';
        
        modalPatientName.textContent = ticket.TenBenhNhan || 'N/A';
        modalPatientDOB.textContent = formatDate(ticket.NgaySinh);
        modalPatientGender.textContent = ticket.GioiTinh || 'N/A';
        modalDoctorName.textContent = ticket.TenBacSi || 'Chưa được gán';
        modalSpecialty.textContent = ticket.TenChuyenKhoa || 'N/A';
        modalVisitDate.textContent = formatDate(ticket.NgayKham);

        // Clear form fields
        modalTrieuChung.value = '';
        modalChuanDoan.value = '';
        modalGhiChu.value = '';

        // Show modal
        createRecordModal.show();
    }

    // Save create record
    async function saveCreateRecord() {
        const maPK = modalMaPK.value.trim();
        const maBacSi = modalMaBacSi.value.trim();
        const trieuChung = modalTrieuChung.value.trim();
        const chuanDoan = modalChuanDoan.value.trim();
        const ghiChu = modalGhiChu.value.trim();

        if (!maPK || !maBacSi) {
            alert('Thông tin phiếu khám không hợp lệ');
            return;
        }

        if (!trieuChung || !chuanDoan) {
            alert('Vui lòng nhập đầy đủ triệu chứng và chẩn đoán');
            return;
        }

        try {
            btnSaveCreateRecord.disabled = true;
            btnSaveCreateRecord.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Đang lưu...';

            const result = await fetchJson(`${API_BASE}/medical-records`, {
                method: 'POST',
                body: JSON.stringify({
                    maPK: parseInt(maPK),
                    maBacSi: parseInt(maBacSi),
                    trieuChung,
                    chuanDoan,
                    ghiChu
                })
            });

            alert(result.message || 'Tạo bệnh án thành công!');
            createRecordModal.hide();
            
            // Reload tickets
            await loadExamTickets();
        } catch (error) {
            console.error('Lỗi tạo bệnh án:', error);
            alert(error.message || 'Không thể tạo bệnh án');
        } finally {
            btnSaveCreateRecord.disabled = false;
            btnSaveCreateRecord.innerHTML = '<i class="fa fa-save me-1"></i>Lưu Bệnh Án';
        }
    }

    // Event listeners
    btnFilter.addEventListener('click', filterAndRenderTickets);
    patientSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            filterAndRenderTickets();
        }
    });

    specialtyFilter.addEventListener('change', filterAndRenderTickets);
    doctorFilter.addEventListener('change', filterAndRenderTickets);

    btnSaveCreateRecord.addEventListener('click', saveCreateRecord);

    // Initialize
    (async function() {
        try {
            await loadSpecialties();
            await loadExamTickets();
        } catch (error) {
            console.error('Lỗi khởi tạo:', error);
        }
    })();
});
