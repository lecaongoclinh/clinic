document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'signin.html';
    }
    
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('username').textContent = username;
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
    const medicalDetailModal = new bootstrap.Modal(document.getElementById('medicalDetailModal'));
    const recordDetailModal = new bootstrap.Modal(document.getElementById('recordDetailModal'));
    let medicalHistoryBody = document.getElementById('medicalHistoryBody');

    const API_BASE = 'http://localhost:3000/api';
    let currentPage = 1;
    let totalRecords = 0;
    let pageLimit = 10;

    // Load specialties
    async function loadSpecialties() {
        try {
            const res = await fetch(`${API_BASE}/medical-records/specialties`);
            const specialties = await res.json();
            
            if (Array.isArray(specialties)) {
                specialties.forEach(specialty => {
                    const option = new Option(specialty.TenChuyenKhoa, specialty.MaChuyenKhoa);
                    chuyenKhoaSelect.add(option);
                });
            }
        } catch (err) {
            console.error('Lỗi load chuyên khoa:', err);
        }
    }

    // Build query parameters
    function buildQueryParams(page = 1) {
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

    // Load all patients with records
    async function loadAllPatients(page = 1) {
        try {
            currentPage = page;
            let url = `${API_BASE}/medical-records/all-patients?${buildQueryParams(page)}`;

            const res = await fetch(url);
            const data = await res.json();

            totalRecords = data.total || 0;
            const patients = data.data || [];

            patientTableBody.innerHTML = '';
            
            if (Array.isArray(patients) && patients.length > 0) {
                patients.forEach(patient => {
                    const row = document.createElement('tr');
                    const lastVisit = patient.LanKhamGanNhat 
                        ? new Date(patient.LanKhamGanNhat).toLocaleDateString('vi-VN')
                        : 'N/A';
                    
                    row.innerHTML = `
                        <td>${patient.MaBN}</td>
                        <td>${patient.HoTen}</td>
                        <td>${patient.NgaySinh ? new Date(patient.NgaySinh).toLocaleDateString('vi-VN') : 'N/A'}</td>
                        <td>${patient.GioiTinh || 'N/A'}</td>
                        <td>${patient.SoDienThoai || 'N/A'}</td>
                        <td><span class="badge bg-primary">${patient.SoLanKham}</span></td>
                        <td>${lastVisit}</td>
                        <td>
                            <button class="btn btn-sm btn-info view-btn" data-maban="${patient.MaBN}">
                                <i class="fa fa-eye me-1"></i>Xem
                            </button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });

                renderPagination(page);
            } else {
                patientTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có bệnh nhân nào</td></tr>';
                paginationControl.innerHTML = '';
            }

            updatePaginationInfo(page);
        } catch (err) {
            console.error('Lỗi load bệnh nhân:', err);
            alert('Lỗi tải danh sách bệnh nhân');
        }
    }

    // Load patients by specialty
    async function loadPatientsBySpecialty(page = 1) {
        try {
            currentPage = page;
            const queryStr = buildQueryParams(page);
            
            if (!chuyenKhoaSelect.value && !tenBNInput.value.trim() && !fromDateInput.value && !toDateInput.value) {
                loadAllPatients(page);
                return;
            }

            let url = `${API_BASE}/medical-records/patients-by-specialty?${queryStr}`;
            const res = await fetch(url);
            const data = await res.json();

            totalRecords = data.total || 0;
            const patients = data.data || [];

            patientTableBody.innerHTML = '';
            
            if (Array.isArray(patients) && patients.length > 0) {
                patients.forEach(patient => {
                    const row = document.createElement('tr');
                    const lastVisit = patient.LanKhamGanNhat 
                        ? new Date(patient.LanKhamGanNhat).toLocaleDateString('vi-VN')
                        : 'N/A';
                    
                    row.innerHTML = `
                        <td>${patient.MaBN}</td>
                        <td>${patient.HoTen}</td>
                        <td>${patient.NgaySinh ? new Date(patient.NgaySinh).toLocaleDateString('vi-VN') : 'N/A'}</td>
                        <td>${patient.GioiTinh || 'N/A'}</td>
                        <td>${patient.SoDienThoai || 'N/A'}</td>
                        <td><span class="badge bg-primary">${patient.SoLanKham}</span></td>
                        <td>${lastVisit}</td>
                        <td>
                            <button class="btn btn-sm btn-info view-btn" data-maban="${patient.MaBN}">
                                <i class="fa fa-eye me-1"></i>Xem
                            </button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });

                renderPagination(page);
            } else {
                patientTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có bệnh nhân nào</td></tr>';
                paginationControl.innerHTML = '';
            }

            updatePaginationInfo(page);
        } catch (err) {
            console.error('Lỗi load bệnh nhân theo khoa:', err);
            alert('Lỗi tải danh sách');
        }
    }

    // Render pagination buttons
    function renderPagination(currentPage) {
        const totalPages = Math.ceil(totalRecords / pageLimit);
        paginationControl.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Trước</a>`;
        paginationControl.appendChild(prevLi);

        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
            paginationControl.appendChild(firstLi);

            if (startPage > 2) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = '<span class="page-link">...</span>';
                paginationControl.appendChild(dotsLi);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationControl.appendChild(pageLi);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = '<span class="page-link">...</span>';
                paginationControl.appendChild(dotsLi);
            }

            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
            paginationControl.appendChild(lastLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Tiếp</a>`;
        paginationControl.appendChild(nextLi);
    }

    // Update pagination info text
    function updatePaginationInfo(page) {
        document.getElementById('currentPageInfo').textContent = page;
        document.getElementById('totalRecordsInfo').textContent = totalRecords;
    }

    // View patient medical history
    async function viewPatientRecords(maBN) {
        try {
            const res = await fetch(`${API_BASE}/medical-records/history/${maBN}`);
            const history = await res.json();

            // Get patient info from table
            const patientRow = Array.from(patientTableBody.querySelectorAll('tr'))
                .find(row => row.querySelector('[data-maban]')?.dataset.maban == maBN);
            
            const patientCells = patientRow?.querySelectorAll('td');
            
            if (patientCells) {
                document.getElementById('patientNameDetail').innerHTML = `<strong>Tên:</strong> ${patientCells[1].textContent}`;
                document.getElementById('patientDOBDetail').innerHTML = `<strong>Ngày sinh:</strong> ${patientCells[2].textContent}`;
                document.getElementById('patientPhoneDetail').innerHTML = `<strong>Điện thoại:</strong> ${patientCells[4].textContent}`;
                document.getElementById('patientAddressDetail').innerHTML = `<strong>Địa chỉ:</strong> ${patientCells[4]?.dataset.address || 'N/A'}`;
                
                const soLanKham = patientCells[5]?.textContent || 0;
                document.getElementById('totalVisitsDetail').innerHTML = `<strong>Tổng lần khám:</strong> ${soLanKham}`;
                document.getElementById('lastVisitDetail').innerHTML = `<strong>Lần khám gần nhất:</strong> ${patientCells[6]?.textContent || 'N/A'}`;
            }

            // Populate medical history table
            medicalHistoryBody.innerHTML = '';
            
            if (Array.isArray(history) && history.length > 0) {
                history.forEach(record => {
                    const row = document.createElement('tr');
                    const visitDate = new Date(record.NgayLap).toLocaleDateString('vi-VN');
                    
                    row.innerHTML = `
                        <td>${visitDate}</td>
                        <td>${record.TenBacSi}</td>
                        <td>${record.TenChuyenKhoa || 'N/A'}</td>
                        <td>${record.TrieuChung ? record.TrieuChung.substring(0, 50) + '...' : 'N/A'}</td>
                        <td>${record.ChuanDoan ? record.ChuanDoan.substring(0, 50) + '...' : 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning detail-btn" data-maba="${record.MaBA}">
                                <i class="fa fa-info-circle me-1"></i>Chi tiết
                            </button>
                        </td>
                    `;
                    medicalHistoryBody.appendChild(row);
                });
            } else {
                medicalHistoryBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không có bệnh án nào</td></tr>';
            }

            medicalDetailModal.show();
        } catch (err) {
            console.error('Lỗi load lịch sử bệnh án:', err);
            alert('Lỗi tải lịch sử');
        }
    }

    // View record detail
    async function viewRecordDetail(maBA) {
        try {
            const res = await fetch(`${API_BASE}/medical-records/${maBA}`);
            const data = await res.json();

            if (data.medicalRecord) {
                const record = data.medicalRecord;
                
                document.getElementById('recordMaBA').value = maBA;
                document.getElementById('recordPatientName').textContent = record.HoTen;
                document.getElementById('recordDoctorName').textContent = record.TenBacSi;
                document.getElementById('recordSpecialty').textContent = record.TenChuyenKhoa;
                document.getElementById('recordVisitDate').textContent = new Date(record.NgayLap).toLocaleDateString('vi-VN');
                
                document.getElementById('recordTrieuChung').value = record.TrieuChung || '';
                document.getElementById('recordChuanDoan').value = record.ChuanDoan || '';
                document.getElementById('recordGhiChu').value = record.GhiChu || '';

                // Show invoice if exists
                if (data.invoice) {
                    document.getElementById('invoiceSection').style.display = 'block';
                    document.getElementById('recordTotalAmount').textContent = 
                        (data.invoice.TongTien || 0).toLocaleString('vi-VN');
                    document.getElementById('recordPaymentStatus').textContent = data.invoice.TrangThai || 'N/A';
                    document.getElementById('recordPaymentMethod').textContent = data.invoice.PhuongThucThanhToan || 'N/A';
                } else {
                    document.getElementById('invoiceSection').style.display = 'none';
                }

                recordDetailModal.show();
            }
        } catch (err) {
            console.error('Lỗi load chi tiết bệnh án:', err);
            alert('Lỗi tải chi tiết');
        }
    }

    // Event listeners
    btnSearch.addEventListener('click', () => {
        currentPage = 1;
        const maChuyenKhoa = chuyenKhoaSelect.value;
        
        if (maChuyenKhoa) {
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

    tenBNInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSearch.click();
        }
    });

    pageLimitSelect.addEventListener('change', () => {
        pageLimit = parseInt(pageLimitSelect.value);
        currentPage = 1;
        btnSearch.click();
    });

    chuyenKhoaSelect.addEventListener('change', () => {
        if (chuyenKhoaSelect.value) {
            currentPage = 1;
            loadPatientsBySpecialty(1);
        }
    });

    // Delegate click handlers for dynamic elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('.view-btn')) {
            const maBN = e.target.closest('.view-btn').dataset.maban;
            viewPatientRecords(maBN);
        }
        
        if (e.target.closest('.detail-btn')) {
            const maBA = e.target.closest('.detail-btn').dataset.maba;
            viewRecordDetail(maBA);
        }

        // Handle pagination links
        if (e.target.closest('.page-link[data-page]')) {
            e.preventDefault();
            const page = parseInt(e.target.closest('.page-link[data-page]').dataset.page);
            const maChuyenKhoa = chuyenKhoaSelect.value;
            
            if (maChuyenKhoa) {
                loadPatientsBySpecialty(page);
            } else {
                loadAllPatients(page);
            }
        }
    });

    // Initialize
    pageLimit = parseInt(pageLimitSelect.value);
    loadSpecialties();
    loadAllPatients(1);
});
