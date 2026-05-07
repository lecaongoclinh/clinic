document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'signin.html';
        return;
    }

    const username = localStorage.getItem('fullName') || localStorage.getItem('username') || '';
    const usernameSidebar = document.getElementById('usernameSidebar');
    if (usernameSidebar) {
        usernameSidebar.textContent = username;
    }

    const tenBNInput = document.getElementById('tenBNInput');
    const chuyenKhoaSelect = document.getElementById('chuyenKhoaSelect');
    const pageLimitSelect = document.getElementById('pageLimitSelect');
    const fromDateInput = document.getElementById('fromDateInput');
    const toDateInput = document.getElementById('toDateInput');
    const btnSearch = document.getElementById('btnSearch');
    const btnReset = document.getElementById('btnReset');
    const patientTableBody = document.getElementById('patientTableBody');
    const paginationControl = document.getElementById('paginationControl');
    const currentPageInfo = document.getElementById('currentPageInfo');
    const totalRecordsInfo = document.getElementById('totalRecordsInfo');

    const createDoctorIdInput = document.getElementById('createDoctorIdInput');
    const ticketDateInput = document.getElementById('ticketDateInput');
    const ticketPatientSearchInput = document.getElementById('ticketPatientSearchInput');
    const examTicketSelect = document.getElementById('examTicketSelect');
    const selectedTicketInfo = document.getElementById('selectedTicketInfo');
    const createTrieuChungInput = document.getElementById('createTrieuChungInput');
    const createChuanDoanInput = document.getElementById('createChuanDoanInput');
    const createGhiChuInput = document.getElementById('createGhiChuInput');
    const btnRefreshTickets = document.getElementById('btnRefreshTickets');
    const btnClearCreateRecord = document.getElementById('btnClearCreateRecord');
    const btnSaveCreateRecord = document.getElementById('btnSaveCreateRecord');

    const recordMaBAInput = document.getElementById('recordMaBA');
    const recordMaBacSiInput = document.getElementById('recordMaBacSi');
    const recordTrieuChung = document.getElementById('recordTrieuChung');
    const recordChuanDoan = document.getElementById('recordChuanDoan');
    const recordGhiChu = document.getElementById('recordGhiChu');
    const btnEditRecord = document.getElementById('btnEditRecord');
    const btnCancelEditRecord = document.getElementById('btnCancelEditRecord');
    const btnSaveRecord = document.getElementById('btnSaveRecord');
    const medicalHistoryBody = document.getElementById('medicalHistoryBody');

    const medicalDetailModal = new bootstrap.Modal(document.getElementById('medicalDetailModal'));
    const recordDetailModal = new bootstrap.Modal(document.getElementById('recordDetailModal'));

    let currentPage = 1;
    let totalRecords = 0;
    let pageLimit = parseInt(pageLimitSelect.value, 10) || 10;
    let eligibleTickets = [];
    let currentRecordSnapshot = null;
    let currentHistoryPatientId = null;

    function parseJwtPayload(jwt) {
        try {
            const payload = jwt.split('.')[1];
            if (!payload) return null;
            return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        } catch (error) {
            return null;
        }
    }

    function getCurrentDoctorId() {
        const storedId = localStorage.getItem('maNV') || localStorage.getItem('MaNV');
        if (storedId) return storedId;

        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user?.MaNV) return user.MaNV;
            if (user?.id) return user.id;
        } catch (error) {
            // Ignore malformed localStorage data.
        }

        return parseJwtPayload(token)?.id || '';
    }

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

    function truncateText(value, maxLength = 50) {
        const text = String(value || '');
        if (!text) return 'N/A';
        return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

    function formatTime(value) {
        if (!value) return '';
        return String(value).slice(0, 5);
    }

    function todayIso() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${now.getFullYear()}-${month}-${day}`;
    }

    function buildPatientQueryParams(page = 1) {
        const params = new URLSearchParams();
        const tenBN = tenBNInput.value.trim();
        const maChuyenKhoa = chuyenKhoaSelect.value;
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        if (tenBN) params.append('tenBN', tenBN);
        if (maChuyenKhoa) params.append('maChuyenKhoa', maChuyenKhoa);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        params.append('page', page);
        params.append('limit', pageLimit);

        return params.toString();
    }

    async function loadSpecialties() {
        try {
            const payload = await fetchJson(`${API_BASE}/medical-records/specialties`);
            const specialties = Array.isArray(payload) ? payload : payload.data || [];

            specialties.forEach((specialty) => {
                chuyenKhoaSelect.add(new Option(specialty.TenChuyenKhoa, specialty.MaChuyenKhoa));
            });
        } catch (error) {
            console.error('Lỗi load chuyên khoa:', error);
        }
    }

    function renderPatientRows(patients, page) {
        patientTableBody.innerHTML = '';

        if (!Array.isArray(patients) || patients.length === 0) {
            patientTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có bệnh nhân nào</td></tr>';
            paginationControl.innerHTML = '';
            updatePaginationInfo(page);
            return;
        }

        patients.forEach((patient) => {
            const row = document.createElement('tr');
            row.dataset.address = patient.DiaChi || 'N/A';
            row.innerHTML = `
                <td>${escapeHtml(patient.MaBN)}</td>
                <td>${escapeHtml(patient.HoTen)}</td>
                <td>${formatDate(patient.NgaySinh)}</td>
                <td>${escapeHtml(patient.GioiTinh || 'N/A')}</td>
                <td>${escapeHtml(patient.SoDienThoai || 'N/A')}</td>
                <td><span class="badge bg-primary">${escapeHtml(patient.SoLanKham || 0)}</span></td>
                <td>${formatDate(patient.LanKhamGanNhat)}</td>
                <td>
                    <button class="btn btn-sm btn-info view-btn" data-maban="${escapeHtml(patient.MaBN)}">
                        <i class="fa fa-eye me-1"></i>Xem
                    </button>
                </td>
            `;
            patientTableBody.appendChild(row);
        });

        renderPagination(page);
        updatePaginationInfo(page);
    }

    async function loadAllPatients(page = 1) {
        try {
            currentPage = page;
            const data = await fetchJson(`${API_BASE}/medical-records/all-patients?${buildPatientQueryParams(page)}`);
            totalRecords = data.total || 0;
            renderPatientRows(data.data || [], page);
        } catch (error) {
            console.error('Lỗi load bệnh nhân:', error);
            alert(error.message || 'Lỗi tải danh sách bệnh nhân');
        }
    }

    async function loadPatientsBySpecialty(page = 1) {
        if (!chuyenKhoaSelect.value && !tenBNInput.value.trim() && !fromDateInput.value && !toDateInput.value) {
            await loadAllPatients(page);
            return;
        }

        try {
            currentPage = page;
            const data = await fetchJson(`${API_BASE}/medical-records/patients-by-specialty?${buildPatientQueryParams(page)}`);
            totalRecords = data.total || 0;
            renderPatientRows(data.data || [], page);
        } catch (error) {
            console.error('Lỗi load bệnh nhân theo khoa:', error);
            alert(error.message || 'Lỗi tải danh sách');
        }
    }

    function renderPagination(page) {
        const totalPages = Math.ceil(totalRecords / pageLimit);
        paginationControl.innerHTML = '';

        if (totalPages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${page - 1}">Trước</a>`;
        paginationControl.appendChild(prevLi);

        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === page ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationControl.appendChild(pageLi);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${page + 1}">Tiếp</a>`;
        paginationControl.appendChild(nextLi);
    }

    function updatePaginationInfo(page) {
        currentPageInfo.textContent = page;
        totalRecordsInfo.textContent = totalRecords;
    }

    async function loadEligibleTickets() {
        try {
            const params = new URLSearchParams();
            const doctorId = createDoctorIdInput.value.trim();
            const patientKeyword = ticketPatientSearchInput.value.trim();
            const ticketDate = ticketDateInput.value;

            if (doctorId) params.append('maBacSi', doctorId);
            if (patientKeyword) params.append('tenBN', patientKeyword);
            if (ticketDate) params.append('date', ticketDate);
            params.append('limit', '50');

            const data = await fetchJson(`${API_BASE}/medical-records/exam-tickets?${params.toString()}`);
            eligibleTickets = data.data || [];
            renderTicketOptions();
        } catch (error) {
            console.error('Lỗi load phiếu khám:', error);
            examTicketSelect.innerHTML = '<option value="">Không thể tải phiếu khám</option>';
            selectedTicketInfo.classList.add('d-none');
        }
    }

    function renderTicketOptions() {
        examTicketSelect.innerHTML = '<option value="">-- Chọn phiếu khám --</option>';

        if (eligibleTickets.length === 0) {
            examTicketSelect.add(new Option('Không có phiếu khám phù hợp', ''));
            selectedTicketInfo.classList.add('d-none');
            return;
        }

        eligibleTickets.forEach((ticket) => {
            const status = ticket.TrangThai === 'DangKham' ? 'Đang khám' : 'Chờ khám';
            const display = `#${ticket.MaPK} - ${ticket.TenBenhNhan} - ${ticket.TenBacSi || 'Chưa có bác sĩ'} - ${status}`;
            examTicketSelect.add(new Option(display, ticket.MaPK));
        });

        updateSelectedTicketInfo();
    }

    function getSelectedTicket() {
        return eligibleTickets.find((ticket) => String(ticket.MaPK) === String(examTicketSelect.value)) || null;
    }

    function updateSelectedTicketInfo() {
        const ticket = getSelectedTicket();
        if (!ticket) {
            selectedTicketInfo.classList.add('d-none');
            selectedTicketInfo.innerHTML = '';
            return;
        }

        if (ticket.MaBacSi) {
            createDoctorIdInput.value = ticket.MaBacSi;
        }

        selectedTicketInfo.classList.remove('d-none');
        selectedTicketInfo.innerHTML = `
            <strong>Phiếu khám #${escapeHtml(ticket.MaPK)}</strong> -
            ${escapeHtml(ticket.TenBenhNhan)}
            (${formatDate(ticket.NgaySinh)}, ${escapeHtml(ticket.GioiTinh || 'N/A')}) -
            Bác sĩ: ${escapeHtml(ticket.TenBacSi || 'N/A')} -
            Trạng thái: ${escapeHtml(ticket.TrangThai)}
        `;
    }

    function clearCreateForm(clearTicket = true) {
        createTrieuChungInput.value = '';
        createChuanDoanInput.value = '';
        createGhiChuInput.value = '';

        if (clearTicket) {
            examTicketSelect.value = '';
            updateSelectedTicketInfo();
        }
    }

    async function saveCreateMedicalRecord() {
        const ticket = getSelectedTicket();
        const maBacSi = createDoctorIdInput.value.trim();
        const trieuChung = createTrieuChungInput.value.trim();
        const chuanDoan = createChuanDoanInput.value.trim();
        const ghiChu = createGhiChuInput.value.trim();

        if (!ticket) {
            alert('Vui lòng chọn phiếu khám');
            return;
        }
        if (!maBacSi) {
            alert('Vui lòng nhập mã bác sĩ');
            return;
        }
        if (!trieuChung || !chuanDoan) {
            alert('Vui lòng nhập đầy đủ triệu chứng và chẩn đoán');
            return;
        }

        try {
            const result = await fetchJson(`${API_BASE}/medical-records`, {
                method: 'POST',
                body: JSON.stringify({
                    maPK: ticket.MaPK,
                    maBacSi,
                    trieuChung,
                    chuanDoan,
                    ghiChu
                })
            });

            alert(result.message || 'Tạo bệnh án thành công');
            clearCreateForm();
            await loadEligibleTickets();
            await loadAllPatients(1);

            const maBA = result.data?.medicalRecord?.MaBA || result.data?.insertId;
            if (maBA) {
                await viewRecordDetail(maBA);
            }
        } catch (error) {
            console.error('Lỗi tạo bệnh án:', error);
            alert(error.message || 'Không thể tạo bệnh án');
        }
    }

    async function viewPatientRecords(maBN) {
        try {
            currentHistoryPatientId = maBN;
            const history = await fetchJson(`${API_BASE}/medical-records/patient/${maBN}`);

            const patientRow = Array.from(patientTableBody.querySelectorAll('tr'))
                .find((row) => row.querySelector('[data-maban]')?.dataset.maban == maBN);
            const patientCells = patientRow?.querySelectorAll('td');

            if (patientCells) {
                document.getElementById('patientNameDetail').innerHTML = `<strong>Tên:</strong> ${escapeHtml(patientCells[1].textContent)}`;
                document.getElementById('patientDOBDetail').innerHTML = `<strong>Ngày sinh:</strong> ${escapeHtml(patientCells[2].textContent)}`;
                document.getElementById('patientPhoneDetail').innerHTML = `<strong>Điện thoại:</strong> ${escapeHtml(patientCells[4].textContent)}`;
                document.getElementById('patientAddressDetail').innerHTML = `<strong>Địa chỉ:</strong> ${escapeHtml(patientRow?.dataset.address || 'N/A')}`;
                document.getElementById('totalVisitsDetail').innerHTML = `<strong>Tổng lần khám:</strong> ${escapeHtml(patientCells[5]?.textContent || 0)}`;
                document.getElementById('lastVisitDetail').innerHTML = `<strong>Lần khám gần nhất:</strong> ${escapeHtml(patientCells[6]?.textContent || 'N/A')}`;
            }

            medicalHistoryBody.innerHTML = '';

            if (Array.isArray(history) && history.length > 0) {
                history.forEach((record) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formatDate(record.NgayLap)}</td>
                        <td>${escapeHtml(record.TenBacSi || 'N/A')}</td>
                        <td>${escapeHtml(record.TenChuyenKhoa || 'N/A')}</td>
                        <td>${escapeHtml(truncateText(record.TrieuChung))}</td>
                        <td>${escapeHtml(truncateText(record.ChuanDoan))}</td>
                        <td>
                            <button class="btn btn-sm btn-warning detail-btn" data-maba="${escapeHtml(record.MaBA)}">
                                <i class="fa fa-info-circle me-1"></i>Chi tiết
                            </button>
                        </td>
                    `;
                    medicalHistoryBody.appendChild(row);
                });
            } else {
                medicalHistoryBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có lịch sử bệnh án</td></tr>';
            }

            medicalDetailModal.show();
        } catch (error) {
            console.error('Lỗi load lịch sử bệnh án:', error);
            alert(error.message || 'Không thể tải lịch sử bệnh án');
        }
    }

    function setRecordEditMode(enabled) {
        [recordTrieuChung, recordChuanDoan, recordGhiChu].forEach((input) => {
            input.readOnly = !enabled;
        });

        btnEditRecord.classList.toggle('d-none', enabled);
        btnCancelEditRecord.classList.toggle('d-none', !enabled);
        btnSaveRecord.classList.toggle('d-none', !enabled);
    }

    function restoreRecordSnapshot() {
        if (!currentRecordSnapshot) return;
        recordTrieuChung.value = currentRecordSnapshot.TrieuChung || '';
        recordChuanDoan.value = currentRecordSnapshot.ChuanDoan || '';
        recordGhiChu.value = currentRecordSnapshot.GhiChu || '';
        setRecordEditMode(false);
    }

    async function viewRecordDetail(maBA) {
        try {
            const data = await fetchJson(`${API_BASE}/medical-records/${maBA}`);
            const record = data.medicalRecord;

            if (!record) {
                alert('Không tìm thấy bệnh án');
                return;
            }

            currentRecordSnapshot = { ...record };
            recordMaBAInput.value = record.MaBA;
            recordMaBacSiInput.value = record.MaBacSi || '';
            document.getElementById('recordPatientName').textContent = record.HoTen || 'N/A';
            document.getElementById('recordDoctorName').textContent = record.TenBacSi || 'N/A';
            document.getElementById('recordSpecialty').textContent = record.TenChuyenKhoa || 'N/A';
            document.getElementById('recordVisitDate').textContent = formatDate(record.NgayLap);
            recordTrieuChung.value = record.TrieuChung || '';
            recordChuanDoan.value = record.ChuanDoan || '';
            recordGhiChu.value = record.GhiChu || '';

            if (data.invoice) {
                document.getElementById('invoiceSection').style.display = 'block';
                document.getElementById('recordTotalAmount').textContent = (data.invoice.TongTien || 0).toLocaleString('vi-VN');
                document.getElementById('recordPaymentStatus').textContent = data.invoice.TrangThai || 'N/A';
                document.getElementById('recordPaymentMethod').textContent = data.invoice.PhuongThucThanhToan || 'N/A';
                btnEditRecord.disabled = data.invoice.TrangThai === 'DaThanhToan';
            } else {
                document.getElementById('invoiceSection').style.display = 'none';
                btnEditRecord.disabled = false;
            }

            setRecordEditMode(false);
            recordDetailModal.show();
        } catch (error) {
            console.error('Lỗi load chi tiết bệnh án:', error);
            alert(error.message || 'Không thể tải bệnh án');
        }
    }

    async function saveRecordUpdate() {
        const maBA = recordMaBAInput.value;
        const trieuChung = recordTrieuChung.value.trim();
        const chuanDoan = recordChuanDoan.value.trim();
        const ghiChu = recordGhiChu.value.trim();
        const maBacSi = getCurrentDoctorId() || recordMaBacSiInput.value;

        if (!trieuChung || !chuanDoan) {
            alert('Vui lòng nhập đầy đủ triệu chứng và chẩn đoán');
            return;
        }

        try {
            const result = await fetchJson(`${API_BASE}/medical-records/${maBA}`, {
                method: 'PUT',
                body: JSON.stringify({
                    maBacSi,
                    trieuChung,
                    chuanDoan,
                    ghiChu
                })
            });

            alert(result.message || 'Cập nhật bệnh án thành công');
            setRecordEditMode(false);
            await viewRecordDetail(maBA);
        } catch (error) {
            console.error('Lỗi cập nhật bệnh án:', error);
            alert(error.message || 'Không thể cập nhật bệnh án');
        }
    }

    btnSearch.addEventListener('click', () => {
        currentPage = 1;
        if (chuyenKhoaSelect.value) {
            loadPatientsBySpecialty(1);
        } else {
            loadAllPatients(1);
        }
    });

    btnReset.addEventListener('click', () => {
        tenBNInput.value = '';
        chuyenKhoaSelect.value = '';
        fromDateInput.value = '';
        toDateInput.value = '';
        pageLimitSelect.value = '10';
        pageLimit = 10;
        currentPage = 1;
        loadAllPatients(1);
    });

    tenBNInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') btnSearch.click();
    });

    pageLimitSelect.addEventListener('change', () => {
        pageLimit = parseInt(pageLimitSelect.value, 10) || 10;
        currentPage = 1;
        btnSearch.click();
    });

    chuyenKhoaSelect.addEventListener('change', () => {
        currentPage = 1;
        btnSearch.click();
    });

    btnRefreshTickets.addEventListener('click', loadEligibleTickets);
    btnClearCreateRecord.addEventListener('click', () => clearCreateForm());
    btnSaveCreateRecord.addEventListener('click', saveCreateMedicalRecord);
    examTicketSelect.addEventListener('change', updateSelectedTicketInfo);
    ticketDateInput.addEventListener('change', loadEligibleTickets);
    createDoctorIdInput.addEventListener('change', loadEligibleTickets);
    ticketPatientSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') loadEligibleTickets();
    });

    btnEditRecord.addEventListener('click', () => setRecordEditMode(true));
    btnCancelEditRecord.addEventListener('click', restoreRecordSnapshot);
    btnSaveRecord.addEventListener('click', saveRecordUpdate);

    document.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-btn');
        if (viewButton) {
            viewPatientRecords(viewButton.dataset.maban);
            return;
        }

        const detailButton = event.target.closest('.detail-btn');
        if (detailButton) {
            viewRecordDetail(detailButton.dataset.maba);
            return;
        }

        const pageLink = event.target.closest('.page-link[data-page]');
        if (pageLink) {
            event.preventDefault();
            const page = parseInt(pageLink.dataset.page, 10);
            if (!page || page < 1) return;

            if (chuyenKhoaSelect.value) {
                loadPatientsBySpecialty(page);
            } else {
                loadAllPatients(page);
            }
        }
    });

    const doctorId = getCurrentDoctorId();
    if (doctorId) {
        createDoctorIdInput.value = doctorId;
    }
    ticketDateInput.value = todayIso();

    loadSpecialties();
    loadEligibleTickets();
    loadAllPatients(1);
});
