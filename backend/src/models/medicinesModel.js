import db from "../config/db.js";

const STOCK_EXPR = `
    CASE
        WHEN COALESCE(l.TrangThai, '') = 'DaHuy' THEN 0
        ELSE GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)
    END
`;

function buildMedicineFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.search) {
        conditions.push(`(
            t.TenThuoc LIKE ?
            OR t.HoatChat LIKE ?
            OR t.MaVach LIKE ?
        )`);
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword);
    }

    if (filters.LoaiThuoc) {
        conditions.push("t.LoaiThuoc = ?");
        params.push(filters.LoaiThuoc);
    }

    if (filters.TrangThai !== undefined && filters.TrangThai !== "") {
        conditions.push("COALESCE(t.TrangThai, 1) = ?");
        params.push(Number(filters.TrangThai));
    }

    return {
        where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params
    };
}

function getSortClause(sort = "") {
    switch (sort) {
        case "name_desc": return "ORDER BY t.TenThuoc DESC";
        case "stock_asc": return "ORDER BY TongTon ASC, t.TenThuoc ASC";
        case "stock_desc": return "ORDER BY TongTon DESC, t.TenThuoc ASC";
        case "name_asc":
        default: return "ORDER BY t.TenThuoc ASC";
    }
}

const MedicinesModel = {
    getAll: async (filters = {}) => {
        const { where, params } = buildMedicineFilters(filters);
        const orderBy = getSortClause(filters.sort);
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.DonViCoBan,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.MaVach,
                t.LoaiThuoc,
                t.GiaBan,
                COALESCE(t.TrangThai, 1) AS TrangThai,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            ${where}
            GROUP BY
                t.MaThuoc,
                t.TenThuoc,
                t.DonViCoBan,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.MaVach,
                t.LoaiThuoc,
                t.GiaBan,
                t.TrangThai
            ${orderBy}
        `, params);

        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.DonViCoBan,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.GiaBan,
                t.MaVach,
                t.LoaiThuoc,
                t.TrangThai,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            WHERE t.MaThuoc = ?
            GROUP BY
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.QuyCachDongGoi,
                t.HangSanXuat,
                t.NuocSanXuat,
                t.NhietDoBaoQuan,
                t.GiaBan,
                t.MaVach,
                t.LoaiThuoc,
                t.TrangThai
        `, [id]);

        return rows[0];
    },

    create: async (data) => {
        const {
            TenThuoc,
            DonViCoBan,
            HoatChat,
            HamLuong,
            DangBaoChe,
            QuyCachDongGoi,
            HangSanXuat,
            NuocSanXuat,
            NhietDoBaoQuan,
            GiaBan,
            MaVach,
            LoaiThuoc
        } = data;

        await db.query(`
            INSERT INTO Thuoc (
                TenThuoc, HoatChat, HamLuong, DangBaoChe,
                QuyCachDongGoi, HangSanXuat, NuocSanXuat,
                NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc, DonViCoBan, TrangThai
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            TenThuoc, HoatChat, HamLuong, DangBaoChe,
            QuyCachDongGoi, HangSanXuat, NuocSanXuat,
            NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc, DonViCoBan, data.TrangThai ?? 1
        ]);
    },

    update: async (id, data) => {
        const {
            TenThuoc,
            DonViCoBan,
            HoatChat,
            HamLuong,
            DangBaoChe,
            QuyCachDongGoi,
            HangSanXuat,
            NuocSanXuat,
            NhietDoBaoQuan,
            GiaBan,
            MaVach,
            LoaiThuoc
        } = data;

        await db.query(`
            UPDATE Thuoc
            SET
                TenThuoc = ?,
                HoatChat = ?,
                HamLuong = ?,
                DangBaoChe = ?,
                QuyCachDongGoi = ?,
                HangSanXuat = ?,
                NuocSanXuat = ?,
                NhietDoBaoQuan = ?,
                GiaBan = ?,
                MaVach = ?,
                LoaiThuoc = ?,
                DonViCoBan = ?,
                TrangThai = ?
            WHERE MaThuoc = ?
        `, [
            TenThuoc, HoatChat, HamLuong, DangBaoChe,
            QuyCachDongGoi, HangSanXuat, NuocSanXuat,
            NhietDoBaoQuan, GiaBan, MaVach, LoaiThuoc, DonViCoBan, data.TrangThai ?? 1, id
        ]);
    },

    hasRelatedData: async (id) => {
        const [[rows]] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM LoThuoc WHERE MaThuoc = ?) AS LoThuocCount,
                (SELECT COUNT(*) FROM ChiTietDonThuoc WHERE MaThuoc = ?) AS DonThuocCount,
                (SELECT COUNT(*) FROM ChiTietPhieuNhap WHERE MaThuoc = ?) AS PhieuNhapCount,
                (SELECT COUNT(*)
                 FROM ChiTietPhieuXuat ct
                 JOIN LoThuoc l ON ct.MaLo = l.MaLo
                 WHERE l.MaThuoc = ?) AS PhieuXuatCount,
                (SELECT COUNT(*) FROM ChiTietHoaDon WHERE MaThuoc = ?) AS HoaDonCount
        `, [id, id, id, id, id]);

        return Object.values(rows).some(value => Number(value) > 0);
    },

    delete: async (id) => {
        const hasRelated = await MedicinesModel.hasRelatedData(id);
        if (hasRelated) {
            const [result] = await db.query(
                "UPDATE Thuoc SET TrangThai = 0 WHERE MaThuoc = ?",
                [id]
            );
            return { ...result, softDeleted: true };
        }

        const [result] = await db.query(
            "DELETE FROM Thuoc WHERE MaThuoc = ?",
            [id]
        );
        return { ...result, softDeleted: false };
    },

    lowStock: async () => {
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon
            FROM Thuoc t
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc
            GROUP BY t.MaThuoc, t.TenThuoc
            HAVING TongTon < 10
        `);

        return rows;
    },

    getBySupplier: async ({ MaNCC, MaKho = null } = {}) => {
        const warehouseFilter = MaKho ? " AND l.MaKho = ?" : "";
        const params = MaKho ? [MaNCC, MaNCC, MaNCC, MaKho] : [MaNCC, MaNCC, MaNCC];
        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.DonViCoBan,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon,
                COALESCE(tnc.GiaNhap, last_lot.GiaNhap, 0) AS GiaNhap
            FROM Thuoc t
            LEFT JOIN Thuoc_NhaCungCap tnc
                ON t.MaThuoc = tnc.MaThuoc AND tnc.MaNCC = ?
            LEFT JOIN (
                SELECT MaThuoc, MAX(GiaNhap) AS GiaNhap
                FROM LoThuoc
                WHERE MaNCC = ?
                GROUP BY MaThuoc
            ) last_lot ON last_lot.MaThuoc = t.MaThuoc
            LEFT JOIN LoThuoc l
                ON t.MaThuoc = l.MaThuoc AND l.MaNCC = ? ${warehouseFilter}
            WHERE tnc.MaNCC IS NOT NULL OR last_lot.MaThuoc IS NOT NULL
            GROUP BY t.MaThuoc, t.TenThuoc, t.DonViCoBan, t.HoatChat, t.HamLuong, t.DangBaoChe, tnc.GiaNhap, last_lot.GiaNhap
            ORDER BY t.TenThuoc ASC
        `, params);

        return rows;
    }
};

export default MedicinesModel;
