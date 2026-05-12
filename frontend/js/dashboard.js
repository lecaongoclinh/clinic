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
        headers: { "Content-Type": "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || data.error || `Không thể tải dữ liệu dashboard (${response.status})`);
    }
    return data;
}

async function loadDashboardData(range) {
    return await fetchDashboardJson(`${DASHBOARD_API_BASE}?range=${encodeURIComponent(range)}`);
}

function renderSummary(summary = {}) {
    setText("metricRevenue", formatMoney(summary.totalRevenue));
    setText("metricVisits", formatNumber(summary.totalVisits));
    setText("metricNewPatients", formatNumber(summary.newPatients));
    setText("metricPendingInvoices", formatNumber(summary.pendingInvoices));

    setText("revenueGrowthBadge", `${Number(summary.revenueGrowth || 0) >= 0 ? "+" : ""}${Number(summary.revenueGrowth || 0)}%`);
    setText("visitsGrowthBadge", `${Number(summary.visitsGrowth || 0) >= 0 ? "+" : ""}${Number(summary.visitsGrowth || 0)}%`);
    setText("newPatientsGrowthBadge", `${Number(summary.newPatientsGrowth || 0) >= 0 ? "+" : ""}${Number(summary.newPatientsGrowth || 0)}%`);
    setText("pendingInvoiceAmount", formatMoney(summary.pendingAmount));
    setText("metricRevenueNote", `Doanh thu đã thanh toán trong ${getRangeLabel(dashboardState.currentRange).toLowerCase()}`);
}

function destroyChartIfExists(chart) {
    if (chart && typeof chart.destroy === "function") chart.destroy();
}

function renderTrendChart(trend = {}) {
    const ctx = dashboardEl("trendChart");
    if (!ctx) return;

    destroyChartIfExists(dashboardState.charts.trend);

    dashboardState.charts.trend = new Chart(ctx, {
        type: "line",
        data: {
            labels: trend.labels || [],
            datasets: [
                {
                    label: "Doanh thu đã thanh toán",
                    data: trend.revenue || [],
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
                    data: trend.visits || [],
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
            interaction: { intersect: false, mode: "index" },
            plugins: {
                legend: {
                    position: "top",
                    labels: { usePointStyle: true, boxWidth: 10, font: { family: "Inter", weight: "600" } }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const datasetLabel = context.dataset.label || "";
                            const value = context.parsed.y;
                            return datasetLabel.includes("Doanh thu")
                                ? `${datasetLabel}: ${formatMoney(value)}`
                                : `${datasetLabel}: ${formatNumber(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: "Inter" } } },
                yRevenue: {
                    type: "linear",
                    position: "left",
                    ticks: {
                        callback(value) { return `${(value / 1000000).toFixed(0)}tr`; },
                        font: { family: "Inter" }
                    },
                    grid: { color: "rgba(148, 163, 184, 0.15)" }
                },
                yVisits: {
                    type: "linear",
                    position: "right",
                    grid: { drawOnChartArea: false },
                    ticks: { font: { family: "Inter" } }
                }
            }
        }
    });
}

function renderRevenueStructureChart(items = []) {
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
                    labels: { usePointStyle: true, boxWidth: 10, padding: 18, font: { family: "Inter", weight: "600" } }
                },
                tooltip: {
                    callbacks: {
                        label(context) { return `${context.label}: ${context.raw}%`; }
                    }
                }
            }
        }
    });
}

function renderDoctorPerformance(items = []) {
    const tbody = dashboardEl("doctorPerformanceBody");
    if (!tbody) return;

    if (!Array.isArray(items) || !items.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Chưa có dữ liệu bác sĩ</td></tr>`;
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
        </tr>
    `).join("");
}

function renderTopServices(items = []) {
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

function renderRecentActivities(items = []) {
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

    try {
        const data = await loadDashboardData(dashboardState.currentRange);
        renderSummary(data.summary || {});
        renderTrendChart(data.trend || {});
        renderRevenueStructureChart(data.revenueStructure || []);
        renderDoctorPerformance(data.doctorPerformance || []);
        renderTopServices(data.topServices || []);
        renderRecentActivities(data.recentActivities || []);
    } catch (error) {
        console.error("Dashboard API error:", error);
        renderSummary({});
        renderTrendChart({ labels: [], revenue: [], visits: [] });
        renderRevenueStructureChart([]);
        renderDoctorPerformance([]);
        renderTopServices([]);
        renderRecentActivities([{
            title: "Không tải được dữ liệu dashboard",
            meta: error.message || "Vui lòng kiểm tra backend hoặc kết nối CSDL",
            value: ""
        }]);
    }
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
                alert(error.message || "Không thể xuất JSON dashboard");
            }
        });
    }
}

function hideSpinner() {
    const spinner = dashboardEl("spinner");
    if (spinner) setTimeout(() => spinner.classList.remove("show"), 300);
}

document.addEventListener("DOMContentLoaded", async () => {
    bindDashboardEvents();
    await renderDashboard();
    hideSpinner();
});
