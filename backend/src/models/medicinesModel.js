import db from "../config/db.js";

const MedicinesModel = {

    getAll: async () => {
        const [rows] = await db.query("SELECT * FROM Thuoc");
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(
            "SELECT * FROM Thuoc WHERE MaThuoc = ?",
            [id]
        );
        return rows[0];
    },

    create: async (data) => {
        const { TenThuoc, DonViTinh, GiaBan } = data;

        const [result] = await db.query(
            `INSERT INTO Thuoc (TenThuoc, DonViTinh, GiaBan)
             VALUES (?, ?, ?)`,
            [TenThuoc, DonViTinh, GiaBan]
        );

        return result;
    },

    update: async (id, data) => {
        const { TenThuoc, DonViTinh, GiaBan } = data;

        const [result] = await db.query(
            `UPDATE Thuoc
             SET TenThuoc = ?, DonViTinh = ?, GiaBan = ?
             WHERE MaThuoc = ?`,
            [TenThuoc, DonViTinh, GiaBan, id]
        );

        return result;
    },

    delete: async (id) => {
        const [result] = await db.query(
            "DELETE FROM Thuoc WHERE MaThuoc = ?",
            [id]
        );

        return result;
    },

    lowStock: async () => {
        const [rows] = await db.query(
            "SELECT * FROM Thuoc WHERE SoLuongTon < 10"
        );
        return rows;
    },

getBySupplier: async (MaNCC) => {
    const [rows] = await db.query(`
        SELECT 
            t.MaThuoc,
            t.TenThuoc,
            t.DonViTinh,
            t.SoLuongTon,
            tnc.GiaNhap
        FROM Thuoc t
        JOIN Thuoc_NhaCungCap tnc 
            ON t.MaThuoc = tnc.MaThuoc
        WHERE tnc.MaNCC = ?
    `, [MaNCC]);

    return rows;
}

};

export default MedicinesModel;