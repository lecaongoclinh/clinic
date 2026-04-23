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
        .filter(item => item?.type === "payment")
        .reduce((sum, item) => sum + Math.max(toNumber(item.amount, 0), 0), 0);
    const refunds = paymentHistory
        .filter(item => item?.type === "refund")
        .reduce((sum, item) => sum + Math.max(toNumber(item.amount, 0), 0), 0);

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

function decorateInvoice(invoice = {}, details = null) {
    const { plainNote } = parseInvoiceMeta(invoice.GhiChu);
    const adjustments = extractAdjustments(invoice);
    const paymentHistory = extractPaymentHistory(invoice);
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
        .find(item => item?.type === "payment" && item.method)?.method;

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
            .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
            .map(item => ({
                LoaiGiaoDich: item.type === "refund" ? "HoanTien" : "ThanhToan",
                PhuongThucThanhToan: item.method || invoice.PhuongThucThanhToan || "TienMat",
                SoTienThanhToan: Math.max(toNumber(item.amount, 0), 0),
                NgayThanhToan: item.time || null
            }))
    };
}

async function syncInvoiceDetailsAndTotals(invoiceId, connection = db) {
    const invoice = await InvoicesModel.getById(invoiceId, connection);
    if (!invoice) {
        throw new Error("Không tìm thấy hóa đơn");
    }

    await InvoicesModel.replaceDrugDetailsFromDispense(invoiceId, connection);

    const details = await InvoicesModel.getDetails(invoiceId, connection);
    const adjustments = extractAdjustments(invoice);
    const totals = calculateInvoiceTotals(details, invoice.GiamGia, adjustments);

    await InvoicesModel.update(invoiceId, {
        MaBA: invoice.MaBA,
        MaPX: invoice.MaPX,
        MaNhanVien: invoice.MaNhanVien,
        PhuongThucThanhToan: invoice.PhuongThucThanhToan,
        TrangThai: invoice.TrangThai,
        MaHoaDon: invoice.MaHoaDon,
        TongTien: totals.TongTien,
        GiamGia: toNumber(invoice.GiamGia, 0),
        ThanhTienCuoi: totals.ThanhTienCuoi,
        HanThanhToan: invoice.HanThanhToan,
        GhiChu: invoice.GhiChu,
        connection
    });

    const refreshedInvoice = await InvoicesModel.getById(invoiceId, connection);
    const refreshedDetails = await InvoicesModel.getDetails(invoiceId, connection);

    return {
        invoice: decorateInvoice(refreshedInvoice, refreshedDetails),
        details: refreshedDetails
    };
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
            invoices: invoices.map((invoice) => decorateInvoice(invoice)),
            doctors
        };
    },

    getAll: async (filters = {}) => {
        const invoices = await InvoicesModel.getAll(filters);
        return invoices.map((invoice) => decorateInvoice(invoice));
    },

    getById: async (id) => {
        const invoice = await InvoicesModel.getById(id);
        if (!invoice) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        const details = await InvoicesModel.getDetails(id);
        return decorateInvoice(invoice, details);
    },

    getDetails: async (id) => {
        const invoice = await InvoicesModel.getById(id);
        if (!invoice) {
            throw new Error("Không tìm thấy hóa đơn");
        }

        return await InvoicesModel.getDetails(id);
    },

    create: async (payload) => {
        if (!payload.MaBA) {
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
            const paymentHistory = extractPaymentHistory(synced.invoice);
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

            const parsedNote = parseInvoiceMeta(current.GhiChu);
            const updatedHistory = [
                ...(parsedNote.meta.paymentHistory || []),
                {
                    type: "payment",
                    amount: soTienThanhToan,
                    method: paymentMethod.displayMethod,
                    time: new Date().toISOString()
                }
            ];
            const daThuMoi = totalPaid + soTienThanhToan;
            const conNoMoi = Math.max(toNumber(synced.invoice.ThanhTienCuoi, 0) - daThuMoi, 0);

            await InvoicesModel.updatePaymentState(id, {
                TrangThai: conNoMoi === 0 ? "DaThanhToan" : "ChuaThanhToan",
                PhuongThucThanhToan: paymentMethod.storageMethod,
                NgayThanhToan: conNoMoi === 0 ? new Date() : null,
                GhiChu: buildInvoiceNote(parsedNote.plainNote, {
                    adjustments: parsedNote.meta.adjustments,
                    paymentHistory: updatedHistory
                }),
                connection
            });

            const finalInvoice = await InvoicesModel.getById(id, connection);
            const finalDetails = await InvoicesModel.getDetails(id, connection);

            await connection.commit();
            return decorateInvoice(finalInvoice, finalDetails);
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

        const parsedNote = parseInvoiceMeta(current.GhiChu);
        const updatedHistory = [
            ...(parsedNote.meta.paymentHistory || []),
            {
                type: "refund",
                amount: soTienHoan,
                method: payload.PhuongThucThanhToan || currentDetail.PhuongThucThanhToan || "TienMat",
                time: new Date().toISOString()
            }
        ];
        const daThuMoi = daThu - soTienHoan;
        const conNoMoi = Math.max(toNumber(currentDetail.ThanhTienCuoi, 0) - daThuMoi, 0);
        const currentMethod = normalizePaymentMethod(currentDetail.PhuongThucThanhToan);

        await InvoicesModel.updatePaymentState(id, {
            TrangThai: conNoMoi === 0 ? "DaThanhToan" : "ChuaThanhToan",
            PhuongThucThanhToan: daThuMoi > 0 ? currentMethod.storageMethod : null,
            NgayThanhToan: conNoMoi === 0 ? (current.NgayThanhToan || new Date()) : null,
            GhiChu: buildInvoiceNote(parsedNote.plainNote, {
                adjustments: parsedNote.meta.adjustments,
                paymentHistory: updatedHistory
            })
        });

        return await InvoicesService.getById(id);
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
