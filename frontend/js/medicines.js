const API_URL = "http://localhost:3000/api/medicines";

let medicinesData = [];
let filterTimer = null;

function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function getStatusText(value) {
    return value === false || value === 0 || value === "0" ? "inactive" : "Active";
}

function getTypeText(value) {
    switch (value) {
        case "ThuocKeDon": return "Thuốc kê đơn";
        case "KhongKeDon": return "Không kê đơn";
        case "VatTuYTe": return "Vật tư y tế";
        default: return value || "";
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildQuery() {
    const params = new URLSearchParams();
    const search = document.getElementById("searchInput")?.value.trim();
    const LoaiThuoc = document.getElementById("typeFilter")?.value;
    const TrangThai = document.getElementById("statusFilter")?.value;

    if (search) params.set("search", search);
    if (LoaiThuoc) params.set("LoaiThuoc", LoaiThuoc);
    if (TrangThai !== "") params.set("TrangThai", TrangThai);
    params.set("sort", "name_asc");
    return params.toString();
}

function renderTable(data) {
    const tbody = document.querySelector("#medicineTable tbody");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Không có dữ liệu</td></tr>`;
        window.TablePager?.reset("#medicineTable");
        return;
    }

    tbody.innerHTML = data.map((med) => {
        const active = !(med.TrangThai === false || med.TrangThai === 0 || med.TrangThai === "0");
        return `
            <tr onclick="viewMedicine(${med.MaThuoc})">
                <td class="text-center">${med.MaThuoc}</td>
                <td>${escapeHtml(med.TenThuoc)}</td>
                <td>${escapeHtml(med.HoatChat || "")}</td>
                <td>${escapeHtml(med.HamLuong || "")}</td>
                <td>${escapeHtml(med.DangBaoChe || "")}</td>
                <td class="text-end fw-semibold">${formatCurrency(med.GiaBan)}</td>
                <td class="text-center">${Number(med.TongTon || 0).toLocaleString("vi-VN")}</td>
                <td class="text-center"><span class="status-badge ${active ? "" : "off"}">${getStatusText(med.TrangThai)}</span></td>
                <td onclick="event.stopPropagation()" class="text-center">
                    <button class="action-icon btn-edit" onclick="editMedicine(${med.MaThuoc}); event.stopPropagation()" title="Sửa thông tin thuốc">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="action-icon btn-delete" onclick="deleteMedicine(${med.MaThuoc}); event.stopPropagation()" title="Xóa hoặc ngừng kinh doanh">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    window.TablePager?.reset("#medicineTable");
    window.TablePager?.attach("#medicineTable", { pageSize: 8 });
}

async function loadMedicines() {
    const tbody = document.querySelector("#medicineTable tbody");
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Đang tải dữ liệu...</td></tr>`;

    try {
        const query = buildQuery();
        const res = await fetch(query ? `${API_URL}?${query}` : API_URL);
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data.message || "Không thể tải danh mục thuốc");
        medicinesData = Array.isArray(data) ? data : [];
        renderTable(medicinesData);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-danger text-center">${escapeHtml(error.message)}</td></tr>`;
    }
}

function applyFilter() {
    loadMedicines();
}

function scheduleFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilter, 250);
}

function openAddModal() {
    document.getElementById("MaThuoc").value = "";
    [
        "TenThuoc", "GiaBan", "DonViCoBan", "HoatChat", "HamLuong",
        "DangBaoChe", "QuyCachDongGoi", "HangSanXuat", "NuocSanXuat",
        "NhietDoBaoQuan", "MaVach"
    ].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("LoaiThuoc").value = "ThuocKeDon";
    document.getElementById("TrangThai").value = "1";
    document.querySelector(".modal-title").innerText = "Thêm thuốc";
    new bootstrap.Modal(document.getElementById("medicineModal")).show();
}

async function editMedicine(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const med = await res.json();
        if (!res.ok) throw new Error(med.message || "Không thể lấy dữ liệu thuốc");

        document.getElementById("MaThuoc").value = med.MaThuoc;
        document.getElementById("TenThuoc").value = med.TenThuoc || "";
        document.getElementById("GiaBan").value = Number(med.GiaBan || 0);
        document.getElementById("DonViCoBan").value = med.DonViCoBan || "";
        document.getElementById("HoatChat").value = med.HoatChat || "";
        document.getElementById("HamLuong").value = med.HamLuong || "";
        document.getElementById("DangBaoChe").value = med.DangBaoChe || "";
        document.getElementById("QuyCachDongGoi").value = med.QuyCachDongGoi || "";
        document.getElementById("HangSanXuat").value = med.HangSanXuat || "";
        document.getElementById("NuocSanXuat").value = med.NuocSanXuat || "";
        document.getElementById("NhietDoBaoQuan").value = med.NhietDoBaoQuan || "";
        document.getElementById("MaVach").value = med.MaVach || "";
        document.getElementById("LoaiThuoc").value = med.LoaiThuoc || "ThuocKeDon";
        document.getElementById("TrangThai").value = med.TrangThai === 0 || med.TrangThai === "0" ? "0" : "1";

        document.querySelector(".modal-title").innerText = "Cập nhật thuốc";
        new bootstrap.Modal(document.getElementById("medicineModal")).show();
    } catch (error) {
        alert(error.message || "Không thể lấy dữ liệu thuốc");
    }
}

function getPayload() {
    const payload = {
        TenThuoc: document.getElementById("TenThuoc").value.trim(),
        GiaBan: Number(document.getElementById("GiaBan").value),
        DonViCoBan: document.getElementById("DonViCoBan").value.trim(),
        HoatChat: document.getElementById("HoatChat").value.trim(),
        HamLuong: document.getElementById("HamLuong").value.trim(),
        DangBaoChe: document.getElementById("DangBaoChe").value.trim(),
        QuyCachDongGoi: document.getElementById("QuyCachDongGoi").value.trim(),
        HangSanXuat: document.getElementById("HangSanXuat").value.trim(),
        NuocSanXuat: document.getElementById("NuocSanXuat").value.trim(),
        NhietDoBaoQuan: document.getElementById("NhietDoBaoQuan").value.trim(),
        MaVach: document.getElementById("MaVach").value.trim(),
        LoaiThuoc: document.getElementById("LoaiThuoc").value,
        TrangThai: Number(document.getElementById("TrangThai").value)
    };

    if (!payload.TenThuoc) throw new Error("Tên thuốc là bắt buộc");
    if (!payload.DonViCoBan) throw new Error("Đơn vị cơ bản là bắt buộc");
    if (!payload.LoaiThuoc) throw new Error("Loại thuốc là bắt buộc");
    if (!Number.isFinite(payload.GiaBan) || payload.GiaBan < 0) throw new Error("Giá bán phải lớn hơn hoặc bằng 0");
    return payload;
}

async function saveMedicine() {
    try {
        const id = document.getElementById("MaThuoc").value;
        const payload = getPayload();
        const res = await fetch(id ? `${API_URL}/${id}` : API_URL, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Lỗi khi lưu dữ liệu");

        bootstrap.Modal.getInstance(document.getElementById("medicineModal")).hide();
        await loadMedicines();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteMedicine(id) {
    if (!confirm("Nếu thuốc đã phát sinh dữ liệu, hệ thống sẽ chuyển sang ngừng kinh doanh thay vì xóa cứng. Tiếp tục?")) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Không thể xóa thuốc");
        alert(data.message || "Đã xử lý thuốc");
        await loadMedicines();
    } catch (error) {
        alert(error.message || "Không thể xóa thuốc");
    }
}

function viewMedicine(id) {
    window.location.href = `medicine-detail.html?id=${id}`;
}

function bindEvents() {
    document.getElementById("searchInput")?.addEventListener("input", scheduleFilter);
    ["typeFilter", "statusFilter"].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", applyFilter);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadMedicines();
});

Object.assign(window, {
    applyFilter,
    openAddModal,
    editMedicine,
    saveMedicine,
    deleteMedicine,
    viewMedicine
});
