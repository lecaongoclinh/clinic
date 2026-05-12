import db from "../config/db.js";

const LOT_STATUS_EXPR = `
    CASE
        WHEN COALESCE(l.TrangThai, '') = 'DaHuy' THEN 'DaHuy'
        WHEN l.HanSuDung IS NOT NULL AND l.HanSuDung < CURDATE() THEN 'HetHan'
        WHEN l.HanSuDung IS NOT NULL AND l.HanSuDung <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'SapHetHan'
        ELSE 'ConHan'
    END
`;

const BatchModel = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT 
                l.MaLo,
                l.MaThuoc,
                l.SoLo,
                l.HanSuDung,
                l.TrangThai,
                l.GiaNhap,
                GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0) AS TonLo,
                t.TenThuoc
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        `);

        return rows;
    },

    getByMedicine: async (MaThuoc, filters = {}) => {
        const conditions = ["l.MaThuoc = ?"];
        const params = [MaThuoc];

        if (!["true", true, "1", 1].includes(filters.includeCancelled)) {
            conditions.push("COALESCE(l.TrangThai, '') != 'DaHuy'");
        }

        if (!["true", true, "1", 1].includes(filters.includeZeroStock)) {
            conditions.push("GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0) > 0");
        }

        if (filters.MaKho) {
            conditions.push("l.MaKho = ?");
            params.push(filters.MaKho);
        }

        if (filters.MaNCC) {
            conditions.push("l.MaNCC = ?");
            params.push(filters.MaNCC);
        }

        if (filters.status) {
            conditions.push(`${LOT_STATUS_EXPR} = ?`);
            params.push(filters.status);
        }

        const [rows] = await db.query(`
            SELECT 
                l.MaLo,
                l.MaThuoc,
                l.SoLo,
                l.NgaySanXuat,
                l.HanSuDung,
                GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0) AS Ton,
                l.GiaNhap,
                l.NhietDoBaoQuan,
                ${LOT_STATUS_EXPR} AS TrangThai,
                k.TenKho,
                COALESCE(ncc.TenNCC, pnNcc.TenNCC) AS TenNCC
            FROM LoThuoc l
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            LEFT JOIN ChiTietPhieuNhap ctpn ON l.MaCTPN = ctpn.MaCTPN
            LEFT JOIN PhieuNhapThuoc pn ON ctpn.MaPN = pn.MaPN
            LEFT JOIN NhaCungCap pnNcc ON pn.MaNCC = pnNcc.MaNCC
            WHERE ${conditions.join(" AND ")}
            ORDER BY l.HanSuDung ASC, l.MaLo DESC
        `, params);

        return rows;
    },

    getExpired: async () => {
        const [rows] = await db.query(`
            SELECT 
                l.MaLo,
                l.SoLo,
                l.HanSuDung,
                t.TenThuoc,
                GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0) AS TonLo
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            WHERE l.HanSuDung < CURDATE()
        `);

        return rows;
    },

    getNearExpiry: async () => {
        const [rows] = await db.query(`
            SELECT 
                l.MaLo,
                l.SoLo,
                l.HanSuDung,
                t.TenThuoc,
                GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0) AS TonLo
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            WHERE l.HanSuDung <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
              AND l.TrangThai != 'HetHan'
        `);

        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT 
                l.*,
                t.TenThuoc,
                t.HoatChat,
                k.TenKho,
                ncc.TenNCC
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            WHERE l.MaLo = ?
        `, [id]);

        return rows[0];
    },

    update: async (id, data) => {
        const { HanSuDung, GiaNhap } = data;

        await db.query(`
            UPDATE LoThuoc
            SET HanSuDung = ?, GiaNhap = ?
            WHERE MaLo = ?
        `, [HanSuDung, GiaNhap, id]);
    },

    delete: async (id) => {
        await db.query(`
            UPDATE LoThuoc
            SET TrangThai = 'DaHuy'
            WHERE MaLo = ?
        `, [id]);
    },

    transfer: async (MaLo, MaKhoMoi) => {
        await db.query(`
            UPDATE LoThuoc
            SET MaKho = ?
            WHERE MaLo = ?
        `, [MaKhoMoi, MaLo]);
    }
};

export default BatchModel;
