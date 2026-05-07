const API_PATIENTS = 'http://localhost:3000/api/patients';

const state = {
    page: 1,
    limit: 20,
    total: 0,
    search: '',
    modal: null
};

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
}

function toDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra');
    }
    return data;
}

async function loadPatients() {
    const params = new URLSearchParams({
        page: state.page,
        limit: state.limit
    });
    if (state.search) params.set('search', state.search);

    $('patientsTableBody').innerHTML = '<tr><td colspan="7" class="empty-row">Đang tải dữ liệu...</td></tr>';

    try {
        const result = await fetchJson(`${API_PATIENTS}?${params.toString()}`);
        state.total = result.total || 0;
        renderPatients(result.data || []);
        renderPagination();
    } catch (error) {
        $('patientsTableBody').innerHTML = `<tr><td colspan="7" class="empty-row text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

function renderPatients(patients) {
    if (!patients.length) {
        $('patientsTableBody').innerHTML = '<tr><td colspan="7" class="empty-row">Không có bệnh nhân phù hợp</td></tr>';
        return;
    }

    $('patientsTableBody').innerHTML = patients.map((patient) => `
        <tr>
            <td>${patient.MaBN}</td>
            <td class="patient-name-col">${escapeHtml(patient.HoTen)}</td>
            <td>${formatDate(patient.NgaySinh)}</td>
            <td>${escapeHtml(patient.GioiTinh || '')}</td>
            <td>${escapeHtml(patient.SoDienThoai || '')}</td>
            <td class="patient-address-col"><span class="patient-address-text" data-address="${escapeHtml(patient.DiaChi || '')}">${escapeHtml(patient.DiaChi || '')}</span></td>
            <td class="text-end">
                <button class="btn btn-outline-primary btn-sm action-btn" title="Sửa" onclick="openPatientModal('${escapeHtml(patient.MaBN)}')">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm action-btn" title="Xóa" onclick="deletePatient('${escapeHtml(patient.MaBN)}')">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderPagination() {
    const totalPages = Math.max(Math.ceil(state.total / state.limit), 1);
    $('patientCount').textContent = `${state.total} bệnh nhân`;
    $('pageInfo').textContent = `${state.page}/${totalPages}`;
    $('prevPage').disabled = state.page <= 1;
    $('nextPage').disabled = state.page >= totalPages;
}

async function openPatientModal(maBN) {
    try {
        const patient = await fetchJson(`${API_PATIENTS}/${maBN}`);
        $('patientId').value = patient.MaBN;
        $('patientName').value = patient.HoTen || '';
        $('patientPhone').value = patient.SoDienThoai || '';
        $('patientEmail').value = patient.Email || '';
        $('patientDob').value = toDateInput(patient.NgaySinh);
        $('patientGender').value = patient.GioiTinh || '';
        $('patientAddress').value = patient.DiaChi || '';
        state.modal.show();
    } catch (error) {
        alert(error.message);
    }
}

async function savePatient() {
    const maBN = $('patientId').value;
    const payload = {
        HoTen: $('patientName').value.trim(),
        SoDienThoai: $('patientPhone').value.trim(),
        Email: $('patientEmail').value.trim(),
        NgaySinh: $('patientDob').value,
        GioiTinh: $('patientGender').value,
        DiaChi: $('patientAddress').value.trim()
    };

    if (!payload.HoTen || !payload.SoDienThoai) {
        alert('Vui lòng nhập họ tên và số điện thoại');
        return;
    }

    try {
        await fetchJson(`${API_PATIENTS}/${maBN}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        state.modal.hide();
        await loadPatients();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePatient(maBN) {
    if (!confirm(`Xóa bệnh nhân #${maBN}?`)) return;

    try {
        await fetchJson(`${API_PATIENTS}/${maBN}`, { method: 'DELETE' });
        await loadPatients();
    } catch (error) {
        alert(error.message);
    }
}

function applySearch() {
    state.search = $('patientSearch').value.trim();
    state.page = 1;
    loadPatients();
}

document.addEventListener('DOMContentLoaded', () => {
    state.modal = new bootstrap.Modal($('patientModal'));

    $('searchBtn').addEventListener('click', applySearch);
    $('patientSearch').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') applySearch();
    });
    $('prevPage').addEventListener('click', () => {
        if (state.page > 1) {
            state.page -= 1;
            loadPatients();
        }
    });
    $('nextPage').addEventListener('click', () => {
        if (state.page * state.limit < state.total) {
            state.page += 1;
            loadPatients();
        }
    });
    $('savePatientBtn').addEventListener('click', savePatient);

    loadPatients();
});

window.openPatientModal = openPatientModal;
window.deletePatient = deletePatient;
