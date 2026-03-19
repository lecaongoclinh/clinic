import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentsRoutes.js";

import medicinesRoutes from "./routes/medicinesRoutes.js";
import suppliersRoutes from "./routes/suppliersRoutes.js";
import importsRoutes from "./routes/importsRoutes.js";
import dispenseRoutes from "./routes/dispenseRoutes.js";

import prescriptionRouters from "./routes/prescriptionRoutes.js";

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const swaggerPath = path.resolve("src/swagger/swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', (await import('./routes/patientRoutes.js')).default);
app.use('/api/specialty', (await import('./routes/specialtyRoutes.js')).default);
app.use('/api/doctor', (await import('./routes/doctorRoutes.js')).default);
app.use('/api/schedules', (await import('./routes/scheduleRoutes.js')).default);
app.use('/api/medical-records', (await import('./routes/medicalRecordsRoutes.js')).default);

/* ===== routes bạn thêm ===== */

app.use('/api/medicines', (await import('./routes/medicinesRoutes.js')).default);


app.use('/api/suppliers', (await import('./routes/suppliersRoutes.js')).default);


app.use("/api/imports", (await import('./routes/importsRoutes.js')).default);

app.use("/api/dispense", (await import('./routes/dispenseRoutes.js')).default);
app.use("/api/batches", (await import('./routes/batchRoutes.js')).default);
app.use("/api/prescriptions", (await import('./routes/prescriptionRoutes.js')).default);

export default app;