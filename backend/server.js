process.env.TZ = 'Asia/Ho_Chi_Minh';
import dotenv from "dotenv";
import app from "./src/app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API docs: http://localhost:${PORT}/api-docs`);
    console.log(`Trang tạo phiếu khám: http://localhost:${PORT}/phieukham`);
});