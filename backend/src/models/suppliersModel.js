import db from "../config/db.js";

const STOCK_EXPR = "GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)";

let supplierStatusColumnCache = null;

async function hasSupplierStatusColumn(connection = db) {
    if (supplierStatusColumnCache !== null) return supplierStatusColumnCache;
    const [rows] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'NhaCungCap'
          AND COLUMN_NAME = 'TrangThai'
    `);
    supplierStatusColumnCache = rows.length > 0;
    return supplierStatusColumnCache;
}

function validImportMoneyExpression(alias = "pn") {
    return `
        CASE
            WHEN ${alias}.LoaiPhieu IN ('NhapTra', 'NhapKiemKe') THEN 0
            WHEN COALESCE(${alias}.TongTien, 0) > 0 THEN ${alias}.TongTien
            ELSE COALESCE(calc.CalculatedTotal, 0)
        END
    `;
}

const SuppliersModel = {
    getAll: async ({ includeInactive = false } = {}) => {
        const hasStatus = await hasSupplierStatusColumn();
        const statusSelect = hasStatus ? "ncc.TrangThai" : "1 AS TrangThai";
        const statusWhere = hasStatus && !["true", true, "1", 1].includes(includeInactive)
            ? "WHERE COALESCE(ncc.TrangThai, 1) = 1"
            : "";

        const [rows] = await db.query(`
            SELECT
                ncc.*,
                ${statusSelect},
                COALESCE(stats.SoLanNhap, 0) AS SoLanNhap,
                COALESCE(stats.TongTien, 0) AS TongTien
            FROM NhaCungCap ncc
            LEFT JOIN (
                SELECT
                    pn.MaNCC,
                    COUNT(DISTINCT pn.MaPN) AS SoLanNhap,
                    COALESCE(SUM(${validImportMoneyExpression("pn")}), 0) AS TongTien
                FROM PhieuNhapThuoc pn
                LEFT JOIN (
                    SELECT
                        MaPN,
                        SUM(COALESCE(SoLuongNhap, SoLuong, 0) * COALESCE(GiaNhap, 0)) AS CalculatedTotal
                    FROM ChiTietPhieuNhap
                    GROUP BY MaPN
                ) calc ON pn.MaPN = calc.MaPN
                WHERE pn.MaNCC IS NOT NULL
                  AND COALESCE(pn.TrangThai, 'Nhap') != 'DaHuy'
                GROUP BY pn.MaNCC
            ) stats ON ncc.MaNCC = stats.MaNCC
            ${statusWhere}
            ORDER BY ncc.TenNCC ASC
        `);

        return rows;
    },

    getById: async (id) => {
        const hasStatus = await hasSupplierStatusColumn();
        const statusSelect = hasStatus ? "TrangThai" : "1 AS TrangThai";
        const [rows] = await db.query(`
            SELECT
                MaNCC,
                TenNCC,
                DiaChi,
                SoDienThoai,
                Email,
                MaSoThue,
                NguoiLienHe,
                DieuKhoanThanhToan,
                ${statusSelect}
            FROM NhaCungCap
            WHERE MaNCC = ?
        `, [id]);
        return rows[0];
    },

    getMedicinesBySupplier: async (MaNCC) => {
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                COALESCE(stock.GiaNhapGanNhat, tnc.GiaNhap, 0) AS GiaNhap,
                COALESCE(stock.GiaTrungBinh, tnc.GiaNhap, 0) AS GiaTrungBinh,
                COALESCE(stock.TongTon, 0) AS TongTon,
                COALESCE(stock.SoLoConTon, 0) AS SoLoConTon
            FROM Thuoc t
            LEFT JOIN Thuoc_NhaCungCap tnc
                ON t.MaThuoc = tnc.MaThuoc
               AND tnc.MaNCC = ?
            LEFT JOIN (
                SELECT
                    l.MaThuoc,
                    SUM(${STOCK_EXPR}) AS TongTon,
                    SUM(CASE WHEN ${STOCK_EXPR} > 0 THEN 1 ELSE 0 END) AS SoLoConTon,
                    AVG(NULLIF(l.GiaNhap, 0)) AS GiaTrungBinh,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(l.GiaNhap ORDER BY COALESCE(pn.NgayNhap, '1900-01-01') DESC, l.MaLo DESC),
                        ',',
                        1
                    ) AS GiaNhapGanNhat
                FROM LoThuoc l
                LEFT JOIN ChiTietPhieuNhap ctpn ON l.MaCTPN = ctpn.MaCTPN
                LEFT JOIN PhieuNhapThuoc pn ON ctpn.MaPN = pn.MaPN
                WHERE l.MaNCC = ?
                  AND COALESCE(l.TrangThai, '') != 'DaHuy'
                GROUP BY l.MaThuoc
            ) stock ON t.MaThuoc = stock.MaThuoc
            WHERE tnc.MaNCC IS NOT NULL
               OR stock.MaThuoc IS NOT NULL
            ORDER BY t.TenThuoc ASC
        `, [MaNCC, MaNCC]);

        return rows;
    },

    getImportsBySupplier: async (MaNCC) => {
        const [rows] = await db.query(`
            SELECT
                pn.MaPN,
                pn.NgayNhap,
                pn.LoaiPhieu,
                pn.TrangThai,
                k.TenKho,
                ${validImportMoneyExpression("pn")} AS TongTien
            FROM PhieuNhapThuoc pn
            LEFT JOIN (
                SELECT
                    MaPN,
                    SUM(COALESCE(SoLuongNhap, SoLuong, 0) * COALESCE(GiaNhap, 0)) AS CalculatedTotal
                FROM ChiTietPhieuNhap
                GROUP BY MaPN
            ) calc ON pn.MaPN = calc.MaPN
            LEFT JOIN Kho k ON pn.MaKho = k.MaKho
            WHERE pn.MaNCC = ?
            ORDER BY pn.NgayNhap DESC, pn.MaPN DESC
        `, [MaNCC]);

        return rows;
    },

    create: async (data) => {
        const {
            TenNCC, DiaChi, SoDienThoai,
            Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan
        } = data;

        const [result] = await db.query(`
            INSERT INTO NhaCungCap
            (TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan]);

        return result;
    },

    update: async (id, data) => {
        const {
            TenNCC, DiaChi, SoDienThoai,
            Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan
        } = data;

        const [result] = await db.query(`
            UPDATE NhaCungCap
            SET
                TenNCC = ?,
                DiaChi = ?,
                SoDienThoai = ?,
                Email = ?,
                MaSoThue = ?,
                NguoiLienHe = ?,
                DieuKhoanThanhToan = ?
            WHERE MaNCC = ?
        `, [TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan, id]);

        return result;
    },

    hasRelatedData: async (id) => {
        const [[row]] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM PhieuNhapThuoc WHERE MaNCC = ?) AS PhieuNhapCount,
                (SELECT COUNT(*) FROM LoThuoc WHERE MaNCC = ?) AS LoThuocCount,
                (SELECT COUNT(*) FROM Thuoc_NhaCungCap WHERE MaNCC = ?) AS LinkCount
        `, [id, id, id]);

        return Object.values(row).some(value => Number(value) > 0);
    },

    delete: async (id) => {
        const hasRelated = await SuppliersModel.hasRelatedData(id);
        if (hasRelated) {
            const hasStatus = await hasSupplierStatusColumn();
            if (!hasStatus) {
                const error = new Error("Nhà cung cấp đã phát sinh dữ liệu. Cần migration thêm cột NhaCungCap.TrangThai TINYINT DEFAULT 1 để ngừng hợp tác thay vì xóa cứng.");
                error.statusCode = 409;
                throw error;
            }

            const [result] = await db.query(
                "UPDATE NhaCungCap SET TrangThai = 0 WHERE MaNCC = ?",
                [id]
            );
            return { ...result, softDeleted: true };
        }

        const [result] = await db.query(
            "DELETE FROM NhaCungCap WHERE MaNCC = ?",
            [id]
        );
        return { ...result, softDeleted: false };
    }
};

export default SuppliersModel;
