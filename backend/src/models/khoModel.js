import db from "../config/db.js";

const KhoModel = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT *
            FROM Kho
            WHERE COALESCE(TrangThai, 1) = 1
            ORDER BY FIELD(TenKho, 'Kho Chính', 'Kho Quầy', 'Kho Quầy Thuốc', 'Kho Thuốc Lạnh', 'Kho Vật Tư Y Tế'), TenKho
        `);
        return rows;
    }
};

export default KhoModel;
