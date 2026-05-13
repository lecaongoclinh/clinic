const API_IMPORT = "http://localhost:3000/api/imports";
const API_SUP = "http://localhost:3000/api/suppliers";
const API_KHO = "http://localhost:3000/api/kho";
const API_QD = "http://localhost:3000/api/quy-doi";
const API_MEDICINES = "http://localhost:3000/api/medicines";

const IMPORT_TYPE_LABELS = {
    NhapMua: "Nhập mua",
    NhapTra: "Nhập trả",
    NhapKiemKe: "Nhập kiểm kê",
    NhapVienTro: "Nhập viện trợ",
    NhapKhac: "Nhập khác"
};

const RETURN_SOURCE_LABELS = {
    BenhNhan: "Bệnh nhân",
    KhoaPhong: "Khoa/phòng sử dụng",
    KhoQuayThuoc: "Kho Quầy Thuốc",
    KhoThuocLanh: "Kho Thuốc Lạnh",
    Khac: "Khác"
};

let medicines = [];
let suppliers = [];
let cart = [];
let units = [];
let currentImportType = "NhapMua";
let khoById = new Map();

const supplierSelect = document.getElementById("supplierSelect");
const sourceInput = document.getElementById("sourceInput");
const sourceSelect = document.getElementById("sourceSelect");
const otherSourceGroup = document.getElementById("otherSourceGroup");
const otherSourceInput = document.getElementById("otherSourceInput");
const supplierLabel = document.getElementById("supplierLabel");
const khoSelect = document.getElementById("khoSelect");
const khoLabel = document.getElementById("khoLabel");
const medicineSelect = document.getElementById("medicineSelect");
const unitSelect = document.getElementById("unitSelect");
const quantity = document.getElementById("quantity");
const realQty = document.getElementById("realQty");
const price = document.getElementById("price");
const priceGroup = document.getElementById("priceGroup");
const priceLabel = document.getElementById("priceLabel");
const soLo = document.getElementById("soLo");
const nsx = document.getElementById("nsx");
const hsd = document.getElementById("hsd");
const cartTable = document.getElementById("cartTable");
const totalMoney = document.getElementById("totalMoney");
const totalBox = document.getElementById("totalBox");
const totalLabel = document.getElementById("totalLabel");
const priceHeader = document.getElementById("priceHeader");
const amountHeader = document.getElementById("amountHeader");
const importList = document.getElementById("importList");
const loaiPhieu = document.getElementById("loaiPhieu");
const reasonGroup = document.getElementById("reasonGroup");
const reasonLabel = document.getElementById("reasonLabel");
const reasonInput = document.getElementById("reasonInput");
const relatedGroup = document.getElementById("relatedGroup");
const relatedInput = document.getElementById("relatedInput");

document.addEventListener("DOMContentLoaded", async () => {
    setCurrentStaff();
    bindEvents();
    await loadSuppliers();
    await loadKho();
    updateImportTypeUI({ reset: false });
    await loadImports();
});

function bindEvents() {
    supplierSelect.addEventListener("change", loadMedicinesForCurrentType);
    sourceSelect?.addEventListener("change", toggleOtherSource);
    loaiPhieu.addEventListener("change", () => updateImportTypeUI({ reset: true }));
    medicineSelect.addEventListener("change", async function () {
        await loadUnits(this.value);
        calcRealQty();
    });
    quantity.addEventListener("input", calcRealQty);
    unitSelect.addEventListener("change", calcRealQty);
}

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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function supplierPlaceholder() {
    return loaiPhieu.value === "NhapVienTro"
        ? "-- Chọn đơn vị tài trợ --"
        : "-- Chọn nhà cung cấp --";
}

function renderSupplierOptions() {
    supplierSelect.innerHTML = `
        <option value="">${supplierPlaceholder()}</option>
        ${suppliers.map(s => `<option value="${s.MaNCC}">${escapeHtml(s.TenNCC)}</option>`).join("")}
    `;
}

async function loadSuppliers() {
    suppliers = await fetchJson(API_SUP);
    renderSupplierOptions();
    await loadMedicinesForCurrentType();
}

async function loadKho() {
    const data = await fetchJson(API_KHO);
    khoById = new Map(data.map(k => [String(k.MaKho), k.TenKho]));
    khoSelect.innerHTML = `
        <option value="">-- Chọn kho --</option>
        ${data.map(k => `<option value="${k.MaKho}">${escapeHtml(k.TenKho)}</option>`).join("")}
    `;
}

async function loadMedicinesForCurrentType() {
    const type = loaiPhieu.value || "NhapMua";
    const MaNCC = supplierSelect.value;

    medicines = type === "NhapMua" && MaNCC
        ? await fetchJson(`${API_IMPORT}/by-supplier?MaNCC=${encodeURIComponent(MaNCC)}`)
        : await fetchJson(API_MEDICINES);

    medicineSelect.innerHTML = `
        <option value="">-- Chọn thuốc --</option>
        ${medicines.map(m => `<option value="${m.MaThuoc}">${escapeHtml(m.TenThuoc)}</option>`).join("")}
    `;
    unitSelect.innerHTML = "";
    units = [];
    calcRealQty();
}

async function loadUnits(MaThuoc) {
    if (!MaThuoc) {
        unitSelect.innerHTML = "";
        units = [];
        return;
    }

    try {
        const response = await fetch(`${API_QD}?MaThuoc=${encodeURIComponent(MaThuoc)}`);
        if (!response.ok) {
            unitSelect.innerHTML = `<option value="1" data-name="">Đơn vị cơ bản</option>`;
            units = [];
            return;
        }

        units = await response.json();
        unitSelect.innerHTML = units.length
            ? units.map(u => `<option value="${u.SoLuong}" data-name="${escapeHtml(u.TenDonVi)}">${escapeHtml(u.TenDonVi)}</option>`).join("")
            : `<option value="1" data-name="">Đơn vị cơ bản</option>`;
    } catch (error) {
        console.error(error);
        unitSelect.innerHTML = `<option value="1" data-name="">Đơn vị cơ bản</option>`;
    }
}

function calcRealQty() {
    const factor = Number(unitSelect.value || 0);
    const qty = Number(quantity.value || 0);
    realQty.value = factor * qty || "";
}

function parseMoneyInput(value) {
    return Number(String(value || "").replace(/[^\d]/g, ""));
}

function isPricedImport() {
    return loaiPhieu.value === "NhapMua" || loaiPhieu.value === "NhapVienTro";
}

function isPriceRequired() {
    return loaiPhieu.value === "NhapMua";
}

function clearDraftInputs({ clearPrice = true } = {}) {
    supplierSelect.value = "";
    if (sourceSelect) sourceSelect.value = "";
    sourceInput.value = "";
    if (otherSourceInput) otherSourceInput.value = "";
    reasonInput.value = "";
    relatedInput.value = "";
    if (clearPrice) price.value = "";
    quantity.value = "";
    realQty.value = "";
    soLo.value = "";
    nsx.value = "";
    hsd.value = "";
}

function clearMedicineInputs() {
    medicineSelect.value = "";
    unitSelect.innerHTML = "";
    units = [];
    quantity.value = "";
    realQty.value = "";
    price.value = "";
    soLo.value = "";
    nsx.value = "";
    hsd.value = "";
}

function clearCart() {
    cart = [];
    renderCart();
}

function toggleOtherSource() {
    const showOther = loaiPhieu.value === "NhapTra" && sourceSelect?.value === "Khac";
    otherSourceGroup?.classList.toggle("d-none", !showOther);
    if (!showOther && otherSourceInput) otherSourceInput.value = "";
}

function updateImportTypeUI({ reset = true } = {}) {
    const type = loaiPhieu.value || "NhapMua";
    const changedType = currentImportType !== type;
    currentImportType = type;

    if (reset && changedType) {
        clearDraftInputs({ clearPrice: true });
        clearCart();
    }

    renderSupplierOptions();
    supplierSelect.classList.remove("d-none");
    sourceSelect?.classList.add("d-none");
    sourceInput.classList.add("d-none");
    otherSourceGroup?.classList.add("d-none");
    reasonGroup.classList.add("d-none");
    relatedGroup.classList.add("d-none");
    priceGroup.classList.remove("d-none");
    price.disabled = false;
    totalBox.classList.remove("d-none");

    supplierLabel.textContent = "Nhà cung cấp";
    khoLabel.textContent = "Kho";
    reasonLabel.textContent = "Lý do";
    priceLabel.textContent = "Giá nhập";
    totalLabel.textContent = "Tổng tiền:";
    priceHeader.textContent = "Giá đơn vị cơ bản";
    amountHeader.textContent = "Thành tiền";
    sourceInput.placeholder = "Nhập nguồn/lý do";

    if (type === "NhapTra") {
        supplierLabel.textContent = "Nguồn trả";
        supplierSelect.classList.add("d-none");
        sourceSelect?.classList.remove("d-none");
        khoLabel.textContent = "Kho nhận lại";
        reasonGroup.classList.remove("d-none");
        reasonGroup.classList.remove("col-md-3");
        reasonGroup.classList.add("col-12");
        reasonLabel.textContent = "Lý do trả";
        reasonInput.placeholder = "Nhập lý do trả";
        priceGroup.classList.add("d-none");
        price.disabled = true;
        price.value = "";
        totalBox.classList.add("d-none");
    } else if (type === "NhapKiemKe") {
        supplierLabel.textContent = "Lý do kiểm kê";
        supplierSelect.classList.add("d-none");
        sourceInput.classList.remove("d-none");
        sourceInput.placeholder = "Nhập lý do kiểm kê";
        khoLabel.textContent = "Kho kiểm kê";
        priceGroup.classList.add("d-none");
        price.disabled = true;
        price.value = "";
        totalBox.classList.add("d-none");
    } else if (type === "NhapVienTro") {
        supplierLabel.textContent = "Đơn vị tài trợ";
        khoLabel.textContent = "Kho nhận";
        priceLabel.textContent = "Giá trị ghi nhận";
        totalLabel.textContent = "Tổng giá trị ghi nhận:";
        priceHeader.textContent = "Giá trị đơn vị cơ bản";
    }

    if (type !== "NhapTra") {
        reasonGroup.classList.remove("col-12");
        reasonGroup.classList.add("col-md-3");
    }

    toggleOtherSource();
    document.querySelectorAll(".price-col").forEach(col => {
        col.classList.toggle("d-none", !isPricedImport());
    });

    renderCart();
    loadMedicinesForCurrentType().catch(error => alert(error.message));
}

function addToCart() {
    const MaThuoc = medicineSelect.value;
    const medicine = medicines.find(x => String(x.MaThuoc) === String(MaThuoc));
    const factor = Number(unitSelect.value || 0);
    const qty = Number(quantity.value || 0);
    const priceValue = isPricedImport() ? parseMoneyInput(price.value) : 0;
    const baseQuantity = qty * factor;
    const DonViNhap = unitSelect.options[unitSelect.selectedIndex]?.dataset.name || "";
    const lotCode = soLo.value.trim();

    if (!MaThuoc || !medicine) {
        alert("Vui lòng chọn thuốc");
        return;
    }
    if (!qty || qty <= 0 || !factor || factor <= 0) {
        alert("Số lượng nhập/quy đổi không hợp lệ");
        return;
    }
    if (isPriceRequired() && (!priceValue || priceValue <= 0)) {
        alert("Nhập mua bắt buộc giá nhập lớn hơn 0");
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
        SoLuong: baseQuantity,
        GiaNhap: baseQuantity > 0 ? priceValue / baseQuantity : 0,
        GiaNhapDonViNhap: priceValue,
        ThanhTien: isPricedImport() ? baseQuantity * (baseQuantity > 0 ? priceValue / baseQuantity : 0) : 0,
        SoLo: lotCode,
        HanSuDung: hsd.value,
        NgaySanXuat: nsx.value
    });

    renderCart();
    clearMedicineInputs();
}

function renderCart() {
    cartTable.innerHTML = cart.map((item, idx) => `
        <tr>
            <td>${escapeHtml(item.TenThuoc)}</td>
            <td>${escapeHtml(item.DonViNhap)}</td>
            <td>${item.SoLuongNhap}</td>
            <td>${item.SoLuong}</td>
            ${isPricedImport() ? `<td>${formatMoney(item.GiaNhap)}</td><td>${formatMoney(item.ThanhTien)}</td>` : ""}
            <td>${escapeHtml(item.SoLo)}</td>
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
    const total = isPricedImport() ? cart.reduce((sum, item) => sum + item.ThanhTien, 0) : 0;
    totalMoney.innerText = formatMoney(total);
}

function getSelectedSupplierName() {
    return supplierSelect.value
        ? supplierSelect.options[supplierSelect.selectedIndex]?.textContent.trim()
        : "";
}

function getReturnSourceText() {
    if (!sourceSelect?.value) return "";
    if (sourceSelect.value === "Khac") return otherSourceInput.value.trim();
    return RETURN_SOURCE_LABELS[sourceSelect.value] || "";
}

async function submitImport() {
    const type = loaiPhieu.value || "NhapMua";

    if (cart.length === 0) {
        alert("Chưa có thuốc");
        return;
    }
    if (!khoSelect.value) {
        alert("Vui lòng chọn kho nhập");
        return;
    }
    if (type === "NhapMua" && !supplierSelect.value) {
        alert("Nhập mua bắt buộc chọn nhà cung cấp");
        return;
    }
    if (type === "NhapTra") {
        if (!sourceSelect.value) {
            alert("Vui lòng chọn nguồn trả");
            return;
        }
        if (sourceSelect.value === "Khac" && !otherSourceInput.value.trim()) {
            alert("Vui lòng ghi rõ nguồn trả");
            return;
        }
        if (!reasonInput.value.trim()) {
            alert("Vui lòng nhập lý do trả");
            return;
        }
    }
    if (type === "NhapKiemKe" && !sourceInput.value.trim()) {
        alert("Nhập kiểm kê cần có lý do kiểm kê");
        return;
    }

    const user = getCurrentUser();
    if (!user?.MaNV) {
        alert("Chưa đăng nhập hoặc thiếu mã nhân viên");
        return;
    }

    const payload = {
        MaNCC: supplierSelect.value || null,
        MaKho: khoSelect.value,
        LoaiPhieu: type,
        NguonNhap: type === "NhapVienTro" ? getSelectedSupplierName() : "",
        NguonTra: type === "NhapTra" ? sourceSelect.value : "",
        NguonTraText: type === "NhapTra" ? getReturnSourceText() : "",
        NguonTraKhac: type === "NhapTra" && sourceSelect.value === "Khac" ? otherSourceInput.value.trim() : "",
        LyDoTra: type === "NhapTra" ? reasonInput.value.trim() : "",
        LyDoKiemKe: type === "NhapKiemKe" ? sourceInput.value.trim() : "",
        LyDo: type === "NhapTra" ? reasonInput.value.trim() : (type === "NhapKiemKe" ? sourceInput.value.trim() : ""),
        PhieuLienQuan: relatedInput.value.trim(),
        details: cart
    };

    try {
        await fetchJson(API_IMPORT, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        alert("Thành công");
        clearDraftInputs();
        clearCart();
        await loadImports();
    } catch (error) {
        alert(error.message || "Không thể tạo phiếu nhập");
    }
}

function getSourceText(p) {
    if (p.TenNCC) return p.TenNCC;
    const note = String(p.GhiChu || "");
    const match = note.match(/^(Nguồn trả|Lý do kiểm kê|Đơn vị tài trợ):\s*(.+)$/m);
    return match?.[2] || "";
}

function getKhoText(p) {
    return p.TenKho || khoById.get(String(p.MaKho)) || (p.MaKho ? `Kho #${p.MaKho}` : "");
}

function getStaffText(p) {
    return p.TenNhanVien || p.HoTenNhanVien || p.HoTen || (p.MaNhanVien ? `NV #${p.MaNhanVien}` : "");
}

async function loadImports() {
    const data = await fetchJson(API_IMPORT);
    importList.innerHTML = data.map(p => `
        <tr>
            <td>${p.MaPN}</td>
            <td>${escapeHtml(getSourceText(p))}</td>
            <td>${escapeHtml(getKhoText(p))}</td>
            <td>${IMPORT_TYPE_LABELS[p.LoaiPhieu] || p.LoaiPhieu || ""}</td>
            <td>${formatMoney(p.TongTien)}</td>
            <td>${escapeHtml(getStaffText(p))}</td>
            <td>${escapeHtml(p.TrangThai || "HoanThanh")}</td>
            <td>${p.NgayNhap ? new Date(p.NgayNhap).toLocaleDateString("vi-VN") : ""}</td>
            <td><a class="btn btn-sm btn-outline-primary import-view-btn" href="import_detail.html?id=${p.MaPN}">Xem</a></td>
        </tr>
    `).join("");
}

Object.assign(window, {
    addToCart,
    removeItem,
    submitImport,
    updateImportTypeUI
});
