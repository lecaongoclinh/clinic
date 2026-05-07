import db from '../config/db.js';
import InvoicesService from '../services/invoicesService.js';

class MedicalRecordsModel {
    static async getMedicalRecords(tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            let query = `
                SELECT
                    ba.MaBA,
                    ba.MaPK,
                    ba.MaBacSi,
                    ba.TrieuChung,
                    ba.ChuanDoan,
                    ba.GhiChu,
                    ba.NgayLap,
                    pk.TrangThai as TrangThaiPhieuKham,
                    COALESCE(pk.MaBN, lk.MaBN) as MaBN,
                    bn.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    nv.HoTen as TenBacSi,
                    ck.TenChuyenKhoa,
                    phong.TenPhong
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                LEFT JOIN BenhNhan bn ON bn.MaBN = COALESCE(pk.MaBN, lk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
                WHERE 1=1
            `;
            const params = [];

            if (tenBN && tenBN.trim()) {
                query += ` AND bn.HoTen LIKE ?`;
                params.push(`%${tenBN.trim()}%`);
            }
            if (fromDate && String(fromDate).trim()) {
                query += ` AND DATE(ba.NgayLap) >= ?`;
                params.push(String(fromDate));
            }
            if (toDate && String(toDate).trim()) {
                query += ` AND DATE(ba.NgayLap) <= ?`;
                params.push(String(toDate));
            }

            query += ` ORDER BY ba.NgayLap DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
            const [data] = await db.execute(query, params);

            let countQuery = `
                SELECT COUNT(*) as total
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                LEFT JOIN BenhNhan bn ON bn.MaBN = COALESCE(pk.MaBN, lk.MaBN)
                WHERE 1=1
            `;
            const countParams = [];

            if (tenBN && tenBN.trim()) {
                countQuery += ` AND bn.HoTen LIKE ?`;
                countParams.push(`%${tenBN.trim()}%`);
            }
            if (fromDate && String(fromDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) >= ?`;
                countParams.push(String(fromDate));
            }
            if (toDate && String(toDate).trim()) {
                countQuery += ` AND DATE(ba.NgayLap) <= ?`;
                countParams.push(String(toDate));
            }

            const [countRows] = await db.execute(countQuery, countParams);
            return { data, total: countRows[0]?.total || 0 };
        } catch (error) {
            throw error;
        }
    }

    static async getEligibleExamTickets({ maBacSi = '', tenBN = '', date = '', limit = 20, offset = 0 } = {}) {
        let query = `
            SELECT
                pk.MaPK,
                pk.MaLK,
                pk.MaBN,
                COALESCE(pk.MaBN, lk.MaBN) as MaBenhNhan,
                COALESCE(pk.MaBacSi, lk.MaBacSi) as MaBacSi,
                COALESCE(pk.MaChuyenKhoa, nv.MaChuyenKhoa) as MaChuyenKhoa,
                pk.MaPhong,
                pk.STT,
                pk.NgayKham,
                pk.TrangThai,
                bn.HoTen as TenBenhNhan,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.SoDienThoai,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa,
                phong.TenPhong,
                lk.GioHen
            FROM PhieuKham pk
            LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
            INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(pk.MaBN, lk.MaBN)
            LEFT JOIN NhanVien nv ON COALESCE(pk.MaBacSi, lk.MaBacSi) = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON COALESCE(pk.MaChuyenKhoa, nv.MaChuyenKhoa) = ck.MaChuyenKhoa
            LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
            LEFT JOIN BenhAn ba ON ba.MaPK = pk.MaPK
            WHERE pk.TrangThai IN ('ChoKham', 'DangKham')
              AND ba.MaBA IS NULL
        `;
        const params = [];

        if (maBacSi && String(maBacSi).trim()) {
            query += ` AND COALESCE(pk.MaBacSi, lk.MaBacSi) = ?`;
            params.push(maBacSi);
        }
        if (tenBN && String(tenBN).trim()) {
            query += ` AND bn.HoTen LIKE ?`;
            params.push(`%${String(tenBN).trim()}%`);
        }
        if (date && String(date).trim()) {
            query += ` AND DATE(pk.NgayKham) = ?`;
            params.push(String(date));
        }

        query += ` ORDER BY pk.NgayKham DESC, FIELD(pk.TrangThai, 'DangKham', 'ChoKham'), pk.STT ASC
                   LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [data] = await db.execute(query, params);

        let countQuery = `
            SELECT COUNT(*) as total
            FROM PhieuKham pk
            LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
            INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(pk.MaBN, lk.MaBN)
            LEFT JOIN BenhAn ba ON ba.MaPK = pk.MaPK
            WHERE pk.TrangThai IN ('ChoKham', 'DangKham')
              AND ba.MaBA IS NULL
        `;
        const countParams = [];

        if (maBacSi && String(maBacSi).trim()) {
            countQuery += ` AND COALESCE(pk.MaBacSi, lk.MaBacSi) = ?`;
            countParams.push(maBacSi);
        }
        if (tenBN && String(tenBN).trim()) {
            countQuery += ` AND bn.HoTen LIKE ?`;
            countParams.push(`%${String(tenBN).trim()}%`);
        }
        if (date && String(date).trim()) {
            countQuery += ` AND DATE(pk.NgayKham) = ?`;
            countParams.push(String(date));
        }

        const [countRows] = await db.execute(countQuery, countParams);
        return { data, total: countRows[0]?.total || 0 };
    }

    static async getPatientById(maBN) {
        const query = `
            SELECT MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai
            FROM BenhNhan
            WHERE MaBN = ?
        `;
        const [rows] = await db.execute(query, [maBN]);
        return rows[0] || null;
    }

    static async getTicketForMedicalRecord(maPK, connection = db, forUpdate = false) {
        const query = `
            SELECT
                pk.*,
                COALESCE(pk.MaBN, lk.MaBN) as MaBenhNhan,
                lk.MaBacSi as MaBacSiLichHen
            FROM PhieuKham pk
            LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
            WHERE pk.MaPK = ?
            ${forUpdate ? 'FOR UPDATE' : ''}
        `;
        const [rows] = await connection.execute(query, [maPK]);
        return rows[0] || null;
    }

    static async getDoctorById(maBacSi, connection = db) {
        const query = `
            SELECT MaNV, HoTen, MaVaiTro
            FROM NhanVien
            WHERE MaNV = ?
            AND MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
        `;
        const [rows] = await connection.execute(query, [maBacSi]);
        return rows[0] || null;
    }

    static async getMedicalRecordByTicket(maPK, connection = db) {
        const query = `SELECT MaBA, MaPK FROM BenhAn WHERE MaPK = ? LIMIT 1`;
        const [rows] = await connection.execute(query, [maPK]);
        return rows[0] || null;
    }

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

    static async createMedicalRecordWithTicketUpdate(maPK, maBacSi, data) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const ticket = await MedicalRecordsModel.getTicketForMedicalRecord(maPK, connection, true);
            if (!ticket) {
                throw new Error('Không tìm thấy phiếu khám');
            }

            if (!['DangKham', 'ChoKham'].includes(ticket.TrangThai)) {
                throw new Error('Phiếu khám không ở trạng thái cho phép lập bệnh án');
            }

            const doctor = await MedicalRecordsModel.getDoctorById(maBacSi, connection);
            if (!doctor) {
                throw new Error('Bác sĩ không có quyền lập bệnh án');
            }
            const assignedDoctorId = ticket.MaBacSi || ticket.MaBacSiLichHen;
            if (assignedDoctorId && Number(assignedDoctorId) !== Number(maBacSi)) {
                throw new Error('Bác sĩ không có quyền lập bệnh án');
            }

            const existingRecord = await MedicalRecordsModel.getMedicalRecordByTicket(maPK, connection);
            if (existingRecord) {
                throw new Error('Phiếu khám đã có bệnh án');
            }

            const { trieuChung, chuanDoan, ghiChu } = data;
            const insertQuery = `
                INSERT INTO BenhAn (MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu)
                VALUES (?, ?, ?, ?, ?)
            `;
            const [insertResult] = await connection.execute(insertQuery, [
                maPK,
                maBacSi,
                trieuChung,
                chuanDoan,
                ghiChu || null
            ]);

            await connection.execute(
                `UPDATE PhieuKham SET TrangThai = 'DaKham' WHERE MaPK = ?`,
                [maPK]
            );

            await InvoicesService.linkMedicalRecordToVisitInvoice({
                MaPK: maPK,
                MaBA: insertResult.insertId,
                MaNhanVien: maBacSi,
                connection
            });

            await connection.commit();

            const detail = await MedicalRecordsModel.getMedicalRecordDetail(insertResult.insertId);
            return {
                insertId: insertResult.insertId,
                medicalRecord: detail.medicalRecord
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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
