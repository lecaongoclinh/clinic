
-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS ClinicManagement;
USE ClinicManagement;

-- Tạm dừng kiểm tra khóa ngoại để xóa bảng cũ (nếu có) mà không bị lỗi
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ChiTietHoaDon, HoaDon, DichVu, DonThuoc, ChiTietPhieuNhap, 
                     PhieuNhapThuoc, NhaCungCap, Thuoc, BenhAn, PhieuKham, 
                     LichKham, LichLamViecBacSi, PhongKham, BenhNhan, 
                     NhanVien, ChuyenKhoa, VaiTro;
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

-- 7. Bảng Lịch Khám (Hẹn trước)
CREATE TABLE LichKham (
    MaLK INT AUTO_INCREMENT PRIMARY KEY,
    MaBN INT NOT NULL,
    MaBacSi INT NOT NULL,
    NgayHen DATE NOT NULL,
    GioHen TIME,
    LyDoKham TEXT,
    TrangThai ENUM('ChoXacNhan','DaXacNhan','DaHuy','DaKham') DEFAULT 'ChoXacNhan',
    FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    FOREIGN KEY (MaBacSi) REFERENCES NhanVien(MaNV)
);

-- 8. Bảng Phiếu Khám (Tiếp nhận thực tế)
CREATE TABLE PhieuKham (
    MaPK INT AUTO_INCREMENT PRIMARY KEY,
    MaLK INT,
    MaLeTan INT,
    MaPhong INT,
    STT INT,
    NgayKham DATE DEFAULT (CURRENT_DATE),
    TrangThai ENUM('ChoKham','DangKham','DaKham','BoVe') DEFAULT 'ChoKham',
    FOREIGN KEY (MaLK) REFERENCES LichKham(MaLK),
    FOREIGN KEY (MaLeTan) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaPhong) REFERENCES PhongKham(MaPhong)
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

-- 15. Bảng Dịch Vụ
CREATE TABLE DichVu (
    MaDichVu INT AUTO_INCREMENT PRIMARY KEY,
    TenDichVu VARCHAR(100),
    Gia DECIMAL(10,2),
    Loai ENUM('KhamBenh','XetNghiem','SieuAm')
);

-- 16. Bảng Hóa Đơn
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

-- 17. Bảng Chi Tiết Hóa Đơn
CREATE TABLE ChiTietHoaDon (
    MaCTHD INT AUTO_INCREMENT PRIMARY KEY,
    MaHD INT,
    MaDichVu INT,
    SoTien DECIMAL(10,2),
    FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu)
);

-- 1. Vai Trò
INSERT INTO VaiTro (TenVaiTro) VALUES ('Admin'), ('Bac Si'), ('Le Tan'), ('Ke Toan');

-- 2. Chuyên Khoa
INSERT INTO ChuyenKhoa (TenChuyenKhoa) VALUES ('Noi Tong Quat'), ('Nhi Khoa'), ('San Phu Khoa'), ('Da Lieu');

-- 3. Nhân Viên
INSERT INTO NhanVien (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa) VALUES 
('Nguyen Van A', '0901234567', 'admin@clinic.com', 'admin', 'pass123', 1, NULL),
('BS. Le Van B', '0912345678', 'bsb@clinic.com', 'doctor_b', 'doctor123', 2, 1),
('Tran Thi C', '0923456789', 'letan_c@clinic.com', 'letan_c', 'letan123', 3, NULL);

-- 4. Bệnh Nhân
INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email) VALUES 
('Pham Van D', '1990-05-15', 'Nam', '123 Ly Tu Trong, Da Nang', '0934567890', 'd@gmail.com'),
('Le Thi E', '1995-10-20', 'Nu', '456 Nguyen Huệ, TP HCM', '0945678901', 'e@gmail.com');

-- 5. Phòng Khám
INSERT INTO PhongKham (TenPhong, GhiChu) VALUES 
('Phong 101', 'Phong Kham Noi'),
('Phong 102', 'Phong Kham Nhi');

-- 6. Lịch Làm Việc Bác Sĩ
INSERT INTO LichLamViecBacSi (MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc) VALUES 
(2, 1, '2026-03-20', '08:00:00', '11:30:00');

-- 7. Lịch Khám
INSERT INTO LichKham (MaBN, MaBacSi, NgayHen, GioHen, LyDoKham, TrangThai) VALUES 
(1, 2, '2026-03-20', '08:30:00', 'Đau dạ dày', 'DaXacNhan');

-- 8. Phiếu Khám
INSERT INTO PhieuKham (MaLK, MaLeTan, MaPhong, STT, TrangThai) VALUES 
(1, 3, 1, 1, 'DangKham');

-- 9. Bệnh Án
INSERT INTO BenhAn (MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu) VALUES 
(1, 2, 'Đau vùng thượng vị', 'Viêm loét dạ dày nhẹ', 'Kiêng ăn đồ cay nóng');

-- 10. Thuốc
INSERT INTO Thuoc (TenThuoc, DonViTinh, SoLuongTon, GiaNhap, GiaBan, HanSuDung) VALUES 
('Paracetamol 500mg', 'Viên', 1000, 500.00, 1500.00, '2027-12-31'),
('Maalox', 'Gói', 200, 3500.00, 6000.00, '2026-05-15');

-- 11. Đơn Thuốc
INSERT INTO DonThuoc (MaBA) VALUES (1);

-- 12. Dịch Vụ
INSERT INTO DichVu (TenDichVu, Gia, Loai) VALUES 
('Kham benh noi', 150000.00, 'KhamBenh'),
('Sieu am bung', 300000.00, 'SieuAm');

-- 13. Hóa Đơn
INSERT INTO HoaDon (MaBA, MaNhanVien, PhuongThucThanhToan, TrangThai) VALUES 
(1, 1, 'TienMat', 'DaThanhToan');

-- 14. Chi Tiết Hóa Đơn
INSERT INTO ChiTietHoaDon (MaHD, MaDichVu, SoTien) VALUES 
(1, 1, 150000.00),
(1, 2, 300000.00);

-- Sửa db
ALTER TABLE LichKham
ADD MaLich INT,
ADD FOREIGN KEY (MaLich) REFERENCES LichLamViecBacSi(MaLich);

CREATE TABLE ChiTietDonThuoc (
    MaCTDT INT AUTO_INCREMENT PRIMARY KEY,
    MaDT INT,
    MaThuoc INT,
    SoLuong INT,
    LieuDung VARCHAR(255),
    FOREIGN KEY (MaDT) REFERENCES DonThuoc(MaDT),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);

ALTER TABLE PhieuKham
ADD MaLich INT,
ADD FOREIGN KEY (MaLich) REFERENCES LichLamViecBacSi(MaLich);
-- fix
ALTER TABLE PhieuKham ADD COLUMN MaBN INT NULL;
ALTER TABLE PhieuKham ADD FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN);

db chị thêm mấy cái này
--them--

INSERT INTO NhaCungCap (TenNCC, DiaChi, SoDienThoai) VALUES
('Công ty TNHH Dược phẩm TW1 - Chi nhánh Miền Bắc', 'Số 179 Giải Phóng, Đống Đa, Hà Nội', '02438693489'),
('Công ty Cổ phần Dược Hậu Giang (DHG Pharma)', '226 Nguyễn Văn Cừ, Quận Ninh Kiều, Cần Thơ', '02923821001'),
('Công ty TNHH Stellapharm', 'Khu công nghiệp Việt Nam - Singapore II, Bình Dương', '02743888888'),
('Công ty TNHH MTV Dược phẩm OPC', '208 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh', '02838551122'),
('Công ty Cổ phần Pymepharco', '166 - 170 Nguyễn Huệ, TP. Huế, Thừa Thiên Huế', '02343826666'),
('Công ty TNHH Thương mại Dược phẩm Khải Hoàn', 'Số 68 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', '02439363388'),
('Nhà cung cấp thiết bị y tế & thuốc generic ABC', 'Tầng 5, Tòa nhà số 123 Lê Lợi, Quận 1, TP. HCM', '02838209999');

CREATE TABLE LoThuoc (
    MaLo INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT,
    SoLo VARCHAR(50),
    HanSuDung DATE,
    SoLuongTon INT,
    GiaNhap DECIMAL(10,2),
    MaCTPN INT,
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
    FOREIGN KEY (MaCTPN) REFERENCES ChiTietPhieuNhap(MaCTPN)
);


ALTER TABLE DonThuoc
ADD TrangThai ENUM('ChuaXuat','DaXuat') DEFAULT 'ChuaXuat';


ALTER TABLE Thuoc
DROP COLUMN GiaNhap,
DROP COLUMN HanSuDung;


ALTER TABLE ChiTietHoaDon
ADD MaThuoc INT NULL,
ADD FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc);


ALTER TABLE ChiTietPhieuNhap
DROP COLUMN SoLo;


ALTER TABLE PhieuNhapThuoc
ADD TongTien DECIMAL(12,2) DEFAULT 0;

CREATE TABLE Thuoc_NhaCungCap (
    MaThuoc INT,
    MaNCC INT,
    PRIMARY KEY (MaThuoc, MaNCC),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC)
);

INSERT INTO Thuoc_NhaCungCap (MaThuoc, MaNCC) VALUES
(1, 1),
(1, 2),
(2, 2),
(2, 3);

ALTER TABLE Thuoc_NhaCungCap
ADD GiaNhap DECIMAL(10,2);

INSERT INTO Thuoc (TenThuoc, DonViTinh, SoLuongTon, GiaBan) VALUES
('Amoxicillin 500mg', 'Viên', 500, 2500.00),
('Berberin 100mg', 'Lọ', 150, 15000.00),
('Vitamin C 500mg', 'Viên', 800, 1000.00),
('Decolgen Forte', 'Vỉ', 300, 18000.00),
('Panadol Extra', 'Vỉ', 450, 22000.00),
('Smecta 3g', 'Gói', 250, 7000.00),
('Efferalgan 500mg', 'Viên sủi', 400, 5500.00),
('Gaviscon', 'Gói', 180, 20000.00);