-- Seed du lieu demo tieng Viet co dau cho schema hien tai.
-- MaBN duoc xem la CCCD 12 so.
-- Script dung dai ID 100+ de tranh dung du lieu demo cu va co the chay lai an toan.

USE clinicmanagement;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- 1. Danh muc nen
INSERT INTO VaiTro (MaVaiTro, TenVaiTro) VALUES
  (1, 'Quản trị viên'),
  (2, 'Bác sĩ'),
  (3, 'Lễ tân'),
  (4, 'Kế toán'),
  (6, 'Nhân viên kho')
ON DUPLICATE KEY UPDATE TenVaiTro = VALUES(TenVaiTro);

INSERT INTO ChuyenKhoa (MaChuyenKhoa, TenChuyenKhoa) VALUES
  (101, 'Nội tổng quát'),
  (102, 'Nhi khoa'),
  (103, 'Sản phụ khoa'),
  (104, 'Tim mạch'),
  (105, 'Tai mũi họng')
ON DUPLICATE KEY UPDATE TenChuyenKhoa = VALUES(TenChuyenKhoa);

INSERT INTO Kho (MaKho, TenKho, NhietDoToiThieu, NhietDoToiDa, TrangThai) VALUES
  (101, 'Kho thuốc chính', 18, 28, 1),
  (102, 'Kho thuốc lạnh', 2, 8, 1),
  (103, 'Kho vật tư y tế', 18, 30, 1)
ON DUPLICATE KEY UPDATE
  TenKho = VALUES(TenKho),
  NhietDoToiThieu = VALUES(NhietDoToiThieu),
  NhietDoToiDa = VALUES(NhietDoToiDa),
  TrangThai = VALUES(TrangThai);

INSERT INTO NhaCungCap
  (MaNCC, TenNCC, DiaChi, SoDienThoai, Email, MaSoThue, NguoiLienHe, DieuKhoanThanhToan)
VALUES
  (101, 'Công ty Dược phẩm Minh Tâm', '25 Nguyễn Văn Trỗi, Phường 11, Quận Phú Nhuận, TP.HCM', '02839990001', 'kinhdoanh@minhtampharma.vn', '0312345678', 'Nguyễn Thị Mai', 'Thanh toán chuyển khoản trong 30 ngày'),
  (102, 'Công ty Thiết bị Y tế An Khang', '88 Trần Duy Hưng, Cầu Giấy, Hà Nội', '02435556677', 'lienhe@ankhangmed.vn', '0109988776', 'Trần Quốc Bảo', 'Thanh toán 50% khi nhận hàng, 50% sau nghiệm thu'),
  (103, 'Dược phẩm Miền Tây', '12 Mậu Thân, Ninh Kiều, Cần Thơ', '02923887766', 'sale@mientaypharma.vn', '1800123456', 'Lê Thị Hồng', 'Thanh toán trong 15 ngày')
ON DUPLICATE KEY UPDATE
  TenNCC = VALUES(TenNCC),
  DiaChi = VALUES(DiaChi),
  SoDienThoai = VALUES(SoDienThoai),
  Email = VALUES(Email),
  MaSoThue = VALUES(MaSoThue),
  NguoiLienHe = VALUES(NguoiLienHe),
  DieuKhoanThanhToan = VALUES(DieuKhoanThanhToan);

-- 2. Thuoc, don vi, nha cung cap
INSERT INTO Thuoc
  (MaThuoc, TenThuoc, DonViCoBan, GiaBan, HoatChat, HamLuong, DangBaoChe, QuyCachDongGoi, HangSanXuat, NuocSanXuat, NhietDoBaoQuan, MaVach, LoaiThuoc, TrangThai)
VALUES
  (101, 'Paracetamol 500mg Mekophar', 'Viên', 1200, 'Paracetamol', '500mg', 'Viên nén', 'Hộp 10 vỉ x 10 viên', 'Mekophar', 'Việt Nam', 'Dưới 30°C', '8936001001012', 'KhongKeDon', 1),
  (102, 'Amoxicillin 500mg Vidipha', 'Viên', 2500, 'Amoxicillin', '500mg', 'Viên nang', 'Hộp 10 vỉ x 10 viên', 'Vidipha', 'Việt Nam', 'Dưới 30°C', '8936001001029', 'ThuocKeDon', 1),
  (103, 'Omeprazol 20mg Domesco', 'Viên', 1800, 'Omeprazol', '20mg', 'Viên nang cứng', 'Hộp 3 vỉ x 10 viên', 'Domesco', 'Việt Nam', 'Dưới 30°C', '8936001001036', 'ThuocKeDon', 1),
  (104, 'Nước muối sinh lý Natri Clorid 0,9%', 'Chai', 7000, 'Natri clorid', '0,9%', 'Dung dịch', 'Chai 500ml', 'Bidiphar', 'Việt Nam', 'Nơi khô mát', '8936001001043', 'VatTuYTe', 1),
  (105, 'Gạc y tế tiệt trùng Bảo Thạch', 'Gói', 4500, 'Gạc cotton', '10cm x 10cm', 'Vật tư tiêu hao', 'Gói 10 miếng', 'Bảo Thạch', 'Việt Nam', 'Nơi khô mát', '8936001001050', 'VatTuYTe', 1)
ON DUPLICATE KEY UPDATE
  TenThuoc = VALUES(TenThuoc),
  DonViCoBan = VALUES(DonViCoBan),
  GiaBan = VALUES(GiaBan),
  HoatChat = VALUES(HoatChat),
  HamLuong = VALUES(HamLuong),
  DangBaoChe = VALUES(DangBaoChe),
  QuyCachDongGoi = VALUES(QuyCachDongGoi),
  HangSanXuat = VALUES(HangSanXuat),
  NuocSanXuat = VALUES(NuocSanXuat),
  NhietDoBaoQuan = VALUES(NhietDoBaoQuan),
  MaVach = VALUES(MaVach),
  LoaiThuoc = VALUES(LoaiThuoc),
  TrangThai = VALUES(TrangThai);

INSERT INTO Thuoc_NhaCungCap (MaThuoc, MaNCC, GiaNhap) VALUES
  (101, 101, 800),
  (102, 101, 1800),
  (103, 103, 1200),
  (104, 102, 4800),
  (105, 102, 3000)
ON DUPLICATE KEY UPDATE GiaNhap = VALUES(GiaNhap);

INSERT INTO QuyDoiDonVi (MaQD, MaThuoc, TenDonVi, SoLuong) VALUES
  (101, 101, 'Viên', 1),
  (102, 101, 'Vỉ', 10),
  (103, 101, 'Hộp', 100),
  (104, 102, 'Viên', 1),
  (105, 102, 'Vỉ', 10),
  (106, 102, 'Hộp', 100),
  (107, 103, 'Viên', 1),
  (108, 103, 'Hộp', 30),
  (109, 104, 'Chai', 1),
  (110, 104, 'Thùng', 24),
  (111, 105, 'Gói', 1),
  (112, 105, 'Thùng', 100)
ON DUPLICATE KEY UPDATE
  MaThuoc = VALUES(MaThuoc),
  TenDonVi = VALUES(TenDonVi),
  SoLuong = VALUES(SoLuong);

-- 3. Nhan su, phong kham, lich lam viec
INSERT INTO NhanVien
  (MaNV, HoTen, SoDienThoai, Email, Username, Password, MaVaiTro, MaChuyenKhoa, TrangThai, NgayTao)
VALUES
  (101, 'Nguyễn Hoàng Minh', '0901000101', 'admin.minh@phongkham.vn', 'admin_seed', '123456', 1, NULL, 1, '2026-05-01 08:00:00'),
  (102, 'BS. Trần Thị Thu Hà', '0901000102', 'thuhabs@phongkham.vn', 'bs_thuha', '123456', 2, 101, 1, '2026-05-01 08:05:00'),
  (103, 'BS. Phạm Quốc Huy', '0901000103', 'huybs@phongkham.vn', 'bs_huy', '123456', 2, 102, 1, '2026-05-01 08:10:00'),
  (104, 'BS. Lê Ngọc Anh', '0901000104', 'anhbs@phongkham.vn', 'bs_ngocanh', '123456', 2, 103, 1, '2026-05-01 08:15:00'),
  (105, 'BS. Đỗ Minh Khang', '0901000105', 'khangbs@phongkham.vn', 'bs_khang', '123456', 2, 104, 1, '2026-05-01 08:20:00'),
  (106, 'Vũ Thị Lan', '0901000106', 'letan.lan@phongkham.vn', 'letan_lan', '123456', 3, NULL, 1, '2026-05-01 08:25:00'),
  (107, 'Ngô Thanh Bình', '0901000107', 'kho.binh@phongkham.vn', 'kho_binh', '123456', 6, NULL, 1, '2026-05-01 08:30:00'),
  (108, 'Mai Phương Thảo', '0901000108', 'ketoan.thao@phongkham.vn', 'ketoan_thao', '123456', 4, NULL, 1, '2026-05-01 08:35:00')
ON DUPLICATE KEY UPDATE
  HoTen = VALUES(HoTen),
  SoDienThoai = VALUES(SoDienThoai),
  Email = VALUES(Email),
  Password = VALUES(Password),
  MaVaiTro = VALUES(MaVaiTro),
  MaChuyenKhoa = VALUES(MaChuyenKhoa),
  TrangThai = VALUES(TrangThai);

INSERT INTO PhongKham (MaPhong, TenPhong, MaChuyenKhoa, GhiChu) VALUES
  (101, 'Phòng 301 - Nội tổng quát', 101, 'Tầng 3, khu A'),
  (102, 'Phòng 302 - Nhi khoa', 102, 'Tầng 3, khu A'),
  (103, 'Phòng 303 - Sản phụ khoa', 103, 'Tầng 3, khu A'),
  (104, 'Phòng 401 - Tim mạch', 104, 'Tầng 4, khu B'),
  (105, 'Phòng 402 - Tai mũi họng', 105, 'Tầng 4, khu B')
ON DUPLICATE KEY UPDATE
  TenPhong = VALUES(TenPhong),
  MaChuyenKhoa = VALUES(MaChuyenKhoa),
  GhiChu = VALUES(GhiChu);

INSERT INTO LichLamViecBacSi (MaLich, MaBacSi, MaPhong, NgayLam, GioBatDau, GioKetThuc) VALUES
  (101, 102, 101, '2026-05-07', '08:00:00', '12:00:00'),
  (102, 103, 102, '2026-05-07', '08:00:00', '12:00:00'),
  (103, 104, 103, '2026-05-07', '13:30:00', '17:00:00'),
  (104, 105, 104, '2026-05-07', '13:30:00', '17:00:00'),
  (105, 102, 101, '2026-05-08', '08:00:00', '12:00:00')
ON DUPLICATE KEY UPDATE
  MaBacSi = VALUES(MaBacSi),
  MaPhong = VALUES(MaPhong),
  NgayLam = VALUES(NgayLam),
  GioBatDau = VALUES(GioBatDau),
  GioKetThuc = VALUES(GioKetThuc);

-- 4. Dich vu, goi dich vu
INSERT INTO DichVu
  (MaDichVu, TenDichVu, Gia, Loai, MaDV, MoTa, TrangThai, ThoiLuongPhut, CanDatTruoc, CanChiDinhBacSi, HuongDanTruocKham, ThuTuHienThi, MauNhan, MaChuyenKhoa)
VALUES
  (101, 'Khám nội tổng quát', 250000, 'KhamBenh', 'SEED-KB101', 'Khám lâm sàng, tư vấn bệnh lý thường gặp', 1, 20, 1, 0, 'Mang theo toa thuốc và kết quả xét nghiệm cũ nếu có', 1, '#0ea5e9', 101),
  (102, 'Xét nghiệm công thức máu', 180000, 'XetNghiem', 'SEED-XN102', 'Đánh giá các chỉ số huyết học cơ bản', 1, 15, 0, 1, 'Không cần nhịn ăn', 2, '#f97316', 101),
  (103, 'Siêu âm ổ bụng tổng quát', 450000, 'SieuAm', 'SEED-SA103', 'Khảo sát gan, mật, tụy, lách, thận', 1, 25, 1, 1, 'Nhịn ăn 6 giờ trước siêu âm', 3, '#8b5cf6', 101),
  (104, 'Khám nhi tổng quát', 230000, 'KhamBenh', 'SEED-KB104', 'Khám và tư vấn sức khỏe trẻ em', 1, 20, 1, 0, 'Mang theo sổ tiêm chủng của bé', 4, '#22c55e', 102),
  (105, 'Điện tim tại phòng khám', 150000, 'XetNghiem', 'SEED-XN105', 'Ghi điện tim 12 chuyển đạo', 1, 15, 0, 1, 'Nghỉ ngơi 10 phút trước khi đo', 5, '#ef4444', 104)
ON DUPLICATE KEY UPDATE
  TenDichVu = VALUES(TenDichVu),
  Gia = VALUES(Gia),
  Loai = VALUES(Loai),
  MoTa = VALUES(MoTa),
  TrangThai = VALUES(TrangThai),
  ThoiLuongPhut = VALUES(ThoiLuongPhut),
  CanDatTruoc = VALUES(CanDatTruoc),
  CanChiDinhBacSi = VALUES(CanChiDinhBacSi),
  HuongDanTruocKham = VALUES(HuongDanTruocKham),
  ThuTuHienThi = VALUES(ThuTuHienThi),
  MauNhan = VALUES(MauNhan),
  MaChuyenKhoa = VALUES(MaChuyenKhoa);

INSERT INTO CauHinhDichVu
  (MaCauHinh, MaDichVu, ThoiLuongPhut, CanDatTruoc, CanChiDinhBacSi, HuongDanTruocKham, ThuTuHienThi, MauNhan, MaChuyenKhoa)
VALUES
  (101, 101, 20, 1, 0, 'Đến trước giờ hẹn 15 phút để làm thủ tục', 1, '#0ea5e9', 101),
  (102, 102, 15, 0, 1, 'Không cần nhịn ăn', 2, '#f97316', 101),
  (103, 103, 25, 1, 1, 'Nhịn ăn 6 giờ, uống nước theo hướng dẫn', 3, '#8b5cf6', 101),
  (104, 104, 20, 1, 0, 'Mang theo sổ tiêm chủng', 4, '#22c55e', 102),
  (105, 105, 15, 0, 1, 'Không dùng chất kích thích trước khi đo', 5, '#ef4444', 104)
ON DUPLICATE KEY UPDATE
  ThoiLuongPhut = VALUES(ThoiLuongPhut),
  CanDatTruoc = VALUES(CanDatTruoc),
  CanChiDinhBacSi = VALUES(CanChiDinhBacSi),
  HuongDanTruocKham = VALUES(HuongDanTruocKham),
  ThuTuHienThi = VALUES(ThuTuHienThi),
  MauNhan = VALUES(MauNhan),
  MaChuyenKhoa = VALUES(MaChuyenKhoa);

INSERT INTO GoiDichVu
  (MaGoi, MaGDV, TenGoi, MoTa, GiaGoi, TrangThai, MauHienThi, BieuTuong, NgayTao, NgayCapNhat)
VALUES
  (101, 'SEED-GOI01', 'Gói khám sức khỏe cơ bản', 'Khám tổng quát, xét nghiệm máu và tư vấn kết quả', 390000, 1, '#0ea5e9', 'fa-heart-pulse', '2026-05-01 09:00:00', '2026-05-01 09:00:00'),
  (102, 'SEED-GOI02', 'Gói tầm soát tiêu hóa', 'Khám nội và siêu âm ổ bụng tổng quát', 650000, 1, '#8b5cf6', 'fa-stethoscope', '2026-05-01 09:05:00', '2026-05-01 09:05:00')
ON DUPLICATE KEY UPDATE
  TenGoi = VALUES(TenGoi),
  MoTa = VALUES(MoTa),
  GiaGoi = VALUES(GiaGoi),
  TrangThai = VALUES(TrangThai),
  MauHienThi = VALUES(MauHienThi),
  BieuTuong = VALUES(BieuTuong),
  NgayCapNhat = VALUES(NgayCapNhat);

INSERT INTO ChiTietGoiDichVu (MaCTGoi, MaGoi, MaDichVu, SoLuong, GhiChu) VALUES
  (101, 101, 101, 1, 'Khám và tư vấn ban đầu'),
  (102, 101, 102, 1, 'Xét nghiệm công thức máu'),
  (103, 102, 101, 1, 'Khám nội tổng quát'),
  (104, 102, 103, 1, 'Siêu âm ổ bụng')
ON DUPLICATE KEY UPDATE
  MaGoi = VALUES(MaGoi),
  MaDichVu = VALUES(MaDichVu),
  SoLuong = VALUES(SoLuong),
  GhiChu = VALUES(GhiChu);

-- 5. Benh nhan va luot kham
INSERT INTO BenhNhan
  (MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SoDienThoai, Email, NgayTao)
VALUES
  ('079198800001', 'Nguyễn Thị Thanh Trúc', '1988-04-12', 'Nu', '14 Lý Thường Kiệt, Quận 10, TP.HCM', '0912000001', 'thanhtruc.nguyen@example.vn', '2026-05-02 08:30:00'),
  ('079199500002', 'Trần Văn Phúc', '1995-09-21', 'Nam', '22 Nguyễn Huệ, Quận 1, TP.HCM', '0912000002', 'phuc.tran@example.vn', '2026-05-02 09:00:00'),
  ('001197700003', 'Lê Hoàng Yến', '1977-12-05', 'Nu', '45 Phố Huế, Hai Bà Trưng, Hà Nội', '0912000003', 'yen.le@example.vn', '2026-05-03 10:15:00'),
  ('092201800004', 'Phạm Gia Bảo', '2018-06-30', 'Nam', '7 Trần Hưng Đạo, Ninh Kiều, Cần Thơ', '0912000004', 'giabao.pham@example.vn', '2026-05-04 14:20:00'),
  ('048196900005', 'Đỗ Minh Đức', '1969-03-18', 'Nam', '9 Lê Duẩn, Hải Châu, Đà Nẵng', '0912000005', 'duc.do@example.vn', '2026-05-05 16:45:00')
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
  (101, '079198800001', 102, '2026-05-07', '08:30:00', 'Đau thượng vị, ợ nóng sau ăn', 'DaKham', 101),
  (102, '079199500002', 102, '2026-05-07', '09:30:00', 'Khám sức khỏe định kỳ', 'DaXacNhan', 101),
  (103, '092201800004', 103, '2026-05-07', '10:00:00', 'Trẻ ho, sốt nhẹ hai ngày', 'DaKham', 102),
  (104, '001197700003', 104, '2026-05-07', '14:00:00', 'Tư vấn khám phụ khoa định kỳ', 'ChoXacNhan', 103),
  (105, '048196900005', 105, '2026-05-07', '15:00:00', 'Hồi hộp, tức ngực khi leo cầu thang', 'DaHuy', 104)
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
  (101, 101, 106, 101, 102, 101, 1, '2026-05-07', 'DaKham', 101, '079198800001', 'APPOINTMENT', 'Đau thượng vị, ợ nóng sau ăn', 'Đã khám và lập bệnh án', '2026-05-07 08:20:00'),
  (102, 102, 106, 101, 102, 101, 2, '2026-05-07', 'ChoKham', 101, '079199500002', 'APPOINTMENT', 'Khám sức khỏe định kỳ', 'Bệnh nhân đang chờ khám', '2026-05-07 09:10:00'),
  (103, 103, 106, 102, 103, 102, 1, '2026-05-07', 'DaKham', 102, '092201800004', 'APPOINTMENT', 'Trẻ ho, sốt nhẹ hai ngày', 'Đã kê đơn thuốc', '2026-05-07 09:45:00'),
  (104, NULL, 106, 101, 102, 101, 3, '2026-05-07', 'BoVe', 101, '001197700003', 'WALK_IN', 'Đau đầu nhẹ, muốn khám nhanh', 'Bệnh nhân bỏ khám trước khi vào phòng', '2026-05-07 10:05:00'),
  (105, NULL, 106, 104, 105, 104, 1, '2026-05-07', 'DangKham', 104, '048196900005', 'WALK_IN', 'Tức ngực khi gắng sức', 'Đang đo điện tim', '2026-05-07 14:05:00')
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
  (101, 101, 102, 'Đau thượng vị, ợ nóng, buồn nôn nhẹ', 'Viêm dạ dày cấp', 'Dặn bệnh nhân ăn uống điều độ, tái khám sau 7 ngày nếu còn đau', '2026-05-07 08:55:00'),
  (102, 103, 103, 'Sốt 38 độ, ho khan, chảy mũi trong', 'Viêm hô hấp trên', 'Theo dõi nhiệt độ, uống đủ nước', '2026-05-07 10:25:00'),
  (103, 105, 105, 'Hồi hộp, tức ngực khi leo cầu thang', 'Theo dõi đau ngực chưa xác định', 'Chỉ định điện tim và xét nghiệm men tim nếu cần', '2026-05-07 14:30:00')
ON DUPLICATE KEY UPDATE
  MaPK = VALUES(MaPK),
  MaBacSi = VALUES(MaBacSi),
  TrieuChung = VALUES(TrieuChung),
  ChuanDoan = VALUES(ChuanDoan),
  GhiChu = VALUES(GhiChu),
  NgayLap = VALUES(NgayLap);

INSERT INTO DonThuoc (MaDT, MaBA, NgayKeDon, TrangThai) VALUES
  (101, 101, '2026-05-07 09:00:00', 'DaXuat'),
  (102, 102, '2026-05-07 10:30:00', 'ChuaXuat'),
  (103, 103, '2026-05-07 14:45:00', 'ChuaXuat')
ON DUPLICATE KEY UPDATE
  MaBA = VALUES(MaBA),
  NgayKeDon = VALUES(NgayKeDon),
  TrangThai = VALUES(TrangThai);

INSERT INTO ChiTietDonThuoc (MaCTDT, MaDT, MaThuoc, SoLuong, LieuDung) VALUES
  (101, 101, 103, 14, 'Uống 1 viên trước ăn sáng 30 phút, ngày 1 lần'),
  (102, 101, 101, 10, 'Uống 1 viên khi đau hoặc sốt, cách nhau ít nhất 6 giờ'),
  (103, 102, 101, 12, 'Uống 1 viên khi sốt trên 38,5 độ'),
  (104, 102, 104, 2, 'Rửa mũi ngày 2 lần'),
  (105, 103, 101, 6, 'Chỉ dùng khi đau nhiều, không quá 3 viên mỗi ngày')
ON DUPLICATE KEY UPDATE
  MaDT = VALUES(MaDT),
  MaThuoc = VALUES(MaThuoc),
  SoLuong = VALUES(SoLuong),
  LieuDung = VALUES(LieuDung);

-- 6. Nhap kho, lo thuoc, lich su kho
INSERT INTO PhieuNhapThuoc
  (MaPN, MaNCC, MaNhanVien, NgayNhap, TongTien, LoaiPhieu, GhiChu, MaKho)
VALUES
  (101, 101, 107, '2026-05-01', 2280000, 'NhapMua', 'Nhập thuốc uống thông dụng đầu tháng 5', 101),
  (102, 102, 107, '2026-05-02', 1188000, 'NhapMua', 'Nhập vật tư tiêu hao và dung dịch rửa', 103),
  (103, 103, 107, '2026-05-03', 720000, 'NhapKhac', 'Bổ sung thuốc tiêu hóa', 101)
ON DUPLICATE KEY UPDATE
  MaNCC = VALUES(MaNCC),
  MaNhanVien = VALUES(MaNhanVien),
  NgayNhap = VALUES(NgayNhap),
  TongTien = VALUES(TongTien),
  LoaiPhieu = VALUES(LoaiPhieu),
  GhiChu = VALUES(GhiChu),
  MaKho = VALUES(MaKho);

INSERT INTO ChiTietPhieuNhap
  (MaCTPN, MaPN, MaThuoc, SoLuong, GiaNhap, DonViNhap, SoLuongNhap, HeSoQuyDoi)
VALUES
  (101, 101, 101, 1000, 800, 'Hộp', 10, 100),
  (102, 101, 102, 800, 1800, 'Hộp', 8, 100),
  (103, 102, 104, 120, 4800, 'Thùng', 5, 24),
  (104, 102, 105, 200, 3000, 'Thùng', 2, 100),
  (105, 103, 103, 600, 1200, 'Hộp', 20, 30)
ON DUPLICATE KEY UPDATE
  MaPN = VALUES(MaPN),
  MaThuoc = VALUES(MaThuoc),
  SoLuong = VALUES(SoLuong),
  GiaNhap = VALUES(GiaNhap),
  DonViNhap = VALUES(DonViNhap),
  SoLuongNhap = VALUES(SoLuongNhap),
  HeSoQuyDoi = VALUES(HeSoQuyDoi);

INSERT INTO LoThuoc
  (MaLo, MaThuoc, SoLo, HanSuDung, GiaNhap, MaCTPN, NgaySanXuat, NhietDoBaoQuan, TrangThai, SoLuongNhap, SoLuongDaXuat, GhiChu, MaKho, MaNCC)
VALUES
  (101, 101, 'PCM260501', '2028-05-01', 800, 101, '2026-04-01', 'Dưới 30°C', 'ConHan', 1000, 20, 'Lô Paracetamol nhập đầu tháng 5', 101, 101),
  (102, 102, 'AMX260501', '2027-11-30', 1800, 102, '2026-03-15', 'Dưới 30°C', 'ConHan', 800, 0, 'Kháng sinh kê đơn', 101, 101),
  (103, 104, 'NACL260502', '2028-04-15', 4800, 103, '2026-04-15', 'Nơi khô mát', 'ConHan', 120, 2, 'Dung dịch rửa dùng tại phòng thủ thuật', 103, 102),
  (104, 105, 'GAC260502', '2029-01-31', 3000, 104, '2026-02-01', 'Nơi khô mát', 'ConHan', 200, 5, 'Gạc tiệt trùng', 103, 102),
  (105, 103, 'OME260503', '2027-06-30', 1200, 105, '2026-03-20', 'Dưới 30°C', 'ConHan', 600, 14, 'Thuốc dạ dày', 101, 103)
ON DUPLICATE KEY UPDATE
  MaThuoc = VALUES(MaThuoc),
  SoLo = VALUES(SoLo),
  HanSuDung = VALUES(HanSuDung),
  GiaNhap = VALUES(GiaNhap),
  MaCTPN = VALUES(MaCTPN),
  NgaySanXuat = VALUES(NgaySanXuat),
  NhietDoBaoQuan = VALUES(NhietDoBaoQuan),
  TrangThai = VALUES(TrangThai),
  SoLuongNhap = VALUES(SoLuongNhap),
  SoLuongDaXuat = VALUES(SoLuongDaXuat),
  GhiChu = VALUES(GhiChu),
  MaKho = VALUES(MaKho),
  MaNCC = VALUES(MaNCC);

INSERT INTO LichSuKho
  (MaLS, MaThuoc, MaLo, Loai, SoLuong, ThoiGian, ThamChieuID, GhiChu)
VALUES
  (101, 101, 101, 'Nhap', 1000, '2026-05-01 08:30:00', 101, 'Nhập kho theo phiếu PN-101'),
  (102, 102, 102, 'Nhap', 800, '2026-05-01 08:35:00', 101, 'Nhập kho theo phiếu PN-101'),
  (103, 104, 103, 'Nhap', 120, '2026-05-02 09:00:00', 102, 'Nhập kho vật tư'),
  (104, 105, 104, 'Nhap', 200, '2026-05-02 09:05:00', 102, 'Nhập gạc tiệt trùng'),
  (105, 103, 105, 'Nhap', 600, '2026-05-03 10:00:00', 103, 'Nhập thuốc tiêu hóa'),
  (106, 103, 105, 'Xuat', 14, '2026-05-07 09:10:00', 101, 'Xuất thuốc cho đơn 101'),
  (107, 101, 101, 'Xuat', 10, '2026-05-07 09:10:00', 101, 'Xuất thuốc cho đơn 101'),
  (108, 105, 104, 'Huy', 5, '2026-05-06 16:00:00', 101, 'Hủy gạc rách bao bì')
ON DUPLICATE KEY UPDATE
  MaThuoc = VALUES(MaThuoc),
  MaLo = VALUES(MaLo),
  Loai = VALUES(Loai),
  SoLuong = VALUES(SoLuong),
  ThoiGian = VALUES(ThoiGian),
  ThamChieuID = VALUES(ThamChieuID),
  GhiChu = VALUES(GhiChu);

-- 7. Xuat thuoc, hoa don, thanh toan
INSERT INTO PhieuXuatThuoc
  (MaPX, MaNhanVien, MaKho, LoaiXuat, MaBN, NgayXuat, GhiChu, TrangThai, MaDT, TongTien, MaNCC, LyDoHuy)
VALUES
  (101, 107, 101, 'BanChoBN', '079198800001', '2026-05-07 09:10:00', 'Xuất thuốc theo đơn dạ dày', 'HoanThanh', 101, 42000, NULL, NULL),
  (102, 107, 103, 'NoiBo', NULL, '2026-05-07 11:00:00', 'Xuất nước muối cho phòng thủ thuật', 'HoanThanh', NULL, 14000, NULL, NULL),
  (103, 107, 103, 'Huy', NULL, '2026-05-06 16:00:00', 'Hủy vật tư lỗi bao bì', 'Huy', NULL, 22500, NULL, 'Bao bì rách, không đảm bảo vô khuẩn')
ON DUPLICATE KEY UPDATE
  MaNhanVien = VALUES(MaNhanVien),
  MaKho = VALUES(MaKho),
  LoaiXuat = VALUES(LoaiXuat),
  MaBN = VALUES(MaBN),
  NgayXuat = VALUES(NgayXuat),
  GhiChu = VALUES(GhiChu),
  TrangThai = VALUES(TrangThai),
  MaDT = VALUES(MaDT),
  TongTien = VALUES(TongTien),
  MaNCC = VALUES(MaNCC),
  LyDoHuy = VALUES(LyDoHuy);

INSERT INTO ChiTietPhieuXuat
  (MaCTPX, MaPX, MaLo, SoLuong, DonGia, ThanhTien)
VALUES
  (101, 101, 105, 14, 1800, 25200),
  (102, 101, 101, 10, 1200, 12000),
  (103, 102, 103, 2, 7000, 14000),
  (104, 103, 104, 5, 4500, 22500)
ON DUPLICATE KEY UPDATE
  MaPX = VALUES(MaPX),
  MaLo = VALUES(MaLo),
  SoLuong = VALUES(SoLuong),
  DonGia = VALUES(DonGia),
  ThanhTien = VALUES(ThanhTien);

INSERT INTO PhieuHuyThuoc
  (MaHuy, MaLo, SoLuong, LyDo, NgayHuy, MaNhanVien)
VALUES
  (101, 104, 5, 'Bao bì rách trong quá trình vận chuyển nội bộ, không đảm bảo vô khuẩn', '2026-05-06 16:00:00', 107)
ON DUPLICATE KEY UPDATE
  MaLo = VALUES(MaLo),
  SoLuong = VALUES(SoLuong),
  LyDo = VALUES(LyDo),
  NgayHuy = VALUES(NgayHuy),
  MaNhanVien = VALUES(MaNhanVien);

INSERT INTO HoaDon
  (MaHD, MaBA, MaPK, MaNhanVien, PhuongThucThanhToan, NgayThanhToan, TrangThai, MaHoaDon, NgayTao, TongTien, GiamGia, ThanhTienCuoi, HanThanhToan, GhiChu, MaPX)
VALUES
  (101, 101, 101, 108, 'TienMat', '2026-05-07 09:20:00', 'DaThanhToan', 'HD-SEED-000101', '2026-05-07 08:25:00', 742000, 20000, 722000, '2026-05-07', 'Thanh toán đủ sau khi khám và nhận thuốc', 101),
  (102, NULL, 102, 106, NULL, '2026-05-07 09:15:00', 'ChuaThanhToan', 'HD-SEED-000102', '2026-05-07 09:15:00', 250000, 0, 250000, '2026-05-07', 'Hóa đơn nháp tiền khám cho phiếu đang chờ', NULL),
  (103, 102, 103, 108, 'ChuyenKhoan', '2026-05-07 10:45:00', 'DaThanhToan', 'HD-SEED-000103', '2026-05-07 09:50:00', 350000, 0, 350000, '2026-05-07', 'Thanh toán chuyển khoản qua QR', NULL),
  (104, NULL, 104, 106, NULL, '2026-05-07 10:05:00', 'DaHuy', 'HD-SEED-000104', '2026-05-07 10:05:00', 250000, 0, 250000, '2026-05-07', 'Bệnh nhân bỏ khám, hóa đơn đã hủy', NULL),
  (105, 103, 105, 108, NULL, '2026-05-07 14:35:00', 'ChuaThanhToan', 'HD-SEED-000105', '2026-05-07 14:10:00', 400000, 0, 400000, '2026-05-07', 'Chưa thanh toán đủ do đang chờ kết quả điện tim', NULL)
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
  (101, 101, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám nội tổng quát', NULL),
  (102, 101, 102, 180000, NULL, 'DichVu', 1, 180000, 180000, 'Xét nghiệm công thức máu', NULL),
  (103, 101, 103, 450000, NULL, 'DichVu', 1, 450000, 450000, 'Siêu âm ổ bụng tổng quát', NULL),
  (104, 101, NULL, 25200, 103, 'Thuoc', 14, 1800, 25200, 'Omeprazol 20mg Domesco - lô OME260503', 101),
  (105, 101, NULL, 12000, 101, 'Thuoc', 10, 1200, 12000, 'Paracetamol 500mg Mekophar - lô PCM260501', 101),
  (106, 102, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám nội tổng quát', NULL),
  (107, 103, 104, 230000, NULL, 'DichVu', 1, 230000, 230000, 'Khám nhi tổng quát', NULL),
  (108, 103, 102, 120000, NULL, 'DichVu', 1, 120000, 120000, 'Xét nghiệm nhanh theo chỉ định', NULL),
  (109, 104, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám đã hủy do bỏ khám', NULL),
  (110, 105, 105, 150000, NULL, 'DichVu', 1, 150000, 150000, 'Điện tim tại phòng khám', NULL),
  (111, 105, 101, 250000, NULL, 'DichVu', 1, 250000, 250000, 'Tiền khám tim mạch ban đầu', NULL)
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
  (101, 101, 'ThanhToan', 'TienMat', 250000, '2026-05-07 08:35:00', 108, 'Thu trước tiền khám'),
  (102, 101, 'ThanhToan', 'QRPay', 472000, '2026-05-07 09:20:00', 108, 'Thanh toán phần dịch vụ và thuốc còn lại'),
  (103, 103, 'ThanhToan', 'ChuyenKhoan', 350000, '2026-05-07 10:45:00', 108, 'Bệnh nhân chuyển khoản qua mã QR'),
  (104, 105, 'ThanhToan', 'The', 150000, '2026-05-07 14:40:00', 108, 'Tạm thu tiền điện tim')
ON DUPLICATE KEY UPDATE
  MaHD = VALUES(MaHD),
  LoaiGiaoDich = VALUES(LoaiGiaoDich),
  PhuongThucThanhToan = VALUES(PhuongThucThanhToan),
  SoTienThanhToan = VALUES(SoTienThanhToan),
  NgayThanhToan = VALUES(NgayThanhToan),
  MaNhanVien = VALUES(MaNhanVien),
  GhiChu = VALUES(GhiChu);

-- 8. Kiem ke
INSERT INTO PhieuKiemKe
  (MaKK, MaKho, MaNhanVien, NgayKiemKe, TrangThai)
VALUES
  (101, 101, 107, '2026-05-06 17:00:00', 'DaDuyet'),
  (102, 103, 107, '2026-05-06 17:30:00', 'Nhap')
ON DUPLICATE KEY UPDATE
  MaKho = VALUES(MaKho),
  MaNhanVien = VALUES(MaNhanVien),
  NgayKiemKe = VALUES(NgayKiemKe),
  TrangThai = VALUES(TrangThai);

INSERT INTO ChiTietKiemKe
  (MaCTKK, MaKK, MaLo, SoLuongHeThong, SoLuongThucTe, ChenhLech, LyDo)
VALUES
  (101, 101, 101, 980, 980, 0, 'Khớp số lượng thực tế'),
  (102, 101, 105, 586, 586, 0, 'Khớp số lượng thực tế'),
  (103, 102, 104, 195, 195, 0, 'Đang nhập phiếu kiểm kê kho vật tư')
ON DUPLICATE KEY UPDATE
  MaKK = VALUES(MaKK),
  MaLo = VALUES(MaLo),
  SoLuongHeThong = VALUES(SoLuongHeThong),
  SoLuongThucTe = VALUES(SoLuongThucTe),
  ChenhLech = VALUES(ChenhLech),
  LyDo = VALUES(LyDo);

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
