const API_URL = "http://localhost:3000/api/suppliers";

let suppliersData = []; // lưu toàn bộ dữ liệu

// ================= RENDER =================
function renderTable(data) {
    const table = document.getElementById("supplierTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Không có dữ liệu</td>
            </tr>
        `;
        return;
    }

    data.forEach(s => {
        const row = `
            <tr>
                <td>${s.MaNCC}</td>

                <!-- tên đậm -->
                <td class="fw-semibold">${s.TenNCC}</td>

                <td>${s.DiaChi || ""}</td>
                <td>${s.SoDienThoai || ""}</td>

                <!-- 🔥 BUTTON cùng hàng -->
                <td>
                    <div class="d-flex justify-content-center gap-1">
                        <button class="btn btn-warning btn-sm px-3"
                            onclick="editSupplier(${s.MaNCC})">
                            Sửa
                        </button>

                        <button class="btn btn-danger btn-sm px-3"
                            onclick="deleteSupplier(${s.MaNCC})">
                            Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// ================= LOAD =================
async function loadSuppliers() {
    const table = document.getElementById("supplierTable");

    table.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const res = await fetch(API_URL);
        suppliersData = await res.json();

        renderTable(suppliersData);

    } catch (err) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-danger text-center">Lỗi tải dữ liệu</td>
            </tr>
        `;
    }
}

// ================= SEARCH =================
function setupSearch() {
    const input = document.getElementById("searchInput");

    input.addEventListener("input", function () {
        const keyword = this.value.toLowerCase().trim();

        if (!keyword) {
            renderTable(suppliersData);
            return;
        }

        const filtered = suppliersData.filter(s =>
            (s.TenNCC || "").toLowerCase().includes(keyword) ||
            (s.DiaChi || "").toLowerCase().includes(keyword) ||
            (s.SoDienThoai || "").toLowerCase().includes(keyword)
        );

        renderTable(filtered);
    });
}

// ================= ADD =================
function openAddModal() {
    document.getElementById("MaNCC").value = "";
    document.getElementById("TenNCC").value = "";
    document.getElementById("DiaChi").value = "";
    document.getElementById("SoDienThoai").value = "";

    document.querySelector(".modal-title").innerText = "Thêm nhà cung cấp";

    new bootstrap.Modal(document.getElementById("supplierModal")).show();
}

// ================= EDIT =================
async function editSupplier(id) {
    const res = await fetch(`${API_URL}/${id}`);
    const s = await res.json();

    document.getElementById("MaNCC").value = s.MaNCC;
    document.getElementById("TenNCC").value = s.TenNCC;
    document.getElementById("DiaChi").value = s.DiaChi;
    document.getElementById("SoDienThoai").value = s.SoDienThoai;

    document.querySelector(".modal-title").innerText = "Cập nhật nhà cung cấp";

    new bootstrap.Modal(document.getElementById("supplierModal")).show();
}

// ================= SAVE =================
async function saveSupplier() {
    const id = document.getElementById("MaNCC").value;

    const data = {
        TenNCC: document.getElementById("TenNCC").value.trim(),
        DiaChi: document.getElementById("DiaChi").value.trim(),
        SoDienThoai: document.getElementById("SoDienThoai").value.trim()
    };

    if (!data.TenNCC) {
        alert("Tên NCC không được để trống");
        return;
    }

    try {
        if (id) {
            await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        } else {
            await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        }

        loadSuppliers();

        bootstrap.Modal.getInstance(
            document.getElementById("supplierModal")
        ).hide();

    } catch {
        alert("Lỗi lưu dữ liệu");
    }
}

// ================= DELETE =================
async function deleteSupplier(id) {
    if (!confirm("Xóa nhà cung cấp này?")) return;

    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        loadSuppliers();
    } catch {
        alert("Không thể xóa");
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadSuppliers();
    setupSearch(); // 🔥 quan trọng
});