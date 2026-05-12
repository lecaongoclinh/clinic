import db from "../config/db.js";

function buildDateCondition(columnName) {
    return `DATE(${columnName}) BETWEEN ? AND ?`;
}

const CANCELED_TICKET_STATUSES = ["DaHuy", "Huy"];
const PENDING_INVOICE_STATUSES = ["ChuaThanhToan", "ThanhToanMotPhan", "QuaHan"];
let cachedPatientDateColumn = null;

async function getPatientDateColumn() {
    if (cachedPatientDateColumn !== null) return cachedPatientDateColumn;

    const [rows] = await db.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND LOWER(TABLE_NAME) = 'benhnhan'
          AND COLUMN_NAME IN ('NgayTao', 'CreatedAt', 'NgayDangKy', 'CreatedDate')
        ORDER BY FIELD(COLUMN_NAME, 'NgayTao', 'CreatedAt', 'NgayDangKy', 'CreatedDate')
        LIMIT 1
    `);

    cachedPatientDateColumn = rows[0]?.COLUMN_NAME || "";
    return cachedPatientDateColumn;
}

function detailAmountExpression() {
    return "COALESCE(cthd.ThanhTien, cthd.SoTien, COALESCE(cthd.DonGia, 0) * COALESCE(cthd.SoLuong, 1), 0)";
}

const DashboardModel = {
    getSummary: async (startDate, endDate) => {
        const [[revenueRow]] = await db.query(`
            SELECT COALESCE(SUM(ThanhTienCuoi), 0) AS totalRevenue
            FROM HoaDon
            WHERE TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("NgayThanhToan")}
        `, [startDate, endDate]);

        const [[visitRow]] = await db.query(`
            SELECT COUNT(*) AS totalVisits
            FROM PhieuKham
            WHERE ${buildDateCondition("NgayKham")}
              AND COALESCE(TrangThai, '') NOT IN (?)
        `, [startDate, endDate, CANCELED_TICKET_STATUSES]);

        const patientDateColumn = await getPatientDateColumn();
        let patientRow = { newPatients: 0 };
        if (patientDateColumn) {
            const [[row]] = await db.query(`
                SELECT COUNT(*) AS newPatients
                FROM BenhNhan
                WHERE ${buildDateCondition(patientDateColumn)}
            `, [startDate, endDate]);
            patientRow = row || patientRow;
        }

        const [[pendingInvoiceRow]] = await db.query(`
            SELECT
                COUNT(*) AS pendingInvoices,
                COALESCE(SUM(ThanhTienCuoi), 0) AS pendingAmount
            FROM HoaDon
            WHERE TrangThai IN (?)
        `, [PENDING_INVOICE_STATUSES]);

        return {
            totalRevenue: Number(revenueRow?.totalRevenue || 0),
            totalVisits: Number(visitRow?.totalVisits || 0),
            newPatients: Number(patientRow?.newPatients || 0),
            pendingInvoices: Number(pendingInvoiceRow?.pendingInvoices || 0),
            pendingAmount: Number(pendingInvoiceRow?.pendingAmount || 0)
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
        if (range === "today") labelSql = `DATE_FORMAT(CAST(NgayKham AS DATETIME), '%H:00')`;
        if (range === "year") labelSql = `MONTH(NgayKham)`;

        const [rows] = await db.query(`
            SELECT
                ${labelSql} AS label,
                COUNT(*) AS visits
            FROM PhieuKham
            WHERE ${buildDateCondition("NgayKham")}
              AND COALESCE(TrangThai, '') NOT IN (?)
            GROUP BY ${labelSql}
            ORDER BY ${labelSql}
        `, [startDate, endDate, CANCELED_TICKET_STATUSES]);

        return rows;
    },

    getRevenueStructure: async (startDate, endDate) => {
        const amountExpr = detailAmountExpression();
        const [rows] = await db.query(`
            SELECT
                CASE
                    WHEN cthd.LoaiMuc = 'Thuoc' OR cthd.MaThuoc IS NOT NULL OR cthd.MaPX IS NOT NULL THEN 'Thuốc'
                    WHEN cthd.LoaiMuc = 'DichVu' AND dv.Loai = 'KhamBenh' THEN 'Khám bệnh'
                    WHEN cthd.LoaiMuc = 'DichVu' AND dv.Loai IN ('XetNghiem', 'SieuAm') THEN 'Cận lâm sàng'
                    ELSE 'Khác'
                END AS label,
                COALESCE(SUM(${amountExpr}), 0) AS revenue
            FROM ChiTietHoaDon cthd
            INNER JOIN HoaDon hd ON hd.MaHD = cthd.MaHD
            LEFT JOIN DichVu dv ON dv.MaDichVu = cthd.MaDichVu
            WHERE hd.TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("hd.NgayThanhToan")}
            GROUP BY label
        `, [startDate, endDate]);

        return rows;
    },

    getDoctorPerformance: async (startDate, endDate) => {
        const [rows] = await db.query(`
            SELECT
                bs.HoTen AS name,
                ck.TenChuyenKhoa AS specialty,
                COUNT(DISTINCT visit.MaPK) AS visits,
                COALESCE(SUM(CASE WHEN hd.MaHD IS NOT NULL THEN hd.ThanhTienCuoi ELSE 0 END), 0) AS revenue,
                NULL AS rating
            FROM NhanVien bs
            LEFT JOIN ChuyenKhoa ck ON ck.MaChuyenKhoa = bs.MaChuyenKhoa
            LEFT JOIN (
                SELECT
                    pk.MaPK,
                    ba.MaBA,
                    COALESCE(ba.MaBacSi, pk.MaBacSi) AS MaBacSi
                FROM PhieuKham pk
                LEFT JOIN BenhAn ba ON ba.MaPK = pk.MaPK
                WHERE ${buildDateCondition("pk.NgayKham")}
                  AND COALESCE(pk.TrangThai, '') NOT IN (?)
            ) visit ON visit.MaBacSi = bs.MaNV
            LEFT JOIN HoaDon hd
                ON (hd.MaPK = visit.MaPK OR (visit.MaBA IS NOT NULL AND hd.MaBA = visit.MaBA))
               AND hd.TrangThai = 'DaThanhToan'
               AND ${buildDateCondition("hd.NgayThanhToan")}
            GROUP BY bs.MaNV, bs.HoTen, ck.TenChuyenKhoa
            HAVING visits > 0 OR revenue > 0
            ORDER BY revenue DESC, visits DESC
            LIMIT 5
        `, [startDate, endDate, CANCELED_TICKET_STATUSES, startDate, endDate]);

        return rows;
    },

    getTopServices: async (startDate, endDate) => {
        const amountExpr = detailAmountExpression();
        const [rows] = await db.query(`
            SELECT
                dv.TenDichVu AS name,
                COALESCE(SUM(cthd.SoLuong), 0) AS count,
                COALESCE(SUM(${amountExpr}), 0) AS revenue
            FROM ChiTietHoaDon cthd
            INNER JOIN HoaDon hd ON hd.MaHD = cthd.MaHD
            INNER JOIN DichVu dv ON dv.MaDichVu = cthd.MaDichVu
            WHERE hd.TrangThai = 'DaThanhToan'
              AND ${buildDateCondition("hd.NgayThanhToan")}
              AND cthd.MaDichVu IS NOT NULL
              AND cthd.LoaiMuc = 'DichVu'
            GROUP BY dv.MaDichVu, dv.TenDichVu
            ORDER BY count DESC, revenue DESC
            LIMIT 5
        `, [startDate, endDate]);

        return rows;
    }
};

export default DashboardModel;
