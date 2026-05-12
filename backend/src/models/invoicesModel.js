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
        conditions.push(`(COALESCE(dt_filter.MaBacSiKeDon, ba.MaBacSi, pk.MaBacSi) = ? OR bs.HoTen = ?)`);
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
            LEFT JOIN PhieuKham pk_direct ON hd.MaPK = pk_direct.MaPK
            LEFT JOIN PhieuKham pk ON COALESCE(hd.MaPK, ba.MaPK) = pk.MaPK
            LEFT JOIN DonThuoc dt_filter ON dt_filter.MaBA = ba.MaBA
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien bs ON COALESCE(dt_filter.MaBacSiKeDon, ba.MaBacSi, pk.MaBacSi) = bs.MaNV
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
            INNER JOIN (
                SELECT COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSi
                FROM BenhAn ba
                LEFT JOIN DonThuoc dt ON dt.MaBA = ba.MaBA
            ) prescriber ON nv.MaNV = prescriber.MaBacSi
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
                hd.MaPK,
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
                bs.HoTen AS TenBacSi,
                bs.HoTen AS TenBacSiKeDon,
                dt_info.NgayKeDon,
                COALESCE(dt_info.MaBacSiKeDon, ba.MaBacSi, pk.MaBacSi) AS MaBacSiKeDon,
                px_info.MaPX AS MaPhieuXuatThuoc,
                px_info.NgayXuat AS NgayCapPhat,
                kx_info.TenKho AS KhoXuatThuoc,
                ds_info.MaNV AS MaDuocSi,
                ds_info.HoTen AS TenDuocSiCapPhat
            FROM HoaDon hd
            LEFT JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            LEFT JOIN DonThuoc dt_info ON dt_info.MaBA = ba.MaBA
            LEFT JOIN PhieuXuatThuoc px_info
                ON px_info.MaDT = dt_info.MaDT
               AND px_info.TrangThai = 'HoanThanh'
               AND px_info.MaPX = (
                    SELECT MAX(px2.MaPX)
                    FROM PhieuXuatThuoc px2
                    JOIN DonThuoc dt2 ON dt2.MaDT = px2.MaDT
                    WHERE dt2.MaBA = ba.MaBA
                      AND px2.TrangThai = 'HoanThanh'
               )
            LEFT JOIN Kho kx_info ON px_info.MaKho = kx_info.MaKho
            LEFT JOIN PhieuKham pk ON COALESCE(hd.MaPK, ba.MaPK) = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON hd.MaNhanVien = nv.MaNV
            LEFT JOIN NhanVien bs ON COALESCE(dt_info.MaBacSiKeDon, ba.MaBacSi, pk.MaBacSi) = bs.MaNV
            LEFT JOIN NhanVien ds_info ON COALESCE(px_info.MaNhanVienXuat, px_info.MaNhanVien) = ds_info.MaNV
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
                hd.MaPK,
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
                pk.NgayKham,
                pk.LoaiKham,
                CONCAT('PK', LPAD(pk.MaPK, 6, '0')) AS MaPhieuKham,
                ck.TenChuyenKhoa AS TenKhoa,
                phong.TenPhong AS PhongKham,
                ba.ChuanDoan AS ChanDoan,

                bn.MaBN,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.DiaChi,
                bn.SoDienThoai,
                bn.Email,

                nv.HoTen AS TenNhanVien,
                bs.MaNV AS MaBacSi,
                bs.HoTen AS TenBacSi,
                bs.MaNV AS MaBacSiKeDon,
                bs.HoTen AS TenBacSiKeDon,
                dt_info.MaDT,
                dt_info.NgayKeDon,
                px_info.MaPX AS MaPhieuXuatThuoc,
                px_info.NgayXuat AS NgayCapPhat,
                kx_info.TenKho AS KhoXuatThuoc,
                ds_info.MaNV AS MaDuocSi,
                ds_info.HoTen AS TenDuocSiCapPhat
            FROM HoaDon hd
            LEFT JOIN BenhAn ba ON hd.MaBA = ba.MaBA
            LEFT JOIN DonThuoc dt_info ON dt_info.MaBA = ba.MaBA
            LEFT JOIN PhieuXuatThuoc px_info
                ON px_info.MaDT = dt_info.MaDT
               AND px_info.TrangThai = 'HoanThanh'
               AND px_info.MaPX = (
                    SELECT MAX(px2.MaPX)
                    FROM PhieuXuatThuoc px2
                    JOIN DonThuoc dt2 ON dt2.MaDT = px2.MaDT
                    WHERE dt2.MaBA = ba.MaBA
                      AND px2.TrangThai = 'HoanThanh'
               )
            LEFT JOIN Kho kx_info ON px_info.MaKho = kx_info.MaKho
            LEFT JOIN PhieuKham pk ON COALESCE(hd.MaPK, ba.MaPK) = pk.MaPK
            LEFT JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON hd.MaNhanVien = nv.MaNV
            LEFT JOIN NhanVien bs ON COALESCE(dt_info.MaBacSiKeDon, ba.MaBacSi, pk.MaBacSi) = bs.MaNV
            LEFT JOIN NhanVien ds_info ON COALESCE(px_info.MaNhanVienXuat, px_info.MaNhanVien) = ds_info.MaNV
            LEFT JOIN ChuyenKhoa ck ON pk.MaChuyenKhoa = ck.MaChuyenKhoa
            LEFT JOIN PhongKham phong ON pk.MaPhong = phong.MaPhong
            WHERE hd.MaHD = ?
        `, [id]);

        return rows[0] || null;
    },

    getByVisit: async ({ MaPK = null, MaBA = null, connection = db, forUpdate = false } = {}) => {
        if (!MaPK && !MaBA) return null;

        const conditions = [];
        const params = [];

        if (MaPK) {
            conditions.push("hd.MaPK = ?");
            params.push(MaPK);
        }
        if (MaBA) {
            conditions.push("hd.MaBA = ?");
            params.push(MaBA);
        }

        const [rows] = await connection.query(`
            SELECT hd.*
            FROM HoaDon hd
            WHERE ${conditions.join(" OR ")}
            ORDER BY hd.MaHD DESC
            LIMIT 1
            ${forUpdate ? "FOR UPDATE" : ""}
        `, params);

        return rows[0] || null;
    },

    getDefaultExamService: async ({ MaChuyenKhoa = null, connection = db } = {}) => {
        const params = [];
        let specialtyOrder = "CASE WHEN d.MaChuyenKhoa IS NULL THEN 1 ELSE 0 END";
        let specialtyFilter = "";

        if (MaChuyenKhoa) {
            specialtyFilter = "AND (d.MaChuyenKhoa = ? OR d.MaChuyenKhoa IS NULL)";
            params.push(MaChuyenKhoa);
            specialtyOrder = "CASE WHEN d.MaChuyenKhoa = ? THEN 0 WHEN d.MaChuyenKhoa IS NULL THEN 1 ELSE 2 END";
            params.unshift(MaChuyenKhoa);
        }

        const [rows] = await connection.query(`
            SELECT d.MaDichVu, d.TenDichVu, d.Gia
            FROM DichVu d
            WHERE d.Loai = 'KhamBenh'
              AND COALESCE(d.TrangThai, 1) = 1
              ${specialtyFilter}
            ORDER BY ${specialtyOrder}, d.MaDichVu ASC
            LIMIT 1
        `, params);

        return rows[0] || null;
    },

    getServicesByIds: async (ids = [], connection = db) => {
        const cleanIds = [...new Set(ids.map(Number).filter(Boolean))];
        if (!cleanIds.length) return [];

        const [rows] = await connection.query(`
            SELECT
                d.MaDichVu,
                d.TenDichVu,
                d.Gia,
                d.Loai,
                COALESCE(ch.CanChiDinhBacSi, d.CanChiDinhBacSi, 0) AS CanChiDinhBacSi
            FROM DichVu d
            LEFT JOIN CauHinhDichVu ch ON ch.MaDichVu = d.MaDichVu
            WHERE d.MaDichVu IN (?)
              AND COALESCE(d.TrangThai, 1) = 1
              AND d.Loai IN ('XetNghiem', 'SieuAm')
        `, [cleanIds]);

        return rows;
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
                px_map.SoLo,
                px.NgayXuat AS NgayCapPhat,
                k.TenKho AS KhoXuatThuoc,
                ds.HoTen AS TenDuocSiCapPhat
            FROM ChiTietHoaDon cthd
            LEFT JOIN DichVu dv
                ON cthd.MaDichVu = dv.MaDichVu
            LEFT JOIN Thuoc t
                ON cthd.MaThuoc = t.MaThuoc
            LEFT JOIN PhieuXuatThuoc px
                ON cthd.MaPX = px.MaPX
            LEFT JOIN Kho k
                ON px.MaKho = k.MaKho
            LEFT JOIN NhanVien ds
                ON COALESCE(px.MaNhanVienXuat, px.MaNhanVien) = ds.MaNV
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
                px.MaKho,
                k.TenKho AS KhoXuatThuoc,
                COALESCE(px.MaNhanVienXuat, px.MaNhanVien) AS MaDuocSi,
                ds.HoTen AS TenDuocSiCapPhat,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                bs.HoTen AS TenBacSiKeDon,
                dt.NgayKeDon,
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
            LEFT JOIN Kho k ON px.MaKho = k.MaKho
            LEFT JOIN NhanVien ds ON COALESCE(px.MaNhanVienXuat, px.MaNhanVien) = ds.MaNV
            LEFT JOIN NhanVien bs ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = bs.MaNV
            WHERE hd.MaHD = ?
              AND (hd.MaPX IS NULL OR hd.MaPX = px.MaPX)
            ORDER BY px.NgayXuat ASC, px.MaPX ASC, ctp.MaCTPX ASC
        `, [invoiceId]);

        return rows;
    },

    replaceDrugDetailsFromDispense: async (invoiceId, connection = db) => {
        const dispenseRows = await InvoicesModel.getCompletedDispenseItemsByInvoice(invoiceId, connection);

        await connection.query(`
            DELETE FROM ChiTietHoaDon
            WHERE MaHD = ?
              AND LoaiMuc = 'Thuoc'
        `, [invoiceId]);

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

    upsertVisitServiceDetails: async (invoiceId, items = [], { replace = false, onlyExam = false, connection = db } = {}) => {
        if (replace) {
            await connection.query(`
                DELETE cthd
                FROM ChiTietHoaDon cthd
                LEFT JOIN DichVu dv ON dv.MaDichVu = cthd.MaDichVu
                WHERE cthd.MaHD = ?
                  AND cthd.LoaiMuc = 'DichVu'
                  AND ${onlyExam ? "dv.Loai = 'KhamBenh'" : "(dv.Loai <> 'KhamBenh' OR dv.Loai IS NULL)"}
            `, [invoiceId]);
        }

        if (!Array.isArray(items) || !items.length) return;

        const values = items.map((item) => {
            const soLuong = Number(item.SoLuong || 1);
            const donGia = Number(item.DonGia ?? item.Gia ?? item.SoTien ?? 0);
            const thanhTien = Number(item.ThanhTien ?? (donGia * soLuong));
            return [
                invoiceId,
                item.MaDichVu || null,
                thanhTien,
                null,
                "DichVu",
                soLuong,
                donGia,
                thanhTien,
                item.DienGiai || item.TenDichVu || null,
                null
            ];
        });

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

    replaceDrugDetailsFromPrescription: async (invoiceId, maBA, connection = db) => {
        await connection.query(`
            DELETE FROM ChiTietHoaDon
            WHERE MaHD = ?
              AND LoaiMuc = 'Thuoc'
        `, [invoiceId]);
        return [];
    },

    create: async ({
        MaBA,
        MaPK = null,
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
                MaPK,
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
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
        `, [
            MaBA,
            MaPK,
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
        MaPK = null,
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
                MaPK = ?,
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
            MaPK,
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

    updateTotalsAndStatus: async (id, {
        TongTien,
        GiamGia,
        ThanhTienCuoi,
        TrangThai,
        PhuongThucThanhToan,
        NgayThanhToan,
        connection = db
    }) => {
        const [result] = await connection.query(`
            UPDATE HoaDon
            SET
                TongTien = ?,
                GiamGia = ?,
                ThanhTienCuoi = ?,
                TrangThai = ?,
                PhuongThucThanhToan = ?,
                NgayThanhToan = ?
            WHERE MaHD = ?
        `, [TongTien, GiamGia, ThanhTienCuoi, TrangThai, PhuongThucThanhToan, NgayThanhToan, id]);

        return result.affectedRows;
    },

    getPaymentHistory: async (invoiceId, connection = db) => {
        const [rows] = await connection.query(`
            SELECT
                MaLSTT,
                MaHD,
                LoaiGiaoDich,
                PhuongThucThanhToan,
                SoTienThanhToan,
                NgayThanhToan,
                MaNhanVien,
                GhiChu
            FROM LichSuThanhToan
            WHERE MaHD = ?
            ORDER BY NgayThanhToan DESC, MaLSTT DESC
        `, [invoiceId]);

        return rows;
    },

    insertPaymentHistory: async (invoiceId, {
        LoaiGiaoDich = "ThanhToan",
        PhuongThucThanhToan,
        SoTienThanhToan,
        MaNhanVien = null,
        GhiChu = null,
        connection = db
    }) => {
        const [result] = await connection.query(`
            INSERT INTO LichSuThanhToan (
                MaHD,
                LoaiGiaoDich,
                PhuongThucThanhToan,
                SoTienThanhToan,
                NgayThanhToan,
                MaNhanVien,
                GhiChu
            )
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `, [
            invoiceId,
            LoaiGiaoDich,
            PhuongThucThanhToan,
            SoTienThanhToan,
            MaNhanVien,
            GhiChu
        ]);

        return result.insertId;
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
                DELETE FROM LichSuThanhToan
                WHERE MaHD = ?
            `, [id]);

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
