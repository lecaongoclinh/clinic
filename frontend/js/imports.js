const API_IMPORT = "http://localhost:3000/api/imports";
const API_SUP = "http://localhost:3000/api/suppliers";

let medicines = [];
let suppliers = [];
let cart = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadSuppliers();
    await loadMedicinesBySupplier();
    loadImports();
});

function formatMoney(x) {
    return Number(x).toLocaleString("vi-VN") + " đ";
}

// NCC
async function loadSuppliers() {
    const res = await fetch(API_SUP);
    suppliers = await res.json();

    const select = document.getElementById("supplierSelect");

    select.innerHTML = suppliers.map(s =>
        `<option value="${s.MaNCC}">${s.TenNCC}</option>`
    ).join("");

    select.addEventListener("change", loadMedicinesBySupplier);
}

// thuốc theo NCC
async function loadMedicinesBySupplier() {
    const MaNCC = document.getElementById("supplierSelect").value;

    const res = await fetch(`${API_IMPORT}/by-supplier?MaNCC=${MaNCC}`);
    medicines = await res.json();

    renderMedicineList();
}

// render thuốc
function renderMedicineList() {
    const container = document.getElementById("medicineList");

    container.innerHTML = medicines.map(m => {
        const isAdded = cart.find(x => x.MaThuoc == m.MaThuoc);

        return `
        <tr>
            <td>${m.TenThuoc}</td>
            <td>${m.DonViTinh}</td>
            <td>${m.SoLuongTon}</td>
            <td>${formatMoney(m.GiaNhap)}</td>
            <td class="text-end">
                <button class="btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-success'}"
                    ${isAdded ? 'disabled' : ''}
                    onclick="addToCart(${m.MaThuoc})">
                    +
                </button>
            </td>
        </tr>`;
    }).join("");
}

// add cart
function addToCart(id) {
    const med = medicines.find(m => m.MaThuoc == id);

    cart.push({
        MaThuoc: id,
        TenThuoc: med.TenThuoc,
        GiaNhap: Number(med.GiaNhap),
        SoLuong: 1,
        HanSuDung: "",
        SoLo: ""
    });

    renderCart();
}

// render cart
function renderCart() {
    const table = document.getElementById("cartTable");

    table.innerHTML = cart.map((item, i) => `
        <tr>
            <td>${item.TenThuoc}</td>

            <td>
                <input type="number" value="${item.SoLuong}"
                    onchange="update(${i}, 'SoLuong', this.value)">
            </td>

            <td>${formatMoney(item.GiaNhap)}</td>

            <td>
                <input type="date"
                    onchange="update(${i}, 'HanSuDung', this.value)">
            </td>

            <td>
                <input placeholder="Số lô"
                    onchange="update(${i}, 'SoLo', this.value)">
            </td>

            <td>
                <button onclick="removeItem(${i})">X</button>
            </td>
        </tr>
    `).join("");

    calculateTotal();
}

// update
function update(i, field, value) {
    if (field === "SoLuong") {
        cart[i][field] = Number(value);
    } else {
        cart[i][field] = value;
    }

    calculateTotal();
}

// remove
function removeItem(i) {
    cart.splice(i, 1);
    renderCart();
}

// total
function calculateTotal() {
    let total = 0;
    cart.forEach(i => total += i.SoLuong * i.GiaNhap);
    document.getElementById("totalMoney").innerText = formatMoney(total);
}

// submit
async function submitImport() {
    const MaNCC = document.getElementById("supplierSelect").value;

    if (cart.length === 0) {
        alert("Chưa có thuốc");
        return;
    }

    for (let i of cart) {
        if (!i.SoLo || !i.HanSuDung) {
            alert("Nhập đủ số lô và hạn dùng");
            return;
        }
    }

    const res = await fetch(API_IMPORT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ MaNCC, items: cart })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "Lỗi tạo phiếu");
        return;
    }

    alert("Nhập thành công");

    cart = [];
    renderCart();

    await loadImports();
    await loadMedicinesBySupplier();
}

// load list
async function loadImports() {
    const res = await fetch(API_IMPORT);
    const data = await res.json();

    document.getElementById("importList").innerHTML =
        data.map(pn => `
            <tr>
                <td>${pn.MaPN}</td>
                <td>${pn.TenNCC || ""}</td>
                <td>${new Date(pn.NgayNhap).toLocaleDateString()}</td>
            </tr>
        `).join("");
}