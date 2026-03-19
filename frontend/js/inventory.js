const API_BATCH = "http://localhost:3000/api/batches";
const API_MED = "http://localhost:3000/api/medicines";

let allBatches = [];

// ================= LOAD ALL =================
async function loadAll() {
    await loadInventory();
    await loadBatches();
}

// ================= LOAD INVENTORY =================
async function loadInventory() {
    const res = await fetch(API_MED);
    const data = await res.json();

    const table = document.getElementById("inventoryTable");
    table.innerHTML = "";

    let low = 0;

    data.forEach(m => {

        if (m.SoLuongTon < 10) low++;

        table.innerHTML += `
            <tr>
                <td>${m.TenThuoc}</td>
                <td>${m.DonViTinh}</td>
                <td>${m.SoLuongTon}</td>
                <td class="text-center">
                    ${m.SoLuongTon < 10
                        ? '<span class="badge bg-warning text-dark">Sắp hết</span>'
                        : '<span class="badge bg-success ">Còn hàng</span>'}
                </td>
            </tr>
        `;
    });

    document.getElementById("totalMedicines").innerText = data.length;
    document.getElementById("lowStock").innerText = low;
}

// ================= LOAD BATCH =================
async function loadBatches() {
    const res = await fetch(API_BATCH);
    const data = await res.json();

    console.log("BATCH DATA:", data); // debug

    allBatches = data;

    renderBatch(data);
}

// ================= RENDER =================
function renderBatch(data) {
    const table = document.getElementById("batchTable");
    table.innerHTML = "";

    let expired = 0;

    data.forEach(b => {

        const today = new Date();
        const hsd = new Date(b.HanSuDung);

        const diffDays = (hsd - today) / (1000 * 60 * 60 * 24);

        let statusHTML = '<span class="badge bg-success">Còn hạn</span>';
        let rowClass = "";

        if (hsd < today) {
            statusHTML = '<span class="badge bg-danger">Hết hạn</span>';
            rowClass = "expired";
            expired++;
        }
        else if (diffDays <= 30) {
            statusHTML = '<span class="badge bg-warning text-dark">Sắp hết hạn</span>';
            rowClass = "warning";
        }
        else if (b.SoLuongTon < 10) {
            statusHTML = '<span class="badge bg-secondary">Sắp hết (SL)</span>';
        }

        table.innerHTML += `
            <tr class="${rowClass}">
                <td>${b.TenThuoc}</td>
                <td>${b.SoLo}</td>
                <td>${hsd.toLocaleDateString()}</td>
                <td>${b.SoLuongTon}</td>
                <td class="text-center">${statusHTML}</td>
            </tr>
        `;
    });

    document.getElementById("expired").innerText = expired;
}

// ================= FILTER =================
function handleFilter(type) {
    if (type === "all") {
        renderBatch(allBatches);
    }
    else if (type === "low") {
        const today = new Date();

        const data = allBatches.filter(b => {
            const hsd = new Date(b.HanSuDung);
            const diffDays = (hsd - today) / (1000 * 60 * 60 * 24);

            return diffDays <= 30 || b.SoLuongTon < 10;
        });

        renderBatch(data);
    }
    else if (type === "expired") {
        const today = new Date();

        const data = allBatches.filter(b =>
            new Date(b.HanSuDung) < today
        );

        renderBatch(data);
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", loadAll);