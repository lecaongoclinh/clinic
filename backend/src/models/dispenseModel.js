import db from "../config/db.js";

const STOCK_EXPR = "GREATEST(COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0), 0)";
const EXPORTABLE_LOT_CONDITION = "COALESCE(l.TrangThai, 'ConHan') NOT IN ('HetHan', 'DaHuy') AND l.HanSuDung > CURDATE()";

function buildCatalogFilters(filters = {}) {
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

    if (filters.DangBaoChe) {
        conditions.push("t.DangBaoChe = ?");
        params.push(filters.DangBaoChe);
    }

    if (filters.NhietDoBaoQuan) {
        conditions.push("t.NhietDoBaoQuan LIKE ?");
        params.push(`%${filters.NhietDoBaoQuan}%`);
    }

    return {
        where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params
    };
}

const DispenseModel = {
    getDispenseWarehouse: async (connection = db) => {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Kho'
              AND COLUMN_NAME IN ('LoaiKho', 'IsDispenseWarehouse')
        `);
        const columnNames = new Set(columns.map(row => row.COLUMN_NAME));
        const conditions = ["TenKho IN ('Kho Quầy Thuốc', 'Kho Quầy')"];
        const orderParts = [
            "WHEN TenKho = 'Kho Quầy Thuốc' THEN 3",
            "WHEN TenKho = 'Kho Quầy' THEN 4"
        ];

        if (columnNames.has("IsDispenseWarehouse")) {
            conditions.unshift("IsDispenseWarehouse = TRUE");
            orderParts.unshift("WHEN IsDispenseWarehouse = TRUE THEN 1");
        }
        if (columnNames.has("LoaiKho")) {
            conditions.unshift("LoaiKho = 'DISPENSE'");
            orderParts.unshift("WHEN LoaiKho = 'DISPENSE' THEN 0");
        }

        const [rows] = await connection.query(`
            SELECT MaKho, TenKho
            FROM Kho
            WHERE TrangThai = TRUE
              AND (${conditions.join(" OR ")})
            ORDER BY CASE ${orderParts.join(" ")} ELSE 9 END, TenKho ASC
            LIMIT 1
        `);
        return rows[0] || null;
    },

    getBootstrap: async (MaKho = null) => {
        const dispenseWarehouse = await DispenseModel.getDispenseWarehouse();
        const [warehouses] = await db.query(`
            SELECT MaKho, TenKho, NhietDoToiThieu, NhietDoToiDa
            FROM Kho
            WHERE TrangThai = TRUE
            ORDER BY TenKho ASC
        `);

        const [suppliers] = await db.query(`
            SELECT MaNCC, TenNCC
            FROM NhaCungCap
            ORDER BY TenNCC ASC
        `);

        const [departments] = await db.query(`
            SELECT MaChuyenKhoa, TenChuyenKhoa
            FROM ChuyenKhoa
            ORDER BY TenChuyenKhoa ASC
        `);

        const params = [];
        const warehouseFilter = MaKho ? " AND l.MaKho = ?" : "";
        if (MaKho) params.push(MaKho);

        const [[stats]] = await db.query(`
            SELECT
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon,
                COALESCE(SUM(${STOCK_EXPR} * COALESCE(l.GiaNhap, 0)), 0) AS GiaTriTon,
                SUM(
                    CASE
                        WHEN ${STOCK_EXPR} > 0
                         AND l.HanSuDung > CURDATE()
                         AND l.HanSuDung <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
                        THEN 1 ELSE 0
                    END
                ) AS LoCanDate,
                SUM(CASE WHEN ${STOCK_EXPR} <= 0 THEN 1 ELSE 0 END) AS LoHetHang
            FROM LoThuoc l
            WHERE ${EXPORTABLE_LOT_CONDITION} ${warehouseFilter}
        `, params);

        const [pendingPrescriptions] = await db.query(`
            SELECT
                dt.MaDT,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                dt.NgayKeDon,
                COALESCE(dt.TrangThai, 'ChuaXuat') AS TrangThai,
                bn.MaBN,
                bn.HoTen,
                COALESCE(ba.ChuanDoan, '') AS ChuanDoan,
                COALESCE(ba.GhiChu, '') AS GhiChu,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSi,
                COALESCE(nv.HoTen, '') AS TenBacSi,
                COALESCE(nv.HoTen, '') AS TenBacSiKeDon,
                nv.MaChuyenKhoa,
                COALESCE(ck.TenChuyenKhoa, '') AS TenChuyenKhoa,
                COALESCE(ct.SoLoaiThuoc, 0) AS SoLoaiThuoc,
                COALESCE(ct.TongSoLuong, 0) AS TongSoLuong,
                COALESCE(ct.TongTien, 0) AS TongTien
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = nv.MaNV
            LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
            LEFT JOIN (
                SELECT
                    ctdt.MaDT,
                    COUNT(*) AS SoLoaiThuoc,
                    COALESCE(SUM(ctdt.SoLuong), 0) AS TongSoLuong,
                    COALESCE(SUM(ctdt.SoLuong * COALESCE(t.GiaBan, 0)), 0) AS TongTien
                FROM ChiTietDonThuoc ctdt
                LEFT JOIN Thuoc t ON ctdt.MaThuoc = t.MaThuoc
                GROUP BY ctdt.MaDT
            ) ct ON dt.MaDT = ct.MaDT
            WHERE dt.TrangThai = 'ChuaXuat'
            ORDER BY dt.NgayKeDon DESC, dt.MaDT DESC
            LIMIT 12
        `);

       const [recentExports] = await db.query(`
        SELECT
            px.MaPX,
            px.NgayXuat,
            px.LoaiXuat,
            px.TrangThai,
            px.GhiChu,
            px.TongTien,
            px.MaDT,
            bn.HoTen AS TenBenhNhan,
            k.TenKho,
            nv.HoTen AS TenNhanVien,
            nvx.HoTen AS TenNhanVienXuat,
            nvx.HoTen AS TenDuocSi
        FROM PhieuXuatThuoc px
        LEFT JOIN BenhNhan bn ON px.MaBN = bn.MaBN
        LEFT JOIN Kho k ON px.MaKho = k.MaKho
        LEFT JOIN NhanVien nv ON px.MaNhanVien = nv.MaNV
        LEFT JOIN NhanVien nvx ON COALESCE(px.MaNhanVienXuat, px.MaNhanVien) = nvx.MaNV
        WHERE px.TrangThai = 'HoanThanh'
        ORDER BY px.MaPX DESC
        LIMIT 10
    `);

        return {
            warehouses,
            suppliers,
            departments,
            dispenseWarehouse,
            stats: stats || {
                TongTon: 0,
                GiaTriTon: 0,
                LoCanDate: 0,
                LoHetHang: 0
            },
            pendingPrescriptions,
            recentExports
        };
    },

    getCatalog: async (filters = {}) => {
        const { where, params } = buildCatalogFilters(filters);
        const warehouseFilter = filters.MaKho ? " AND l.MaKho = ?" : "";
        const supplierFilter = filters.MaNCC ? " AND l.MaNCC = ?" : "";
        const stockFilterParams = [];
        if (filters.MaKho) stockFilterParams.push(filters.MaKho);
        if (filters.MaNCC) stockFilterParams.push(filters.MaNCC);
        const queryParams = [...stockFilterParams, ...stockFilterParams, ...params];

        const [rows] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.NhietDoBaoQuan,
                t.LoaiThuoc,
                t.GiaBan,
                t.MaVach,
                COALESCE(SUM(
                    CASE
                        WHEN ${EXPORTABLE_LOT_CONDITION} ${warehouseFilter} ${supplierFilter}
                        THEN ${STOCK_EXPR}
                        ELSE 0
                    END
                ), 0) AS TongTon,
                MIN(
                    CASE
                        WHEN ${EXPORTABLE_LOT_CONDITION} AND ${STOCK_EXPR} > 0 ${warehouseFilter} ${supplierFilter}
                        THEN l.HanSuDung
                        ELSE NULL
                    END
                ) AS HanGanNhat
            FROM Thuoc t
            LEFT JOIN LoThuoc l ON t.MaThuoc = l.MaThuoc
            ${where}
            GROUP BY
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.NhietDoBaoQuan,
                t.LoaiThuoc,
                t.GiaBan,
                t.MaVach
            HAVING TongTon > 0
            ORDER BY HanGanNhat ASC, t.TenThuoc ASC
            LIMIT 100
        `, queryParams);

        return rows;
    },

    getMedicineLots: async ({ MaThuoc, MaKho = null, MaNCC = null, connection = db }) => {
        const params = [MaThuoc];
        const warehouseFilter = MaKho ? " AND l.MaKho = ?" : "";
        if (MaKho) params.push(MaKho);
        const supplierFilter = MaNCC ? " AND l.MaNCC = ?" : "";
        if (MaNCC) params.push(MaNCC);

        const [rows] = await connection.query(`
            SELECT
                l.MaLo,
                l.MaThuoc,
                l.SoLo,
                l.NgaySanXuat,
                l.HanSuDung,
                l.GiaNhap,
                l.NhietDoBaoQuan,
                l.MaNCC,
                l.MaKho,
                ${STOCK_EXPR} AS Ton,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.GiaBan,
                t.QuyCachDongGoi,
                t.NhietDoBaoQuan AS NhietDoThuoc,
                ncc.TenNCC,
                k.TenKho,
                pn.NgayNhap
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN ChiTietPhieuNhap ctpn ON l.MaCTPN = ctpn.MaCTPN
            LEFT JOIN PhieuNhapThuoc pn ON ctpn.MaPN = pn.MaPN
            WHERE l.MaThuoc = ?
              AND ${EXPORTABLE_LOT_CONDITION}
              AND ${STOCK_EXPR} > 0
              ${warehouseFilter}
              ${supplierFilter}
            ORDER BY l.HanSuDung ASC, l.MaLo ASC
        `, params);

        return rows;
    },

    getPendingPrescriptions: async () => {
    const [rows] = await db.query(`
        SELECT
            dt.MaDT,
            COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
            dt.NgayKeDon,
            COALESCE(dt.TrangThai, 'ChuaXuat') AS TrangThai,
            bn.MaBN,
            bn.HoTen,
            COALESCE(ba.ChuanDoan, '') AS ChuanDoan,
            COALESCE(ba.GhiChu, '') AS GhiChu,
            COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSi,
            COALESCE(nv.HoTen, '') AS TenBacSi,
            COALESCE(nv.HoTen, '') AS TenBacSiKeDon,
            nv.MaChuyenKhoa,
            COALESCE(ck.TenChuyenKhoa, '') AS TenChuyenKhoa,
            COALESCE(ct.SoLoaiThuoc, 0) AS SoLoaiThuoc,
            COALESCE(ct.TongSoLuong, 0) AS TongSoLuong,
            COALESCE(ct.TongTien, 0) AS TongTien
        FROM DonThuoc dt
        JOIN BenhAn ba ON dt.MaBA = ba.MaBA
        JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
        JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
        LEFT JOIN NhanVien nv ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = nv.MaNV
        LEFT JOIN ChuyenKhoa ck ON nv.MaChuyenKhoa = ck.MaChuyenKhoa
        LEFT JOIN (
            SELECT
                ctdt.MaDT,
                COUNT(*) AS SoLoaiThuoc,
                COALESCE(SUM(ctdt.SoLuong), 0) AS TongSoLuong,
                COALESCE(SUM(ctdt.SoLuong * COALESCE(t.GiaBan, 0)), 0) AS TongTien
            FROM ChiTietDonThuoc ctdt
            LEFT JOIN Thuoc t ON ctdt.MaThuoc = t.MaThuoc
            GROUP BY ctdt.MaDT
        ) ct ON dt.MaDT = ct.MaDT
        WHERE dt.TrangThai = 'ChuaXuat'
        ORDER BY dt.NgayKeDon DESC, dt.MaDT DESC
    `);

    return rows;
},

    getPrescriptionDetail: async ({ MaDT }) => {
        const [rows] = await db.query(`
            SELECT
                dt.MaDT,
                dt.NgayKeDon,
                dt.TrangThai,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                nv.HoTen AS TenBacSiKeDon,
                bn.MaBN,
                bn.HoTen,
                t.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.GiaBan,
                t.NhietDoBaoQuan,
                ct.SoLuong AS SoLuongKe,
                ct.LieuDung,
                0 AS TongTon
            FROM DonThuoc dt
            JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            JOIN PhieuKham pk ON ba.MaPK = pk.MaPK
            JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = nv.MaNV
            JOIN ChiTietDonThuoc ct ON dt.MaDT = ct.MaDT
            JOIN Thuoc t ON ct.MaThuoc = t.MaThuoc
            WHERE dt.MaDT = ?
            ORDER BY ct.MaCTDT ASC
        `, [MaDT]);

        return rows;
    },

    getReturnableSupplierLots: async ({ search = "", MaKho, MaNCC, connection = db }) => {
        const keyword = `%${search || ""}%`;
        const [rows] = await connection.query(`
            SELECT
                l.MaLo,
                l.MaThuoc,
                l.SoLo,
                l.NgaySanXuat,
                l.HanSuDung,
                l.GiaNhap,
                l.MaNCC,
                l.MaKho,
                ${STOCK_EXPR} AS Ton,
                t.TenThuoc,
                t.HoatChat,
                t.DonViCoBan,
                ncc.TenNCC,
                k.TenKho
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            WHERE l.MaKho = ?
              AND l.MaNCC = ?
              AND ${EXPORTABLE_LOT_CONDITION}
              AND ${STOCK_EXPR} > 0
              AND (
                  t.TenThuoc LIKE ?
                  OR t.HoatChat LIKE ?
                  OR l.SoLo LIKE ?
              )
            ORDER BY t.TenThuoc ASC, l.HanSuDung ASC, l.MaLo ASC
            LIMIT 100
        `, [MaKho, MaNCC, keyword, keyword, keyword]);

        return rows;
    },

    getLotById: async ({ MaLo, connection = db, forUpdate = false }) => {
        const [rows] = await connection.query(`
            SELECT
                l.*,
                t.GiaBan,
                t.TenThuoc,
                t.HoatChat,
                t.DonViCoBan,
                COALESCE(l.SoLuongNhap, 0) - COALESCE(l.SoLuongDaXuat, 0) AS Ton
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            WHERE l.MaLo = ?
            ${forUpdate ? "FOR UPDATE" : ""}
        `, [MaLo]);
        return rows[0] || null;
    },

    getPrescriptionStatus: async ({ MaDT, connection = db, forUpdate = false }) => {
        const [rows] = await connection.query(`
            SELECT MaDT, COALESCE(TrangThai, 'ChuaXuat') AS TrangThai
            FROM DonThuoc
            WHERE MaDT = ?
            ${forUpdate ? "FOR UPDATE" : ""}
        `, [MaDT]);

        return rows[0] || null;
    },

    getAlternativeMedicines: async ({ MaThuoc, MaKho = null }) => {
        const warehouseFilter = MaKho ? " AND l.MaKho = ?" : "";
        const params = MaKho ? [MaKho, MaThuoc] : [MaThuoc];

        const [rows] = await db.query(`
            SELECT
                t2.MaThuoc,
                t2.TenThuoc,
                t2.HamLuong,
                t2.DangBaoChe,
                t2.GiaBan,
                COALESCE(SUM(
                    CASE
                        WHEN ${EXPORTABLE_LOT_CONDITION} ${warehouseFilter}
                        THEN ${STOCK_EXPR}
                        ELSE 0
                    END
                ), 0) AS TongTon
            FROM Thuoc t1
            JOIN Thuoc t2
                ON t1.HoatChat = t2.HoatChat
               AND t1.MaThuoc != t2.MaThuoc
            LEFT JOIN LoThuoc l ON t2.MaThuoc = l.MaThuoc
            WHERE t1.MaThuoc = ?
            GROUP BY t2.MaThuoc, t2.TenThuoc, t2.HamLuong, t2.DangBaoChe, t2.GiaBan
            HAVING TongTon > 0
            ORDER BY TongTon DESC, t2.TenThuoc ASC
            LIMIT 10
        `, params);

        return rows;
    },

    getRecentHistory: async ({ MaThuoc = null, limit = 8 }) => {
        const conditions = ["px.TrangThai = 'HoanThanh'"];
        const params = [];

        if (MaThuoc) {
            conditions.push("l.MaThuoc = ?");
            params.push(MaThuoc);
        }

        params.push(Number(limit) || 8);

        const [rows] = await db.query(`
            SELECT
                px.MaPX,
                px.NgayXuat,
                px.LoaiXuat,
                bn.HoTen AS TenBenhNhan,
                nvx.HoTen AS TenDuocSi,
                nvx.HoTen AS TenNhanVienXuat,
                k.TenKho AS KhoXuatThuoc,
                t.TenThuoc,
                l.SoLo,
                ct.SoLuong,
                ct.ThanhTien
            FROM PhieuXuatThuoc px
            JOIN ChiTietPhieuXuat ct ON px.MaPX = ct.MaPX
            JOIN LoThuoc l ON ct.MaLo = l.MaLo
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN BenhNhan bn ON px.MaBN = bn.MaBN
            WHERE ${conditions.join(" AND ")}
            ORDER BY px.NgayXuat DESC, px.MaPX DESC, ct.MaCTPX DESC
            LIMIT ?
        `, params);

        return rows;
    },

createDraftHeader: async ({ payload, noteData, connection = db }) => {
    const [result] = await connection.query(`
        INSERT INTO PhieuXuatThuoc (
            MaNhanVien,
            MaNhanVienXuat,
            MaKho,
            LoaiXuat,
            MaBN,
            NgayXuat,
            GhiChu,
            TrangThai,
            MaDT,
            TongTien,
            MaNCC,
            LyDoHuy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Nhap', ?, ?, ?, ?)
    `, [
        payload.MaNhanVien,
        payload.MaNhanVienXuat || payload.MaDuocSi || payload.MaNhanVien,
        payload.MaKho,
        payload.LoaiXuat,
        payload.MaBN || null,
        payload.NgayXuat || null,
        JSON.stringify(noteData),
        payload.MaDT || null,
        payload.TongTien || 0,
        payload.MaNCC || null,
        payload.LyDo || null
    ]);

    return result.insertId;
},

    updateDraftHeader: async ({ MaPX, payload, noteData, connection = db }) => {
    await connection.query(`
        UPDATE PhieuXuatThuoc
        SET
            MaNhanVien = ?,
            MaNhanVienXuat = ?,
            MaKho = ?,
            LoaiXuat = ?,
            MaBN = ?,
            NgayXuat = ?,
            GhiChu = ?,
            MaDT = ?,
            TongTien = ?,
            MaNCC = ?,
            LyDoHuy = ?
        WHERE MaPX = ?
          AND TrangThai = 'Nhap'
    `, [
        payload.MaNhanVien,
        payload.MaNhanVienXuat || payload.MaDuocSi || payload.MaNhanVien,
        payload.MaKho,
        payload.LoaiXuat,
        payload.MaBN || null,
        payload.NgayXuat || null,
        JSON.stringify(noteData),
        payload.MaDT || null,
        payload.TongTien || 0,
        payload.MaNCC || null,
        payload.LyDo || null,
        MaPX
    ]);
},

    getDraftHeaderById: async ({ MaPX, connection = db, forUpdate = false }) => {
        const [rows] = await connection.query(`
            SELECT
                px.MaPX,
                px.MaNhanVien,
                COALESCE(px.MaNhanVienXuat, px.MaNhanVien) AS MaNhanVienXuat,
                COALESCE(px.MaNhanVienXuat, px.MaNhanVien) AS MaDuocSi,
                px.MaKho,
                px.LoaiXuat,
                px.MaBN,
                px.NgayXuat,
                px.GhiChu,
                px.TrangThai,
                px.MaDT,
                px.MaNCC,
                k.TenKho,
                bn.HoTen AS TenBenhNhan,
                nv.HoTen AS TenNhanVien,
                nvx.HoTen AS TenNhanVienXuat,
                nvx.HoTen AS TenDuocSi,
                dt.NgayKeDon,
                COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) AS MaBacSiKeDon,
                bs.HoTen AS TenBacSiKeDon
            FROM PhieuXuatThuoc px
            LEFT JOIN Kho k ON px.MaKho = k.MaKho
            LEFT JOIN BenhNhan bn ON px.MaBN = bn.MaBN
            LEFT JOIN NhanVien nv ON px.MaNhanVien = nv.MaNV
            LEFT JOIN NhanVien nvx ON COALESCE(px.MaNhanVienXuat, px.MaNhanVien) = nvx.MaNV
            LEFT JOIN DonThuoc dt ON px.MaDT = dt.MaDT
            LEFT JOIN BenhAn ba ON dt.MaBA = ba.MaBA
            LEFT JOIN NhanVien bs ON COALESCE(dt.MaBacSiKeDon, ba.MaBacSi) = bs.MaNV
            WHERE px.MaPX = ?
            ${forUpdate ? "FOR UPDATE" : ""}
        `, [MaPX]);

        return rows[0] || null;
    },

    insertExportDetail: async ({ MaPX, MaLo, SoLuong, DonGia, ThanhTien, connection }) => {
        await connection.query(`
            INSERT INTO ChiTietPhieuXuat (
                MaPX,
                MaLo,
                SoLuong,
                DonGia,
                ThanhTien
            )
            VALUES (?, ?, ?, ?, ?)
        `, [MaPX, MaLo, SoLuong, DonGia, ThanhTien]);
    },

    updateLotExportQuantity: async ({ MaLo, SoLuong, connection }) => {
    const [result] = await connection.query(`
        UPDATE LoThuoc
        SET SoLuongDaXuat = COALESCE(SoLuongDaXuat, 0) + ?
        WHERE MaLo = ?
          AND GREATEST(COALESCE(SoLuongNhap, 0) - COALESCE(SoLuongDaXuat, 0), 0) >= ?
    `, [SoLuong, MaLo, SoLuong]);

    if (!result.affectedRows) {
        throw new Error(`Khong du ton de xuat lo ${MaLo}`);
    }
},

    insertStockHistory: async ({ MaPX, MaLo, SoLuong, connection, Loai = "Xuat", GhiChu = null }) => {
        const [rows] = await connection.query(`
            SELECT MaThuoc
            FROM LoThuoc
            WHERE MaLo = ?
            LIMIT 1
        `, [MaLo]);

        if (!rows.length) {
            throw new Error(`Khong tim thay lo thuoc ${MaLo}`);
        }

        await connection.query(`
            INSERT INTO LichSuKho (
                MaThuoc,
                MaLo,
                Loai,
                SoLuong,
                ThamChieuID,
                GhiChu
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [rows[0].MaThuoc, MaLo, Loai, SoLuong, MaPX, GhiChu]);
    },

    upsertTransferLot: async ({ sourceLot, MaKhoNhan, SoLuong, MaPX, connection }) => {
        const [existing] = await connection.query(`
            SELECT MaLo
            FROM LoThuoc
            WHERE MaThuoc = ?
              AND SoLo = ?
              AND MaKho = ?
              AND COALESCE(TrangThai, 'ConHan') != 'DaHuy'
            LIMIT 1
            FOR UPDATE
        `, [sourceLot.MaThuoc, sourceLot.SoLo, MaKhoNhan]);

        if (existing.length) {
            await connection.query(`
                UPDATE LoThuoc
                SET SoLuongNhap = COALESCE(SoLuongNhap, 0) + ?,
                    GiaNhap = ?,
                    HanSuDung = ?,
                    NgaySanXuat = ?,
                    MaNCC = COALESCE(?, MaNCC)
                WHERE MaLo = ?
            `, [SoLuong, sourceLot.GiaNhap || 0, sourceLot.HanSuDung, sourceLot.NgaySanXuat, sourceLot.MaNCC || null, existing[0].MaLo]);
            return existing[0].MaLo;
        }

        const [created] = await connection.query(`
            INSERT INTO LoThuoc (
                MaThuoc, SoLo, HanSuDung, GiaNhap, MaCTPN,
                NgaySanXuat, NhietDoBaoQuan, TrangThai,
                SoLuongNhap, SoLuongDaXuat, GhiChu, MaKho, MaNCC
            )
            VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [
            sourceLot.MaThuoc,
            sourceLot.SoLo,
            sourceLot.HanSuDung,
            sourceLot.GiaNhap || 0,
            sourceLot.NgaySanXuat,
            sourceLot.NhietDoBaoQuan || null,
            sourceLot.TrangThai || "ConHan",
            SoLuong,
            `Điều chuyển từ phiếu xuất #${MaPX}`,
            MaKhoNhan,
            sourceLot.MaNCC || null
        ]);

        return created.insertId;
    },
        completeDraftHeader: async ({ MaPX, TongTien, noteData, connection }) => {
            await connection.query(`
                UPDATE PhieuXuatThuoc
                SET TrangThai = 'HoanThanh',
                    MaNhanVienXuat = COALESCE(MaNhanVienXuat, MaNhanVien),
                    GhiChu = ?,
                    TongTien = ?
                WHERE MaPX = ?
            `, [JSON.stringify(noteData), TongTien || 0, MaPX]);
        },

    markPrescriptionExported: async ({ MaDT, connection }) => {
        await connection.query(`
            UPDATE DonThuoc
            SET TrangThai = 'DaXuat'
            WHERE MaDT = ?
        `, [MaDT]);
    },

    supportsPartialPrescriptionStatus: async ({ connection = db }) => {
        const [rows] = await connection.query(`
            SELECT COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'DonThuoc'
              AND COLUMN_NAME = 'TrangThai'
            LIMIT 1
        `);
        return String(rows[0]?.COLUMN_TYPE || "").includes("XuatMotPhan");
    },

    markPrescriptionPartiallyExported: async ({ MaDT, connection }) => {
        await connection.query(`
            UPDATE DonThuoc
            SET TrangThai = 'XuatMotPhan'
            WHERE MaDT = ?
        `, [MaDT]);
    }
};

export default DispenseModel;
