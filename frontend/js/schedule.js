// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const scheduleForm = document.getElementById('scheduleForm');
const chuyenKhoaSelect = document.getElementById('chuyenKhoa');
const bacSiIdSelect = document.getElementById('bacSiId');
const phongKhamIdSelect = document.getElementById('phongKhamId');
const ngayLamViecInput = document.getElementById('ngayLamViec');
const submitBtn = document.getElementById('submitBtn');
const alertContainer = document.getElementById('alertContainer');
const scheduleTableContainer = document.getElementById('scheduleTableContainer');
const scheduleTableBody = document.getElementById('scheduleTableBody');
const emptyState = document.getElementById('emptyState');
const loadingSpinner = document.getElementById('loadingSpinner');
const filterDoctorSelect = document.getElementById('filterDoctor');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Shift Matrix Elements
const shiftCheckboxes = document.querySelectorAll('.shift-checkbox');

let allSchedules = [];
let selectedScheduleId = null;
let doctors = [];
let rooms = [];
let specialties = [];
let doctorsBySpecialty = {};
const currentRole = Number(localStorage.getItem('role'));
const currentUserId = Number(localStorage.getItem('userId')) || getUserIdFromToken();
const canManageSchedules = currentRole === 1;
const isDoctorRole = currentRole === 2;

function getUserIdFromToken() {
    try {
        const token = localStorage.getItem('token') || '';
        const payload = token.split('.')[1];
        if (!payload) return null;
        return Number(JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).id);
    } catch {
        return null;
    }
}

function applyScheduleRoleUi() {
    const toggleBtn = document.getElementById('toggleFormBtn');
    const formSection = document.getElementById('scheduleFormSection');

    if (!canManageSchedules) {
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (formSection) formSection.style.display = 'none';
    }

    if (isDoctorRole) {
        if (selectKhoa) selectKhoa.disabled = true;
        if (filterDoctorSelect) filterDoctorSelect.disabled = true;
    }
}

// Shift configuration
const shiftsConfig = {
    morning: { start: '07:00', end: '11:30', label: 'Ca Sáng' },
    afternoon: { start: '13:30', end: '17:00', label: 'Ca Chiều' }
};

const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    applyScheduleRoleUi();
    initializeSchedulePage();
    setMinDate();
});

/**
 * Initialize the schedule page
 */
async function initializeSchedulePage() {
    try {
        // ✅ Load specialties và rooms trước (loadSpecialties sẽ load doctors bên trong)
        await Promise.all([
            loadSpecialties(),
            loadRooms()
        ]);

        // ✅ Sau khi có doctors rồi mới load schedules
        await loadSchedules();

    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Lỗi khi tải trang. Vui lòng tải lại trang.', 'danger');
    }
}

/**
 * Load all specialties from API
 */
async function loadSpecialties() {
    try {
        const res = await fetch(`${API_BASE_URL}/specialty`);
        if (!res.ok) throw new Error('Failed to load specialties');

        specialties = await res.json();

        // Populate specialty select
        chuyenKhoaSelect.innerHTML = '<option value="">-- Chọn Chuyên Khoa --</option>';
        specialties.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty.MaChuyenKhoa;
            option.textContent = specialty.TenChuyenKhoa;
            chuyenKhoaSelect.appendChild(option);
        });

        // Load all doctors for quick reference
        for (const specialty of specialties) {
            await loadDoctorsBySpecialty(specialty.MaChuyenKhoa);
        }
    } catch (error) {
        console.error('Error loading specialties:', error);
        showAlert('Lỗi khi tải danh sách chuyên khoa', 'danger');
    }
}

/**
 * Load doctors by specialty
 */
async function loadDoctorsBySpecialty(maChuyenKhoa) {
    try {
        const res = await fetch(`${API_BASE_URL}/doctor/doctor-by-specialty?maChuyenKhoa=${maChuyenKhoa}`);
        if (res.ok) {
            const doctorsList = await res.json();
            doctorsBySpecialty[maChuyenKhoa] = doctorsList;
            doctors.push(...doctorsList);
        }
    } catch (error) {
        console.error(`Error loading doctors for specialty ${maChuyenKhoa}:`, error);
    }
}

/**
 * Load all rooms from API
 */
async function loadRooms() {
    try {
        const res = await fetch(`${API_BASE_URL}/schedules/rooms`);
        if (!res.ok) throw new Error('Failed to load rooms');

        const result = await res.json();
        rooms = Array.isArray(result) ? result : (result.data || []);
        populateRoomSelect([], '-- Chọn chuyên khoa trước --', true);
    } catch (error) {
        console.error('Error loading rooms:', error);
        populateRoomSelect([], '-- Không tải được danh sách phòng --', true);
        showAlert('Lỗi khi tải danh sách phòng', 'danger');
    }
}

/**
 * Update doctor select when specialty changes
 */
function updateDoctorsBySpecialty() {
    const selectedSpecialty = chuyenKhoaSelect.value;

    // Clear doctor selects
    bacSiIdSelect.innerHTML = '<option value="">-- Chọn Bác Sĩ --</option>';
    bacSiIdSelect.disabled = !selectedSpecialty;

    if (selectedSpecialty) {
        const doctorsForSpecialty = doctorsBySpecialty[selectedSpecialty] || [];
        doctorsForSpecialty.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.MaNV;
            option.textContent = doctor.HoTen;
            bacSiIdSelect.appendChild(option);
        });
    }

    // Also populate filter select
    filterDoctorSelect.innerHTML = '<option value="">-- Tất cả bác sĩ --</option>';
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.MaNV;
        option.textContent = doctor.HoTen;
        filterDoctorSelect.appendChild(option);
    });
}

/**
 * Set minimum date to today
 */
function setMinDate() {
    const today = new Date();

    // Set giá trị mặc định hôm nay
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    ngayLamViecInput.value = `${yyyy}-${mm}-${dd}`;
}

function addDaysToDateString(dateString, dayOffset) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
    return date.toISOString().slice(0, 10);
}

function normalizeDateString(dateValue) {
    return dateValue ? String(dateValue).substring(0, 10) : '';
}

function getRoomsBySelectedSpecialty() {
    const selectedSpecialty = chuyenKhoaSelect.value;
    if (!selectedSpecialty) return [];

    return rooms.filter(room => String(room.MaChuyenKhoa) === String(selectedSpecialty));
}

function populateRoomSelect(roomList, placeholder = '-- Chọn Phòng --', disabled = false) {
    const selectedRoom = phongKhamIdSelect.value;

    phongKhamIdSelect.innerHTML = '';
    phongKhamIdSelect.appendChild(new Option(placeholder, ''));

    roomList.forEach(room => {
        const label = room.GhiChu ? `${room.TenPhong} (${room.GhiChu})` : room.TenPhong;
        phongKhamIdSelect.appendChild(new Option(label, room.MaPhong));
    });

    const stillAvailable = roomList.some(room => String(room.MaPhong) === String(selectedRoom));
    if (stillAvailable) {
        phongKhamIdSelect.value = selectedRoom;
    }

    phongKhamIdSelect.disabled = disabled;
}

async function fetchAvailableRoomsForShift(dateString, shiftTimes) {
    const params = new URLSearchParams({
        ngayLam: dateString,
        gioBatDau: shiftTimes.start,
        gioKetThuc: shiftTimes.end
    });

    const selectedSpecialty = chuyenKhoaSelect.value;
    if (selectedSpecialty) {
        params.append('maChuyenKhoa', selectedSpecialty);
    }

    const res = await fetch(`${API_BASE_URL}/schedules/available-rooms?${params.toString()}`);
    const result = await res.json();
    if (!res.ok) {
        throw new Error(result.error || 'Failed to load available rooms');
    }

    return Array.isArray(result) ? result : (result.data || []);
}

async function updateAvailableRooms() {
    const startDate = ngayLamViecInput.value;
    const selectedShifts = getSelectedShifts();
    const selectedSpecialty = chuyenKhoaSelect.value;

    if (!selectedSpecialty) {
        populateRoomSelect([], '-- Chọn chuyên khoa trước --', true);
        return;
    }

    if (!startDate || selectedShifts.length === 0) {
        populateRoomSelect([], '-- Chọn ngày và ca để xem phòng trống --', true);
        return;
    }

    try {
        populateRoomSelect([], '-- Đang kiểm tra phòng trống --', true);

        const roomLists = await Promise.all(selectedShifts.map(({ day, shift }) => {
            const dateString = addDaysToDateString(startDate, day);
            return fetchAvailableRoomsForShift(dateString, shiftsConfig[shift]);
        }));

        const availableRoomIds = new Set(roomLists[0].map(room => String(room.MaPhong)));
        roomLists.slice(1).forEach(roomList => {
            const currentIds = new Set(roomList.map(room => String(room.MaPhong)));
            [...availableRoomIds].forEach(roomId => {
                if (!currentIds.has(roomId)) {
                    availableRoomIds.delete(roomId);
                }
            });
        });

        const availableRooms = getRoomsBySelectedSpecialty()
            .filter(room => availableRoomIds.has(String(room.MaPhong)));
        if (availableRooms.length === 0) {
            populateRoomSelect([], '-- Không có phòng trống cho ca đã chọn --', true);
            return;
        }

        populateRoomSelect(availableRooms, '-- Chọn Phòng Trống --', false);
    } catch (error) {
        console.error('Error loading available rooms:', error);
        populateRoomSelect([], '-- Lỗi kiểm tra phòng trống --', true);
        showAlert('Lỗi khi kiểm tra phòng trống. Vui lòng thử lại.', 'danger');
    }
}
/**
 * Load all schedules from API
 */
// async function loadSchedules() {
//     try {
//         loadingSpinner.style.display = 'block';
//         scheduleTableContainer.style.display = 'none';
//         emptyState.style.display = 'none';

//         const doctorFilter = filterDoctorSelect.value;

//         if (doctorFilter) {
//             // Load schedules for specific doctor
//             const res = await fetch(`${API_BASE_URL}/schedules/doctor/${doctorFilter}`);
//             if (!res.ok) throw new Error('Failed to load schedules');

//             const result = await res.json();
//             allSchedules = Array.isArray(result) ? result : (result.data || []);
//         } else {
//             // Load all schedules
//             // Since there's no endpoint for all schedules, we load for all doctors
//             allSchedules = [];
//             for (const doctor of doctors) {
//                 try {
//                     const res = await fetch(`${API_BASE_URL}/schedules/doctor/${doctor.MaNV}`);
//                     if (res.ok) {
//                         const result = await res.json();
//                         const schedules = Array.isArray(result) ? result : (result.data || []);
//                         allSchedules.push(...schedules);
//                     }
//                 } catch (err) {
//                     console.debug(`Could not load schedules for doctor ${doctor.MaNV}`);
//                 }
//             }
//         }

//         displaySchedules();
//     } catch (error) {
//         console.error('Error loading schedules:', error);
//         showAlert('Lỗi khi tải danh sách lịch làm việc', 'danger');
//     } finally {
//         loadingSpinner.style.display = 'none';
//     }
// }
// async function loadSchedules() {
//     try {
//         // ✅ Hiện loading spinner
//         if (loadingSpinner) loadingSpinner.style.display = 'block';

//         const doctorFilter = filterDoctorSelect.value;

//         if (doctorFilter) {
//             const res = await fetch(`${API_BASE_URL}/schedules/doctor/${doctorFilter}`);
//             if (!res.ok) throw new Error('Failed to load schedules');
//             const result = await res.json();
//             allSchedules = Array.isArray(result) ? result : (result.data || []);
//         } else {
//             allSchedules = [];
//             for (const doctor of doctors) {
//                 try {
//                     const res = await fetch(`${API_BASE_URL}/schedules/doctor/${doctor.MaNV}`);
//                     if (res.ok) {
//                         const result = await res.json();
//                         const schedules = Array.isArray(result) ? result : (result.data || []);
//                         allSchedules.push(...schedules);
//                     }
//                 } catch (err) {
//                     console.debug(`Could not load schedules for doctor ${doctor.MaNV}`);
//                 }
//             }
//         }

//         console.log('Loaded schedules:', allSchedules.length, allSchedules);
//         displaySchedules();

//     } catch (error) {
//         console.error('Error loading schedules:', error);
//         showAlert('Lỗi khi tải danh sách lịch làm việc', 'danger');
//     } finally {
//         if (loadingSpinner) loadingSpinner.style.display = 'none';
//     }
// }
// DOM Elements - thêm
const selectKhoa = document.getElementById('selectKhoa');

/**
 * Populate selectKhoa sau khi load specialties
 */
function populateSpecialtyFilter() {
    selectKhoa.innerHTML = '<option value="">-- Tất cả khoa --</option>';
    specialties.forEach(specialty => {
        const option = document.createElement('option');
        option.value = specialty.MaChuyenKhoa;
        option.textContent = specialty.TenChuyenKhoa;
        selectKhoa.appendChild(option);
    });

    if (isDoctorRole) {
        const doctor = doctors.find(item => Number(item.MaNV) === currentUserId);
        if (doctor?.MaChuyenKhoa) {
            selectKhoa.value = String(doctor.MaChuyenKhoa);
        }
        selectKhoa.disabled = true;
    }
}

/**
 * Populate filterDoctor theo khoa đã chọn
 */
function populateDoctorFilter(maChuyenKhoa) {
    filterDoctorSelect.innerHTML = '<option value="">-- Tất cả bác sĩ --</option>';

    const doctorList = maChuyenKhoa
        ? (doctorsBySpecialty[maChuyenKhoa] || [])
        : doctors;

    doctorList.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.MaNV;
        option.textContent = doctor.HoTen;
        filterDoctorSelect.appendChild(option);
    });

    if (isDoctorRole && currentUserId) {
        filterDoctorSelect.value = String(currentUserId);
        filterDoctorSelect.disabled = true;
    } else {
        filterDoctorSelect.disabled = false;
    }
}

/**
 * Load schedules dùng getFilteredSchedules API
 */
async function loadSchedules() {
    try {
        if (loadingSpinner) loadingSpinner.style.display = 'block';

        const maChuyenKhoa = selectKhoa.value || null;
        const maBacSi = isDoctorRole && currentUserId ? currentUserId : (filterDoctorSelect.value || null);

        // ✅ Build query params
        const params = new URLSearchParams();
        if (maChuyenKhoa) params.append('maChuyenKhoa', maChuyenKhoa);
        if (maBacSi) params.append('maBacSi', maBacSi);

        const res = await fetch(`http://localhost:3000/api/schedules/filter?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load schedules');

        const result = await res.json();
        allSchedules = Array.isArray(result) ? result : (result.data || []);
        // ✅ Log kiểm tra
        console.log('allSchedules length:', allSchedules.length);
        console.log('Sample:', JSON.stringify(allSchedules[0]));
        console.log('calendar object:', calendar);
        console.log('Loaded schedules:', allSchedules.length, allSchedules);
        displaySchedules();

    } catch (error) {
        console.error('Error loading schedules:', error);
        showAlert('Lỗi khi tải danh sách lịch làm việc', 'danger');
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// ✅ Gọi populateSpecialtyFilter sau khi loadSpecialties xong
async function loadSpecialties() {
    try {
        const res = await fetch(`http://localhost:3000/api/specialty`);
        if (!res.ok) throw new Error('Failed to load specialties');

        specialties = await res.json();

        // Populate form tạo lịch
        chuyenKhoaSelect.innerHTML = '<option value="">-- Chọn Chuyên Khoa --</option>';
        specialties.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty.MaChuyenKhoa;
            option.textContent = specialty.TenChuyenKhoa;
            chuyenKhoaSelect.appendChild(option);
        });

        // Load doctors
        for (const specialty of specialties) {
            await loadDoctorsBySpecialty(specialty.MaChuyenKhoa);
        }

        // ✅ Populate filter sau khi có data
        populateSpecialtyFilter();
        populateDoctorFilter(null);

    } catch (error) {
        console.error('Error loading specialties:', error);
        showAlert('Lỗi khi tải danh sách chuyên khoa', 'danger');
    }
}

// ✅ Event listeners cho filter
selectKhoa.addEventListener('change', function () {
    populateDoctorFilter(selectKhoa.value);
    filterDoctorSelect.value = '';
    loadSchedules();
});

filterDoctorSelect.addEventListener('change', function () {
    loadSchedules();
});
// function displaySchedules() {
//     console.log('displaySchedules called, allSchedules:', allSchedules.length);

//     // ✅ Init calendar nếu chưa có
//     if (!calendar) {
//         initCalendar();
//     }

//     // ✅ Xóa events cũ
//     calendar.removeAllEvents();

//     if (allSchedules.length === 0) {
//         console.warn('Không có lịch nào');
//         return;
//     }

//     const events = schedulesToEvents(allSchedules);
//     console.log('Events:', events);
//     calendar.addEventSource(events);
// }

function schedulesToEvents(schedules) {
    const colors = [
        '#3788d8', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];

    const doctorColorMap = {};
    let colorIndex = 0;

    return schedules.map(schedule => {
        if (!doctorColorMap[schedule.MaBacSi]) {
            doctorColorMap[schedule.MaBacSi] = colors[colorIndex % colors.length];
            colorIndex++;
        }

        // ✅ Chuẩn hóa NgayLam về YYYY-MM-DD (tránh timestamp dư)
        const ngayLam = schedule.NgayLam
            ? String(schedule.NgayLam).substring(0, 10)
            : null;

        // ✅ Chuẩn hóa giờ về HH:MM:SS
        const gioBatDau = schedule.GioBatDau
            ? String(schedule.GioBatDau).substring(0, 8).padEnd(8, ':00')
            : '00:00:00';
        const gioKetThuc = schedule.GioKetThuc
            ? String(schedule.GioKetThuc).substring(0, 8).padEnd(8, ':00')
            : '00:00:00';

        if (!ngayLam) {
            console.warn('Schedule missing NgayLam:', schedule);
            return null;
        }

        return {
            id: String(schedule.MaLich),
            title: schedule.TenBacSi,
            start: `${ngayLam}T${gioBatDau}`,
            end: `${ngayLam}T${gioKetThuc}`,
            backgroundColor: doctorColorMap[schedule.MaBacSi],
            borderColor: doctorColorMap[schedule.MaBacSi],
            extendedProps: {
                TenBacSi: schedule.TenBacSi,
                TenPhong: schedule.TenPhong,
                NgayLam: ngayLam,
                GioBatDau: schedule.GioBatDau,
                GioKetThuc: schedule.GioKetThuc,
                MaBacSi: schedule.MaBacSi
            }
        };
    // ✅ Lọc bỏ null
    }).filter(Boolean);
}
/**
 * Display schedules in table
 */

/**
 * Format time from HH:MM:SS to HH:MM
 */
function formatTime(timeString) {
    if (!timeString) return '';
    return timeString.substring(0, 5);
}

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        // Parse YYYY-MM-DD format manually to avoid timezone issues
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

        // Format as DD/MM/YYYY
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return dateString;
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-custom alert-dismissible fade show" role="alert">
            <i class="fa fa-${type === 'danger' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    // Auto-dismiss alert after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

/**
 * Clear form errors
 */
function clearFormErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`error-${fieldId}`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Validate form inputs
 */
function validateForm() {
    clearFormErrors();
    let isValid = true;

    // Validate specialty
    if (!chuyenKhoaSelect.value) {
        showFieldError('chuyenKhoa', 'Vui lòng chọn chuyên khoa');
        isValid = false;
    }

    // Validate doctor
    if (!bacSiIdSelect.value) {
        showFieldError('bacSiId', 'Vui lòng chọn bác sĩ');
        isValid = false;
    }

    // Validate room
    if (!phongKhamIdSelect.value) {
        showFieldError('phongKhamId', 'Vui lòng chọn phòng khám');
        isValid = false;
    } else {
        const selectedRoom = rooms.find(room => String(room.MaPhong) === String(phongKhamIdSelect.value));
        if (selectedRoom && String(selectedRoom.MaChuyenKhoa) !== String(chuyenKhoaSelect.value)) {
            showFieldError('phongKhamId', 'Phòng khám không thuộc chuyên khoa đã chọn');
            isValid = false;
        }
    }

    // Validate date
    if (!ngayLamViecInput.value) {
        showFieldError('ngayLamViec', 'Vui lòng chọn ngày làm việc');
        isValid = false;
    }

    // Validate at least one shift is selected
    const selectedShifts = getSelectedShifts();
    if (selectedShifts.length === 0) {
        showFieldError('shifts', 'Vui lòng chọn ít nhất một ca làm việc');
        isValid = false;
    }

    return isValid;
}

/**
 * Get selected shifts from matrix (returns array of objects {day, shift})
 */
function getSelectedShifts() {
    const selected = [];
    shiftCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selected.push({
                day: parseInt(checkbox.dataset.day),
                shift: checkbox.dataset.shift
            });
        }
    });
    return selected;
}

/**
 * Check for room conflicts - room should not have different doctor at same time
 */
async function checkRoomConflict(phongId, bacSiId, startDate, selectedShifts) {
    try {
        // Loop through all doctors to check for conflicts
        for (const doctor of doctors) {
            if (doctor.MaNV === bacSiId) continue; // Skip same doctor

            // Get schedules for this other doctor
            const res = await fetch(`${API_BASE_URL}/schedules/doctor/${doctor.MaNV}`);
            if (!res.ok) continue;

            const result = await res.json();
            const schedules = Array.isArray(result) ? result : (result.data || []);

            // Check if any schedule conflicts
            for (const {day, shift} of selectedShifts) {
                const dateString = addDaysToDateString(startDate, day);
                const shiftTimes = shiftsConfig[shift];

                for (const schedule of schedules) {
                    const scheduleDate = normalizeDateString(schedule.NgayLam);
                    // Check if same room and same date
                    if (String(schedule.MaPhong) === String(phongId) && scheduleDate === dateString) {
                        // Check time overlap
                        const existStart = schedule.GioBatDau.substring(0, 5);
                        const existEnd = schedule.GioKetThuc.substring(0, 5);
                        const newStart = shiftTimes.start;
                        const newEnd = shiftTimes.end;

                        if ((newStart < existEnd && newEnd > existStart)) {
                            return `Phòng ${schedule.TenPhong} đã được gán cho bác sĩ ${schedule.TenBacSi} vào ${dayLabels[day]} ca này`;
                        }
                    }
                }
            }
        }
        return null; // No conflict
    } catch (error) {
        console.error('Error checking room conflict:', error);
        return null;
    }
}

/**
 * Submit schedule form
 */
scheduleForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';

        const bacSiId = parseInt(bacSiIdSelect.value);
        const phongId = parseInt(phongKhamIdSelect.value);
        const startDate = ngayLamViecInput.value; 
        const selectedShifts = getSelectedShifts();

        // Check room conflicts
        const roomConflict = await checkRoomConflict(phongId, bacSiId, startDate, selectedShifts);
        if (roomConflict) {
            showAlert(`❌ ${roomConflict}`, 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa fa-save me-2"></i>Tạo Lịch Làm Việc';
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        let conflictCount = 0;

        // Create schedule for each selected shift
        for (const {day, shift} of selectedShifts) {
            const dateString = addDaysToDateString(startDate, day);
            const shiftTimes = shiftsConfig[shift];
            try {
                const formData = {
                    bacSiId: bacSiId,
                    phongKhamId: phongId,
                    ngayLamViec: dateString,
                    gioBatDau: shiftTimes.start,
                    gioKetThuc: shiftTimes.end
                };

                const response = await fetch(`${API_BASE_URL}/schedules`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    successCount++;
                } else {
                    const error = result.error || 'Unknown error';
                    if (error.includes('đã có lịch') || error.includes('đã được') || error.includes('Phòng')) {
                        conflictCount++;
                    } else {
                        errorCount++;
                    }
                    console.debug(`Failed to create schedule for ${dateString} ${shift}: ${error}`);
                }
            } catch (error) {
                console.error('Error creating schedule:', error);
                errorCount++;
            }
        }

        // Show results
        if (successCount > 0) {
            const message = successCount === 1
                ? '✅ Tạo thành công 1 lịch làm việc!'
                : `✅ Tạo thành công ${successCount} lịch làm việc!`;
            document.getElementById('scheduleFormSection').style.display = 'none';
            showAlert(message, 'success');
        }

        if (conflictCount > 0) {
            const message = conflictCount === 1
                ? '⚠️ 1 lịch bị xung đột (bác sĩ hoặc phòng khám đã có lịch khác)'
                : `⚠️ ${conflictCount} lịch bị xung đột (bác sĩ hoặc phòng khám đã có lịch khác)`;
            showAlert(message, 'warning');
        }

        if (errorCount > 0) {
            showAlert(`❌ ${errorCount} lịch không thể tạo`, 'danger');
        }

        if (successCount > 0) {
            // Reset form
            scheduleForm.reset();
            clearFormErrors();
            shiftCheckboxes.forEach(cb => cb.checked = false);
            setMinDate();
            await updateAvailableRooms();

            // Reload schedules
            await loadSchedules();

            // Update filter
            filterDoctorSelect.value = '';
        }

    } catch (error) {
        console.error('Error creating schedule:', error);
        showAlert(error.message || 'Lỗi khi tạo lịch làm việc', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-save me-2"></i>Tạo Lịch Làm Việc';
    }
});

/**
 * Open delete confirmation modal
 */
function openDeleteModal(scheduleId) {
    selectedScheduleId = scheduleId;
    const deleteModalInstance = new bootstrap.Modal(deleteModal);
    deleteModalInstance.show();
}

/**
 * Confirm and delete schedule
 */
confirmDeleteBtn.addEventListener('click', async function() {
    if (!selectedScheduleId) return;

    try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';

        const response = await fetch(`${API_BASE_URL}/schedules/${selectedScheduleId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unknown error occurred');
        }

        // Close modal
        const deleteModalInstance = bootstrap.Modal.getInstance(deleteModal);
        deleteModalInstance.hide();

        showAlert('Lịch làm việc đã được xóa thành công!', 'success');
        await loadSchedules();

    } catch (error) {
        console.error('Error deleting schedule:', error);
        showAlert(error.message || 'Lỗi khi xóa lịch làm việc', 'danger');
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = 'Xóa';
        selectedScheduleId = null;
    }
});

/**
 * Filter schedules by doctor
 */
filterDoctorSelect.addEventListener('change', function() {
    loadSchedules();
});

/**
 * Specialty selection change
 */
chuyenKhoaSelect.addEventListener('change', function() {
    updateDoctorsBySpecialty();
    phongKhamIdSelect.value = '';
    updateAvailableRooms();
});

ngayLamViecInput.addEventListener('change', function() {
    updateAvailableRooms();
});

shiftCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        updateAvailableRooms();
    });
});

// DOM Elements - thêm
// const calendarContainer = document.getElementById('calendarContainer');
let calendar = null;

/**
 * Initialize FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('scheduleCalendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',     // ✅ Mặc định view tuần
        locale: 'vi',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'Hôm nay',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày'
        },

        // ✅ Chỉ hiển thị Thứ 2 - Thứ 6
        weekends: false,

        // ✅ Giờ hiển thị 07:00 - 17:00
        slotMinTime: '07:00:00',
        slotMaxTime: '17:00:00',

        // ✅ Mỗi slot 30 phút
        slotDuration: '00:30:00',

        // ✅ Chiều cao slot
        slotLabelInterval: '01:00',
        expandRows: true,

        // ✅ Hiển thị giờ theo định dạng 24h
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },

        allDaySlot: false,             // ✅ Ẩn hàng "all day"

        height: 'auto',

        events: [],
        eventClick: function(info) {
            const schedule = info.event.extendedProps;
            showEventPopup(info.event.id, schedule, info.el);
        },
        eventContent: function(arg) {
            return {
                html: `
                    <div class="fc-event-custom">
                        <strong>${arg.event.title}</strong><br>
                        <small>${arg.event.extendedProps.TenPhong}</small>
                    </div>
                `
            };
        }
    });

    calendar.render();
}
/**
 * Show popup khi click event
 */
function showEventPopup(eventId, schedule, anchorEl) {
    // Xóa popup cũ nếu có
    const oldPopup = document.getElementById('eventPopup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'eventPopup';
    popup.innerHTML = `
        <div class="event-popup-overlay" onclick="closeEventPopup()"></div>
        <div class="event-popup-card">
            <div class="event-popup-header">
                <strong>Chi tiết lịch làm việc</strong>
                <button class="btn-close btn-close-white" onclick="closeEventPopup()"></button>
            </div>
            <div class="event-popup-body">
                <p><i class="fa fa-user-md me-2"></i><strong>Bác sĩ:</strong> ${schedule.TenBacSi}</p>
                <p><i class="fa fa-hospital me-2"></i><strong>Phòng:</strong> ${schedule.TenPhong}</p>
                <p><i class="fa fa-calendar me-2"></i><strong>Ngày:</strong> ${formatDate(schedule.NgayLam)}</p>
                <p><i class="fa fa-clock me-2"></i><strong>Giờ:</strong> ${formatTime(schedule.GioBatDau)} - ${formatTime(schedule.GioKetThuc)}</p>
            </div>
            <div class="event-popup-footer" style="${canManageSchedules ? '' : 'display:none'}">
                <button class="btn btn-danger btn-sm" onclick="closeEventPopup(); openDeleteModal(${eventId})">
                    <i class="fa fa-trash me-1"></i>Xóa
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);
}

function closeEventPopup() {
    const popup = document.getElementById('eventPopup');
    if (popup) popup.remove();
}

/**
 * Convert schedules to FullCalendar events
 */
function schedulesToEvents(schedules) {
    const colors = [
        '#3788d8', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];

    const doctorColorMap = {};
    let colorIndex = 0;

    return schedules.map(schedule => {
        if (!doctorColorMap[schedule.MaBacSi]) {
            doctorColorMap[schedule.MaBacSi] = colors[colorIndex % colors.length];
            colorIndex++;
        }

        // ✅ Fix timezone UTC+7
        const rawDate = new Date(schedule.NgayLam);
        const localDate = new Date(rawDate.getTime() + 7 * 60 * 60 * 1000);
        const ngayLam = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;

        const gioBatDau = String(schedule.GioBatDau).substring(0, 8);
        const gioKetThuc = String(schedule.GioKetThuc).substring(0, 8);

        console.log(`→ Event: ${schedule.TenBacSi} | ${ngayLam}T${gioBatDau}`);

        return {
            id: String(schedule.MaLich),
            title: schedule.TenBacSi,
            start: `${ngayLam}T${gioBatDau}`,
            end: `${ngayLam}T${gioKetThuc}`,
            backgroundColor: doctorColorMap[schedule.MaBacSi],
            borderColor: doctorColorMap[schedule.MaBacSi],
            extendedProps: {
                TenBacSi: schedule.TenBacSi,
                TenPhong: schedule.TenPhong,
                NgayLam: ngayLam,
                GioBatDau: schedule.GioBatDau,
                GioKetThuc: schedule.GioKetThuc,
                MaBacSi: schedule.MaBacSi
            }
        };
    }).filter(Boolean);
}
/**
 * Display schedules trên calendar
 */
function displaySchedules() {
    if (!calendar) {
        initCalendar();
    }

    // Xóa events cũ
    calendar.removeAllEvents();

    // Thêm events mới
    const events = schedulesToEvents(allSchedules);
    calendar.addEventSource(events);
}
