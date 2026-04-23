const API_INVOICES = "http://localhost:3000/api/invoices";

const state = {
    invoices: [],
    filteredInvoices: [],
    currentPage: 1,
    pageSize: 6,
    invoiceModal: null,
    invoiceDetailModal: null,
    currentDetailId: null
};

function $(id) {
    return document.getElementById(id);
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

function normalizeStatus(status, invoice = {}) {
    if (status === "DaThanhToan") {
        return {
            key: "DaThanhToan",
            text: "Đã thanh toán",
            className: "status-paid"
        };
    }

    if (status === "ThanhToanMotPhan") {
        return {
            key: "ThanhToanMotPhan",
            text: "Thanh toán một phần",
            className: "status-partial"
        };
    }

    if (status === "DaHuy" || status === "Huy") {
        return {
            key: "DaHuy",
            text: "Đã hủy",
            className: "status-cancelled"
        };
    }

    const hanThanhToan = invoice.HanThanhToan ? new Date(invoice.HanThanhToan) : null;
    const now = new Date();

    if (
        status === "ChuaThanhToan" &&
        hanThanhToan &&
        !Number.isNaN(hanThanhToan.getTime()) &&
        hanThanhToan < now
    ) {
        return {
            key: "QuaHan",
            text: "Quá hạn",
            className: "status-overdue"
        };
    }

    return {
        key: "ChuaThanhToan",
        text: "Chờ thanh toán",
        className: "status-pending"
    };
}

function getInvoiceDateValue(invoice) {
    const rawValue = invoice.NgayTao || invoice.NgayThanhToan || invoice.HanThanhToan;
    if (!rawValue) return "";

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || "Lỗi API");
    }

    return data;
}

function getPatientName(invoice) {
    return invoice.HoTen || invoice.TenBenhNhan || "Chưa có bệnh nhân";
}

function getPatientCode(invoice) {
    return invoice.MaBN ? `BN-${invoice.MaBN}` : (invoice.SoDienThoai || "");
}

function getInvoiceTotal(invoice) {
    return Number(invoice.TongTien || invoice.TongSoTien || 0);
}

function getDiscountAmount(invoice) {
    return Number(invoice.TongGiamGia || invoice.GiamGiaHoaDon || invoice.GiamGia || invoice.KhuyenMai || 0);
}

function getInsuranceAmount(invoice) {
    return Number(invoice.BHYTChiTra || 0);
}

function getDepositAmount(invoice) {
    return Number(invoice.TamUng || 0);
}

function getExtraAmount(invoice) {
    return Number(invoice.PhuThu || 0);
}

function getFinalAmount(invoice) {
    if (invoice.ThanhTienCuoi != null) return Number(invoice.ThanhTienCuoi);
    if (invoice.ThucThu != null) return Number(invoice.ThucThu);

    return Number(
        getInvoiceTotal(invoice)
        - getDiscountAmount(invoice)
        - getInsuranceAmount(invoice)
        - getDepositAmount(invoice)
        + getExtraAmount(invoice)
    );
}

function renderSummary() {
    const invoices = state.filteredInvoices.length ? state.filteredInvoices : state.invoices;
    const selectedDoctor = $("doctorFilter")?.value || "";

    const totalRevenue = invoices.reduce((sum, item) => sum + getInvoiceTotal(item), 0);
    const pendingInvoices = invoices.filter(item => normalizeStatus(item.TrangThai, item).key === "ChuaThanhToan");
    const paidInvoices = invoices.filter(item => normalizeStatus(item.TrangThai, item).key === "DaThanhToan");
    const overdueInvoices = invoices.filter(item => normalizeStatus(item.TrangThai, item).key === "QuaHan");

    const pendingAmount = pendingInvoices.reduce((sum, item) => sum + getFinalAmount(item), 0);
    const overdueAmount = overdueInvoices.reduce((sum, item) => sum + getFinalAmount(item), 0);

    if ($("totalRevenue")) $("totalRevenue").textContent = formatMoney(totalRevenue);
    if ($("pendingAmount")) $("pendingAmount").textContent = formatMoney(pendingAmount);
    if ($("paidInvoices")) $("paidInvoices").textContent = paidInvoices.length;
    if ($("overdueAmount")) $("overdueAmount").textContent = formatMoney(overdueAmount);

    if ($("pendingInvoicesChip")) {
        $("pendingInvoicesChip").textContent = `${pendingInvoices.length} hóa đơn`;
    }

    const doctors = [...new Set(
        state.invoices
            .map(item => item.TenBacSi)
            .filter(Boolean)
    )];

    if ($("doctorFilter")) {
        $("doctorFilter").innerHTML = `<option value="">Tất cả bác sĩ</option>` +
            doctors.map(name => `<option value="${name}">${name}</option>`).join("");
        $("doctorFilter").value = doctors.includes(selectedDoctor) ? selectedDoctor : "";
    }
}

function filterInvoices() {
    const keyword = ($("tableSearchInput")?.value || $("headerSearchInput")?.value || "").trim().toLowerCase();
    const dateFilter = $("dateFilter")?.value || "";
    const statusFilter = $("statusFilter")?.value || "";
    const doctorFilter = $("doctorFilter")?.value || "";

    state.filteredInvoices = state.invoices.filter(invoice => {
        const status = normalizeStatus(invoice.TrangThai, invoice).key;

        const searchText = [
            invoice.MaHD,
            invoice.MaHoaDon,
            getPatientName(invoice),
            getPatientCode(invoice),
            invoice.SoDienThoai,
            invoice.MaBA,
            invoice.TenBacSi
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesKeyword = !keyword || searchText.includes(keyword);

        const invoiceDate = getInvoiceDateValue(invoice);
        const matchesDate = !dateFilter || invoiceDate === dateFilter;
        const matchesStatus = !statusFilter || status === statusFilter;
        const matchesDoctor = !doctorFilter || (invoice.TenBacSi || "") === doctorFilter;

        return matchesKeyword && matchesDate && matchesStatus && matchesDoctor;
    });

    state.currentPage = 1;
    renderSummary();
    renderTable();
}

function renderPager(totalPages) {
    const box = $("pagerBox");
    if (!box) return;

    box.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "pager-btn";
    prevBtn.innerHTML = `<i class="fa fa-angle-left"></i>`;
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.onclick = () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderTable();
        }
    };
    box.appendChild(prevBtn);

    for (let page = 1; page <= totalPages; page++) {
        const btn = document.createElement("button");
        btn.className = `pager-btn ${page === state.currentPage ? "active" : ""}`;
        btn.textContent = page;
        btn.onclick = () => {
            state.currentPage = page;
            renderTable();
        };
        box.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pager-btn";
    nextBtn.innerHTML = `<i class="fa fa-angle-right"></i>`;
    nextBtn.disabled = state.currentPage === totalPages || totalPages === 0;
    nextBtn.onclick = () => {
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderTable();
        }
    };
    box.appendChild(nextBtn);
}

function renderTable() {
    const tbody = $("invoiceTableBody");
    const summary = $("tableSummary");
    if (!tbody || !summary) return;

    const rows = state.filteredInvoices;
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / state.pageSize) || 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageRows = rows.slice(start, end);

    if (!pageRows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">Không có hóa đơn phù hợp</td>
            </tr>
        `;
        summary.textContent = "Không có dữ liệu";
        renderPager(1);
        return;
    }

    tbody.innerHTML = pageRows.map(invoice => {
        const status = normalizeStatus(invoice.TrangThai, invoice);
        const total = getInvoiceTotal(invoice);
        const discount = getDiscountAmount(invoice);
        const finalAmount = getFinalAmount(invoice);

        return `
            <tr>
                <td>
                    <a href="#" class="invoice-id" onclick="viewInvoiceDetail(${invoice.MaHD}); return false;">
                        ${invoice.MaHoaDon || `HD${String(invoice.MaHD).padStart(5, "0")}`}
                    </a>
                </td>
                <td>
                    <div class="patient-main">${getPatientName(invoice)}</div>
                    <div class="patient-sub">${getPatientCode(invoice) || "Chưa cập nhật mã BN"}</div>
                </td>
                <td>${formatDateTime(invoice.NgayTao)}</td>
                <td class="money-strong">${formatMoney(total)}</td>
                <td class="money-discount">${discount ? "-" + formatMoney(discount) : "0 đ"}</td>
                <td class="money-strong">${formatMoney(finalAmount)}</td>
                <td>
                    <span class="status-pill ${status.className}">
                        ${status.text}
                    </span>
                </td>
                <td>
                    <div class="action-stack">
                        <button class="action-btn" onclick="editInvoice(${invoice.MaHD})" title="Sửa thông tin hóa đơn">
                            <i class="fa fa-pen"></i>
                        </button>
                        <button class="action-btn" onclick="viewInvoiceDetail(${invoice.MaHD})" title="Chi tiết / Thanh toán">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="cancelInvoice(${invoice.MaHD})" title="Hủy hóa đơn">
                            <i class="fa fa-ban"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    summary.textContent =
        `Hiển thị ${start + 1} đến ${Math.min(end, totalRows)} trên tổng ${totalRows} hóa đơn`;

    renderPager(totalPages);
}

async function loadInvoices() {
    try {
        const data = await fetchJson(API_INVOICES);
        state.invoices = Array.isArray(data) ? data : [];
        state.filteredInvoices = [...state.invoices];
        renderSummary();
        renderTable();
    } catch (error) {
        console.error("loadInvoices error:", error);
        if ($("invoiceTableBody")) {
            $("invoiceTableBody").innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">${error.message || "Không thể tải danh sách hóa đơn"}</td>
                </tr>
            `;
        }
        if ($("tableSummary")) {
            $("tableSummary").textContent = "Lỗi tải dữ liệu";
        }
    }
}

function resetInvoiceForm() {
    $("invoiceId").value = "";
    $("invoiceMaBA").value = "";
    $("invoiceMaNhanVien").value = "";
    $("invoiceDueDate").value = "";
    $("invoicePaymentMethod").value = "TienMat";
    $("invoiceNote").value = "";
    $("invoiceTongTien").value = "";
    $("invoiceBHYTChiTra").value = "";
    $("invoiceDiscount").value = "";
    $("invoiceTamUng").value = "";
    $("invoicePhuThu").value = "";
    updateFinancialPreview();
}

function openCreateModal() {
    resetInvoiceForm();
    $("invoiceModalTitle").textContent = "Tạo hóa đơn";
    state.invoiceModal.show();
}

function updateFinancialPreview() {
    const tongTien = Number($("invoiceTongTien")?.value || 0);
    const bhyt = Number($("invoiceBHYTChiTra")?.value || 0);
    const giamGia = Number($("invoiceDiscount")?.value || 0);
    const tamUng = Number($("invoiceTamUng")?.value || 0);
    const phuThu = Number($("invoicePhuThu")?.value || 0);

    const finalAmount = Math.max(0, tongTien - bhyt - giamGia - tamUng + phuThu);

    if ($("previewTongTien")) $("previewTongTien").textContent = formatMoney(tongTien);
    if ($("previewBHYT")) $("previewBHYT").textContent = bhyt > 0 ? `- ${formatMoney(bhyt)}` : "0 đ";
    if ($("previewDiscount")) $("previewDiscount").textContent = giamGia > 0 ? `- ${formatMoney(giamGia)}` : "0 đ";
    if ($("previewTamUng")) $("previewTamUng").textContent = tamUng > 0 ? `- ${formatMoney(tamUng)}` : "0 đ";
    if ($("previewPhuThu")) $("previewPhuThu").textContent = phuThu > 0 ? formatMoney(phuThu) : "0 đ";
    if ($("previewFinalAmount")) $("previewFinalAmount").textContent = formatMoney(finalAmount);

    return finalAmount;
}

async function editInvoice(id) {
    try {
        const invoice = await fetchJson(`${API_INVOICES}/${id}`);

        $("invoiceModalTitle").textContent = "Cập nhật hóa đơn";
        $("invoiceId").value = invoice.MaHD || "";
        $("invoiceMaBA").value = invoice.MaBA || "";
        $("invoiceMaNhanVien").value = invoice.MaNhanVien || "";
        $("invoiceDueDate").value = invoice.HanThanhToan ? new Date(invoice.HanThanhToan).toISOString().slice(0, 10) : "";
        $("invoicePaymentMethod").value = invoice.PhuongThucThanhToan || "TienMat";
        $("invoiceNote").value = invoice.GhiChu || "";
        $("invoiceTongTien").value = Number(invoice.TongTien || 0);
        $("invoiceBHYTChiTra").value = Number(invoice.BHYTChiTra || 0);
        $("invoiceDiscount").value = Number(invoice.TongGiamGia || invoice.GiamGiaHoaDon || invoice.GiamGia || 0);
        $("invoiceTamUng").value = Number(invoice.TamUng || 0);
        $("invoicePhuThu").value = Number(invoice.PhuThu || 0);

        updateFinancialPreview();
        state.invoiceModal.show();
    } catch (error) {
        console.error("editInvoice error:", error);
        alert(error.message || "Không thể tải dữ liệu hóa đơn");
    }
}

async function saveInvoice(openDetailAfterSave = false) {
    const id = $("invoiceId").value.trim();

    const payload = {
        MaBA: $("invoiceMaBA").value.trim(),
        MaNhanVien: $("invoiceMaNhanVien").value.trim(),
        HanThanhToan: $("invoiceDueDate").value || null,
        PhuongThucThanhToan: $("invoicePaymentMethod").value,
        TrangThai: "ChuaThanhToan",
        GhiChu: $("invoiceNote").value.trim(),
        TongTien: Number($("invoiceTongTien").value || 0),
        BHYTChiTra: Number($("invoiceBHYTChiTra").value || 0),
        GiamGia: Number($("invoiceDiscount").value || 0),
        TamUng: Number($("invoiceTamUng").value || 0),
        PhuThu: Number($("invoicePhuThu").value || 0),
        ThanhTienCuoi: updateFinancialPreview()
    };

    try {
        if (!payload.MaBA) {
            alert("Vui lòng nhập mã bệnh án");
            return;
        }

        if (!payload.MaNhanVien) {
            alert("Vui lòng nhập mã nhân viên");
            return;
        }

        if (payload.TongTien < 0) {
            alert("Tổng tiền không hợp lệ");
            return;
        }

        let savedInvoice = null;

        if (id) {
            savedInvoice = await fetchJson(`${API_INVOICES}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            alert("Cập nhật hóa đơn thành công");
        } else {
            savedInvoice = await fetchJson(API_INVOICES, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            alert("Tạo hóa đơn thành công");
        }

        state.invoiceModal.hide();
        await loadInvoices();

        const newId = savedInvoice?.MaHD || savedInvoice?.id || id;
        if (openDetailAfterSave && newId) {
            window.location.href = `invoice_detail.html?id=${newId}`;
        }
    } catch (error) {
        console.error("saveInvoice error:", error);
        alert(error.message || "Không thể lưu hóa đơn");
    }
}

async function cancelInvoice(id) {
    if (!confirm("Bạn có chắc muốn hủy hóa đơn này?")) return;

    try {
        await fetchJson(`${API_INVOICES}/${id}/cancel`, {
            method: "PUT"
        });

        alert("Đã hủy hóa đơn");
        await loadInvoices();
    } catch (error) {
        console.error("cancelInvoice error:", error);
        alert(
            error.message ||
            "Không thể hủy hóa đơn. Nếu backend chưa có route /cancel, bạn cần bổ sung API hủy hóa đơn."
        );
    }
}

async function viewQuickDetail(id) {
    try {
        state.currentDetailId = id;
        const [invoice, details] = await Promise.all([
            fetchJson(`${API_INVOICES}/${id}`),
            fetchJson(`${API_INVOICES}/${id}/details`)
        ]);

        $("detailMaHD").textContent = invoice.MaHoaDon || `HD${String(invoice.MaHD).padStart(5, "0")}`;
        $("detailPatient").textContent = getPatientName(invoice);
        $("detailStatus").textContent = normalizeStatus(invoice.TrangThai, invoice).text;
        $("detailFinalAmount").textContent = formatMoney(getFinalAmount(invoice));

        const tbody = $("invoiceDetailTableBody");
        if (!details || !details.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">Chưa có dữ liệu chi tiết</td>
                </tr>
            `;
        } else {
            tbody.innerHTML = details.map(item => `
                <tr>
                    <td>${item.LoaiMuc || "-"}</td>
                    <td>${item.TenMuc || item.DienGiai || "-"}</td>
                    <td>${Number(item.SoLuong || 1).toLocaleString("vi-VN")}</td>
                    <td>${formatMoney(item.DonGia || 0)}</td>
                    <td>${formatMoney(item.ThanhTien || item.SoTien || 0)}</td>
                </tr>
            `).join("");
        }

        state.invoiceDetailModal.show();
    } catch (error) {
        console.error("viewQuickDetail error:", error);
        alert(error.message || "Không thể tải chi tiết hóa đơn");
    }
}

function viewInvoiceDetail(id) {
    window.location.href = `invoice_detail.html?id=${id}`;
}

function bindEvents() {
    $("headerSearchInput")?.addEventListener("input", () => {
        if ($("tableSearchInput")) {
            $("tableSearchInput").value = $("headerSearchInput").value;
        }
        filterInvoices();
    });

    $("tableSearchInput")?.addEventListener("input", filterInvoices);
    $("dateFilter")?.addEventListener("change", filterInvoices);
    $("statusFilter")?.addEventListener("change", filterInvoices);
    $("doctorFilter")?.addEventListener("change", filterInvoices);

    $("createInvoiceBtn")?.addEventListener("click", openCreateModal);
    $("quickCreateBtn")?.addEventListener("click", openCreateModal);
    $("floatingCreateBtn")?.addEventListener("click", openCreateModal);

    $("saveInvoiceBtn")?.addEventListener("click", () => saveInvoice(false));
    $("saveAndOpenInvoiceBtn")?.addEventListener("click", () => saveInvoice(true));

    $("invoiceTongTien")?.addEventListener("input", updateFinancialPreview);
    $("invoiceBHYTChiTra")?.addEventListener("input", updateFinancialPreview);
    $("invoiceDiscount")?.addEventListener("input", updateFinancialPreview);
    $("invoiceTamUng")?.addEventListener("input", updateFinancialPreview);
    $("invoicePhuThu")?.addEventListener("input", updateFinancialPreview);

    $("openDetailPageBtn")?.addEventListener("click", () => {
        if (state.currentDetailId) {
            viewInvoiceDetail(state.currentDetailId);
        }
    });
}

async function init() {
    state.invoiceModal = new bootstrap.Modal($("invoiceModal"));
    state.invoiceDetailModal = new bootstrap.Modal($("invoiceDetailModal"));

    bindEvents();
    updateFinancialPreview();
    await loadInvoices();
}

document.addEventListener("DOMContentLoaded", init);

Object.assign(window, {
    editInvoice,
    cancelInvoice,
    viewInvoiceDetail,
    viewQuickDetail
});
