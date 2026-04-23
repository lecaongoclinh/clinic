import db from "../config/db.js";

function buildFilterClause(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.keyword) {
        conditions.push(`
            (
                COALESCE(hd.MaHoaDon, '') LIKE ?
                OR COALESCE(bn.HoTen, '') LIKE ?
                OR COALESCE(bn.SoDienThoai, '') LIKE ?
            )
        `);
        const keyword = `%${filters.keyword}%`;
        params.push(keyword, keyword, keyword);
    }

    if (filters.status) {
        conditions.push(`hd.TrangThai = ?`);
        params.push(filters.status);
    }

    if (filters.date) {
        conditions.push(`DATE(hd.NgayTao) = ?`);
        params.push(filters.date);
    }

    if (filters.doctor) {
        // hỗ trợ cả lọc theo MaNV hoặc theo tên bác sĩ
        conditions.push(`(ba.MaBacSi = ? OR bs.HoTen = ?)`);
        params.push(filters.doctor, filters.doctor);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereClause, params };
}

const InvoicesModel = {
    getSummary: async (filters = {}) => {
        const { whereClause, params } = buildFilterClause(filters);

        const [[summary]] = await db.query(`
            SELECT
                COUNT(*) AS TongHoaDon,
                COALESCE(SUM(hd.TongTien), 0) AS TongDoanhThu,
                COALESCE(SUM(CASE WHEN hd.TrangThai = 'ChuaThanhToan' THEN hd.ThanhTienCuoi ELSE 0 END), 0) AS ChoThanhToan,
                COALESCE(SUM(CASE WHEN hd.TrangThai = 'DaThanhToan' THEN 1 ELSE 0 END), 0) AS DaThanhToan,
                COALESCE(SUM(CASE WHEN hd.TrangThai = 'QuaHan' THEN hd.ThanhTienCuoi ELSE 0 END), 0) AS QuaHan
            FROM HoaDon hd
            LEFT JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien bs ON ba.MaBacSi = bs.MaNV
            ${whereClause}
        `, params);

        return {
            TongHoaDon: Number(summary?.TongHoaDon || 0),
            TongDoanhThu: Number(summary?.TongDoanhThu || 0),
            ChoThanhToan: Number(summary?.ChoThanhToan || 0),
            DaThanhToan: Number(summary?.DaThanhToan || 0),
            QuaHan: Number(summary?.QuaHan || 0)
        };
    },

    getDoctorOptions: async () => {
        const [rows] = await db.query(`
            SELECT
                nv.MaNV,
                nv.HoTen
            FROM NhanVien nv
            INNER JOIN BenhAn ba ON nv.MaNV = ba.MaBacSi
            GROUP BY nv.MaNV, nv.HoTen
            ORDER BY nv.HoTen ASC
        `);

        return rows;
    },

    getAll: async (filters = {}) => {
        const { whereClause, params } = buildFilterClause(filters);

        const [rows] = await db.query(`
            SELECT
                hd.MaHD,
                hd.MaHoaDon,
                hd.MaBA,
                hd.MaPX,
                hd.MaNhanVien,
                hd.PhuongThucThanhToan,
                hd.NgayThanhToan,
                hd.TrangThai,
                hd.NgayTao,
                hd.TongTien,
                hd.GiamGia,
                hd.ThanhTienCuoi,
                hd.HanThanhToan,
                hd.GhiChu,

                bn.MaBN,
                bn.HoTen,
                bn.SoDienThoai,

                nv.HoTen AS TenNhanVien,
                bs.HoTen AS TenBacSi
            FROM HoaDon hd
            LEFT JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON hd.MaNhanVien = nv.MaNV
            LEFT JOIN NhanVien bs ON ba.MaBacSi = bs.MaNV
            ${whereClause}
            ORDER BY hd.NgayTao DESC, hd.MaHD DESC
        `, params);

        return rows;
    },

    getById: async (id, connection = db) => {
        const [rows] = await connection.query(`
            SELECT
                hd.MaHD,
                hd.MaHoaDon,
                hd.MaBA,
                hd.MaPX,
                hd.MaNhanVien,
                hd.PhuongThucThanhToan,
                hd.NgayThanhToan,
                hd.TrangThai,
                hd.NgayTao,
                hd.TongTien,
                hd.GiamGia,
                hd.ThanhTienCuoi,
                hd.HanThanhToan,
                hd.GhiChu,

                bn.MaBN,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.DiaChi,
                bn.SoDienThoai,
                bn.Email,

                nv.HoTen AS TenNhanVien,
                bs.MaNV AS MaBacSi,
                bs.HoTen AS TenBacSi
            FROM HoaDon hd
            LEFT JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            LEFT JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON hd.MaNhanVien = nv.MaNV
            LEFT JOIN NhanVien bs ON ba.MaBacSi = bs.MaNV
            WHERE hd.MaHD = ?
        `, [id]);

        return rows[0] || null;
    },

    getDetails: async (id, connection = db) => {
        const [rows] = await connection.query(`
            SELECT
                cthd.MaCTHD,
                cthd.MaHD,
                cthd.MaDichVu,
                cthd.SoTien,
                cthd.MaThuoc,
                cthd.LoaiMuc,
                cthd.SoLuong,
                cthd.DonGia,
                cthd.ThanhTien,
                cthd.DienGiai,
                cthd.MaPX,

                dv.TenDichVu,
                dv.Loai AS LoaiDichVu,
                t.TenThuoc,
                px_map.SoLo
            FROM ChiTietHoaDon cthd
            LEFT JOIN DichVu dv
                ON cthd.MaDichVu = dv.MaDichVu
            LEFT JOIN Thuoc t
                ON cthd.MaThuoc = t.MaThuoc
            LEFT JOIN (
                SELECT
                    ctp.MaPX,
                    l.MaThuoc,
                    MIN(l.SoLo) AS SoLo
                FROM ChiTietPhieuXuat ctp
                INNER JOIN LoThuoc l ON l.MaLo = ctp.MaLo
                GROUP BY ctp.MaPX, l.MaThuoc
            ) px_map
                ON px_map.MaPX = cthd.MaPX
               AND px_map.MaThuoc = cthd.MaThuoc
            WHERE cthd.MaHD = ?
            ORDER BY
                CASE
                    WHEN cthd.LoaiMuc = 'DichVu' AND dv.Loai = 'KhamBenh' THEN 1
                    WHEN cthd.LoaiMuc = 'DichVu' THEN 2
                    WHEN cthd.LoaiMuc = 'Thuoc' THEN 3
                    ELSE 99
                END,
                cthd.MaCTHD ASC
        `, [id]);

        return rows.map((row) => {
            let loaiMuc = row.LoaiMuc;

            if (loaiMuc === "DichVu" && row.LoaiDichVu === "KhamBenh") {
                loaiMuc = "Kham";
            }

            let tenMuc = row.DienGiai || "";

            if (loaiMuc === "Kham") {
                tenMuc = row.TenDichVu || row.DienGiai || "Tiền khám";
            } else if (loaiMuc === "DichVu") {
                tenMuc = row.TenDichVu || row.DienGiai || "Dịch vụ";
            } else if (loaiMuc === "Thuoc") {
                tenMuc = row.TenThuoc || row.DienGiai || "Thuốc";
            }

            const donGia = Number(row.DonGia || 0);
            const soLuong = Number(row.SoLuong || 1);
            const thanhTien = Number(
                row.ThanhTien !== null && row.ThanhTien !== undefined
                    ? row.ThanhTien
                    : row.SoTien || 0
            );

            const giamTruDong = Math.max((donGia * soLuong) - thanhTien, 0);

            return {
                ...row,
                LoaiMuc: loaiMuc,
                TenMuc: tenMuc,
                DonGia: donGia,
                SoLuong: soLuong,
                ThanhTien: thanhTien,
                GiamTruDong: giamTruDong
            };
        });
    },

    getCompletedDispenseItemsByInvoice: async (invoiceId, connection = db) => {
        const [rows] = await connection.query(`
            SELECT
                hd.MaHD,
                hd.MaBA,
                hd.MaPX AS HoaDonMaPX,

                px.MaPX,
                px.NgayXuat,
                ctp.MaCTPX,
                ctp.SoLuong,
                ctp.DonGia,
                ctp.ThanhTien,

                l.MaLo,
                l.SoLo,
                l.MaThuoc,

                t.TenThuoc
            FROM HoaDon hd
            INNER JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            INNER JOIN DonThuoc dt ON dt.MaBA = ba.MaBA
            INNER JOIN PhieuXuatThuoc px
                ON px.MaDT = dt.MaDT
               AND px.TrangThai = 'HoanThanh'
            INNER JOIN ChiTietPhieuXuat ctp ON ctp.MaPX = px.MaPX
            INNER JOIN LoThuoc l ON l.MaLo = ctp.MaLo
            INNER JOIN Thuoc t ON t.MaThuoc = l.MaThuoc
            WHERE hd.MaHD = ?
              AND (hd.MaPX IS NULL OR hd.MaPX = px.MaPX)
            ORDER BY px.NgayXuat ASC, px.MaPX ASC, ctp.MaCTPX ASC
        `, [invoiceId]);

        return rows;
    },

    replaceDrugDetailsFromDispense: async (invoiceId, connection = db) => {
        await connection.query(`
            DELETE FROM ChiTietHoaDon
            WHERE MaHD = ?
              AND LoaiMuc = 'Thuoc'
        `, [invoiceId]);

        const dispenseRows = await InvoicesModel.getCompletedDispenseItemsByInvoice(invoiceId, connection);

        if (!dispenseRows.length) {
            return [];
        }

        const values = dispenseRows.map((row) => ([
            invoiceId,
            null,
            Number(row.ThanhTien || 0),
            row.MaThuoc,
            "Thuoc",
            Number(row.SoLuong || 0),
            Number(row.DonGia || 0),
            Number(row.ThanhTien || 0),
            [
                row.TenThuoc || "Thuốc",
                row.SoLo ? `Số lô: ${row.SoLo}` : null,
                `PX-${String(row.MaPX).padStart(5, "0")}`
            ].filter(Boolean).join(" | "),
            row.MaPX
        ]));

        await connection.query(`
            INSERT INTO ChiTietHoaDon (
                MaHD,
                MaDichVu,
                SoTien,
                MaThuoc,
                LoaiMuc,
                SoLuong,
                DonGia,
                ThanhTien,
                DienGiai,
                MaPX
            )
            VALUES ?
        `, [values]);

        return dispenseRows;
    },

    replaceNonDrugDetails: async (invoiceId, items = [], connection = db) => {
        await connection.query(`
            DELETE FROM ChiTietHoaDon
            WHERE MaHD = ?
              AND LoaiMuc <> 'Thuoc'
        `, [invoiceId]);

        if (!Array.isArray(items) || !items.length) {
            return;
        }

        const values = items.map((item) => ([
            invoiceId,
            item.MaDichVu || null,
            Number(item.ThanhTien ?? item.SoTien ?? 0),
            null,
            "DichVu",
            Number(item.SoLuong || 1),
            Number(item.DonGia || item.SoTien || 0),
            Number(item.ThanhTien ?? item.SoTien ?? 0),
            item.DienGiai || null,
            null
        ]));

        await connection.query(`
            INSERT INTO ChiTietHoaDon (
                MaHD,
                MaDichVu,
                SoTien,
                MaThuoc,
                LoaiMuc,
                SoLuong,
                DonGia,
                ThanhTien,
                DienGiai,
                MaPX
            )
            VALUES ?
        `, [values]);
    },

    create: async ({
        MaBA,
        MaPX = null,
        MaNhanVien,
        PhuongThucThanhToan,
        TrangThai,
        TongTien,
        GiamGia,
        ThanhTienCuoi,
        HanThanhToan,
        GhiChu,
        connection = db
    }) => {
        const [result] = await connection.query(`
            INSERT INTO HoaDon (
                MaBA,
                MaPX,
                MaNhanVien,
                PhuongThucThanhToan,
                TrangThai,
                NgayTao,
                TongTien,
                GiamGia,
                ThanhTienCuoi,
                HanThanhToan,
                GhiChu
            )
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
        `, [
            MaBA,
            MaPX,
            MaNhanVien,
            PhuongThucThanhToan,
            TrangThai,
            TongTien,
            GiamGia,
            ThanhTienCuoi,
            HanThanhToan,
            GhiChu
        ]);

        return result.insertId;
    },

    update: async (id, {
        MaBA,
        MaPX = null,
        MaNhanVien,
        PhuongThucThanhToan,
        TrangThai,
        MaHoaDon,
        TongTien,
        GiamGia,
        ThanhTienCuoi,
        HanThanhToan,
        GhiChu,
        connection = db
    }) => {
        const [result] = await connection.query(`
            UPDATE HoaDon
            SET
                MaBA = ?,
                MaPX = ?,
                MaNhanVien = ?,
                PhuongThucThanhToan = ?,
                TrangThai = ?,
                MaHoaDon = ?,
                TongTien = ?,
                GiamGia = ?,
                ThanhTienCuoi = ?,
                HanThanhToan = ?,
                GhiChu = ?
            WHERE MaHD = ?
        `, [
            MaBA,
            MaPX,
            MaNhanVien,
            PhuongThucThanhToan,
            TrangThai,
            MaHoaDon,
            TongTien,
            GiamGia,
            ThanhTienCuoi,
            HanThanhToan,
            GhiChu,
            id
        ]);

        return result.affectedRows;
    },

    updatePaymentState: async (id, {
        TrangThai,
        PhuongThucThanhToan,
        NgayThanhToan,
        GhiChu,
        connection = db
    }) => {
        const [result] = await connection.query(`
            UPDATE HoaDon
            SET
                TrangThai = ?,
                PhuongThucThanhToan = ?,
                NgayThanhToan = ?,
                GhiChu = ?
            WHERE MaHD = ?
        `, [TrangThai, PhuongThucThanhToan, NgayThanhToan, GhiChu, id]);

        return result.affectedRows;
    },

    remove: async (id) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(`
                DELETE FROM ChiTietHoaDon
                WHERE MaHD = ?
            `, [id]);

            const [result] = await connection.query(`
                DELETE FROM HoaDon
                WHERE MaHD = ?
            `, [id]);

            await connection.commit();
            return result.affectedRows;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

export default InvoicesModel;
