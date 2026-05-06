USE ClinicManagement;

-- Safe migration for ticket check-in.
-- Adds only missing columns/indexes so the script can be re-run.

SET @db = DATABASE();

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE BenhNhan ADD COLUMN SoCCCD VARCHAR(20) UNIQUE NULL AFTER SoDienThoai',
        'SELECT "SoCCCD already exists"'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'BenhNhan' AND COLUMN_NAME = 'SoCCCD'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE PhieuKham ADD COLUMN MaBacSi INT NULL',
        'SELECT "MaBacSi already exists"'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND COLUMN_NAME = 'MaBacSi'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE PhieuKham ADD COLUMN MaChuyenKhoa INT NULL',
        'SELECT "MaChuyenKhoa already exists"'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND COLUMN_NAME = 'MaChuyenKhoa'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE PhieuKham ADD COLUMN LoaiKham ENUM(''WALK_IN'',''APPOINTMENT'') DEFAULT ''WALK_IN''',
        'SELECT "LoaiKham already exists"'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND COLUMN_NAME = 'LoaiKham'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE PhieuKham ADD COLUMN ThoiGianTao DATETIME DEFAULT CURRENT_TIMESTAMP',
        'SELECT "ThoiGianTao already exists"'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND COLUMN_NAME = 'ThoiGianTao'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_phieukham_bacsi_ngay ON PhieuKham(MaBacSi, NgayKham, STT)',
        'SELECT "idx_phieukham_bacsi_ngay already exists"'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND INDEX_NAME = 'idx_phieukham_bacsi_ngay'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Enforce one ticket per appointment at database level.
-- MySQL UNIQUE permits multiple NULL values, so WALK_IN tickets are unaffected.
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE UNIQUE INDEX uq_phieukham_malk ON PhieuKham(MaLK)',
        'SELECT "uq_phieukham_malk already exists"'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'PhieuKham' AND INDEX_NAME = 'uq_phieukham_malk'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
