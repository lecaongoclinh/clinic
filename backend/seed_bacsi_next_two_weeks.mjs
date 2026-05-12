import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env', quiet: true });
dotenv.config({ path: './.env', quiet: true });

const START_DATE = '2026-05-13';
const DAYS_TO_SEED = 14;
const DOCTOR_USERNAME = 'bacsi';
const DOCTOR_PASSWORD = '123456';
const BASE_SCHEDULE_ID = 9201;
const BASE_APPOINTMENT_ID = 9201;

const patientTemplates = [
  ['930000000001', 'Nguyen Bao Lam', '1988-02-14', 'Nam', '12 Nguyen Trai, Quan 5, TP.HCM', '0944000001', 'baolam.demo@example.vn'],
  ['930000000002', 'Tran Ha My', '1994-07-22', 'Nu', '41 Le Loi, Quan 1, TP.HCM', '0944000002', 'hamy.demo@example.vn'],
  ['930000000003', 'Le Quang Hieu', '1979-11-05', 'Nam', '8 Cach Mang Thang 8, Quan 10, TP.HCM', '0944000003', 'quanghieu.demo@example.vn'],
  ['930000000004', 'Pham Ngoc Linh', '2000-04-19', 'Nu', '33 Pham Van Dong, Thu Duc, TP.HCM', '0944000004', 'ngoclinh.demo@example.vn'],
  ['930000000005', 'Do Thanh Dat', '1968-09-30', 'Nam', '19 Vo Van Tan, Quan 3, TP.HCM', '0944000005', 'thanhdat.demo@example.vn'],
  ['930000000006', 'Bui Mai Anh', '2016-12-08', 'Nu', '25 Dien Bien Phu, Binh Thanh, TP.HCM', '0944000006', 'maianh.demo@example.vn'],
];

const reasons = [
  'Kham suc khoe dinh ky',
  'Dau bung am i sau an',
  'Ho va dau hong',
  'Tai kham theo hen',
  'Dau dau, mat ngu',
  'Tu van ket qua xet nghiem',
];

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

async function patientIdIsString(connection) {
  const [rows] = await connection.query(`
    SELECT DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BenhNhan'
      AND COLUMN_NAME = 'MaBN'
    LIMIT 1
  `);
  return !['int', 'bigint', 'smallint', 'mediumint'].includes(rows[0]?.DATA_TYPE);
}

async function ensureDoctor(connection) {
  await connection.query(`
    INSERT INTO VaiTro (MaVaiTro, TenVaiTro)
    VALUES (2, 'Bac Si')
    ON DUPLICATE KEY UPDATE TenVaiTro = VALUES(TenVaiTro)
  `);

  await connection.query(`
    INSERT INTO ChuyenKhoa (MaChuyenKhoa, TenChuyenKhoa)
    VALUES (1, 'Noi tong quat')
    ON DUPLICATE KEY UPDATE TenChuyenKhoa = VALUES(TenChuyenKhoa)
  `);

  const [existing] = await connection.query(
    `SELECT MaNV, HoTen, MaChuyenKhoa FROM NhanVien WHERE Username = ? LIMIT 1`,
    [DOCTOR_USERNAME],
  );

  if (existing.length) {
    const doctor = existing[0];
    if (!doctor.MaChuyenKhoa) {
      await connection.query(`UPDATE NhanVien SET MaVaiTro = 2, MaChuyenKhoa = 1, TrangThai = 1 WHERE MaNV = ?`, [doctor.MaNV]);
      doctor.MaChuyenKhoa = 1;
    } else {
      await connection.query(`UPDATE NhanVien SET MaVaiTro = 2, TrangThai = 1 WHERE MaNV = ?`, [doctor.MaNV]);
    }
    return doctor;
  }

  const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 10);
  const [created] = await connection.query(`
    INSERT INTO NhanVien
      (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa, TrangThai)
    VALUES
      ('BS. Demo Bac Si', '0944999900', 'bacsi.demo@clinic.local', ?, ?, 2, 1, 1)
  `, [DOCTOR_USERNAME, hashedPassword]);

  return { MaNV: created.insertId, HoTen: 'BS. Demo Bac Si', MaChuyenKhoa: 1 };
}

async function ensureRoom(connection, specialtyId) {
  const [sameSpecialtyRooms] = await connection.query(
    `SELECT MaPhong FROM PhongKham WHERE MaChuyenKhoa = ? ORDER BY MaPhong LIMIT 1`,
    [specialtyId],
  );
  if (sameSpecialtyRooms.length) return sameSpecialtyRooms[0].MaPhong;

  await connection.query(`
    INSERT INTO PhongKham (MaPhong, TenPhong, MaChuyenKhoa, GhiChu)
    VALUES (9201, 'Phong Demo Bac Si', ?, 'Du lieu demo cho tai khoan bacsi')
    ON DUPLICATE KEY UPDATE MaChuyenKhoa = VALUES(MaChuyenKhoa), GhiChu = VALUES(GhiChu)
  `, [specialtyId]);
  return 9201;
}

async function ensurePatients(connection) {
  const stringId = await patientIdIsString(connection);
  const rows = patientTemplates.map((patient, index) => [
    stringId ? patient[0] : 9201 + index,
    patient[1],
    patient[2],
    patient[3],
    patient[4],
    patient[5],
    patient[6],
  ]);

  await connection.query(`
    INSERT INTO BenhNhan
      (MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      HoTen = VALUES(HoTen),
      NgaySinh = VALUES(NgaySinh),
      GioiTinh = VALUES(GioiTinh),
      DiaChi = VALUES(DiaChi),
      SoDienThoai = VALUES(SoDienThoai),
      Email = VALUES(Email)
  `, [rows]);

  return rows.map((row) => row[0]);
}

function buildSchedules(doctorId, roomId) {
  const rows = [];
  let maLich = BASE_SCHEDULE_ID;

  for (let day = 0; day < DAYS_TO_SEED; day += 1) {
    const ngayLam = addDays(START_DATE, day);
    rows.push([maLich, doctorId, roomId, ngayLam, '08:00:00', '12:00:00']);
    maLich += 1;
    rows.push([maLich, doctorId, roomId, ngayLam, '13:30:00', '17:30:00']);
    maLich += 1;
  }

  return rows;
}

function buildAppointments(doctorId, patientIds) {
  const rows = [];
  let maLK = BASE_APPOINTMENT_ID;

  for (let day = 0; day < DAYS_TO_SEED; day += 1) {
    const ngayHen = addDays(START_DATE, day);
    const morningScheduleId = BASE_SCHEDULE_ID + day * 2;
    const afternoonScheduleId = morningScheduleId + 1;

    rows.push([
      maLK,
      patientIds[day % patientIds.length],
      doctorId,
      ngayHen,
      '08:30:00',
      reasons[day % reasons.length],
      'DaXacNhan',
      morningScheduleId,
    ]);
    maLK += 1;

    rows.push([
      maLK,
      patientIds[(day + 2) % patientIds.length],
      doctorId,
      ngayHen,
      '14:00:00',
      reasons[(day + 3) % reasons.length],
      day % 4 === 0 ? 'ChoXacNhan' : 'DaXacNhan',
      afternoonScheduleId,
    ]);
    maLK += 1;
  }

  return rows;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.beginTransaction();

    const doctor = await ensureDoctor(connection);
    const roomId = await ensureRoom(connection, doctor.MaChuyenKhoa || 1);
    const patientIds = await ensurePatients(connection);
    const schedules = buildSchedules(doctor.MaNV, roomId);
    const appointments = buildAppointments(doctor.MaNV, patientIds);

    await connection.query(`
      INSERT INTO LichLamViecBacSi
        (MaLich, MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        MaBacSi = VALUES(MaBacSi),
        MaPhong = VALUES(MaPhong),
        NgayLam = VALUES(NgayLam),
        GioBatDau = VALUES(GioBatDau),
        GioKetThuc = VALUES(GioKetThuc)
    `, [schedules]);

    await connection.query(`
      INSERT INTO LichKham
        (MaLK, MaBN, MaBacSi, NgayHen, GioHen, LyDoKham, TrangThai, MaLich)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        MaBN = VALUES(MaBN),
        MaBacSi = VALUES(MaBacSi),
        NgayHen = VALUES(NgayHen),
        GioHen = VALUES(GioHen),
        LyDoKham = VALUES(LyDoKham),
        TrangThai = VALUES(TrangThai),
        MaLich = VALUES(MaLich)
    `, [appointments]);

    await connection.commit();
    console.log(`Seeded ${schedules.length} schedules and ${appointments.length} appointments for ${DOCTOR_USERNAME} (${doctor.MaNV}) from ${START_DATE} to ${addDays(START_DATE, DAYS_TO_SEED - 1)}.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
