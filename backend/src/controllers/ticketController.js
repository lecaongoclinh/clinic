import pool from '../config/db.js';

// Tìm kiếm bệnh nhân
export const searchPatients = async (req, res) => {
    try {
        const { keyword } = req.query;
        
        if (!keyword || keyword.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const [rows] = await pool.query(
            `SELECT 
                MaBN, 
                HoTen, 
                SoDienThoai, 
                NgaySinh,
                DiaChi,
                GioiTinh
             FROM BenhNhan 
             WHERE HoTen LIKE ? OR SoDienThoai LIKE ? OR MaBN LIKE ?
             LIMIT 10`,
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error in searchPatients:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách chuyên khoa
export const getSpecialties = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT MaChuyenKhoa, TenChuyenKhoa FROM ChuyenKhoa ORDER BY TenChuyenKhoa'
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error in getSpecialties:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Trong getDoctorsBySpecialty
export const getDoctorsBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;
        
        const [dateResult] = await pool.query('SELECT CURDATE() as today');
        const today = dateResult[0].today;
        
        console.log('Ngày từ MySQL:', today);
        console.log('Mã chuyên khoa:', specialtyId);

        const query = `
            SELECT DISTINCT 
                nv.MaNV, 
                nv.HoTen, 
                nv.SoDienThoai,
                ck.TenChuyenKhoa,
                llb.NgayLam,
                llb.GioBatDau,
                llb.GioKetThuc,
                pk.TenPhong
            FROM NhanVien nv
            INNER JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
            LEFT JOIN PhongKham pk ON llb.MaPhong = pk.MaPhong
            WHERE nv.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
                AND llb.NgayLam = ?
                AND ck.MaChuyenKhoa = ?
            ORDER BY nv.HoTen ASC
        `;
        
        const [rows] = await pool.query(query, [today, specialtyId]);
        
        console.log(`Tìm thấy ${rows.length} bác sĩ cho ngày ${today}`);
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


export const getPatientAppointments = async (req, res) => {
    try {
        const { patientId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const [rows] = await pool.query(
            `SELECT 
                lk.MaLK,
                lk.NgayHen,
                lk.GioHen,
                lk.LyDoKham,
                lk.TrangThai,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa
             FROM LichKham lk
             JOIN NhanVien nv ON lk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
             WHERE lk.MaBN = ? 
                AND lk.NgayHen >= ?
                AND lk.TrangThai IN ('ChoXacNhan', 'DaXacNhan')
             ORDER BY lk.NgayHen ASC, lk.GioHen ASC`,
            [patientId, today]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error in getPatientAppointments:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Hàm chọn bác sĩ ngẫu nhiên có lịch làm việc trong ngày
const selectRandomDoctor = async (connection, maChuyenKhoa) => {
    const [doctors] = await connection.query(
        `SELECT nv.MaNV, nv.HoTen
         FROM NhanVien nv
         INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
         WHERE nv.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            AND nv.MaChuyenKhoa = ?
            AND llb.NgayLam = CURDATE()
         ORDER BY RAND()
         LIMIT 1`,
        [maChuyenKhoa]
    );
    
    return doctors.length > 0 ? doctors[0] : null;
};

// Hàm chọn bác sĩ theo lịch sử khám bệnh
const selectDoctorByHistory = async (connection, maBN, maChuyenKhoa) => {
    const [previousDoctor] = await connection.query(
        `SELECT DISTINCT pk.MaBacSi, nv.HoTen, COUNT(*) as SoLanKham
         FROM PhieuKham pk
         JOIN NhanVien nv ON pk.MaBacSi = nv.MaNV
         WHERE pk.MaBN = ? 
            AND nv.MaChuyenKhoa = ?
            AND pk.MaBacSi IS NOT NULL
         GROUP BY pk.MaBacSi, nv.HoTen
         ORDER BY SoLanKham DESC
         LIMIT 1`,
        [maBN, maChuyenKhoa]
    );

    if (previousDoctor.length > 0) {
        // Kiểm tra bác sĩ cũ có lịch làm việc hôm nay không
        const [schedule] = await connection.query(
            `SELECT * FROM LichLamViecBacSi 
             WHERE MaBacSi = ? AND NgayLam = CURDATE()`,
            [previousDoctor[0].MaBacSi]
        );
        
        if (schedule.length > 0) {
            return previousDoctor[0];
        }
    }
    return null;
};

// Hàm chọn bác sĩ có ít bệnh nhân nhất
const selectLeastBusyDoctor = async (connection, maChuyenKhoa) => {
    const [doctor] = await connection.query(
        `SELECT 
            nv.MaNV,
            nv.HoTen,
            COUNT(pk.MaPK) as SoBenhNhanHomNay
         FROM NhanVien nv
         INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
         LEFT JOIN PhieuKham pk ON nv.MaNV = pk.MaBacSi 
            AND DATE(pk.NgayKham) = CURDATE()
            AND pk.TrangThai IN ('ChoKham', 'DangKham')
         WHERE nv.MaVaiTro = (SELECT MaVaiTro FROM VaiTro WHERE TenVaiTro = 'Bac Si')
            AND nv.MaChuyenKhoa = ?
            AND llb.NgayLam = CURDATE()
         GROUP BY nv.MaNV, nv.HoTen
         ORDER BY SoBenhNhanHomNay ASC, RAND()
         LIMIT 1`,
        [maChuyenKhoa]
    );
    
    return doctor.length > 0 ? doctor[0] : null;
};

// Tạo phiếu khám tại chỗ
export const createWalkInTicket = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { MaBN, MaChuyenKhoa, MaBacSi } = req.body;
        const [dateResult] = await connection.query('SELECT CURDATE() as today');
        const today = dateResult[0].today;
        
        console.log('Tạo phiếu ngày:', today);
        

        if (!MaBN) {
            return res.status(400).json({ 
                success: false,
                message: 'Vui lòng chọn bệnh nhân' 
            });
        }

        if (!MaChuyenKhoa) {
            return res.status(400).json({ 
                success: false,
                message: 'Vui lòng chọn chuyên khoa' 
            });
        }

        // Kiểm tra bệnh nhân đã có phiếu khám hôm nay chưa
        const [existingTicket] = await connection.query(
            `SELECT * FROM PhieuKham 
             WHERE MaBN = ? AND DATE(NgayKham) = CURDATE() 
                AND TrangThai IN ('ChoKham', 'DangKham')`,
            [MaBN]
        );

        if (existingTicket.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Bệnh nhân đã có phiếu khám hôm nay',
                ticket: existingTicket[0]
            });
        }

        let selectedDoctor = null;
        let selectedDoctorName = '';

        // Nếu có chọn bác sĩ cụ thể
        if (MaBacSi) {
            // Kiểm tra bác sĩ được chọn có lịch làm việc hôm nay không
            const [doctorSchedule] = await connection.query(
                `SELECT nv.HoTen 
                 FROM NhanVien nv
                 INNER JOIN LichLamViecBacSi llb ON nv.MaNV = llb.MaBacSi
                 WHERE nv.MaNV = ? 
                    AND nv.MaChuyenKhoa = ?
                    AND llb.NgayLam = CURDATE()`,
                [MaBacSi, MaChuyenKhoa]
            );

            if (doctorSchedule.length > 0) {
                selectedDoctor = MaBacSi;
                selectedDoctorName = doctorSchedule[0].HoTen;
                console.log(`Bệnh nhân chọn bác sĩ: ${selectedDoctorName}`);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Bác sĩ được chọn không có lịch làm việc hôm nay'
                });
            }
        } else {
            // Tự động chọn bác sĩ
            console.log('Bệnh nhân không chọn bác sĩ, hệ thống tự động xếp...');
            
            // 1: Bác sĩ đã từng khám bệnh nhân này
            const historyDoctor = await selectDoctorByHistory(connection, MaBN, MaChuyenKhoa);
            
            if (historyDoctor) {
                selectedDoctor = historyDoctor.MaBacSi;
                selectedDoctorName = historyDoctor.HoTen;
                console.log(`Chọn bác sĩ theo lịch sử: ${selectedDoctorName} (đã khám ${historyDoctor.SoLanKham} lần)`);
            } else {
                // Bác sĩ ít bệnh nhất
                const leastBusyDoctor = await selectLeastBusyDoctor(connection, MaChuyenKhoa);
                
                if (leastBusyDoctor) {
                    selectedDoctor = leastBusyDoctor.MaNV;
                    selectedDoctorName = leastBusyDoctor.HoTen;
                    console.log(`Chọn bác sĩ ít bệnh nhất: ${selectedDoctorName} (${leastBusyDoctor.SoBenhNhanHomNay || 0} bệnh nhân)`);
                } else {
                    // Bác sĩ ngẫu nhiên
                    const randomDoctor = await selectRandomDoctor(connection, MaChuyenKhoa);
                    
                    if (randomDoctor) {
                        selectedDoctor = randomDoctor.MaNV;
                        selectedDoctorName = randomDoctor.HoTen;
                        console.log(`Chọn bác sĩ ngẫu nhiên: ${selectedDoctorName}`);
                    }
                }
            }
        }

        if (!selectedDoctor) {
            return res.status(400).json({
                success: false,
                message: 'Không có bác sĩ nào làm việc trong chuyên khoa này hôm nay'
            });
        }

        // Lấy số thứ tự tiếp theo
        const [sttResult] = await connection.query(
            `SELECT COALESCE(MAX(STT), 0) + 1 as next_stt 
             FROM PhieuKham WHERE DATE(NgayKham) = CURDATE()`
        );
        const stt = sttResult[0].next_stt;

        // Lấy thông tin lễ tân từ token
        const maLeTan = req.user?.MaNV || 3;

        // Tạo phiếu khám
        const [insertResult] = await connection.query(
            `INSERT INTO PhieuKham (
                MaBN, 
                MaLeTan, 
                MaBacSi,
                MaChuyenKhoa,
                NgayKham, 
                STT,
                TrangThai
            ) VALUES (?, ?, ?, ?, CURDATE(), ?, 'ChoKham')`,
            [
                MaBN,
                maLeTan,
                selectedDoctor,
                MaChuyenKhoa,
                stt
            ]
        );

        // Lấy thông tin phiếu vừa tạo
        const [newTicket] = await connection.query(
            `SELECT 
                pk.MaPK,
                pk.STT,
                pk.NgayKham,
                pk.TrangThai,
                bn.HoTen as TenBenhNhan,
                bn.SoDienThoai,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa
             FROM PhieuKham pk
             JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
             LEFT JOIN NhanVien nv ON pk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON pk.MaChuyenKhoa = ck.MaChuyenKhoa
             WHERE pk.MaPK = ?`,
            [insertResult.insertId]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: selectedDoctor ? 
                `Tạo phiếu khám thành công với bác sĩ ${selectedDoctorName}` : 
                'Tạo phiếu khám thành công',
            ticket: {
                ...newTicket[0],
                LoaiKham: 'WALK_IN'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error in createWalkInTicket:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        connection.release();
    }
};

// Tạo phiếu khám từ lịch hẹn
export const createAppointmentTicket = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { MaLK } = req.body;

        if (!MaLK) {
            return res.status(400).json({ 
                success: false,
                message: 'Vui lòng chọn lịch hẹn' 
            });
        }

        // Lấy thông tin lịch hẹn
        const [appointment] = await connection.query(
            `SELECT lk.*, bn.HoTen as TenBenhNhan, bn.SoDienThoai,
                    nv.MaChuyenKhoa, ck.TenChuyenKhoa, nv.HoTen as TenBacSi
             FROM LichKham lk
             JOIN BenhNhan bn ON lk.MaBN = bn.MaBN
             JOIN NhanVien nv ON lk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
             WHERE lk.MaLK = ?`,
            [MaLK]
        );

        if (appointment.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy lịch hẹn' 
            });
        }

        // Kiểm tra lịch hẹn đã được tạo phiếu chưa
        const [existingTicket] = await connection.query(
            `SELECT * FROM PhieuKham WHERE MaLK = ?`,
            [MaLK]
        );

        if (existingTicket.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Lịch hẹn này đã được tạo phiếu khám' 
            });
        }

        // Lấy số thứ tự tiếp theo
        const [sttResult] = await connection.query(
            `SELECT COALESCE(MAX(STT), 0) + 1 as next_stt 
             FROM PhieuKham WHERE DATE(NgayKham) = CURDATE()`
        );
        const stt = sttResult[0].next_stt;

        // Lấy thông tin lễ tân từ token
        const maLeTan = req.user?.MaNV || 3;

        // Tạo phiếu khám từ lịch hẹn
        const [result] = await connection.query(
            `INSERT INTO PhieuKham (
                MaBN,
                MaLeTan,
                MaBacSi,
                MaChuyenKhoa,
                MaLK,
                NgayKham,
                STT,
                TrangThai
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ChoKham')`,
            [
                appointment[0].MaBN,
                maLeTan,
                appointment[0].MaBacSi,
                appointment[0].MaChuyenKhoa,
                MaLK,
                appointment[0].NgayHen,
                stt
            ]
        );

        // Cập nhật trạng thái lịch hẹn
        await connection.query(
            `UPDATE LichKham SET TrangThai = 'DaKham' WHERE MaLK = ?`,
            [MaLK]
        );

        // Lấy thông tin phiếu vừa tạo
        const [newTicket] = await connection.query(
            `SELECT 
                pk.MaPK,
                pk.STT,
                pk.NgayKham,
                pk.TrangThai,
                bn.HoTen as TenBenhNhan,
                bn.SoDienThoai,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa
             FROM PhieuKham pk
             JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
             LEFT JOIN NhanVien nv ON pk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON pk.MaChuyenKhoa = ck.MaChuyenKhoa
             WHERE pk.MaPK = ?`,
            [result.insertId]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Tạo phiếu khám từ lịch hẹn thành công',
            ticket: {
                ...newTicket[0],
                LoaiKham: 'APPOINTMENT',
                GioHen: appointment[0].GioHen
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error in createAppointmentTicket:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        connection.release();
    }
};

// Lấy danh sách phiếu khám đang chờ
export const getWaitingTickets = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                pk.MaPK,
                pk.STT,
                pk.NgayKham,
                pk.TrangThai,
                bn.HoTen as TenBenhNhan,
                bn.SoDienThoai,
                nv.HoTen as TenBacSi,
                ck.TenChuyenKhoa,
                CASE 
                    WHEN pk.MaLK IS NOT NULL THEN CONCAT('Hẹn: ', TIME_FORMAT(lk.GioHen, '%H:%i'))
                    ELSE CONCAT('Số: ', LPAD(pk.STT, 2, '0'))
                END as DisplayInfo,
                CASE 
                    WHEN pk.MaLK IS NOT NULL THEN 'appointment'
                    ELSE 'walk-in'
                END as LoaiKham,
                lk.GioHen
             FROM PhieuKham pk
             JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
             LEFT JOIN NhanVien nv ON pk.MaBacSi = nv.MaNV
             LEFT JOIN ChuyenKhoa ck ON pk.MaChuyenKhoa = ck.MaChuyenKhoa
             LEFT JOIN LichKham lk ON pk.MaLK = lk.MaLK
             WHERE pk.TrangThai = 'ChoKham' 
                AND DATE(pk.NgayKham) = CURDATE()
             ORDER BY 
                CASE 
                    WHEN pk.MaLK IS NOT NULL THEN 0 
                    ELSE 1 
                END,
                pk.STT ASC`
        );

        res.json({
            success: true,
            data: rows,
            total: rows.length
        });

    } catch (error) {
        console.error('Error in getWaitingTickets:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Gọi bệnh nhân tiếp theo
export const callNextPatient = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const [nextTicket] = await connection.query(
            `SELECT pk.*, bn.HoTen as TenBenhNhan, nv.HoTen as TenBacSi
             FROM PhieuKham pk
             JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
             LEFT JOIN NhanVien nv ON pk.MaBacSi = nv.MaNV
             WHERE pk.TrangThai = 'ChoKham' 
                AND DATE(pk.NgayKham) = CURDATE()
             ORDER BY 
                CASE 
                    WHEN pk.MaLK IS NOT NULL THEN 0 
                    ELSE 1 
                END,
                pk.STT ASC
             LIMIT 1`
        );

        if (nextTicket.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false,
                message: 'Không có bệnh nhân nào đang chờ' 
            });
        }

        // Cập nhật trạng thái thành 'DangKham'
        await connection.query(
            'UPDATE PhieuKham SET TrangThai = ? WHERE MaPK = ?',
            ['DangKham', nextTicket[0].MaPK]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Gọi bệnh nhân thành công',
            ticket: {
                ...nextTicket[0],
                TenBenhNhan: nextTicket[0].TenBenhNhan,
                TenBacSi: nextTicket[0].TenBacSi
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error in callNextPatient:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};