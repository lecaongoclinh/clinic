import db from "../config/db.js";

const PrescriptionModel = {

    getAll: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.maChuyenKhoa) {
            conditions.push("nv.MaChuyenKhoa = ?");
            params.push(filters.maChuyenKhoa);
        }

        if (filters.maBacSi) {
            conditions.push("ba.MaBacSi = ?");
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
                dt.NgayKeDon,
                dt.TrangThai,
                bn.MaBN,
                bn.HoTen AS TenBenhNhan,
                bn.SoDienThoai,
                ba.MaBacSi,
                nv.HoTen AS TenBacSi,
                nv.MaChuyenKhoa,
                ck.TenChuyenKhoa,
                COUNT(ct.MaThuoc) AS SoLoaiThuoc,
                COALESCE(SUM(ct.SoLuong), 0) AS TongSoLuong
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            LEFT JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            ${where}
            GROUP BY
                dt.MaDT, dt.MaBA, dt.NgayKeDon, dt.TrangThai,
                bn.MaBN, bn.HoTen, bn.SoDienThoai,
                ba.MaBacSi, nv.HoTen, nv.MaChuyenKhoa, ck.TenChuyenKhoa
            ORDER BY dt.NgayKeDon DESC, dt.MaDT DESC
        `, params);
        return rows;
    },

    getDetail: async (id) => {
        const [rows] = await db.query(`
            SELECT 
                dt.MaDT,
                bn.HoTen,
                t.MaThuoc,
                t.TenThuoc,
                ct.SoLuong,
                ct.CachDung,
                t.SoLuongTon
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            WHERE dt.MaDT = ?
        `, [id]);

        return rows;
    }

};

export default PrescriptionModel;
