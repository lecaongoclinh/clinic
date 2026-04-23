import QuyDoiModel from "../models/quyDoiModel.js";

const QuyDoiService = {

    getByMedicine: async (MaThuoc) => {
        return await QuyDoiModel.getByMedicine(MaThuoc);
    }

};

export default QuyDoiService;