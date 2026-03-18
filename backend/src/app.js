import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentsRoutes.js";
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


export default app;