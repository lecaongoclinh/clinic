const DASHBOARD_API_BASE = "http://localhost:3000/api/dashboard";

const dashboardState = {
    currentRange: "month",
    charts: {
        trend: null,
        structure: null
    }
};

function dashboardEl(id) {
    return document.getElementById(id);
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function setText(id, value) {
    const el = dashboardEl(id);
    if (el) el.textContent = value;
}

function getRangeLabel(range) {
    switch (range) {
        case "today": return "Hôm nay";
        case "week": return "Tuần này";
        case "month": return "Tháng này";
        case "year": return "Năm nay";
        default: return "Tháng này";
    }
}

async function fetchDashboardJson(url) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || `Không thể tải dữ liệu dashboard (${response.status})`);
    }

    return data;
}
function getMockDashboardData(range = "month") {
    const labelsByRange = {
        today: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        week: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
        month: ["01", "05", "10", "15", "20", "25", "30"],
        year: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]
    };

    const revenueSeriesByRange = {
        today: [4500000, 7800000, 6200000, 9100000, 8600000, 5400000],
        week: [28000000, 32000000, 35000000, 30000000, 39000000, 42000000, 31000000],
        month: [145000000, 210000000, 280000000, 220000000, 410000000, 520000000, 360000000],
        year: [740000000, 810000000, 920000000, 880000000, 970000000, 1050000000, 1110000000, 1180000000, 1090000000, 1230000000, 1320000000, 1410000000]
    };

    const visitsSeriesByRange = {
        today: [12, 28, 21, 32, 30, 18],
        week: [102, 115, 128, 119, 142, 150, 110],
        month: [420, 530, 620, 580, 710, 820, 670],
        year: [980, 1040, 1105, 1080, 1150, 1180, 1255, 1300, 1220, 1360, 1420, 1490]
    };

    const dataByRange = {
        today: {
            summary: {
                totalRevenue: 41700000,
                revenueGrowth: 12.8,
                totalVisits: 141,
                visitsGrowth: 8.6,
                newPatients: 29,
                newPatientsGrowth: 14.2,
                satisfactionRate: 95.4
            }
        },
        week: {
            summary: {
                totalRevenue: 237000000,
                revenueGrowth: 10.3,
                totalVisits: 866,
                visitsGrowth: 7.9,
                newPatients: 172,
                newPatientsGrowth: 11.1,
                satisfactionRate: 95.0
            }
        },
        month: {
            summary: {
                totalRevenue: 2145000000,
                revenueGrowth: 12.5,
                totalVisits: 4280,
                visitsGrowth: 9.7,
                newPatients: 1152,
                newPatientsGrowth: 18.0,
                satisfactionRate: 94.8
            }
        },
        year: {
            summary: {
                totalRevenue: 13860000000,
                revenueGrowth: 16.2,
                totalVisits: 15840,
                visitsGrowth: 13.4,
                newPatients: 4621,
                newPatientsGrowth: 20.8,
                satisfactionRate: 95.1
            }
        }
    };

    return {
        summary: dataByRange[range].summary,
        trend: {
            labels: labelsByRange[range],
            revenue: revenueSeriesByRange[range],
            visits: visitsSeriesByRange[range]
        },
        revenueStructure: [
            { label: "Khám bệnh", value: 60 },
            { label: "Cận lâm sàng", value: 25 },
            { label: "Dịch vụ khác", value: 15 }
        ],
        doctorPerformance: [
            {
                name: "BS. Lê Mạnh Hùng",
                specialty: "Nội tổng quát",
                visits: 842,
                revenue: 412000000,
                rating: 4.9
            },
            {
                name: "BS. Nguyễn Thu Trang",
                specialty: "Sản phụ khoa",
                visits: 756,
                revenue: 385600000,
                rating: 4.8
            },
            {
                name: "BS. Trần Đức Minh",
                specialty: "Răng Hàm Mặt",
                visits: 612,
                revenue: 524000000,
                rating: 5.0
            },
            {
                name: "BS. Phạm Khánh Linh",
                specialty: "Nhi khoa",
                visits: 584,
                revenue: 301800000,
                rating: 4.7
            }
        ],
        topServices: [
            {
                name: "Khám nội tổng quát",
                count: 1240,
                revenue: 310000000
            },
            {
                name: "Siêu âm ổ bụng",
                count: 856,
                revenue: 385200000
            },
            {
                name: "Xét nghiệm máu tổng quát",
                count: 712,
                revenue: 213600000
            },
            {
                name: "Chụp X-Quang phổi",
                count: 530,
                revenue: 159000000
            },
            {
                name: "Nội soi dạ dày",
                count: 420,
                revenue: 336000000
            }
        ],
        recentActivities: [
            {
                title: "Doanh thu tăng mạnh trong tuần cuối",
                meta: "So với cùng kỳ trước đó",
                value: "+12.5%"
            },
            {
                title: "Sản phụ khoa dẫn đầu số ca khám",
                meta: "Tính trong kỳ hiện tại",
                value: "756 ca"
            },
            {
                title: "Dịch vụ siêu âm tăng trưởng tốt",
                meta: "Nhu cầu tăng ổn định",
                value: "+18.2%"
            },
            {
                title: "Tỷ lệ hài lòng đang duy trì cao",
                meta: "Phản hồi bệnh nhân tích cực",
                value: "94.8%"
            }
        ]
    };
}

async function loadDashboardData(range) {
    try {
        return await fetchDashboardJson(`${DASHBOARD_API_BASE}?range=${encodeURIComponent(range)}`);
    } catch (error) {
        console.warn("Dashboard API unavailable, using mock data:", error);
        return getMockDashboardData(range);
    }
}

function renderSummary(summary) {
    setText("metricRevenue", formatMoney(summary.totalRevenue));
    setText("metricVisits", formatNumber(summary.totalVisits));
    setText("metricNewPatients", formatNumber(summary.newPatients));
    setText("metricSatisfaction", formatPercent(summary.satisfactionRate));

    setText("revenueGrowthBadge", `${summary.revenueGrowth >= 0 ? "+" : ""}${summary.revenueGrowth}%`);
    setText("visitsGrowthBadge", `${summary.visitsGrowth >= 0 ? "+" : ""}${summary.visitsGrowth}%`);
    setText("newPatientsGrowthBadge", `${summary.newPatientsGrowth >= 0 ? "+" : ""}${summary.newPatientsGrowth}%`);
    setText("satisfactionBadge", summary.satisfactionRate >= 90 ? "Rất tốt" : "Ổn định");

    setText("metricRevenueNote", `Doanh thu trong ${getRangeLabel(dashboardState.currentRange).toLowerCase()}`);
}

function destroyChartIfExists(chart) {
    if (chart && typeof chart.destroy === "function") {
        chart.destroy();
    }
}

function renderTrendChart(trend) {
    const ctx = dashboardEl("trendChart");
    if (!ctx) return;

    destroyChartIfExists(dashboardState.charts.trend);

    dashboardState.charts.trend = new Chart(ctx, {
        type: "line",
        data: {
            labels: trend.labels,
            datasets: [
                {
                    label: "Doanh thu",
                    data: trend.revenue,
                    borderColor: "#3659f4",
                    backgroundColor: "rgba(54, 89, 244, 0.18)",
                    pointBackgroundColor: "#3659f4",
                    pointBorderColor: "#ffffff",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    yAxisID: "yRevenue"
                },
                {
                    label: "Lượt khám",
                    data: trend.visits,
                    borderColor: "#28bbff",
                    backgroundColor: "rgba(40, 187, 255, 0.14)",
                    pointBackgroundColor: "#28bbff",
                    pointBorderColor: "#ffffff",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    tension: 0.35,
                    borderDash: [6, 6],
                    fill: false,
                    yAxisID: "yVisits"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        font: {
                            family: "Inter",
                            weight: "600"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const datasetLabel = context.dataset.label || "";
                            const value = context.parsed.y;

                            if (datasetLabel === "Doanh thu") {
                                return `${datasetLabel}: ${formatMoney(value)}`;
                            }
                            return `${datasetLabel}: ${formatNumber(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "Inter"
                        }
                    }
                },
                yRevenue: {
                    type: "linear",
                    position: "left",
                    ticks: {
                        callback(value) {
                            return `${(value / 1000000).toFixed(0)}tr`;
                        },
                        font: {
                            family: "Inter"
                        }
                    },
                    grid: {
                        color: "rgba(148, 163, 184, 0.15)"
                    }
                },
                yVisits: {
                    type: "linear",
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        font: {
                            family: "Inter"
                        }
                    }
                }
            }
        }
    });
}

function renderRevenueStructureChart(items) {
    const ctx = dashboardEl("revenueStructureChart");
    if (!ctx) return;

    destroyChartIfExists(dashboardState.charts.structure);

    dashboardState.charts.structure = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: items.map(item => item.label),
            datasets: [
                {
                    data: items.map(item => item.value),
                    backgroundColor: ["#3659f4", "#28bbff", "#ff6518", "#f12626", "#7c3aed"],
                    borderColor: "#ffffff",
                    borderWidth: 4,
                    hoverOffset: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 18,
                        font: {
                            family: "Inter",
                            weight: "600"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderDoctorPerformance(items) {
    const tbody = dashboardEl("doctorPerformanceBody");
    if (!tbody) return;

    if (!Array.isArray(items) || !items.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">Chưa có dữ liệu bác sĩ</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td>
                <div class="doctor-name">${item.name || "--"}</div>
                <div class="doctor-meta">Hiệu suất trong ${getRangeLabel(dashboardState.currentRange).toLowerCase()}</div>
            </td>
            <td>${item.specialty || "--"}</td>
            <td>${formatNumber(item.visits)}</td>
            <td class="fw-bold text-primary">${formatMoney(item.revenue)}</td>
            <td>
                <span class="score-badge">
                    <i class="fa fa-star"></i>${Number(item.rating || 0).toFixed(1)}
                </span>
            </td>
        </tr>
    `).join("");
}

function renderTopServices(items) {
    const container = dashboardEl("topServicesList");
    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `<div class="empty-state">Chưa có dữ liệu dịch vụ</div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="top-service-item">
            <div>
                <div class="service-title">${item.name || "--"}</div>
                <div class="service-meta">Doanh thu: ${formatMoney(item.revenue)}</div>
            </div>
            <div class="service-value">
                <div class="service-count">${formatNumber(item.count)} lượt</div>
            </div>
        </div>
    `).join("");
}

function renderRecentActivities(items) {
    const container = dashboardEl("recentActivitiesList");
    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `<div class="empty-state">Chưa có hoạt động gần đây</div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="activity-item">
            <div>
                <div class="activity-title">${item.title || "--"}</div>
                <div class="activity-meta">${item.meta || ""}</div>
            </div>
            <div class="activity-value fw-bold text-primary">${item.value || ""}</div>
        </div>
    `).join("");
}

function updateRangeButtons() {
    const buttons = document.querySelectorAll("#rangeSelector .segment-btn");
    buttons.forEach(button => {
        button.classList.toggle("active", button.dataset.range === dashboardState.currentRange);
    });

    setText("currentRangeLabel", getRangeLabel(dashboardState.currentRange));
}

async function renderDashboard() {
    updateRangeButtons();

    const data = await loadDashboardData(dashboardState.currentRange);

    renderSummary(data.summary || {});
    renderTrendChart(data.trend || { labels: [], revenue: [], visits: [] });
    renderRevenueStructureChart(data.revenueStructure || []);
    renderDoctorPerformance(data.doctorPerformance || []);
    renderTopServices(data.topServices || []);
    renderRecentActivities(data.recentActivities || []);
}

function bindDashboardEvents() {
    const rangeSelector = dashboardEl("rangeSelector");
    const exportButton = dashboardEl("exportDashboardBtn");

    if (rangeSelector) {
        rangeSelector.addEventListener("click", async (event) => {
            const button = event.target.closest(".segment-btn");
            if (!button) return;

            const range = button.dataset.range;
            if (!range || range === dashboardState.currentRange) return;

            dashboardState.currentRange = range;
            await renderDashboard();
        });
    }

   if (exportButton) {
    exportButton.addEventListener("click", async () => {
        try {
            const data = await loadDashboardData(dashboardState.currentRange);
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json;charset=utf-8"
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dashboard-${dashboardState.currentRange}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            alert(error.message || "Không thể xuất dữ liệu dashboard");
        }
    });
}
}

function hideSpinner() {
    const spinner = dashboardEl("spinner");
    if (spinner) {
        setTimeout(() => spinner.classList.remove("show"), 300);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    bindDashboardEvents();
    await renderDashboard();
    hideSpinner();
});
