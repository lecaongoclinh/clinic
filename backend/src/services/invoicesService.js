import db from "../config/db.js";
import InvoicesModel from "../models/invoicesModel.js";

const NOTE_META_MARKER = "\n[__INVOICE_META__]";

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value) {
    const valid = ["ChuaThanhToan", "DaThanhToan", "QuaHan", "DaHuy", "Huy", "ThanhToanMotPhan"];
    if (!value) return "ChuaThanhToan";
    if (!valid.includes(value)) {
        throw new Error("Trạng thái hóa đơn không hợp lệ");
    }
    if (value === "Huy") return "DaHuy";
    if (value === "ThanhToanMotPhan") return "ChuaThanhToan";
    return value;
}

function isExamTicketInProgress(status) {
    return ["DangKham", "IN_PROGRESS"].includes(status);
}

function normalizePaymentMethod(value) {
    if (value === undefined || value === null || value === "") {
        return {
            storageMethod: null,
            displayMethod: null
        };
    }

    const normalized = String(value).trim();
    const valid = ["TienMat", "ChuyenKhoan", "QRPay", "The"];
    if (!valid.includes(normalized)) {
        throw new Error("Phương thức thanh toán không hợp lệ");
    }

    return {
        storageMethod: normalized === "TienMat" ? "TienMat" : "ChuyenKhoan",
        displayMethod: normalized
    };
}

function buildInvoiceCode(id) {
    return `INV-${String(id).padStart(4, "0")}`;
}

function parseInvoiceMeta(rawNote) {
    const note = typeof rawNote === "string" ? rawNote : "";
    const markerIndex = note.lastIndexOf(NOTE_META_MARKER);

    if (markerIndex === -1) {
        return {
            plainNote: note.trim() || null,
            meta: {
                adjustments: {},
                paymentHistory: []
            }
        };
    }

    const plainNote = note.slice(0, markerIndex).trim();
    const metaRaw = note.slice(markerIndex + NOTE_META_MARKER.length).trim();

    try {
        const parsed = metaRaw ? JSON.parse(metaRaw) : {};
        return {
            plainNote: plainNote || null,
            meta: {
                adjustments: parsed?.adjustments || {},
                paymentHistory: Array.isArray(parsed?.paymentHistory) ? parsed.paymentHistory : []
            }
        };
    } catch {
        return {
            plainNote: note.trim() || null,
            meta: {
                adjustments: {},
                paymentHistory: []
            }
        };
    }
}

function buildInvoiceNote(plainNote, meta = {}) {
    const cleanNote = typeof plainNote === "string" ? plainNote.trim() : "";
    const paymentHistory = Array.isArray(meta.paymentHistory)
        ? meta.paymentHistory.filter(item => item && toNumber(item.amount, 0) > 0)
        : [];
    const adjustments = {
        BHYTChiTra: Math.max(toNumber(meta.adjustments?.BHYTChiTra, 0), 0),
        TamUng: Math.max(toNumber(meta.adjustments?.TamUng, 0), 0),
        PhuThu: Math.max(toNumber(meta.adjustments?.PhuThu, 0), 0)
    };

    const hasMeta = paymentHistory.length || adjustments.BHYTChiTra || adjustments.TamUng || adjustments.PhuThu;
    if (!hasMeta) {
        return cleanNote || null;
    }

    const payload = JSON.stringify({
        adjustments,
        paymentHistory
    });

    return cleanNote
        ? `${cleanNote}${NOTE_META_MARKER}${payload}`
        : `${NOTE_META_MARKER}${payload}`;
}

function extractAdjustments(invoice = {}) {
    const { meta } = parseInvoiceMeta(invoice.GhiChu);
    return {
        BHYTChiTra: Math.max(toNumber(meta.adjustments?.BHYTChiTra, 0), 0),
        TamUng: Math.max(toNumber(meta.adjustments?.TamUng, 0), 0),
        PhuThu: Math.max(toNumber(meta.adjustments?.PhuThu, 0), 0)
    };
}

function extractPaymentHistory(invoice = {}) {
    const { meta } = parseInvoiceMeta(invoice.GhiChu);
    return Array.isArray(meta.paymentHistory) ? meta.paymentHistory : [];
}

function calculateLedger(paymentHistory = []) {
    const payments = paymentHistory
        .filter(item => item?.type === "payment" || item?.LoaiGiaoDich === "ThanhToan")
        .reduce((sum, item) => sum + Math.max(toNumber(item.amount ?? item.SoTienThanhToan, 0), 0), 0);
    const refunds = paymentHistory
        .filter(item => item?.type === "refund" || item?.LoaiGiaoDich === "HoanTien")
        .reduce((sum, item) => sum + Math.max(toNumber(item.amount ?? item.SoTienThanhToan, 0), 0), 0);

    return {
        totalPaid: Math.max(payments - refunds, 0),
        totalRefunded: refunds
    };
}

function calculateInvoiceTotals(details = [], invoiceDiscount = 0, adjustments = {}) {
    const tongTien = details.reduce((sum, row) => {
        const soLuong = toNumber(row.SoLuong, 1);
        const donGia = toNumber(row.DonGia, 0);
        return sum + (donGia * soLuong);
    }, 0);

    const thanhTienSauDong = details.reduce((sum, row) => {
        const value = row.ThanhTien !== undefined && row.ThanhTien !== null
            ? row.ThanhTien
            : row.SoTien;
        return sum + toNumber(value, 0);
    }, 0);

    const giamGiaChiTiet = Math.max(tongTien - thanhTienSauDong, 0);
    const giamGiaHoaDon = Math.max(toNumber(invoiceDiscount, 0), 0);
    const tongGiamGia = giamGiaChiTiet + giamGiaHoaDon;
    const bhytChiTra = Math.max(toNumber(adjustments.BHYTChiTra, 0), 0);
    const tamUng = Math.max(toNumber(adjustments.TamUng, 0), 0);
    const phuThu = Math.max(toNumber(adjustments.PhuThu, 0), 0);
    const thanhTienCuoi = Math.max(thanhTienSauDong - giamGiaHoaDon - bhytChiTra - tamUng + phuThu, 0);

    return {
        TongTien: tongTien,
        GiamGiaChiTiet: giamGiaChiTiet,
        GiamGiaHoaDon: giamGiaHoaDon,
        TongGiamGia: tongGiamGia,
        BHYTChiTra: bhytChiTra,
        TamUng: tamUng,
        PhuThu: phuThu,
        ThanhTienCuoi: thanhTienCuoi
    };
}

function getDerivedStatus(invoice = {}, finalAmount = 0, totalPaid = 0) {
    if (invoice.TrangThai === "DaHuy" || invoice.TrangThai === "Huy") {
        return "DaHuy";
    }

    if (finalAmount <= 0 || totalPaid >= finalAmount) {
        return "DaThanhToan";
    }

    if (totalPaid > 0) {
        return "ThanhToanMotPhan";
    }

    const dueDate = invoice.HanThanhToan ? new Date(invoice.HanThanhToan) : null;
    if (invoice.TrangThai === "QuaHan") {
        return "QuaHan";
    }

    if (
        dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate < new Date()
    ) {
        return "QuaHan";
    }

    return "ChuaThanhToan";
}

function normalizePaymentHistoryRows(rows = [], fallbackInvoice = {}) {
    return (rows || []).map(item => ({
        LoaiGiaoDich: item.LoaiGiaoDich || (item.type === "refund" ? "HoanTien" : "ThanhToan"),
        PhuongThucThanhToan: item.PhuongThucThanhToan || item.method || fallbackInvoice.PhuongThucThanhToan || "TienMat",
        SoTienThanhToan: Math.max(toNumber(item.SoTienThanhToan ?? item.amount, 0), 0),
        NgayThanhToan: item.NgayThanhToan || item.time || null,
        MaNhanVien: item.MaNhanVien || null,
        GhiChu: item.GhiChu || null
    }));
}

function decorateInvoice(invoice = {}, details = null, paymentHistoryRows = null) {
    const { plainNote } = parseInvoiceMeta(invoice.GhiChu);
    const adjustments = extractAdjustments(invoice);
    const paymentHistory = paymentHistoryRows
        ? normalizePaymentHistoryRows(paymentHistoryRows, invoice)
        : normalizePaymentHistoryRows(extractPaymentHistory(invoice), invoice);
    const totals = details
        ? calculateInvoiceTotals(details, invoice.GiamGia, adjustments)
        : {
            TongTien: toNumber(invoice.TongTien, 0),
            GiamGiaChiTiet: 0,
            GiamGiaHoaDon: Math.max(toNumber(invoice.GiamGia, 0), 0),
            TongGiamGia: Math.max(toNumber(invoice.GiamGia, 0), 0),
            BHYTChiTra: adjustments.BHYTChiTra,
            TamUng: adjustments.TamUng,
            PhuThu: adjustments.PhuThu,
            ThanhTienCuoi: toNumber(invoice.ThanhTienCuoi, 0)
        };
    const { totalPaid, totalRefunded } = calculateLedger(paymentHistory);
    const conNo = Math.max(totals.ThanhTienCuoi - totalPaid, 0);
    const latestPaymentMethod = [...paymentHistory]
        .reverse()
        .find(item => item?.LoaiGiaoDich === "ThanhToan" && item.PhuongThucThanhToan)?.PhuongThucThanhToan;

    return {
        ...invoice,
        ...totals,
        GhiChu: plainNote,
        DaThu: totalPaid,
        ConNo: conNo,
        TongHoan: totalRefunded,
        PhuongThucThanhToan: latestPaymentMethod || invoice.PhuongThucThanhToan,
        TrangThai: getDerivedStatus(invoice, totals.ThanhTienCuoi, totalPaid),
        LichSuThanhToan: paymentHistory
            .slice()
            .sort((a, b) => new Date(b.NgayThanhToan || 0) - new Date(a.NgayThanhToan || 0))
    };
}

function toInvoiceStoragePaymentMethod(value) {
    if (value === undefined || value === null || value === "") return null;
    return normalizePaymentMethod(value).storageMethod;
}

async function refreshInvoiceTotalsAndStatus(invoiceId, details, connection = db) {
    const invoice = await InvoicesModel.getById(invoiceId, connection);
    const paymentHistory = await InvoicesModel.getPaymentHistory(invoiceId, connection);
    const adjustments = extractAdjustments(invoice);
    const totals = calculateInvoiceTotals(details, invoice.GiamGia, adjustments);
    const { totalPaid } = calculateLedger(paymentHistory);
    const status = getDerivedStatus(invoice, totals.ThanhTienCuoi, totalPaid);
    const latestPayment = paymentHistory.find(item => item.LoaiGiaoDich === "ThanhToan");
    const storedPaymentMethod = latestPayment
        ? toInvoiceStoragePaymentMethod(latestPayment.PhuongThucThanhToan)
        : (totalPaid > 0 ? toInvoiceStoragePaymentMethod(invoice.PhuongThucThanhToan) : null);

    await InvoicesModel.updateTotalsAndStatus(invoiceId, {
        TongTien: totals.TongTien,
        GiamGia: toNumber(invoice.GiamGia, 0),
        ThanhTienCuoi: totals.ThanhTienCuoi,
        TrangThai: status === "ThanhToanMotPhan" ? "ChuaThanhToan" : status,
        PhuongThucThanhToan: storedPaymentMethod,
        NgayThanhToan: status === "DaThanhToan" ? (invoice.NgayThanhToan || new Date()) : null,
        connection
    });

    return {
        invoice: await InvoicesModel.getById(invoiceId, connection),
        paymentHistory
    };
}

async function syncInvoiceDetailsAndTotals(invoiceId, connection = db) {
    const invoice = await InvoicesModel.getById(invoiceId, connection);
    if (!invoice) {
        throw new Error("Không tìm thấy hóa đơn");
    }

    await InvoicesModel.replaceDrugDetailsFromDispense(invoiceId, connection);

    const details = await InvoicesModel.getDetails(invoiceId, connection);
    const refreshed = await refreshInvoiceTotalsAndStatus(invoiceId, details, connection);
    const refreshedDetails = await InvoicesModel.getDetails(invoiceId, connection);

    return {
        invoice: decorateInvoice(refreshed.invoice, refreshedDetails, refreshed.paymentHistory),
        details: refreshedDetails
    };
}

async function getOrCreateInvoiceForVisit({
    MaPK = null,
    MaBA = null,
    MaNhanVien = null,
    MaChuyenKhoa = null,
    connection = db
} = {}) {
    let invoice = await InvoicesModel.getByVisit({ MaPK, MaBA, connection, forUpdate: true });
    if (invoice) {
        if (MaBA && !invoice.MaBA) {
            await InvoicesModel.update(invoice.MaHD, {
                ...invoice,
                MaBA,
                MaPK: invoice.MaPK || MaPK,
                GiamGia: toNumber(invoice.GiamGia, 0),
                TongTien: toNumber(invoice.TongTien, 0),
                ThanhTienCuoi: toNumber(invoice.ThanhTienCuoi, 0),
                connection
            });
            invoice = await InvoicesModel.getById(invoice.MaHD, connection);
        }
        return invoice;
    }

    const insertId = await InvoicesModel.create({
        MaBA: MaBA || null,
        MaPK: MaPK || null,
        MaPX: null,
        MaNhanVien,
        PhuongThucThanhToan: null,
        TrangThai: "ChuaThanhToan",
        TongTien: 0,
        GiamGia: 0,
        ThanhTienCuoi: 0,
        HanThanhToan: null,
        GhiChu: "Hoa don nhap tu dong theo luot kham",
        connection
    });

    const created = await InvoicesModel.getById(insertId, connection);
    await InvoicesModel.update(insertId, {
        ...created,
        MaHoaDon: buildInvoiceCode(insertId),
        MaPK: MaPK || null,
        MaBA: MaBA || null,
        GiamGia: 0,
        TongTien: 0,
        ThanhTienCuoi: 0,
        connection
    });

    const service = await InvoicesModel.getDefaultExamService({ MaChuyenKhoa, connection });
    if (service) {
        await InvoicesModel.upsertVisitServiceDetails(insertId, [{
            MaDichVu: service.MaDichVu,
            TenDichVu: service.TenDichVu,
            DonGia: service.Gia,
            SoLuong: 1,
            ThanhTien: service.Gia,
            DienGiai: "Tien kham"
        }], { replace: true, onlyExam: true, connection });
    }

    const details = await InvoicesModel.getDetails(insertId, connection);
    await refreshInvoiceTotalsAndStatus(insertId, details, connection);

    return await InvoicesModel.getById(insertId, connection);
}

const InvoicesService = {
    getDashboard: async (filters = {}) => {
        const [summary, invoices, doctors] = await Promise.all([
            InvoicesModel.getSummary(filters),
            InvoicesModel.getAll(filters),
            InvoicesModel.getDoctorOptions()
        ]);

        return {
            summary,
            invoices: await Promise.all(invoices.map(async (invoice) => {
                const history = await InvoicesModel.getPaymentHistory(invoice.MaHD);
                return decorateInvoice(invoice, null, history.length ? history : null);
            })),
            doctors
        };
    },

    getAll: async (filters = {}) => {
        const invoices = await InvoicesModel.getAll(filters);
        return await Promise.all(invoices.map(async (invoice) => {
            const history = await InvoicesModel.getPaymentHistory(invoice.MaHD);
            return decorateInvoice(invoice, null, history.length ? history : null);
        }));
    },

    getById: async (id) => {
        const invoice = await InvoicesModel.getById(id);
        if (!invoice) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        const details = await InvoicesModel.getDetails(id);
        const paymentHistory = await InvoicesModel.getPaymentHistory(id);
        return decorateInvoice(invoice, details, paymentHistory.length ? paymentHistory : null);
    },

    getDetails: async (id) => {
        const invoice = await InvoicesModel.getById(id);
        if (!invoice) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        return await InvoicesModel.getDetails(id);
    },

    create: async (payload) => {
        if (!payload.MaBA && !payload.MaPK) {
            throw new Error("Thiếu mã bệnh án");
        }

        if (!payload.MaNhanVien) {
            throw new Error("Thiếu nhân viên tạo hóa đơn");
        }

        const status = normalizeStatus(payload.TrangThai || "ChuaThanhToan");
        const { storageMethod: phuongThucThanhToan } = normalizePaymentMethod(payload.PhuongThucThanhToan);
        const giamGia = Math.max(toNumber(payload.GiamGia ?? payload.TongGiamGia, 0), 0);
        const noteWithMeta = buildInvoiceNote(payload.GhiChu, {
            adjustments: {
                BHYTChiTra: payload.BHYTChiTra,
                TamUng: payload.TamUng,
                PhuThu: payload.PhuThu
            },
            paymentHistory: []
        });

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const insertId = await InvoicesModel.create({
                MaBA: payload.MaBA,
                MaPK: payload.MaPK || null,
                MaPX: payload.MaPX || null,
                MaNhanVien: payload.MaNhanVien,
                PhuongThucThanhToan: phuongThucThanhToan,
                TrangThai: status,
                TongTien: 0,
                GiamGia: giamGia,
                ThanhTienCuoi: 0,
                HanThanhToan: payload.HanThanhToan || null,
                GhiChu: noteWithMeta,
                connection
            });

            const maHoaDon = payload.MaHoaDon?.trim() || buildInvoiceCode(insertId);

            await InvoicesModel.update(insertId, {
                MaBA: payload.MaBA,
                MaPK: payload.MaPK || null,
                MaPX: payload.MaPX || null,
                MaNhanVien: payload.MaNhanVien,
                PhuongThucThanhToan: phuongThucThanhToan,
                TrangThai: status,
                MaHoaDon: maHoaDon,
                TongTien: 0,
                GiamGia: giamGia,
                ThanhTienCuoi: 0,
                HanThanhToan: payload.HanThanhToan || null,
                GhiChu: noteWithMeta,
                connection
            });

            if (Array.isArray(payload.ChiTietHoaDon)) {
                await InvoicesModel.replaceNonDrugDetails(
                    insertId,
                    payload.ChiTietHoaDon.filter(item => item && item.LoaiMuc !== "Thuoc"),
                    connection
                );
            }

            const synced = await syncInvoiceDetailsAndTotals(insertId, connection);

            await connection.commit();
            return synced.invoice;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    update: async (id, payload) => {
        const current = await InvoicesModel.getById(id);
        if (!current) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        if (current.TrangThai === "DaThanhToan") {
            throw new Error("Không thể cập nhật hóa đơn đã thanh toán");
        }

        const status = normalizeStatus(payload.TrangThai || current.TrangThai);
        const { storageMethod: phuongThucThanhToan } = normalizePaymentMethod(
            payload.PhuongThucThanhToan !== undefined
                ? payload.PhuongThucThanhToan
                : current.PhuongThucThanhToan
        );
        const giamGia = payload.GiamGia !== undefined || payload.TongGiamGia !== undefined
            ? Math.max(toNumber(payload.GiamGia ?? payload.TongGiamGia, 0), 0)
            : Math.max(toNumber(current.GiamGia, 0), 0);
        const currentMeta = parseInvoiceMeta(current.GhiChu);
        const noteWithMeta = buildInvoiceNote(
            payload.GhiChu !== undefined ? payload.GhiChu : currentMeta.plainNote,
            {
                adjustments: {
                    BHYTChiTra: payload.BHYTChiTra !== undefined ? payload.BHYTChiTra : currentMeta.meta.adjustments?.BHYTChiTra,
                    TamUng: payload.TamUng !== undefined ? payload.TamUng : currentMeta.meta.adjustments?.TamUng,
                    PhuThu: payload.PhuThu !== undefined ? payload.PhuThu : currentMeta.meta.adjustments?.PhuThu
                },
                paymentHistory: currentMeta.meta.paymentHistory
            }
        );

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await InvoicesModel.update(id, {
                MaBA: payload.MaBA || current.MaBA,
                MaPK: payload.MaPK !== undefined ? payload.MaPK : current.MaPK,
                MaPX: payload.MaPX !== undefined ? payload.MaPX : current.MaPX,
                MaNhanVien: payload.MaNhanVien || current.MaNhanVien,
                PhuongThucThanhToan: phuongThucThanhToan,
                TrangThai: status,
                MaHoaDon: payload.MaHoaDon || current.MaHoaDon,
                TongTien: toNumber(current.TongTien, 0),
                GiamGia: giamGia,
                ThanhTienCuoi: toNumber(current.ThanhTienCuoi, 0),
                HanThanhToan: payload.HanThanhToan !== undefined ? payload.HanThanhToan : current.HanThanhToan,
                GhiChu: noteWithMeta,
                connection
            });

            if (Array.isArray(payload.ChiTietHoaDon)) {
                await InvoicesModel.replaceNonDrugDetails(
                    id,
                    payload.ChiTietHoaDon.filter(item => item && item.LoaiMuc !== "Thuoc"),
                    connection
                );
            }

            const synced = await syncInvoiceDetailsAndTotals(id, connection);

            await connection.commit();
            return synced.invoice;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    pay: async (id, payload = {}) => {
        const current = await InvoicesModel.getById(id);
        if (!current) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        if (current.TrangThai === "Huy" || current.TrangThai === "DaHuy") {
            throw new Error("Không thể thanh toán hóa đơn đã hủy");
        }

        const paymentMethod = normalizePaymentMethod(payload.PhuongThucThanhToan);
        if (!paymentMethod.displayMethod) {
            throw new Error("Vui lòng cung cấp phương thức thanh toán");
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const synced = await syncInvoiceDetailsAndTotals(id, connection);
            const paymentHistory = await InvoicesModel.getPaymentHistory(id, connection);
            const { totalPaid } = calculateLedger(paymentHistory);
            const remainAmount = Math.max(toNumber(synced.invoice.ThanhTienCuoi, 0) - totalPaid, 0);
            const soTienThanhToan = payload.SoTienThanhToan !== undefined && payload.SoTienThanhToan !== null
                ? Math.max(toNumber(payload.SoTienThanhToan, 0), 0)
                : remainAmount;

            if (remainAmount <= 0) {
                throw new Error("Hóa đơn đã được thanh toán");
            }

            if (!soTienThanhToan || soTienThanhToan <= 0) {
                throw new Error("Vui lòng nhập số tiền thanh toán hợp lệ");
            }

            if (soTienThanhToan > remainAmount) {
                throw new Error("Số tiền thanh toán không được vượt quá số còn nợ");
            }

            const daThuMoi = totalPaid + soTienThanhToan;
            const conNoMoi = Math.max(toNumber(synced.invoice.ThanhTienCuoi, 0) - daThuMoi, 0);

            await InvoicesModel.insertPaymentHistory(id, {
                LoaiGiaoDich: "ThanhToan",
                PhuongThucThanhToan: paymentMethod.displayMethod,
                SoTienThanhToan: soTienThanhToan,
                MaNhanVien: payload.MaNhanVien || current.MaNhanVien || null,
                GhiChu: payload.GhiChu || null,
                connection
            });

            await InvoicesModel.updatePaymentState(id, {
                TrangThai: conNoMoi === 0 ? "DaThanhToan" : "ChuaThanhToan",
                PhuongThucThanhToan: paymentMethod.storageMethod,
                NgayThanhToan: conNoMoi === 0 ? new Date() : null,
                GhiChu: current.GhiChu,
                connection
            });

            const finalInvoice = await InvoicesModel.getById(id, connection);
            const finalDetails = await InvoicesModel.getDetails(id, connection);
            const finalHistory = await InvoicesModel.getPaymentHistory(id, connection);

            await connection.commit();
            return decorateInvoice(finalInvoice, finalDetails, finalHistory.length ? finalHistory : null);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    cancel: async (id) => {
        const current = await InvoicesModel.getById(id);
        if (!current) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        if (current.TrangThai === "Huy" || current.TrangThai === "DaHuy") {
            throw new Error("Hóa đơn đã hủy");
        }

        const currentDetail = await InvoicesService.getById(id);
        if (toNumber(currentDetail.DaThu, 0) > 0) {
            throw new Error("Hóa đơn đang có giao dịch thanh toán. Hãy hoàn tiền trước khi hủy.");
        }

        await InvoicesModel.updatePaymentState(id, {
            TrangThai: "Huy",
            PhuongThucThanhToan: current.PhuongThucThanhToan,
            NgayThanhToan: null,
            GhiChu: current.GhiChu
        });

        return await InvoicesService.getById(id);
    },

    refund: async (id, payload = {}) => {
        const current = await InvoicesModel.getById(id);
        if (!current) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        if (current.TrangThai === "Huy" || current.TrangThai === "DaHuy") {
            throw new Error("Không thể hoàn tiền cho hóa đơn đã hủy");
        }

        const currentDetail = await InvoicesService.getById(id);
        const daThu = Math.max(toNumber(currentDetail.DaThu, 0), 0);
        if (daThu <= 0) {
            throw new Error("Hóa đơn chưa có số tiền đã thu để hoàn");
        }

        const soTienHoan = Math.max(toNumber(payload.SoTienHoan, 0), 0);
        if (!soTienHoan || soTienHoan <= 0) {
            throw new Error("Số tiền hoàn không hợp lệ");
        }

        if (soTienHoan > daThu) {
            throw new Error("Số tiền hoàn không được vượt quá số đã thu");
        }

        const daThuMoi = daThu - soTienHoan;
        const conNoMoi = Math.max(toNumber(currentDetail.ThanhTienCuoi, 0) - daThuMoi, 0);
        const currentMethod = normalizePaymentMethod(currentDetail.PhuongThucThanhToan);

        await InvoicesModel.insertPaymentHistory(id, {
            LoaiGiaoDich: "HoanTien",
            PhuongThucThanhToan: payload.PhuongThucThanhToan || currentDetail.PhuongThucThanhToan || "TienMat",
            SoTienThanhToan: soTienHoan,
            MaNhanVien: payload.MaNhanVien || current.MaNhanVien || null,
            GhiChu: payload.GhiChu || null
        });

        await InvoicesModel.updatePaymentState(id, {
            TrangThai: conNoMoi === 0 ? "DaThanhToan" : "ChuaThanhToan",
            PhuongThucThanhToan: daThuMoi > 0 ? currentMethod.storageMethod : null,
            NgayThanhToan: conNoMoi === 0 ? (current.NgayThanhToan || new Date()) : null,
            GhiChu: current.GhiChu
        });

        return await InvoicesService.getById(id);
    },

    ensureVisitInvoice: async (payload = {}) => {
        const connection = payload.connection || await db.getConnection();
        const shouldManageTransaction = !payload.connection;

        try {
            if (shouldManageTransaction) await connection.beginTransaction();
            const invoice = await getOrCreateInvoiceForVisit({ ...payload, connection });
            if (shouldManageTransaction) await connection.commit();
            return invoice;
        } catch (error) {
            if (shouldManageTransaction) await connection.rollback();
            throw error;
        } finally {
            if (shouldManageTransaction) connection.release();
        }
    },

    linkMedicalRecordToVisitInvoice: async ({ MaPK, MaBA, MaNhanVien, connection = db } = {}) => {
        const [[ticket]] = await connection.query(
            "SELECT MaChuyenKhoa FROM PhieuKham WHERE MaPK = ? LIMIT 1",
            [MaPK]
        );
        return await getOrCreateInvoiceForVisit({
            MaPK,
            MaBA,
            MaNhanVien,
            MaChuyenKhoa: ticket?.MaChuyenKhoa || null,
            connection
        });
    },

    addServiceItemsForVisit: async (payload = {}) => {
        const externalConnection = payload.connection;
        const connection = externalConnection || await db.getConnection();
        try {
            if (!externalConnection) await connection.beginTransaction();
            const [ticketRows] = await connection.query(
                "SELECT MaPK, TrangThai FROM PhieuKham WHERE MaPK = ? LIMIT 1",
                [payload.MaPK]
            );
            if (!ticketRows.length) {
                throw new Error("Không tìm thấy phiếu khám");
            }
            if (!isExamTicketInProgress(ticketRows[0].TrangThai)) {
                throw new Error("Chỉ có thể thêm chỉ định khi phiếu khám đang ở trạng thái Đang khám");
            }

            const invoice = await getOrCreateInvoiceForVisit({
                MaPK: payload.MaPK,
                MaBA: payload.MaBA,
                MaNhanVien: payload.MaNhanVien,
                connection
            });
            const currentDetails = await InvoicesModel.getDetails(invoice.MaHD, connection);
            const currentPayments = await InvoicesModel.getPaymentHistory(invoice.MaHD, connection);
            const currentInvoice = decorateInvoice(invoice, currentDetails, currentPayments.length ? currentPayments : null);
            if (currentInvoice.TrangThai === "DaThanhToan" || currentInvoice.TrangThai === "DaHuy") {
                throw new Error("Không thể thêm chỉ định dịch vụ cho hóa đơn đã thanh toán hoặc đã hủy");
            }

            const rawItems = Array.isArray(payload.ChiTietDichVu)
                ? payload.ChiTietDichVu
                : Array.isArray(payload.DichVu)
                    ? payload.DichVu
                    : [];
            if (!rawItems.length) {
                throw new Error("Chưa chọn dịch vụ chỉ định");
            }
            const serviceIds = rawItems.map(item => item.MaDichVu || item.maDichVu);
            const services = await InvoicesModel.getServicesByIds(serviceIds, connection);
            const serviceMap = new Map(services.map(item => [Number(item.MaDichVu), item]));
            const items = rawItems.map(item => {
                const service = serviceMap.get(Number(item.MaDichVu || item.maDichVu));
                if (!service) return null;
                const soLuong = Math.max(toNumber(item.SoLuong ?? item.soLuong, 1), 1);
                const donGia = toNumber(item.DonGia ?? service.Gia, 0);
                return {
                    MaDichVu: service.MaDichVu,
                    TenDichVu: service.TenDichVu,
                    SoLuong: soLuong,
                    DonGia: donGia,
                    ThanhTien: toNumber(item.ThanhTien, donGia * soLuong),
                    DienGiai: item.DienGiai || service.TenDichVu
                };
            }).filter(Boolean);
            if (!items.length) {
                throw new Error("Không có dịch vụ cận lâm sàng hợp lệ để thêm vào hóa đơn");
            }

            await InvoicesModel.upsertVisitServiceDetails(invoice.MaHD, items, {
                replace: Boolean(payload.Replace),
                onlyExam: false,
                connection
            });

            const details = await InvoicesModel.getDetails(invoice.MaHD, connection);
            const refreshed = await refreshInvoiceTotalsAndStatus(invoice.MaHD, details, connection);
            if (!externalConnection) await connection.commit();
            return decorateInvoice(refreshed.invoice, details, refreshed.paymentHistory);
        } catch (error) {
            if (!externalConnection) await connection.rollback();
            throw error;
        } finally {
            if (!externalConnection) connection.release();
        }
    },

    syncPrescriptionToInvoice: async ({ MaBA, MaPK = null, MaNhanVien = null, connection = db } = {}) => {
        const invoice = await getOrCreateInvoiceForVisit({ MaBA, MaPK, MaNhanVien, connection });
        await InvoicesModel.replaceDrugDetailsFromPrescription(invoice.MaHD, MaBA, connection);
        const details = await InvoicesModel.getDetails(invoice.MaHD, connection);
        return await refreshInvoiceTotalsAndStatus(invoice.MaHD, details, connection);
    },

    syncDispenseToInvoice: async ({ MaDT, MaBA = null, connection = db } = {}) => {
        let maBA = MaBA;
        if (!maBA && MaDT) {
            const [[row]] = await connection.query("SELECT MaBA FROM DonThuoc WHERE MaDT = ? LIMIT 1", [MaDT]);
            maBA = row?.MaBA || null;
        }
        if (!maBA) return null;

        const invoice = await getOrCreateInvoiceForVisit({ MaBA: maBA, connection });
        await InvoicesModel.replaceDrugDetailsFromDispense(invoice.MaHD, connection);
        const details = await InvoicesModel.getDetails(invoice.MaHD, connection);
        return await refreshInvoiceTotalsAndStatus(invoice.MaHD, details, connection);
    },

    remove: async (id) => {
        const current = await InvoicesModel.getById(id);
        if (!current) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        const decorated = await InvoicesService.getById(id);
        if (decorated.TrangThai === "DaThanhToan" || toNumber(decorated.DaThu, 0) > 0) {
            throw new Error("Không thể xóa hóa đơn đã có giao dịch thanh toán");
        }

        const affectedRows = await InvoicesModel.remove(id);
        if (!affectedRows) {
            throw new Error("Xóa hóa đơn thất bại");
        }

        return { message: "Đã xóa hóa đơn thành công" };
    }
};

export default InvoicesService;
