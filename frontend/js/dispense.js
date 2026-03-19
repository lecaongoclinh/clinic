const API_PRES = "http://localhost:3000/api/prescriptions";
const API_MED = "http://localhost:3000/api/medicines";
const API_DISPENSE = "http://localhost:3000/api/dispense";

let selectedId = null;
let medicines = [];

// ================= LOAD DANH SÁCH ĐƠN =================
async function loadPrescriptions() {
    try {
        const res = await fetch(API_PRES);
        const data = await res.json();

        const list = document.getElementById("prescriptionList");
        list.innerHTML = "";

        data.forEach(p => {
            list.innerHTML += `
                <div class="prescription-item"
                     onclick="selectPrescription(${p.MaDT}, this)">
                    Đơn #${p.MaDT} 
                    ${p.TrangThai === 'DaXuat' ? '(Đã xuất)' : ''}
                </div>
            `;
        });

    } catch (err) {
        console.error(err);
        alert("Lỗi load đơn thuốc");
    }
}

// ================= LOAD THUỐC =================
async function loadMedicines() {
    try {
        const res = await fetch(API_MED);
        medicines = await res.json();
    } catch (err) {
        console.error(err);
    }
}

// ================= CHỌN ĐƠN =================
async function selectPrescription(id, el) {

    document.querySelectorAll(".prescription-item")
        .forEach(e => e.classList.remove("active-item"));

    el.classList.add("active-item");

    selectedId = id;

    try {
        const res = await fetch(`${API_PRES}/${id}`);
        let data = await res.json();

        // 🔥 FIX: đảm bảo luôn là array
        if (!Array.isArray(data)) {
            data = [data];
        }

        renderDetail(data);

    } catch (err) {
        console.error(err);
        alert("Lỗi load chi tiết");
    }
}

// ================= RENDER =================
function renderDetail(data) {

    const table = document.getElementById("medicineTable");
    const patient = document.getElementById("patientInfo");

    table.innerHTML = "";
    patient.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="4">Không có dữ liệu</td></tr>`;
        return;
    }

    patient.innerHTML = `
        <p><strong>Bệnh nhân:</strong> ${data[0].HoTen || ''}</p>
        <p><strong>Mã đơn:</strong> ${data[0].MaDT}</p>
    `;

    let canDispense = true;

    data.forEach(item => {

        const ton = item.SoLuongTon || 0;

        let status = '<span class="text-success">Đủ</span>';

        if (ton < item.SoLuong) {
            status = '<span class="danger">Thiếu</span>';
            canDispense = false;
        }

        table.innerHTML += `
            <tr>
                <td>${item.TenThuoc}</td>
                <td>${item.SoLuong}</td>
                <td>${ton}</td>
                <td>${status}</td>
            </tr>
        `;
    });

    document.getElementById("btnDispense").disabled = !canDispense;
}

// ================= XUẤT =================
async function dispense() {

    if (!selectedId) {
        alert("Chọn đơn thuốc!");
        return;
    }

    try {
        const res = await fetch(`${API_DISPENSE}/${selectedId}`, {
            method: "POST"
        });

        const result = await res.json();

        alert(result.message || "Xuất thuốc thành công");

        // reload lại
        await loadPrescriptions();

        // reset UI
        document.getElementById("medicineTable").innerHTML = "";
        document.getElementById("patientInfo").innerHTML = "";
        selectedId = null;

    } catch (err) {
        console.error(err);
        alert("Lỗi xuất thuốc");
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("btnDispense").onclick = dispense;

    await loadMedicines();
    await loadPrescriptions();
});