import Patient from '../models/patientModel.js';

const patientController = {
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
            const { hoTen, soDienThoai, diaChi, ngaySinh } = req.body;

            if (!hoTen || !soDienThoai || !diaChi || !ngaySinh) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bệnh nhân' });
            }

            const maBN = await Patient.create(hoTen, soDienThoai, diaChi, ngaySinh);
            res.status(201).json({ 
                message: 'Tạo bệnh nhân thành công',
                maBN: maBN,
                hoTen: hoTen
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

export default patientController;
