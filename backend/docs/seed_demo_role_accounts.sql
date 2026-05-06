-- Demo login accounts for all 6 roles.
-- Password for every account: 123456
-- Bcrypt hash generated with bcryptjs hashSync('123456', 10).

INSERT INTO NhanVien
    (HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa, TrangThai)
VALUES
    ('Admin Demo', '0900000001', 'admin@gmail.com', 'admin', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 1, NULL, 1),
    ('Bac Si Demo', '0900000002', 'bacsi@gmail.com', 'basi1', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 2, 1, 1),
    ('Le Tan Demo', '0900000003', 'letan@gmail.com', 'letan', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 3, NULL, 1),
    ('Ke Toan Demo', '0900000004', 'ketoan@gmail.com', 'ketoan', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 4, NULL, 1),
    ('Duoc Si Demo', '0900000005', 'duocsi@gmail.com', 'duocsi', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 5, NULL, 1),
    ('Nhan Vien Kho Demo', '0900000006', 'nhanvienkho@gmail.com', 'nhanvienkho', '$2b$10$FoB9qytMFQsLeR7XSRDKtef5ssOJ6pw6zNpEmFM0zdWo0NWaQrSG2', 6, NULL, 1)
ON DUPLICATE KEY UPDATE
    HoTen = VALUES(HoTen),
    SoDienThoai = VALUES(SoDienThoai),
    Email = VALUES(Email),
    Password = VALUES(Password),
    MaVaiTro = VALUES(MaVaiTro),
    MaChuyenKhoa = VALUES(MaChuyenKhoa),
    TrangThai = VALUES(TrangThai);
