import db from "../config/db.js";

const STOCK_EXPR = "GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)";
const EXPORTABLE_LOT_CONDITION = "COALESCE(l.TrangThai, 'ConHan') NOT IN ('HetHan', 'DaHuy') AND l.HanSuDung > CURDATE()";

async function getDispenseWarehouse(connection = db) {
    const [columns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Kho'
          AND COLUMN_NAME IN ('LoaiKho', 'IsDispenseWarehouse')
    `);
    const columnNames = new Set(columns.map(row => row.COLUMN_NAME));
    const conditions = ["TenKho IN ('Kho Quầy Thuốc', 'Kho Quầy')", "TenKho LIKE '%Quầy%'", "TenKho LIKE '%Quay%'"];
    const orderParts = [
        "WHEN TenKho = 'Kho Quầy Thuốc' THEN 3",
        "WHEN TenKho = 'Kho Quầy' THEN 4",
        "WHEN TenKho LIKE '%Quầy%' THEN 5",
        "WHEN TenKho LIKE '%Quay%' THEN 6"
    ];

    if (columnNames.has("IsDispenseWarehouse")) {
        conditions.unshift("IsDispenseWarehouse = TRUE");
        orderParts.unshift("WHEN IsDispenseWarehouse = TRUE THEN 1");
    }
    if (columnNames.has("LoaiKho")) {
        conditions.unshift("LoaiKho = 'DISPENSE'");
        orderParts.unshift("WHEN LoaiKho = 'DISPENSE' THEN 0");
    }

    const [rows] = await connection.query(`
        SELECT MaKho, TenKho
        FROM Kho
        WHERE TrangThai = TRUE
          AND (${conditions.join(" OR ")})
        ORDER BY CASE ${orderParts.join(" ")} ELSE 9 END, TenKho ASC
        LIMIT 1
    `);
    return rows[0] || null;
}

const PrescriptionModel = {

    getAll: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.maChuyenKhoa) {
            conditions.push("nv.MaChuyenKhoa = ?");
            params.push(filters.maChuyenKhoa);
        }

        if (filters.maBacSi) {
            conditions.push("COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = ?");
            params.push(filters.maBacSi);
        }

        if (filters.patient) {
            conditions.push("(bn.MaBN LIKE ? OR bn.HoTen LIKE ? OR bn.SoDienThoai LIKE ?)");
            const keyword = `%${filters.patient}%`;
            params.push(keyword, keyword, keyword);
        }

        if (filters.trangThai) {
            conditions.push("dt.TrangThai = ?");
            params.push(filters.trangThai);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
            SELECT
                dt.MaDT,
                dt.MaBA,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                dt.NgayKeDon,
                dt.TrangThai,
                bn.MaBN,
                bn.HoTen AS TenBenhNhan,
                bn.SoDienThoai,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSi,
                nv.HoTen AS TenBacSi,
                nv.HoTen AS TenBacSiKeDon,
                nv.MaChuyenKhoa,
                ck.TenChuyenKhoa,
                COUNT(ct.MaThuoc) AS SoLoaiThuoc,
                COALESCE(SUM(ct.SoLuong), 0) AS TongSoLuong
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            LEFT JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            ${where}
            GROUP BY
                dt.MaDT, dt.MaBA, dt.MaBacSiKeDon, ba.MaBacSi, dt.NgayKeDon, dt.TrangThai,
                bn.MaBN, bn.HoTen, bn.SoDienThoai,
                ba.MaBacSi, nv.HoTen, nv.MaChuyenKhoa, ck.TenChuyenKhoa
            ORDER BY dt.NgayKeDon DESC, dt.MaDT DESC
        `, params);
        return rows;
    },

    getDetail: async (id) => {
        const dispenseWarehouse = await getDispenseWarehouse();
        const hasDispenseWarehouse = Boolean(dispenseWarehouse?.MaKho);
        const stockJoin = hasDispenseWarehouse
            ? `
            LEFT JOIN (
                SELECT
                    l.MaThuoc,
                    SUM(${STOCK_EXPR}) AS TonKhoQuay
                FROM LoThuoc l
                WHERE l.MaKho = ?
                  AND ${EXPORTABLE_LOT_CONDITION}
                  AND ${STOCK_EXPR} > 0
                GROUP BY l.MaThuoc
            ) stock ON stock.MaThuoc = t.MaThuoc`
            : "LEFT JOIN (SELECT NULL AS MaThuoc, 0 AS TonKhoQuay) stock ON stock.MaThuoc = t.MaThuoc";
        const params = hasDispenseWarehouse ? [dispenseWarehouse.MaKho, id] : [id];

        const [rows] = await db.query(`
            SELECT 
                dt.MaDT,
                dt.NgayKeDon,
                dt.TrangThai,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                nv.HoTen AS TenBacSiKeDon,
                bn.HoTen,
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                ct.SoLuong AS SoLuongKe,
                ct.SoLuong AS SoLuong,
                COALESCE(px_sum.SoLuongDaXuat, 0) AS SoLuongDaXuat,
                GREATEST(COALESCE(ct.SoLuong, 0) - COALESCE(px_sum.SoLuongDaXuat, 0), 0) AS SoLuongConCanXuat,
                LEAST(
                    GREATEST(COALESCE(ct.SoLuong, 0) - COALESCE(px_sum.SoLuongDaXuat, 0), 0),
                    COALESCE(stock.TonKhoQuay, 0)
                ) AS CoTheXuat,
                LEAST(
                    GREATEST(COALESCE(ct.SoLuong, 0) - COALESCE(px_sum.SoLuongDaXuat, 0), 0),
                    COALESCE(stock.TonKhoQuay, 0)
                ) AS SoLuongCoTheXuat,
                ct.LieuDung AS LieuDung,
                ct.LieuDung AS CachDung,
                COALESCE(stock.TonKhoQuay, 0) AS TonKhoQuay,
                COALESCE(stock.TonKhoQuay, 0) AS TongTonQuay,
                CASE
                    WHEN COALESCE(stock.TonKhoQuay, 0) >= GREATEST(COALESCE(ct.SoLuong, 0) - COALESCE(px_sum.SoLuongDaXuat, 0), 0) THEN 'DuHang'
                    WHEN COALESCE(stock.TonKhoQuay, 0) > 0 THEN 'ThieuHang'
                    ELSE 'HetHang'
                END AS TrangThaiTon,
                GREATEST(GREATEST(COALESCE(ct.SoLuong, 0) - COALESCE(px_sum.SoLuongDaXuat, 0), 0) - COALESCE(stock.TonKhoQuay, 0), 0) AS SoLuongThieu,
                ? AS MaKhoQuay,
                ? AS TenKhoQuay,
                ? AS CanhBaoKho
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = nv.MaNV
            JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            LEFT JOIN (
                SELECT px.MaDT, lo.MaThuoc, SUM(ctpx.SoLuong) AS SoLuongDaXuat
                FROM PhieuXuatThuoc px
                JOIN ChiTietPhieuXuat ctpx ON px.MaPX = ctpx.MaPX
                JOIN LoThuoc lo ON ctpx.MaLo = lo.MaLo
                WHERE px.TrangThai = 'HoanThanh'
                  AND px.LoaiXuat = 'BanChoBN'
                  AND px.MaDT = ?
                GROUP BY px.MaDT, lo.MaThuoc
            ) px_sum ON dt.MaDT = px_sum.MaDT AND t.MaThuoc = px_sum.MaThuoc
            ${stockJoin}
            WHERE dt.MaDT = ?
            ORDER BY ct.MaCTDT ASC
        `, [
            dispenseWarehouse?.MaKho || null,
            dispenseWarehouse?.TenKho || null,
            hasDispenseWarehouse ? null : "Chưa cấu hình kho cấp phát",
            id,
            ...params
        ]);

        return rows;
    },

    create: async (maPK, items) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Tìm MaBA từ MaPK
            const [baRows] = await connection.query('SELECT MaBA, MaBacSi FROM BenhAn WHERE MaPK = ? ORDER BY MaBA DESC LIMIT 1', [maPK]);
            if (!baRows.length) {
                throw new Error('Chưa có bệnh án cho phiếu khám này, không thể kê đơn.');
            }
            const maBA = baRows[0].MaBA;
            const maBacSiKeDon = baRows[0].MaBacSi || null;

            // Kiểm tra xem đã có đơn thuốc chưa
            const [dtRows] = await connection.query('SELECT MaDT FROM DonThuoc WHERE MaBA = ?', [maBA]);
            let maDT;

            if (dtRows.length > 0) {
                // Đã có đơn thuốc, xóa chi tiết cũ
                maDT = dtRows[0].MaDT;
                await connection.query('UPDATE DonThuoc SET MaBacSiKeDon = COALESCE(MaBacSiKeDon, ?) WHERE MaDT = ?', [maBacSiKeDon, maDT]);
                await connection.query('DELETE FROM ChiTietDonThuoc WHERE MaDT = ?', [maDT]);
            } else {
                // Tạo mới đơn thuốc
                const [result] = await connection.query(`
                    INSERT INTO DonThuoc (MaBA, MaBacSiKeDon, NgayKeDon, TrangThai)
                    VALUES (?, ?, NOW(), 'ChuaXuat')
                `, [maBA, maBacSiKeDon]);
                maDT = result.insertId;
            }

            // Thêm chi tiết đơn thuốc
            for (const item of items) {
                await connection.query(`
                    INSERT INTO ChiTietDonThuoc (MaDT, MaThuoc, SoLuong, LieuDung)
                    VALUES (?, ?, ?, ?)
                `, [maDT, item.maThuoc, item.soLuong, item.lieuDung || '']);
            }

            await connection.commit();
            return maDT;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

};

export default PrescriptionModel;
