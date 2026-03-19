import DispenseService from "../services/dispenseService.js";

const DispenseController = {

    dispense: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    message: "Thiếu MaDT"
                });
            }

            const result = await DispenseService.dispense(id);

            res.json(result);

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }

};

export default DispenseController;