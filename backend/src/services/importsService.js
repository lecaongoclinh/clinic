import db from "../config/db.js";
import ImportsModel from "../models/importsModel.js";

const ImportsService = {

    getAll: async () => await ImportsModel.getAll(),

    getById: async (id) => await ImportsModel.getById(id),

    getItems: async (id) => await ImportsModel.getItems(id),

    // ================= CREATE IMPORT =================
    createImport: async (data) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                MaNCC,
                MaKho,
                LoaiPhieu = "NhapMua",
                GhiChu = "",
                MaNhanVien,
                details
            } = data;

            // ===== VALIDATE =====
            if (!MaNhanVien) {
                throw new Error("Thiếu MaNhanVien");
            }

            if (!details || details.length === 0) {
                throw new Error("Phiếu nhập phải có ít nhất 1 thuốc");
            }

            // ===== 1. TẠO PHIẾU =====
            const [pn] = await connection.query(
                `INSERT INTO PhieuNhapThuoc 
                (MaNCC, MaNhanVien, MaKho, LoaiPhieu, GhiChu)
                VALUES (?, ?, ?, ?, ?)`,
                [MaNCC, MaNhanVien, MaKho, LoaiPhieu, GhiChu]
            );

            const MaPN = pn.insertId;
            let tongTien = 0;

            // ===== 2. XỬ LÝ CHI TIẾT =====
            for (let item of details) {

                const {
                    MaThuoc,
                    SoLuong,        // đơn vị cơ bản (viên)
                    GiaNhap,        // giá / đơn vị cơ bản
                    DonViNhap,
                    SoLuongNhap,
                    HeSoQuyDoi,
                    SoLo,
                    HanSuDung,
                    NgaySanXuat
                } = item;

                // ===== VALIDATE =====
                if (!MaThuoc || !SoLuong || !GiaNhap) {
                    throw new Error("Thiếu dữ liệu thuốc");
                }

                if (!SoLo || !HanSuDung || !NgaySanXuat) {
                    throw new Error("Thiếu thông tin lô");
                }

                if (SoLuong <= 0 || GiaNhap <= 0) {
                    throw new Error("Số lượng hoặc giá không hợp lệ");
                }

                tongTien += SoLuong * GiaNhap;

                // ===== 2.1 INSERT CHI TIẾT =====
                const [ctpn] = await connection.query(
                    `INSERT INTO ChiTietPhieuNhap
                    (MaPN, MaThuoc, SoLuong, GiaNhap, DonViNhap, SoLuongNhap, HeSoQuyDoi)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        MaPN,
                        MaThuoc,
                        SoLuong,
                        GiaNhap,
                        DonViNhap,
                        SoLuongNhap,
                        HeSoQuyDoi
                    ]
                );

                const MaCTPN = ctpn.insertId;

                // ===== 2.2 INSERT LÔ + TỒN KHO =====
                const [lo] = await connection.query(
                    `INSERT INTO LoThuoc
                    (MaThuoc, SoLo, HanSuDung, NgaySanXuat,
                     GiaNhap, MaCTPN, MaKho, MaNCC, SoLuongNhap, SoLuongDaXuat)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [
                        MaThuoc,
                        SoLo,
                        HanSuDung,
                        NgaySanXuat,
                        GiaNhap,
                        MaCTPN,
                        MaKho,
                        MaNCC,
                        SoLuong   // 🔥 tồn kho set trực tiếp
                    ]
                );

                const MaLo = lo.insertId;

                // ===== 2.3 LỊCH SỬ KHO =====
                await connection.query(
                    `INSERT INTO LichSuKho
                    (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID)
                    VALUES (?, ?, 'Nhap', ?, ?)`,
                    [MaThuoc, MaLo, SoLuong, MaPN]
                );
            }

            // ===== 3. UPDATE TỔNG TIỀN =====
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