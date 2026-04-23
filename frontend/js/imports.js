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
// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    await loadSuppliers();
    await loadKho();
    loadImports();
});

// ================= FORMAT =================
function formatMoney(x) {
    return Number(x).toLocaleString("vi-VN") + " đ";
}

// ================= LOAD NCC =================
async function loadSuppliers() {
    const res = await fetch(API_SUP);
    suppliers = await res.json();

    supplierSelect.innerHTML =
        suppliers.map(s => `<option value="${s.MaNCC}">${s.TenNCC}</option>`).join("");

    supplierSelect.addEventListener("change", loadMedicinesBySupplier);

    await loadMedicinesBySupplier();
}

// ================= LOAD KHO =================
async function loadKho() {
    const res = await fetch(API_KHO);
    const data = await res.json();

    khoSelect.innerHTML =
        data.map(k => `<option value="${k.MaKho}">${k.TenKho}</option>`).join("");
}

// ================= LOAD THUỐC =================
async function loadMedicinesBySupplier() {
    const MaNCC = supplierSelect.value;

    const res = await fetch(`${API_IMPORT}/by-supplier?MaNCC=${MaNCC}`);
    medicines = await res.json();

    medicineSelect.innerHTML =
        medicines.map(m => `<option value="${m.MaThuoc}">${m.TenThuoc}</option>`).join("");

    // 🔥 load đơn vị của thuốc đầu tiên
    if (medicines.length > 0) {
        loadUnits(medicines[0].MaThuoc);
    }
}

// ================= LOAD QUY ĐỔI =================
async function loadUnits(MaThuoc) {

    if (!MaThuoc) return;

    try {
        const res = await fetch(`${API_QD}?MaThuoc=${MaThuoc}`);

        if (!res.ok) {
            unitSelect.innerHTML = `<option>Không có đơn vị</option>`;
            return;
        }

        const data = await res.json();

        units = data;

        // 🔥 render dropdown
        unitSelect.innerHTML = data.map(u => `
            <option value="${u.SoLuong}" data-name="${u.TenDonVi}">
                ${u.TenDonVi}
            </option>
        `).join("");

    } catch (err) {
        console.error(err);
    }
}

medicineSelect.addEventListener("change", function () {
    const MaThuoc = this.value;
    loadUnits(MaThuoc);
});

// ================= CALC =================
function calcRealQty() {
    const factor = Number(unitSelect.value || 0);
    const qty = Number(quantity.value || 0);
    realQty.value = factor * qty;
}

quantity.addEventListener("input", calcRealQty);
unitSelect.addEventListener("change", calcRealQty);

// ================= ADD CART =================
function addToCart() {
    const MaThuoc = medicineSelect.value;
    const m = medicines.find(x => x.MaThuoc == MaThuoc);

    const factor = Number(unitSelect.value);
    const qty = Number(quantity.value);

    // ✅ FIX FORMAT GIÁ
    const priceValue = Number(price.value.replace(/\./g, ""));

    const DonViNhap = unitSelect.options[unitSelect.selectedIndex].dataset.name;

    // ❌ FIX BUG validate
    if (!qty || !priceValue) {
        alert("Thiếu số lượng hoặc giá");
        return;
    }

    cart.push({
        MaThuoc,
        TenThuoc: m.TenThuoc,

        DonViNhap,
        SoLuongNhap: qty,
        HeSoQuyDoi: factor,

        SoLuong: qty * factor,
        GiaNhap: priceValue / factor,
        ThanhTien: qty * priceValue,

        SoLo: soLo.value,
        HanSuDung: hsd.value,
        NgaySanXuat: nsx.value
    });

    renderCart();
}

// ================= RENDER =================
function renderCart() {
    cartTable.innerHTML = cart.map((i, idx) => `
        <tr>
            <td>${i.TenThuoc}</td>
            <td>${i.DonViNhap}</td>
            <td>${i.SoLuongNhap}</td>
            <td>${i.SoLuong}</td>
            <td>${formatMoney(i.GiaNhap)}</td>
            <td>${formatMoney(i.ThanhTien)}</td>
            <td>${i.SoLo}</td>
            <td>${i.HanSuDung}</td>
            <td><button onclick="removeItem(${idx})">X</button></td>
        </tr>
    `).join("");

    calculateTotal();
}

function removeItem(i) {
    cart.splice(i, 1);
    renderCart();
}

// ================= TOTAL =================
function calculateTotal() {
    const total = cart.reduce((sum, i) => sum + i.ThanhTien, 0);
    totalMoney.innerText = formatMoney(total);
}

// ================= SUBMIT =================
async function submitImport() {

    if (cart.length === 0) {
        alert("Chưa có thuốc");
        return;
    }

    for (let i of cart) {
        if (!i.SoLo || !i.HanSuDung || !i.NgaySanXuat) {
            alert("Thiếu thông tin lô");
            return;
        }
    }

    // ✅ LẤY USER ĐANG LOGIN
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || !user.MaNV) {
        alert("Chưa đăng nhập hoặc thiếu MaNV");
        return;
    }

    const payload = {
        MaNCC: supplierSelect.value,
        MaKho: khoSelect.value,
        LoaiPhieu: loaiPhieu.value,
        MaNhanVien: user.MaNV, // 🔥 FIX CHÍNH
        details: cart
    };

    console.log("Payload gửi lên:", payload); // debug

    const res = await fetch(API_IMPORT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        alert(err.message);
        return;
    }

    alert("Thành công");

    cart = [];
    renderCart();
    loadImports();
}

// ================= LOAD LIST =================
async function loadImports() {
    const res = await fetch(API_IMPORT);
    const data = await res.json();

    importList.innerHTML =
        data.map(p => `
        <tr>
            <td>${p.MaPN}</td>
            <td>${p.TenNCC}</td>
            <td>${new Date(p.NgayNhap).toLocaleDateString()}</td>
        </tr>
    `).join("");
}