ALTER TABLE PhieuNhapThuoc
    MODIFY LoaiPhieu ENUM('NhapMua','NhapTra','NhapKiemKe','NhapVienTro','NhapKhac') DEFAULT 'NhapMua',
    ADD COLUMN IF NOT EXISTS TrangThai ENUM('Nhap','HoanThanh','DaHuy') DEFAULT 'Nhap';

ALTER TABLE ChiTietPhieuNhap
    ADD COLUMN IF NOT EXISTS SoLo VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS NgaySanXuat DATE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS HanSuDung DATE DEFAULT NULL;

ALTER TABLE LoThuoc
    DROP INDEX unique_lo_thuoc,
    ADD UNIQUE KEY unique_lo_thuoc (MaThuoc, SoLo, MaKho);

UPDATE Kho
SET TenKho = 'Kho Quầy'
WHERE TenKho = 'Kho thuốc chính';

UPDATE Kho
SET TenKho = 'Kho Thuốc Lạnh'
WHERE TenKho = 'Kho thuốc lạnh';

UPDATE Kho
SET TenKho = 'Kho Vật Tư Y Tế'
WHERE TenKho = 'Kho vật tư y tế';

INSERT INTO Kho (TenKho, NhietDoToiThieu, NhietDoToiDa, TrangThai)
SELECT 'Kho Chính', 15, 30, 1
WHERE NOT EXISTS (SELECT 1 FROM Kho WHERE TenKho = 'Kho Chính');

INSERT INTO Kho (TenKho, NhietDoToiThieu, NhietDoToiDa, TrangThai)
SELECT 'Kho Quầy', 15, 30, 1
WHERE NOT EXISTS (SELECT 1 FROM Kho WHERE TenKho = 'Kho Quầy');

INSERT INTO Kho (TenKho, NhietDoToiThieu, NhietDoToiDa, TrangThai)
SELECT 'Kho Thuốc Lạnh', 2, 8, 1
WHERE NOT EXISTS (SELECT 1 FROM Kho WHERE TenKho = 'Kho Thuốc Lạnh');

INSERT INTO Kho (TenKho, NhietDoToiThieu, NhietDoToiDa, TrangThai)
SELECT 'Kho Vật Tư Y Tế', 15, 30, 1
WHERE NOT EXISTS (SELECT 1 FROM Kho WHERE TenKho = 'Kho Vật Tư Y Tế');
