import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const swaggerPath = path.resolve("src/swagger/swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routes
app.use('/api/auth', authRoutes);


export default app;