import specialtyService from '../services/specialtyService.js';

const specialtyController = {
    getAll: async (req, res) => {
        try {
            const data = await specialtyService.getAll();
            
            // Kiểm tra nếu data là null hoặc undefined (phòng trường hợp service lỗi)
            if (!data) {
                return res.status(200).json([]);
            }

            res.status(200).json(data);
        } catch (error) {
            console.error("Error in specialtyController:", error); // Log lỗi ra console server để debug
            res.status(500).json({ 
                success: false, 
                message: "Không thể lấy danh sách chuyên khoa",
                error: error.message 
            });
        }
    }
};

export default specialtyController;