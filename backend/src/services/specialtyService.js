import specialtyModel from '../models/specialtyModel.js';

const specialtyService = {
    getAll: async () => {
        try {
            const data = await specialtyModel.getAll();
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default specialtyService;