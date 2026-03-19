import MedicalRecordsModel from '../models/medicalRecordsModel.js';

class MedicalRecordsService {
    static async getPatientsBySpecialty(maChuyenKhoa, tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            const result = await MedicalRecordsModel.getPatientsBySpecialty(maChuyenKhoa, tenBN, fromDate, toDate, limit, offset);
            return {
                success: true,
                data: {
                    data: result.data,
                    total: result.total
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getMedicalHistory(maBN) {
        try {
            const history = await MedicalRecordsModel.getMedicalHistory(maBN);
            return {
                success: true,
                data: history
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getMedicalRecordDetail(maBA) {
        try {
            const detail = await MedicalRecordsModel.getMedicalRecordDetail(maBA);
            return {
                success: true,
                data: detail
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async updateMedicalRecord(maBA, data) {
        try {
            // Validation
            if (!maBA) {
                throw new Error('Mã bệnh án không hợp lệ');
            }

            const result = await MedicalRecordsModel.updateMedicalRecord(maBA, data);
            
            if (result.affectedRows === 0) {
                throw new Error('Không tìm thấy bệnh án');
            }

            return {
                success: true,
                message: 'Cập nhật bệnh án thành công'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async createMedicalRecord(maPK, maBacSi, data) {
        try {
            // Validation
            if (!maPK || !maBacSi) {
                throw new Error('Thông tin không hợp lệ');
            }

            const result = await MedicalRecordsModel.createMedicalRecord(maPK, maBacSi, data);
            
            return {
                success: true,
                data: result,
                message: 'Tạo bệnh án thành công'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getAllSpecialties() {
        try {
            const specialties = await MedicalRecordsModel.getAllSpecialties();
            return {
                success: true,
                data: specialties
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getAllPatientsWithRecords(tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            const result = await MedicalRecordsModel.getAllPatientsWithRecords(tenBN, fromDate, toDate, limit, offset);
            return {
                success: true,
                data: {
                    data: result.data,
                    total: result.total
                }
            };
        } catch (error) {
            console.error('Lỗi getAllPatientsWithRecords:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default MedicalRecordsService;
