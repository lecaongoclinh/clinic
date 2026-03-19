import db from "../config/db.js";

const SuppliersModel = {

    getAll: async () => {
        const [rows] = await db.query("SELECT * FROM NhaCungCap");
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(
            "SELECT * FROM NhaCungCap WHERE MaNCC = ?",
            [id]
        );
        return rows[0];
    },

    create: async (data) => {
        const { TenNCC, DiaChi, SoDienThoai } = data;

        const [result] = await db.query(
            `INSERT INTO NhaCungCap (TenNCC, DiaChi, SoDienThoai)
             VALUES (?, ?, ?)`,
            [TenNCC, DiaChi, SoDienThoai]
        );

        return result;
    },

    update: async (id, data) => {
        const { TenNCC, DiaChi, SoDienThoai } = data;

        const [result] = await db.query(
            `UPDATE NhaCungCap
             SET TenNCC = ?, DiaChi = ?, SoDienThoai = ?
             WHERE MaNCC = ?`,
            [TenNCC, DiaChi, SoDienThoai, id]
        );

        return result;
    },

    delete: async (id) => {
        const [result] = await db.query(
            "DELETE FROM NhaCungCap WHERE MaNCC = ?",
            [id]
        );

        return result;
    }

};

export default SuppliersModel;