import Patient from '../models/patientModel.js';

const patientController = {
    list: async (req, res) => {
        try {
            const search = String(req.query.search || req.query.keyword || '').trim();
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const offset = (page - 1) * limit;

            const result = await Patient.list({ search, limit, offset });
            res.json({
                data: result.data,
                total: result.total,
                page,
                limit
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Tìm kiếm bệnh nhân
    searchByName: async (req, res) => {
        try {
            const tenBN = String(req.query.tenBN || req.query.keyword || '').trim();
            
            if (!tenBN) {
                return res.status(400).json({ message: 'Vui lòng nhập tên bệnh nhân' });
            }

            const patients = await Patient.searchByName(tenBN);
            res.json(patients);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Lấy thông tin bệnh nhân
    getById: async (req, res) => {
        try {
            const { maBN } = req.params;
            const patient = await Patient.getById(maBN);
            
            if (!patient) {
                return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
            }

            res.json(patient);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Tạo bệnh nhân mới
    create: async (req, res) => {
        try {
            const maBN = String(req.body.maBN ?? req.body.MaBN ?? '').trim();
            const hoTen = String(req.body.hoTen ?? req.body.HoTen ?? '').trim();
            const soDienThoai = String(req.body.soDienThoai ?? req.body.SoDienThoai ?? '').trim();
            const diaChi = String(req.body.diaChi ?? req.body.DiaChi ?? '').trim();
            const ngaySinh = req.body.ngaySinh ?? req.body.NgaySinh ?? '';
            const gioiTinh = String(req.body.gioiTinh ?? req.body.GioiTinh ?? '').trim();

            if (!maBN || !hoTen || !soDienThoai || !diaChi || !ngaySinh || !gioiTinh) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bệnh nhân' });
            }

            const createdMaBN = await Patient.create(maBN, hoTen, soDienThoai, diaChi, ngaySinh, gioiTinh);
            res.status(201).json({ 
                message: 'Tạo bệnh nhân thành công',
                maBN: createdMaBN,
                hoTen: hoTen
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Ma benh nhan hoac so dien thoai da ton tai' });
            }
            res.status(500).json({ message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { maBN } = req.params;
            const patient = {
                HoTen: String(req.body.HoTen ?? req.body.hoTen ?? '').trim(),
                SoDienThoai: String(req.body.SoDienThoai ?? req.body.soDienThoai ?? '').trim(),
                DiaChi: String(req.body.DiaChi ?? req.body.diaChi ?? '').trim(),
                NgaySinh: req.body.NgaySinh ?? req.body.ngaySinh ?? null,
                GioiTinh: String(req.body.GioiTinh ?? req.body.gioiTinh ?? '').trim(),
                Email: String(req.body.Email ?? req.body.email ?? '').trim()
            };

            if (!patient.HoTen || !patient.SoDienThoai || !patient.DiaChi || !patient.NgaySinh || !patient.GioiTinh) {
                return res.status(400).json({ message: 'Vui long nhap day du ho ten, ngay sinh, gioi tinh, so dien thoai va dia chi' });
            }

            const affectedRows = await Patient.update(maBN, patient);
            if (!affectedRows) {
                return res.status(404).json({ message: 'Khong tim thay benh nhan' });
            }

            res.json({ message: 'Cap nhat benh nhan thanh cong' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Thong tin duy nhat da ton tai' });
            }
            res.status(500).json({ message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const { maBN } = req.params;
            const affectedRows = await Patient.delete(maBN);
            if (!affectedRows) {
                return res.status(404).json({ message: 'Khong tim thay benh nhan' });
            }

            res.json({ message: 'Xoa benh nhan thanh cong' });
        } catch (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ message: 'Benh nhan da co du lieu lien quan, khong the xoa' });
            }
            res.status(500).json({ message: error.message });
        }
    }
};

export default patientController;
