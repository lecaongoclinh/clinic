
-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS ClinicManagement;
USE ClinicManagement;

-- Tạm dừng kiểm tra khóa ngoại để xóa bảng cũ (nếu có) mà không bị lỗi
SET FOREIGN_KEY_CHECKS = 0;

# bổ sung thêm các bảng mới tạo 

DROP TABLE IF EXISTS 
            ChiTietKiemKe, PhieuKiemKe,
            ChiTietPhieuXuat, PhieuXuatThuoc,
            PhieuHuyThuoc, LichSuKho,
            LoThuoc, Kho,
            ChiTietHoaDon, HoaDon, DichVu, DonThuoc,
            ChiTietPhieuNhap, PhieuNhapThuoc,
            Thuoc_NhaCungCap, NhaCungCap, Thuoc,
            BenhAn, PhieuKham, LichKham,
            LichLamViecBacSi, PhongKham,
            BenhNhan, NhanVien, ChuyenKhoa, VaiTro;
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
INSERT INTO ChuyenKhoa (MaChuyenKhoa, TenChuyenKhoa) VALUES 
(1, 'Khoa Nội Tổng Quát'),
(2, 'Nhi Khoa'),
(3, 'Sản Phụ Khoa'),
(4, 'Da Liễu'),
(5, 'Tim Mạch'),
(6, 'Khoa Tai Mũi Họng');
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

#đổi tên trường từ từ DonViTinh sang DonViCoBan

-- 10. Bảng Thuốc
CREATE TABLE Thuoc (
    MaThuoc INT AUTO_INCREMENT PRIMARY KEY,
    TenThuoc VARCHAR(100) NOT NULL,
    DonViCoBan VARCHAR(20),
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

ALTER TABLE PhieuKham ADD COLUMN MaBN INT NULL;
ALTER TABLE PhieuKham ADD FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN);

ALTER TABLE PhieuKham 
ADD COLUMN GioTao TIME;

CREATE TABLE LoThuoc (
    MaLo INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT,
    MaCTPN INT,
    SoLo VARCHAR(50),
    HanSuDung DATE,
    GiaNhap DECIMAL(10,2),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
    FOREIGN KEY (MaCTPN) REFERENCES ChiTietPhieuNhap(MaCTPN)
);


ALTER TABLE DonThuoc
ADD TrangThai ENUM('ChuaXuat','DaXuat') DEFAULT 'ChuaXuat';

ALTER TABLE ChiTietHoaDon
ADD MaThuoc INT NULL,
ADD FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc);


ALTER TABLE Thuoc 
DROP COLUMN GiaNhap,
DROP COLUMN HanSuDung,
DROP COLUMN SoLuongTon;


ALTER TABLE Thuoc
ADD HoatChat VARCHAR(255),
ADD HamLuong VARCHAR(100),
ADD DangBaoChe VARCHAR(100),
ADD QuyCachDongGoi VARCHAR(100),
ADD HangSanXuat VARCHAR(255),
ADD NuocSanXuat VARCHAR(100),
ADD NhietDoBaoQuan VARCHAR(50),
ADD MaVach VARCHAR(100),
ADD LoaiThuoc ENUM('ThuocKeDon','KhongKeDon','VatTuYTe'),
ADD TrangThai BOOLEAN DEFAULT TRUE;


ALTER TABLE NhaCungCap
ADD Email VARCHAR(100),
ADD MaSoThue VARCHAR(50),
ADD NguoiLienHe VARCHAR(100),
ADD DieuKhoanThanhToan TEXT;


CREATE TABLE Thuoc_NhaCungCap (
    MaThuoc INT,
    MaNCC INT,
    GiaNhap DECIMAL(10,2),
    PRIMARY KEY (MaThuoc, MaNCC),
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC)
);


CREATE TABLE Kho (
    MaKho INT AUTO_INCREMENT PRIMARY KEY,
    TenKho VARCHAR(100),
    NhietDoToiThieu FLOAT,
    NhietDoToiDa FLOAT,
    TrangThai BOOLEAN DEFAULT TRUE
);


ALTER TABLE PhieuNhapThuoc
ADD TongTien DECIMAL(12,2) DEFAULT 0,
ADD LoaiPhieu ENUM('NhapMua','NhapTra','NhapKhac') DEFAULT 'NhapMua',
ADD GhiChu TEXT;


ALTER TABLE LoThuoc
ADD NgaySanXuat DATE,
ADD NhietDoBaoQuan VARCHAR(50),
ADD TrangThai ENUM('ConHan','SapHetHan','HetHan','DaHuy') DEFAULT 'ConHan',
ADD SoLuongNhap INT,
ADD SoLuongDaXuat INT DEFAULT 0,
ADD GhiChu TEXT,
ADD MaKho INT,
ADD MaNCC INT;

ALTER TABLE LoThuoc
ADD FOREIGN KEY (MaKho) REFERENCES Kho(MaKho),
ADD FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC);


CREATE TABLE PhieuXuatThuoc (
    MaPX INT AUTO_INCREMENT PRIMARY KEY,
    MaNhanVien INT,
    MaKho INT,
    LoaiXuat ENUM('BanChoBN','NoiBo','TraNCC','Huy'),
    MaBN INT NULL,
    NgayXuat DATETIME DEFAULT CURRENT_TIMESTAMP,
    GhiChu TEXT,
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho),
    FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN)
);


CREATE TABLE ChiTietPhieuXuat (
    MaCTPX INT AUTO_INCREMENT PRIMARY KEY,
    MaPX INT,
    MaLo INT,
    SoLuong INT,
    DonGia DECIMAL(10,2),
    ThanhTien DECIMAL(12,2),
    FOREIGN KEY (MaPX) REFERENCES PhieuXuatThuoc(MaPX),
    FOREIGN KEY (MaLo) REFERENCES LoThuoc(MaLo)
);


CREATE TABLE PhieuKiemKe (
    MaKK INT AUTO_INCREMENT PRIMARY KEY,
    MaKho INT,
    MaNhanVien INT,
    NgayKiemKe DATETIME DEFAULT CURRENT_TIMESTAMP,
    TrangThai ENUM('Nhap','DaDuyet'),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNV)
);


CREATE TABLE ChiTietKiemKe (
    MaCTKK INT AUTO_INCREMENT PRIMARY KEY,
    MaKK INT,
    MaLo INT,
    SoLuongHeThong INT,
    SoLuongThucTe INT,
    ChenhLech INT,
    LyDo TEXT,
    FOREIGN KEY (MaKK) REFERENCES PhieuKiemKe(MaKK),
    FOREIGN KEY (MaLo) REFERENCES LoThuoc(MaLo)
);


CREATE TABLE LichSuKho (
    MaLS INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT,
    MaLo INT,
    Loai ENUM('Nhap','Xuat','KiemKe','Huy'),
    SoLuong INT,
    ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
    ThamChieuID INT,
    GhiChu TEXT
);

CREATE TABLE PhieuHuyThuoc (
    MaHuy INT AUTO_INCREMENT PRIMARY KEY,
    MaLo INT,
    SoLuong INT,
    LyDo TEXT,
    NgayHuy DATETIME DEFAULT CURRENT_TIMESTAMP,
    MaNhanVien INT,
    FOREIGN KEY (MaLo) REFERENCES LoThuoc(MaLo),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNV)
);

CREATE TABLE QuyDoiDonVi (
    MaQD INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT,
    TenDonVi VARCHAR(50),   -- Vien, Vi, Hop, Thung
    SoLuong INT,            -- số lượng quy đổi về đơn vị cơ bản
    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);

-- thêm ---

ALTER TABLE PhieuXuatThuoc
ADD TrangThai ENUM('Nhap','HoanThanh','Huy') DEFAULT 'Nhap';


ALTER TABLE PhieuXuatThuoc
ADD MaDT INT NULL,
ADD FOREIGN KEY (MaDT) REFERENCES DonThuoc(MaDT);



ALTER TABLE PhieuXuatThuoc
ADD TongTien DECIMAL(12,2) DEFAULT 0,
ADD MaNCC INT NULL,
ADD LyDoHuy TEXT;

ALTER TABLE PhieuXuatThuoc
ADD FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC);

ALTER TABLE LoThuoc
ADD CONSTRAINT chk_trangthai_lo 
CHECK (TrangThai IN ('ConHan','SapHetHan','HetHan','DaHuy'));

ALTER TABLE DichVu
ADD COLUMN MaDV VARCHAR(20) UNIQUE NULL,
ADD COLUMN MoTa TEXT NULL,
ADD COLUMN TrangThai TINYINT(1) DEFAULT 1;

UPDATE DichVu
SET MaDV = CONCAT(
    CASE 
        WHEN Loai = 'KhamBenh' THEN 'DVK'
        WHEN Loai = 'XetNghiem' THEN 'DVX'
        WHEN Loai = 'SieuAm' THEN 'DVS'
        ELSE 'DV'
    END,
    LPAD(MaDichVu, 3, '0')
)
WHERE MaDV IS NULL;


INSERT INTO DichVu (TenDichVu, Gia, Loai, MaDV, MoTa, TrangThai) VALUES
('Khám nội tổng quát', 250000, 'KhamBenh', 'DVK001', 'Khám lâm sàng tổng quát cho bệnh nhân', 1),
('Xét nghiệm công thức máu', 180000, 'XetNghiem', 'DVX001', 'Phân tích chỉ số máu cơ bản', 1),
('Siêu âm ổ bụng', 450000, 'SieuAm', 'DVS001', 'Siêu âm tổng quát vùng ổ bụng', 1),
('Khám tai mũi họng', 220000, 'KhamBenh', 'DVK002', 'Khám chuyên khoa tai mũi họng', 1),
('Xét nghiệm đường huyết', 120000, 'XetNghiem', 'DVX002', 'Đo nồng độ đường huyết trong máu', 1);


CREATE TABLE GoiDichVu (
    MaGoi INT AUTO_INCREMENT PRIMARY KEY,
    MaGDV VARCHAR(20) UNIQUE NULL,
    TenGoi VARCHAR(150) NOT NULL,
    MoTa TEXT NULL,
    GiaGoi DECIMAL(12,2) NOT NULL DEFAULT 0,
    TrangThai TINYINT(1) DEFAULT 1,
    MauHienThi VARCHAR(20) NULL,
    BieuTuong VARCHAR(50) NULL,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ChiTietGoiDichVu (
    MaCTGoi INT AUTO_INCREMENT PRIMARY KEY,
    MaGoi INT NOT NULL,
    MaDichVu INT NOT NULL,
    SoLuong INT DEFAULT 1,
    GhiChu VARCHAR(255) NULL,
    FOREIGN KEY (MaGoi) REFERENCES GoiDichVu(MaGoi) ON DELETE CASCADE,
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu) ON DELETE CASCADE,
    UNIQUE KEY uq_goi_dichvu (MaGoi, MaDichVu)
);

ALTER TABLE DichVu
ADD COLUMN ThoiLuongPhut INT DEFAULT 15,
ADD COLUMN CanDatTruoc TINYINT(1) DEFAULT 0,
ADD COLUMN CanChiDinhBacSi TINYINT(1) DEFAULT 0,
ADD COLUMN HuongDanTruocKham TEXT NULL,
ADD COLUMN ThuTuHienThi INT DEFAULT 0,
ADD COLUMN MauNhan VARCHAR(20) NULL,
ADD COLUMN MaChuyenKhoa INT NULL,
ADD FOREIGN KEY (MaChuyenKhoa) REFERENCES ChuyenKhoa(MaChuyenKhoa);

CREATE TABLE chuyenkhoaCauHinhDichVu (
    MaCauHinh INT AUTO_INCREMENT PRIMARY KEY,
    MaDichVu INT NOT NULL UNIQUE,
    ThoiLuongPhut INT DEFAULT 15,
    CanDatTruoc TINYINT(1) DEFAULT 0,
    CanChiDinhBacSi TINYINT(1) DEFAULT 0,
    HuongDanTruocKham TEXT NULL,
    ThuTuHienThi INT DEFAULT 0,
    MauNhan VARCHAR(20) NULL,
    MaChuyenKhoa INT NULL,
    FOREIGN KEY (MaDichVu) REFERENCES DichVu(MaDichVu) ON DELETE CASCADE,
    FOREIGN KEY (MaChuyenKhoa) REFERENCES ChuyenKhoa(MaChuyenKhoa)
);

INSERT INTO GoiDichVu (
    TenGoi,
    MoTa,
    GiaGoi,
    TrangThai,
    BieuTuong,
    MauHienThi
) VALUES
(
    'Gói khám sức khỏe tổng quát',
    'Gói khám dành cho kiểm tra sức khỏe định kỳ cơ bản',
    1250000,
    1,
    'fa-heartbeat',
    '#2563eb'
),
(
    'Gói chăm sóc thai kỳ',
    'Gói theo dõi và chăm sóc thai kỳ định kỳ',
    8400000,
    1,
    'fa-user-md',
    '#7c3aed'
),
(
    'Gói tầm soát tim mạch',
    'Gói kiểm tra sức khỏe tim mạch và các chỉ số liên quan',
    2100000,
    1,
    'fa-heart',
    '#dc2626'
);

INSERT INTO ChiTietGoiDichVu (MaGoi, MaDichVu, SoLuong, GhiChu) VALUES
(1, 1, 1, 'Khám tổng quát ban đầu'),
(1, 2, 1, 'Xét nghiệm máu định kỳ'),
(1, 5, 1, 'Kiểm tra đường huyết'),

(2, 1, 1, 'Khám định kỳ thai kỳ'),
(2, 3, 2, 'Siêu âm thai'),
(2, 5, 1, 'Theo dõi đường huyết thai kỳ'),

(3, 1, 1, 'Khám nội tổng quát'),
(3, 2, 1, 'Xét nghiệm máu'),
(3, 5, 1, 'Kiểm tra đường huyết');

INSERT INTO chuyenkhoaCauHinhDichVu (
    MaDichVu,
    ThoiLuongPhut,
    CanDatTruoc,
    CanChiDinhBacSi,
    MaChuyenKhoa,
    ThuTuHienThi,
    MauNhan,
    HuongDanTruocKham
) VALUES
(1, 20, 1, 0, 1, 1, '#0ea5e9', 'Nên đến trước 15 phút để làm thủ tục'),
(2, 15, 1, 1, 1, 2, '#f97316', 'Nhịn ăn 8 giờ trước khi lấy máu nếu có chỉ định'),
(3, 25, 1, 1, 1, 3, '#8b5cf6', 'Uống đủ nước trước khi siêu âm nếu bác sĩ yêu cầu'),
(4, 20, 1, 0, 1, 4, '#2563eb', 'Không dùng thuốc xịt mũi trước khi khám nếu không cần thiết'),
(5, 10, 0, 0, 1, 5, '#16a34a', 'Có thể thực hiện nhanh trong ngày');
-- 2. Bổ sung bảng HoaDon
ALTER TABLE HoaDon
ADD NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER MaNhanVien,
ADD TongTien DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER TrangThai,
ADD GhiChu TEXT NULL AFTER TongTien,
ADD MaPX INT NULL AFTER MaBA,
ADD FOREIGN KEY (MaPX) REFERENCES PhieuXuatThuoc(MaPX);

ALTER TABLE HoaDon
MODIFY NgayThanhToan TIMESTAMP NULL;

ALTER TABLE HoaDon
MODIFY TrangThai ENUM('ChuaThanhToan','DaThanhToan','QuaHan','Huy') DEFAULT 'ChuaThanhToan';

ALTER TABLE ChiTietHoaDon
ADD LoaiMuc ENUM('DichVu','Thuoc') DEFAULT 'DichVu',
ADD SoLuong INT DEFAULT 1,
ADD DonGia DECIMAL(12,2) DEFAULT 0,
ADD ThanhTien DECIMAL(12,2) DEFAULT 0,
ADD DienGiai VARCHAR(255) NULL; 

ALTER TABLE ChiTietHoaDon
ADD MaPX INT NULL,
ADD FOREIGN KEY (MaPX) REFERENCES PhieuXuatThuoc(MaPX);


INSERT INTO HoaDon
(
    MaBA, MaNhanVien, PhuongThucThanhToan, NgayThanhToan, TrangThai,
    MaHoaDon, NgayTao, TongTien, GiamGia, ThanhTienCuoi, HanThanhToan, GhiChu
)
VALUES
(1, 29, 'TienMat', NULL, 'ChuaThanhToan', 'HD00001', NOW(), 370000, 20000, 350000, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Hóa đơn khám ngoại trú'),
(1, 29, 'ChuyenKhoan', NOW(), 'DaThanhToan', 'HD00002', NOW(), 450000, 50000, 400000, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Đã thanh toán online');

INSERT INTO ChiTietHoaDon
(
    MaHD, MaDichVu, SoTien, MaThuoc, LoaiMuc, SoLuong, DonGia, ThanhTien, DienGiai, MaPX
)
VALUES
(1, 1, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Khám nội tổng quát', NULL),
(1, 2, 120000, NULL, 'DichVu', 1, 120000, 120000, 'Xét nghiệm đường huyết', NULL),
(2, 3, 450000, NULL, 'DichVu', 1, 450000, 450000, 'Siêu âm ổ bụng', NULL);

-- 4. Index hỗ trợ tra cứu và thống kê

CREATE INDEX idx_hoadon_ngaytao ON HoaDon(NgayTao);
CREATE INDEX idx_hoadon_trangthai ON HoaDon(TrangThai);
CREATE INDEX idx_hoadon_maba ON HoaDon(MaBA);

ALTER TABLE HoaDon
ADD MaPX INT NULL,
ADD CONSTRAINT fk_hoadon_mapx
FOREIGN KEY (MaPX) REFERENCES PhieuXuatThuoc(MaPX);

CREATE INDEX idx_cthd_mahd ON ChiTietHoaDon(MaHD);
CREATE INDEX idx_cthd_madichvu ON ChiTietHoaDon(MaDichVu);
CREATE INDEX idx_cthd_mathuoc ON ChiTietHoaDon(MaThuoc);
CREATE INDEX idx_cthd_loaimuc ON ChiTietHoaDon(LoaiMuc);

CREATE INDEX idx_dichvu_loai ON DichVu(Loai);
CREATE INDEX idx_dichvu_trangthai ON DichVu(TrangThai);

INSERT INTO QuyDoiDonVi (MaThuoc, TenDonVi, SoLuong) VALUES

-- ===============================
-- 1. Augmentin (Đơn vị cơ bản: Viên)
-- 1 vỉ = 7 viên | 1 hộp = 2 vỉ | 1 thùng = 100 hộp
-- ===============================
(1, 'Vien', 1),
(1, 'Vi', 7),
(1, 'Hop', 14),
(1, 'Thung', 1400),

-- ===============================
-- 2. Panadol Extra (Đơn vị cơ bản: Viên)
-- 1 vỉ = 12 viên | 1 hộp = 15 vỉ | 1 thùng = 40 hộp
-- ===============================
(2, 'Vien', 1),
(2, 'Vi', 12),
(2, 'Hop', 180),
(2, 'Thung', 7200),

-- ===============================
-- 3. Amlor (Đơn vị cơ bản: Viên)
-- 1 vỉ = 10 viên | 1 hộp = 3 vỉ
-- ===============================
(3, 'Vien', 1),
(3, 'Vi', 10),
(3, 'Hop', 30),

-- ===============================
-- 4. Glucophage (Đơn vị cơ bản: Viên)
-- 1 vỉ = 20 viên | 1 hộp = 5 vỉ
-- ===============================
(4, 'Vien', 1),
(4, 'Vi', 20),
(4, 'Hop', 100),

-- ===============================
-- 5. Paracetamol 500 (Đơn vị cơ bản: Viên)
-- ===============================
(5, 'Vien', 1),
(5, 'Vi', 10),
(5, 'Hop', 100),

-- ===============================
-- 6. Nexium Mups (Đơn vị cơ bản: Viên)
-- 1 vỉ = 7 viên | 1 hộp = 2 vỉ
-- ===============================
(6, 'Vien', 1),
(6, 'Vi', 7),
(6, 'Hop', 14),

-- ===============================
-- 7. Vitamin C (Đơn vị cơ bản: Viên)
-- ===============================
(7, 'Vien', 1),
(7, 'Vi', 10),
(7, 'Hop', 100),

-- ===============================
-- 8. Gaviscon (Đơn vị cơ bản: Gói)
-- 1 hộp = 24 gói | 1 thùng = 24 hộp
-- ===============================
(8, 'Goi', 1),
(8, 'Hop', 24),
(8, 'Thung', 576),

-- ===============================
-- 9. Smecta (Đơn vị cơ bản: Gói)
-- ===============================
(9, 'Goi', 1),
(9, 'Hop', 30),

-- ===============================
-- 10. Losartan (Đơn vị cơ bản: Viên)
-- ===============================
(10, 'Vien', 1),
(10, 'Vi', 10),
(10, 'Hop', 30);

-- ================= FIX LO THUOC + NHAP THUOC =================

ALTER TABLE ChiTietPhieuNhap
ADD DonViNhap VARCHAR(50),
ADD SoLuongNhap INT,
ADD HeSoQuyDoi INT;

-- 1. FIX MaCTPN NULL
SET SQL_SAFE_UPDATES = 0;
UPDATE LoThuoc l
JOIN ChiTietPhieuNhap ct 
    ON l.MaThuoc = ct.MaThuoc
SET l.MaCTPN = ct.MaCTPN
WHERE l.MaCTPN IS NULL;

-- 2. SET NOT NULL
ALTER TABLE LoThuoc
MODIFY MaCTPN INT NOT NULL;

-- 3. ADD UNIQUE
ALTER TABLE LoThuoc
ADD CONSTRAINT unique_ctpn UNIQUE (MaCTPN);

-- 4. ADD INDEX
CREATE INDEX idx_ctpn ON LoThuoc(MaCTPN);

-- 5. FIX SoLuongNhap đúng theo ChiTietPhieuNhap
UPDATE LoThuoc l
JOIN ChiTietPhieuNhap ct 
    ON l.MaCTPN = ct.MaCTPN
SET l.SoLuongNhap = ct.SoLuong;


-- 6. FIX TRIGGER NHAP KHO
DELIMITER $$

CREATE TRIGGER trg_nhap_kho
AFTER INSERT ON ChiTietPhieuNhap
FOR EACH ROW
BEGIN
    DECLARE lo_id INT;

    SELECT MaLo INTO lo_id
    FROM LoThuoc
    WHERE MaCTPN = NEW.MaCTPN
    LIMIT 1;

    IF lo_id IS NOT NULL THEN
        UPDATE LoThuoc
        SET SoLuongNhap = COALESCE(SoLuongNhap,0) + NEW.SoLuong
        WHERE MaLo = lo_id;

        INSERT INTO LichSuKho(MaThuoc, MaLo, Loai, SoLuong, ThamChieuID)
        VALUES (NEW.MaThuoc, lo_id, 'Nhap', NEW.SoLuong, NEW.MaPN);
    END IF;

END$$

DELIMITER ;

-- 7. FIX TongTien phieu nhap
UPDATE PhieuNhapThuoc pn
SET TongTien = (
    SELECT IFNULL(SUM(ct.SoLuong * ct.GiaNhap),0)
    FROM ChiTietPhieuNhap ct
    WHERE ct.MaPN = pn.MaPN
);

-- 1. RÀNG BUỘC & KHO

ALTER TABLE PhieuNhapThuoc 
ADD MaKho INT,
ADD FOREIGN KEY (MaKho) REFERENCES Kho(MaKho);

ALTER TABLE ChiTietPhieuNhap
ADD CONSTRAINT chk_soluong_nhap CHECK (SoLuong > 0), -- FIX (>0 thay vì >=0)
ADD CONSTRAINT chk_gianhap CHECK (GiaNhap >= 0);

ALTER TABLE ChiTietPhieuXuat
ADD CONSTRAINT chk_soluong_xuat CHECK (SoLuong > 0),
ADD CONSTRAINT chk_dongia CHECK (DonGia >= 0);

ALTER TABLE LoThuoc
ADD CONSTRAINT unique_lo_thuoc UNIQUE (MaThuoc, SoLo);

CREATE INDEX idx_lo_hansudung ON LoThuoc(HanSuDung);
CREATE INDEX idx_lo_thuoc ON LoThuoc(MaThuoc);


-- 2. VIEW PHỤC VỤ NGHIỆP VỤ

CREATE OR REPLACE VIEW LoThuoc_FEFO AS
SELECT *
FROM LoThuoc
WHERE (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) > 0
AND TrangThai != 'HetHan'
ORDER BY HanSuDung ASC;

--- thêm---

CREATE OR REPLACE VIEW LoThuoc_FEFO AS
SELECT 
    MaLo,
    MaThuoc,
    MaKho,
    SoLo,
    HanSuDung,
    TrangThai,
    (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) AS Ton
FROM LoThuoc
WHERE 
    (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) > 0
    AND TrangThai IN ('ConHan','SapHetHan')
ORDER BY HanSuDung ASC;


CREATE INDEX idx_fefo 
ON LoThuoc(MaThuoc, MaKho, HanSuDung);


CREATE OR REPLACE VIEW TonKhoTheoThuoc AS
SELECT 
    MaThuoc,
    SUM(COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) AS TongTon
FROM LoThuoc
GROUP BY MaThuoc;

CREATE OR REPLACE VIEW TonKhoTheoLo AS
SELECT 
    MaLo,
    MaThuoc,
    (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) AS TonLo,
    HanSuDung
FROM LoThuoc;

CREATE OR REPLACE VIEW ThuocSapHetHan AS
SELECT *
FROM LoThuoc
WHERE HanSuDung <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
AND TrangThai != 'HetHan';

CREATE OR REPLACE VIEW BaoCaoNhapXuat AS
SELECT 
    Loai,
    MaThuoc,
    MaLo,
    SoLuong,
    ThoiGian
FROM LichSuKho;


-- 3. TRIGGER QUẢN LÝ HẠN DÙNG

DROP TRIGGER IF EXISTS trg_update_trangthai_lo;
DELIMITER $$

CREATE TRIGGER trg_update_trangthai_lo
BEFORE UPDATE ON LoThuoc
FOR EACH ROW
BEGIN
    IF NEW.HanSuDung < CURDATE() THEN
        SET NEW.TrangThai = 'HetHan';
    ELSEIF NEW.HanSuDung < DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN
        SET NEW.TrangThai = 'SapHetHan';
    ELSE
        SET NEW.TrangThai = 'ConHan';
    END IF;
END$$

DELIMITER ;


DROP TRIGGER IF EXISTS trg_update_trangthai_lo_insert;
DELIMITER $$

CREATE TRIGGER trg_update_trangthai_lo_insert
BEFORE INSERT ON LoThuoc
FOR EACH ROW
BEGIN
    IF NEW.HanSuDung < CURDATE() THEN
        SET NEW.TrangThai = 'HetHan';
    ELSEIF NEW.HanSuDung < DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN
        SET NEW.TrangThai = 'SapHetHan';
    ELSE
        SET NEW.TrangThai = 'ConHan';
    END IF;
END$$

DELIMITER ;

-- 6. HỦY THUỐC 


DROP TRIGGER IF EXISTS trg_huy_thuoc;
DELIMITER $$

CREATE TRIGGER trg_huy_thuoc
AFTER INSERT ON PhieuHuyThuoc
FOR EACH ROW
BEGIN
    DECLARE ton INT;
    DECLARE thuoc_id INT;

    SELECT (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)), MaThuoc
    INTO ton, thuoc_id
    FROM LoThuoc
    WHERE MaLo = NEW.MaLo;

    IF ton IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lo khong ton tai';
    END IF;

    IF ton < NEW.SoLuong THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Khong du ton de huy';
    END IF;

    UPDATE LoThuoc
    SET SoLuongDaXuat = COALESCE(SoLuongDaXuat,0) + NEW.SoLuong
    WHERE MaLo = NEW.MaLo;

    UPDATE LoThuoc
    SET TrangThai = 'DaHuy'
    WHERE MaLo = NEW.MaLo
      AND (COALESCE(SoLuongNhap,0) - COALESCE(SoLuongDaXuat,0)) = 0;

    INSERT INTO LichSuKho(MaThuoc, MaLo, Loai, SoLuong, ThamChieuID)
    VALUES (thuoc_id, NEW.MaLo, 'Huy', NEW.SoLuong, NEW.MaHuy);

END$$

DELIMITER ;

INSERT INTO Kho (
    TenKho,
    NhietDoToiThieu,
    NhietDoToiDa,
    TrangThai
) VALUES
('Kho Chính (Thuốc thường)', 15.0, 30.0, TRUE);

INSERT INTO PhieuNhapThuoc 
    (MaNCC, MaNhanVien, NgayNhap, TongTien, LoaiPhieu, GhiChu, MaKho) 
VALUES
(1, 29, '2026-03-01', 0.00, 'NhapMua', 'Nhập lô hàng tháng 3/2026 từ GSK: Augmentin và Panadol Extra', 1),
(1, 29, '2026-03-05', 0.00, 'NhapMua', 'Nhập bổ sung từ GSK: Ventolin Evohaler và Gaviscon Dual Action', 1),
(2, 30, '2026-03-10', 0.00, 'NhapMua', 'Nhập từ Pfizer: Amlor và Lipitor (thuốc tim mạch)', 1),
(3, 30, '2026-03-12', 0.00, 'NhapMua', 'Nhập từ AstraZeneca: Nexium Mups và Crestor (dạ dày và mỡ máu)', 1),
(4, 29, '2026-03-15', 0.00, 'NhapMua', 'Nhập từ Merck: Glucophage; và Losartan từ Stada (đái tháo đường & huyết áp)', 1);

INSERT INTO Thuoc (TenThuoc, DonViCoBan, GiaBan, HoatChat, HamLuong, DangBaoChe, QuyCachDongGoi, HangSanXuat, NuocSanXuat, NhietDoBaoQuan, MaVach, LoaiThuoc, TrangThai) VALUES
('Augmentin', 'Viên', 15500.00, 'Amoxicillin, Acid Clavulanic', '500mg/125mg', 'Viên nén bao phim', 'Hộp 2 vỉ x 7 viên', 'GlaxoSmithKline', 'Pháp/Anh', 'Dưới 25°C', '3004508200123', 'ThuocKeDon', NULL),

('Panadol Extra', 'Viên', 1250.00, 'Paracetamol, Caffeine', '500mg/65mg', 'Viên nén', 'Hộp 15 vỉ x 12 viên', 'GSK', 'Australia', 'Dưới 30°C', '8934658000012', 'KhongKeDon', NULL),

('Amlor', 'Viên', 9800.00, 'Amlodipine besylate', '5mg', 'Viên nang cứng', 'Hộp 3 vỉ x 10 viên', 'Pfizer', 'Pháp', 'Dưới 30°C', '3004500012345', 'ThuocKeDon', NULL),

('Glucophage', 'Viên', 4500.00, 'Metformin hydrochloride', '850mg', 'Viên nén bao phim', 'Hộp 5 vỉ x 20 viên', 'Merck', 'Pháp', 'Dưới 25°C', '4022536789012', 'ThuocKeDon', NULL),

('Ventolin Evohaler', 'Bình', 95000.00, 'Salbutamol', '100mcg/liều', 'Hỗn dịch xịt định liều', 'Hộp 1 bình 200 liều', 'GSK', 'Tây Ban Nha/Anh', 'Dưới 30°C', '5012345678901', 'ThuocKeDon', NULL),

('Nexium Mups', 'Viên', 22500.00, 'Esomeprazole magnesium', '40mg', 'Viên nén bao tan trong ruột', 'Hộp 2 vỉ x 7 viên', 'AstraZeneca', 'Thụy Điển', 'Dưới 30°C', '7321835002015', 'ThuocKeDon', NULL),

('Crestor', 'Viên', 18500.00, 'Rosuvastatin calcium', '10mg', 'Viên nén bao phim', 'Hộp 2 vỉ x 14 viên', 'AstraZeneca', 'Anh', 'Dưới 30°C', '7321835010041', 'ThuocKeDon', NULL),

('Gaviscon Dual Action', 'Gói', 12000.00, 'Natri alginate + Natri bicarbonate + Canxi carbonate', '10ml', 'Hỗn dịch uống', 'Hộp 24 gói x 10ml', 'Reckitt Benckiser', 'Anh', 'Dưới 30°C', '5000158069542', 'KhongKeDon', NULL),

('Lipitor', 'Viên', 18000.00, 'Atorvastatin calcium', '10mg', 'Viên nén bao phim', 'Hộp 3 vỉ x 10 viên', 'Pfizer', 'Ireland', 'Dưới 30°C', '3004501234567', 'ThuocKeDon', NULL),

('Losartan', 'Viên', 6500.00, 'Losartan potassium', '50mg', 'Viên nén bao phim', 'Hộp 3 vỉ x 10 viên', 'Stada', 'Hàn Quốc', 'Dưới 30°C', '8931234567890', 'ThuocKeDon', NULL);



INSERT INTO NhaCungCap (TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan) VALUES
('GlaxoSmithKline Vietnam', 'Lô I-5, Đường D1, KCN Tân Thuận, Q.7, TP.HCM', '02837701234', 'contact@gsk.com.vn', '0101234567', 'Nguyễn Thị Lan', 'Thanh toán trong 30 ngày kể từ ngày nhận hàng'),
('Pfizer Vietnam', 'Tầng 12, Tòa nhà Saigon Centre, Q.1, TP.HCM', '02838245678', 'procurement@pfizer.com.vn', '0107654321', 'Trần Văn Bình', 'Thanh toán 45 ngày'),
('AstraZeneca Vietnam', 'Số 2, Đường Nguyễn Thị Minh Khai, Q.3, TP.HCM', '02839345678', 'supply@astrazeneca.com.vn', '0109876543', 'Lê Thị Hương', 'Thanh toán 30 ngày'),
('Merck Vietnam', 'Tầng 15, Tòa nhà Bitexco, Q.1, TP.HCM', '02839123456', 'vnprocurement@merckgroup.com', '0101122334', 'Phạm Minh Quân', 'Thanh toán 60 ngày'),
('Stada Vietnam', 'Khu công nghiệp Biên Hòa, Đồng Nai', '02513891234', 'info@stada.vn', '0105566778', 'Hoàng Văn Nam', 'Thanh toán 30 ngày');


USE clinicmanagement; -- Đảm bảo đã chọn database trước khi chạy

INSERT INTO NhaCungCap (TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan) VALUES
('Sanofi Vietnam', '10 Hàm Nghi, Quận 1, TP.HCM', '02838298526', 'supply.vn@sanofi.com', '0102233445', 'Nguyễn Minh Triết', 'Thanh toán 30 ngày'),
('Zuellig Pharma Vietnam', 'KCN Tân Tạo, Quận Bình Tân, TP.HCM', '02837542655', 'zp.vn@zuelligpharma.com', '0103344556', 'Trương Mỹ Linh', 'Thanh toán 45 ngày'),
('Dược Hậu Giang (DHG)', '288 Nguyễn Văn Cừ, Cần Thơ', '02923891433', 'dhgpharma@dhgpharma.com.vn', '1800156801', 'Lê Hoàng Nam', 'Thanh toán 15 ngày'),
('Traphaco Vietnam', '75 Yên Ninh, Ba Đình, Hà Nội', '02436810615', 'info@traphaco.com.vn', '0100108656', 'Đặng Thu Thảo', 'Thanh toán 30 ngày'),
('DKSH Vietnam', 'Số 23 Đại lộ Thống Nhất, KCN VSIP, Bình Dương', '02743756312', 'healthcare.vn@dksh.com', '3700303206', 'Phan Anh Tuấn', 'Thanh toán 60 ngày');

INSERT INTO VaiTro (TenVaiTro) VALUES 
('Duoc Si'), 
('Nhan Vien Kho')
;

INSERT INTO ChiTietPhieuNhap (MaPN, MaThuoc, SoLuong, GiaNhap)
VALUES 
(21, 1, 280, 11000.00), (21, 2, 1800, 950.00),  
(22, 5, 50, 75000.00), (22, 8, 240, 9500.00),  
(23, 3, 300, 7200.00), (23, 9, 300, 14500.00), 
(24, 6, 140, 18500.00), (24, 7, 280, 15000.00), 
(25, 4, 1000, 3200.00), (25, 10, 300, 4800.00);

INSERT INTO Thuoc_NhaCungCap (MaThuoc, MaNCC, GiaNhap) 
VALUES 
(1, 1, 11000.00), (2, 1, 950.00), (5, 1, 75000.00), (8, 1, 9500.00),
(3, 2, 7200.00), (9, 2, 14500.00),
(6, 3, 18500.00), (7, 3, 15000.00),
(4, 4, 3200.00),
(10, 5, 4800.00);

INSERT INTO LoThuoc 
    (MaThuoc, SoLo, HanSuDung, GiaNhap, MaCTPN, NgaySanXuat, NhietDoBaoQuan, TrangThai, SoLuongNhap, SoLuongDaXuat, GhiChu, MaKho, MaNCC) 
VALUES
-- Nhóm GSK (MaNCC = 1)
(1, 'AUG24001', '2026-12-01', 11000.00, NULL, '2023-12-01', 'Dưới 25°C', NULL, 280, 0, 'Lô nhập khẩu Pháp, hộp 14 viên', 1, 1),
(2, 'PAN25012', '2027-05-20', 850.00, NULL, '2024-05-20', 'Dưới 30°C', NULL, 1800, 0, 'Lô Australia, hộp 180 viên', 1, 1),
(5, 'VEN2309', '2026-03-15', 75000.00, NULL, '2023-03-15', 'Dưới 30°C', NULL, 50, 0, 'Bình xịt định liều', 1, 1),
(8, 'GAV2408', '2026-09-12', 9500.00, NULL, '2023-09-12', 'Dưới 30°C', NULL, 240, 0, 'Hỗn dịch uống, hộp 24 gói', 1, 1),

-- Nhóm Pfizer (MaNCC = 2)
(3, 'AML2405', '2026-08-30', 7200.00, NULL, '2023-08-30', 'Dưới 30°C', NULL, 300, 0, 'Hộp 30 viên', 1, 2),
(9, 'LIP2411', '2026-11-15', 14500.00, NULL, '2023-11-15', 'Dưới 30°C', NULL, 300, 0, 'Thuốc mỡ máu Pfizer', 1, 2),

-- Nhóm AstraZeneca (MaNCC = 3)
(6, 'NEX2402', '2026-11-30', 18500.00, NULL, '2024-02-28', 'Dưới 30°C', NULL, 140, 0, 'Viên nén bao tan trong ruột', 1, 3),
(7, 'CRE2411', '2027-01-05', 15000.00, NULL, '2024-01-05', 'Dưới 30°C', NULL, 280, 0, 'Hộp 28 viên', 1, 3),

-- Nhóm Merck & Stada (MaNCC = 4 & 5)
(4, 'GLU2410', '2027-02-10', 3200.00, NULL, '2024-02-10', 'Dưới 25°C', NULL, 1000, 0, 'Thuốc tiểu đường Merck', 1, 4),
(10, 'LOS2403', '2026-03-20', 4800.00, NULL, '2023-03-20', 'Dưới 30°C', NULL, 300, 0, 'Hộp 30 viên từ Stada', 1, 5);

-- 3. Nhân Viên
INSERT INTO NhanVien (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa) VALUES 
-- Nhân viên kho--
('Nguyen The Anh', '0989234567', 'theanh@clinic.com', 'tanh', '123456', 6, NULL),
('Nguyen Hoang Hung', '0989234867', 'hhung@clinic.com', 'hhung', '123456', 6, NULL),
-- Admin
('Nguyen Van Tuan', '0901234567', 'admin@clinic.com', 'admin', '123456', 1, NULL),
-- Bác sĩ
('BS. Le Van Hai', '0912345678', 'bsb@clinic.com', 'bsb', '123456', 2, 1),
('BS. Tran Thi Ngan', '0923456789', 'bsc@clinic.com', 'bsc', '123456', 2, 2),
('BS. Pham Van Dong', '0934567890', 'bsd@clinic.com', 'bsd', '123456', 2, 3),
('BS. Nguyen Thi Hoa', '0945678901', 'bse@clinic.com', 'bse', '123456', 2, 4),
('BS. Hoang Van Kien', '0956789012', 'bsf@clinic.com', 'bsf', '123456', 2, 5),
-- Lễ tân
('Tran Thi Hien', '0967890123', 'letang@clinic.com', 'letang', '123456', 3, NULL),
('Le Van Quynh', '0978901234', 'letanh@clinic.com', 'letanh', '123456', 3, NULL);

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


-- Thêm 3 bản ghi mẫu vào bảng BenhNhan

INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email) VALUES 

('Nguyễn Văn An', '1995-05-15', 'Nam', '123 Đường Lê Lợi, Quận 1, TP.HCM', '0905123456', 'an.nguyen@gmail.com'),

('Trần Thị Bình', '1988-10-20', 'Nu', '456 Đường Nguyễn Huệ, Quận Hải Châu, Đà Nẵng', '0912987654', 'binhtran@gmail.com'),

('Lê Hoàng Long', '2002-02-02', 'Nam', '789 Đường Hùng Vương, Ba Đình, Hà Nội', '0988000111', 'longlh@gmail.com');

--- hiện tại đang null, sau khi thêm dữ liệu vào mới dùng câu này---
-- ALTER TABLE LoThuoc
-- MODIFY MaCTPN INT NOT NULL;
