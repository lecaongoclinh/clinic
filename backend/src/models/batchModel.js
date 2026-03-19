import db from "../config/db.js";

const BatchModel = {

    getAll: async () => {
        const [rows] = await db.query(`
            SELECT 
                l.MaLo,
                l.SoLo,
                l.HanSuDung,
                l.SoLuongTon,
                t.MaThuoc,
                t.TenThuoc,
                t.DonViTinh
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        `);

        return rows;
    },

    getExpired: async () => {
        const [rows] = await db.query(`
            SELECT l.*, t.TenThuoc
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            WHERE l.HanSuDung < CURDATE()
        `);

        return rows;
    }

};

export default BatchModel;