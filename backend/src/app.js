import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import ticketRoutes from './routes/ticketRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../../frontend');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(frontendPath));

// Routes API
app.use('/api', ticketRoutes);

// Routes cho trang frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/phieukham', (req, res) => {
    res.sendFile(path.join(frontendPath, 'phieukham.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Không tìm thấy trang');
});

export default app;