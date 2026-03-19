import db from "../config/db.js";

const MedicinesModel = {

    getAll: async () => {
    const [rows] = await db.query(`
        SELECT 
            t.MaThuoc,
            t.TenThuoc,
            t.DonViTinh,
            t.GiaBan,
            COALESCE(SUM(l.SoLuongTon), 0) AS TongTon
        FROM Thuoc t
        LEFT JOIN LoThuoc l 
            ON t.MaThuoc = l.MaThuoc
        GROUP BY t.MaThuoc
    `);
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
      const [rows] = await db.query(`
          SELECT 
              t.MaThuoc,
              t.TenThuoc,
              COALESCE(SUM(l.SoLuongTon), 0) AS TongTon
          FROM Thuoc t
          LEFT JOIN LoThuoc l 
              ON t.MaThuoc = l.MaThuoc
          GROUP BY t.MaThuoc
          HAVING TongTon < 10
      `);
      return rows;
  },

getBySupplier: async (MaNCC) => {
    const [rows] = await db.query(`
        SELECT 
            t.MaThuoc,
            t.TenThuoc,
            t.DonViTinh,
            COALESCE(SUM(l.SoLuongTon), 0) AS TongTon,
            tnc.GiaNhap
        FROM Thuoc t
        JOIN Thuoc_NhaCungCap tnc 
            ON t.MaThuoc = tnc.MaThuoc
        LEFT JOIN LoThuoc l
            ON t.MaThuoc = l.MaThuoc
        WHERE tnc.MaNCC = ?
        GROUP BY t.MaThuoc
    `, [MaNCC]);

    return rows;
}

};

export default MedicinesModel;