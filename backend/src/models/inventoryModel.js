import db from "../config/db.js";

const STOCK_EXPR = "GREATEST(COALESCE(l.SoLuongNhap,0) - COALESCE(l.SoLuongDaXuat,0), 0)";
const ACTIVE_LOT_CONDITION = "COALESCE(l.TrangThai, '') != 'DaHuy'";

function buildInventoryFilters(filters = {}) {
    let where = ` WHERE ${ACTIVE_LOT_CONDITION}`;
    const params = [];

    if (filters.MaKho) {
        where += " AND l.MaKho = ?";
        params.push(filters.MaKho);
    }

    if (filters.MaNCC) {
        where += " AND l.MaNCC = ?";
        params.push(filters.MaNCC);
    }

    if (filters.TrangThai) {
        where += " AND l.TrangThai = ?";
        params.push(filters.TrangThai);
    }

    if (filters.search) {
        where += `
            AND (
                t.TenThuoc LIKE ?
                OR t.HoatChat LIKE ?
                OR l.SoLo LIKE ?
            )
        `;
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword);
    }

    where += ` AND ${STOCK_EXPR} > 0`;

    return { where, params };
}

function getMovementQuantity(row) {
    const qty = Number(row.SoLuong) || 0;

    if (row.Loai === "Nhap") return qty;
    if (row.Loai === "KiemKe") return qty;
    return -qty;
}

const InventoryModel = {
    getAll: async (filters = {}) => {
        const { where, params } = buildInventoryFilters(filters);
        const [rows] = await db.query(`
            SELECT
                l.MaLo,
                l.MaThuoc,
                t.TenThuoc,
                t.HoatChat,
                l.SoLo,
                l.NgaySanXuat,
                l.HanSuDung,
                ${STOCK_EXPR} AS Ton,
                l.GiaNhap,
                l.GhiChu,
                k.TenKho,
                ncc.TenNCC,
                l.TrangThai
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            ${where}
            ORDER BY l.HanSuDung ASC, l.MaLo DESC
        `, params);

        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT
                l.MaLo,
                l.MaThuoc,
                l.SoLo,
                l.NgaySanXuat,
                l.HanSuDung,
                ${STOCK_EXPR} AS Ton,
                l.GiaNhap,
                l.NhietDoBaoQuan,
                l.GhiChu,
                l.TrangThai,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.QuyCachDongGoi AS QuyCach,
                t.HangSanXuat AS NhaSanXuat,
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

    getHistoryByLot: async (id) => {
        const [rows] = await db.query(`
            SELECT
                ls.MaLS,
                ls.ThoiGian AS Ngay,
                ls.Loai,
                ls.SoLuong,
                ls.GhiChu,
                CASE
                    WHEN ls.Loai = 'Nhap' THEN CONCAT('PN-', pn.MaPN)
                    WHEN ls.Loai = 'Xuat' THEN CONCAT('PX-', px.MaPX)
                    WHEN ls.Loai = 'Huy' THEN CONCAT('HUY-', huy.MaHuy)
                    WHEN ls.Loai = 'KiemKe' THEN CONCAT('KK-', kk.MaKK)
                    ELSE CONCAT('LS-', ls.MaLS)
                END AS SoChungTu,
                CASE
                    WHEN ls.Loai = 'Nhap' THEN CONCAT('Nh?p hàng', CASE WHEN ncc.TenNCC IS NOT NULL THEN CONCAT(' t? ', ncc.TenNCC) ELSE '' END)
                    WHEN ls.Loai = 'Xuat' THEN 'Xu?t kho'
                    WHEN ls.Loai = 'Huy' THEN CONCAT('Xu?t h?y', CASE WHEN huy.LyDo IS NOT NULL THEN CONCAT(' - ', huy.LyDo) ELSE '' END)
                    WHEN ls.Loai = 'KiemKe' THEN 'Ði?u ch?nh ki?m kê'
                    ELSE 'Bi?n d?ng kho'
                END AS DienGiai
            FROM LichSuKho ls
            LEFT JOIN PhieuNhapThuoc pn ON ls.Loai = 'Nhap' AND pn.MaPN = ls.ThamChieuID
            LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
            LEFT JOIN PhieuXuatThuoc px ON ls.Loai = 'Xuat' AND px.MaPX = ls.ThamChieuID
            LEFT JOIN PhieuHuyThuoc huy ON ls.Loai = 'Huy' AND huy.MaHuy = ls.ThamChieuID
            LEFT JOIN PhieuKiemKe kk ON ls.Loai = 'KiemKe' AND kk.MaKK = ls.ThamChieuID
            WHERE ls.MaLo = ?
            ORDER BY ls.ThoiGian DESC, ls.MaLS DESC
        `, [id]);

        return rows;
    },

    getWarnings: async ({ minStock = 10 } = {}) => {
        const [expired] = await db.query(`
            SELECT l.MaLo, t.TenThuoc, l.SoLo, l.HanSuDung, ${STOCK_EXPR} AS Ton, k.TenKho, ncc.TenNCC
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN NhaCungCap ncc ON l.MaNCC = ncc.MaNCC
            WHERE ${ACTIVE_LOT_CONDITION}
              AND ${STOCK_EXPR} > 0
              AND l.HanSuDung <= CURDATE()
            ORDER BY l.HanSuDung ASC, l.MaLo DESC
        `);

        const [nearExpiry] = await db.query(`
            SELECT
                l.MaLo,
                t.TenThuoc,
                l.SoLo,
                l.HanSuDung,
                ${STOCK_EXPR} AS Ton,
                k.TenKho,
                DATEDIFF(l.HanSuDung, CURDATE()) AS ConLaiNgay
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            WHERE ${ACTIVE_LOT_CONDITION}
              AND ${STOCK_EXPR} > 0
              AND l.HanSuDung > CURDATE()
              AND l.HanSuDung <= DATE_ADD(CURDATE(), INTERVAL 9 MONTH)
            ORDER BY l.HanSuDung ASC, l.MaLo DESC
        `);

        const [lowStock] = await db.query(`
            SELECT
                t.MaThuoc,
                t.TenThuoc,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon,
                ? AS DinhMucToiThieu
            FROM Thuoc t
            LEFT JOIN LoThuoc l ON t.MaThuoc = l.MaThuoc AND ${ACTIVE_LOT_CONDITION}
            GROUP BY t.MaThuoc, t.TenThuoc
            HAVING TongTon < ?
            ORDER BY TongTon ASC, t.TenThuoc ASC
        `, [Number(minStock) || 10, Number(minStock) || 10]);

        const [recalled] = await db.query(`
            SELECT
                l.MaLo,
                t.TenThuoc,
                l.SoLo,
                huy.NgayHuy,
                huy.SoLuong,
                huy.LyDo,
                k.TenKho
            FROM PhieuHuyThuoc huy
            JOIN LoThuoc l ON huy.MaLo = l.MaLo
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            WHERE LOWER(COALESCE(huy.LyDo, '')) LIKE '%thu%'
               OR LOWER(COALESCE(huy.LyDo, '')) LIKE '%dinh%'
            ORDER BY huy.NgayHuy DESC, huy.MaHuy DESC
        `);

        return {
            expired,
            near3Months: nearExpiry.filter(item => Number(item.ConLaiNgay) <= 90),
            near6Months: nearExpiry.filter(item => Number(item.ConLaiNgay) <= 180),
            near9Months: nearExpiry,
            lowStock,
            recalled,
            minStock: Number(minStock) || 10
        };
    },

    getStockCard: async (filters = {}) => {
        const dateFrom = filters.dateFrom || null;
        const dateTo = filters.dateTo || null;
        const baseConditions = [];
        const baseParams = [];

        if (filters.MaThuoc) {
            baseConditions.push("ls.MaThuoc = ?");
            baseParams.push(filters.MaThuoc);
        }

        if (filters.MaKho) {
            baseConditions.push("l.MaKho = ?");
            baseParams.push(filters.MaKho);
        }

        const baseWhere = baseConditions.length ? `WHERE ${baseConditions.join(" AND ")}` : "";

        const openingConditions = [...baseConditions];
        const openingParams = [...baseParams];
        if (dateFrom) {
            openingConditions.push("ls.ThoiGian < ?");
            openingParams.push(dateFrom);
        }

        const openingWhere = openingConditions.length ? `WHERE ${openingConditions.join(" AND ")}` : "";
        const [openingRows] = await db.query(`
            SELECT ls.Loai, ls.SoLuong
            FROM LichSuKho ls
            LEFT JOIN LoThuoc l ON ls.MaLo = l.MaLo
            ${openingWhere}
            ORDER BY ls.ThoiGian ASC, ls.MaLS ASC
        `, openingParams);

        let openingBalance = 0;
        openingRows.forEach(row => {
            openingBalance += getMovementQuantity(row);
        });

        const detailConditions = [...baseConditions];
        const detailParams = [...baseParams];
        if (dateFrom) {
            detailConditions.push("ls.ThoiGian >= ?");
            detailParams.push(dateFrom);
        }
        if (dateTo) {
            detailConditions.push("ls.ThoiGian <= DATE_ADD(?, INTERVAL 1 DAY)");
            detailParams.push(dateTo);
        }

        const detailWhere = detailConditions.length ? `WHERE ${detailConditions.join(" AND ")}` : "";
        const [rows] = await db.query(`
            SELECT
                ls.MaLS,
                ls.ThoiGian AS NgayThang,
                ls.Loai,
                ls.SoLuong,
                ls.GhiChu,
                ls.MaThuoc,
                t.TenThuoc,
                k.TenKho,
                CASE
                    WHEN ls.Loai = 'Nhap' THEN CONCAT('PN-', pn.MaPN)
                    WHEN ls.Loai = 'Xuat' THEN CONCAT('PX-', px.MaPX)
                    WHEN ls.Loai = 'Huy' THEN CONCAT('HUY-', huy.MaHuy)
                    WHEN ls.Loai = 'KiemKe' THEN CONCAT('KK-', kk.MaKK)
                    ELSE CONCAT('LS-', ls.MaLS)
                END AS SoChungTu,
                CASE
                    WHEN ls.Loai = 'Nhap' THEN CONCAT('Nh?p hàng', CASE WHEN ncc.TenNCC IS NOT NULL THEN CONCAT(' t? ', ncc.TenNCC) ELSE '' END)
                    WHEN ls.Loai = 'Xuat' THEN 'Xu?t kho cho b?nh nhân / c?p phát'
                    WHEN ls.Loai = 'Huy' THEN CONCAT('Xu?t h?y', CASE WHEN huy.LyDo IS NOT NULL THEN CONCAT(' - ', huy.LyDo) ELSE '' END)
                    WHEN ls.Loai = 'KiemKe' THEN CONCAT('Ði?u ch?nh ki?m kê', CASE WHEN ls.GhiChu IS NOT NULL THEN CONCAT(' - ', ls.GhiChu) ELSE '' END)
                    ELSE 'Bi?n d?ng kho'
                END AS DienGiai
            FROM LichSuKho ls
            LEFT JOIN Thuoc t ON ls.MaThuoc = t.MaThuoc
            LEFT JOIN LoThuoc l ON ls.MaLo = l.MaLo
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            LEFT JOIN PhieuNhapThuoc pn ON ls.Loai = 'Nhap' AND pn.MaPN = ls.ThamChieuID
            LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
            LEFT JOIN PhieuXuatThuoc px ON ls.Loai = 'Xuat' AND px.MaPX = ls.ThamChieuID
            LEFT JOIN PhieuHuyThuoc huy ON ls.Loai = 'Huy' AND huy.MaHuy = ls.ThamChieuID
            LEFT JOIN PhieuKiemKe kk ON ls.Loai = 'KiemKe' AND kk.MaKK = ls.ThamChieuID
            ${detailWhere}
            ORDER BY ls.ThoiGian ASC, ls.MaLS ASC
        `, detailParams);

        let running = openingBalance;
        return rows.map(row => {
            const delta = getMovementQuantity(row);
            const nhap = delta > 0 ? delta : 0;
            const xuat = delta < 0 ? Math.abs(delta) : 0;
            running += delta;

            return {
                ...row,
                SoLuongNhap: nhap,
                SoLuongXuat: xuat,
                TonCuoiKy: running
            };
        });
    },

    getAuditHistory: async (filters = {}) => {
        const conditions = [];
        const params = [];

        if (filters.MaKho) {
            conditions.push("kk.MaKho = ?");
            params.push(filters.MaKho);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const [rows] = await db.query(`
            SELECT
                kk.MaKK,
                kk.NgayKiemKe,
                kk.TrangThai,
                k.TenKho,
                nv.HoTen AS NguoiKiem,
                COUNT(ct.MaCTKK) AS SoDong,
                COALESCE(SUM(ABS(ct.ChenhLech)), 0) AS TongChenhLech,
                CASE
                    WHEN COALESCE(SUM(ABS(ct.ChenhLech)), 0) = 0 THEN 'CanBang'
                    ELSE 'Lech'
                END AS KetQua
            FROM PhieuKiemKe kk
            LEFT JOIN Kho k ON kk.MaKho = k.MaKho
            LEFT JOIN NhanVien nv ON kk.MaNhanVien = nv.MaNV
            LEFT JOIN ChiTietKiemKe ct ON kk.MaKK = ct.MaKK
            ${where}
            GROUP BY kk.MaKK, kk.NgayKiemKe, kk.TrangThai, k.TenKho, nv.HoTen
            ORDER BY kk.NgayKiemKe DESC, kk.MaKK DESC
        `, params);

        return rows;
    },

    getAuditDetails: async (id) => {
        const [rows] = await db.query(`
            SELECT
                ct.MaCTKK,
                ct.MaLo,
                l.SoLo,
                t.TenThuoc,
                ct.SoLuongHeThong,
                ct.SoLuongThucTe,
                ct.ChenhLech,
                ct.LyDo
            FROM ChiTietKiemKe ct
            JOIN LoThuoc l ON ct.MaLo = l.MaLo
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            WHERE ct.MaKK = ?
            ORDER BY t.TenThuoc ASC, l.SoLo ASC
        `, [id]);

        return rows;
    },

    getAuditTemplate: async (filters = {}) => {
        const conditions = [`${ACTIVE_LOT_CONDITION}`, `${STOCK_EXPR} > 0`];
        const params = [];

        if (filters.MaKho) {
            conditions.push("l.MaKho = ?");
            params.push(filters.MaKho);
        }

        const [rows] = await db.query(`
            SELECT
                l.MaLo,
                l.MaThuoc,
                t.TenThuoc,
                l.SoLo,
                ${STOCK_EXPR} AS TonHeThong,
                k.TenKho
            FROM LoThuoc l
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            WHERE ${conditions.join(" AND ")}
            ORDER BY t.TenThuoc ASC, l.HanSuDung ASC, l.MaLo DESC
        `, params);

        return rows;
    },

    createAudit: async ({ MaKho = null, MaNhanVien = null, details = [] }) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [auditResult] = await connection.query(`
                INSERT INTO PhieuKiemKe (MaKho, MaNhanVien, TrangThai)
                VALUES (?, ?, 'Nhap')
            `, [MaKho || null, MaNhanVien || null]);

            const MaKK = auditResult.insertId;

            for (const item of details) {
                const [lotRows] = await connection.query(`
                    SELECT ${STOCK_EXPR} AS TonHeThong
                    FROM LoThuoc l
                    WHERE l.MaLo = ?
                    LIMIT 1
                `, [item.MaLo]);

                if (!lotRows.length) continue;

                const systemQty = Number(lotRows[0].TonHeThong) || 0;
                const actualQty = Number(item.SoLuongThucTe) || 0;
                const diff = actualQty - systemQty;

                await connection.query(`
                    INSERT INTO ChiTietKiemKe
                    (MaKK, MaLo, SoLuongHeThong, SoLuongThucTe, ChenhLech, LyDo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [MaKK, item.MaLo, systemQty, actualQty, diff, item.LyDo || null]);
            }

            await connection.commit();
            connection.release();
            return { MaKK };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    balanceAudit: async (id) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [auditRows] = await connection.query(`
                SELECT TrangThai
                FROM PhieuKiemKe
                WHERE MaKK = ?
                LIMIT 1
            `, [id]);

            if (!auditRows.length) {
                throw new Error("Không tìm th?y phi?u ki?m kê");
            }

            if (auditRows[0].TrangThai === "DaDuyet") {
                throw new Error("Phi?u ki?m kê dã du?c cân b?ng tru?c dó");
            }

            const [detailRows] = await connection.query(`
                SELECT ct.MaLo, ct.SoLuongThucTe, ct.ChenhLech, ct.LyDo, l.MaThuoc, COALESCE(l.SoLuongDaXuat, 0) AS SoLuongDaXuat
                FROM ChiTietKiemKe ct
                JOIN LoThuoc l ON ct.MaLo = l.MaLo
                WHERE ct.MaKK = ?
            `, [id]);

            for (const row of detailRows) {
                const actualQty = Number(row.SoLuongThucTe) || 0;
                const diff = Number(row.ChenhLech) || 0;
                const exportedQty = Number(row.SoLuongDaXuat) || 0;

                await connection.query(`
                    UPDATE LoThuoc
                    SET SoLuongNhap = ?, TrangThai = CASE WHEN ? = 0 THEN TrangThai ELSE TrangThai END
                    WHERE MaLo = ?
                `, [exportedQty + actualQty, actualQty, row.MaLo]);

                if (diff !== 0) {
                    await connection.query(`
                        INSERT INTO LichSuKho (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                        VALUES (?, ?, 'KiemKe', ?, ?, ?)
                    `, [row.MaThuoc, row.MaLo, diff, id, row.LyDo || 'Cân b?ng kho t? phi?u ki?m kê']);
                }
            }

            await connection.query(`
                UPDATE PhieuKiemKe
                SET TrangThai = 'DaDuyet'
                WHERE MaKK = ?
            `, [id]);

            await connection.commit();
            connection.release();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    transferLot: async ({ MaLo, MaKhoMoi, SoLuong }) => {
        const [lotRows] = await db.query(`
            SELECT
                GREATEST(COALESCE(SoLuongNhap, 0) - COALESCE(SoLuongDaXuat, 0), 0) AS Ton
            FROM LoThuoc
            WHERE MaLo = ?
            LIMIT 1
        `, [MaLo]);

        if (!lotRows.length) {
            throw new Error("Khong tim thay lo thuoc can dieu chuyen");
        }

        const currentStock = Number(lotRows[0].Ton) || 0;
        const transferQty = Number(SoLuong) || 0;

        if (transferQty <= 0) {
            throw new Error("So luong dieu chuyen phai lon hon 0");
        }

        if (transferQty > currentStock) {
            throw new Error("So luong dieu chuyen khong duoc vuot qua ton hien tai");
        }

        if (transferQty !== currentStock) {
            throw new Error("Hien tai chi ho tro dieu chuyen toan bo so luong con ton cua lo");
        }

        const [rows] = await db.query(`
            UPDATE LoThuoc
            SET MaKho = ?
            WHERE MaLo = ?
        `, [MaKhoMoi, MaLo]);

        return rows;
    },

    deleteLot: async ({ MaLo, SoLuong, LyDo, MaNhanVien = null }) => {
        const [result] = await db.query(`
            INSERT INTO PhieuHuyThuoc (MaLo, SoLuong, LyDo, MaNhanVien)
            VALUES (?, ?, ?, ?)
        `, [MaLo, SoLuong, LyDo || null, MaNhanVien]);

        return result;
    }
};

export default InventoryModel;

