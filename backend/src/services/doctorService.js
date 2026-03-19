import Doctor from "../models/doctorModel.js";

const doctorService = {
    getDoctorsBySpecialty: async(maChuyenKhoa) => {
        try {
            const doctors = await Doctor.getDoctorBySpecialty(maChuyenKhoa);
            return doctors;
        } catch (error) {
            throw new Error(error.message);
        }
    },
    getAllDoctors: async() => {
        try {
            const doctors = await Doctor.getAllDoctors();
            return doctors;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default doctorService;