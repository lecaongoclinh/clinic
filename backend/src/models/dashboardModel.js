import db from "../config/db.js";

function buildDateCondition(columnName) {
    return `DATE(${columnName}) BETWEEN ? AND ?`;
}

const DashboardModel = {
    getSummary: async (startDate, endDate) => {
        const [[revenueRow]] = await db.query(`
            SELECT
                COALESCE(SUM(ThanhTienCuoi), 0) AS totalRevenue
            FROM HoaDon
            WHERE TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("NgayThanhToan")}
        `, [startDate, endDate]);

        const [[visitRow]] = await db.query(`
            SELECT
                COUNT(*) AS totalVisits
            FROM PhieuKham
            WHERE ${buildDateCondition("NgayKham")}
        `, [startDate, endDate]);

        const [[patientRow]] = await db.query(`
            SELECT
                COUNT(*) AS newPatients
            FROM BenhNhan
            WHERE ${buildDateCondition("NgayTao")}
        `, [startDate, endDate]);

        return {
            totalRevenue: Number(revenueRow?.totalRevenue || 0),
            totalVisits: Number(visitRow?.totalVisits || 0),
            newPatients: Number(patientRow?.newPatients || 0)
        };
    },

    getRevenueTrend: async (startDate, endDate, range) => {
        let labelSql = `DATE_FORMAT(NgayThanhToan, '%Y-%m-%d')`;
        if (range === "today") labelSql = `DATE_FORMAT(NgayThanhToan, '%H:00')`;
        if (range === "year") labelSql = `MONTH(NgayThanhToan)`;

        const [rows] = await db.query(`
            SELECT
                ${labelSql} AS label,
                COALESCE(SUM(ThanhTienCuoi), 0) AS revenue
            FROM HoaDon
            WHERE TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("NgayThanhToan")}
            GROUP BY ${labelSql}
            ORDER BY ${labelSql}
        `, [startDate, endDate]);

        return rows;
    },

    getVisitTrend: async (startDate, endDate, range) => {
    let labelSql = `DATE_FORMAT(NgayKham, '%Y-%m-%d')`;

    if (range === "today") {
        labelSql = `DATE_FORMAT(COALESCE(ThoiGianTao, TIMESTAMP(NgayKham, '00:00:00')), '%H:00')`;
    }

    if (range === "year") {
        labelSql = `MONTH(NgayKham)`;
    }

    const [rows] = await db.query(`
        SELECT
            ${labelSql} AS label,
            COUNT(*) AS visits
        FROM PhieuKham
        WHERE DATE(NgayKham) BETWEEN ? AND ?
        GROUP BY ${labelSql}
        ORDER BY ${labelSql}
    `, [startDate, endDate]);

    return rows;
},

    getRevenueStructure: async (startDate, endDate) => {
        const [rows] = await db.query(`
            SELECT
                CASE
                    WHEN dv.Loai = 'KhamBenh' THEN 'Khám bệnh'
                    WHEN dv.Loai IN ('XetNghiem', 'SieuAm') THEN 'Cận lâm sàng'
                    ELSE 'Dịch vụ khác'
                END AS label,
                COALESCE(SUM(cthd.ThanhTien), 0) AS revenue
            FROM ChiTietHoaDon cthd
            INNER JOIN HoaDon hd ON hd.MaHD = cthd.MaHD
            LEFT JOIN DichVu dv ON dv.MaDichVu = cthd.MaDichVu
            WHERE hd.TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("hd.NgayThanhToan")}
              AND cthd.LoaiMuc = 'DichVu'
            GROUP BY label
        `, [startDate, endDate]);

        return rows;
    },

    getDoctorPerformance: async (startDate, endDate) => {
        const [rows] = await db.query(`
            SELECT
                bs.HoTen AS name,
                ck.TenChuyenKhoa AS specialty,
                COUNT(DISTINCT pk.MaPK) AS visits,
                COALESCE(SUM(hd.ThanhTienCuoi), 0) AS revenue,
                4.8 AS rating
            FROM NhanVien bs
            LEFT JOIN ChuyenKhoa ck ON ck.MaChuyenKhoa = bs.MaChuyenKhoa
            LEFT JOIN BenhAn ba ON ba.MaBacSi = bs.MaNV
            LEFT JOIN PhieuKham pk
                ON pk.MaPK = ba.MaPK
               AND ${buildDateCondition("pk.NgayKham")}
            LEFT JOIN HoaDon hd
                ON hd.MaBA = ba.MaBA
               AND hd.TrangThai = 'DaThanhToan'
               AND ${buildDateCondition("hd.NgayThanhToan")}
            GROUP BY bs.MaNV, bs.HoTen, ck.TenChuyenKhoa
            HAVING visits > 0 OR revenue > 0
            ORDER BY revenue DESC, visits DESC
            LIMIT 5
        `, [startDate, endDate, startDate, endDate]);

        return rows;
    },

    getTopServices: async (startDate, endDate) => {
        const [rows] = await db.query(`
            SELECT
                dv.TenDichVu AS name,
                COALESCE(SUM(cthd.SoLuong), 0) AS count,
                COALESCE(SUM(cthd.ThanhTien), 0) AS revenue
            FROM ChiTietHoaDon cthd
            INNER JOIN HoaDon hd ON hd.MaHD = cthd.MaHD
            INNER JOIN DichVu dv ON dv.MaDichVu = cthd.MaDichVu
            WHERE hd.TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("hd.NgayThanhToan")}
              AND cthd.LoaiMuc = 'DichVu'
            GROUP BY dv.MaDichVu, dv.TenDichVu
            ORDER BY count DESC, revenue DESC
            LIMIT 5
        `, [startDate, endDate]);

        return rows;
    }
};

export default DashboardModel;
