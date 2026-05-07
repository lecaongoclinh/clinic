-- Seed phieu kham o nhieu trang thai de test giao dien phieu kham.
-- MaBN la CCCD 12 so. Dung dai ID 201+ de tranh trung voi seed khac.

USE clinicmanagement;
SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO BenhNhan
  (MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email, NgayTao)
VALUES
  ('079198900201', 'Nguyễn Minh Châu', '1989-01-15', 'Nu', '18 Võ Văn Tần, Quận 3, TP.HCM', '0922000201', 'minhchau@example.vn', '2026-05-07 07:45:00'),
  ('079199200202', 'Trần Đức Long', '1992-08-09', 'Nam', '52 Nguyễn Thái Học, Quận 1, TP.HCM', '0922000202', 'duclong@example.vn', '2026-05-07 08:00:00'),
  ('079198500203', 'Lê Thị Kim Ngân', '1985-11-22', 'Nu', '31 Phan Xích Long, Phú Nhuận, TP.HCM', '0922000203', 'kimngan@example.vn', '2026-05-07 08:10:00'),
  ('079197800204', 'Phạm Quốc Việt', '1978-03-03', 'Nam', '9 Hoàng Văn Thụ, Tân Bình, TP.HCM', '0922000204', 'quocviet@example.vn', '2026-05-07 08:20:00'),
  ('079200100205', 'Đỗ Gia Hân', '2001-12-18', 'Nu', '70 Cách Mạng Tháng 8, Quận 10, TP.HCM', '0922000205', 'giahan@example.vn', '2026-05-07 08:30:00'),
  ('079196600206', 'Bùi Thanh Sơn', '1966-07-27', 'Nam', '6 Trường Sơn, Tân Bình, TP.HCM', '0922000206', 'thanhson@example.vn', '2026-05-07 08:40:00'),
  ('079199900207', 'Võ Nhật Linh', '1999-05-05', 'Khac', '12 Nguyễn Đình Chiểu, Quận 3, TP.HCM', '0922000207', 'nhatlinh@example.vn', '2026-05-07 08:50:00'),
  ('079201500208', 'Hoàng Bảo An', '2015-09-12', 'Nam', '15 Lê Văn Sỹ, Quận 3, TP.HCM', '0922000208', 'baoan@example.vn', '2026-05-07 09:00:00')
ON DUPLICATE KEY UPDATE
  HoTen = VALUES(HoTen),
  NgaySinh = VALUES(NgaySinh),
  GioiTinh = VALUES(GioiTinh),
  DiaChi = VALUES(DiaChi),
  SoDienThoai = VALUES(SoDienThoai),
  Email = VALUES(Email),
  NgayTao = VALUES(NgayTao);

INSERT INTO LichKham
  (MaLK, MaBN, MaBacSi, NgayHen, GioHen, LyDoKham, TrangThai, MaLich)
VALUES
  (201, '079198900201', 102, '2026-05-07', '08:15:00', 'Đau bụng âm ỉ, cần khám nội', 'DaXacNhan', 101),
  (202, '079199200202', 102, '2026-05-07', '08:45:00', 'Khám sức khỏe tổng quát', 'DaXacNhan', 101),
  (203, '079198500203', 102, '2026-05-07', '09:15:00', 'Tái khám viêm dạ dày', 'DaKham', 101),
  (204, '079197800204', 102, '2026-05-07', '09:45:00', 'Bệnh nhân đổi lịch nhưng chưa báo trước', 'DaHuy', 101),
  (205, '079201500208', 103, '2026-05-07', '10:15:00', 'Trẻ ho và sổ mũi', 'DaKham', 102)
ON DUPLICATE KEY UPDATE
  MaBN = VALUES(MaBN),
  MaBacSi = VALUES(MaBacSi),
  NgayHen = VALUES(NgayHen),
  GioHen = VALUES(GioHen),
  LyDoKham = VALUES(LyDoKham),
  TrangThai = VALUES(TrangThai),
  MaLich = VALUES(MaLich);

INSERT INTO PhieuKham
  (MaPK, MaLK, MaLeTan, MaPhong, MaBacSi, MaChuyenKhoa, STT, NgayKham, TrangThai, MaLich, MaBN, LoaiKham, LyDoKham, GhiChu, ThoiGianTao)
VALUES
  (201, 201, 106, 101, 102, 101, 10, '2026-05-07', 'ChoKham', 101, '079198900201', 'APPOINTMENT', 'Đau bụng âm ỉ, cần khám nội', 'Test trạng thái chờ khám từ lịch hẹn', '2026-05-07 08:05:00'),
  (202, 202, 106, 101, 102, 101, 11, '2026-05-07', 'DangKham', 101, '079199200202', 'APPOINTMENT', 'Khám sức khỏe tổng quát', 'Test trạng thái đang khám', '2026-05-07 08:35:00'),
  (203, 203, 106, 101, 102, 101, 12, '2026-05-07', 'DaKham', 101, '079198500203', 'APPOINTMENT', 'Tái khám viêm dạ dày', 'Test trạng thái đã khám', '2026-05-07 09:05:00'),
  (204, 204, 106, 101, 102, 101, 13, '2026-05-07', 'BoVe', 101, '079197800204', 'APPOINTMENT', 'Bệnh nhân rời phòng khám trước lượt gọi', 'Test trạng thái bỏ khám', '2026-05-07 09:40:00'),
  (205, NULL, 106, 101, 102, 101, 14, '2026-05-07', 'ChoKham', 101, '079200100205', 'WALK_IN', 'Khám tại chỗ do đau đầu', 'Test chờ khám tại chỗ', '2026-05-07 10:05:00'),
  (206, NULL, 106, 104, 105, 104, 5, '2026-05-07', 'DangKham', 104, '079196600206', 'WALK_IN', 'Tức ngực nhẹ khi vận động', 'Test đang khám tại chỗ chuyên khoa tim mạch', '2026-05-07 14:20:00'),
  (207, NULL, 106, 101, 102, 101, 15, '2026-05-07', 'BoVe', 101, '079199900207', 'WALK_IN', 'Đến hỏi khám nhưng bỏ về', 'Test bỏ khám tại chỗ', '2026-05-07 10:30:00'),
  (208, 205, 106, 102, 103, 102, 6, '2026-05-07', 'DaKham', 102, '079201500208', 'APPOINTMENT', 'Trẻ ho và sổ mũi', 'Test đã khám nhi khoa', '2026-05-07 10:10:00')
ON DUPLICATE KEY UPDATE
  MaLK = VALUES(MaLK),
  MaLeTan = VALUES(MaLeTan),
  MaPhong = VALUES(MaPhong),
  MaBacSi = VALUES(MaBacSi),
  MaChuyenKhoa = VALUES(MaChuyenKhoa),
  STT = VALUES(STT),
  NgayKham = VALUES(NgayKham),
  TrangThai = VALUES(TrangThai),
  MaLich = VALUES(MaLich),
  MaBN = VALUES(MaBN),
  LoaiKham = VALUES(LoaiKham),
  LyDoKham = VALUES(LyDoKham),
  GhiChu = VALUES(GhiChu),
  ThoiGianTao = VALUES(ThoiGianTao);

INSERT INTO BenhAn
  (MaBA, MaPK, MaBacSi, TrieuChung, ChuanDoan, GhiChu, NgayLap)
VALUES
  (201, 203, 102, 'Đau âm ỉ vùng thượng vị, ăn uống kém', 'Viêm dạ dày đang cải thiện', 'Tiếp tục thuốc dạ dày, hạn chế cà phê và đồ cay', '2026-05-07 09:35:00'),
  (202, 208, 103, 'Ho khan, sổ mũi, không khó thở', 'Viêm mũi họng cấp', 'Theo dõi sốt, vệ sinh mũi bằng nước muối sinh lý', '2026-05-07 10:45:00')
ON DUPLICATE KEY UPDATE
  MaPK = VALUES(MaPK),
  MaBacSi = VALUES(MaBacSi),
  TrieuChung = VALUES(TrieuChung),
  ChuanDoan = VALUES(ChuanDoan),
  GhiChu = VALUES(GhiChu),
  NgayLap = VALUES(NgayLap);

INSERT INTO HoaDon
  (MaHD, MaBA, MaPK, MaNhanVien, PhuongThucThanhToan, NgayThanhToan, TrangThai, MaHoaDon, NgayTao, TongTien, GiamGia, ThanhTienCuoi, HanThanhToan, GhiChu, MaPX)
VALUES
  (201, NULL, 201, 106, NULL, '2026-05-07 08:05:00', 'ChuaThanhToan', 'HD-TEST-PK201', '2026-05-07 08:05:00', 250000, 0, 250000, '2026-05-07', 'Hóa đơn nháp cho phiếu chờ khám', NULL),
  (202, NULL, 202, 106, NULL, '2026-05-07 08:35:00', 'ChuaThanhToan', 'HD-TEST-PK202', '2026-05-07 08:35:00', 250000, 0, 250000, '2026-05-07', 'Hóa đơn nháp cho phiếu đang khám', NULL),
  (203, 201, 203, 108, 'TienMat', '2026-05-07 09:45:00', 'DaThanhToan', 'HD-TEST-PK203', '2026-05-07 09:05:00', 680000, 30000, 650000, '2026-05-07', 'Đã thanh toán sau khám', NULL),
  (204, NULL, 204, 106, NULL, '2026-05-07 09:40:00', 'DaHuy', 'HD-TEST-PK204', '2026-05-07 09:40:00', 250000, 0, 250000, '2026-05-07', 'Hủy do bệnh nhân bỏ khám', NULL),
  (205, NULL, 205, 106, NULL, '2026-05-07 10:05:00', 'ChuaThanhToan', 'HD-TEST-PK205', '2026-05-07 10:05:00', 250000, 0, 250000, '2026-05-07', 'Hóa đơn nháp khám tại chỗ', NULL),
  (206, NULL, 206, 106, NULL, '2026-05-07 14:20:00', 'ChuaThanhToan', 'HD-TEST-PK206', '2026-05-07 14:20:00', 150000, 0, 150000, '2026-05-07', 'Đang khám, mới có tiền điện tim', NULL),
  (207, NULL, 207, 106, NULL, '2026-05-07 10:30:00', 'DaHuy', 'HD-TEST-PK207', '2026-05-07 10:30:00', 250000, 0, 250000, '2026-05-07', 'Bỏ khám tại chỗ', NULL),
  (208, 202, 208, 108, 'ChuyenKhoan', '2026-05-07 10:55:00', 'DaThanhToan', 'HD-TEST-PK208', '2026-05-07 10:10:00', 350000, 0, 350000, '2026-05-07', 'Đã khám nhi và thanh toán', NULL)
ON DUPLICATE KEY UPDATE
  MaBA = VALUES(MaBA),
  MaPK = VALUES(MaPK),
  MaNhanVien = VALUES(MaNhanVien),
  PhuongThucThanhToan = VALUES(PhuongThucThanhToan),
  NgayThanhToan = VALUES(NgayThanhToan),
  TrangThai = VALUES(TrangThai),
  MaHoaDon = VALUES(MaHoaDon),
  NgayTao = VALUES(NgayTao),
  TongTien = VALUES(TongTien),
  GiamGia = VALUES(GiamGia),
  ThanhTienCuoi = VALUES(ThanhTienCuoi),
  HanThanhToan = VALUES(HanThanhToan),
  GhiChu = VALUES(GhiChu),
  MaPX = VALUES(MaPX);

INSERT INTO ChiTietHoaDon
  (MaCTHD, MaHD, MaDichVu, SoTien, MaThuoc, LoaiMuc, SoLuong, DonGia, ThanhTien, DienGiai, MaPX)
VALUES
  (201, 201, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám - phiếu chờ khám', NULL),
  (202, 202, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám - phiếu đang khám', NULL),
  (203, 203, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám nội tổng quát', NULL),
  (204, 203, 102, 180000, NULL, 'DichVu', 1, 180000, 180000, 'Xét nghiệm công thức máu', NULL),
  (205, 203, 103, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Dịch vụ theo dõi điều trị dạ dày', NULL),
  (206, 204, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám đã hủy do bỏ khám', NULL),
  (207, 205, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám tại chỗ', NULL),
  (208, 206, 105, 150000, NULL, 'DichVu', 1, 150000, 150000, 'Điện tim tại phòng khám', NULL),
  (209, 207, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám đã hủy do bỏ khám', NULL),
  (210, 208, 104, 230000, NULL, 'DichVu', 1, 230000, 230000, 'Khám nhi tổng quát', NULL),
  (211, 208, 102, 120000, NULL, 'DichVu', 1, 120000, 120000, 'Xét nghiệm nhanh theo chỉ định', NULL)
ON DUPLICATE KEY UPDATE
  MaHD = VALUES(MaHD),
  MaDichVu = VALUES(MaDichVu),
  SoTien = VALUES(SoTien),
  MaThuoc = VALUES(MaThuoc),
  LoaiMuc = VALUES(LoaiMuc),
  SoLuong = VALUES(SoLuong),
  DonGia = VALUES(DonGia),
  ThanhTien = VALUES(ThanhTien),
  DienGiai = VALUES(DienGiai),
  MaPX = VALUES(MaPX);

INSERT INTO LichSuThanhToan
  (MaLSTT, MaHD, LoaiGiaoDich, PhuongThucThanhToan, SoTienThanhToan, NgayThanhToan, MaNhanVien, GhiChu)
VALUES
  (201, 203, 'ThanhToan', 'TienMat', 250000, '2026-05-07 09:10:00', 108, 'Thu trước tiền khám'),
  (202, 203, 'ThanhToan', 'TienMat', 400000, '2026-05-07 09:45:00', 108, 'Thu phần còn lại sau khám'),
  (203, 208, 'ThanhToan', 'ChuyenKhoan', 350000, '2026-05-07 10:55:00', 108, 'Thanh toán chuyển khoản')
ON DUPLICATE KEY UPDATE
  MaHD = VALUES(MaHD),
  LoaiGiaoDich = VALUES(LoaiGiaoDich),
  PhuongThucThanhToan = VALUES(PhuongThucThanhToan),
  SoTienThanhToan = VALUES(SoTienThanhToan),
  NgayThanhToan = VALUES(NgayThanhToan),
  MaNhanVien = VALUES(MaNhanVien),
  GhiChu = VALUES(GhiChu);

COMMIT;

