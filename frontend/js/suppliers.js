const API_URL = "http://localhost:3000/api/suppliers";

let suppliersData = [];

// ================= FORMAT =================
function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

// ================= RENDER =================
function renderTable(data) {
    const tbody = document.querySelector("#supplierTable tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Không có dữ liệu</td></tr>`;
        return;
    }

    data.forEach(s => {
        const row = `
            <tr onclick="goToDetail(${s.MaNCC})" style="cursor: pointer;">
                <td class="text-center">${s.MaNCC}</td>
                <td class="fw-semibold">${s.TenNCC}</td>
                <td>${s.SoDienThoai || ""}</td>
                <td>${s.Email || ""}</td>
                <td class="text-center">${s.SoLanNhap || 0}</td>
                <td class="text-end fw-semibold">${formatCurrency(s.TongTien)}</td>
                <td onclick="event.stopPropagation()" class="text-center">
                    <button class="action-icon btn-edit" onclick="editSupplier(${s.MaNCC}); event.stopPropagation()" title="Sửa">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="action-icon btn-delete" onclick="deleteSupplier(${s.MaNCC}); event.stopPropagation()" title="Xóa">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    window.TablePager?.reset("#supplierTable");
    window.TablePager?.attach("#supplierTable", { pageSize: 8 });
}

// ================= LOAD =================
async function loadSuppliers() {
    const tbody = document.querySelector("#supplierTable tbody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>`;

    try {
        const res = await fetch(API_URL);
        suppliersData = await res.json();
        renderTable(suppliersData);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Lỗi tải dữ liệu</td></tr>`;
    }
}

// ================= SEARCH & FILTER =================
function setupSearch() {
    const input = document.getElementById("searchInput");
    input.addEventListener("input", applyFilter);

    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
        sortFilter.innerHTML = `
            <option value="">Sắp xếp</option>
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
            <option value="import_count">Sắp xếp theo số lần nhập</option>
        `;

        sortFilter.addEventListener("change", applyFilter);
    }
}

function applyFilter() {
    const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
    const sortValue = document.getElementById("sortFilter")?.value || "";

    let filtered = [...suppliersData];

    if (keyword) {
        filtered = filtered.filter(s => 
            s.TenNCC.toLowerCase().includes(keyword)
        );
    }

    // Có thể mở rộng sort sau
    if (sortValue === "asc") {
        filtered.sort((a, b) => (a.TenNCC || "").localeCompare(b.TenNCC || "", "vi"));
    } else if (sortValue === "desc") {
        filtered.sort((a, b) => (b.TenNCC || "").localeCompare(a.TenNCC || "", "vi"));
    } else if (sortValue === "import_count") {
        filtered.sort((a, b) => (Number(b.SoLanNhap) || 0) - (Number(a.SoLanNhap) || 0));
    }

    renderTable(filtered);
}

// ================= MODAL =================
function openAddModal() {
    document.getElementById("MaNCC").value = "";
    ["TenNCC", "SoDienThoai", "Email", "MaSoThue", "NguoiLienHe", "DiaChi", "DieuKhoanThanhToan"]
        .forEach(id => document.getElementById(id).value = "");

    document.querySelector(".modal-title").innerText = "Thêm nhà cung cấp";
    new bootstrap.Modal(document.getElementById("supplierModal")).show();
}

async function editSupplier(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const s = await res.json();

        document.getElementById("MaNCC").value = s.MaNCC;
        document.getElementById("TenNCC").value = s.TenNCC;
        document.getElementById("SoDienThoai").value = s.SoDienThoai || "";
        document.getElementById("Email").value = s.Email || "";
        document.getElementById("MaSoThue").value = s.MaSoThue || "";
        document.getElementById("NguoiLienHe").value = s.NguoiLienHe || "";
        document.getElementById("DiaChi").value = s.DiaChi || "";
        document.getElementById("DieuKhoanThanhToan").value = s.DieuKhoanThanhToan || "";

        document.querySelector(".modal-title").innerText = "Cập nhật nhà cung cấp";
        new bootstrap.Modal(document.getElementById("supplierModal")).show();
    } catch {
        alert("Không thể lấy dữ liệu nhà cung cấp");
    }
}

async function saveSupplier() {
    const id = document.getElementById("MaNCC").value;
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
        alert("Vui lòng nhập đầy đủ thông tin bắt buộc (*)");
        return;
    }

    try {
        if (id) {
            await fetch(`${API_URL}/${id}`, { method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data) });
        } else {
            await fetch(API_URL, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data) });
        }

        loadSuppliers();
        bootstrap.Modal.getInstance(document.getElementById("supplierModal")).hide();
    } catch {
        alert("Lỗi khi lưu dữ liệu");
    }
}

async function deleteSupplier(id) {
    if (!confirm("Bạn có chắc muốn xóa nhà cung cấp này?")) return;
    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        loadSuppliers();
    } catch {
        alert("Không thể xóa nhà cung cấp");
    }
}

function goToDetail(id) {
    window.location.href = `supplier-detail.html?id=${id}`;
}

function setupSearch() {
    const input = document.getElementById("searchInput");
    input.addEventListener("input", applyFilter);

    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
        sortFilter.innerHTML = `
            <option value="">Tất cả</option>
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
        `;

        sortFilter.addEventListener("change", applyFilter);
    }
}

function applyFilter() {
    const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
    const sortValue = document.getElementById("sortFilter")?.value || "";

    let filtered = [...suppliersData];

    if (keyword) {
        filtered = filtered.filter(s =>
            (s.TenNCC || "").toLowerCase().includes(keyword)
        );
    }

    if (sortValue === "asc") {
        filtered.sort((a, b) => (Number(a.SoLanNhap) || 0) - (Number(b.SoLanNhap) || 0));
    } else if (sortValue === "desc") {
        filtered.sort((a, b) => (Number(b.SoLanNhap) || 0) - (Number(a.SoLanNhap) || 0));
    }

    renderTable(filtered);
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSuppliers();
    setupSearch();
});
