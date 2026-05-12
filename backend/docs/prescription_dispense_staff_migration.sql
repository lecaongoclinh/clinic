USE clinicmanagement;
SET NAMES utf8mb4;

SET @db := DATABASE() COLLATE utf8mb3_general_ci;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE DonThuoc ADD COLUMN MaBacSiKeDon INT NULL AFTER MaBA',
    'SELECT ''DonThuoc.MaBacSiKeDon exists'''
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA COLLATE utf8mb3_general_ci = @db
    AND TABLE_NAME = 'DonThuoc'
    AND COLUMN_NAME = 'MaBacSiKeDon'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE PhieuXuatThuoc ADD COLUMN MaNhanVienXuat INT NULL AFTER MaNhanVien',
    'SELECT ''PhieuXuatThuoc.MaNhanVienXuat exists'''
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA COLLATE utf8mb3_general_ci = @db
    AND TABLE_NAME = 'PhieuXuatThuoc'
    AND COLUMN_NAME = 'MaNhanVienXuat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE DonThuoc dt
JOIN BenhAn ba ON ba.MaBA = dt.MaBA
SET dt.MaBacSiKeDon = COALESCE(dt.MaBacSiKeDon, ba.MaBacSi)
WHERE dt.MaBacSiKeDon IS NULL;

UPDATE PhieuXuatThuoc
SET MaNhanVienXuat = COALESCE(MaNhanVienXuat, MaNhanVien)
WHERE MaNhanVienXuat IS NULL;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE DonThuoc ADD CONSTRAINT fk_donthuoc_bacsikedon FOREIGN KEY (MaBacSiKeDon) REFERENCES NhanVien(MaNV)',
    'SELECT ''fk_donthuoc_bacsikedon exists'''
  )
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA COLLATE utf8mb3_general_ci = @db
    AND CONSTRAINT_NAME = 'fk_donthuoc_bacsikedon'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE PhieuXuatThuoc ADD CONSTRAINT fk_phieuxuatthuoc_nhanvienxuat FOREIGN KEY (MaNhanVienXuat) REFERENCES NhanVien(MaNV)',
    'SELECT ''fk_phieuxuatthuoc_nhanvienxuat exists'''
  )
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA COLLATE utf8mb3_general_ci = @db
    AND CONSTRAINT_NAME = 'fk_phieuxuatthuoc_nhanvienxuat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
