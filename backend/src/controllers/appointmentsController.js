import appointmentsService from '../services/appointmentsService.js';

const appointmentsController = {
    getAppointments: async (req, res) => {
        try {
            const { maChuyenKhoa, maBacSi } = req.query;
            const data = await appointmentsService.getAppointments(maChuyenKhoa, maBacSi);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default appointmentsController;    