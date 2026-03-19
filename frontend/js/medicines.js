const API_URL = "http://localhost:3000/api/medicines";

let medicinesData = []; // lưu toàn bộ dữ liệu

// ================= FORMAT =================
function formatCurrency(value) {
    return Number(value).toLocaleString("vi-VN") + " đ";
}

// ================= RENDER =================
function renderTable(data) {
    const table = document.getElementById("medicineTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">Không có dữ liệu</td>
            </tr>
        `;
        return;
    }

    data.forEach(med => {
        const status = med.TongTon < 10
            ? `<span class="badge bg-danger px-3 py-1 rounded-pill">Sắp hết</span>`
            : `<span class="badge bg-success px-3 py-1 rounded-pill">Còn hàng</span>`;

        const row = `
            <tr>
                <td>${med.MaThuoc}</td>
                <td class="fw-bold">${med.TenThuoc}</td>
                <td>${med.DonViTinh}</td>
                <td class=" fw-semibold">${formatCurrency(med.GiaBan)}</td>
                <td>${med.TongTon}</td>
                <td>${status}</td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm rounded-pill px-3 me-1"
                        onclick="editMedicine(${med.MaThuoc})">Sửa</button>
                    <button class="btn btn-danger btn-sm rounded-pill px-3"
                        onclick="deleteMedicine(${med.MaThuoc})">Xóa</button>
                </td>
            </tr>
        `;

        table.innerHTML += row;
    });
}

// ================= LOAD =================
async function loadMedicines() {
    const table = document.getElementById("medicineTable");

    table.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const res = await fetch(API_URL);
        medicinesData = await res.json();

        renderTable(medicinesData);

    } catch (error) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-danger text-center">Lỗi tải dữ liệu</td>
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
            renderTable(medicinesData);
            return;
        }

        const filtered = medicinesData.filter(med =>
            med.TenThuoc.toLowerCase().includes(keyword)
        );

        renderTable(filtered);
    });
}

// ================= ADD =================
function openAddModal() {
    document.getElementById("MaThuoc").value = "";
    document.getElementById("TenThuoc").value = "";
    document.getElementById("DonViTinh").value = "";
    document.getElementById("GiaBan").value = "";

    document.querySelector(".modal-title").innerText = "Thêm thuốc";

    new bootstrap.Modal(document.getElementById("medicineModal")).show();
}

// ================= EDIT =================
async function editMedicine(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const med = await res.json();

        document.getElementById("MaThuoc").value = med.MaThuoc;
        document.getElementById("TenThuoc").value = med.TenThuoc;
        document.getElementById("DonViTinh").value = med.DonViTinh;
        document.getElementById("GiaBan").value = med.GiaBan;

        document.querySelector(".modal-title").innerText = "Cập nhật thuốc";

        new bootstrap.Modal(document.getElementById("medicineModal")).show();

    } catch {
        alert("Không thể lấy dữ liệu thuốc");
    }
}

// ================= SAVE =================
async function saveMedicine() {
    const id = document.getElementById("MaThuoc").value;

    const TenThuoc = document.getElementById("TenThuoc").value.trim();
    const DonViTinh = document.getElementById("DonViTinh").value.trim();
    const GiaBan = document.getElementById("GiaBan").value;

    if (!TenThuoc || !DonViTinh || !GiaBan) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    const data = { TenThuoc, DonViTinh, GiaBan };

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

        loadMedicines();

        bootstrap.Modal.getInstance(
            document.getElementById("medicineModal")
        ).hide();

    } catch {
        alert("Lỗi khi lưu dữ liệu");
    }
}

// ================= DELETE =================
async function deleteMedicine(id) {
    if (!confirm("Bạn có chắc muốn xóa thuốc này?")) return;

    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        loadMedicines();
    } catch {
        alert("Không thể xóa");
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadMedicines();
    setupSearch(); // 
});