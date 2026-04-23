import DashboardService from "../services/dashboardService.js";

const DashboardController = {
    getDashboard: async (req, res) => {
        try {
            const range = req.query.range || "month";
            const data = await DashboardService.getDashboard(range);
            res.json(data);
        } catch (error) {
            console.error("getDashboard error:", error);
            res.status(500).json({
                message: error.message || "Lỗi lấy dữ liệu dashboard"
            });
        }
    }
};

export default DashboardController;