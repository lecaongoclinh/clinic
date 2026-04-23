import db from "../config/db.js";

const ServicesModel = {
    getSpecialties: async () => {
        const [rows] = await db.query(`
            SELECT MaChuyenKhoa, TenChuyenKhoa
            FROM ChuyenKhoa
            ORDER BY TenChuyenKhoa ASC
        `);
        return rows;
    },

    getSummary: async () => {
        const [[summary]] = await db.query(`
            SELECT
                COUNT(*) AS TongSoDichVu,
                SUM(CASE WHEN COALESCE(TrangThai, 1) = 1 THEN 1 ELSE 0 END) AS DichVuDangApDung,
                COALESCE(AVG(Gia), 0) AS GiaTrungBinh
            FROM DichVu
        `);

        const [[topGroup]] = await db.query(`
            SELECT Loai, COUNT(*) AS SoLuong
            FROM DichVu
            GROUP BY Loai
            ORDER BY SoLuong DESC, Loai ASC
            LIMIT 1
        `);

        const [[packageSummary]] = await db.query(`
            SELECT COUNT(*) AS TongGoi
            FROM GoiDichVu
            WHERE COALESCE(TrangThai, 1) = 1
        `);

        return {
            TongSoDichVu: Number(summary?.TongSoDichVu || 0),
            DichVuDangApDung: Number(summary?.DichVuDangApDung || 0),
            GiaTrungBinh: Number(summary?.GiaTrungBinh || 0),
            NhomNoiBat: topGroup?.Loai || null,
            SoLuongNhomNoiBat: Number(topGroup?.SoLuong || 0),
            TongGoiDangApDung: Number(packageSummary?.TongGoi || 0)
        };
    },

    getAll: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.keyword) {
            conditions.push(`
                (
                    d.MaDV LIKE ?
                    OR d.TenDichVu LIKE ?
                    OR COALESCE(d.MoTa, '') LIKE ?
                )
            `);
            const keyword = `%${filters.keyword}%`;
            params.push(keyword, keyword, keyword);
        }

        if (filters.loai) {
            conditions.push(`d.Loai = ?`);
            params.push(filters.loai);
        }

        if (filters.trangThai !== undefined && filters.trangThai !== "") {
            conditions.push(`COALESCE(d.TrangThai, 1) = ?`);
            params.push(Number(filters.trangThai));
        }

        if (filters.giaTu !== undefined && filters.giaTu !== "") {
            conditions.push(`COALESCE(d.Gia, 0) >= ?`);
            params.push(Number(filters.giaTu));
        }

        if (filters.giaDen !== undefined && filters.giaDen !== "") {
            conditions.push(`COALESCE(d.Gia, 0) <= ?`);
            params.push(Number(filters.giaDen));
        }

        if (filters.maChuyenKhoa !== undefined && filters.maChuyenKhoa !== "") {
            conditions.push(`COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa) = ?`);
            params.push(Number(filters.maChuyenKhoa));
        }

        if (filters.canDatTruoc !== undefined && filters.canDatTruoc !== "") {
            conditions.push(`COALESCE(ch.CanDatTruoc, d.CanDatTruoc, 0) = ?`);
            params.push(Number(filters.canDatTruoc));
        }

        if (filters.canChiDinhBacSi !== undefined && filters.canChiDinhBacSi !== "") {
            conditions.push(`COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) = ?`);
            params.push(Number(filters.canChiDinhBacSi));
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
            SELECT
                d.MaDichVu,
                d.MaDV,
                d.TenDichVu,
                d.Gia,
                d.Loai,
                d.MoTa,
                COALESCE(d.TrangThai, 1) AS TrangThai,
                COALESCE(ch.ThoiLuongPhut, d.ThoiLuongPhut, 15) AS ThoiLuongPhut,
                COALESCE(ch.CanDatTruoc, d.CanDatTruoc, 0) AS CanDatTruoc,
                COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) AS CanChiDinhBacSi,
                COALESCE(ch.HuongDanTruocKham, d.HuongDanTruocKham, '') AS HuongDanTruocKham,
                COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) AS ThuTuHienThi,
                COALESCE(ch.MauNhan, d.MauNhan, '') AS MauNhan,
                COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa) AS MaChuyenKhoa,
                ck.TenChuyenKhoa
            FROM DichVu d
            LEFT JOIN CauHinhDichVu ch ON d.MaDichVu = ch.MaDichVu
            LEFT JOIN ChuyenKhoa ck ON ck.MaChuyenKhoa = COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa)
            ${whereClause}
            ORDER BY COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) ASC, d.MaDichVu DESC
        `, params);

        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT
                d.MaDichVu,
                d.MaDV,
                d.TenDichVu,
                d.Gia,
                d.Loai,
                d.MoTa,
                COALESCE(d.TrangThai, 1) AS TrangThai,
                COALESCE(ch.ThoiLuongPhut, d.ThoiLuongPhut, 15) AS ThoiLuongPhut,
                COALESCE(ch.CanDatTruoc, d.CanDatTruoc, 0) AS CanDatTruoc,
                COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) AS CanChiDinhBacSi,
                COALESCE(ch.HuongDanTruocKham, d.HuongDanTruocKham, '') AS HuongDanTruocKham,
                COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) AS ThuTuHienThi,
                COALESCE(ch.MauNhan, d.MauNhan, '') AS MauNhan,
                COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa) AS MaChuyenKhoa
            FROM DichVu d
            LEFT JOIN CauHinhDichVu ch ON d.MaDichVu = ch.MaDichVu
            WHERE d.MaDichVu = ?
        `, [id]);

        return rows[0] || null;
    },

    create: async ({ MaDV, TenDichVu, Gia, Loai, MoTa, TrangThai }) => {
        const [result] = await db.query(`
            INSERT INTO DichVu (
                MaDV, TenDichVu, Gia, Loai, MoTa, TrangThai
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [MaDV, TenDichVu, Gia, Loai, MoTa || null, TrangThai]);

        return result.insertId;
    },

    update: async (id, { MaDV, TenDichVu, Gia, Loai, MoTa, TrangThai }) => {
        const [result] = await db.query(`
            UPDATE DichVu
            SET
                MaDV = ?,
                TenDichVu = ?,
                Gia = ?,
                Loai = ?,
                MoTa = ?,
                TrangThai = ?
            WHERE MaDichVu = ?
        `, [MaDV, TenDichVu, Gia, Loai, MoTa || null, TrangThai, id]);

        return result.affectedRows;
    },

    remove: async (id) => {
        const [result] = await db.query(`
            DELETE FROM DichVu
            WHERE MaDichVu = ?
        `, [id]);

        return result.affectedRows;
    },

    existsByCode: async (maDV, excludeId = null) => {
        const params = [maDV];
        let sql = `
            SELECT MaDichVu
            FROM DichVu
            WHERE MaDV = ?
        `;

        if (excludeId) {
            sql += ` AND MaDichVu <> ?`;
            params.push(excludeId);
        }

        const [rows] = await db.query(sql, params);
        return rows.length > 0;
    },

    getAllPackages: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.keyword) {
            conditions.push(`(
                g.MaGDV LIKE ?
                OR g.TenGoi LIKE ?
                OR COALESCE(g.MoTa, '') LIKE ?
            )`);
            const keyword = `%${filters.keyword}%`;
            params.push(keyword, keyword, keyword);
        }

        if (filters.trangThai !== undefined && filters.trangThai !== "") {
            conditions.push(`COALESCE(g.TrangThai, 1) = ?`);
            params.push(Number(filters.trangThai));
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
            SELECT
                g.MaGoi,
                g.MaGDV,
                g.TenGoi,
                g.MoTa,
                g.GiaGoi,
                COALESCE(g.TrangThai, 1) AS TrangThai,
                g.MauHienThi,
                g.BieuTuong,
                COUNT(ct.MaCTGoi) AS SoDichVu
            FROM GoiDichVu g
            LEFT JOIN ChiTietGoiDichVu ct ON g.MaGoi = ct.MaGoi
            ${whereClause}
            GROUP BY
                g.MaGoi, g.MaGDV, g.TenGoi, g.MoTa, g.GiaGoi,
                g.TrangThai, g.MauHienThi, g.BieuTuong
            ORDER BY g.MaGoi DESC
        `, params);

        return rows;
    },

    getPackageById: async (id) => {
        const [pkgRows] = await db.query(`
            SELECT
                g.MaGoi,
                g.MaGDV,
                g.TenGoi,
                g.MoTa,
                g.GiaGoi,
                COALESCE(g.TrangThai, 1) AS TrangThai,
                g.MauHienThi,
                g.BieuTuong
            FROM GoiDichVu g
            WHERE g.MaGoi = ?
        `, [id]);

        if (!pkgRows.length) return null;

        const [detailRows] = await db.query(`
            SELECT
                ct.MaCTGoi,
                ct.MaDichVu,
                d.MaDV,
                d.TenDichVu,
                d.Loai,
                d.Gia,
                ct.SoLuong,
                ct.GhiChu
            FROM ChiTietGoiDichVu ct
            JOIN DichVu d ON d.MaDichVu = ct.MaDichVu
            WHERE ct.MaGoi = ?
            ORDER BY d.TenDichVu ASC
        `, [id]);

        return {
            ...pkgRows[0],
            ChiTiet: detailRows
        };
    },

    createPackage: async ({ MaGDV, TenGoi, MoTa, GiaGoi, TrangThai, MauHienThi, BieuTuong }) => {
        const [result] = await db.query(`
            INSERT INTO GoiDichVu (
                MaGDV, TenGoi, MoTa, GiaGoi, TrangThai, MauHienThi, BieuTuong
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [MaGDV, TenGoi, MoTa || null, GiaGoi, TrangThai, MauHienThi, BieuTuong]);

        return result.insertId;
    },

    updatePackageInfo: async (id, { MaGDV, TenGoi, MoTa, GiaGoi, TrangThai, MauHienThi, BieuTuong }) => {
        const [result] = await db.query(`
            UPDATE GoiDichVu
            SET
                MaGDV = ?,
                TenGoi = ?,
                MoTa = ?,
                GiaGoi = ?,
                TrangThai = ?,
                MauHienThi = ?,
                BieuTuong = ?
            WHERE MaGoi = ?
        `, [MaGDV, TenGoi, MoTa || null, GiaGoi, TrangThai, MauHienThi, BieuTuong, id]);

        return result.affectedRows;
    },

    replacePackageItems: async (maGoi, items = []) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(`DELETE FROM ChiTietGoiDichVu WHERE MaGoi = ?`, [maGoi]);

            for (const item of items) {
                await connection.query(`
                    INSERT INTO ChiTietGoiDichVu (
                        MaGoi, MaDichVu, SoLuong, GhiChu
                    )
                    VALUES (?, ?, ?, ?)
                `, [
                    maGoi,
                    Number(item.MaDichVu),
                    Number(item.SoLuong || 1),
                    item.GhiChu || null
                ]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    removePackage: async (id) => {
        const [result] = await db.query(`
            DELETE FROM GoiDichVu
            WHERE MaGoi = ?
        `, [id]);

        return result.affectedRows;
    },

    getAllConfigs: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.keyword) {
            conditions.push(`(
                d.MaDV LIKE ?
                OR d.TenDichVu LIKE ?
                OR COALESCE(d.MoTa, '') LIKE ?
            )`);
            const keyword = `%${filters.keyword}%`;
            params.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
            SELECT
                d.MaDichVu,
                d.MaDV,
                d.TenDichVu,
                d.Loai,
                COALESCE(ch.ThoiLuongPhut, d.ThoiLuongPhut, 15) AS ThoiLuongPhut,
                COALESCE(ch.CanDatTruoc, d.CanDatTruoc, 0) AS CanDatTruoc,
                COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) AS CanChiDinhBacSi,
                COALESCE(ch.HuongDanTruocKham, d.HuongDanTruocKham, '') AS HuongDanTruocKham,
                COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) AS ThuTuHienThi,
                COALESCE(ch.MauNhan, d.MauNhan, '') AS MauNhan,
                COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa) AS MaChuyenKhoa,
                ck.TenChuyenKhoa
            FROM DichVu d
            LEFT JOIN CauHinhDichVu ch ON d.MaDichVu = ch.MaDichVu
            LEFT JOIN ChuyenKhoa ck ON ck.MaChuyenKhoa = COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa)
            ${whereClause}
            ORDER BY COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) ASC, d.MaDichVu DESC
        `, params);

        return rows;
    },

    getConfigByServiceId: async (serviceId) => {
        const [rows] = await db.query(`
            SELECT
                d.MaDichVu,
                d.MaDV,
                d.TenDichVu,
                d.Loai,
                COALESCE(ch.ThoiLuongPhut, d.ThoiLuongPhut, 15) AS ThoiLuongPhut,
                COALESCE(ch.CanDatTruoc, d.CanDatTruoc, 0) AS CanDatTruoc,
                COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) AS CanChiDinhBacSi,
                COALESCE(ch.HuongDanTruocKham, d.HuongDanTruocKham, '') AS HuongDanTruocKham,
                COALESCE(ch.ThuTuHienThi, d.ThuTuHienThi, 0) AS ThuTuHienThi,
                COALESCE(ch.MauNhan, d.MauNhan, '') AS MauNhan,
                COALESCE(ch.MaChuyenKhoa, d.MaChuyenKhoa) AS MaChuyenKhoa
            FROM DichVu d
            LEFT JOIN CauHinhDichVu ch ON d.MaDichVu = ch.MaDichVu
            WHERE d.MaDichVu = ?
        `, [serviceId]);

        return rows[0] || null;
    },

    upsertConfig: async (serviceId, payload) => {
        const [rows] = await db.query(`
            SELECT MaCauHinh
            FROM CauHinhDichVu
            WHERE MaDichVu = ?
        `, [serviceId]);

        if (rows.length) {
            const [result] = await db.query(`
                UPDATE CauHinhDichVu
                SET
                    ThoiLuongPhut = ?,
                    CanDatTruoc = ?,
                    CanChiDinhBacSi = ?,
                    HuongDanTruocKham = ?,
                    ThuTuHienThi = ?,
                    MauNhan = ?,
                    MaChuyenKhoa = ?
                WHERE MaDichVu = ?
            `, [
                payload.ThoiLuongPhut,
                payload.CanDatTruoc,
                payload.CanChiDinhBacSi,
                payload.HuongDanTruocKham || null,
                payload.ThuTuHienThi,
                payload.MauNhan || null,
                payload.MaChuyenKhoa,
                serviceId
            ]);

            return result.affectedRows;
        }

        const [result] = await db.query(`
            INSERT INTO CauHinhDichVu (
                MaDichVu,
                ThoiLuongPhut,
                CanDatTruoc,
                CanChiDinhBacSi,
                HuongDanTruocKham,
                ThuTuHienThi,
                MauNhan,
                MaChuyenKhoa
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            serviceId,
            payload.ThoiLuongPhut,
            payload.CanDatTruoc,
            payload.CanChiDinhBacSi,
            payload.HuongDanTruocKham || null,
            payload.ThuTuHienThi,
            payload.MauNhan || null,
            payload.MaChuyenKhoa
        ]);

        return result.insertId;
    }
};

export default ServicesModel;