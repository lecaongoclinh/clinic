const API_INVOICES = "http://localhost:3000/api/invoices";

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function setHtml(id, value) {
    const el = $(id);
    if (el) el.innerHTML = value;
}

function isMeaningfulValue(value) {
    if (value == null) return false;
    if (typeof value === "number") return !Number.isNaN(value);
    return String(value).trim() !== "";
}

function toDisplayName(value) {
    if (!isMeaningfulValue(value)) return "";

    return String(value)
        .trim()
        .toLocaleLowerCase("vi-VN")
        .replace(/\s+/g, " ")
        .replace(/(^|\s)(\S)/g, (match, prefix, char) => `${prefix}${char.toLocaleUpperCase("vi-VN")}`);
}

function setFieldValue(id, value, options = {}) {
    const el = $(id);
    if (!el) return;

    const wrapper = el.closest(".info-field");
    const hasValue = isMeaningfulValue(value);

    if (wrapper && options.hideRowWhenEmpty) {
        wrapper.classList.toggle("is-hidden", !hasValue);
    }

    if (options.hideSelfWhenEmpty) {
        el.classList.toggle("is-hidden", !hasValue);
    }

    if (hasValue) {
        el.textContent = value;
    } else if (!options.hideRowWhenEmpty && !options.hideSelfWhenEmpty) {
        el.textContent = options.fallback ?? "";
    }
}

function getInvoiceId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || "Lỗi API");
    }

    return data;
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN");
}

function formatDateTime(date) {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN");
}

function getNormalizedStatus(invoice = {}) {
    if (invoice.TrangThai === "DaThanhToan") return "DaThanhToan";
    if (invoice.TrangThai === "ThanhToanMotPhan") return "ThanhToanMotPhan";
    if (invoice.TrangThai === "DaHuy" || invoice.TrangThai === "Huy") return "DaHuy";
    if (invoice.TrangThai === "QuaHan") return "QuaHan";

    const dueDate = invoice.HanThanhToan ? new Date(invoice.HanThanhToan) : null;
    if (
        invoice.TrangThai === "ChuaThanhToan" &&
        dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate < new Date()
    ) {
        return "QuaHan";
    }

    return invoice.TrangThai || "ChuaThanhToan";
}

function getStatusMeta(status) {
    switch (status) {
        case "DaThanhToan":
            return {
                text: "Đã thanh toán",
                className: "status-paid"
            };
        case "ThanhToanMotPhan":
            return {
                text: "Thanh toán một phần",
                className: "status-partial"
            };
        case "QuaHan":
            return {
                text: "Quá hạn",
                className: "status-overdue"
            };
        case "DaHuy":
        case "Huy":
            return {
                text: "Đã hủy",
                className: "status-cancel"
            };
        default:
            return {
                text: "Chờ thanh toán",
                className: "status-pending"
            };
    }
}

function buildPatientBirthGender(row) {
    const parts = [];
    if (row.NgaySinh) parts.push(formatDate(row.NgaySinh));
    if (row.GioiTinh) parts.push(row.GioiTinh);
    return parts.length ? parts.join(" / ") : "";
}

function buildMedicalRecordLink(invoice) {
    if (!invoice.MaBA) return "#";
    return `../BenhAn.html?id=${invoice.MaBA}`;
}

function renderStatusPill(status) {
    const meta = getStatusMeta(status);
    return `
        <i class="fa fa-circle" style="font-size:10px;"></i>
        <span>${meta.text}</span>
    `;
}

function groupDetailItems(rows) {
    const groups = {
        Kham: [],
        DichVu: [],
        Thuoc: [],
        Khac: []
    };

    (rows || []).forEach((row) => {
        if (row.LoaiMuc === "Kham") groups.Kham.push(row);
        else if (row.LoaiMuc === "DichVu") groups.DichVu.push(row);
        else if (row.LoaiMuc === "Thuoc") groups.Thuoc.push(row);
        else groups.Khac.push(row);
    });

    return groups;
}

function renderGroupTable(title, items) {
    if (!items.length) return "";

    return `
        <div class="group-block">
            <div class="group-header">${title}</div>
            <div class="table-responsive">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align:left;">Nội dung</th>
                            <th style="width:90px;text-align:center;">SL</th>
                            <th style="width:130px;text-align:right;">Đơn giá</th>
                            <th style="width:130px;text-align:right;">Giảm trừ</th>
                            <th style="width:140px;text-align:right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item) => `
                            <tr>
                                <td>
                                    <div class="item-main">${item.TenMuc || item.DienGiai || "Không có tên mục"}</div>
                                    <div class="item-sub">
                                        ${item.DienGiai || "Không có diễn giải"}
                                        ${item.MaPX ? `<br>Phiếu xuất liên quan: PX-${String(item.MaPX).padStart(5, "0")}` : ""}
                                        ${item.SoLo ? `<br>Số lô: ${item.SoLo}` : ""}
                                    </div>
                                </td>
                                <td class="qty">${Number(item.SoLuong || 1).toLocaleString("vi-VN")}</td>
                                <td class="money">${formatMoney(item.DonGia || 0)}</td>
                                <td class="money ${Number(item.GiamTruDong || 0) > 0 ? "discount" : ""}">
                                    ${Number(item.GiamTruDong || 0) > 0 ? "-" : ""}${formatMoney(item.GiamTruDong || 0)}
                                </td>
                                <td class="money">${formatMoney(item.ThanhTien || item.SoTien || 0)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderItems(details) {
    const container = $("invoiceItemsContainer");
    if (!container) return;

    if (!details || !details.length) {
        container.innerHTML = `<div class="empty-box">Chưa có chi tiết hóa đơn</div>`;
        return;
    }

    const groups = groupDetailItems(details);

    container.innerHTML = `
        ${renderGroupTable("Tiền khám", groups.Kham)}
        ${renderGroupTable("Dịch vụ y tế", groups.DichVu)}
        ${renderGroupTable("Thuốc", groups.Thuoc)}
        ${renderGroupTable("Mục khác", groups.Khac)}
    `;
}

function renderTimeline(invoice, paymentHistory = []) {
    const container = $("invoiceTimeline");
    if (!container) return;

    const normalizedStatus = getNormalizedStatus(invoice);

    const timelineItems = [
        {
            title: "Hóa đơn được tạo",
            time: invoice.NgayTao,
            sub: invoice.TenNhanVien ? `Người lập: ${invoice.TenNhanVien}` : "Được tạo từ hệ thống"
        }
    ];

    if (normalizedStatus === "DaThanhToan") {
        timelineItems.unshift({
            title: "Thanh toán hoàn tất",
            time: invoice.NgayThanhToan || paymentHistory?.[0]?.NgayThanhToan || paymentHistory?.[0]?.payment_time,
            sub: invoice.PhuongThucThanhToan
                ? `Phương thức: ${invoice.PhuongThucThanhToan}`
                : "Đã hoàn tất thanh toán"
        });
    } else if (normalizedStatus === "ThanhToanMotPhan") {
        timelineItems.unshift({
            title: "Đã thanh toán một phần",
            time: paymentHistory?.[0]?.NgayThanhToan || paymentHistory?.[0]?.payment_time || invoice.NgayCapNhat,
            sub: "Hóa đơn còn số dư cần thu tiếp"
        });
    } else if (normalizedStatus === "DaHuy") {
        timelineItems.unshift({
            title: "Hóa đơn đã hủy",
            time: invoice.NgayCapNhat || invoice.NgayHuy || invoice.NgayTao,
            sub: "Hóa đơn không còn hiệu lực"
        });
    } else if (normalizedStatus === "QuaHan") {
        timelineItems.unshift({
            title: "Hóa đơn quá hạn",
            time: invoice.HanThanhToan,
            sub: "Cần xử lý thanh toán"
        });
    } else {
        timelineItems.unshift({
            title: "Đang chờ thanh toán",
            time: invoice.HanThanhToan || invoice.NgayTao,
            sub: "Hóa đơn chưa được thanh toán"
        });
    }

    container.innerHTML = timelineItems.map((item, index) => `
        <div class="timeline-item">
            <div class="timeline-dot" style="${index === 0 ? "" : "background:#fff;border-color:#cbd5e1;"}"></div>
            <div class="timeline-title">${item.title}</div>
            <div class="timeline-time">${formatDateTime(item.time)}</div>
            <div class="timeline-sub">${item.sub || ""}</div>
            ${index === 0 && invoice.MaHoaDon ? `<div class="pill-inline">${invoice.MaHoaDon}</div>` : ""}
        </div>
    `).join("");
}

function renderPaymentHistoryBox(invoice) {
    const box = $("paymentHistoryBox");
    if (!box) return;

    const history = invoice.LichSuThanhToan || invoice.Payments || invoice.payment_history || [];

    if (!history || !history.length) {
        box.innerHTML = `<div class="empty-box" style="padding:12px 0;">Chưa có giao dịch thanh toán</div>`;
        return;
    }

    box.innerHTML = history.map(item => `
        <div class="payment-history-item">
            <div class="payment-history-item-top">
                <div class="payment-history-method">${item.LoaiGiaoDich === "HoanTien" ? "Hoàn tiền" : "Thanh toán"} • ${item.PhuongThucThanhToan || item.payment_method || "Tiền mặt"}</div>
                <div class="payment-history-amount ${item.LoaiGiaoDich === "HoanTien" ? "refund" : ""}">${item.LoaiGiaoDich === "HoanTien" ? "-" : ""}${formatMoney(item.SoTienThanhToan || item.payment_amount || 0)}</div>
            </div>
            <div class="payment-history-time">${formatDateTime(item.NgayThanhToan || item.payment_time || item.created_at)}</div>
        </div>
    `).join("");
}

function setupPaymentMethodUI(invoice) {
    const items = document.querySelectorAll(".payment-method-item");
    let selectedMethod = invoice.PhuongThucThanhToan || "TienMat";

    items.forEach((item) => {
        item.classList.toggle("active", item.dataset.method === selectedMethod);

        item.onclick = () => {
            items.forEach(x => x.classList.remove("active"));
            item.classList.add("active");
            selectedMethod = item.dataset.method;
        };
    });

    return () => selectedMethod;
}

function setupPaymentAmountUI(finalAmount, remainAmount) {
    const input = $("paymentAmountInput");
    const fullBtn = $("summaryThuHet");

    if (input) {
        input.value = Number(remainAmount || 0).toLocaleString("vi-VN");

        input.addEventListener("input", function () {
            const raw = this.value.replace(/[^\d]/g, "");
            this.value = raw ? Number(raw).toLocaleString("vi-VN") : "";
        });
    }

    if (fullBtn) {
        fullBtn.onclick = () => {
            if (input) {
                input.value = Number(remainAmount || 0).toLocaleString("vi-VN");
            }
        };
    }
}

function bindButtons(invoice, getSelectedMethod, remainAmount) {
    const printBtn = $("printInvoiceBtn");
    const exportBtn = $("exportPdfBtn");
    const payBtnTop = $("payInvoiceBtn");
    const payBtnSummary = $("summaryPayBtn");
    const refundBtn = $("refundBtn");
    const cancelInvoiceBtn = $("cancelInvoiceBtn");

    if (printBtn) {
        printBtn.onclick = () => window.print();
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            alert("Chức năng xuất PDF sẽ nối sau.");
        };
    }

    if (refundBtn) {
        refundBtn.onclick = async (e) => {
            e.preventDefault();

            const refundAmountRaw = prompt("Nhập số tiền hoàn:");
            if (!refundAmountRaw) return;

            const refundAmount = Number(String(refundAmountRaw).replace(/[^\d]/g, ""));
            if (!refundAmount || refundAmount <= 0) {
                alert("Số tiền hoàn không hợp lệ");
                return;
            }

            try {
                await fetchJson(`${API_INVOICES}/${invoice.MaHD}/refund`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        SoTienHoan: refundAmount,
                        PhuongThucThanhToan: getSelectedMethod ? getSelectedMethod() : invoice.PhuongThucThanhToan || "TienMat"
                    })
                });

                alert("Hoàn tiền thành công");
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert(
                    error.message ||
                    "Không thể hoàn tiền. Nếu backend chưa có route /refund, bạn cần bổ sung API hoàn tiền."
                );
            }
        };
    }

    if (cancelInvoiceBtn) {
        cancelInvoiceBtn.onclick = async (e) => {
            e.preventDefault();

            if (!confirm("Bạn có chắc muốn hủy hóa đơn này?")) return;

            try {
                await fetchJson(`${API_INVOICES}/${invoice.MaHD}/cancel`, {
                    method: "PUT"
                });

                alert("Đã hủy hóa đơn");
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert(
                    error.message ||
                    "Không thể hủy hóa đơn. Nếu backend chưa có route /cancel, bạn cần bổ sung API hủy hóa đơn."
                );
            }
        };
    }

    if (payBtnTop) {
        if (getNormalizedStatus(invoice) === "DaThanhToan" || getNormalizedStatus(invoice) === "DaHuy") {
            payBtnTop.disabled = true;
            payBtnTop.innerHTML = getNormalizedStatus(invoice) === "DaHuy"
                ? `<i class="fa fa-ban me-2"></i>Đã hủy`
                : `<i class="fa fa-check-circle me-2"></i>Đã thanh toán`;
            payBtnTop.classList.remove("btn-brand");
            payBtnTop.classList.add("btn-soft");
        } else {
            payBtnTop.onclick = () => {
                const amountInput = $("paymentAmountInput");
                if (amountInput) {
                    amountInput.scrollIntoView({ behavior: "smooth", block: "center" });
                    amountInput.focus();
                }
            };
        }
    }

    if (payBtnSummary) {
        if (getNormalizedStatus(invoice) === "DaThanhToan") {
            payBtnSummary.disabled = true;
            payBtnSummary.textContent = "Đã thanh toán";
        } else if (getNormalizedStatus(invoice) === "DaHuy") {
            payBtnSummary.disabled = true;
            payBtnSummary.textContent = "Hóa đơn đã hủy";
        } else {
            payBtnSummary.onclick = async () => {
                const method = getSelectedMethod ? getSelectedMethod() : "TienMat";
                const rawAmount = ($("paymentAmountInput")?.value || "").replace(/[^\d]/g, "");
                const soTienThanhToan = Number(rawAmount || 0);

                if (!soTienThanhToan || soTienThanhToan <= 0) {
                    alert("Vui lòng nhập số tiền thu hợp lệ");
                    return;
                }

                if (remainAmount > 0 && soTienThanhToan > remainAmount) {
                    alert("Số tiền thu không được lớn hơn số còn nợ");
                    return;
                }

                try {
                    await fetchJson(`${API_INVOICES}/${invoice.MaHD}/pay`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            PhuongThucThanhToan: method,
                            SoTienThanhToan: soTienThanhToan
                        })
                    });

                    alert("Thanh toán hóa đơn thành công");
                    window.location.reload();
                } catch (error) {
                    console.error(error);
                    alert(error.message || "Không thể thanh toán hóa đơn");
                }
            };
        }
    }
}

function renderInvoice(invoice, details) {
    const normalizedStatus = getNormalizedStatus(invoice);

    setText("invoiceCode", invoice.MaHoaDon || `HD-${String(invoice.MaHD).padStart(5, "0")}`);

    const statusPill = $("invoiceStatusPill");
    const statusMeta = getStatusMeta(normalizedStatus);
    if (statusPill) {
        statusPill.className = `status-pill ${statusMeta.className}`;
        statusPill.innerHTML = renderStatusPill(normalizedStatus);
    }

    setText(
        "invoiceIssuedText",
        `Ngày tạo: ${formatDateTime(invoice.NgayTao)}${invoice.HanThanhToan ? ` • Hạn thanh toán: ${formatDate(invoice.HanThanhToan)}` : ""}`
    );

    setText("patientName", invoice.HoTen || "--");
    setText("patientCode", `Mã BN: ${invoice.MaBN || "--"}`);
    setText("doctorName", invoice.TenBacSi || "--");
    setText("medicalRecordCode", `Mã BA: ${invoice.MaBA || "--"}`);
    setText("patientBirthGender", buildPatientBirthGender(invoice));
    setText("patientPhone", invoice.SoDienThoai || "--");
    setText("patientAddress", invoice.DiaChi || "--");
    setText("invoiceNote", invoice.GhiChu || "Không có ghi chú");

    setText("visitCode", invoice.MaLuotKham || invoice.MaPhieuKham || "--");
    setText("visitDate", formatDateTime(invoice.NgayKham || invoice.NgayTiepNhan || invoice.NgayTao));
    setText(
        "clinicInfo",
        [invoice.TenKhoa || invoice.Khoa, invoice.PhongKham].filter(Boolean).join(" / ") || "--"
    );
    setText("insuranceCode", invoice.MaBHYT || "--");
    setText("paymentObject", invoice.DoiTuongThanhToan || invoice.LoaiKham || "--");
    setText("diagnosisText", invoice.ChanDoan || invoice.LyDoKham || "Chưa có thông tin chẩn đoán");

    setFieldValue("patientName", toDisplayName(invoice.HoTen), { hideRowWhenEmpty: true });
    setFieldValue("patientCode", invoice.MaBN ? `MÃ£ BN: ${invoice.MaBN}` : "", { hideSelfWhenEmpty: true });
    setFieldValue("doctorName", toDisplayName(invoice.TenBacSi), { hideRowWhenEmpty: true });
    setFieldValue("medicalRecordCode", invoice.MaBA ? `MÃ£ BA: ${invoice.MaBA}` : "", { hideSelfWhenEmpty: true });
    setFieldValue("patientBirthGender", buildPatientBirthGender(invoice), { hideRowWhenEmpty: true });
    setFieldValue("patientPhone", invoice.SoDienThoai, { hideRowWhenEmpty: true });
    setFieldValue("patientAddress", invoice.DiaChi, { hideRowWhenEmpty: true });
    setFieldValue("invoiceNote", invoice.GhiChu, { hideRowWhenEmpty: true });
    setFieldValue("visitCode", invoice.MaLuotKham || invoice.MaPhieuKham, { hideRowWhenEmpty: true });
    setFieldValue("visitDate", formatDateTime(invoice.NgayKham || invoice.NgayTiepNhan || invoice.NgayTao), { hideRowWhenEmpty: true });
    setFieldValue(
        "clinicInfo",
        [invoice.TenKhoa || invoice.Khoa, invoice.PhongKham].filter(Boolean).join(" / "),
        { hideRowWhenEmpty: true }
    );
    setFieldValue("insuranceCode", invoice.MaBHYT, { hideRowWhenEmpty: true });
    setFieldValue("paymentObject", invoice.DoiTuongThanhToan || invoice.LoaiKham, { hideRowWhenEmpty: true });
    setFieldValue("patientCode", invoice.MaBN ? `Ma BN: ${invoice.MaBN}` : "", { hideSelfWhenEmpty: true });
    setFieldValue("medicalRecordCode", invoice.MaBA ? `Ma BA: ${invoice.MaBA}` : "", { hideSelfWhenEmpty: true });

    const link = $("medicalRecordLink");
    if (link) {
        link.href = buildMedicalRecordLink(invoice);
    }

    const tongTien = Number(invoice.TongTien || 0);
    const tongGiamGia = Number(invoice.TongGiamGia || invoice.GiamGiaHoaDon || 0);
    const bhytChiTra = Number(invoice.BHYTChiTra || 0);
    const tamUng = Number(invoice.TamUng || 0);
    const phuThu = Number(invoice.PhuThu || 0);

    const thanhTienCuoi = Number(
        invoice.ThanhTienCuoi
        ?? invoice.ThucThu
        ?? (tongTien - tongGiamGia - bhytChiTra - tamUng + phuThu)
    );

    const daThu = Number(invoice.DaThu || invoice.SoTienDaThu || invoice.PaidAmount || 0);
    const conNo = Math.max(0, Number(invoice.ConNo != null ? invoice.ConNo : (thanhTienCuoi - daThu)));

    setText("summaryItemCount", details?.length || 0);
    setText("summaryTongTien", formatMoney(tongTien));
    setText("summaryBHYT", bhytChiTra > 0 ? `- ${formatMoney(bhytChiTra)}` : "0 đ");
    setText("summaryGiamGia", tongGiamGia > 0 ? `- ${formatMoney(tongGiamGia)}` : "0 đ");
    setText("summaryTamUng", tamUng > 0 ? `- ${formatMoney(tamUng)}` : "0 đ");
    setText("summaryPhuThu", phuThu > 0 ? formatMoney(phuThu) : "0 đ");
    setText("summaryThanhTienCuoi", formatMoney(thanhTienCuoi));
    setText("summaryDaThu", formatMoney(daThu));
    setText("summaryConNo", formatMoney(conNo));

    const remainNote = $("paymentRemainNote");
    if (remainNote) {
        remainNote.textContent = `* Số dư còn nợ: ${formatMoney(conNo)}`;
    }

    setupPaymentAmountUI(thanhTienCuoi, conNo);
    const getSelectedMethod = setupPaymentMethodUI(invoice);

    const noteParts = [
        "Hóa đơn bao gồm toàn bộ các mục phát sinh trong lần khám."
    ];

    if ((details || []).some((x) => x.LoaiMuc === "Thuoc")) {
        noteParts.push("Đã bao gồm tiền thuốc xuất cho bệnh nhân.");
    }

    if (Number(invoice.GiamGiaChiTiet || 0) > 0) {
        noteParts.push(`Giảm trừ theo từng dòng: ${formatMoney(invoice.GiamGiaChiTiet)}.`);
    }

    if (Number(invoice.GiamGiaHoaDon || invoice.GiamGia || 0) > 0) {
        noteParts.push(`Giảm giá toàn hóa đơn: ${formatMoney(invoice.GiamGiaHoaDon || invoice.GiamGia || 0)}.`);
    }

    if (daThu > 0 && conNo > 0) {
        noteParts.push(`Hiện hóa đơn đã thu ${formatMoney(daThu)} và còn nợ ${formatMoney(conNo)}.`);
    }

    setText("invoiceSummaryNote", noteParts.join(" "));

    renderItems(details);
    renderPaymentHistoryBox(invoice);
    renderTimeline(invoice, invoice.LichSuThanhToan || invoice.Payments || invoice.payment_history || []);
    bindButtons(invoice, getSelectedMethod, conNo);
}

async function loadInvoiceDetail() {
    const id = getInvoiceId();

    if (!id) {
        setText("invoiceDetailLoading", "Thiếu mã hóa đơn");
        return;
    }

    try {
        const [invoice, details] = await Promise.all([
            fetchJson(`${API_INVOICES}/${id}`),
            fetchJson(`${API_INVOICES}/${id}/details`)
        ]);

        renderInvoice(invoice, details);

        const loading = $("invoiceDetailLoading");
        const content = $("invoiceDetailContent");
        if (loading) loading.style.display = "none";
        if (content) content.style.display = "block";
    } catch (error) {
        console.error("loadInvoiceDetail error:", error);
        setText("invoiceDetailLoading", error.message || "Không thể tải chi tiết hóa đơn");
    }
}

document.addEventListener("DOMContentLoaded", loadInvoiceDetail);
