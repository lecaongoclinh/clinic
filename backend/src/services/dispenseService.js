import db from "../config/db.js";
import DispenseModel from "../models/dispenseModel.js";
import InvoicesService from "./invoicesService.js";

const NEAR_EXPIRY_DAYS = 90;
const WAREHOUSE_EXPORT_TYPES = new Set(["DieuChuyenNoiBo", "TraNCC", "XuatHuy", "VienTro", "XuatKiemKe"]);

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
    if (!payload.MaNhanVien) throw new Error("Thiếu nhân viên thực hiện");
    if (!payload.LoaiXuat) throw new Error("Phiếu xuất phải có loại xuất");
    if (!payload.MaKho) throw new Error("Phiếu xuất phải chọn kho nguồn");

    if (payload.LoaiXuat === "BanChoBN") {
        if (!payload.MaDT) throw new Error("Cấp phát thuốc phải chọn đơn thuốc");
        return;
    }

    if (!WAREHOUSE_EXPORT_TYPES.has(payload.LoaiXuat)) {
        throw new Error("Loại xuất không hợp lệ");
    }
    if (payload.LoaiXuat === "DieuChuyenNoiBo" && !payload.MaKhoNhan) {
        throw new Error("Điều chuyển nội bộ phải chọn kho nhận");
    }
    if (payload.LoaiXuat === "DieuChuyenNoiBo" && String(payload.MaKhoNhan) === String(payload.MaKho)) {
        throw new Error("Kho nhận phải khác kho nguồn");
    }
    if (payload.LoaiXuat === "TraNCC" && !payload.MaNCC) throw new Error("Trả NCC phải chọn nhà cung cấp");
    if (payload.LoaiXuat === "TraNCC" && !payload.LyDo) throw new Error("Trả NCC phải nhập lý do trả");
    if (payload.LoaiXuat === "XuatHuy" && !payload.LyDo) throw new Error("Xuất hủy phải nhập lý do hủy");
    if (payload.LoaiXuat === "VienTro" && !payload.DonViNhan) throw new Error("Xuất viện trợ phải nhập đơn vị nhận");
    if (payload.LoaiXuat === "XuatKiemKe" && !payload.LyDo) throw new Error("Xuất kiểm kê phải nhập lý do kiểm kê");
}

function buildStockStatus(available, prescribed) {
    if (available >= prescribed) return "DuHang";
    if (available > 0) return "ThieuHang";
    return "HetHang";
}

function normalizeItems(items = []) {
    if (!Array.isArray(items) || !items.length) {
        throw new Error("Phiếu xuất phải có ít nhất 1 dòng thuốc");
    }

    return items.map((item) => {
        const soLuong = Math.round(toNumber(item.SoLuong));
        if (!item.MaThuoc) throw new Error("Thiếu mã thuốc trong chi tiết phiếu");
        if (!Number.isInteger(soLuong) || soLuong <= 0) {
            throw new Error(`Số lượng xuất không hợp lệ cho thuốc ${item.TenThuoc || item.MaThuoc}`);
        }

        return {
            MaThuoc: Number(item.MaThuoc),
            MaLo: item.MaLo ? Number(item.MaLo) : null,
            TenThuoc: item.TenThuoc || "",
            HoatChat: item.HoatChat || "",
            SoLuong: soLuong,
            DonGia: toNumber(item.DonGia),
            DonVi: item.DonVi || item.DonViCoBan || "",
            LieuDung: item.LieuDung || "",
            GhiChu: item.GhiChu || "",
            SoLuongNhap: item.SoLuongNhap || null,
            DonViNhap: item.DonViNhap || ""
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
            warnings.push({ level: "danger", code: "expired", message: "Lô đã hết hạn và bị chặn xuất" });
        } else if (diffDays <= NEAR_EXPIRY_DAYS) {
            warnings.push({ level: "warning", code: "near_expiry", message: `Lô cận date còn ${diffDays} ngày` });
        }
    }

    if (lot.NhietDoBaoQuan) {
        warnings.push({ level: "info", code: "storage", message: `Bảo quản: ${lot.NhietDoBaoQuan}` });
    }
    return warnings;
}

async function buildAllocationPreview({ MaThuoc, SoLuong, MaKho, MaNCC = null, connection = db, strict = false, useImportPrice = false }) {
    const lots = await DispenseModel.getMedicineLots({ MaThuoc, MaKho, MaNCC, connection });
    let remaining = SoLuong;
    const allocations = [];
    const warnings = [];

    for (const lot of lots) {
        if (remaining <= 0) break;
        const available = toNumber(lot.Ton);
        if (available <= 0) continue;
        const allocateQty = Math.min(available, remaining);
        const giaNhap = toNumber(lot.GiaNhap);
        const giaBan = toNumber(lot.GiaBan);
        const donGia = useImportPrice ? giaNhap : (giaBan > 0 ? giaBan : giaNhap);
        allocations.push({
            MaLo: lot.MaLo,
            MaKho: lot.MaKho,
            TenKho: lot.TenKho,
            SoLo: lot.SoLo,
            HanSuDung: lot.HanSuDung,
            NgaySanXuat: lot.NgaySanXuat,
            NhietDoBaoQuan: lot.NhietDoBaoQuan,
            MaNCC: lot.MaNCC,
            TenNCC: lot.TenNCC,
            NgayNhap: lot.NgayNhap,
            Ton: available,
            SoLuongXuat: allocateQty,
            GiaNhap: giaNhap,
            GiaBan: giaBan,
            DonGia: donGia,
            ThanhTien: allocateQty * donGia,
            warnings: buildLotWarning(lot)
        });
        remaining -= allocateQty;
    }

    if (remaining > 0) {
        if (strict) throw new Error(`Không đủ tồn kho để xuất thuốc mã ${MaThuoc}`);
        warnings.push({ level: "danger", code: "out_of_stock", message: `Không đủ tồn kho (thiếu ${remaining})` });
    }
    if (allocations.length > 1) {
        warnings.push({ level: "info", code: "auto_split", message: `Đã tự tách ${allocations.length} lô theo FEFO` });
    }

    return { lots, allocations, warnings };
}

async function enrichItem(item, MaKho, connection = db, strict = false, useImportPrice = false, MaNCC = null) {
    const preview = await buildAllocationPreview({ MaThuoc: item.MaThuoc, SoLuong: item.SoLuong, MaKho, MaNCC, connection, strict, useImportPrice });
    const firstLot = preview.allocations[0] || null;

    return {
        ...item,
        DonGia: preview.allocations[0]?.DonGia || item.DonGia || 0,
        LoSoLuong: preview.allocations.length,
        SoLo: firstLot?.SoLo || "",
        HanSuDung: firstLot?.HanSuDung || null,
        NgaySanXuat: firstLot?.NgaySanXuat || null,
        DonViCoBan: item.DonViCoBan || item.DonVi || "",
        Ton: preview.lots.reduce((sum, lot) => sum + toNumber(lot.Ton), 0),
        ThanhTien: preview.allocations.reduce((sum, row) => sum + toNumber(row.ThanhTien), 0),
        allocations: preview.allocations,
        warnings: [
            ...preview.warnings,
            ...preview.allocations.flatMap(a => a.warnings || [])
        ]
    };
}

async function enrichReturnSupplierLotItem(item, payload, connection = db, forUpdate = false) {
    const lotId = item.MaLo || item.allocations?.[0]?.MaLo;
    if (!lotId) throw new Error("Trả NCC phải chọn chính xác lô thuốc");

    const lot = await DispenseModel.getLotById({ MaLo: lotId, connection, forUpdate });
    if (!lot) throw new Error(`Không tìm thấy lô thuốc ${lotId}`);
    if (["HetHan", "DaHuy"].includes(lot.TrangThai || "")) throw new Error(`Lô ${lot.SoLo} không còn hợp lệ để trả NCC`);
    if (String(lot.MaKho) !== String(payload.MaKho)) throw new Error("Lô thuốc không thuộc kho nguồn đã chọn");
    if (String(lot.MaNCC) !== String(payload.MaNCC)) throw new Error("Lô thuốc không thuộc nhà cung cấp đã chọn");
    if (toNumber(lot.Ton) < toNumber(item.SoLuong)) throw new Error(`Không đủ tồn để trả lô ${lot.SoLo}`);

    const donGia = toNumber(lot.GiaNhap);
    const allocation = {
        MaLo: lot.MaLo,
        MaThuoc: lot.MaThuoc,
        MaKho: lot.MaKho,
        MaNCC: lot.MaNCC,
        SoLo: lot.SoLo,
        HanSuDung: lot.HanSuDung,
        NgaySanXuat: lot.NgaySanXuat,
        Ton: toNumber(lot.Ton),
        SoLuongXuat: toNumber(item.SoLuong),
        GiaNhap: donGia,
        DonGia: donGia,
        ThanhTien: toNumber(item.SoLuong) * donGia,
        warnings: []
    };

    return {
        ...item,
        MaLo: lot.MaLo,
        MaThuoc: lot.MaThuoc,
        TenThuoc: lot.TenThuoc || item.TenThuoc || "",
        HoatChat: lot.HoatChat || item.HoatChat || "",
        DonViCoBan: lot.DonViCoBan || item.DonVi || "",
        SoLo: lot.SoLo,
        HanSuDung: lot.HanSuDung,
        NgaySanXuat: lot.NgaySanXuat,
        Ton: toNumber(lot.Ton),
        DonGia: donGia,
        ThanhTien: allocation.ThanhTien,
        allocations: [allocation],
        warnings: []
    };
}

function buildAutoNote(payload) {
    if (payload.LoaiXuat === "BanChoBN") return payload.MaDT ? `Theo đơn #${payload.MaDT}` : "Cấp phát cho bệnh nhân";
    if (payload.LoaiXuat === "DieuChuyenNoiBo") return "Điều chuyển nội bộ";
    if (payload.LoaiXuat === "TraNCC") return "Trả nhà cung cấp";
    if (payload.LoaiXuat === "XuatHuy") return "Xuất hủy thuốc";
    if (payload.LoaiXuat === "VienTro") return "Xuất viện trợ";
    if (payload.LoaiXuat === "XuatKiemKe") return "Điều chỉnh giảm sau kiểm kê";
    return "";
}

const DispenseService = {
    getBootstrap: async (MaKho) => DispenseModel.getBootstrap(MaKho || null),
    getDispenseWarehouse: async () => DispenseModel.getDispenseWarehouse(),
    getCatalog: async (filters = {}) => DispenseModel.getCatalog(filters),
    getReturnableSupplierLots: async ({ search = "", MaKho, MaNCC }) => {
        if (!MaKho) throw new Error("Vui lòng chọn kho nguồn");
        if (!MaNCC) throw new Error("Vui lòng chọn nhà cung cấp");
        return DispenseModel.getReturnableSupplierLots({ search, MaKho, MaNCC });
    },
    getMedicinePreview: async ({ MaThuoc, MaKho, MaNCC = null, SoLuong = 1 }) => enrichItem(normalizeItems([{ MaThuoc, SoLuong }])[0], MaKho || null, db, false, Boolean(MaNCC), MaNCC || null),
    getPendingPrescriptions: async () => DispenseModel.getPendingPrescriptions(),

    getPrescriptionDetail: async ({ MaDT }) => {
        const dispensingWarehouse = await DispenseModel.getDispenseWarehouse();
        const effectiveMaKho = dispensingWarehouse?.MaKho || null;
        if (!effectiveMaKho) throw new Error("Chưa cấu hình kho cấp phát");

        const rows = await DispenseModel.getPrescriptionDetail({ MaDT });
        if (!rows.length) throw new Error("Không tìm thấy đơn thuốc");

        const header = {
            MaDT: rows[0].MaDT,
            NgayKeDon: rows[0].NgayKeDon,
            TrangThai: rows[0].TrangThai,
            MaBN: rows[0].MaBN,
            HoTen: rows[0].HoTen,
            MaKho: effectiveMaKho,
            TenKho: dispensingWarehouse.TenKho
        };

        const items = [];
        for (const row of rows) {
            const soLuongKe = toNumber(row.SoLuongKe);
            const enriched = await enrichItem({
                MaThuoc: row.MaThuoc,
                TenThuoc: row.TenThuoc,
                HoatChat: row.HoatChat,
                SoLuong: soLuongKe,
                DonGia: row.GiaBan,
                DonVi: row.DonViCoBan,
                LieuDung: row.LieuDung
            }, effectiveMaKho, db, false);
            const tongTonQuay = toNumber(enriched.Ton);
            const soLuongCoTheXuat = Math.min(soLuongKe, tongTonQuay);
            const soLuongThieu = Math.max(soLuongKe - tongTonQuay, 0);
            items.push({
                ...enriched,
                TongTonQuay: tongTonQuay,
                SoLuongKe: soLuongKe,
                SoLuong: soLuongKe,
                SoLuongCoTheXuat: soLuongCoTheXuat,
                SoLuongThieu: soLuongThieu,
                TrangThaiTon: buildStockStatus(tongTonQuay, soLuongKe),
                allocations: (enriched.allocations || []).filter(allocation => toNumber(allocation.SoLuongXuat) > 0)
            });
        }

        return { header, items };
    },

    getAlternativeMedicines: async ({ MaThuoc, MaKho = null }) => DispenseModel.getAlternativeMedicines({ MaThuoc, MaKho }),
    getRecentHistory: async ({ MaThuoc = null, limit = 8 } = {}) => DispenseModel.getRecentHistory({ MaThuoc, limit }),

    saveDraft: async (payload) => {
        if (payload.LoaiXuat === "BanChoBN") {
            const dispensingWarehouse = await DispenseModel.getDispenseWarehouse();
            if (!dispensingWarehouse?.MaKho) throw new Error("Chưa cấu hình kho cấp phát");
            payload = { ...payload, MaKho: dispensingWarehouse.MaKho };
        }

        validateHeader(payload);

        if (payload.MaDT) {
            const prescription = await DispenseModel.getPrescriptionStatus({ MaDT: payload.MaDT });
            if (!prescription) throw new Error("Không tìm thấy đơn thuốc");
            if (prescription.TrangThai === "DaXuat") throw new Error("Đơn thuốc đã được xuất");
        }

        const items = normalizeItems(payload.items);
        const enrichedItems = [];
        for (const item of items) {
            enrichedItems.push(payload.LoaiXuat === "TraNCC"
                ? await enrichReturnSupplierLotItem(item, payload, db, false)
                : await enrichItem(item, payload.MaKho, db, true, payload.LoaiXuat !== "BanChoBN", null));
        }

        const tongTien = ["BanChoBN", "TraNCC"].includes(payload.LoaiXuat)
            ? enrichedItems.reduce((sum, item) => sum + toNumber(item.ThanhTien), 0)
            : 0;

        const noteData = {
            note: payload.GhiChu || buildAutoNote(payload),
            meta: {
                MaKhoNhan: payload.MaKhoNhan || null,
                TenKhoNhan: payload.TenKhoNhan || "",
                MaNCC: payload.MaNCC || null,
                TenNCC: payload.TenNCC || "",
                DonViNhan: payload.DonViNhan || "",
                BienBanKiemKe: payload.BienBanKiemKe || "",
                LyDo: payload.LyDo || "",
                isPartialDispense: Boolean(payload.isPartialDispense),
                shortageItems: Array.isArray(payload.shortageItems) ? payload.shortageItems : [],
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
            await DispenseModel.updateDraftHeader({ MaPX: payload.MaPX, payload: payloadToSave, noteData });
            return { MaPX: payload.MaPX, SoPhieu: `PX-${String(payload.MaPX).padStart(5, "0")}`, TrangThai: "Nhap", TongTien: tongTien, items: enrichedItems };
        }

        const MaPX = await DispenseModel.createDraftHeader({ payload: payloadToSave, noteData });
        return { MaPX, SoPhieu: `PX-${String(MaPX).padStart(5, "0")}`, TrangThai: "Nhap", TongTien: tongTien, items: enrichedItems };
    },

    getDraftById: async (MaPX) => {
        const draft = await DispenseModel.getDraftHeaderById({ MaPX });
        if (!draft) throw new Error("Không tìm thấy phiếu xuất");
        const parsed = parseDraftNote(draft.GhiChu);
        return { ...draft, SoPhieu: `PX-${String(draft.MaPX).padStart(5, "0")}`, GhiChuText: parsed.note, Meta: parsed.meta, items: parsed.items };
    },

    completeDraft: async (MaPX) => {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const draft = await DispenseModel.getDraftHeaderById({ MaPX, connection, forUpdate: true });
            if (!draft) throw new Error("Phiếu xuất không tồn tại");
            if (draft.TrangThai !== "Nhap") throw new Error("Phiếu xuất đã hoàn thành hoặc đã hủy");

            if (draft.MaDT) {
                const prescription = await DispenseModel.getPrescriptionStatus({ MaDT: draft.MaDT, connection, forUpdate: true });
                if (!prescription) throw new Error("Không tìm thấy đơn thuốc");
                if (prescription.TrangThai === "DaXuat") throw new Error("Đơn thuốc đã được xuất");
            }

            const parsed = parseDraftNote(draft.GhiChu);
            const items = normalizeItems(parsed.items);
            const completedItems = [];
            const meta = parsed.meta || {};

            for (const item of items) {
                const enriched = draft.LoaiXuat === "TraNCC"
                    ? await enrichReturnSupplierLotItem(item, { ...draft, MaNCC: draft.MaNCC }, connection, true)
                    : await enrichItem(item, draft.MaKho, connection, true, draft.LoaiXuat !== "BanChoBN", null);
                for (const allocation of enriched.allocations) {
                    await DispenseModel.insertExportDetail({ MaPX, MaLo: allocation.MaLo, SoLuong: allocation.SoLuongXuat, DonGia: allocation.DonGia, ThanhTien: allocation.ThanhTien, connection });
                    await DispenseModel.updateLotExportQuantity({ MaLo: allocation.MaLo, SoLuong: allocation.SoLuongXuat, connection });
                    await DispenseModel.insertStockHistory({ MaPX, MaLo: allocation.MaLo, SoLuong: allocation.SoLuongXuat, connection, Loai: "Xuat", GhiChu: parsed.note || buildAutoNote(draft) });

                    if (draft.LoaiXuat === "DieuChuyenNoiBo") {
                        const sourceLot = await DispenseModel.getLotById({ MaLo: allocation.MaLo, connection, forUpdate: true });
                        const targetLotId = await DispenseModel.upsertTransferLot({ sourceLot, MaKhoNhan: meta.MaKhoNhan, SoLuong: allocation.SoLuongXuat, MaPX, connection });
                        await DispenseModel.insertStockHistory({ MaPX, MaLo: targetLotId, SoLuong: allocation.SoLuongXuat, connection, Loai: "Nhap", GhiChu: `Nhập điều chuyển từ phiếu xuất #${MaPX}` });
                    }
                }
                completedItems.push(enriched);
            }

            if (draft.MaDT) {
                const fullyDispensed = !meta.isPartialDispense
                    && (!Array.isArray(meta.shortageItems) || meta.shortageItems.length === 0);
                if (fullyDispensed) {
                    await DispenseModel.markPrescriptionExported({ MaDT: draft.MaDT, connection });
                } else if (await DispenseModel.supportsPartialPrescriptionStatus({ connection })) {
                    await DispenseModel.markPrescriptionPartiallyExported({ MaDT: draft.MaDT, connection });
                }
            }

            const tongTien = ["BanChoBN", "TraNCC"].includes(draft.LoaiXuat)
                ? completedItems.reduce((sum, item) => sum + toNumber(item.ThanhTien), 0)
                : 0;

            await DispenseModel.completeDraftHeader({
                MaPX,
                TongTien: tongTien,
                noteData: { ...parsed, meta: { ...meta, completedAt: new Date().toISOString() } },
                connection
            });

            if (draft.MaDT) {
                await InvoicesService.syncDispenseToInvoice({ MaDT: draft.MaDT, connection });
            }

            await connection.commit();
            return { MaPX, SoPhieu: `PX-${String(MaPX).padStart(5, "0")}`, message: "Hoàn thành phiếu xuất thành công", items: completedItems, TongTien: tongTien };
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
};

export { buildAllocationPreview };
export default DispenseService;
