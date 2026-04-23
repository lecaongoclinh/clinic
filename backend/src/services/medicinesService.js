import db from "../config/db.js";
import MedicinesModel from "../models/medicinesModel.js";

const MedicinesService = {

    getAllMedicines: async () => {
        return await MedicinesModel.getAll();
    },

    getMedicineById: async (id) => {
        return await MedicinesModel.getById(id);
    },

    createMedicine: async (data) => {
        return await MedicinesModel.create(data);
    },

    updateMedicine: async (id, data) => {
        return await MedicinesModel.update(id, data);
    },

    deleteMedicine: async (id) => {
        return await MedicinesModel.delete(id);
    },

    getLowStock: async () => {
        return await MedicinesModel.lowStock();
    },

    // ✅ FIX CHUẨN
    getMedicinesBySupplier: async (MaNCC) => {
        const [rows] = await db.query(`
            SELECT 
                t.MaThuoc,
                t.TenThuoc,
                t.DonViCoBan,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                tncc.GiaNhap,

                COALESCE(SUM(l.SoLuongNhap - l.SoLuongDaXuat),0) AS TongTon

            FROM Thuoc_NhaCungCap tncc
            JOIN Thuoc t ON t.MaThuoc = tncc.MaThuoc
            LEFT JOIN LoThuoc l ON l.MaThuoc = t.MaThuoc

            WHERE tncc.MaNCC = ?

            GROUP BY t.MaThuoc
        `, [MaNCC]);

        return rows;
    }

};

export default MedicinesService;