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

    if (filters.LoaiKho) {
        where += " AND k.LoaiKho = ?";
        params.push(filters.LoaiKho);
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

function getStockCardBalanceKey(row) {
    return `${row.MaThuoc || ""}:${row.MaKho || ""}`;
}

function toDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function isLotActiveAtDate(lot, dateOnly) {
    if (!lot || !dateOnly) return false;
    if (!lot.HanSuDung) return true;
    return String(lot.HanSuDung).slice(0, 10) > dateOnly;
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
                l.MaKho,
                t.DonViCoBan,
                k.TenKho,
                k.LoaiKho,
                k.IsDispenseWarehouse,
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
                l.SoLuongNhap,
                l.SoLuongDaXuat,
                l.MaKho,
                t.TenThuoc,
                t.HoatChat,
                t.HamLuong,
                t.DangBaoChe,
                t.DonViCoBan,
                t.QuyCachDongGoi AS QuyCach,
                t.HangSanXuat AS NhaSanXuat,
                k.TenKho,
                k.LoaiKho,
                k.IsDispenseWarehouse,
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
                    WHEN pn.MaPN IS NOT NULL THEN CONCAT('PN-', pn.MaPN)
                    WHEN px.MaPX IS NOT NULL THEN CONCAT('PX-', px.MaPX)
                    WHEN huy.MaHuy IS NOT NULL THEN CONCAT('HUY-', huy.MaHuy)
                    WHEN kk.MaKK IS NOT NULL THEN CONCAT('KK-', kk.MaKK)
                    ELSE CONCAT('LS-', ls.MaLS)
                END AS SoChungTu,
                CASE
                    WHEN ls.Loai = 'KiemKe' AND ls.SoLuong < 0 THEN 'Điều chỉnh giảm kiểm kê'
                    WHEN ls.Loai = 'KiemKe' AND ls.SoLuong > 0 THEN 'Điều chỉnh tăng kiểm kê'
                    WHEN pn.LoaiPhieu = 'NhapMua' THEN CONCAT('Nhập mua', CASE WHEN ncc.TenNCC IS NOT NULL THEN CONCAT(' từ ', ncc.TenNCC) ELSE '' END)
                    WHEN pn.LoaiPhieu = 'NhapTra' THEN 'Nhập trả'
                    WHEN pn.LoaiPhieu = 'NhapKiemKe' THEN 'Nhập kiểm kê'
                    WHEN pn.LoaiPhieu = 'NhapVienTro' THEN 'Nhập viện trợ'
                    WHEN px.LoaiXuat = 'BanChoBN' THEN 'Cấp phát thuốc cho bệnh nhân'
                    WHEN px.LoaiXuat = 'DieuChuyenNoiBo' THEN 'Điều chuyển nội bộ'
                    WHEN px.LoaiXuat = 'TraNCC' THEN 'Trả nhà cung cấp'
                    WHEN px.LoaiXuat = 'XuatHuy' THEN 'Xuất hủy'
                    WHEN px.LoaiXuat = 'VienTro' THEN 'Xuất viện trợ'
                    WHEN px.LoaiXuat = 'XuatKiemKe' THEN 'Điều chỉnh giảm kiểm kê'
                    WHEN ls.Loai = 'Nhap' THEN 'Nhập kho'
                    WHEN ls.Loai = 'Xuat' THEN 'Xuất kho'
                    WHEN ls.Loai = 'Huy' THEN CONCAT('Xuất hủy', CASE WHEN huy.LyDo IS NOT NULL THEN CONCAT(' - ', huy.LyDo) ELSE '' END)
                    WHEN ls.Loai = 'KiemKe' THEN 'Điều chỉnh kiểm kê'
                    ELSE 'Biến động kho'
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

    getWarnings: async ({ minStock = 20 } = {}) => {
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
                l.MaKho,
                k.TenKho,
                k.LoaiKho,
                k.IsDispenseWarehouse,
                COALESCE(SUM(${STOCK_EXPR}), 0) AS TongTon,
                ? AS DinhMucToiThieu
            FROM Thuoc t
            LEFT JOIN LoThuoc l ON t.MaThuoc = l.MaThuoc AND ${ACTIVE_LOT_CONDITION}
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            GROUP BY t.MaThuoc, t.TenThuoc, l.MaKho, k.TenKho, k.LoaiKho, k.IsDispenseWarehouse
            HAVING TongTon < ?
            ORDER BY TongTon ASC, t.TenThuoc ASC
        `, [Number(minStock) || 20, Number(minStock) || 20]);

        const [recalled] = await db.query(`
            SELECT
                l.MaLo,
                t.TenThuoc,
                l.SoLo,
                px.NgayXuat AS NgayHuy,
                ct.SoLuong,
                COALESCE(px.LyDoHuy, px.GhiChu) AS LyDo,
                k.TenKho
            FROM PhieuXuatThuoc px
            JOIN ChiTietPhieuXuat ct ON px.MaPX = ct.MaPX
            JOIN LoThuoc l ON ct.MaLo = l.MaLo
            JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN Kho k ON l.MaKho = k.MaKho
            WHERE px.LoaiXuat = 'XuatHuy'
            ORDER BY px.NgayXuat DESC, px.MaPX DESC
        `);

        return {
            expired,
            near3Months: nearExpiry.filter(item => Number(item.ConLaiNgay) <= 90),
            near6Months: nearExpiry.filter(item => Number(item.ConLaiNgay) <= 180),
            near9Months: nearExpiry,
            lowStock,
            recalled,
            minStock: Number(minStock) || 20
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

        const lotConditions = [];
        const lotParams = [];
        if (filters.MaThuoc) {
            lotConditions.push("l.MaThuoc = ?");
            lotParams.push(filters.MaThuoc);
        }
        if (filters.MaKho) {
            lotConditions.push("l.MaKho = ?");
            lotParams.push(filters.MaKho);
        }

        const lotWhere = lotConditions.length ? `WHERE ${lotConditions.join(" AND ")}` : "";
        const [lotRows] = await db.query(`
            SELECT l.MaLo, l.HanSuDung, l.MaThuoc, l.MaKho
            FROM LoThuoc l
            ${lotWhere}
        `, lotParams);

        const lotMap = new Map();
        lotRows.forEach((lot) => {
            lotMap.set(Number(lot.MaLo), lot);
        });

        const lotBalances = new Map();
        if (dateFrom) {
            const openingConditions = [...baseConditions, "ls.ThoiGian < ?"];
            const openingParams = [...baseParams, dateFrom];
            const openingWhere = `WHERE ${openingConditions.join(" AND ")}`;
            const [openingRows] = await db.query(`
                SELECT ls.Loai, ls.SoLuong, ls.MaThuoc, ls.MaLo, l.MaKho
                FROM LichSuKho ls
                LEFT JOIN LoThuoc l ON ls.MaLo = l.MaLo
                ${openingWhere}
                ORDER BY ls.ThoiGian ASC, ls.MaLS ASC
            `, openingParams);

            openingRows.forEach(row => {
                const lotId = Number(row.MaLo);
                lotBalances.set(lotId, (lotBalances.get(lotId) || 0) + getMovementQuantity(row));
            });
        }

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
                ls.MaLo,
                l.MaKho,
                t.TenThuoc,
                k.TenKho,
                CASE
                    WHEN pn.MaPN IS NOT NULL THEN CONCAT('PN-', pn.MaPN)
                    WHEN px.MaPX IS NOT NULL THEN CONCAT('PX-', px.MaPX)
                    WHEN huy.MaHuy IS NOT NULL THEN CONCAT('HUY-', huy.MaHuy)
                    WHEN kk.MaKK IS NOT NULL THEN CONCAT('KK-', kk.MaKK)
                    ELSE CONCAT('LS-', ls.MaLS)
                END AS SoChungTu,
                CASE
                    WHEN ls.Loai = 'KiemKe' AND ls.SoLuong < 0 THEN 'Điều chỉnh giảm kiểm kê'
                    WHEN ls.Loai = 'KiemKe' AND ls.SoLuong > 0 THEN 'Điều chỉnh tăng kiểm kê'
                    WHEN pn.LoaiPhieu = 'NhapMua' THEN CONCAT('Nhập mua', CASE WHEN ncc.TenNCC IS NOT NULL THEN CONCAT(' từ ', ncc.TenNCC) ELSE '' END)
                    WHEN pn.LoaiPhieu = 'NhapTra' THEN 'Nhập trả'
                    WHEN pn.LoaiPhieu = 'NhapKiemKe' THEN 'Nhập kiểm kê'
                    WHEN pn.LoaiPhieu = 'NhapVienTro' THEN 'Nhập viện trợ'
                    WHEN px.LoaiXuat = 'BanChoBN' THEN 'Cấp phát thuốc cho bệnh nhân'
                    WHEN px.LoaiXuat = 'DieuChuyenNoiBo' THEN 'Điều chuyển nội bộ'
                    WHEN px.LoaiXuat = 'TraNCC' THEN 'Trả nhà cung cấp'
                    WHEN px.LoaiXuat = 'XuatHuy' THEN 'Xuất hủy'
                    WHEN px.LoaiXuat = 'VienTro' THEN 'Xuất viện trợ'
                    WHEN px.LoaiXuat = 'XuatKiemKe' THEN 'Điều chỉnh giảm kiểm kê'
                    WHEN ls.Loai = 'Nhap' THEN 'Nhập kho'
                    WHEN ls.Loai = 'Xuat' THEN 'Xuất kho'
                    WHEN ls.Loai = 'Huy' THEN CONCAT('Xuất hủy', CASE WHEN huy.LyDo IS NOT NULL THEN CONCAT(' - ', huy.LyDo) ELSE '' END)
                    WHEN ls.Loai = 'KiemKe' THEN CONCAT('Điều chỉnh kiểm kê', CASE WHEN ls.GhiChu IS NOT NULL THEN CONCAT(' - ', ls.GhiChu) ELSE '' END)
                    ELSE 'Biến động kho'
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

        return rows.map(row => {
            const lotId = Number(row.MaLo);
            const delta = getMovementQuantity(row);
            const nhap = delta > 0 ? delta : 0;
            const xuat = delta < 0 ? Math.abs(delta) : 0;
            lotBalances.set(lotId, (lotBalances.get(lotId) || 0) + delta);

            const movementDate = toDateOnly(row.NgayThang);
            let running = 0;

            lotBalances.forEach((qty, currentLotId) => {
                if (qty <= 0) return;
                const lot = lotMap.get(Number(currentLotId));
                if (isLotActiveAtDate(lot, movementDate)) {
                    running += qty;
                }
            });

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

            if (!MaKho) {
                throw new Error("Vui lòng chọn kho kiểm kê");
            }

            if (!Array.isArray(details) || !details.length) {
                throw new Error("Phiếu kiểm kê phải có ít nhất 1 dòng");
            }

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
                throw new Error("Không tìm thấy phiếu kiểm kê");
            }

            if (auditRows[0].TrangThai === "DaDuyet") {
                throw new Error("Phiếu kiểm kê đã được cân bằng trước đó");
            }

            const [detailRows] = await connection.query(`
                SELECT
                    ct.MaLo,
                    ct.SoLuongThucTe,
                    ct.ChenhLech,
                    ct.LyDo,
                    l.MaThuoc,
                    l.SoLo,
                    l.HanSuDung,
                    l.NgaySanXuat,
                    l.NhietDoBaoQuan,
                    l.TrangThai,
                    l.GiaNhap,
                    l.MaKho,
                    l.MaNCC,
                    ${STOCK_EXPR} AS TonHienTai
                FROM ChiTietKiemKe ct
                JOIN LoThuoc l ON ct.MaLo = l.MaLo
                WHERE ct.MaKK = ?
                FOR UPDATE
            `, [id]);

            for (const row of detailRows) {
                const diff = Number(row.ChenhLech) || 0;
                if (diff < 0) {
                    const qty = Math.abs(diff);
                    const currentStock = Number(row.TonHienTai) || 0;
                    if (qty > currentStock) {
                        throw new Error(`Số lượng giảm kiểm kê vượt tồn lô ${row.SoLo}`);
                    }
                    await connection.query(`
                        UPDATE LoThuoc
                        SET SoLuongDaXuat = COALESCE(SoLuongDaXuat, 0) + ?
                        WHERE MaLo = ?
                    `, [qty, row.MaLo]);
                    await connection.query(`
                        INSERT INTO LichSuKho (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                        VALUES (?, ?, 'KiemKe', ?, ?, ?)
                    `, [row.MaThuoc, row.MaLo, -qty, id, row.LyDo || 'Điều chỉnh giảm kiểm kê']);
                } else if (diff > 0) {
                    const adjustedLotNo = `${row.SoLo || row.MaLo}-KK${id}`;
                    const [created] = await connection.query(`
                        INSERT INTO LoThuoc (
                            MaThuoc, SoLo, HanSuDung, GiaNhap, MaCTPN,
                            NgaySanXuat, NhietDoBaoQuan, TrangThai,
                            SoLuongNhap, SoLuongDaXuat, GhiChu, MaKho, MaNCC
                        )
                        VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
                    `, [
                        row.MaThuoc,
                        adjustedLotNo,
                        row.HanSuDung,
                        row.GiaNhap || 0,
                        row.NgaySanXuat,
                        row.NhietDoBaoQuan || null,
                        row.TrangThai || "ConHan",
                        diff,
                        row.LyDo || `Điều chỉnh tăng kiểm kê từ phiếu KK-${id}`,
                        row.MaKho,
                        row.MaNCC || null
                    ]);
                    await connection.query(`
                        INSERT INTO LichSuKho (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                        VALUES (?, ?, 'KiemKe', ?, ?, ?)
                    `, [row.MaThuoc, created.insertId, diff, id, row.LyDo || 'Điều chỉnh tăng kiểm kê']);
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

    transferLot: async ({ MaLo, MaKhoMoi, SoLuong, LyDo = "", MaNhanVien = null }) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const qty = Number(SoLuong) || 0;
            if (!MaLo || !MaKhoMoi) throw new Error("Thiếu thông tin lô hoặc kho nhận");
            if (qty <= 0) throw new Error("Số lượng điều chuyển phải lớn hơn 0");

            const [lotRows] = await connection.query(`
                SELECT
                    l.*,
                    ${STOCK_EXPR} AS Ton
                FROM LoThuoc l
                WHERE l.MaLo = ?
                LIMIT 1
                FOR UPDATE
            `, [MaLo]);
            if (!lotRows.length) throw new Error("Không tìm thấy lô thuốc cần điều chuyển");

            const lot = lotRows[0];
            if (String(lot.MaKho) === String(MaKhoMoi)) throw new Error("Kho nhận phải khác kho nguồn");
            if (qty > Number(lot.Ton || 0)) throw new Error("Số lượng điều chuyển không được vượt tồn hiện tại");

            const noteData = {
                note: LyDo || "Điều chuyển nội bộ từ inventory",
                meta: { MaKhoNhan: MaKhoMoi, source: "inventory" },
                items: [{ MaLo, SoLuong: qty }]
            };
            const [px] = await connection.query(`
                INSERT INTO PhieuXuatThuoc (MaNhanVien, MaKho, LoaiXuat, NgayXuat, GhiChu, TrangThai, TongTien)
                VALUES (?, ?, 'DieuChuyenNoiBo', NOW(), ?, 'HoanThanh', 0)
            `, [MaNhanVien || null, lot.MaKho, JSON.stringify(noteData)]);
            const MaPX = px.insertId;

            await connection.query(`
                INSERT INTO ChiTietPhieuXuat (MaPX, MaLo, SoLuong, DonGia, ThanhTien)
                VALUES (?, ?, ?, ?, 0)
            `, [MaPX, MaLo, qty, lot.GiaNhap || 0]);

            await connection.query(`
                UPDATE LoThuoc
                SET SoLuongDaXuat = COALESCE(SoLuongDaXuat, 0) + ?
                WHERE MaLo = ?
            `, [qty, MaLo]);

            const [existing] = await connection.query(`
                SELECT MaLo
                FROM LoThuoc
                WHERE MaThuoc = ? AND SoLo = ? AND MaKho = ? AND COALESCE(TrangThai, 'ConHan') != 'DaHuy'
                LIMIT 1
                FOR UPDATE
            `, [lot.MaThuoc, lot.SoLo, MaKhoMoi]);

            let targetLotId;
            if (existing.length) {
                targetLotId = existing[0].MaLo;
                await connection.query(`
                    UPDATE LoThuoc
                    SET SoLuongNhap = COALESCE(SoLuongNhap, 0) + ?,
                        GiaNhap = ?,
                        HanSuDung = ?,
                        NgaySanXuat = ?,
                        MaNCC = COALESCE(?, MaNCC)
                    WHERE MaLo = ?
                `, [qty, lot.GiaNhap || 0, lot.HanSuDung, lot.NgaySanXuat, lot.MaNCC || null, targetLotId]);
            } else {
                const [created] = await connection.query(`
                    INSERT INTO LoThuoc (
                        MaThuoc, SoLo, HanSuDung, GiaNhap, MaCTPN,
                        NgaySanXuat, NhietDoBaoQuan, TrangThai,
                        SoLuongNhap, SoLuongDaXuat, GhiChu, MaKho, MaNCC
                    )
                    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
                `, [
                    lot.MaThuoc,
                    lot.SoLo,
                    lot.HanSuDung,
                    lot.GiaNhap || 0,
                    lot.NgaySanXuat,
                    lot.NhietDoBaoQuan || null,
                    lot.TrangThai || "ConHan",
                    qty,
                    `Điều chuyển từ phiếu xuất #${MaPX}`,
                    MaKhoMoi,
                    lot.MaNCC || null
                ]);
                targetLotId = created.insertId;
            }

            await connection.query(`
                INSERT INTO LichSuKho (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                VALUES (?, ?, 'Xuat', ?, ?, ?), (?, ?, 'Nhap', ?, ?, ?)
            `, [
                lot.MaThuoc, MaLo, qty, MaPX, LyDo || "Xuất điều chuyển nội bộ",
                lot.MaThuoc, targetLotId, qty, MaPX, LyDo || "Nhập điều chuyển nội bộ"
            ]);

            await connection.commit();
            return { MaPX, targetLotId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    deleteLot: async ({ MaLo, SoLuong, LyDo, MaNhanVien = null }) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const qty = Number(SoLuong) || 0;
            const reason = String(LyDo || "").trim();
            if (!MaLo) {
                throw new Error("Thiếu mã lô cần hủy");
            }
            if (qty <= 0) {
                throw new Error("Số lượng hủy phải lớn hơn 0");
            }
            if (!reason) {
                throw new Error("Vui lòng nhập lý do hủy thuốc");
            }

            const [lotRows] = await connection.query(`
                SELECT
                    MaThuoc,
                    ${STOCK_EXPR} AS Ton
                FROM LoThuoc l
                WHERE MaLo = ?
                LIMIT 1
                FOR UPDATE
            `, [MaLo]);

            if (!lotRows.length) {
                throw new Error("Không tìm thấy lô thuốc cần hủy");
            }

            const currentStock = Number(lotRows[0].Ton) || 0;
            if (qty > currentStock) {
                throw new Error("Số lượng hủy không được vượt quá tồn hiện tại");
            }

            const noteData = {
                note: reason,
                meta: { LyDo: reason, source: "inventory" },
                items: [{ MaLo, SoLuong: qty }]
            };
            const [result] = await connection.query(`
                INSERT INTO PhieuXuatThuoc (MaNhanVien, MaKho, LoaiXuat, NgayXuat, GhiChu, TrangThai, TongTien, LyDoHuy)
                SELECT ?, MaKho, 'XuatHuy', NOW(), ?, 'HoanThanh', 0, ?
                FROM LoThuoc
                WHERE MaLo = ?
            `, [MaNhanVien, JSON.stringify(noteData), reason, MaLo]);
            const MaPX = result.insertId;

            await connection.query(`
                INSERT INTO ChiTietPhieuXuat (MaPX, MaLo, SoLuong, DonGia, ThanhTien)
                SELECT ?, ?, ?, COALESCE(GiaNhap, 0), 0
                FROM LoThuoc
                WHERE MaLo = ?
            `, [MaPX, MaLo, qty, MaLo]);

            await connection.query(`
                UPDATE LoThuoc
                SET SoLuongDaXuat = COALESCE(SoLuongDaXuat, 0) + ?,
                    TrangThai = CASE
                        WHEN GREATEST(COALESCE(SoLuongNhap, 0) - (COALESCE(SoLuongDaXuat, 0) + ?), 0) = 0 THEN 'DaHuy'
                        ELSE TrangThai
                    END
                WHERE MaLo = ?
            `, [qty, qty, MaLo]);

            await connection.query(`
                INSERT INTO LichSuKho (MaThuoc, MaLo, Loai, SoLuong, ThamChieuID, GhiChu)
                VALUES (?, ?, 'Xuat', ?, ?, ?)
            `, [lotRows[0].MaThuoc, MaLo, qty, MaPX, `Xuất hủy - ${reason}`]);

            await connection.commit();
            return { MaPX };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

export default InventoryModel;

