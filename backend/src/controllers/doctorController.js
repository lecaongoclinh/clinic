import doctorService from '../services/doctorService.js';

const doctorController = {
    getDoctorsBySpecialty: async (req, res) => {
        try {
            const { maChuyenKhoa, maBacSi } = req.query;
            const data = await doctorService.getDoctorsBySpecialty(maChuyenKhoa, maBacSi);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }      
    },
    getAllDoctors: async (req, res) => {
        try {
            const data = await doctorService.getAllDoctors();
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }      
    }
};

export default doctorController;