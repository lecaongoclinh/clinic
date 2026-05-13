import db from '../config/db.js';
import InvoicesService from '../services/invoicesService.js';
import InvoicesModel from './invoicesModel.js';

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
                    phong.TenPhong,
                    hd.MaHD,
                    hd.TrangThai AS TrangThaiHoaDon
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                LEFT JOIN BenhNhan bn ON bn.MaBN = COALESCE(pk.MaBN, lk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
                LEFT JOIN HoaDon hd ON hd.MaBA = ba.MaBA OR hd.MaPK = ba.MaPK
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
        const query = `SELECT MaBA, MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu, NgayLap FROM BenhAn WHERE MaPK = ? ORDER BY MaBA DESC LIMIT 1`;
        const [rows] = await connection.execute(query, [maPK]);
        return rows[0] || null;
    }

    static async getExamWorkspace(maPK, connection = db) {
        const [ticketRows] = await connection.execute(`
            SELECT
                pk.MaPK,
                CONCAT('PK', LPAD(pk.MaPK, 6, '0')) AS MaPhieu,
                pk.STT,
                pk.MaBN,
                pk.MaLK,
                pk.MaBacSi,
                pk.MaChuyenKhoa,
                pk.MaPhong,
                pk.LoaiKham,
                pk.NgayKham,
                pk.TrangThai,
                bn.HoTen AS TenBenhNhan,
                bn.MaBN AS SoCCCD,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.DiaChi,
                bn.SoDienThoai,
                bs.HoTen AS TenBacSi,
                ck.TenChuyenKhoa,
                phong.TenPhong,
                lk.NgayHen,
                lk.GioHen,
                lk.LyDoKham
            FROM PhieuKham pk
            LEFT JOIN BenhNhan bn ON bn.MaBN = pk.MaBN
            LEFT JOIN LichKham lk ON lk.MaLK = pk.MaLK
            LEFT JOIN NhanVien bs ON bs.MaNV = pk.MaBacSi
            LEFT JOIN ChuyenKhoa ck ON ck.MaChuyenKhoa = pk.MaChuyenKhoa
            LEFT JOIN PhongKham phong ON phong.MaPhong = pk.MaPhong
            WHERE pk.MaPK = ?
            LIMIT 1
        `, [maPK]);

        const ticket = ticketRows[0] || null;
        if (!ticket) {
            return null;
        }

        const medicalRecord = await MedicalRecordsModel.getMedicalRecordByTicket(maPK, connection);
        const invoiceParams = medicalRecord?.MaBA ? [maPK, medicalRecord.MaBA] : [maPK, null];
        const [invoiceRows] = await connection.execute(`
            SELECT *
            FROM HoaDon
            WHERE MaPK = ? OR (? IS NOT NULL AND MaBA = ?)
            ORDER BY MaHD DESC
            LIMIT 1
        `, [invoiceParams[0], invoiceParams[1], invoiceParams[1]]);
        const invoice = invoiceRows[0] || null;
        const invoiceDetails = invoice?.MaHD ? await InvoicesModel.getDetails(invoice.MaHD, connection) : [];
        const orderedServices = invoiceDetails.filter((item) =>
            item.LoaiMuc === 'DichVu' && ['XetNghiem', 'SieuAm'].includes(item.LoaiDichVu)
        );

        let prescription = null;
        let prescriptionItems = [];
        if (medicalRecord?.MaBA) {
            const [prescriptionRows] = await connection.execute(`
                SELECT *
                FROM DonThuoc
                WHERE MaBA = ?
                ORDER BY MaDT DESC
                LIMIT 1
            `, [medicalRecord.MaBA]);
            prescription = prescriptionRows[0] || null;

            if (prescription?.MaDT) {
                const [items] = await connection.execute(`
                    SELECT
                        ct.MaCTDT,
                        ct.MaDT,
                        ct.MaThuoc,
                        t.TenThuoc,
                        t.HoatChat,
                        t.DonViCoBan,
                        t.GiaBan,
                        ct.SoLuong AS SoLuongKe,
                        ct.SoLuong,
                        ct.LieuDung,
                        ct.LieuDung AS CachDung
                    FROM ChiTietDonThuoc ct
                    LEFT JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
                    WHERE ct.MaDT = ?
                    ORDER BY ct.MaCTDT ASC
                `, [prescription.MaDT]);
                prescriptionItems = items;
            }
        }

        return {
            ticket,
            medicalRecord,
            invoice,
            invoiceDetails,
            orderedServices,
            prescription,
            prescriptionItems
        };
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
                    phong.TenPhong,
                    hd.MaHD,
                    hd.TrangThai AS TrangThaiHoaDon
                FROM BenhAn ba
                INNER JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
                LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
                INNER JOIN BenhNhan bn ON bn.MaBN = COALESCE(lk.MaBN, pk.MaBN)
                INNER JOIN NhanVien nv ON ba.MaBacSi = nv.MaNV
                INNER JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
                LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
                LEFT JOIN HoaDon hd ON hd.MaBA = ba.MaBA OR hd.MaPK = ba.MaPK
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

            if (!medicalRecord) {
                return {
                    medicalRecord: null,
                    prescription: null,
                    prescriptionItems: [],
                    invoice: null,
                    invoiceDetails: [],
                    orderedServices: []
                };
            }

            const prescriptionQuery = `
                SELECT dt.*, ba.MaBA
                FROM DonThuoc dt
                INNER JOIN BenhAn ba ON dt.MaBA = ba.MaBA
                WHERE ba.MaBA = ?
                ORDER BY dt.MaDT DESC
                LIMIT 1
            `;

            const [prescriptions] = await db.execute(prescriptionQuery, [maBA]);
            const prescription = prescriptions[0] || null;
            let prescriptionItems = [];
            if (prescription?.MaDT) {
                const [items] = await db.execute(`
                    SELECT
                        ct.MaDT,
                        ct.MaThuoc,
                        t.TenThuoc,
                        t.HoatChat,
                        ct.SoLuong AS SoLuongKe,
                        ct.LieuDung,
                        ct.LieuDung AS CachDung
                    FROM ChiTietDonThuoc ct
                    LEFT JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
                    WHERE ct.MaDT = ?
                    ORDER BY ct.MaCTDT ASC
                `, [prescription.MaDT]);
                prescriptionItems = items;
            }

            const invoiceQuery = `
                SELECT hd.*
                FROM HoaDon hd
                WHERE hd.MaBA = ? OR hd.MaPK = ?
                ORDER BY hd.MaHD DESC
                LIMIT 1
            `;

            const [invoices] = await db.execute(invoiceQuery, [maBA, medicalRecord.MaPK]);
            const invoice = invoices[0] || null;
            const invoiceDetails = invoice?.MaHD
                ? await InvoicesModel.getDetails(invoice.MaHD)
                : [];
            const orderedServices = invoiceDetails.filter((item) =>
                item.LoaiMuc === 'DichVu' && ['XetNghiem', 'SieuAm'].includes(item.LoaiDichVu)
            );

            return { medicalRecord, prescription, prescriptionItems, invoice, invoiceDetails, orderedServices };
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

    static async upsertMedicalRecordForTicket(maPK, maBacSi, data) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const ticket = await MedicalRecordsModel.getTicketForMedicalRecord(maPK, connection, true);
            if (!ticket) {
                throw new Error('Khong tim thay phieu kham');
            }
            if (!['DangKham', 'IN_PROGRESS'].includes(ticket.TrangThai)) {
                throw new Error('Chi co the tao hoac cap nhat benh an khi phieu kham dang kham');
            }

            const doctor = await MedicalRecordsModel.getDoctorById(maBacSi, connection);
            if (!doctor) {
                throw new Error('Bac si khong co quyen lap benh an');
            }
            const assignedDoctorId = ticket.MaBacSi || ticket.MaBacSiLichHen;
            if (assignedDoctorId && Number(assignedDoctorId) !== Number(maBacSi)) {
                throw new Error('Bac si khong co quyen lap benh an');
            }

            const { trieuChung, chuanDoan, ghiChu } = data;
            const existingRecord = await MedicalRecordsModel.getMedicalRecordByTicket(maPK, connection);
            let maBA = existingRecord?.MaBA || null;

            if (maBA) {
                await connection.execute(`
                    UPDATE BenhAn
                    SET TrieuChung = ?, ChuanDoan = ?, GhiChu = ?
                    WHERE MaBA = ?
                `, [trieuChung, chuanDoan, ghiChu || null, maBA]);
            } else {
                const [insertResult] = await connection.execute(`
                    INSERT INTO BenhAn (MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu)
                    VALUES (?, ?, ?, ?, ?)
                `, [maPK, maBacSi, trieuChung, chuanDoan, ghiChu || null]);
                maBA = insertResult.insertId;
            }

            await InvoicesService.linkMedicalRecordToVisitInvoice({
                MaPK: maPK,
                MaBA: maBA,
                MaNhanVien: maBacSi,
                connection
            });

            await connection.commit();
            return await MedicalRecordsModel.getExamWorkspace(maPK);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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

            if (!['DangKham', 'IN_PROGRESS'].includes(ticket.TrangThai)) {
                throw new Error('Phiếu khám không ở trạng thái đang khám');
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

            await InvoicesService.linkMedicalRecordToVisitInvoice({
                MaPK: maPK,
                MaBA: insertResult.insertId,
                MaNhanVien: maBacSi,
                connection
            });

            const serviceItems = Array.isArray(data.ChiTietDichVu) ? data.ChiTietDichVu : [];
            if (serviceItems.length) {
                await InvoicesService.addServiceItemsForVisit({
                    MaPK: maPK,
                    MaBA: insertResult.insertId,
                    MaNhanVien: maBacSi,
                    ChiTietDichVu: serviceItems,
                    connection
                });
            }

            await connection.execute(
                `UPDATE PhieuKham SET TrangThai = 'DaKham' WHERE MaPK = ?`,
                [maPK]
            );

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
