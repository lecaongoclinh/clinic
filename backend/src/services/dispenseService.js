import db from "../config/db.js";
import DispenseModel from "../models/dispenseModel.js";

const NEAR_EXPIRY_DAYS = 90;

function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function parseDraftNote(rawNote) {
    if (!rawNote) return { note: "", meta: {}, items: [] };

    try {
        const parsed = JSON.parse(rawNote);
        return {
            note: parsed.note || "",
            meta: parsed.meta || {},
            items: Array.isArray(parsed.items) ? parsed.items : []
        };
    } catch {
        return { note: String(rawNote), meta: {}, items: [] };
    }
}

function validateHeader(payload) {
    if (!payload.MaKho) throw new Error("Phi?u xu?t ph?i ch?n kho");
    if (!payload.LoaiXuat) throw new Error("Phi?u xu?t ph?i có lo?i xu?t");
    if (!payload.MaNhanVien) throw new Error("Thi?u nhân viên th?c hi?n");
    if (payload.LoaiXuat === "BanChoBN" && !payload.MaBN && !payload.MaDT) throw new Error("Xu?t cho b?nh nhân ph?i ch?n b?nh nhân ho?c don thu?c");
    if (payload.LoaiXuat === "NoiBo" && !payload.MaKhoa) throw new Error("Xu?t n?i b? ph?i ch?n khoa");
    if (payload.LoaiXuat === "TraNCC" && !payload.MaNCC) throw new Error("Tr? NCC ph?i ch?n nhà cung c?p");
    if (payload.LoaiXuat === "Huy" && !payload.LyDo) throw new Error("H?y phi?u ph?i nh?p lý do");
}

function normalizeItems(items = []) {
    if (!Array.isArray(items) || !items.length) {
        throw new Error("Phi?u xu?t ph?i có ít nh?t 1 dòng thu?c");
    }

    return items.map((item) => {
        const soLuong = Math.round(toNumber(item.SoLuong));

        if (!item.MaThuoc) throw new Error("Thi?u mã thu?c trong chi ti?t phi?u");
        if (!Number.isInteger(soLuong) || soLuong <= 0) {
            throw new Error(`S? lu?ng xu?t không h?p l? cho thu?c ${item.TenThuoc || item.MaThuoc}`);
        }

        return {
            MaThuoc: Number(item.MaThuoc),
            TenThuoc: item.TenThuoc || "",
            HoatChat: item.HoatChat || "",
            SoLuong: soLuong,
            DonGia: toNumber(item.DonGia),
            DonVi: item.DonVi || item.DonViCoBan || "",
            LieuDung: item.LieuDung || "",
            GhiChu: item.GhiChu || ""
        };
    });
}

function buildLotWarning(lot) {
    const warnings = [];
    const today = new Date();
    const expiry = lot.HanSuDung ? new Date(lot.HanSuDung) : null;

    if (expiry && !Number.isNaN(expiry.getTime())) {
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

        if (diffDays <= 0) {
            warnings.push({ level: "danger", code: "expired", message: "Lô dã h?t h?n và b? ch?n xu?t" });
        } else if (diffDays <= NEAR_EXPIRY_DAYS) {
            warnings.push({ level: "warning", code: "near_expiry", message: `Lô c?n date còn ${diffDays} ngày` });
        }
    }

    if (lot.NhietDoBaoQuan) {
        warnings.push({ level: "info", code: "storage", message: `B?o qu?n: ${lot.NhietDoBaoQuan}` });
    }

    return warnings;
}

async function buildAllocationPreview({ MaThuoc, SoLuong, MaKho, connection = db }) {
    const lots = await DispenseModel.getMedicineLots({ MaThuoc, MaKho, connection });
    let remaining = SoLuong;
    const allocations = [];
    const warnings = [];

    for (const lot of lots) {
        if (remaining <= 0) break;

        const available = toNumber(lot.Ton);
        if (available <= 0) continue;

        const allocateQty = Math.min(available, remaining);
        allocations.push({
            MaLo: lot.MaLo,
            SoLo: lot.SoLo,
            HanSuDung: lot.HanSuDung,
            NgaySanXuat: lot.NgaySanXuat,
            NhietDoBaoQuan: lot.NhietDoBaoQuan,
            TenNCC: lot.TenNCC,
            NgayNhap: lot.NgayNhap,
            Ton: available,
            SoLuongXuat: allocateQty,
            DonGia: toNumber(lot.GiaBan) > 0 
    ? toNumber(lot.GiaBan) 
    : toNumber(lot.GiaNhap),
            ThanhTien: allocateQty * toNumber(lot.GiaBan || lot.GiaNhap),
            warnings: buildLotWarning(lot)
        });
        remaining -= allocateQty;
    }

    if (remaining > 0) {
        throw new Error(`Không d? t?n d? xu?t thu?c mã ${MaThuoc}`);
    }

    if (allocations.length > 1) {
        warnings.push({ level: "info", code: "auto_split", message: `Ðã t? tách ${allocations.length} lô theo FEFO` });
    }

    return { lots, allocations, warnings };
}

async function enrichItem(item, MaKho, connection = db) {
    const preview = await buildAllocationPreview({ MaThuoc: item.MaThuoc, SoLuong: item.SoLuong, MaKho, connection });
    const firstLot = preview.allocations[0] || null;

    return {
    ...item,

    // 🔥 FIX: lấy giá trung bình hoặc lô đầu
    DonGia: preview.allocations[0]?.DonGia || 0,

    LoSoLuong: preview.allocations.length,
    SoLo: firstLot?.SoLo || "",
    HanSuDung: firstLot?.HanSuDung || null,
    NgaySanXuat: firstLot?.NgaySanXuat || null,
    DonViCoBan: item.DonViCoBan || item.DonVi || "",
    Ton: preview.lots.reduce((sum, lot) => sum + toNumber(lot.Ton), 0),

    // 🔥 FIX: tổng tiền chuẩn từ allocations
    ThanhTien: preview.allocations.reduce(
        (sum, row) => sum + toNumber(row.ThanhTien),
        0
    ),

    allocations: preview.allocations,

    warnings: [
        ...preview.warnings,
        ...preview.allocations.flatMap(a => a.warnings || [])
    ]
};
}

const DispenseService = {
    getBootstrap: async (MaKho) => DispenseModel.getBootstrap(MaKho || null),
    getCatalog: async (filters = {}) => DispenseModel.getCatalog(filters),
    getMedicinePreview: async ({ MaThuoc, MaKho, SoLuong = 1 }) => enrichItem(normalizeItems([{ MaThuoc, SoLuong }])[0], MaKho || null),
    getPendingPrescriptions: async () => DispenseModel.getPendingPrescriptions(),

    getPrescriptionDetail: async ({ MaDT, MaKho = null }) => {
        const rows = await DispenseModel.getPrescriptionDetail({ MaDT, MaKho });
        if (!rows.length) throw new Error("Không tìm th?y don thu?c");

        const header = {
            MaDT: rows[0].MaDT,
            NgayKeDon: rows[0].NgayKeDon,
            TrangThai: rows[0].TrangThai,
            MaBN: rows[0].MaBN,
            HoTen: rows[0].HoTen
        };

        const items = [];
        for (const row of rows) {
            items.push(await enrichItem({
                MaThuoc: row.MaThuoc,
                TenThuoc: row.TenThuoc,
                HoatChat: row.HoatChat,
                SoLuong: row.SoLuong,
                DonGia: row.GiaBan,
                DonVi: row.DonViCoBan,
                LieuDung: row.LieuDung
            }, MaKho));
        }

        return { header, items };
    },

    getAlternativeMedicines: async ({ MaThuoc, MaKho = null }) => DispenseModel.getAlternativeMedicines({ MaThuoc, MaKho }),
    getRecentHistory: async ({ MaThuoc = null, limit = 8 } = {}) => DispenseModel.getRecentHistory({ MaThuoc, limit }),

    saveDraft: async (payload) => {
    validateHeader(payload);

    const items = normalizeItems(payload.items);
    const enrichedItems = [];

    for (const item of items) {
        enrichedItems.push(await enrichItem(item, payload.MaKho));
    }

    const tongTien = enrichedItems.reduce(
        (sum, item) => sum + toNumber(item.ThanhTien),
        0
    );

    const autoNote =
        payload.LoaiXuat === "BanChoBN"
            ? (payload.MaDT
                ? `Theo đơn #${payload.MaDT}`
                : (payload.MaBN ? `Xuất cho bệnh nhân mã ${payload.MaBN}` : "Xuất cho bệnh nhân"))
            : payload.LoaiXuat === "NoiBo"
                ? "Xuất nội bộ"
                : payload.LoaiXuat === "TraNCC"
                    ? "Trả nhà cung cấp"
                    : payload.LoaiXuat === "Huy"
                        ? "Hủy thuốc"
                        : "";

    const noteData = {
        note: payload.GhiChu || autoNote,
        meta: {
            MaKhoa: payload.MaKhoa || null,
            TenKhoa: payload.TenKhoa || "",
            MaNCC: payload.MaNCC || null,
            TenNCC: payload.TenNCC || "",
            LyDo: payload.LyDo || "",
            updatedAt: new Date().toISOString()
        },
        items: enrichedItems
    };

    const payloadToSave = {
        ...payload,
        NgayXuat: payload.NgayXuat || new Date().toISOString().slice(0, 19).replace("T", " "),
        TongTien: tongTien
    };

    if (payload.MaPX) {
        const current = await DispenseModel.getDraftHeaderById({ MaPX: payload.MaPX });
        if (!current) throw new Error("Phiếu xuất không tồn tại");
        if (current.TrangThai !== "Nhap") throw new Error("Chỉ được cập nhật phiếu ở trạng thái nháp");

        await DispenseModel.updateDraftHeader({
            MaPX: payload.MaPX,
            payload: payloadToSave,
            noteData
        });

        return {
            MaPX: payload.MaPX,
            SoPhieu: `PX-${String(payload.MaPX).padStart(5, "0")}`,
            TrangThai: "Nhap",
            TongTien: tongTien,
            items: enrichedItems
        };
    }

    const MaPX = await DispenseModel.createDraftHeader({
        payload: payloadToSave,
        noteData
    });

    return {
        MaPX,
        SoPhieu: `PX-${String(MaPX).padStart(5, "0")}`,
        TrangThai: "Nhap",
        TongTien: tongTien,
        items: enrichedItems
    };
},
    getDraftById: async (MaPX) => {
        const draft = await DispenseModel.getDraftHeaderById({ MaPX });
        if (!draft) throw new Error("Không tìm th?y phi?u xu?t");

        const parsed = parseDraftNote(draft.GhiChu);
        return {
            ...draft,
            SoPhieu: `PX-${String(draft.MaPX).padStart(5, "0")}`,
            GhiChuText: parsed.note,
            Meta: parsed.meta,
            items: parsed.items
        };
    },

    completeDraft: async (MaPX) => {
        let connection;

        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const draft = await DispenseModel.getDraftHeaderById({ MaPX, connection, forUpdate: true });
            if (!draft) throw new Error("Phi?u xu?t không t?n t?i");
            if (draft.TrangThai !== "Nhap") throw new Error("Phi?u xu?t dã hoàn thành ho?c dã h?y");

            const parsed = parseDraftNote(draft.GhiChu);
            const items = normalizeItems(parsed.items);
            const completedItems = [];

            for (const item of items) {
                const enriched = await enrichItem(item, draft.MaKho, connection);

               for (const allocation of enriched.allocations) {
                await DispenseModel.insertExportDetail({
                    MaPX,
                    MaLo: allocation.MaLo,
                    SoLuong: allocation.SoLuongXuat,
                    DonGia: allocation.DonGia,
                    ThanhTien: allocation.ThanhTien,
                    connection
                });

    // cập nhật tồn của lô theo đúng FEFO allocation
    await DispenseModel.updateLotExportQuantity({
        MaLo: allocation.MaLo,
        SoLuong: allocation.SoLuongXuat,
        connection
    });

    await DispenseModel.insertStockHistory({
        MaPX,
        MaLo: allocation.MaLo,
        SoLuong: allocation.SoLuongXuat,
        connection
    });
}

                completedItems.push(enriched);
            }

            if (draft.MaDT) {
                await DispenseModel.markPrescriptionExported({ MaDT: draft.MaDT, connection });
            }

            const tongTien = completedItems.reduce((sum, item) => sum + toNumber(item.ThanhTien), 0);

            await DispenseModel.completeDraftHeader({
                MaPX,
                TongTien: tongTien,
                noteData: {
                    ...parsed,
                    meta: {
                        ...(parsed.meta || {}),
                        completedAt: new Date().toISOString()
                    }
                },
                connection
            });

            await connection.commit();

            return {
                MaPX,
                SoPhieu: `PX-${String(MaPX).padStart(5, "0")}`,
                message: "Hoàn thành phi?u xu?t thành công",
                items: completedItems,
                TongTien: tongTien
            };
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
};

export default DispenseService;
