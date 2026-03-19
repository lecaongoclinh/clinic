import MedicalRecordsService from '../services/medicalRecordsService.js';

class MedicalRecordsController {
    // Lấy danh sách bệnh nhân đã khám theo khoa
    static async getPatientsBySpecialty(req, res) {
        try {
            const { maChuyenKhoa, tenBN, fromDate, toDate, page = 1, limit = 10 } = req.query;

            if (!maChuyenKhoa) {
                return res.status(400).json({ error: 'Vui lòng chọn chuyên khoa' });
            }

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const result = await MedicalRecordsService.getPatientsBySpecialty(maChuyenKhoa, tenBN, fromDate, toDate, limitNum, offset);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getPatientsBySpecialty:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Lấy chi tiết các lần khám của bệnh nhân
    static async getMedicalHistory(req, res) {
        try {
            const { maBN } = req.params;

            if (!maBN) {
                return res.status(400).json({ error: 'Mã bệnh nhân không hợp lệ' });
            }

            const result = await MedicalRecordsService.getMedicalHistory(maBN);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getMedicalHistory:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Lấy chi tiết bệnh án
    static async getMedicalRecordDetail(req, res) {
        try {
            const { maBA } = req.params;

            if (!maBA) {
                return res.status(400).json({ error: 'Mã bệnh án không hợp lệ' });
            }

            const result = await MedicalRecordsService.getMedicalRecordDetail(maBA);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getMedicalRecordDetail:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Cập nhật bệnh án
    static async updateMedicalRecord(req, res) {
        try {
            const { maBA } = req.params;
            const { trieuChung, chuanDoan, ghiChu } = req.body;

            if (!maBA) {
                return res.status(400).json({ error: 'Mã bệnh án không hợp lệ' });
            }

            const result = await MedicalRecordsService.updateMedicalRecord(maBA, {
                trieuChung,
                chuanDoan,
                ghiChu
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({ message: result.message });
        } catch (error) {
            console.error('Lỗi updateMedicalRecord:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Tạo bệnh án mới
    static async createMedicalRecord(req, res) {
        try {
            const { maPK, maBacSi, trieuChung, chuanDoan, ghiChu } = req.body;

            if (!maPK || !maBacSi) {
                return res.status(400).json({ error: 'Thông tin không hợp lệ' });
            }

            const result = await MedicalRecordsService.createMedicalRecord(maPK, maBacSi, {
                trieuChung,
                chuanDoan,
                ghiChu
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({ message: result.message, data: result.data });
        } catch (error) {
            console.error('Lỗi createMedicalRecord:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Lấy danh sách chuyên khoa
    static async getAllSpecialties(req, res) {
        try {
            const result = await MedicalRecordsService.getAllSpecialties();

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getAllSpecialties:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }

    // Lấy tất cả bệnh nhân đã khám
    static async getAllPatientsWithRecords(req, res) {
        try {
            const { tenBN, fromDate, toDate, page = 1, limit = 10 } = req.query;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const result = await MedicalRecordsService.getAllPatientsWithRecords(tenBN, fromDate, toDate, limitNum, offset);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getAllPatientsWithRecords:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
}

export default MedicalRecordsController;
