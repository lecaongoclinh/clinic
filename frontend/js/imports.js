const API_IMPORT = "http://localhost:3000/api/imports";
const API_SUP = "http://localhost:3000/api/suppliers";
const API_KHO = "http://localhost:3000/api/kho";
const API_QD = "http://localhost:3000/api/quy-doi";

let medicines = [];
let suppliers = [];
let cart = [];
let units = [];

const supplierSelect = document.getElementById("supplierSelect");
const khoSelect = document.getElementById("khoSelect");
const medicineSelect = document.getElementById("medicineSelect");
const unitSelect = document.getElementById("unitSelect");
const quantity = document.getElementById("quantity");
const realQty = document.getElementById("realQty");
const price = document.getElementById("price");
const soLo = document.getElementById("soLo");
const nsx = document.getElementById("nsx");
const hsd = document.getElementById("hsd");
const cartTable = document.getElementById("cartTable");
const totalMoney = document.getElementById("totalMoney");
const importList = document.getElementById("importList");
const loaiPhieu = document.getElementById("loaiPhieu");

document.addEventListener("DOMContentLoaded", async () => {
    setCurrentStaff();
    await loadSuppliers();
    await loadKho();
    await loadImports();
});

function getCurrentUser() {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const userId = localStorage.getItem("userId") || storedUser?.MaNV || storedUser?.id;
    const fullName = localStorage.getItem("fullName") || storedUser?.HoTen || storedUser?.fullName || localStorage.getItem("username") || "";
    return userId ? { MaNV: Number(userId), HoTen: fullName } : null;
}

function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem("token");
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

function setCurrentStaff() {
    const staffInput = document.getElementById("staffName");
    const user = getCurrentUser();
    if (staffInput) staffInput.value = user?.HoTen || "";
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || data.error || "Lỗi API");
    }
    return data;
}

async function loadSuppliers() {
    suppliers = await fetchJson(API_SUP);
    supplierSelect.innerHTML = suppliers.map(s => `<option value="${s.MaNCC}">${s.TenNCC}</option>`).join("");
    supplierSelect.addEventListener("change", loadMedicinesBySupplier);
    await loadMedicinesBySupplier();
}

async function loadKho() {
    const data = await fetchJson(API_KHO);
    khoSelect.innerHTML = data.map(k => `<option value="${k.MaKho}">${k.TenKho}</option>`).join("");
}

async function loadMedicinesBySupplier() {
    const MaNCC = supplierSelect.value;
    medicines = await fetchJson(`${API_IMPORT}/by-supplier?MaNCC=${MaNCC}`);
    medicineSelect.innerHTML = medicines.map(m => `<option value="${m.MaThuoc}">${m.TenThuoc}</option>`).join("");

    if (medicines.length > 0) {
        await loadUnits(medicines[0].MaThuoc);
    } else {
        unitSelect.innerHTML = "";
        units = [];
    }
    calcRealQty();
}

async function loadUnits(MaThuoc) {
    if (!MaThuoc) return;

    try {
        const response = await fetch(`${API_QD}?MaThuoc=${MaThuoc}`);
        if (!response.ok) {
            unitSelect.innerHTML = `<option value="1" data-name="">Đơn vị cơ bản</option>`;
            units = [];
            return;
        }

        units = await response.json();
        unitSelect.innerHTML = units.map(u => `
            <option value="${u.SoLuong}" data-name="${u.TenDonVi}">
                ${u.TenDonVi}
            </option>
        `).join("");
    } catch (error) {
        console.error(error);
        unitSelect.innerHTML = `<option value="1" data-name="">Đơn vị cơ bản</option>`;
    }
}

medicineSelect.addEventListener("change", async function () {
    await loadUnits(this.value);
    calcRealQty();
});

function calcRealQty() {
    const factor = Number(unitSelect.value || 0);
    const qty = Number(quantity.value || 0);
    realQty.value = factor * qty || "";
}

quantity.addEventListener("input", calcRealQty);
unitSelect.addEventListener("change", calcRealQty);

function parseMoneyInput(value) {
    return Number(String(value || "").replace(/[^\d]/g, ""));
}

function addToCart() {
    const MaThuoc = medicineSelect.value;
    const medicine = medicines.find(x => String(x.MaThuoc) === String(MaThuoc));
    const factor = Number(unitSelect.value || 0);
    const qty = Number(quantity.value || 0);
    const priceValue = parseMoneyInput(price.value);
    const DonViNhap = unitSelect.options[unitSelect.selectedIndex]?.dataset.name || "";
    const lotCode = soLo.value.trim();

    if (!MaThuoc || !medicine) {
        alert("Vui lòng chọn thuốc");
        return;
    }
    if (!qty || qty <= 0 || !factor || factor <= 0) {
        alert("Số lượng nhập không hợp lệ");
        return;
    }
    if (!priceValue || priceValue <= 0) {
        alert("Giá nhập không hợp lệ");
        return;
    }
    if (!lotCode || !nsx.value || !hsd.value) {
        alert("Vui lòng nhập đầy đủ số lô, NSX và HSD");
        return;
    }
    if (new Date(hsd.value) <= new Date(nsx.value)) {
        alert("HSD phải sau NSX");
        return;
    }

    const duplicatedInCart = cart.some(item =>
        String(item.MaThuoc) === String(MaThuoc) &&
        String(item.SoLo).toLowerCase() === lotCode.toLowerCase()
    );
    if (duplicatedInCart) {
        alert("Số lô này đã có trong phiếu nhập hiện tại");
        return;
    }

    cart.push({
        MaThuoc,
        TenThuoc: medicine.TenThuoc,
        DonViNhap,
        SoLuongNhap: qty,
        HeSoQuyDoi: factor,
        SoLuong: qty * factor,
        GiaNhap: priceValue / factor,
        GiaNhapDonViNhap: priceValue,
        ThanhTien: qty * priceValue,
        SoLo: lotCode,
        HanSuDung: hsd.value,
        NgaySanXuat: nsx.value
    });

    renderCart();
}

function renderCart() {
    cartTable.innerHTML = cart.map((item, idx) => `
        <tr>
            <td>${item.TenThuoc}</td>
            <td>${item.DonViNhap}</td>
            <td>${item.SoLuongNhap}</td>
            <td>${item.SoLuong}</td>
            <td>${formatMoney(item.GiaNhap)}</td>
            <td>${formatMoney(item.ThanhTien)}</td>
            <td>${item.SoLo}</td>
            <td>${item.HanSuDung}</td>
            <td><button class="btn btn-sm btn-outline-danger" onclick="removeItem(${idx})">X</button></td>
        </tr>
    `).join("");

    calculateTotal();
}

function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
}

function calculateTotal() {
    totalMoney.innerText = formatMoney(cart.reduce((sum, item) => sum + item.ThanhTien, 0));
}

async function submitImport() {
    if (cart.length === 0) {
        alert("Chưa có thuốc");
        return;
    }

    const user = getCurrentUser();
    if (!user?.MaNV) {
        alert("Chưa đăng nhập hoặc thiếu mã nhân viên");
        return;
    }

    for (const item of cart) {
        if (!item.SoLo || !item.HanSuDung || !item.NgaySanXuat) {
            alert("Thiếu thông tin lô");
            return;
        }
        if (new Date(item.HanSuDung) <= new Date(item.NgaySanXuat)) {
            alert(`HSD phải sau NSX của lô ${item.SoLo}`);
            return;
        }
    }

    const payload = {
        MaNCC: supplierSelect.value,
        MaKho: khoSelect.value,
        LoaiPhieu: loaiPhieu.value,
        details: cart
    };

    try {
        await fetchJson(API_IMPORT, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        alert("Thành công");
        cart = [];
        renderCart();
        await loadImports();
    } catch (error) {
        alert(error.message || "Không thể tạo phiếu nhập");
    }
}

async function loadImports() {
    const data = await fetchJson(API_IMPORT);
    importList.innerHTML = data.map(p => `
        <tr>
            <td>${p.MaPN}</td>
            <td>${p.TenNCC || ""}</td>
            <td>${new Date(p.NgayNhap).toLocaleDateString("vi-VN")}</td>
        </tr>
    `).join("");
}

Object.assign(window, {
    addToCart,
    removeItem,
    submitImport
});
