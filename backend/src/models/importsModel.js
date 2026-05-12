import db from "../config/db.js";

async function hasColumn(tableName, columnName) {
    const [rows] = await db.query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );
    return rows.length > 0;
}

const ImportsModel = {

    getAll: async () => {
        const hasTrangThai = await hasColumn("PhieuNhapThuoc", "TrangThai");
        const statusSelect = hasTrangThai ? "COALESCE(pn.TrangThai, 'HoanThanh')" : "'HoanThanh'";
        const [rows] = await db.query(`
            SELECT
                pn.MaPN,
                pn.MaNCC,
                pn.MaKho,
                pn.MaNhanVien,
                pn.NgayNhap,
                pn.TongTien,
                pn.LoaiPhieu,
                pn.GhiChu,
                ${statusSelect} AS TrangThai,
                ncc.TenNCC,
                k.TenKho,
                nv.HoTen AS TenNhanVien
            FROM PhieuNhapThuoc pn
            LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
            LEFT JOIN Kho k ON pn.MaKho = k.MaKho
            LEFT JOIN NhanVien nv ON pn.MaNhanVien = nv.MaNV
            ORDER BY pn.MaPN DESC
        `);
        return rows;
    },

    getById: async (id) => {
        const hasTrangThai = await hasColumn("PhieuNhapThuoc", "TrangThai");
        const statusSelect = hasTrangThai ? "COALESCE(pn.TrangThai, 'HoanThanh')" : "'HoanThanh'";
        const [rows] = await db.query(
            `SELECT
                pn.*,
                ${statusSelect} AS TrangThai,
                ncc.TenNCC,
                k.TenKho,
                nv.HoTen AS TenNhanVien
             FROM PhieuNhapThuoc pn
             LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
             LEFT JOIN Kho k ON pn.MaKho = k.MaKho
             LEFT JOIN NhanVien nv ON pn.MaNhanVien = nv.MaNV
             WHERE pn.MaPN = ?`,
            [id]
        );
        return rows[0];
    },

    getItems: async (id) => {
        const hasSoLo = await hasColumn("ChiTietPhieuNhap", "SoLo");
        const hasNgaySanXuat = await hasColumn("ChiTietPhieuNhap", "NgaySanXuat");
        const hasHanSuDung = await hasColumn("ChiTietPhieuNhap", "HanSuDung");
        const soLoSelect = hasSoLo ? "COALESCE(ct.SoLo, l.SoLo)" : "l.SoLo";
        const nsxSelect = hasNgaySanXuat ? "COALESCE(ct.NgaySanXuat, l.NgaySanXuat)" : "l.NgaySanXuat";
        const hsdSelect = hasHanSuDung ? "COALESCE(ct.HanSuDung, l.HanSuDung)" : "l.HanSuDung";
        const lotJoin = hasSoLo
            ? `LEFT JOIN LichSuKho ls ON ls.ThamChieuID = ct.MaPN
                    AND ls.MaThuoc = ct.MaThuoc
                    AND ls.Loai = 'Nhap'
               LEFT JOIN LoThuoc l ON (
                    (ct.SoLo IS NOT NULL AND l.MaThuoc = ct.MaThuoc AND l.MaKho = pn.MaKho AND l.SoLo = ct.SoLo)
                    OR (ct.SoLo IS NULL AND (l.MaCTPN = ct.MaCTPN OR l.MaLo = ls.MaLo))
               )`
            : "LEFT JOIN LoThuoc l ON l.MaCTPN = ct.MaCTPN";
        const [rows] = await db.query(`
            SELECT
                ct.*,
                t.TenThuoc,
                t.DonViCoBan,
                COALESCE(l.GiaNhap, ct.GiaNhap, 0) AS GiaNhap,
                ${soLoSelect} AS SoLo,
                ${nsxSelect} AS NgaySanXuat,
                ${hsdSelect} AS HanSuDung,
                (COALESCE(ct.SoLuong, 0) * COALESCE(l.GiaNhap, ct.GiaNhap, 0)) AS ThanhTien
            FROM ChiTietPhieuNhap ct
            JOIN PhieuNhapThuoc pn ON pn.MaPN = ct.MaPN
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            ${lotJoin}
            WHERE ct.MaPN = ?
            ORDER BY ct.MaCTPN
        `, [id]);

        return rows;
    },

    getStockHistory: async (id) => {
        const [rows] = await db.query(`
            SELECT
                ls.*,
                t.TenThuoc,
                l.SoLo
            FROM LichSuKho ls
            LEFT JOIN Thuoc t ON ls.MaThuoc = t.MaThuoc
            LEFT JOIN LoThuoc l ON ls.MaLo = l.MaLo
            WHERE ls.Loai = 'Nhap'
              AND ls.ThamChieuID = ?
            ORDER BY ls.ThoiGian DESC, ls.MaLS DESC
        `, [id]);

        return rows;
    },

    getDetail: async (id) => {
        const header = await ImportsModel.getById(id);
        if (!header) return null;

        const [items, history] = await Promise.all([
            ImportsModel.getItems(id),
            ImportsModel.getStockHistory(id)
        ]);

        return { header, items, history };
    }

};

export default ImportsModel;
