import db from "../config/db.js";

const PrescriptionModel = {

    getAll: async () => {
        const [rows] = await db.query(`
            SELECT MaDT, TrangThai
            FROM DonThuoc
        `);
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