import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import InvoicesService from '../services/invoicesService.js';

const WAITING_DB = 'ChoKham';
const CANCELLED_DB = 'BoVe';
const ALLOWED_ROLES = new Set([1, 3]);

let schemaReady = false;
let patientSchemaReady = false;

const getAuthUser = (req) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return {
            MaNV: payload.id,
            Username: payload.userName,
            MaVaiTro: Number(payload.role)
        };
    } catch {
        return null;
    }
};

const requireReception = (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
        res.status(401).json({ success: false, message: 'Vui long dang nhap' });
        return null;
    }
    if (!ALLOWED_ROLES.has(user.MaVaiTro)) {
        res.status(403).json({ success: false, message: 'Chi ADMIN va RECEPTIONIST duoc thao tac phieu kham' });
        return null;
    }
    return user;
};

const ensureTicketSchema = async (connection = pool) => {
    if (schemaReady) return;

    const [columns] = await connection.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PhieuKham'`
    );
    const existing = new Set(columns.map((col) => col.COLUMN_NAME));
    const statements = [];

    if (!existing.has('MaBacSi')) {
        statements.push('ALTER TABLE PhieuKham ADD COLUMN MaBacSi INT NULL');
    }
    if (!existing.has('MaChuyenKhoa')) {
        statements.push('ALTER TABLE PhieuKham ADD COLUMN MaChuyenKhoa INT NULL');
    }
    if (!existing.has('LoaiKham')) {
        statements.push("ALTER TABLE PhieuKham ADD COLUMN LoaiKham ENUM('WALK_IN','APPOINTMENT') DEFAULT 'WALK_IN'");
    }
    if (!existing.has('ThoiGianTao')) {
        statements.push('ALTER TABLE PhieuKham ADD COLUMN ThoiGianTao DATETIME DEFAULT CURRENT_TIMESTAMP');
    }

    for (const sql of statements) {
        await connection.query(sql);
    }
    schemaReady = true;
};

const ensurePatientSchema = async (connection = pool) => {
    patientSchemaReady = true;
};

const normalizeStatus = (status) => {
    if (status === 'ChoKham') return 'WAITING';
    if (status === 'DangKham') return 'IN_PROGRESS';
    if (status === 'DaKham') return 'DONE';
    if (status === 'BoVe') return 'CANCELLED';
    return status || 'WAITING';
};

const getNextStt = async (connection, maBacSi) => {
    const [rows] = await connection.query(
        `SELECT COALESCE(MAX(STT), 0) + 1 AS nextStt
         FROM PhieuKham
         WHERE DATE(NgayKham) = CURDATE() AND MaBacSi = ?`,
        [maBacSi]
    );
    return rows[0].nextStt;
};

const ticketSelectSql = `
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
        pk.ThoiGianTao,
        COALESCE(pk.ThoiGianTao, TIMESTAMP(pk.NgayKham, '00:00:00')) AS ThoiGianTaoHienThi,
        bn.HoTen AS TenBenhNhan,
        bn.SoDienThoai,
        bn.MaBN AS SoCCCD,
        bn.NgaySinh,
        bn.GioiTinh,
        ck.TenChuyenKhoa,
        bs.HoTen AS TenBacSi,
        phong.TenPhong,
        lk.NgayHen,
        lk.GioHen,
        (SELECT COUNT(*) FROM DonThuoc dt JOIN BenhAn ba ON dt.MaBA = ba.MaBA WHERE ba.MaPK = pk.MaPK) > 0 AS DaKeDon
    FROM PhieuKham pk
    JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
    LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
    LEFT JOIN NhanVien bs ON pk.MaBacSi = bs.MaNV
    LEFT JOIN ChuyenKhoa ck ON pk.MaChuyenKhoa = ck.MaChuyenKhoa
    LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
`;

const mapTicket = (ticket) => ({
    ...ticket,
    LoaiKham: ticket.LoaiKham || (ticket.MaLK ? 'APPOINTMENT' : 'WALK_IN'),
    TrangThai: normalizeStatus(ticket.TrangThai),
    DaKeDon: Boolean(ticket.DaKeDon)
});

const getTicket = async (connection, maPK) => {
    const [rows] = await connection.query(`${ticketSelectSql} WHERE pk.MaPK = ?`, [maPK]);
    return rows[0] ? mapTicket(rows[0]) : null;
};

export const searchPatients = async (req, res) => {
    try {
        const rawKeyword = req.query.keyword || req.query.tenBN || '';
        const keyword = String(rawKeyword).trim();
        const shouldReturnArray = !req.query.keyword && req.query.tenBN !== undefined;
        
        if (!keyword || keyword.length < 2) {
            if (shouldReturnArray) {
                return res.json([]);
            }
            return res.json({ success: true, data: [] });
        }

        const [rows] = await pool.query(
            `SELECT MaBN, HoTen, SoDienThoai, MaBN AS SoCCCD, NgaySinh, DiaChi, GioiTinh, Email
             FROM BenhNhan
             WHERE MaBN LIKE ?
             ORDER BY HoTen
             LIMIT 10`,
            [`%${keyword.trim()}%`]
        );

        if (shouldReturnArray) {
            return res.json(rows);
        }

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('searchPatients:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const createPatient = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    try {
        await ensurePatientSchema();
        const { hoTen, ngaySinh, soDienThoai, soCCCD } = req.body;
        if (!hoTen || !ngaySinh || !soDienThoai || !soCCCD) {
            return res.status(400).json({ success: false, message: 'Vui long nhap ho ten, ngay sinh, so dien thoai va CCCD' });
        }

        const maBN = String(soCCCD).trim();
        const [exists] = await pool.query('SELECT MaBN, SoDienThoai FROM BenhNhan WHERE MaBN = ? OR SoDienThoai = ?', [maBN, soDienThoai]);
        const duplicatedCCCD = exists.some((row) => row.MaBN === maBN);
        const duplicatedPhone = exists.some((row) => row.SoDienThoai === soDienThoai);
        if (duplicatedCCCD) {
            return res.status(409).json({ success: false, message: 'So CCCD da ton tai' });
        }
        if (duplicatedPhone) {
            return res.status(409).json({ success: false, message: 'So dien thoai da ton tai' });
        }

        const [result] = await pool.query(
            `INSERT INTO BenhNhan (MaBN, HoTen, NgaySinh, SoDienThoai)
             VALUES (?, ?, ?, ?)`,
            [maBN, hoTen, ngaySinh, soDienThoai]
        );
        const [rows] = await pool.query(
            'SELECT MaBN, HoTen, SoDienThoai, MaBN AS SoCCCD, NgaySinh, DiaChi, GioiTinh, Email FROM BenhNhan WHERE MaBN = ?',
            [maBN]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createPatient:', error);
        res.status(500).json({ success: false, message: 'Loi server: ' + error.message });
    }
};

export const getSpecialties = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT MaChuyenKhoa, TenChuyenKhoa FROM ChuyenKhoa ORDER BY TenChuyenKhoa');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getSpecialties:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const getRooms = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT MaPhong, TenPhong, GhiChu FROM PhongKham ORDER BY TenPhong');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getRooms:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const getDoctorsBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;
        const [rows] = await pool.query(
            `SELECT DISTINCT
                nv.MaNV,
                nv.HoTen,
                nv.SoDienThoai,
                nv.MaChuyenKhoa,
                ck.TenChuyenKhoa,
                llb.MaLich,
                llb.MaPhong,
                pk.TenPhong,
                llb.NgayLam,
                llb.GioBatDau,
                llb.GioKetThuc
             FROM NhanVien nv
             LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
             INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
             INNER JOIN PhongKham pk ON llb.MaPhong = pk.MaPhong
             WHERE nv.MaVaiTro = 2
               AND nv.MaChuyenKhoa = ?
               AND nv.TrangThai = TRUE
               AND llb.NgayLam = CURDATE()
               AND CURTIME() BETWEEN llb.GioBatDau AND llb.GioKetThuc
             ORDER BY nv.HoTen`,
            [specialtyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getDoctorsBySpecialty:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const getPatientAppointments = async (req, res) => {
    try {
        await ensureTicketSchema();
        const { patientId } = req.params;
        const [rows] = await pool.query(
            `SELECT
                lk.MaLK,
                lk.MaBN,
                lk.MaBacSi,
                lk.MaLich,
                lk.NgayHen,
                lk.GioHen,
                lk.LyDoKham,
                lk.TrangThai,
                nv.HoTen AS TenBacSi,
                nv.MaChuyenKhoa,
                ck.TenChuyenKhoa,
                llb.MaPhong,
                phong.TenPhong
             FROM LichKham lk
             JOIN NhanVien nv ON lk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
             LEFT JOIN LichLamViecBacSi llb ON lk.MaLich = llb.MaLich
             LEFT JOIN PhongKham phong ON llb.MaPhong = phong.MaPhong
             LEFT JOIN PhieuKham pk ON pk.MaLK = lk.MaLK
             WHERE lk.MaBN = ?
               AND TIMESTAMP(lk.NgayHen, COALESCE(lk.GioHen, '00:00:00')) >= NOW()
               AND lk.TrangThai IN ('ChoXacNhan','DaXacNhan')
               AND pk.MaPK IS NULL
             ORDER BY lk.NgayHen, lk.GioHen`,
            [patientId]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getPatientAppointments:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

const validateWalkIn = (body) => {
    if (!body.MaBN) return 'Vui long chon benh nhan';
    if (!body.MaChuyenKhoa) return 'Vui long chon chuyen khoa';
    if (!body.MaBacSi) return 'Vui long chon bac si';
    return null;
};

const validateAppointment = (body) => {
    if (!body.MaBN) return 'Vui long chon benh nhan';
    if (!body.MaLK) return 'Vui long chon lich hen';
    return null;
};

export const createTicket = async (req, res) => {
    if (req.body.LoaiKham === 'APPOINTMENT') return createAppointmentTicket(req, res);
    return createWalkInTicket(req, res);
};

export const createWalkInTicket = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    const connection = await pool.getConnection();
    try {
        await ensureTicketSchema(connection);
        const message = validateWalkIn(req.body);
        if (message) return res.status(400).json({ success: false, message });

        const { MaBN, MaChuyenKhoa, MaBacSi } = req.body;
        await connection.beginTransaction();

        const [doctorRows] = await connection.query(
            `SELECT
                nv.MaNV,
                nv.HoTen,
                llb.MaLich,
                llb.MaPhong,
                phong.TenPhong
             FROM NhanVien nv
             INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
             INNER JOIN PhongKham phong ON llb.MaPhong = phong.MaPhong
             WHERE nv.MaNV = ?
               AND nv.MaVaiTro = 2
               AND nv.MaChuyenKhoa = ?
               AND llb.NgayLam = CURDATE()
               AND CURTIME() BETWEEN llb.GioBatDau AND llb.GioKetThuc
             LIMIT 1`,
            [MaBacSi, MaChuyenKhoa]
        );
        if (doctorRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Bac si khong co lich lam viec phu hop luc dang ky' });
        }

        const doctorSchedule = doctorRows[0];
        const stt = await getNextStt(connection, MaBacSi);
        const [result] = await connection.query(
            `INSERT INTO PhieuKham
                (MaBN, MaLeTan, MaBacSi, MaChuyenKhoa, MaPhong, MaLich, NgayKham, STT, TrangThai, LoaiKham, ThoiGianTao)
             VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, 'WALK_IN', NOW())`,
            [
                MaBN,
                user.MaNV,
                MaBacSi,
                MaChuyenKhoa,
                doctorSchedule.MaPhong,
                doctorSchedule.MaLich,
                stt,
                WAITING_DB
            ]
        );

        const ticket = await getTicket(connection, result.insertId);
        await InvoicesService.ensureVisitInvoice({
            MaPK: result.insertId,
            MaNhanVien: user.MaNV,
            MaChuyenKhoa,
            connection
        });
        await connection.commit();
        res.status(201).json({ success: true, message: 'Tao phieu kham thanh cong', ticket });
    } catch (error) {
        await connection.rollback();
        console.error('createWalkInTicket:', error);
        res.status(500).json({ success: false, message: 'Loi server: ' + error.message });
    } finally {
        connection.release();
    }
};

export const createAppointmentTicket = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    const connection = await pool.getConnection();
    try {
        await ensureTicketSchema(connection);
        const message = validateAppointment(req.body);
        if (message) return res.status(400).json({ success: false, message });

        const { MaBN, MaLK } = req.body;
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT MaPK FROM PhieuKham WHERE MaLK = ?', [MaLK]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Lich hen nay da duoc tao phieu kham' });
        }

        const [appointments] = await connection.query(
            `SELECT
                lk.*,
                nv.MaChuyenKhoa,
                llb.MaPhong
             FROM LichKham lk
             JOIN NhanVien nv ON lk.MaBacSi = nv.MaNV
             LEFT JOIN LichLamViecBacSi llb ON lk.MaLich = llb.MaLich
             WHERE lk.MaLK = ?
               AND lk.MaBN = ?
               AND lk.TrangThai IN ('ChoXacNhan','DaXacNhan')
               AND TIMESTAMP(lk.NgayHen, COALESCE(lk.GioHen, '00:00:00')) >= NOW()`,
            [MaLK, MaBN]
        );

        if (appointments.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Lich hen khong hop le hoac da qua gio hen' });
        }

        const appointment = appointments[0];
        const stt = await getNextStt(connection, appointment.MaBacSi);
        const [result] = await connection.query(
            `INSERT INTO PhieuKham
                (MaBN, MaLK, MaLich, MaLeTan, MaBacSi, MaChuyenKhoa, MaPhong, NgayKham, STT, TrangThai, LoaiKham, ThoiGianTao)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, 'APPOINTMENT', NOW())`,
            [
                appointment.MaBN,
                appointment.MaLK,
                appointment.MaLich || null,
                user.MaNV,
                appointment.MaBacSi,
                appointment.MaChuyenKhoa,
                appointment.MaPhong || null,
                stt,
                WAITING_DB
            ]
        );

        try {
            await connection.query("UPDATE LichKham SET TrangThai = 'RECEIVED' WHERE MaLK = ?", [MaLK]);
        } catch {
            await connection.query("UPDATE LichKham SET TrangThai = 'DaKham' WHERE MaLK = ?", [MaLK]);
        }

        const ticket = await getTicket(connection, result.insertId);
        await InvoicesService.ensureVisitInvoice({
            MaPK: result.insertId,
            MaNhanVien: user.MaNV,
            MaChuyenKhoa: appointment.MaChuyenKhoa,
            connection
        });
        await connection.commit();
        res.status(201).json({ success: true, message: 'Tao phieu kham thanh cong', ticket });
    } catch (error) {
        await connection.rollback();
        console.error('createAppointmentTicket:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Lich hen nay da duoc tao phieu kham'
            });
        }
        res.status(500).json({ success: false, message: 'Loi server: ' + error.message });
    } finally {
        connection.release();
    }
};

export const getWaitingTickets = async (req, res) => {
    try {
        await ensureTicketSchema();
        const maBacSi = req.query.maBacSi ? Number(req.query.maBacSi) : null;

        let sql = `${ticketSelectSql} WHERE DATE(pk.NgayKham) = CURDATE()`;
        const params = [];
        if (maBacSi) {
            sql += ' AND pk.MaBacSi = ?';
            params.push(maBacSi);
        }
        sql += ' ORDER BY pk.STT ASC, pk.MaPK DESC';

        const [rows] = await pool.query(sql, params);
        const data = rows.map(mapTicket);
        res.json({ success: true, data, total: data.length });
    } catch (error) {
        console.error('getWaitingTickets:', error);
        res.status(500).json({ success: false, message: 'Loi server: ' + error.message });
    }
};

export const getTicketById = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    try {
        await ensureTicketSchema();
        const ticket = await getTicket(pool, req.params.ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Khong tim thay phieu kham' });
        }
        if (ticket.TrangThai === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Phieu kham da huy, khong the in' });
        }
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('getTicketById:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const cancelTicket = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    const connection = await pool.getConnection();
    try {
        await ensureTicketSchema(connection);
        await connection.beginTransaction();

        const [rows] = await connection.query('SELECT MaPK, TrangThai FROM PhieuKham WHERE MaPK = ?', [req.params.ticketId]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Khong tim thay phieu kham' });
        }
        if (normalizeStatus(rows[0].TrangThai) !== 'WAITING') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Chi duoc danh dau bo kham voi phieu dang cho kham' });
        }

        await connection.query(
            'UPDATE PhieuKham SET TrangThai = ? WHERE MaPK = ?',
            [CANCELLED_DB, req.params.ticketId]
        );
        const ticket = await getTicket(connection, req.params.ticketId);
        await connection.commit();
        res.json({ success: true, message: 'Da danh dau benh nhan bo kham', ticket });
    } catch (error) {
        await connection.rollback();
        console.error('cancelTicket:', error);
        if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: 'Khong the bo kham vi server dang co thao tac xoa/sua khoa phieu kham cu. Hay restart backend de nap logic bo kham moi.'
            });
        }
        res.status(500).json({ success: false, message: 'Loi server' });
    } finally {
        connection.release();
    }
};

/**
 * PATCH /tickets/:ticketId/done
 * Bác sĩ đánh dấu phiếu khám đã hoàn thành (DaKham)
 */
export const markTicketDone = async (req, res) => {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Chua dang nhap' });

    try { jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Token khong hop le' }); }

    try {
        await ensureTicketSchema();
        const { ticketId } = req.params;
        const [rows] = await pool.query('SELECT MaPK, TrangThai FROM PhieuKham WHERE MaPK = ?', [ticketId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Khong tim thay phieu kham' });

        const current = normalizeStatus(rows[0].TrangThai);
        if (current === 'DONE') return res.json({ success: true, message: 'Phieu da duoc danh dau xong' });
        if (current === 'CANCELLED') return res.status(400).json({ success: false, message: 'Phieu da bi huy' });

        await pool.query("UPDATE PhieuKham SET TrangThai = 'DaKham' WHERE MaPK = ?", [ticketId]);
        const ticket = await getTicket(pool, ticketId);
        res.json({ success: true, message: 'Da danh dau kham xong', ticket });
    } catch (error) {
        console.error('markTicketDone:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

/**
 * PATCH /tickets/:ticketId/start
 * Bác sĩ bắt đầu khám (ChoKham → DangKham)
 */
export const markTicketStart = async (req, res) => {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Chua dang nhap' });

    try { jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Token khong hop le' }); }

    try {
        await ensureTicketSchema();
        const { ticketId } = req.params;
        const [rows] = await pool.query('SELECT MaPK, TrangThai FROM PhieuKham WHERE MaPK = ?', [ticketId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Khong tim thay phieu kham' });

        const current = normalizeStatus(rows[0].TrangThai);
        if (current === 'IN_PROGRESS') return res.json({ success: true, message: 'Phieu dang trong trang thai kham' });
        if (current === 'DONE')        return res.status(400).json({ success: false, message: 'Phieu da kham xong' });
        if (current === 'CANCELLED')   return res.status(400).json({ success: false, message: 'Phieu da bi huy' });

        await pool.query("UPDATE PhieuKham SET TrangThai = 'DangKham' WHERE MaPK = ?", [ticketId]);
        const ticket = await getTicket(pool, ticketId);
        res.json({ success: true, message: 'Da bat dau kham', ticket });
    } catch (error) {
        console.error('markTicketStart:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const callNextPatient = async (req, res) => {
    const user = requireReception(req, res);
    if (!user) return;

    try {
        await ensureTicketSchema();
        const [rows] = await pool.query(
            `${ticketSelectSql}
             WHERE pk.TrangThai = ?
             ORDER BY pk.STT ASC
             LIMIT 1`,
            [WAITING_DB]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Khong co benh nhan dang cho' });
        }
        await pool.query("UPDATE PhieuKham SET TrangThai = 'DangKham' WHERE MaPK = ?", [rows[0].MaPK]);
        res.json({ success: true, ticket: mapTicket({ ...rows[0], TrangThai: 'DangKham' }) });
    } catch (error) {
        console.error('callNextPatient:', error);
        res.status(500).json({ success: false, message: 'Loi server' });
    }
};
