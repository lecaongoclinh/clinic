import db from "../config/db.js";

const DispenseService = {

    dispense: async (MaDT) => {
        let connection;

        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // 1. CHECK ĐƠN THUỐC
            const [checkDT] = await connection.query(
                `SELECT * FROM DonThuoc WHERE MaDT = ? FOR UPDATE`,
                [MaDT]
            );

            if (checkDT.length === 0) {
                throw new Error("Đơn thuốc không tồn tại");
            }

            const donThuoc = checkDT[0];

            // 2. CHECK TRẠNG THÁI
            if (donThuoc.TrangThai === 'DaXuat') {
                throw new Error("Đơn thuốc đã được xuất rồi");
            }

            // 3. LẤY CHI TIẾT ĐƠN
            const [items] = await connection.query(
                `SELECT * FROM ChiTietDonThuoc WHERE MaDT = ?`,
                [MaDT]
            );

            if (items.length === 0) {
                throw new Error("Đơn thuốc không có thuốc");
            }

            // 4. XỬ LÝ TỪNG THUỐC
            for (const item of items) {

                if (item.SoLuong <= 0) {
                    throw new Error(`Số lượng không hợp lệ (MaThuoc: ${item.MaThuoc})`);
                }

                let soLuongCan = item.SoLuong;

                // 5. CHECK TỔNG TỒN
                const [[tong]] = await connection.query(
                    `SELECT SUM(SoLuongTon) as total 
                     FROM LoThuoc 
                     WHERE MaThuoc = ?`,
                    [item.MaThuoc]
                );

                if (!tong.total || tong.total < soLuongCan) {
                    throw new Error(`Không đủ thuốc (MaThuoc: ${item.MaThuoc})`);
                }

                // 6. LẤY LÔ FIFO + LOCK
                const [los] = await connection.query(
                    `SELECT * FROM LoThuoc
                     WHERE MaThuoc = ? AND SoLuongTon > 0
                     ORDER BY HanSuDung ASC
                     FOR UPDATE`,
                    [item.MaThuoc]
                );

                // 7. TRỪ THEO FIFO
                for (const lo of los) {
                    if (soLuongCan <= 0) break;

                    const soLuongTru = Math.min(lo.SoLuongTon, soLuongCan);

                    await connection.query(
                        `UPDATE LoThuoc 
                         SET SoLuongTon = SoLuongTon - ?
                         WHERE MaLo = ?`,
                        [soLuongTru, lo.MaLo]
                    );

                    soLuongCan -= soLuongTru;
                }

                // 8. UPDATE TỔNG TỒN
                await connection.query(
                    `UPDATE Thuoc 
                     SET SoLuongTon = SoLuongTon - ?
                     WHERE MaThuoc = ?`,
                    [item.SoLuong, item.MaThuoc]
                );
            }

            // 9. UPDATE TRẠNG THÁI ĐƠN
            await connection.query(
                `UPDATE DonThuoc 
                 SET TrangThai = 'DaXuat' 
                 WHERE MaDT = ?`,
                [MaDT]
            );

            await connection.commit();

            return {
                message: "Xuất thuốc thành công",
                MaDT: MaDT
            };

        } catch (error) {
            console.error("🔥 DISPENSE ERROR:", error);

            if (connection) await connection.rollback();

            throw error;

        } finally {
            if (connection) connection.release();
        }
    }

};

export default DispenseService;