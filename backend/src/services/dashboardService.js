import DashboardModel from "../models/dashboardModel.js";

function toDateString(date) {
    return date.toISOString().slice(0, 10);
}

function getRangeDates(range = "month") {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (range === "today") {
        // giữ nguyên hôm nay
    } else if (range === "week") {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
    } else if (range === "month") {
        start.setDate(1);
    } else if (range === "year") {
        start.setMonth(0, 1);
    }

    return {
        startDate: toDateString(start),
        endDate: toDateString(end)
    };
}

function getPreviousRangeDates(range = "month") {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (range === "today") {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
    } else if (range === "week") {
        const day = start.getDay() || 7;
        end.setDate(end.getDate() - day);
        start = new Date(end);
        start.setDate(start.getDate() - 6);
    } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === "year") {
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
    }

    return {
        startDate: toDateString(start),
        endDate: toDateString(end)
    };
}

function calcGrowth(current, previous) {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (p <= 0) return c > 0 ? 100 : 0;
    return Number((((c - p) / p) * 100).toFixed(1));
}

function mergeTrend(range, revenueRows, visitRows) {
    const map = new Map();

    revenueRows.forEach(row => {
        map.set(row.label, {
            label: row.label,
            revenue: Number(row.revenue || 0),
            visits: 0
        });
    });

    visitRows.forEach(row => {
        if (!map.has(row.label)) {
            map.set(row.label, {
                label: row.label,
                revenue: 0,
                visits: Number(row.visits || 0)
            });
        } else {
            map.get(row.label).visits = Number(row.visits || 0);
        }
    });

    const items = [...map.values()];

    if (range === "today") {
        items.sort((a, b) => a.label.localeCompare(b.label));
    } else if (range === "year") {
        items.sort((a, b) => Number(a.label) - Number(b.label));
    } else {
        items.sort((a, b) => a.label.localeCompare(b.label));
    }

    return {
        labels: items.map(item => item.label),
        revenue: items.map(item => item.revenue),
        visits: items.map(item => item.visits)
    };
}

function toRevenueStructurePercent(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const labels = ["Khám bệnh", "Cận lâm sàng", "Thuốc", "Khác"];

    if (!total) {
        return labels.map(label => ({ label, value: 0 }));
    }

    const revenueMap = new Map(rows.map(row => [row.label, Number(row.revenue || 0)]));
    return labels.map(label => ({
        label,
        value: Number(((Number(revenueMap.get(label) || 0) / total) * 100).toFixed(1))
    }));
}

function buildRecentActivities(summary, topServices) {
    const items = [];

    items.push({
        title: "Doanh thu đã thanh toán",
        meta: "Chỉ tính hóa đơn đã thanh toán trong kỳ",
        value: `${Number(summary.revenueGrowth || 0) >= 0 ? "+" : ""}${summary.revenueGrowth}%`
    });

    items.push({
        title: "Bệnh nhân mới",
        meta: "Hồ sơ bệnh nhân tạo trong kỳ",
        value: `${Number(summary.newPatients || 0).toLocaleString("vi-VN")} BN`
    });

    if (topServices?.length) {
        items.push({
            title: `Dịch vụ nổi bật: ${topServices[0].name}`,
            meta: "Đứng đầu theo lượt sử dụng",
            value: `${Number(topServices[0].count || 0).toLocaleString("vi-VN")} lượt`
        });
    }

    items.push({
        title: "Hóa đơn chờ thanh toán",
        meta: "Chưa thanh toán, thanh toán một phần hoặc quá hạn",
        value: `${Number(summary.pendingInvoices || 0).toLocaleString("vi-VN")} HĐ`
    });

    return items;
}

const DashboardService = {
    getDashboard: async (range = "month") => {
        const current = getRangeDates(range);
        const previous = getPreviousRangeDates(range);

        const [
            currentSummary,
            previousSummary,
            revenueTrend,
            visitTrend,
            revenueStructure,
            doctorPerformance,
            topServices
        ] = await Promise.all([
            DashboardModel.getSummary(current.startDate, current.endDate),
            DashboardModel.getSummary(previous.startDate, previous.endDate),
            DashboardModel.getRevenueTrend(current.startDate, current.endDate, range),
            DashboardModel.getVisitTrend(current.startDate, current.endDate, range),
            DashboardModel.getRevenueStructure(current.startDate, current.endDate),
            DashboardModel.getDoctorPerformance(current.startDate, current.endDate),
            DashboardModel.getTopServices(current.startDate, current.endDate)
        ]);

        const summary = {
            totalRevenue: Number(currentSummary.totalRevenue || 0),
            revenueGrowth: calcGrowth(currentSummary.totalRevenue, previousSummary.totalRevenue),
            totalVisits: Number(currentSummary.totalVisits || 0),
            visitsGrowth: calcGrowth(currentSummary.totalVisits, previousSummary.totalVisits),
            newPatients: Number(currentSummary.newPatients || 0),
            newPatientsGrowth: calcGrowth(currentSummary.newPatients, previousSummary.newPatients),
            pendingInvoices: Number(currentSummary.pendingInvoices || 0),
            pendingAmount: Number(currentSummary.pendingAmount || 0)
        };

        return {
            summary,
            trend: mergeTrend(range, revenueTrend, visitTrend),
            revenueStructure: toRevenueStructurePercent(revenueStructure),
            doctorPerformance: doctorPerformance.map(item => ({
                name: item.name,
                specialty: item.specialty || "Chưa cập nhật",
                visits: Number(item.visits || 0),
                revenue: Number(item.revenue || 0),
                rating: item.rating === null || item.rating === undefined ? null : Number(item.rating)
            })),
            topServices: topServices.map(item => ({
                name: item.name,
                count: Number(item.count || 0),
                revenue: Number(item.revenue || 0)
            })),
            recentActivities: buildRecentActivities(summary, topServices)
        };
    }
};

export default DashboardService;
