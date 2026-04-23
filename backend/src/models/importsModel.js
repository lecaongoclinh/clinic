import db from "../config/db.js";

const ImportsModel = {

    getAll: async () => {
        const [rows] = await db.query(`
            SELECT pn.*, ncc.TenNCC
            FROM PhieuNhapThuoc pn
            LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
            ORDER BY pn.MaPN DESC
        `);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(
            `SELECT * FROM PhieuNhapThuoc WHERE MaPN = ?`,
            [id]
        );
        return rows[0];
    },

    getItems: async (id) => {
        const [rows] = await db.query(`
            SELECT ct.*, t.TenThuoc
            FROM ChiTietPhieuNhap ct
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            WHERE ct.MaPN = ?
        `, [id]);

        return rows;
    }

};

export default ImportsModel;