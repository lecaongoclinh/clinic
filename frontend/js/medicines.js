const API_URL = "http://localhost:3000/api/medicines";

let medicinesData = []; // lưu toàn bộ dữ liệu

// ================= FORMAT =================
function formatCurrency(value) {
    return Number(value).toLocaleString("vi-VN") + " đ";
}

// ================= RENDER =================
function renderTable(data) {
    const tbody = document.querySelector("#medicineTable tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Không có dữ liệu</td></tr>`;
        return;
    }

    data.forEach(med => {
        const row = `
            <tr onclick="viewMedicine(${med.MaThuoc})">
                <td class="text-center">${med.MaThuoc}</td>
                <td>${med.TenThuoc}</td>
                <td>${med.HoatChat || ""}</td>
                <td>${med.HamLuong || ""}</td>
                <td>${med.DangBaoChe || ""}</td>
                <td class="text-end fw-semibold">${formatCurrency(med.GiaBan)}</td>
                <td class="text-center">${med.TongTon || 0}</td>
                <td onclick="event.stopPropagation()" class="text-center">
                    <button class="action-icon btn-edit" onclick="editMedicine(${med.MaThuoc}); event.stopPropagation()" title="Sửa">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="action-icon btn-delete" onclick="deleteMedicine(${med.MaThuoc}); event.stopPropagation()" title="Xóa">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    window.TablePager?.reset("#medicineTable");
    window.TablePager?.attach("#medicineTable", { pageSize: 8 });
}

function goToDetail(id) {
    window.location.href = `medicine-detail.html?id=${id}`;
}
// ================= LOAD =================
async function loadMedicines() {
    const tbody = document.querySelector("#medicineTable tbody");

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const res = await fetch(API_URL);
        medicinesData = await res.json();

        renderTable(medicinesData);

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-danger text-center">Lỗi tải dữ liệu</td>
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

function openAddModal() {
    document.getElementById("MaThuoc").value = "";

    const fields = [
        "TenThuoc", "GiaBan", "HoatChat", "HamLuong",
        "DangBaoChe", "QuyCachDongGoi",
        "HangSanXuat", "NuocSanXuat",
        "NhietDoBaoQuan", "MaVach"
    ];

    fields.forEach(id => document.getElementById(id).value = "");

    document.getElementById("LoaiThuoc").value = "ThuocKeDon";

    document.querySelector(".modal-title").innerText = "Thêm thuốc";

    new bootstrap.Modal(document.getElementById("medicineModal")).show();
}

async function editMedicine(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const med = await res.json();

        document.getElementById("MaThuoc").value = med.MaThuoc;
        document.getElementById("TenThuoc").value = med.TenThuoc;
        document.getElementById("GiaBan").value = med.GiaBan;

        document.getElementById("HoatChat").value = med.HoatChat || "";
        document.getElementById("HamLuong").value = med.HamLuong || "";
        document.getElementById("DangBaoChe").value = med.DangBaoChe || "";
        document.getElementById("QuyCachDongGoi").value = med.QuyCachDongGoi || "";
        document.getElementById("HangSanXuat").value = med.HangSanXuat || "";
        document.getElementById("NuocSanXuat").value = med.NuocSanXuat || "";
        document.getElementById("NhietDoBaoQuan").value = med.NhietDoBaoQuan || "";
        document.getElementById("MaVach").value = med.MaVach || "";
        document.getElementById("LoaiThuoc").value = med.LoaiThuoc || "ThuocKeDon";

        document.querySelector(".modal-title").innerText = "Cập nhật thuốc";

        new bootstrap.Modal(document.getElementById("medicineModal")).show();

    } catch {
        alert("Không thể lấy dữ liệu thuốc");
    }
}

async function saveMedicine() {
    const id = document.getElementById("MaThuoc").value;

    const TenThuoc = document.getElementById("TenThuoc").value.trim();
    const GiaBan = document.getElementById("GiaBan").value;

    if (!TenThuoc || !GiaBan) {
        alert("Tên thuốc và giá là bắt buộc");
        return;
    }

    const data = {
        TenThuoc,
        GiaBan,
        HoatChat: document.getElementById("HoatChat").value,
        HamLuong: document.getElementById("HamLuong").value,
        DangBaoChe: document.getElementById("DangBaoChe").value,
        QuyCachDongGoi: document.getElementById("QuyCachDongGoi").value,
        HangSanXuat: document.getElementById("HangSanXuat").value,
        NuocSanXuat: document.getElementById("NuocSanXuat").value,
        NhietDoBaoQuan: document.getElementById("NhietDoBaoQuan").value,
        MaVach: document.getElementById("MaVach").value,
        LoaiThuoc: document.getElementById("LoaiThuoc").value
    };

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

function viewMedicine(id) {
    window.location.href = `medicine-detail.html?id=${id}`;
}

// Áp dụng lọc (có thể mở rộng sau)
function applyFilter() {
    const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
    const filtered = medicinesData.filter(med => 
        med.TenThuoc.toLowerCase().includes(keyword)
    );
    renderTable(filtered);
}

// Reset filter
function resetFilter() {
    document.getElementById("searchInput").value = "";
    document.getElementById("typeFilter").value = "";
    document.getElementById("dateFilter").value = "";
    document.getElementById("sortFilter").value = "";
    renderTable(medicinesData);
}

function getFilteredMedicines() {
    const keyword = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
    const sortValue = document.getElementById("sortFilter")?.value || "";
    let filtered = [...medicinesData];

    if (keyword) {
        filtered = filtered.filter(med =>
            (med.TenThuoc || "").toLowerCase().includes(keyword)
        );
    }

    if (sortValue === "asc") {
        filtered.sort((a, b) => (Number(a.TongTon) || 0) - (Number(b.TongTon) || 0));
    } else if (sortValue === "desc") {
        filtered.sort((a, b) => (Number(b.TongTon) || 0) - (Number(a.TongTon) || 0));
    }

    return filtered;
}

setupSearch = function () {
    const input = document.getElementById("searchInput");
    const sortFilter = document.getElementById("sortFilter");

    if (sortFilter) {
        sortFilter.innerHTML = `
            <option value="">Tất cả</option>
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
        `;
        sortFilter.addEventListener("change", applyFilter);
    }

    input?.addEventListener("input", applyFilter);
};

applyFilter = function () {
    renderTable(getFilteredMedicines());
};

resetFilter = function () {
    const searchInput = document.getElementById("searchInput");
    const sortFilter = document.getElementById("sortFilter");

    if (searchInput) searchInput.value = "";
    if (sortFilter) sortFilter.value = "";

    renderTable(medicinesData);
};

loadMedicines = async function () {
    const tbody = document.querySelector("#medicineTable tbody");

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const res = await fetch(API_URL);
        medicinesData = await res.json();
        applyFilter();
    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-danger text-center">Lỗi tải dữ liệu</td>
            </tr>
        `;
    }
};
