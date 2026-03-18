-- Tạo database nếu chưa có
DROP DATABASE IF EXISTS ClinicManagement;
CREATE DATABASE IF NOT EXISTS ClinicManagement;
USE ClinicManagement;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ChiTietHoaDon, HoaDon, DichVu, ChiTietDonThuoc, DonThuoc, 
                     ChiTietPhieuNhap, PhieuNhapThuoc, NhaCungCap, Thuoc, 
                     BenhAn, PhieuKham, LichKham, LichLamViecBacSi, 
                     PhongKham, BenhNhan, NhanVien, ChuyenKhoa, VaiTro;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Bảng Vai Trò
CREATE TABLE VaiTro (
    MaVaiTro INT AUTO_INCREMENT PRIMARY KEY,
    TenVaiTro VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Bảng Chuyên Khoa
CREATE TABLE ChuyenKhoa (
    MaChuyenKhoa INT AUTO_INCREMENT PRIMARY KEY,
    TenChuyenKhoa VARCHAR(100) NOT NULL
);

-- 3. Bảng Nhân Viên
CREATE TABLE NhanVien (
    MaNV INT AUTO_INCREMENT PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(15),
    Email VARCHAR(100),
    Username VARCHAR(50) UNIQUE,
    Password VARCHAR(255),
    MaVaiTro INT NOT NULL,
    MaChuyenKhoa INT NULL,
    TrangThai BOOLEAN DEFAULT TRUE,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro),
    FOREIGN KEY (MaChuyenKhoa) REFERENCES ChuyenKhoa(MaChuyenKhoa)
);

-- 4. Bảng Bệnh Nhân
CREATE TABLE BenhNhan (
    MaBN INT AUTO_INCREMENT PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    NgaySinh DATE,
    GioiTinh ENUM('Nam','Nu','Khac'),
    DiaChi TEXT,
    SoDienThoai VARCHAR(15) UNIQUE,
    Email VARCHAR(100),
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Phòng Khám
CREATE TABLE PhongKham (
    MaPhong INT AUTO_INCREMENT PRIMARY KEY,
    TenPhong VARCHAR(50) NOT NULL,
    GhiChu TEXT
);

-- 6. Bảng Lịch Làm Việc Bác Sĩ
CREATE TABLE LichLamViecBacSi (
    MaLich INT AUTO_INCREMENT PRIMARY KEY,
    MaBacSi INT NOT NULL,
    MaPhong INT,
    NgayLam DATE,
    GioBatDau TIME,
    GioKetThuc TIME,
    FOREIGN KEY (MaBacSi) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaPhong) REFERENCES PhongKham(MaPhong)
);

-- 7. Bảng Lịch Khám 
CREATE TABLE LichKham (
    MaLK INT AUTO_INCREMENT PRIMARY KEY,
    MaBN INT NOT NULL,
    MaBacSi INT NOT NULL,
    NgayHen DATE NOT NULL,
    GioHen TIME,
    LyDoKham TEXT,
    TrangThai ENUM('ChoXacNhan','DaXacNhan','DaHuy','DaKham') DEFAULT 'ChoXacNhan',
    MaLich INT,
    FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    FOREIGN KEY (MaBacSi) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaLich) REFERENCES LichLamViecBacSi(MaLich)
);

-- 8. Bảng Phiếu Khám (Tiếp nhận thực tế)
CREATE TABLE PhieuKham (
    MaPK INT AUTO_INCREMENT PRIMARY KEY,
    MaBN INT NOT NULL,
    MaLK INT NULL,
    MaLeTan INT,
    MaPhong INT,
    MaBacSi INT NULL,
    MaChuyenKhoa INT NULL,
    MaLich INT NULL,
    STT INT,
    NgayKham DATE DEFAULT (CURRENT_DATE),
    TrangThai ENUM('ChoKham','DangKham','DaKham','BoVe') DEFAULT 'ChoKham',
    FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    FOREIGN KEY (MaLK) REFERENCES LichKham(MaLK),
    FOREIGN KEY (MaLeTan) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaPhong) REFERENCES PhongKham(MaPhong),
    FOREIGN KEY (MaBacSi) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaChuyenKhoa) REFERENCES ChuyenKhoa(MaChuyenKhoa),
    FOREIGN KEY (MaLich) REFERENCES LichLamViecBacSi(MaLich)
);

-- 9. Bảng Bệnh Án
CREATE TABLE BenhAn (
    MaBA INT AUTO_INCREMENT PRIMARY KEY,
    MaPK INT NOT NULL,
    MaBacSi INT NOT NULL,
    TrieuChung TEXT,
    ChuanDoan TEXT,
    GhiChu TEXT,
    NgayLap TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaPK) REFERENCES PhieuKham(MaPK),
    FOREIGN KEY (MaBacSi) REFERENCES NhanVien(MaNV)
);

-- 10. Bảng Thuốc
CREATE TABLE Thuoc (
    MaThuoc INT AUTO_INCREMENT PRIMARY KEY,
    TenThuoc VARCHAR(100) NOT NULL,
    DonViTinh VARCHAR(20),
    SoLuongTon INT DEFAULT 0,
    GiaNhap DECIMAL(10,2),
    GiaBan DECIMAL(10,2),
    HanSuDung DATE
);

-- 11. Bảng Nhà Cung Cấp
CREATE TABLE NhaCungCap (
    MaNCC INT AUTO_INCREMENT PRIMARY KEY,
    TenNCC VARCHAR(100),
    DiaChi TEXT,
    SoDienThoai VARCHAR(15)
);

-- 12. Bảng Phiếu Nhập Thuốc
CREATE TABLE PhieuNhapThuoc (
    MaPN INT AUTO_INCREMENT PRIMARY KEY,
    MaNCC INT,
    MaNhanVien INT,
    NgayNhap DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNV)
);

-- 13. Bảng Chi Tiết Phiếu Nhập
CREATE TABLE ChiTietPhieuNhap (
    MaCTPN INT AUTO_INCREMENT PRIMARY KEY,
    MaPN INT,
    MaThuoc INT,
    SoLuong INT NOT NULL,
    GiaNhap DECIMAL(10,2),
    FOREIGN KEY (MaPN) REFERENCES PhieuNhapThuoc(MaPN),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);

-- 14. Bảng Đơn Thuốc
CREATE TABLE DonThuoc (
    MaDT INT AUTO_INCREMENT PRIMARY KEY,
    MaBA INT NOT NULL,
    NgayKeDon TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MaBA) REFERENCES BenhAn(MaBA)
);

-- 15. Bảng Chi Tiết Đơn Thuốc
CREATE TABLE ChiTietDonThuoc (
    MaCTDT INT AUTO_INCREMENT PRIMARY KEY,
    MaDT INT,
    MaThuoc INT,
    SoLuong INT,
    LieuDung VARCHAR(255),
    FOREIGN KEY (MaDT) REFERENCES DonThuoc(MaDT),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);

-- 16. Bảng Dịch Vụ
CREATE TABLE DichVu (
    MaDichVu INT AUTO_INCREMENT PRIMARY KEY,
    TenDichVu VARCHAR(100),
    Gia DECIMAL(10,2),
    Loai ENUM('KhamBenh','XetNghiem','SieuAm')
);

-- 17. Bảng Hóa Đơn
CREATE TABLE HoaDon (
    MaHD INT AUTO_INCREMENT PRIMARY KEY,
    MaBA INT,
    MaNhanVien INT,
    PhuongThucThanhToan ENUM('TienMat','ChuyenKhoan'),
    NgayThanhToan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TrangThai ENUM('ChuaThanhToan','DaThanhToan') DEFAULT 'ChuaThanhToan',
    FOREIGN KEY (MaBA) REFERENCES BenhAn(MaBA),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNV)
);

-- 18. Bảng Chi Tiết Hóa Đơn
CREATE TABLE ChiTietHoaDon (
    MaCTHD INT AUTO_INCREMENT PRIMARY KEY,
    MaHD INT,
    MaDichVu INT,
    SoTien DECIMAL(10,2),
    FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu)
);


-- 1. Vai Trò
INSERT INTO VaiTro (TenVaiTro) VALUES 
('Admin'), 
('Bac Si'), 
('Le Tan'), 
('Ke Toan');

-- 2. Chuyên Khoa
INSERT INTO ChuyenKhoa (TenChuyenKhoa) VALUES 
('Nội Tổng Quát'), 
('Nhi Khoa'), 
('Sản Phụ Khoa'), 
('Da Liễu'),
('Tim Mạch'),
('Tai Mũi Họng');

-- 3. Nhân Viên
INSERT INTO NhanVien (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa) VALUES 
-- Admin
('Nguyen Van A', '0901234567', 'admin@clinic.com', 'admin', '123456', 1, NULL),
-- Bác sĩ
('BS. Le Van B', '0912345678', 'bsb@clinic.com', 'bsb', '123456', 2, 1),
('BS. Tran Thi C', '0923456789', 'bsc@clinic.com', 'bsc', '123456', 2, 2),
('BS. Pham Van D', '0934567890', 'bsd@clinic.com', 'bsd', '123456', 2, 3),
('BS. Nguyen Thi E', '0945678901', 'bse@clinic.com', 'bse', '123456', 2, 4),
('BS. Hoang Van F', '0956789012', 'bsf@clinic.com', 'bsf', '123456', 2, 5),
-- Lễ tân
('Tran Thi G', '0967890123', 'letang@clinic.com', 'letang', '123456', 3, NULL),
('Le Van H', '0978901234', 'letanh@clinic.com', 'letanh', '123456', 3, NULL);

-- Thêm bác sĩ cho tất cả các chuyên khoa
INSERT INTO NhanVien (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa) VALUES 
-- Bác sĩ chuyên khoa Nội Tổng Quát (MaChuyenKhoa = 1)
('BS. Nguyen Van Minh', '0987654321', 'bs.minh@clinic.com', 'bsminh', '123456', 2, 1),
('BS. Tran Thi Hong', '0976543210', 'bs.hong@clinic.com', 'bshong', '123456', 2, 1),

-- Bác sĩ chuyên khoa Nhi Khoa (MaChuyenKhoa = 2)
('BS. Le Van Thanh', '0965432109', 'bs.thanh@clinic.com', 'bsthanh', '123456', 2, 2),
('BS. Pham Thi Lan', '0954321098', 'bs.lan@clinic.com', 'bslan', '123456', 2, 2),

-- Bác sĩ chuyên khoa Sản Phụ Khoa (MaChuyenKhoa = 3)
('BS. Hoang Thi Huong', '0943210987', 'bs.huong@clinic.com', 'bshuong', '123456', 2, 3),
('BS. Nguyen Thi Thanh', '0932109876', 'bs.thanh@clinic.com', 'bsthanh2', '123456', 2, 3),

-- Bác sĩ chuyên khoa Da Liễu (MaChuyenKhoa = 4)
('BS. Tran Van Duc', '0921098765', 'bs.duc@clinic.com', 'bsduc', '123456', 2, 4),
('BS. Le Thi Ngoc', '0910987654', 'bs.ngoc@clinic.com', 'bsngoc', '123456', 2, 4),

-- Bác sĩ chuyên khoa Tim Mạch (MaChuyenKhoa = 5)
('BS. Pham Van Cuong', '0909876543', 'bs.cuong@clinic.com', 'bscuong', '123456', 2, 5),
('BS. Nguyen Thi Kim', '0898765432', 'bs.kim@clinic.com', 'bskim', '123456', 2, 5),

-- Bác sĩ chuyên khoa Tai Mũi Họng (MaChuyenKhoa = 6)
('BS. Hoang Van Anh', '0887654321', 'bs.anh@clinic.com', 'bsanh', '123456', 2, 6),
('BS. Tran Thi Thu', '0876543210', 'bs.thu@clinic.com', 'bsthu', '123456', 2, 6);

-- 4. Bệnh Nhân
INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email) VALUES 
('Pham Van D', '1990-05-15', 'Nam', '123 Ly Tu Trong, Da Nang', '0934567890', 'd@gmail.com'),
('Le Thi E', '1995-10-20', 'Nu', '456 Nguyen Hue, TP HCM', '0945678901', 'e@gmail.com'),
('Tran Van F', '1988-03-10', 'Nam', '789 Le Loi, Ha Noi', '0956789012', 'f@gmail.com'),
('Nguyen Thi G', '1992-12-25', 'Nu', '321 Tran Phu, Da Nang', '0967890123', 'g@gmail.com'),
('Hoang Van H', '1985-07-30', 'Nam', '654 Hai Ba Trung, TP HCM', '0978901234', 'h@gmail.com');

-- 5. Phòng Khám
INSERT INTO PhongKham (TenPhong, GhiChu) VALUES 
('Phòng 101 - Nội Tổng Quát', 'Tầng 1'),
('Phòng 102 - Nhi Khoa', 'Tầng 1'),
('Phòng 103 - Sản Phụ Khoa', 'Tầng 1'),
('Phòng 201 - Da Liễu', 'Tầng 2'),
('Phòng 202 - Tim Mạch', 'Tầng 2'),
('Phòng 203 - Tai Mũi Họng', 'Tầng 2');

-- 6. Lịch Làm Việc Bác Sĩ
INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc) VALUES 
-- BS. Le Van B (Nội Tổng Quát)
(2, 1, CURDATE(), '07:30:00', '11:30:00'),
(2, 1, CURDATE(), '13:30:00', '17:30:00'),
-- BS. Tran Thi C (Nhi Khoa)
(3, 2, CURDATE(), '07:30:00', '11:30:00'),
(3, 2, CURDATE(), '13:30:00', '17:30:00'),
-- BS. Pham Van D (Sản Phụ Khoa)
(4, 3, CURDATE(), '07:30:00', '11:30:00'),
(4, 3, CURDATE(), '13:30:00', '17:30:00');

-- Thêm lịch làm việc cho các bác sĩ mới
INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc) 
SELECT 
    nv.MaNV,
    CASE 
        WHEN nv.MaChuyenKhoa = 1 THEN 1  -- Nội Tổng Quát - Phòng 101
        WHEN nv.MaChuyenKhoa = 2 THEN 2  -- Nhi Khoa - Phòng 102
        WHEN nv.MaChuyenKhoa = 3 THEN 3  -- Sản Phụ Khoa - Phòng 103
        WHEN nv.MaChuyenKhoa = 4 THEN 4  -- Da Liễu - Phòng 201
        WHEN nv.MaChuyenKhoa = 5 THEN 5  -- Tim Mạch - Phòng 202
        WHEN nv.MaChuyenKhoa = 6 THEN 6  -- Tai Mũi Họng - Phòng 203
    END AS MaPhong,
    CURDATE() AS NgayLam,
    '07:30:00' AS GioBatDau,
    '11:30:00' AS GioKetThuc
FROM NhanVien nv
WHERE nv.MaVaiTro = 2 
  AND nv.MaNV > 6  -- Chỉ lấy bác sĩ mới thêm (có MaNV > 6)
UNION ALL
SELECT 
    nv.MaNV,
    CASE 
        WHEN nv.MaChuyenKhoa = 1 THEN 1
        WHEN nv.MaChuyenKhoa = 2 THEN 2
        WHEN nv.MaChuyenKhoa = 3 THEN 3
        WHEN nv.MaChuyenKhoa = 4 THEN 4
        WHEN nv.MaChuyenKhoa = 5 THEN 5
        WHEN nv.MaChuyenKhoa = 6 THEN 6
    END,
    CURDATE(),
    '13:30:00',
    '17:30:00'
FROM NhanVien nv
WHERE nv.MaVaiTro = 2 
  AND nv.MaNV > 6;benhnhan

-- 7. Lịch Khám
INSERT INTO LichKham (MaBN, MaBacSi, NgayHen, GioHen, LyDoKham, TrangThai, MaLich) VALUES 
(1, 2, CURDATE(), '08:30:00', 'Đau dạ dày', 'DaXacNhan', 1),
(2, 3, CURDATE(), '09:00:00', 'Ho sốt', 'DaXacNhan', 3);

-- 8. Phiếu Khám
INSERT INTO PhieuKham (MaBN, MaLK, MaLeTan, MaPhong, MaBacSi, MaChuyenKhoa, MaLich, STT, TrangThai) VALUES 
(1, 1, 7, 1, 2, 1, 1, 1, 'DangKham'),
(2, 2, 7, 2, 3, 2, 3, 2, 'ChoKham');

-- 9. Bệnh Án
INSERT INTO BenhAn (MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu) VALUES 
(1, 2, 'Đau vùng thượng vị, ợ chua', 'Viêm loét dạ dày nhẹ', 'Kiêng ăn đồ cay nóng, uống thuốc đều đặn');

-- 10. Thuốc
INSERT INTO Thuoc (TenThuoc, DonViTinh, SoLuongTon, GiaNhap, GiaBan, HanSuDung) VALUES 
('Paracetamol 500mg', 'Viên', 1000, 500.00, 1500.00, '2027-12-31'),
('Maalox', 'Gói', 200, 3500.00, 6000.00, '2026-05-15'),
('Amoxicillin 500mg', 'Viên', 500, 800.00, 2000.00, '2026-08-20'),
('Vitamin C', 'Viên', 300, 200.00, 500.00, '2026-10-30');

-- 11. Đơn Thuốc
INSERT INTO DonThuoc (MaBA) VALUES (1);

-- 12. Chi Tiết Đơn Thuốc
INSERT INTO ChiTietDonThuoc (MaDT, MaThuoc, SoLuong, LieuDung) VALUES 
(1, 1, 20, 'Uống 1 viên khi đau'),
(1, 2, 10, 'Uống 1 gói sau ăn');

-- 13. Dịch Vụ
INSERT INTO DichVu (TenDichVu, Gia, Loai) VALUES 
('Khám bệnh nội tổng quát', 150000.00, 'KhamBenh'),
('Khám nhi khoa', 150000.00, 'KhamBenh'),
('Siêu âm bụng', 300000.00, 'SieuAm'),
('Xét nghiệm máu', 200000.00, 'XetNghiem');

-- 14. Hóa Đơn
INSERT INTO HoaDon (MaBA, MaNhanVien, PhuongThucThanhToan, TrangThai) VALUES 
(1, 1, 'TienMat', 'DaThanhToan');

-- 15. Chi Tiết Hóa Đơn
INSERT INTO ChiTietHoaDon (MaHD, MaDichVu, SoTien) VALUES 
(1, 1, 150000.00),
(1, 3, 300000.00);


SET SQL_SAFE_UPDATES = 0;
DELETE FROM PhieuKham;
SET SQL_SAFE_UPDATES = 1;

