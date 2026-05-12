import db from "../config/db.js";
import ImportsModel from "../models/importsModel.js";

const IMPORT_TYPES = new Set(["NhapMua", "NhapTra", "NhapKiemKe", "NhapVienTro"]);

const IMPORT_TYPE_LABELS = {
    NhapMua: "Nhập mua",
    NhapTra: "Nhập trả",
    NhapKiemKe: "Nhập kiểm kê",
    NhapVienTro: "Nhập viện trợ"
};

const RETURN_SOURCE_LABELS = {
    BenhNhan: "Bệnh nhân",
    KhoaPhong: "Khoa/phòng sử dụng",
    KhoQuayThuoc: "Kho Quầy Thuốc",
    KhoThuocLanh: "Kho Thuốc Lạnh",
    Khac: "Khác"
};

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function cleanString(value) {
    return String(value || "").trim();
}

async function getTableColumns(connection, tableName) {
    const [rows] = await connection.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?`,
        [tableName]
    );
    return new Set(rows.map(row => row.COLUMN_NAME));
}

async function warnLegacyImportTriggers(connection) {
    const [triggers] = await connection.query(`
        SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_STATEMENT
        FROM INFORMATION_SCHEMA.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND EVENT_MANIPULATION = 'INSERT'
          AND EVENT_OBJECT_TABLE IN ('PhieuNhapThuoc', 'ChiTietPhieuNhap', 'LoThuoc')
    `);

    const riskyTriggers = triggers.filter(trigger => {
        const statement = String(trigger.ACTION_STATEMENT || "").toLowerCase();
        return statement.includes("lothuoc") || statement.includes("lichsukho");
    });

    if (riskyTriggers.length) {
        console.warn(
            `Legacy import triggers detected, please handle by migration if they duplicate stock logic: ${riskyTriggers.map(t => t.TRIGGER_NAME).join(", ")}`
        );
    }
}

function getReturnSourceText(data) {
    if (data.NguonTra === "Khac") {
        return cleanString(data.NguonTraKhac || data.NguonTraText);
    }
    return cleanString(data.NguonTraText) || RETURN_SOURCE_LABELS[data.NguonTra] || "";
}

function buildImportNote(data) {
    const { LoaiPhieu } = data;
    const parts = [];
    if (data.GhiChu) parts.push(cleanString(data.GhiChu));

    if (LoaiPhieu === "NhapTra") {
        const sourceText = getReturnSourceText(data);
        if (data.NguonTra) parts.push(`Nguồn trả mã: ${cleanString(data.NguonTra)}`);
        if (sourceText) parts.push(`Nguồn trả: ${sourceText}`);
        if (data.LyDoTra) parts.push(`Lý do trả: ${cleanString(data.LyDoTra)}`);
    }

    if (LoaiPhieu === "NhapKiemKe") {
        const reason = cleanString(data.LyDoKiemKe || data.LyDo || data.GhiChu);
        if (reason) parts.push(`Lý do kiểm kê: ${reason}`);
    }

    if (LoaiPhieu === "NhapVienTro") {
        const sponsor = cleanString(data.NguonNhap);
        if (sponsor) parts.push(`Đơn vị tài trợ: ${sponsor}`);
    }

    return parts.filter(Boolean).join("\n");
}

function validateImportHeader(data) {
    const LoaiPhieu = data.LoaiPhieu || "NhapMua";
    if (!IMPORT_TYPES.has(LoaiPhieu)) {
        throw new Error("Loại phiếu nhập không hợp lệ");
    }
    if (!data.MaNhanVien) {
        throw new Error("Thiếu nhân viên tạo phiếu nhập");
    }
    if (!data.MaKho) {
        throw new Error("Vui lòng chọn kho nhập");
    }
    if (!Array.isArray(data.details) || data.details.length === 0) {
        throw new Error("Phiếu nhập phải có ít nhất 1 thuốc");
    }
    if (LoaiPhieu === "NhapMua" && !data.MaNCC) {
        throw new Error("Nhập mua bắt buộc chọn nhà cung cấp");
    }
    if (LoaiPhieu === "NhapTra") {
        if (!cleanString(data.NguonTra)) {
            throw new Error("Nhập trả bắt buộc chọn nguồn trả");
        }
        if (data.NguonTra === "Khac" && !cleanString(data.NguonTraKhac || data.NguonTraText)) {
            throw new Error("Vui lòng ghi rõ nguồn trả");
        }
        if (!cleanString(data.LyDoTra || data.LyDo)) {
            throw new Error("Nhập trả bắt buộc nhập lý do trả");
        }
    }
    if (LoaiPhieu === "NhapKiemKe" && !cleanString(data.LyDoKiemKe || data.LyDo || data.GhiChu)) {
        throw new Error("Nhập kiểm kê cần có lý do kiểm kê");
    }
}

function normalizeDetail(item, LoaiPhieu) {
    const MaThuoc = item.MaThuoc;
    const SoLuongNhap = toNumber(item.SoLuongNhap);
    const HeSoQuyDoi = toNumber(item.HeSoQuyDoi, 1);
    const SoLuong = toNumber(item.SoLuong, SoLuongNhap * HeSoQuyDoi);
    const isZeroPriceType = LoaiPhieu === "NhapTra" || LoaiPhieu === "NhapKiemKe";
    const GiaNhap = isZeroPriceType ? 0 : Math.max(0, toNumber(item.GiaNhap));
    const SoLo = cleanString(item.SoLo);
    const HanSuDung = item.HanSuDung;
    const NgaySanXuat = item.NgaySanXuat;

    if (!MaThuoc) {
        throw new Error("Thiếu thuốc trong chi tiết phiếu nhập");
    }
    if (SoLuongNhap <= 0 || SoLuong <= 0) {
        throw new Error("Số lượng nhập phải lớn hơn 0");
    }
    if (HeSoQuyDoi <= 0) {
        throw new Error("Quy đổi phải lớn hơn 0");
    }
    if (LoaiPhieu === "NhapMua" && GiaNhap <= 0) {
        throw new Error("Nhập mua bắt buộc giá nhập lớn hơn 0");
    }
    if (!SoLo || !HanSuDung || !NgaySanXuat) {
        throw new Error("Thiếu số lô, NSX hoặc HSD");
    }

    const nsxDate = parseDate(NgaySanXuat);
    const hsdDate = parseDate(HanSuDung);
    if (!nsxDate || !hsdDate) {
        throw new Error(`NSX hoặc HSD của lô ${SoLo} không hợp lệ`);
    }
    if (hsdDate <= nsxDate) {
        throw new Error(`HSD phải sau NSX của lô ${SoLo}`);
    }

    return {
        MaThuoc,
        SoLuong,
        GiaNhap,
        DonViNhap: item.DonViNhap || null,
        SoLuongNhap,
        HeSoQuyDoi,
        SoLo,
        HanSuDung,
        NgaySanXuat,
        ThanhTien: SoLuong * GiaNhap
    };
}

async function insertImportHeader(connection, data, columns, tongTien) {
    const insertColumns = ["MaNCC", "MaNhanVien", "MaKho", "LoaiPhieu", "GhiChu", "TongTien"];
    const values = [
        data.MaNCC || null,
        data.MaNhanVien,
        data.MaKho,
        data.LoaiPhieu,
        data.GhiChu || null,
        tongTien
    ];

    if (columns.has("TrangThai")) {
        insertColumns.push("TrangThai");
        values.push("HoanThanh");
    }

    const placeholders = insertColumns.map(() => "?").join(", ");
    const [result] = await connection.query(
        `INSERT INTO PhieuNhapThuoc (${insertColumns.join(", ")}) VALUES (${placeholders})`,
        values
    );
    return result.insertId;
}

async function insertImportDetail(connection, MaPN, item, detailPrice, columns) {
    const insertColumns = ["MaPN", "MaThuoc", "SoLuong", "GiaNhap", "DonViNhap", "SoLuongNhap", "HeSoQuyDoi"];
    const values = [
        MaPN,
        item.MaThuoc,
        item.SoLuong,
        detailPrice,
        item.DonViNhap,
        item.SoLuongNhap,
        item.HeSoQuyDoi
    ];

    if (columns.has("SoLo")) {
        insertColumns.push("SoLo");
        values.push(item.SoLo);
    }
    if (columns.has("NgaySanXuat")) {
        insertColumns.push("NgaySanXuat");
        values.push(item.NgaySanXuat);
    }
    if (columns.has("HanSuDung")) {
        insertColumns.push("HanSuDung");
        values.push(item.HanSuDung);
    }

    const placeholders = insertColumns.map(() => "?").join(", ");
    const [result] = await connection.query(
        `INSERT INTO ChiTietPhieuNhap (${insertColumns.join(", ")}) VALUES (${placeholders})`,
        values
    );
    return result.insertId;
}

async function upsertLot(connection, { item, MaKho, MaNCC, MaCTPN }) {
    const [existingLots] = await connection.query(
        `SELECT MaLo, SoLuongNhap
         FROM LoThuoc
         WHERE MaThuoc = ?
           AND MaKho = ?
           AND SoLo = ?
           AND COALESCE(TrangThai, 'ConHan') != 'DaHuy'
         LIMIT 1
         FOR UPDATE`,
        [item.MaThuoc, MaKho, item.SoLo]
    );

    if (existingLots.length) {
        const MaLo = existingLots[0].MaLo;
        await connection.query(
            `UPDATE LoThuoc
             SET SoLuongNhap = COALESCE(SoLuongNhap, 0) + ?,
                 GiaNhap = ?,
                 HanSuDung = ?,
                 NgaySanXuat = ?,
                 MaNCC = COALESCE(?, MaNCC)
             WHERE MaLo = ?`,
            [item.SoLuong, item.GiaNhap, item.HanSuDung, item.NgaySanXuat, MaNCC || null, MaLo]
        );
        return MaLo;
    }

    const [lo] = await connection.query(
        `INSERT INTO LoThuoc
            (MaThuoc, SoLo, HanSuDung, NgaySanXuat,
             GiaNhap, MaCTPN, MaKho, MaNCC, SoLuongNhap, SoLuongDaXuat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
            item.MaThuoc,
            item.SoLo,
            item.HanSuDung,
            item.NgaySanXuat,
            item.GiaNhap,
            MaCTPN,
            MaKho,
            MaNCC || null,
            item.SoLuong
        ]
    );
    return lo.insertId;
}

const ImportsService = {
    getAll: async () => await ImportsModel.getAll(),

    getById: async (id) => await ImportsModel.getById(id),

    getItems: async (id) => await ImportsModel.getItems(id),

    getDetail: async (id) => await ImportsModel.getDetail(id),

    createImport: async (data) => {
        const connection = await db.getConnection();

        try {
            const normalizedData = {
                ...data,
                LoaiPhieu: data.LoaiPhieu || "NhapMua"
            };
            normalizedData.GhiChu = buildImportNote(normalizedData);

            validateImportHeader(normalizedData);
            const normalizedDetails = normalizedData.details.map(item => normalizeDetail(item, normalizedData.LoaiPhieu));
            const tongTien = normalizedData.LoaiPhieu === "NhapTra" || normalizedData.LoaiPhieu === "NhapKiemKe"
                ? 0
                : normalizedDetails.reduce((sum, item) => sum + item.ThanhTien, 0);

            await connection.beginTransaction();
            await warnLegacyImportTriggers(connection);

            const pnColumns = await getTableColumns(connection, "PhieuNhapThuoc");
            const ctpnColumns = await getTableColumns(connection, "ChiTietPhieuNhap");
            const MaPN = await insertImportHeader(connection, normalizedData, pnColumns, tongTien);
            const historyNote = IMPORT_TYPE_LABELS[normalizedData.LoaiPhieu] || "Nhập";

            for (const item of normalizedDetails) {
                const detailPrice = normalizedData.LoaiPhieu === "NhapTra" || normalizedData.LoaiPhieu === "NhapKiemKe"
                    ? 0
                    : item.GiaNhap;

                const MaCTPN = await insertImportDetail(connection, MaPN, item, detailPrice, ctpnColumns);

                const MaLo = await upsertLot(connection, {
                    item: { ...item, GiaNhap: detailPrice },
                    MaKho: normalizedData.MaKho,
                    MaNCC: normalizedData.MaNCC,
                    MaCTPN
                });

                await connection.query(
                    `INSERT INTO LichSuKho
                        (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                     VALUES (?, ?, 'Nhap', ?, ?, ?)`,
                    [item.MaThuoc, MaLo, item.SoLuong, MaPN, historyNote]
                );
            }

            await connection.query(
                `UPDATE PhieuNhapThuoc
                 SET TongTien = ?
                 WHERE MaPN = ?`,
                [tongTien, MaPN]
            );

            await connection.commit();
            return MaPN;
        } catch (err) {
            await connection.rollback();
            if (err.code === "ER_DUP_ENTRY") {
                throw new Error("Số lô đã tồn tại ngoài phạm vi kho hiện tại, vui lòng kiểm tra ràng buộc unique_lo_thuoc");
            }
            if (err.code === "WARN_DATA_TRUNCATED" || err.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
                throw new Error("Schema PhieuNhapThuoc chưa hỗ trợ loại phiếu/trạng thái mới. Vui lòng chạy migration cập nhật enum.");
            }
            throw err;
        } finally {
            connection.release();
        }
    }
};

export default ImportsService;
