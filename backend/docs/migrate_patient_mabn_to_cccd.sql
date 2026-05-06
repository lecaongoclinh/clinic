-- Change BenhNhan.MaBN from auto-increment integer to a 12-digit CCCD-style code.
-- The column name stays MaBN. The old SoCCCD column is removed after migration.
--
-- Mapping rule:
-- - If SoCCCD exists, MaBN = LPAD(SoCCCD, 12, '0')
-- - If SoCCCD is empty/null, MaBN = LPAD(old MaBN, 12, '0')

DROP TABLE IF EXISTS __patient_id_map;

CREATE TABLE __patient_id_map (
    OldMaBN INT NOT NULL PRIMARY KEY,
    NewMaBN VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO __patient_id_map (OldMaBN, NewMaBN)
SELECT
    MaBN AS OldMaBN,
    LPAD(COALESCE(NULLIF(TRIM(SoCCCD), ''), CAST(MaBN AS CHAR)), 12, '0') AS NewMaBN
FROM BenhNhan;

ALTER TABLE LichKham DROP FOREIGN KEY lichkham_ibfk_1;
ALTER TABLE PhieuKham DROP FOREIGN KEY phieukham_ibfk_5;
ALTER TABLE PhieuXuatThuoc DROP FOREIGN KEY phieuxuatthuoc_ibfk_3;

ALTER TABLE LichKham MODIFY MaBN VARCHAR(20) NOT NULL;
ALTER TABLE PhieuKham MODIFY MaBN VARCHAR(20) NULL;
ALTER TABLE PhieuXuatThuoc MODIFY MaBN VARCHAR(20) NULL;

ALTER TABLE BenhNhan MODIFY MaBN VARCHAR(20) NOT NULL;

UPDATE LichKham lk
JOIN __patient_id_map map ON CAST(lk.MaBN AS UNSIGNED) = map.OldMaBN
SET lk.MaBN = map.NewMaBN;

UPDATE PhieuKham pk
JOIN __patient_id_map map ON CAST(pk.MaBN AS UNSIGNED) = map.OldMaBN
SET pk.MaBN = map.NewMaBN;

UPDATE PhieuXuatThuoc px
JOIN __patient_id_map map ON CAST(px.MaBN AS UNSIGNED) = map.OldMaBN
SET px.MaBN = map.NewMaBN;

UPDATE BenhNhan bn
JOIN __patient_id_map map ON CAST(bn.MaBN AS UNSIGNED) = map.OldMaBN
SET bn.MaBN = map.NewMaBN;

ALTER TABLE BenhNhan DROP INDEX SoCCCD;
ALTER TABLE BenhNhan DROP COLUMN SoCCCD;

ALTER TABLE LichKham
    ADD CONSTRAINT lichkham_ibfk_1 FOREIGN KEY (MaBN) REFERENCES BenhNhan (MaBN);

ALTER TABLE PhieuKham
    ADD CONSTRAINT phieukham_ibfk_5 FOREIGN KEY (MaBN) REFERENCES BenhNhan (MaBN);

ALTER TABLE PhieuXuatThuoc
    ADD CONSTRAINT phieuxuatthuoc_ibfk_3 FOREIGN KEY (MaBN) REFERENCES BenhNhan (MaBN);

DROP TABLE __patient_id_map;
