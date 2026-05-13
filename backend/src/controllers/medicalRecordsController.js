import MedicalRecordsService from '../services/medicalRecordsService.js';

class MedicalRecordsController {
    static async getMedicalRecords(req, res) {
        try {
            const { tenBN, fromDate, toDate, page = 1, limit = 10 } = req.query;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const result = await MedicalRecordsService.getMedicalRecords(tenBN, fromDate, toDate, limitNum, offset);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getMedicalRecords:', error);
            res.status(500).json({ error: 'Không thể tải bệnh án' });
        }
    }

    static async getEligibleExamTickets(req, res) {
        try {
            const { maBacSi, tenBN, date, page = 1, limit = 20 } = req.query;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 20);
            const offset = (pageNum - 1) * limitNum;

            const result = await MedicalRecordsService.getEligibleExamTickets({
                maBacSi,
                tenBN,
                date,
                limit: limitNum,
                offset
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getEligibleExamTickets:', error);
            res.status(500).json({ error: 'Không thể tải danh sách phiếu khám' });
        }
    }

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

    static async getMedicalHistoryByPatient(req, res) {
        try {
            const { patientId } = req.params;

            if (!patientId) {
                return res.status(400).json({ error: 'Mã bệnh nhân không hợp lệ' });
            }

            const result = await MedicalRecordsService.getMedicalHistory(patientId);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Lỗi getMedicalHistoryByPatient:', error);
            res.status(500).json({ error: 'Không thể tải lịch sử bệnh án' });
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

    static async getExamWorkspace(req, res) {
        try {
            const { maPK } = req.params;
            const result = await MedicalRecordsService.getExamWorkspace(maPK);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json(result.data);
        } catch (error) {
            console.error('Loi getExamWorkspace:', error);
            res.status(500).json({ error: 'Khong the tai du lieu kham benh' });
        }
    }

    // Cập nhật bệnh án
    static async updateMedicalRecord(req, res) {
        try {
            const { maBA } = req.params;
            const { trieuChung, chuanDoan, ghiChu, maBacSi } = req.body;
            const currentDoctorId = req.user?.id || maBacSi;

            if (!maBA) {
                return res.status(400).json({ error: 'Mã bệnh án không hợp lệ' });
            }

            const result = await MedicalRecordsService.updateMedicalRecord(maBA, {
                trieuChung,
                chuanDoan,
                ghiChu,
                maBacSi: currentDoctorId
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

    static async upsertMedicalRecordForTicket(req, res) {
        try {
            const { maPK } = req.params;
            const { trieuChung, chuanDoan, ghiChu, maBacSi } = req.body;
            const currentDoctorId = req.user?.id || maBacSi;

            const result = await MedicalRecordsService.upsertMedicalRecordForTicket(maPK, currentDoctorId, {
                trieuChung,
                chuanDoan,
                ghiChu
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({ message: result.message, data: result.data });
        } catch (error) {
            console.error('Loi upsertMedicalRecordForTicket:', error);
            res.status(500).json({ error: 'Loi server' });
        }
    }

    // Tạo bệnh án mới
    static async createMedicalRecord(req, res) {
        try {
            const { maPK, maBacSi, trieuChung, chuanDoan, ghiChu, ChiTietDichVu } = req.body;
            const currentDoctorId = req.user?.id || maBacSi;

            if (!maPK || !currentDoctorId) {
                return res.status(400).json({ error: 'Thông tin không hợp lệ' });
            }

            const result = await MedicalRecordsService.createMedicalRecord(maPK, currentDoctorId, {
                trieuChung,
                chuanDoan,
                ghiChu,
                ChiTietDichVu
            });

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.status(201).json({ message: result.message, data: result.data });
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
