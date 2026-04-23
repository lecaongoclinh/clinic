import db from "../config/db.js";

const SuppliersModel = {

getAll: async () => {
    const [rows] = await db.query(`
        SELECT 
            ncc.*,

            COUNT(DISTINCT pn.MaPN) AS SoLanNhap,

            COALESCE(SUM(ct.SoLuong * ct.GiaNhap), 0) AS TongTien

        FROM NhaCungCap ncc

        LEFT JOIN PhieuNhapThuoc pn 
            ON ncc.MaNCC = pn.MaNCC

        LEFT JOIN ChiTietPhieuNhap ct
            ON pn.MaPN = ct.MaPN

        GROUP BY ncc.MaNCC
    `);

    return rows;
},

    // ================= CHI TIẾT NCC =================
    getById: async (id) => {
        const [rows] = await db.query(
            "SELECT * FROM NhaCungCap WHERE MaNCC = ?",
            [id]
        );
        return rows[0];
    },

    // ================= THUỐC THEO NCC =================
    getMedicinesBySupplier: async (MaNCC) => {
    const [rows] = await db.query(`
        SELECT 
            t.MaThuoc,
            t.TenThuoc,
            t.HoatChat,
            t.HamLuong,
            t.DangBaoChe,

            tnc.GiaNhap,

            COALESCE(SUM(
                COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0)
            ),0) AS TongTon

        FROM Thuoc t

        JOIN Thuoc_NhaCungCap tnc 
            ON t.MaThuoc = tnc.MaThuoc

        LEFT JOIN LoThuoc l 
            ON t.MaThuoc = l.MaThuoc

        WHERE tnc.MaNCC = ?

        GROUP BY t.MaThuoc
    `, [MaNCC]);

    return rows;
},

    // ================= LỊCH SỬ NHẬP =================
getImportsBySupplier: async (MaNCC) => {
    const [rows] = await db.query(`
        SELECT 
            pn.MaPN,
            pn.NgayNhap,
            pn.LoaiPhieu,

            k.TenKho,   -- 🔥 thêm dòng này

            COALESCE(SUM(ct.SoLuong * ct.GiaNhap), 0) AS TongTien

        FROM PhieuNhapThuoc pn

        LEFT JOIN ChiTietPhieuNhap ct 
            ON pn.MaPN = ct.MaPN

        LEFT JOIN Kho k
            ON pn.MaKho = k.MaKho   -- 🔥 JOIN kho

        WHERE pn.MaNCC = ?

        GROUP BY pn.MaPN
        ORDER BY pn.NgayNhap DESC
    `, [MaNCC]);

    return rows;
},
    // ================= TẠO NCC =================
    create: async (data) => {
        const {
            TenNCC, DiaChi, SoDienThoai,
            Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan
        } = data;

        const [result] = await db.query(`
            INSERT INTO NhaCungCap
            (TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            TenNCC,
            DiaChi,
            SoDienThoai,
            Email,
            MaSoThue,
            NguoiLienHe,
            DieuKhoanThanhToan
        ]);

        return result;
    },

    // ================= CẬP NHẬT NCC =================
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
        `, [
            TenNCC,
            DiaChi,
            SoDienThoai,
            Email,
            MaSoThue,
            NguoiLienHe,
            DieuKhoanThanhToan,
            id
        ]);

        return result;
    },

    // ================= XÓA NCC =================
    delete: async (id) => {
        const [result] = await db.query(
            "DELETE FROM NhaCungCap WHERE MaNCC = ?",
            [id]
        );

        return result;
    }

};

export default SuppliersModel;