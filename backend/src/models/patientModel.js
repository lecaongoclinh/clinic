import db from '../config/db.js';

const Patient = {
    list: async ({ search = '', limit = 100, offset = 0 } = {}) => {
        const keyword = `%${search}%`;
        const params = [];
        let where = '';

        if (search) {
            where = `
                WHERE CAST(MaBN AS CHAR) LIKE ?
                   OR HoTen LIKE ?
                   OR SoDienThoai LIKE ?
            `;
            params.push(keyword, keyword, keyword);
        }

        const countQuery = `SELECT COUNT(*) AS total FROM BenhNhan ${where}`;
        const [countRows] = await db.execute(countQuery, params);

        const query = `
            SELECT MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh, GioiTinh, Email
            FROM BenhNhan
            ${where}
            ORDER BY MaBN DESC
            LIMIT ? OFFSET ?
        `;
        const safeLimit = Number(limit);
        const safeOffset = Number(offset);
        const [rows] = await db.query(query, [...params, safeLimit, safeOffset]);
        return {
            data: rows,
            total: countRows[0]?.total || 0
        };
    },

    // Tìm kiếm bệnh nhân theo tên
    searchByName: async (tenBN) => {
        const query = `
            SELECT MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh
            FROM BenhNhan
            WHERE HoTen LIKE ?
            LIMIT 10
        `;
        const [rows] = await db.execute(query, [`%${tenBN}%`]);
        return rows;
    },

    // Lấy chi tiết bệnh nhân
    getById: async (maBN) => {
        const query = `
            SELECT MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh, GioiTinh, Email
            FROM BenhNhan
            WHERE MaBN = ?
        `;
        const [rows] = await db.execute(query, [maBN]);
        return rows[0];
    },

    // Tạo bệnh nhân mới
    create: async (maBN, hoTen, soDienThoai, diaChi, ngaySinh) => {
        const query = `
            INSERT INTO BenhNhan (MaBN, HoTen, SoDienThoai, DiaChi, NgaySinh)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.execute(query, [maBN, hoTen, soDienThoai, diaChi, ngaySinh]);
        return maBN;
    },

    update: async (maBN, patient) => {
        const query = `
            UPDATE BenhNhan
            SET HoTen = ?,
                SoDienThoai = ?,
                DiaChi = ?,
                NgaySinh = ?,
                GioiTinh = ?,
                Email = ?
            WHERE MaBN = ?
        `;
        const [result] = await db.execute(query, [
            patient.HoTen,
            patient.SoDienThoai,
            patient.DiaChi || null,
            patient.NgaySinh || null,
            patient.GioiTinh || null,
            patient.Email || null,
            maBN
        ]);
        return result.affectedRows;
    },

    delete: async (maBN) => {
        const [result] = await db.execute('DELETE FROM BenhNhan WHERE MaBN = ?', [maBN]);
        return result.affectedRows;
    }
};

export default Patient;
