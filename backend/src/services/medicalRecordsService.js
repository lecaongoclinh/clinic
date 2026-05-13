import MedicalRecordsModel from '../models/medicalRecordsModel.js';

class MedicalRecordsService {
    static async getMedicalRecords(tenBN = '', fromDate = null, toDate = null, limit = 10, offset = 0) {
        try {
            const result = await MedicalRecordsModel.getMedicalRecords(tenBN, fromDate, toDate, limit, offset);
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

    static async getEligibleExamTickets(filters = {}) {
        try {
            const result = await MedicalRecordsModel.getEligibleExamTickets(filters);
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
            const patient = await MedicalRecordsModel.getPatientById(maBN);
            if (!patient) {
                throw new Error('Bệnh nhân không tồn tại');
            }

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
            if (!detail.medicalRecord) {
                throw new Error('Không tìm thấy bệnh án');
            }

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

    static async getExamWorkspace(maPK) {
        try {
            if (!maPK) {
                throw new Error('Ma phieu kham khong hop le');
            }

            const detail = await MedicalRecordsModel.getExamWorkspace(maPK);
            if (!detail) {
                throw new Error('Khong tim thay phieu kham');
            }

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
            if (!data.trieuChung || !String(data.trieuChung).trim()) {
                throw new Error('Vui lòng nhập triệu chứng');
            }
            if (!data.chuanDoan || !String(data.chuanDoan).trim()) {
                throw new Error('Vui lòng nhập chẩn đoán');
            }

            const detail = await MedicalRecordsModel.getMedicalRecordDetail(maBA);
            if (!detail.medicalRecord) {
                throw new Error('Không tìm thấy bệnh án');
            }
            if (data.maBacSi && Number(data.maBacSi) !== Number(detail.medicalRecord.MaBacSi)) {
                throw new Error('Bác sĩ không có quyền sửa bệnh án');
            }
            if (detail.invoice && detail.invoice.TrangThai === 'DaThanhToan') {
                throw new Error('Bệnh án đã khóa/thanh toán, không thể cập nhật');
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

    static async upsertMedicalRecordForTicket(maPK, maBacSi, data) {
        try {
            if (!maPK || !maBacSi) {
                throw new Error('Thong tin khong hop le');
            }
            if (!data.trieuChung || !String(data.trieuChung).trim()) {
                throw new Error('Vui long nhap trieu chung');
            }
            if (!data.chuanDoan || !String(data.chuanDoan).trim()) {
                throw new Error('Vui long nhap chan doan');
            }

            const result = await MedicalRecordsModel.upsertMedicalRecordForTicket(maPK, maBacSi, {
                trieuChung: String(data.trieuChung).trim(),
                chuanDoan: String(data.chuanDoan).trim(),
                ghiChu: data.ghiChu ? String(data.ghiChu).trim() : null
            });

            return {
                success: true,
                data: result,
                message: 'Luu benh an thanh cong'
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
            if (!data.trieuChung || !String(data.trieuChung).trim()) {
                throw new Error('Vui lòng nhập triệu chứng');
            }
            if (!data.chuanDoan || !String(data.chuanDoan).trim()) {
                throw new Error('Vui lòng nhập chẩn đoán');
            }

            const result = await MedicalRecordsModel.createMedicalRecordWithTicketUpdate(maPK, maBacSi, {
                trieuChung: String(data.trieuChung).trim(),
                chuanDoan: String(data.chuanDoan).trim(),
                ghiChu: data.ghiChu ? String(data.ghiChu).trim() : null,
                ChiTietDichVu: Array.isArray(data.ChiTietDichVu) ? data.ChiTietDichVu : []
            });
            
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
