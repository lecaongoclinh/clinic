ALTER TABLE PhongKham
    ADD COLUMN MaChuyenKhoa INT NULL AFTER GhiChu;

UPDATE PhongKham
SET MaChuyenKhoa = CASE MaPhong
    WHEN 1 THEN 1
    WHEN 2 THEN 2
    WHEN 3 THEN 3
    WHEN 4 THEN 4
    WHEN 5 THEN 5
    WHEN 6 THEN 6
    ELSE MaChuyenKhoa
END
WHERE MaPhong IN (1, 2, 3, 4, 5, 6);

ALTER TABLE PhongKham
    MODIFY MaChuyenKhoa INT NOT NULL,
    ADD CONSTRAINT fk_phongkham_chuyenkhoa
        FOREIGN KEY (MaChuyenKhoa) REFERENCES ChuyenKhoa(MaChuyenKhoa);
