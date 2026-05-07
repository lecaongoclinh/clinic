import db from "../config/db.js";
import ImportsModel from "../models/importsModel.js";

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function getImportTriggerFlags(connection) {
    const [triggers] = await connection.query(`
        SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_STATEMENT
        FROM INFORMATION_SCHEMA.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE()
          AND EVENT_MANIPULATION = 'INSERT'
          AND EVENT_OBJECT_TABLE IN ('PhieuNhapThuoc', 'ChiTietPhieuNhap', 'LoThuoc')
    `);

    return triggers.reduce((flags, trigger) => {
        const tableName = String(trigger.EVENT_OBJECT_TABLE || "").toLowerCase();
        const statement = String(trigger.ACTION_STATEMENT || "").toLowerCase();

        if (statement.includes("lichsukho")) {
            flags.stockHistoryByTrigger = true;
        }
        if (tableName === "chitietphieunhap" && statement.includes("lothuoc")) {
            flags.lotByDetailTrigger = true;
            flags.legacyLotTriggers.push(trigger.TRIGGER_NAME);
        }

        return flags;
    }, {
        stockHistoryByTrigger: false,
        lotByDetailTrigger: false,
        legacyLotTriggers: []
    });
}

function quoteIdentifier(identifier) {
    return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function dropLegacyImportTriggers(connection) {
    const triggerFlags = await getImportTriggerFlags(connection);

    for (const triggerName of triggerFlags.legacyLotTriggers) {
        await connection.query(`DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)}`);
    }

    return triggerFlags.legacyLotTriggers;
}

const ImportsService = {
    getAll: async () => await ImportsModel.getAll(),

    getById: async (id) => await ImportsModel.getById(id),

    getItems: async (id) => await ImportsModel.getItems(id),

    createImport: async (data) => {
        const connection = await db.getConnection();

        try {
            const droppedTriggers = await dropLegacyImportTriggers(connection);
            await connection.beginTransaction();
            const triggerFlags = await getImportTriggerFlags(connection);
            if (triggerFlags.lotByDetailTrigger) {
                throw new Error("Database còn trigger nhập kho tự tạo lô thuốc. Vui lòng tắt trigger cũ để tránh xử lý trùng tồn kho.");
            }
            if (droppedTriggers.length) {
                console.warn(`Dropped legacy import triggers: ${droppedTriggers.join(", ")}`);
            }

            const {
                MaNCC,
                MaKho,
                LoaiPhieu = "NhapMua",
                GhiChu = "",
                MaNhanVien,
                details
            } = data;

            if (!MaNhanVien) {
                throw new Error("Thiếu nhân viên tạo phiếu nhập");
            }
            if (!MaNCC) {
                throw new Error("Vui lòng chọn nhà cung cấp");
            }
            if (!MaKho) {
                throw new Error("Vui lòng chọn kho nhập");
            }
            if (!Array.isArray(details) || details.length === 0) {
                throw new Error("Phiếu nhập phải có ít nhất 1 thuốc");
            }

            const [pn] = await connection.query(
                `INSERT INTO PhieuNhapThuoc
                    (MaNCC, MaNhanVien, MaKho, LoaiPhieu, GhiChu)
                 VALUES (?, ?, ?, ?, ?)`,
                [MaNCC, MaNhanVien, MaKho, LoaiPhieu, GhiChu]
            );

            const MaPN = pn.insertId;
            let tongTien = 0;

            for (const item of details) {
                const MaThuoc = item.MaThuoc;
                const SoLuong = toNumber(item.SoLuong);
                const GiaNhap = toNumber(item.GiaNhap);
                const DonViNhap = item.DonViNhap || null;
                const SoLuongNhap = toNumber(item.SoLuongNhap);
                const HeSoQuyDoi = toNumber(item.HeSoQuyDoi, 1);
                const SoLo = String(item.SoLo || "").trim();
                const HanSuDung = item.HanSuDung;
                const NgaySanXuat = item.NgaySanXuat;

                if (!MaThuoc || SoLuong <= 0 || GiaNhap <= 0) {
                    throw new Error("Thiếu dữ liệu thuốc hoặc số lượng/giá không hợp lệ");
                }
                if (!SoLo || !HanSuDung || !NgaySanXuat) {
                    throw new Error("Thiếu thông tin lô");
                }

                const nsxDate = parseDate(NgaySanXuat);
                const hsdDate = parseDate(HanSuDung);
                if (!nsxDate || !hsdDate) {
                    throw new Error(`Ngày sản xuất hoặc hạn sử dụng của lô ${SoLo} không hợp lệ`);
                }
                if (hsdDate <= nsxDate) {
                    throw new Error(`Hạn sử dụng phải sau ngày sản xuất của lô ${SoLo}`);
                }

                const [duplicatedLots] = await connection.query(
                    `SELECT MaLo
                     FROM LoThuoc
                     WHERE MaThuoc = ?
                       AND MaKho = ?
                       AND SoLo = ?
                       AND COALESCE(TrangThai, 'ConHan') != 'DaHuy'
                     LIMIT 1`,
                    [MaThuoc, MaKho, SoLo]
                );
                if (duplicatedLots.length) {
                    throw new Error(`Số lô ${SoLo} đã tồn tại trong kho này`);
                }

                tongTien += SoLuong * GiaNhap;

                const [ctpn] = await connection.query(
                    `INSERT INTO ChiTietPhieuNhap
                        (MaPN, MaThuoc, SoLuong, GiaNhap, DonViNhap, SoLuongNhap, HeSoQuyDoi)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [MaPN, MaThuoc, SoLuong, GiaNhap, DonViNhap, SoLuongNhap, HeSoQuyDoi]
                );

                const [lo] = await connection.query(
                    `INSERT INTO LoThuoc
                        (MaThuoc, SoLo, HanSuDung, NgaySanXuat,
                         GiaNhap, MaCTPN, MaKho, MaNCC, SoLuongNhap, SoLuongDaXuat)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [MaThuoc, SoLo, HanSuDung, NgaySanXuat, GiaNhap, ctpn.insertId, MaKho, MaNCC, SoLuong]
                );

                if (!triggerFlags.stockHistoryByTrigger) {
                    await connection.query(
                        `INSERT INTO LichSuKho
                            (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID)
                         VALUES (?, ?, 'Nhap', ?, ?)`,
                        [MaThuoc, lo.insertId, SoLuong, MaPN]
                    );
                }
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
                throw new Error("Số lô đã tồn tại, vui lòng kiểm tra lại thông tin lô");
            }
            throw err;
        } finally {
            connection.release();
        }
    }
};

export default ImportsService;
