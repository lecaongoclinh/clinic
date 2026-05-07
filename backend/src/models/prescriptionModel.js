import db from "../config/db.js";
import InvoicesService from "../services/invoicesService.js";

const PrescriptionModel = {

    getAll: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.maChuyenKhoa) {
            conditions.push("nv.MaChuyenKhoa = ?");
            params.push(filters.maChuyenKhoa);
        }

        if (filters.maBacSi) {
            conditions.push("ba.MaBacSi = ?");
            params.push(filters.maBacSi);
        }

        if (filters.patient) {
            conditions.push("(bn.MaBN LIKE ? OR bn.HoTen LIKE ? OR bn.SoDienThoai LIKE ?)");
            const keyword = `%${filters.patient}%`;
            params.push(keyword, keyword, keyword);
        }

        if (filters.trangThai) {
            conditions.push("dt.TrangThai = ?");
            params.push(filters.trangThai);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
            SELECT
                dt.MaDT,
                dt.MaBA,
                dt.NgayKeDon,
                dt.TrangThai,
                bn.MaBN,
                bn.HoTen AS TenBenhNhan,
                bn.SoDienThoai,
                ba.MaBacSi,
                nv.HoTen AS TenBacSi,
                nv.MaChuyenKhoa,
                ck.TenChuyenKhoa,
                COUNT(ct.MaThuoc) AS SoLoaiThuoc,
                COALESCE(SUM(ct.SoLuong), 0) AS TongSoLuong
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            LEFT JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            ${where}
            GROUP BY
                dt.MaDT, dt.MaBA, dt.NgayKeDon, dt.TrangThai,
                bn.MaBN, bn.HoTen, bn.SoDienThoai,
                ba.MaBacSi, nv.HoTen, nv.MaChuyenKhoa, ck.TenChuyenKhoa
            ORDER BY dt.NgayKeDon DESC, dt.MaDT DESC
        `, params);
        return rows;
    },

    getDetail: async (id) => {
        const [rows] = await db.query(`
            SELECT 
                dt.MaDT,
                dt.TrangThai,
                bn.HoTen,
                t.MaThuoc,
                t.TenThuoc,
                ct.SoLuong,
                COALESCE(px_sum.SoLuongDaXuat, 0) AS SoLuongDaXuat,
                ct.LieuDung AS CachDung,
                COALESCE(SUM(
                    CASE
                        WHEN l.TrangThai = 'DaHuy' THEN 0
                        ELSE GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)
                    END
                ), 0) AS SoLuongTon
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            LEFT JOIN LoThuoc l ON t.MaThuoc = l.MaThuoc
            LEFT JOIN (
                SELECT px.MaDT, lo.MaThuoc, SUM(ctpx.SoLuong) AS SoLuongDaXuat
                FROM PhieuXuatThuoc px
                JOIN ChiTietPhieuXuat ctpx ON px.MaPX = ctpx.MaPX
                JOIN LoThuoc lo ON ctpx.MaLo = lo.MaLo
                WHERE px.TrangThai = 'HoanThanh'
                GROUP BY px.MaDT, lo.MaThuoc
            ) px_sum ON dt.MaDT = px_sum.MaDT AND t.MaThuoc = px_sum.MaThuoc
            WHERE dt.MaDT = ?
            GROUP BY 
                dt.MaDT,
                dt.TrangThai,
                bn.HoTen,
                t.MaThuoc,
                t.TenThuoc,
                ct.SoLuong,
                px_sum.SoLuongDaXuat,
                ct.LieuDung
        `, [id]);

        return rows;
    },

    create: async (maPK, items) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Tìm MaBA từ MaPK
            const [baRows] = await connection.query('SELECT MaBA FROM BenhAn WHERE MaPK = ? ORDER BY MaBA DESC LIMIT 1', [maPK]);
            if (!baRows.length) {
                throw new Error('Chưa có bệnh án cho phiếu khám này, không thể kê đơn.');
            }
            const maBA = baRows[0].MaBA;

            // Kiểm tra xem đã có đơn thuốc chưa
            const [dtRows] = await connection.query('SELECT MaDT FROM DonThuoc WHERE MaBA = ?', [maBA]);
            let maDT;

            if (dtRows.length > 0) {
                // Đã có đơn thuốc, xóa chi tiết cũ
                maDT = dtRows[0].MaDT;
                await connection.query('DELETE FROM ChiTietDonThuoc WHERE MaDT = ?', [maDT]);
            } else {
                // Tạo mới đơn thuốc
                const [result] = await connection.query(`
                    INSERT INTO DonThuoc (MaBA, NgayKeDon, TrangThai)
                    VALUES (?, NOW(), 'ChuaXuat')
                `, [maBA]);
                maDT = result.insertId;
            }

            // Thêm chi tiết đơn thuốc
            for (const item of items) {
                await connection.query(`
                    INSERT INTO ChiTietDonThuoc (MaDT, MaThuoc, SoLuong, LieuDung)
                    VALUES (?, ?, ?, ?)
                `, [maDT, item.maThuoc, item.soLuong, item.lieuDung || '']);
            }

            await InvoicesService.syncPrescriptionToInvoice({
                MaBA: maBA,
                MaPK: maPK,
                connection
            });

            await connection.commit();
            return maDT;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

};

export default PrescriptionModel;
