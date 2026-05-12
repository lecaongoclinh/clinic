import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env', quiet: true });
dotenv.config({ path: './.env', quiet: true });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinicmanagement',
  multipleStatements: false,
};

const START_DATE = '2026-05-13';
const DAYS_TO_SEED = 14;

const specialties = [
  [1, 'Noi tong quat'],
  [2, 'Nhi khoa'],
  [3, 'San phu khoa'],
  [4, 'Tim mach'],
  [5, 'Tai mui hong'],
];

const doctors = [
  [10, 'BS. Le Van Hai', '0912345678', 'bsb@clinic.com', 'bsb', 1],
  [11, 'BS. Tran Thi Ngan', '0923456789', 'bsc@clinic.com', 'bsc', 2],
  [12, 'BS. Pham Van Dong', '0934567890', 'bsd@clinic.com', 'bsd', 3],
  [13, 'BS. Nguyen Thi Hoa', '0945678901', 'bse@clinic.com', 'bse', 4],
];

const rooms = [
  [1, 'Phong 101 - Noi tong quat', 1, 'Tang 1'],
  [2, 'Phong 102 - Nhi khoa', 2, 'Tang 1'],
  [3, 'Phong 201 - San phu khoa', 3, 'Tang 2'],
  [4, 'Phong 202 - Tim mach', 4, 'Tang 2'],
];

const patientTemplates = [
  ['Nguyen Minh Chau', '1989-01-15', 'Nu', '18 Vo Van Tan, Quan 3, TP.HCM', '0933000001', 'minhchau.seed@example.vn'],
  ['Tran Duc Long', '1992-08-09', 'Nam', '52 Nguyen Thai Hoc, Quan 1, TP.HCM', '0933000002', 'duclong.seed@example.vn'],
  ['Le Thi Kim Ngan', '1985-11-22', 'Nu', '31 Phan Xich Long, Phu Nhuan, TP.HCM', '0933000003', 'kimngan.seed@example.vn'],
  ['Pham Quoc Viet', '1978-03-03', 'Nam', '9 Hoang Van Thu, Tan Binh, TP.HCM', '0933000004', 'quocviet.seed@example.vn'],
  ['Do Gia Han', '2001-12-18', 'Nu', '70 Cach Mang Thang 8, Quan 10, TP.HCM', '0933000005', 'giahan.seed@example.vn'],
  ['Bui Thanh Son', '1966-07-27', 'Nam', '6 Truong Son, Tan Binh, TP.HCM', '0933000006', 'thanhson.seed@example.vn'],
  ['Vo Nhat Linh', '1999-05-05', 'Khac', '12 Nguyen Dinh Chieu, Quan 3, TP.HCM', '0933000007', 'nhatlinh.seed@example.vn'],
  ['Hoang Bao An', '2015-09-12', 'Nam', '15 Le Van Sy, Quan 3, TP.HCM', '0933000008', 'baoan.seed@example.vn'],
];

const reasons = [
  'Dau bung am i, can kham noi',
  'Kham suc khoe tong quat',
  'Tai kham viem da day',
  'Tre ho va so mui',
  'Tu van san phu khoa dinh ky',
  'Hoi hop, tuc nguc khi gang suc',
  'Dau dau keo dai',
  'Kiem tra sau dieu tri',
];

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getPatientIdMode(connection) {
  const [rows] = await connection.execute(
    `
      SELECT DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'BenhNhan'
        AND COLUMN_NAME = 'MaBN'
      LIMIT 1
    `,
  );
  return rows[0]?.DATA_TYPE && !['int', 'bigint', 'smallint', 'mediumint'].includes(rows[0].DATA_TYPE)
    ? 'string'
    : 'number';
}

function makePatientId(mode, index) {
  return mode === 'string' ? `90000000000${index + 1}` : 9001 + index;
}

async function seedBaseData(connection, patientIdMode) {
  await connection.execute(
    `
      INSERT INTO VaiTro (MaVaiTro, TenVaiTro)
      VALUES (1, 'Admin'), (2, 'Bac Si'), (3, 'Le Tan')
      ON DUPLICATE KEY UPDATE TenVaiTro = VALUES(TenVaiTro)
    `,
  );

  await connection.query(
    `
      INSERT INTO ChuyenKhoa (MaChuyenKhoa, TenChuyenKhoa)
      VALUES ?
      ON DUPLICATE KEY UPDATE TenChuyenKhoa = VALUES(TenChuyenKhoa)
    `,
    [specialties],
  );

  await connection.query(
    `
      INSERT INTO PhongKham (MaPhong, TenPhong, MaChuyenKhoa, GhiChu)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        TenPhong = VALUES(TenPhong),
        MaChuyenKhoa = VALUES(MaChuyenKhoa),
        GhiChu = VALUES(GhiChu)
    `,
    [rooms],
  );

  await connection.query(
    `
      INSERT INTO NhanVien
        (MaNV, HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa, TrangThai)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        HoTen = VALUES(HoTen),
        SoDienThoai = VALUES(SoDienThoai),
        Email = VALUES(Email),
        Password = VALUES(Password),
        MaVaiTro = VALUES(MaVaiTro),
        MaChuyenKhoa = VALUES(MaChuyenKhoa),
        TrangThai = VALUES(TrangThai)
    `,
    [doctors.map(([id, name, phone, email, username, specialtyId]) => [id, name, phone, email, username, '123456', 2, specialtyId, 1])],
  );

  const patients = patientTemplates.map((patient, index) => [makePatientId(patientIdMode, index), ...patient]);
  await connection.query(
    `
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
    `,
    [patients],
  );

  return patients.map(([id]) => id);
}

function buildScheduleRows() {
  const rows = [];
  let maLich = 9001;

  for (let day = 0; day < DAYS_TO_SEED; day += 1) {
    const ngayLam = addDays(START_DATE, day);
    for (const [doctorId, , , , , specialtyId] of doctors) {
      const roomId = specialtyId;
      rows.push([maLich, doctorId, roomId, ngayLam, '08:00:00', '12:00:00']);
      maLich += 1;
      rows.push([maLich, doctorId, roomId, ngayLam, '13:30:00', '17:30:00']);
      maLich += 1;
    }
  }

  return rows;
}

function buildAppointmentRows(patientIds) {
  const rows = [];
  let maLK = 9001;

  for (let day = 0; day < DAYS_TO_SEED; day += 1) {
    const ngayHen = addDays(START_DATE, day);
    const baseScheduleId = 9001 + day * doctors.length * 2;
    doctors.forEach(([doctorId], doctorIndex) => {
      const morningScheduleId = baseScheduleId + doctorIndex * 2;
      const afternoonScheduleId = morningScheduleId + 1;
      const patientA = patientIds[(day + doctorIndex) % patientIds.length];
      const patientB = patientIds[(day + doctorIndex + 3) % patientIds.length];
      const reasonA = reasons[(day + doctorIndex) % reasons.length];
      const reasonB = reasons[(day + doctorIndex + 4) % reasons.length];

      rows.push([maLK, patientA, doctorId, ngayHen, '08:30:00', reasonA, 'DaXacNhan', morningScheduleId]);
      maLK += 1;
      rows.push([maLK, patientB, doctorId, ngayHen, '14:00:00', reasonB, day % 5 === 0 ? 'ChoXacNhan' : 'DaXacNhan', afternoonScheduleId]);
      maLK += 1;
    });
  }

  return rows;
}

async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  const patientIdMode = await getPatientIdMode(connection);

  try {
    await connection.beginTransaction();

    const patientIds = await seedBaseData(connection, patientIdMode);
    const scheduleRows = buildScheduleRows();
    const appointmentRows = buildAppointmentRows(patientIds);

    await connection.query(
      `
        INSERT INTO LichLamViecBacSi
          (MaLich, MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          MaBacSi = VALUES(MaBacSi),
          MaPhong = VALUES(MaPhong),
          NgayLam = VALUES(NgayLam),
          GioBatDau = VALUES(GioBatDau),
          GioKetThuc = VALUES(GioKetThuc)
      `,
      [scheduleRows],
    );

    await connection.query(
      `
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
      `,
      [appointmentRows],
    );

    await connection.commit();
    console.log(`Seeded ${scheduleRows.length} doctor schedules and ${appointmentRows.length} appointments from ${START_DATE} for ${DAYS_TO_SEED} days.`);
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
