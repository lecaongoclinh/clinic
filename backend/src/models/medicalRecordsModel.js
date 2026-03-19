import db from '../config/db.js';

class MedicalRecordsModel {

    // Lấy danh sách bệnh nhân đã khám theo khoa (có phân trang, lọc theo ngày)
    static async getPatientsBySpecialty(maChuyenKhoa, tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            let query = `
                SELECT
                    bn.MaBN,
                    bn.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    bn.DiaChi,
                    bn.SoDienThoai,
                    ck.TenChuyenKhoa,
                    COUNT(ba.MaBA) as SoLanKham,
                    MAX(ba.NgayLap) as LanKhamGanNhat
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                INNER JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                WHERE nv.MaChuyenKhoa = ?
            `;

            const params = [maChuyenKhoa];

            if (tenBN && tenBN.trim()) {
                query += ` AND bn.HoTen LIKE ?`;
                params.push(`%${tenBN}%`);
            }

            if (fromDate && String(fromDate).trim()) {
                query += ` AND DATE(ba.NgayLap) >= ?`;
                params.push(String(fromDate));
            }

            if (toDate && String(toDate).trim()) {
                query += ` AND DATE(ba.NgayLap) <= ?`;
                params.push(String(toDate));
            }

            query += ` GROUP BY bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.DiaChi, bn.SoDienThoai, ck.MaChuyenKhoa, ck.TenChuyenKhoa
                       ORDER BY MAX(ba.NgayLap) DESC
                       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

            const [results] = await db.execute(query, params);

            // Count query
            let countQuery = `
                SELECT COUNT(DISTINCT bn.MaBN) as total
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                WHERE nv.MaChuyenKhoa = ?
            `;

            const countParams = [maChuyenKhoa];

            if (tenBN && tenBN.trim()) {
                countQuery += ` AND bn.HoTen LIKE ?`;
                countParams.push(`%${tenBN}%`);
            }

            if (fromDate && String(fromDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) >= ?`;
                countParams.push(String(fromDate));
            }

            if (toDate && String(toDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) <= ?`;
                countParams.push(String(toDate));
            }

            const [countResults] = await db.execute(countQuery, countParams);
            const total = countResults[0]?.total || 0;

            return { data: results, total };
        } catch (error) {
            throw error;
        }
    }

    // Lấy lịch sử khám của bệnh nhân
    static async getMedicalHistory(maBN) {
        try {
            const query = `
                SELECT
                    ba.MaBA,
                    ba.MaPK,
                    ba.TrieuChung,
                    ba.ChuanDoan,
                    ba.GhiChu,
                    ba.NgayLap,
                    pk.TrangThai as TrangThaiPhieuKham,
                    nv.HoTen as TenBacSi,
                    ck.TenChuyenKhoa,
                    phong.TenPhong
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                INNER JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
                WHERE bn.MaBN = ?
                ORDER BY ba.NgayLap DESC
            `;

            const [results] = await db.execute(query, [maBN]);
            return results;
        } catch (error) {
            throw error;
        }
    }

    // Lấy chi tiết bệnh án
    static async getMedicalRecordDetail(maBA) {
        try {
            const medicalRecordQuery = `
                SELECT
                    ba.*,
                    bn.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    nv.HoTen as TenBacSi,
                    ck.TenChuyenKhoa,
                    pk.TrangThai,
                    phong.TenPhong
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                INNER JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
                WHERE ba.MaBA = ?
            `;

            const [medicalRecords] = await db.execute(medicalRecordQuery, [maBA]);
            const medicalRecord = medicalRecords[0] || null;

            // Lấy đơn thuốc
            const prescriptionQuery = `
                SELECT dt.*, ba.MaBA
                FROM DonThuoc dt
                INNER JOIN BenhAn ba ON dt.MaBA = ba.MaBA
                WHERE ba.MaBA = ?
            `;

            const [prescriptions] = await db.execute(prescriptionQuery, [maBA]);
            const prescription = prescriptions[0] || null;

            // Lấy hóa đơn
            const invoiceQuery = `
                SELECT
                    hd.*,
                    SUM(cthd.SoTien) as TongTien
                FROM HoaDon hd
                LEFT JOIN ChiTietHoaDon cthd ON hd.MaHD = cthd.MaHD
                WHERE hd.MaBA = ?
                GROUP BY hd.MaHD
            `;

            const [invoices] = await db.execute(invoiceQuery, [maBA]);
            const invoice = invoices[0] || null;

            return { medicalRecord, prescription, invoice };
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật bệnh án
    static async updateMedicalRecord(maBA, data) {
        try {
            const { trieuChung, chuanDoan, ghiChu } = data;

            const query = `
                UPDATE BenhAn
                SET TrieuChung = ?, ChuanDoan = ?, GhiChu = ?
                WHERE MaBA = ?
            `;

            const [results] = await db.execute(query, [trieuChung, chuanDoan, ghiChu, maBA]);
            return results;
        } catch (error) {
            throw error;
        }
    }

    // Thêm bệnh án mới
    static async createMedicalRecord(maPK, maBacSi, data) {
        try {
            const { trieuChung, chuanDoan, ghiChu } = data;

            const query = `
                INSERT INTO BenhAn (MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu)
                VALUES (?, ?, ?, ?, ?)
            `;

            const [results] = await db.execute(query, [maPK, maBacSi, trieuChung, chuanDoan, ghiChu]);
            return results;
        } catch (error) {
            throw error;
        }
    }

    // Lấy danh sách chuyên khoa
    static async getAllSpecialties() {
        try {
            const query = `SELECT * FROM ChuyenKhoa ORDER BY TenChuyenKhoa`;
            const [results] = await db.execute(query);
            return results;
        } catch (error) {
            throw error;
        }
    }

    // Lấy tất cả bệnh nhân đã khám (có phân trang, lọc theo ngày)
    static async getAllPatientsWithRecords(tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            let query = `
                SELECT
                    bn.MaBN,
                    bn.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    bn.DiaChi,
                    bn.SoDienThoai,
                    COUNT(DISTINCT ba.MaBA) as SoLanKham,
                    MAX(ba.NgayLap) as LanKhamGanNhat
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                WHERE ba.MaBA IS NOT NULL
            `;

            const params = [];

            if (tenBN && tenBN.trim()) {
                query += ` AND bn.HoTen LIKE ?`;
                params.push(`%${tenBN}%`);
            }

            if (fromDate && String(fromDate).trim()) {
                query += ` AND DATE(ba.NgayLap) >= ?`;
                params.push(String(fromDate));
            }

            if (toDate && String(toDate).trim()) {
                query += ` AND DATE(ba.NgayLap) <= ?`;
                params.push(String(toDate));
            }

            query += ` GROUP BY bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.DiaChi, bn.SoDienThoai
                       ORDER BY MAX(ba.NgayLap) DESC
                       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

            const [results] = await db.execute(query, params);

            // Count query
            let countQuery = `
                SELECT COUNT(DISTINCT bn.MaBN) as total
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                WHERE ba.MaBA IS NOT NULL
            `;

            const countParams = [];

            if (tenBN && tenBN.trim()) {
                countQuery += ` AND bn.HoTen LIKE ?`;
                countParams.push(`%${tenBN}%`);
            }

            if (fromDate && String(fromDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) >= ?`;
                countParams.push(String(fromDate));
            }

            if (toDate && String(toDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) <= ?`;
                countParams.push(String(toDate));
            }

            const [countResults] = await db.execute(countQuery, countParams);
            const total = countResults[0]?.total || 0;

            return { data: results, total };
        } catch (error) {
            throw error;
        }
    }
}

export default MedicalRecordsModel;