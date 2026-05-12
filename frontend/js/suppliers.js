const API_URL = "http://localhost:3000/api/suppliers";

let suppliersData = [];

function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderTable(data) {
    const tbody = document.querySelector("#supplierTable tbody");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Không có dữ liệu</td></tr>`;
        window.TablePager?.reset("#supplierTable");
        return;
    }

    tbody.innerHTML = data.map((s) => `
        <tr onclick="goToDetail(${s.MaNCC})" style="cursor: pointer;">
            <td class="text-center">${s.MaNCC}</td>
            <td class="fw-semibold">${escapeHtml(s.TenNCC || "")}</td>
            <td>${escapeHtml(s.SoDienThoai || "")}</td>
            <td>${escapeHtml(s.Email || "")}</td>
            <td class="text-center">${Number(s.SoLanNhap || 0).toLocaleString("vi-VN")}</td>
            <td class="text-end fw-semibold">${formatCurrency(s.TongTien)}</td>
            <td onclick="event.stopPropagation()" class="text-center">
                <button class="action-icon btn-edit" onclick="editSupplier(${s.MaNCC}); event.stopPropagation()" title="Sửa">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="action-icon btn-delete" onclick="deleteSupplier(${s.MaNCC}); event.stopPropagation()" title="Xóa hoặc ngừng hợp tác">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join("");

    window.TablePager?.reset("#supplierTable");
    window.TablePager?.attach("#supplierTable", { pageSize: 8 });
}

async function loadSuppliers() {
    const tbody = document.querySelector("#supplierTable tbody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>`;

    try {
        const res = await fetch(API_URL);
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data.message || "Không thể tải nhà cung cấp");
        suppliersData = Array.isArray(data) ? data : [];
        applyFilter();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">${escapeHtml(error.message)}</td></tr>`;
    }
}

function setupSearch() {
    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
        sortFilter.innerHTML = `
            <option value="name_asc">Tên A-Z</option>
            <option value="name_desc">Tên Z-A</option>
            <option value="import_count_desc">Số lần nhập giảm dần</option>
            <option value="amount_desc">Tổng tiền nhập giảm dần</option>
        `;
    }

    document.getElementById("searchInput")?.addEventListener("input", applyFilter);
    sortFilter?.addEventListener("change", applyFilter);
}

function applyFilter() {
    const keyword = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
    const sortValue = document.getElementById("sortFilter")?.value || "name_asc";
    let filtered = [...suppliersData];

    if (keyword) {
        filtered = filtered.filter((s) => [
            s.TenNCC,
            s.SoDienThoai,
            s.Email,
            s.MaSoThue,
            s.NguoiLienHe
        ].join(" ").toLowerCase().includes(keyword));
    }

    if (sortValue === "name_desc") {
        filtered.sort((a, b) => String(b.TenNCC || "").localeCompare(String(a.TenNCC || ""), "vi"));
    } else if (sortValue === "import_count_desc") {
        filtered.sort((a, b) => Number(b.SoLanNhap || 0) - Number(a.SoLanNhap || 0));
    } else if (sortValue === "amount_desc") {
        filtered.sort((a, b) => Number(b.TongTien || 0) - Number(a.TongTien || 0));
    } else {
        filtered.sort((a, b) => String(a.TenNCC || "").localeCompare(String(b.TenNCC || ""), "vi"));
    }

    renderTable(filtered);
}

function openAddModal() {
    document.getElementById("MaNCC").value = "";
    ["TenNCC", "SoDienThoai", "Email", "MaSoThue", "NguoiLienHe", "DiaChi", "DieuKhoanThanhToan"]
        .forEach(id => { document.getElementById(id).value = ""; });
    document.querySelector(".modal-title").innerText = "Thêm nhà cung cấp";
    new bootstrap.Modal(document.getElementById("supplierModal")).show();
}

async function editSupplier(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const s = await res.json();
        if (!res.ok) throw new Error(s.message || "Không thể lấy dữ liệu nhà cung cấp");

        document.getElementById("MaNCC").value = s.MaNCC;
        document.getElementById("TenNCC").value = s.TenNCC || "";
        document.getElementById("SoDienThoai").value = s.SoDienThoai || "";
        document.getElementById("Email").value = s.Email || "";
        document.getElementById("MaSoThue").value = s.MaSoThue || "";
        document.getElementById("NguoiLienHe").value = s.NguoiLienHe || "";
        document.getElementById("DiaChi").value = s.DiaChi || "";
        document.getElementById("DieuKhoanThanhToan").value = s.DieuKhoanThanhToan || "";
        document.querySelector(".modal-title").innerText = "Cập nhật nhà cung cấp";
        new bootstrap.Modal(document.getElementById("supplierModal")).show();
    } catch (error) {
        alert(error.message || "Không thể lấy dữ liệu nhà cung cấp");
    }
}

function getPayload() {
    const data = {
        TenNCC: document.getElementById("TenNCC").value.trim(),
        DiaChi: document.getElementById("DiaChi").value.trim(),
        SoDienThoai: document.getElementById("SoDienThoai").value.trim(),
        Email: document.getElementById("Email").value.trim(),
        MaSoThue: document.getElementById("MaSoThue").value.trim(),
        NguoiLienHe: document.getElementById("NguoiLienHe").value.trim(),
        DieuKhoanThanhToan: document.getElementById("DieuKhoanThanhToan").value.trim()
    };
    if (!data.TenNCC || !data.DiaChi || !data.SoDienThoai) {
        throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc (*)");
    }
    return data;
}

async function saveSupplier() {
    try {
        const id = document.getElementById("MaNCC").value;
        const data = getPayload();
        const res = await fetch(id ? `${API_URL}/${id}` : API_URL, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.message || "Lỗi khi lưu dữ liệu");

        bootstrap.Modal.getInstance(document.getElementById("supplierModal")).hide();
        await loadSuppliers();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteSupplier(id) {
    if (!confirm("Nếu nhà cung cấp đã phát sinh dữ liệu, hệ thống sẽ ngừng hợp tác thay vì xóa cứng. Tiếp tục?")) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Không thể xóa/ngừng nhà cung cấp");
        alert(data.message || "Đã xử lý nhà cung cấp");
        await loadSuppliers();
    } catch (error) {
        alert(error.message || "Không thể xóa/ngừng nhà cung cấp");
    }
}

function goToDetail(id) {
    window.location.href = `supplier-detail.html?id=${id}`;
}

document.addEventListener("DOMContentLoaded", () => {
    setupSearch();
    loadSuppliers();
});

Object.assign(window, {
    applyFilter,
    openAddModal,
    editSupplier,
    saveSupplier,
    deleteSupplier,
    goToDetail
});
