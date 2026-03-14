import swaggerJsdoc from "swagger-jsdoc";
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hệ thống quản lý phòng khám đa khoa',
      version: '1.0.0',
      description: 'Tài liệu API cho hệ thống Quản lý phòng khám đa khoa',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Đảm bảo đúng port backend của bạn
        description: 'Local server',
      },
    ],
    // Thêm phần này để tránh lỗi nếu chưa có paths nào được quét thành công
    paths: {}, 
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    // Áp dụng bảo mật cho toàn bộ API (tùy chọn)
    security: [{
      bearerAuth: [],
    }],
  },

  apis: [path.relative(process.cwd(), 'backend/src/routes/authRoutes.js')], // Đường dẫn tương đối đến file chứa các chú thích Swagger
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;