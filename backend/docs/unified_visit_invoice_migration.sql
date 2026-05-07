-- Gop 1 MaHD cho moi lan den kham va tach lich su thanh toan.
-- Chay script nay tren database hien tai truoc khi dung luong nghiep vu moi.

ALTER TABLE HoaDon
  ADD COLUMN MaPK INT NULL AFTER MaBA;

ALTER TABLE HoaDon
  ADD UNIQUE KEY uq_hoadon_mapk (MaPK),
  ADD KEY idx_hoadon_mapk (MaPK),
  ADD CONSTRAINT fk_hoadon_mapk FOREIGN KEY (MaPK) REFERENCES PhieuKham (MaPK);

ALTER TABLE HoaDon
  MODIFY COLUMN TrangThai ENUM('ChuaThanhToan','DaThanhToan','QuaHan','Huy','DaHuy') DEFAULT 'ChuaThanhToan';

CREATE TABLE IF NOT EXISTS LichSuThanhToan (
  MaLSTT INT NOT NULL AUTO_INCREMENT,
  MaHD INT NOT NULL,
  LoaiGiaoDich ENUM('ThanhToan','HoanTien') DEFAULT 'ThanhToan',
  PhuongThucThanhToan ENUM('TienMat','ChuyenKhoan','QRPay','The') DEFAULT 'TienMat',
  SoTienThanhToan DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  NgayThanhToan TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  MaNhanVien INT NULL,
  GhiChu VARCHAR(255) NULL,
  PRIMARY KEY (MaLSTT),
  KEY idx_lstt_mahd (MaHD),
  KEY idx_lstt_manhanvien (MaNhanVien),
  CONSTRAINT fk_lstt_hoadon FOREIGN KEY (MaHD) REFERENCES HoaDon (MaHD),
  CONSTRAINT fk_lstt_nhanvien FOREIGN KEY (MaNhanVien) REFERENCES NhanVien (MaNV)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Gan MaPK cho cac hoa don cu da co MaBA.
UPDATE HoaDon hd
JOIN BenhAn ba ON ba.MaBA = hd.MaBA
SET hd.MaPK = ba.MaPK
WHERE hd.MaPK IS NULL;
