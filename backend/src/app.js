import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import ticketRoutes from "./routes/ticketRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentsRoutes.js";
import quyDoiRoutes from "./routes/quyDoiRoutes.js";
import khoRoutes from "./routes/khoRoutes.js";
import servicesRoutes from "./routes/servicesRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../../frontend");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/phieukham", (req, res) => {
    res.sendFile(path.join(frontendPath, "phieukham.html"));
});

app.use("/api", ticketRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patients", (await import("./routes/patientRoutes.js")).default);
app.use("/api/specialty", (await import("./routes/specialtyRoutes.js")).default);
app.use("/api/doctor", (await import("./routes/doctorRoutes.js")).default);
app.use("/api/schedules", (await import("./routes/scheduleRoutes.js")).default);
app.use("/api/medical-records", (await import("./routes/medicalRecordsRoutes.js")).default);
app.use("/api/medicines", (await import("./routes/medicinesRoutes.js")).default);
app.use("/api/suppliers", (await import("./routes/suppliersRoutes.js")).default);
app.use("/api/imports", (await import("./routes/importsRoutes.js")).default);
app.use("/api/dispense", (await import("./routes/dispenseRoutes.js")).default);
app.use("/api/batches", (await import("./routes/batchRoutes.js")).default);
app.use("/api/prescriptions", (await import("./routes/prescriptionRoutes.js")).default);
app.use("/api/quy-doi", quyDoiRoutes);
app.use("/api/kho", khoRoutes);
app.use("/api/inventory", (await import("./routes/inventoryRouter.js")).default);
app.use("/api/services", servicesRoutes);
app.use("/api/invoices", (await import("./routes/invoicesRoutes.js")).default);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
    res.status(404).send("Khong tim thay trang");
});

export default app;
