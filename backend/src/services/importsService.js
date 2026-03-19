import db from "../config/db.js";
import ImportsModel from "../models/importsModel.js";

const ImportsService = {

    getAll: async () => await ImportsModel.getAll(),

    getById: async (id) => await ImportsModel.getById(id),

    getItems: async (id) => await ImportsModel.getItems(id),

    //CORE LOGIC
    createImport: async (data) => {
        const connection = await db.getConnection();
        if (!MaThuoc || !SoLuong || !GiaNhap) {
            throw new Error("Thiếu dữ liệu thuốc");
        }
        try {
            await connection.beginTransaction();

            const { MaNCC, MaNhanVien = 1, items } = data;

            if (!items || items.length === 0) {
                throw new Error("Phiếu nhập phải có ít nhất 1 thuốc");
            }

            // 1. tạo phiếu
            const [pn] = await connection.query(
                `INSERT INTO PhieuNhapThuoc (MaNCC, MaNhanVien)
                 VALUES (?, ?)`,
                [MaNCC, MaNhanVien]
            );

            const MaPN = pn.insertId;
            let tongTien = 0;

            // 2. loop thuốc
            for (let item of items) {

                const { MaThuoc, SoLuong, GiaNhap, HanSuDung, SoLo } = item;

                if (!SoLo || !HanSuDung) {
                    throw new Error("Thiếu số lô hoặc hạn sử dụng");
                }

                tongTien += SoLuong * GiaNhap;

                // insert chi tiết
                const [ctpn] = await connection.query(
                    `INSERT INTO ChiTietPhieuNhap 
                    (MaPN, MaThuoc, SoLuong, GiaNhap)
                    VALUES (?, ?, ?, ?)`,
                    [MaPN, MaThuoc, SoLuong, GiaNhap]
                );

                // kiểm tra lô
                const [lo] = await connection.query(
                    `SELECT * FROM LoThuoc 
                     WHERE MaThuoc = ? AND SoLo = ?`,
                    [MaThuoc, SoLo]
                );

                if (lo.length > 0) {
                    await connection.query(
                        `UPDATE LoThuoc
                         SET SoLuongTon = SoLuongTon + ?
                         WHERE MaThuoc = ? AND SoLo = ?`,
                        [SoLuong, MaThuoc, SoLo]
                    );
                } else {
                    await connection.query(
                        `INSERT INTO LoThuoc 
                        (MaThuoc, SoLo, HanSuDung, SoLuongTon, GiaNhap, MaCTPN)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [MaThuoc, SoLo, HanSuDung, SoLuong, GiaNhap, ctpn.insertId]
                    );
                }

                // update tồn tổng
                await connection.query(
                    `UPDATE Thuoc
                     SET SoLuongTon = SoLuongTon + ?
                     WHERE MaThuoc = ?`,
                    [SoLuong, MaThuoc]
                );
            }

            // update tổng tiền
            await connection.query(
                `UPDATE PhieuNhapThuoc 
                 SET TongTien = ?
                 WHERE MaPN = ?`,
                [tongTien, MaPN]
            );

            await connection.commit();
            connection.release();

            return MaPN;

        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
    }

};

export default ImportsService;