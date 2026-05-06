import appointmentsService from '../services/appointmentsService.js';

const appointmentsController = {
    getAppointments: async (req, res) => {
        try {
            const {tenBN, maChuyenKhoa, maBacSi } = req.query;
            const data = await appointmentsService.getAppointments(tenBN, maChuyenKhoa, maBacSi);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createAppointment: async (req, res) => {
        try {
            const { maBN, maBacSi, ngayHen, gioHen, lyDoKham } = req.body;
            if (!maBN || !maBacSi || !ngayHen || !gioHen) {
                return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
            }
            const appointmentId = await appointmentsService.createAppointment(maBN, maBacSi, ngayHen, gioHen, lyDoKham);
            res.status(201).json({ message: 'Đặt lịch khám thành công', id: appointmentId });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    updateAppointment: async (req, res) => {
        try {
            const { maLK } = req.params;
            const { maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai } = req.body;
            if (!maLK || !maBN || !maBacSi || !ngayHen || !gioHen) {
                return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
            }
            const success = await appointmentsService.updateAppointment(maLK, maBN, maBacSi, ngayHen, gioHen, lyDoKham, trangThai);
            if (success) {
                res.status(200).json({ message: 'Cập nhật lịch khám thành công' });
            } else {
                res.status(404).json({ error: 'Không tìm thấy lịch khám' });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    deleteAppointment: async (req, res) => {
        try {
            const { maLK } = req.params;
            if (!maLK) {
                return res.status(400).json({ error: 'Thiếu mã lịch khám' });
            }
            const success = await appointmentsService.deleteAppointment(maLK);
            if (success) {
                res.status(200).json({ message: 'Xóa lịch khám thành công' });
            } else {
                res.status(404).json({ error: 'Không tìm thấy lịch khám' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
export default appointmentsController;
