const API = "http://localhost:3000/api/dispense";
const API_PATIENT = "http://localhost:3000/api/patients/search";
const API_KHO = "http://localhost:3000/api/kho";

const state = {
    bootstrap: null,
    catalog: [],
    items: [],
    currentDraftId: null,
    selectedMedicineId: null,
    selectedMedicine: null,
    selectedRowIndex: -1,
    patient: null,
    patientSearchResults: [],
    prescriptionModal: null
};

function $(id) {
    return document.getElementById(id);
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN");
}

function formatDateTimeInput(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Không thể xử lý yêu cầu");
    }
    return data;
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function setStepper(step) {
    [1, 2, 3].forEach((index) => {
        const element = $(`step${index}`);
        element.classList.remove("active", "done");
        if (index < step) element.classList.add("done");
        if (index === step) element.classList.add("active");
    });
}

function updateStats() {
    const stats = state.bootstrap?.stats || {};
    const projected = state.items.reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0);
    const warningCount = state.items.reduce((sum, item) => sum + (item.warnings?.length || 0), 0);

    $("statStock").textContent = Number(stats.TongTon || 0).toLocaleString("vi-VN");
    $("statStockValue").textContent = formatMoney(stats.GiaTriTon || 0);
    $("statProjected").textContent = formatMoney(projected);
    $("statWarning").textContent = Number(stats.LoCanDate || 0) + Number(stats.LoHetHang || 0) + warningCount;
    $("statWarningNote").textContent = `${Number(stats.LoCanDate || 0)} lô cận date, ${Number(stats.LoHetHang || 0)} lô hết hàng`;
    $("footerTotal").textContent = formatMoney(projected);

    setStepper(state.currentDraftId ? 2 : 1);
}

function updateRecipientInfo() {
    const loai = $("loaiXuat").value;
    let html = "Chưa chọn bệnh nhân / khoa / NCC";

    if (loai === "BanChoBN") {
        html = state.patient
            ? `<strong>${escapeHtml(state.patient.HoTen)}</strong><div class="section-note">Mã BN: ${escapeHtml(state.patient.MaBN)}</div>`
            : "Chưa chọn bệnh nhân";
    }
    if (loai === "NoiBo") {
        const option = $("departmentSelect").selectedOptions[0];
        html = option?.value ? `<strong>${escapeHtml(option.textContent)}</strong><div class="section-note">Xuất cấp phát nội bộ</div>` : "Chưa chọn khoa";
    }
    if (loai === "TraNCC") {
        const option = $("supplierSelect").selectedOptions[0];
        html = option?.value ? `<strong>${escapeHtml(option.textContent)}</strong><div class="section-note">Trả lại nhà cung cấp</div>` : "Chưa chọn NCC";
    }
    if (loai === "Huy") {
        html = $("reasonInput").value.trim() || "Chưa nhập lý do hủy";
    }

    $("recipientInfo").innerHTML = html;
}

function toggleDynamicFields() {
    const loai = $("loaiXuat").value;
    $("patientField").classList.toggle("hidden-dynamic", loai !== "BanChoBN");
    $("departmentField").classList.toggle("hidden-dynamic", loai !== "NoiBo");
    $("supplierField").classList.toggle("hidden-dynamic", loai !== "TraNCC");
    $("reasonField").classList.toggle("hidden-dynamic", loai !== "Huy");
    updateRecipientInfo();
}

function buildWarningBadges(warnings = []) {
    if (!warnings.length) return '<span class="badge-soft badge-neutral">Ổn</span>';
    return warnings.map((warning) => {
        const css = warning.level === "danger"
            ? "badge-danger"
            : warning.level === "warning"
                ? "badge-warning"
                : "badge-fefo";
        return `<span class="badge-soft ${css}">${escapeHtml(warning.message)}</span>`;
    }).join("");
}

function renderCatalog() {
    const container = $("catalogList");
    if (!state.catalog.length) {
        container.innerHTML = '<div class="empty-box">Không có thuốc phù hợp bộ lọc</div>';
        return;
    }

    container.innerHTML = state.catalog.map((item) => `
        <div class="catalog-item ${state.selectedMedicineId == item.MaThuoc ? "active" : ""}" onclick="selectMedicine(${item.MaThuoc})">
            <div class="d-flex justify-content-between gap-3">
                <div>
                    <div class="catalog-name">${escapeHtml(item.TenThuoc)}</div>
                    <div class="catalog-meta">${escapeHtml(item.HoatChat || "")} | ${escapeHtml(item.DangBaoChe || "")} | ${escapeHtml(item.DonViCoBan || "")}</div>
                </div>
                <div class="text-end">
                    <div class="badge-soft badge-fefo">Tồn ${Number(item.TongTon || 0).toLocaleString("vi-VN")}</div>
                    <div class="catalog-meta mt-1">FEFO: ${formatDate(item.HanGanNhat)}</div>
                </div>
            </div>
        </div>
    `).join("");
}

function renderQuickPrescriptionLists() {
    const prescriptions = state.bootstrap?.pendingPrescriptions || [];
    const content = prescriptions.length
        ? prescriptions.map((item) => `
            <div class="aside-item">
                <strong>Đơn #${item.MaDT}</strong>
                <div class="section-note">${escapeHtml(item.HoTen)} | ${formatDate(item.NgayKeDon)}</div>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadPrescription(${item.MaDT})">Nạp vào phiếu</button>
            </div>
        `).join("")
        : '<div class="empty-box">Không còn đơn thuốc chờ xuất</div>';

    $("quickPrescriptionList").innerHTML = content;
    $("prescriptionModalList").innerHTML = content;
}

function renderItems() {
    const tbody = document.querySelector("#dispenseTable tbody");
    if (!state.items.length) {
        tbody.innerHTML = '<tr><td colspan="12"><div class="empty-box m-3">Chưa có thuốc trong phiếu xuất</div></td></tr>';
        updateStats();
        return;
    }

    tbody.innerHTML = state.items.map((item, index) => {
        const lotMarkup = item.allocations?.map((allocation) => `
            <span class="lot-pill">${escapeHtml(allocation.SoLo)} · ${allocation.SoLuongXuat}</span>
        `).join("") || "";

        return `
            <tr class="clickable-row ${state.selectedRowIndex === index ? "table-active" : ""}" onclick="selectRow(${index})">
                <td><strong>${escapeHtml(item.TenThuoc)}</strong><div class="section-note">${escapeHtml(item.LieuDung || "")}</div></td>
                <td>${escapeHtml(item.HoatChat || "")}</td>
                <td>${lotMarkup}</td>
                <td>${formatDate(item.HanSuDung)}</td>
                <td>${formatDate(item.NgaySanXuat)}</td>
                <td>${Number(item.Ton || 0).toLocaleString("vi-VN")}</td>
                <td><input type="number" class="form-control" min="1" value="${Number(item.SoLuong || 0)}" onclick="event.stopPropagation()" onchange="updateItemQuantity(${index}, this.value)"></td>
                <td>${escapeHtml(item.DonVi || "")}</td>
                <td>${formatMoney(item.DonGia || 0)}</td>
                <td>${formatMoney(item.ThanhTien || 0)}</td>
                <td><div class="warning-stack">${buildWarningBadges(item.warnings || [])}</div></td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); removeItem(${index})">Xóa</button></td>
            </tr>
        `;
    }).join("");

    updateStats();
}

function renderEquivalentList(items = []) {
    $("equivalentList").innerHTML = items.length
        ? items.map((item) => `
            <div class="aside-item">
                <strong>${escapeHtml(item.TenThuoc)}</strong>
                <div class="section-note">${escapeHtml(item.HamLuong || "")} | ${escapeHtml(item.DangBaoChe || "")}</div>
                <div class="badge-soft badge-fefo mt-2">Tồn ${Number(item.TongTon || 0).toLocaleString("vi-VN")}</div>
            </div>
        `).join("")
        : '<div class="empty-box">Chọn một dòng thuốc để xem gợi ý</div>';
}

function renderHistoryList(items = []) {
    $("historyList").innerHTML = items.length
        ? items.map((item) => `
            <div class="aside-item">
                <strong>PX-${item.MaPX}</strong>
                <div class="section-note">${escapeHtml(item.TenThuoc)} · Lô ${escapeHtml(item.SoLo)}</div>
                <div class="section-note">${formatDate(item.NgayXuat)} · ${Number(item.SoLuong || 0)} đơn vị</div>
            </div>
        `).join("")
        : '<div class="empty-box">Chưa có lịch sử phù hợp</div>';
}

async function loadBootstrap() {
    const maKho = $("khoSelect").value;
    const query = maKho ? `?MaKho=${maKho}` : "";
    state.bootstrap = await fetchJson(`${API}/bootstrap${query}`);

    const currentKho = $("khoSelect").value;
    $("khoSelect").innerHTML = (state.bootstrap.warehouses || []).map((item) => `<option value="${item.MaKho}">${escapeHtml(item.TenKho)}</option>`).join("");
    if (currentKho) $("khoSelect").value = currentKho;

    $("supplierSelect").innerHTML = '<option value="">Chọn NCC</option>' + (state.bootstrap.suppliers || []).map((item) => `<option value="${item.MaNCC}">${escapeHtml(item.TenNCC)}</option>`).join("");
    $("departmentSelect").innerHTML = '<option value="">Chọn khoa</option>' + (state.bootstrap.departments || []).map((item) => `<option value="${item.MaChuyenKhoa}">${escapeHtml(item.TenChuyenKhoa)}</option>`).join("");

    renderQuickPrescriptionLists();
    updateStats();
}

function buildCatalogUrl() {
    const params = new URLSearchParams();
    const search = $("barcodeInput").value.trim() || $("searchInput").value.trim();
    if (search) params.set("search", search);
    if ($("khoSelect").value) params.set("MaKho", $("khoSelect").value);
    if ($("groupFilter").value) params.set("LoaiThuoc", $("groupFilter").value);
    if ($("dosageFilter").value) params.set("DangBaoChe", $("dosageFilter").value);
    if ($("temperatureFilter").value) params.set("NhietDoBaoQuan", $("temperatureFilter").value);
    return `${API}/catalog?${params.toString()}`;
}

function hydrateFilterOptions(catalog) {
    const dosageSet = [...new Set(catalog.map((item) => item.DangBaoChe).filter(Boolean))];
    const temperatureSet = [...new Set(catalog.map((item) => item.NhietDoBaoQuan).filter(Boolean))];
    const currentDosage = $("dosageFilter").value;
    const currentTemperature = $("temperatureFilter").value;

    $("dosageFilter").innerHTML = '<option value="">Dạng bào chế</option>' + dosageSet.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    $("temperatureFilter").innerHTML = '<option value="">Nhiệt độ bảo quản</option>' + temperatureSet.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");

    if (currentDosage) $("dosageFilter").value = currentDosage;
    if (currentTemperature) $("temperatureFilter").value = currentTemperature;
}

async function loadCatalog() {
    state.catalog = await fetchJson(buildCatalogUrl());
    hydrateFilterOptions(state.catalog);
    renderCatalog();
}

async function selectMedicine(maThuoc) {
    state.selectedMedicineId = maThuoc;
    state.selectedMedicine = state.catalog.find((item) => item.MaThuoc == maThuoc) || null;
    renderCatalog();
    await loadSidePanels(maThuoc);
}

async function addSelectedMedicine() {
    if (!state.selectedMedicineId) {
        alert("Chọn thuốc từ danh sách trước");
        return;
    }

    const qty = Number($("quickQty").value || 0);
    if (qty <= 0) {
        alert("Số lượng phải lớn hơn 0");
        return;
    }

    const preview = await fetchJson(`${API}/catalog/${state.selectedMedicineId}/preview?MaKho=${$("khoSelect").value}&SoLuong=${qty}`);
    const existingIndex = state.items.findIndex((item) => item.MaThuoc == preview.MaThuoc);

    if (existingIndex >= 0) {
        preview.LieuDung = state.items[existingIndex].LieuDung || "";
        state.items[existingIndex] = preview;
        state.selectedRowIndex = existingIndex;
    } else {
        state.items.push(preview);
        state.selectedRowIndex = state.items.length - 1;
    }

    renderItems();
}

async function updateItemQuantity(index, value) {
    const qty = Number(value || 0);
    if (qty <= 0) {
        alert("Số lượng phải lớn hơn 0");
        renderItems();
        return;
    }

    const current = state.items[index];
    const preview = await fetchJson(`${API}/catalog/${current.MaThuoc}/preview?MaKho=${$("khoSelect").value}&SoLuong=${qty}`);
    preview.LieuDung = current.LieuDung || "";
    state.items[index] = preview;
    state.selectedRowIndex = index;
    renderItems();
    await loadSidePanels(current.MaThuoc);
}

function removeItem(index) {
    state.items.splice(index, 1);
    if (state.selectedRowIndex === index) state.selectedRowIndex = -1;
    renderItems();
    renderEquivalentList([]);
    renderHistoryList([]);
}

async function selectRow(index) {
    state.selectedRowIndex = index;
    renderItems();
    await loadSidePanels(state.items[index].MaThuoc);
}

async function loadSidePanels(maThuoc) {
    const maKho = $("khoSelect").value;
    const [equivalents, history] = await Promise.all([
        fetchJson(`${API}/suggestions/${maThuoc}?MaKho=${maKho}`).catch(() => []),
        fetchJson(`${API}/history?MaThuoc=${maThuoc}&limit=6`).catch(() => [])
    ]);
    renderEquivalentList(equivalents);
    renderHistoryList(history);
}

async function searchPatient() {
    const keyword = $("patientKeyword").value.trim();
    if (!keyword) {
        $("patientResult").innerHTML = "";
        state.patientSearchResults = [];
        return;
    }

    const data = await fetchJson(`${API_PATIENT}?tenBN=${encodeURIComponent(keyword)}`);
    state.patientSearchResults = data;
    $("patientResult").innerHTML = data.length
        ? data.map((item, index) => `
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2" onclick="selectPatientByIndex(${index})">${escapeHtml(item.HoTen)} - ${escapeHtml(item.SoDienThoai || "")}</button>
        `).join("")
        : '<div class="section-note">Không tìm thấy bệnh nhân phù hợp</div>';
}

function selectPatient(patient) {
    state.patient = patient;
    $("maBN").value = patient.MaBN;
    $("patientKeyword").value = patient.HoTen;
    $("patientResult").innerHTML = `<div class="badge-soft badge-fefo">${escapeHtml(patient.HoTen)} | Mã BN: ${patient.MaBN}</div>`;
    updateRecipientInfo();
}

function selectPatientByIndex(index) {
    const patient = state.patientSearchResults[index];
    if (patient) {
        selectPatient(patient);
    }
}

async function loadPrescription(maDT) {
    const data = await fetchJson(`${API}/prescriptions/${maDT}?MaKho=${$("khoSelect").value}`);
    $("loaiXuat").value = "BanChoBN";
    toggleDynamicFields();
    $("maDT").value = data.header.MaDT;
    selectPatient({ MaBN: data.header.MaBN, HoTen: data.header.HoTen });
    state.items = data.items;
    state.selectedRowIndex = data.items.length ? 0 : -1;
    renderItems();
    if (data.items.length) {
        await loadSidePanels(data.items[0].MaThuoc);
    }
    state.prescriptionModal.hide();
}

function collectPayload() {
    const user = getUser();
    if (!user?.MaNV) throw new Error("Không tìm thấy nhân viên đăng nhập");
    if (!state.items.length) throw new Error("Phiếu xuất chưa có thuốc");

    return {
        MaPX: state.currentDraftId,
        MaNhanVien: user.MaNV,
        MaKho: $("khoSelect").value,
        LoaiXuat: $("loaiXuat").value,
        MaBN: $("maBN").value || null,
        MaDT: $("maDT").value || null,
        MaKhoa: $("departmentSelect").value || null,
        TenKhoa: $("departmentSelect").selectedOptions[0]?.textContent || "",
        MaNCC: $("supplierSelect").value || null,
        TenNCC: $("supplierSelect").selectedOptions[0]?.textContent || "",
        LyDo: $("reasonInput").value.trim(),
        NgayXuat: $("ngayXuat").value,
        GhiChu: $("ghiChu").value.trim(),
        items: state.items.map((item) => ({
            MaThuoc: item.MaThuoc,
            TenThuoc: item.TenThuoc,
            HoatChat: item.HoatChat,
            SoLuong: item.SoLuong,
            DonGia: item.DonGia,
            DonVi: item.DonVi,
            LieuDung: item.LieuDung
        }))
    };
}

async function saveDraft() {
    const payload = collectPayload();
    const data = await fetchJson(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    state.currentDraftId = data.MaPX;
    state.items = data.items;
    $("draftCode").textContent = data.SoPhieu;
    renderItems();
    alert("Đã lưu phiếu tạm");
}

async function completeDraft() {
    if (!state.currentDraftId) {
        await saveDraft();
    }

    const data = await fetchJson(`${API}/${state.currentDraftId}/complete`, { method: "POST" });
    setStepper(3);
    alert(data.message || "Hoàn thành phiếu xuất");
    resetForm();
    await loadBootstrap();
    await loadCatalog();
}

function resetForm() {
    state.items = [];
    state.currentDraftId = null;
    state.selectedMedicineId = null;
    state.selectedMedicine = null;
    state.selectedRowIndex = -1;
    state.patient = null;
    state.patientSearchResults = [];

    $("draftCode").textContent = "PX-TẠM";
    $("maDT").value = "";
    $("maBN").value = "";
    $("ghiChu").value = "";
    $("reasonInput").value = "";
    $("patientKeyword").value = "";
    $("patientResult").innerHTML = "";
    $("quickQty").value = 1;
    setStepper(1);
    renderItems();
    renderEquivalentList([]);
    renderHistoryList([]);
    updateRecipientInfo();
}

function bindEvents() {
    $("ngayXuat").value = formatDateTimeInput();
    $("loaiXuat").addEventListener("change", toggleDynamicFields);
    $("departmentSelect").addEventListener("change", updateRecipientInfo);
    $("supplierSelect").addEventListener("change", updateRecipientInfo);
    $("reasonInput").addEventListener("input", updateRecipientInfo);
    $("khoSelect").addEventListener("change", async () => {
        await loadBootstrap();
        await loadCatalog();
        if (state.items.length) {
            const refreshed = [];
            for (const item of state.items) {
                const preview = await fetchJson(`${API}/catalog/${item.MaThuoc}/preview?MaKho=${$("khoSelect").value}&SoLuong=${item.SoLuong}`);
                preview.LieuDung = item.LieuDung || "";
                refreshed.push(preview);
            }
            state.items = refreshed;
            renderItems();
        }
    });

    $("applySearchBtn").addEventListener("click", loadCatalog);
    $("reloadCatalogBtn").addEventListener("click", loadCatalog);
    $("addSelectedMedicineBtn").addEventListener("click", async () => {
        try {
            await addSelectedMedicine();
        } catch (error) {
            alert(error.message);
        }
    });
    $("searchPatientBtn").addEventListener("click", async () => {
        try {
            await searchPatient();
        } catch (error) {
            alert(error.message);
        }
    });
    $("openPrescriptionModal").addEventListener("click", () => state.prescriptionModal.show());
    $("saveDraftBtn").addEventListener("click", async () => {
        try {
            await saveDraft();
        } catch (error) {
            alert(error.message);
        }
    });
    $("completeBtn").addEventListener("click", async () => {
        try {
            await completeDraft();
        } catch (error) {
            alert(error.message);
        }
    });
    $("printBtn").addEventListener("click", () => window.print());
    $("cancelBtn").addEventListener("click", resetForm);
    $("openLotModal").addEventListener("click", openLotModal);
    $("searchInput").addEventListener("input", debounceSearch);
}

let debounceTimer;

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadCatalog, 300);
}

state.selectedLot = null;
async function openLotModal() {
    if (!state.selectedMedicineId) {
        alert("Chọn thuốc trước");
        return;
    }

    const data = await fetchJson(
        `${API}/lots/${state.selectedMedicineId}?MaKho=${$("khoSelect").value}`
    );

    // sort FEFO (hạn gần nhất lên trước)
    data.sort((a, b) => new Date(a.HanSuDung) - new Date(b.HanSuDung));

    const html = data.map((lot, i) => `
        <div class="border p-2 mb-2 clickable-row"
            onclick="selectLot(${i})">
            Lô: ${lot.SoLo} | HSD: ${formatDate(lot.HanSuDung)} | Tồn: ${lot.Ton}
        </div>
    `).join("");

    $("prescriptionModalList").innerHTML = html;
    state.lotList = data;
    state.prescriptionModal.show();
}

function selectLot(index) {
    state.selectedLot = state.lotList[index];
    alert(`Đã chọn lô ${state.selectedLot.SoLo}`);
    state.prescriptionModal.hide();

    loadUnits();
}
function loadUnits() {
    const units = state.selectedMedicine.DonViList || ["Viên"];

    $("unitSelect").innerHTML = units.map(u =>
        `<option value="${u}">${u}</option>`
    ).join("");
}

$("quantity").addEventListener("input", () => {
    const qty = Number($("quantity").value || 0);
    $("realQty").value = qty; // đơn giản trước
});

$("addMedicineBtn").addEventListener("click", addMedicineManual);

function addMedicineManual() {
    if (!state.selectedMedicine || !state.selectedLot) {
        alert("Chưa chọn thuốc hoặc lô");
        return;
    }

    const qty = Number($("quantity").value || 0);
    if (qty <= 0) {
        alert("Số lượng không hợp lệ");
        return;
    }

    const item = {
        MaThuoc: state.selectedMedicine.MaThuoc,
        TenThuoc: state.selectedMedicine.TenThuoc,
        DonVi: $("unitSelect").value,
        SoLuong: qty,
        DonGia: state.selectedLot.DonGia || 0,
        ThanhTien: qty * (state.selectedLot.DonGia || 0),
        allocations: [{
            SoLo: state.selectedLot.SoLo,
            SoLuongXuat: qty
        }],
        HanSuDung: state.selectedLot.HanSuDung,
        NgaySanXuat: state.selectedLot.NgaySanXuat,
        Ton: state.selectedLot.Ton
    };

    state.items.push(item);
    renderItems();
}

async function loadKho() {
    const res = await fetch(API_KHO);
    const data = await res.json();

    khoSelect.innerHTML =
        data.map(k => `<option value="${k.MaKho}">${k.TenKho}</option>`).join("");
}



async function init() {
    state.prescriptionModal = new bootstrap.Modal($("prescriptionModal"));
    bindEvents();
    await loadBootstrap();
    await loadCatalog();
    await loadKho(); 
    toggleDynamicFields();
    renderItems();
    renderEquivalentList([]);
    renderHistoryList([]);
}



window.selectMedicine = selectMedicine;
window.loadPrescription = loadPrescription;
window.selectRow = selectRow;
window.updateItemQuantity = updateItemQuantity;
window.removeItem = removeItem;
window.selectPatientByIndex = selectPatientByIndex;

document.addEventListener("DOMContentLoaded", init);