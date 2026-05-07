import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

try {
    // 1. Tìm bác sĩ username 'bacsi'
    const [[doctor]] = await conn.query(`
        SELECT nv.MaNV, nv.HoTen, nv.MaChuyenKhoa, ck.TenChuyenKhoa
        FROM NhanVien nv
        LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
        WHERE nv.Username = 'bacsi'
        LIMIT 1
    `);

    if (!doctor) { console.error('Không tìm thấy username bacsi'); process.exit(1); }
    console.log(`Bác sĩ: ${doctor.HoTen} | Khoa: ${doctor.TenChuyenKhoa} | MaNV: ${doctor.MaNV}`);

    // 2. Lịch làm việc hôm nay
    const [schedules] = await conn.query(`
        SELECT llb.MaLich, llb.MaPhong, pk.TenPhong
        FROM LichLamViecBacSi llb
        JOIN PhongKham pk ON llb.MaPhong = pk.MaPhong
        WHERE llb.MaBacSi = ? AND llb.NgayLam = CURDATE()
        LIMIT 1
    `, [doctor.MaNV]);

    let maPhong = null, maLich = null;

    if (schedules.length) {
        maPhong = schedules[0].MaPhong;
        maLich = schedules[0].MaLich;
        console.log(`Lịch hôm nay: ${schedules[0].TenPhong}`);
    } else {
        const [[room]] = await conn.query(`
            SELECT MaPhong, TenPhong FROM PhongKham LIMIT 1
        `);
        maPhong = room?.MaPhong || null;
        const [r] = await conn.query(`
            INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc)
            VALUES (?, ?, CURDATE(), '07:00:00', '23:59:00')
        `, [doctor.MaNV, maPhong]);
        maLich = r.insertId;
        console.log(`Đã tạo lịch làm việc hôm nay (MaPhong=${maPhong})`);
    }

    // 3. Lấy bệnh nhân
    const [patients] = await conn.query(`SELECT MaBN, HoTen FROM BenhNhan LIMIT 4`);
    console.log(`Bệnh nhân: ${patients.length} người`);

    // 4. Xóa phiếu cũ hôm nay
    const [del] = await conn.query(
        `DELETE FROM PhieuKham WHERE MaBacSi = ? AND DATE(NgayKham) = CURDATE()`,
        [doctor.MaNV]
    );
    if (del.affectedRows) console.log(`Đã xóa ${del.affectedRows} phiếu cũ`);

    // 5. Tạo phiếu khám mới
    const statuses = ['ChoKham', 'ChoKham', 'DangKham', 'ChoKham'];
    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        await conn.query(`
            INSERT INTO PhieuKham
                (MaBN, MaBacSi, MaChuyenKhoa, MaPhong, MaLich, NgayKham, STT, TrangThai, LoaiKham, ThoiGianTao)
            VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, 'WALK_IN', NOW())
        `, [p.MaBN, doctor.MaNV, doctor.MaChuyenKhoa, maPhong, maLich, i + 1, statuses[i]]);
        console.log(`  STT ${i+1} - ${p.HoTen} - ${statuses[i]}`);
    }

    console.log(`\nDone! Đã tạo ${patients.length} phiếu cho bác sĩ ${doctor.HoTen}.`);
} finally {
    await conn.end();
}
