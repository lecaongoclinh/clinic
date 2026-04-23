import db from "../config/db.js";

const STOCK_EXPR = `
    CASE
        WHEN l.TrangThai = 'DaHuy' THEN 0
        ELSE GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)
    END
`;

const MedicinesModel = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.GiaBan,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            GROUP BY
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.GiaBan
        `);

        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.GiaBan,
                t.MaVach,
                t.LoaiThuoc,
                t.TrangThai,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            WHERE t.MaThuoc = ?
            GROUP BY
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.GiaBan,
                t.MaVach,
                t.LoaiThuoc,
                t.TrangThai
        `, [id]);

        return rows[0];
    },

    create: async (data) => {
        const {
            TenThuoc,
            HoatChat,
            HamLuong,
            DangBaoChe,
            QuyCachDongGoi,
            HangSanXuat,
            NuocSanXuat,
            NhietDoBaoQuan,
            GiaBan,
            MaVach,
            LoaiThuoc
        } = data;

        await db.query(`
            INSERT INTO Thuoc (
                TenThuoc, HoatChat, HamLuong, DangBaoChe,
                QuyCachDongGoi, HangSanXuat, NuocSanXuat,
                NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            TenThuoc, HoatChat, HamLuong, DangBaoChe,
            QuyCachDongGoi, HangSanXuat, NuocSanXuat,
            NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc
        ]);
    },

    update: async (id, data) => {
        const {
            TenThuoc,
            HoatChat,
            HamLuong,
            DangBaoChe,
            QuyCachDongGoi,
            HangSanXuat,
            NuocSanXuat,
            NhietDoBaoQuan,
            GiaBan,
            MaVach,
            LoaiThuoc
        } = data;

        await db.query(`
            UPDATE Thuoc
            SET
                TenThuoc = ?,
                HoatChat = ?,
                HamLuong = ?,
                DangBaoChe = ?,
                QuyCachDongGoi = ?,
                HangSanXuat = ?,
                NuocSanXuat = ?,
                NhietDoBaoQuan = ?,
                GiaBan = ?,
                MaVach = ?,
                LoaiThuoc = ?
            WHERE MaThuoc = ?
        `, [
            TenThuoc, HoatChat, HamLuong, DangBaoChe,
            QuyCachDongGoi, HangSanXuat, NuocSanXuat,
            NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc, id
        ]);
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
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            GROUP BY t.MaThuoc, t.TenThuoc
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
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon,
                tnc.GiaNhap
            FROM Thuoc t
            JOIN Thuoc_NhaCungCap tnc
                ON t.MaThuoc = tnc.MaThuoc
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            WHERE tnc.MaNCC = ?
            GROUP BY t.MaThuoc, t.TenThuoc, t.DonViTinh, tnc.GiaNhap
        `, [MaNCC]);

        return rows;
    }
};

export default MedicinesModel;
