dichvuCREATE DATABASE  IF NOT EXISTS `clinicmanagement` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `clinicmanagement`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: clinicmanagement
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `baocaonhapxuat`
--

DROP TABLE IF EXISTS `baocaonhapxuat`;
/*!50001 DROP VIEW IF EXISTS `baocaonhapxuat`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `baocaonhapxuat` AS SELECT 
 1 AS `Loai`,
 1 AS `MaThuoc`,
 1 AS `MaLo`,
 1 AS `SoLuong`,
 1 AS `ThoiGian`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `benhan`
--

DROP TABLE IF EXISTS `benhan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `benhan` (
  `MaBA` int NOT NULL AUTO_INCREMENT,
  `MaPK` int NOT NULL,
  `MaBacSi` int NOT NULL,
  `TrieuChung` text,
  `ChuanDoan` text,
  `GhiChu` text,
  `NgayLap` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBA`),
  KEY `MaPK` (`MaPK`),
  KEY `MaBacSi` (`MaBacSi`),
  CONSTRAINT `benhan_ibfk_1` FOREIGN KEY (`MaPK`) REFERENCES `phieukham` (`MaPK`),
  CONSTRAINT `benhan_ibfk_2` FOREIGN KEY (`MaBacSi`) REFERENCES `nhanvien` (`MaNV`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `benhan`
--

LOCK TABLES `benhan` WRITE;
/*!40000 ALTER TABLE `benhan` DISABLE KEYS */;
INSERT INTO `benhan` VALUES (3,1,10,'Đau vùng thượng vị, ợ chua','Viêm loét dạ dày nhẹ','Kiêng ăn đồ cay nóng, uống thuốc đều đặn','2026-04-16 13:20:21');
/*!40000 ALTER TABLE `benhan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `benhnhan`
--

DROP TABLE IF EXISTS `benhnhan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `benhnhan` (
  `MaBN` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `NgaySinh` date DEFAULT NULL,
  `GioiTinh` enum('Nam','Nu','Khac') DEFAULT NULL,
  `DiaChi` text,
  `SoDienThoai` varchar(15) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBN`),
  UNIQUE KEY `SoDienThoai` (`SoDienThoai`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `benhnhan`
--

LOCK TABLES `benhnhan` WRITE;
/*!40000 ALTER TABLE `benhnhan` DISABLE KEYS */;
INSERT INTO `benhnhan` VALUES (1,'Nguyễn Văn An','1995-05-15','Nam','123 Đường Lê Lợi, Quận 1, TP.HCM','0905123456','an.nguyen@gmail.com','2026-04-13 11:23:24'),(2,'Trần Thị Bình','1988-10-20','Nu','456 Đường Nguyễn Huệ, Quận Hải Châu, Đà Nẵng','0912987654','binhtran@gmail.com','2026-04-13 11:23:24'),(3,'Lê Hoàng Long','2002-02-02','Nam','789 Đường Hùng Vương, Ba Đình, Hà Nội','0988000111','longlh@gmail.com','2026-04-13 11:23:24');
/*!40000 ALTER TABLE `benhnhan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cauhinhdichvu`
--

DROP TABLE IF EXISTS `cauhinhdichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cauhinhdichvu` (
  `MaCauHinh` int NOT NULL AUTO_INCREMENT,
  `MaDichVu` int NOT NULL,
  `ThoiLuongPhut` int DEFAULT '15',
  `CanDatTruoc` tinyint(1) DEFAULT '0',
  `CanChiDinhBacSi` tinyint(1) DEFAULT '0',
  `HuongDanTruocKham` text,
  `ThuTuHienThi` int DEFAULT '0',
  `MauNhan` varchar(20) DEFAULT NULL,
  `MaChuyenKhoa` int DEFAULT NULL,
  PRIMARY KEY (`MaCauHinh`),
  UNIQUE KEY `MaDichVu` (`MaDichVu`),
  KEY `MaChuyenKhoa` (`MaChuyenKhoa`),
  CONSTRAINT `cauhinhdichvu_ibfk_1` FOREIGN KEY (`MaDichVu`) REFERENCES `dichvu` (`MaDichVu`) ON DELETE CASCADE,
  CONSTRAINT `cauhinhdichvu_ibfk_2` FOREIGN KEY (`MaChuyenKhoa`) REFERENCES `chuyenkhoa` (`MaChuyenKhoa`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cauhinhdichvu`
--

LOCK TABLES `cauhinhdichvu` WRITE;
/*!40000 ALTER TABLE `cauhinhdichvu` DISABLE KEYS */;
INSERT INTO `cauhinhdichvu` VALUES (1,1,20,1,0,'Nên đến trước 15 phút để làm thủ tục',1,'#0ea5e9',1),(2,2,15,1,1,'Nhịn ăn 8 giờ trước khi lấy máu nếu có chỉ định',2,'#f97316',1),(3,3,25,1,1,'Uống đủ nước trước khi siêu âm nếu bác sĩ yêu cầu',3,'#8b5cf6',1),(4,4,20,1,0,'Không dùng thuốc xịt mũi trước khi khám nếu không cần thiết',4,'#2563eb',6),(5,5,10,0,0,'Có thể thực hiện nhanh trong ngày',5,'#16a34a',1);
/*!40000 ALTER TABLE `cauhinhdichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietdonthuoc`
--

DROP TABLE IF EXISTS `chitietdonthuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdonthuoc` (
  `MaCTDT` int NOT NULL AUTO_INCREMENT,
  `MaDT` int DEFAULT NULL,
  `MaThuoc` int DEFAULT NULL,
  `SoLuong` int DEFAULT NULL,
  `LieuDung` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaCTDT`),
  KEY `MaDT` (`MaDT`),
  KEY `MaThuoc` (`MaThuoc`),
  CONSTRAINT `chitietdonthuoc_ibfk_1` FOREIGN KEY (`MaDT`) REFERENCES `donthuoc` (`MaDT`),
  CONSTRAINT `chitietdonthuoc_ibfk_2` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietdonthuoc`
--

LOCK TABLES `chitietdonthuoc` WRITE;
/*!40000 ALTER TABLE `chitietdonthuoc` DISABLE KEYS */;
INSERT INTO `chitietdonthuoc` VALUES (1,4,1,14,'Uống 1 viên mỗi lần, ngày 2 lần sau khi ăn sáng và tối'),(2,4,2,10,'Uống 1 viên khi sốt trên 38.5 độ, cách nhau ít nhất 4 tiếng');
/*!40000 ALTER TABLE `chitietdonthuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietgoidichvu`
--

DROP TABLE IF EXISTS `chitietgoidichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietgoidichvu` (
  `MaCTGoi` int NOT NULL AUTO_INCREMENT,
  `MaGoi` int NOT NULL,
  `MaDichVu` int NOT NULL,
  `SoLuong` int DEFAULT '1',
  `GhiChu` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaCTGoi`),
  UNIQUE KEY `uq_goi_dichvu` (`MaGoi`,`MaDichVu`),
  KEY `MaDichVu` (`MaDichVu`),
  CONSTRAINT `chitietgoidichvu_ibfk_1` FOREIGN KEY (`MaGoi`) REFERENCES `goidichvu` (`MaGoi`) ON DELETE CASCADE,
  CONSTRAINT `chitietgoidichvu_ibfk_2` FOREIGN KEY (`MaDichVu`) REFERENCES `dichvu` (`MaDichVu`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietgoidichvu`
--

LOCK TABLES `chitietgoidichvu` WRITE;
/*!40000 ALTER TABLE `chitietgoidichvu` DISABLE KEYS */;
INSERT INTO `chitietgoidichvu` VALUES (4,2,1,1,'Khám định kỳ thai kỳ'),(5,2,3,2,'Siêu âm thai'),(6,2,5,1,'Theo dõi đường huyết thai kỳ'),(7,3,1,1,'Khám nội tổng quát'),(8,3,2,1,'Xét nghiệm máu'),(9,3,5,1,'Kiểm tra đường huyết'),(14,4,2,1,NULL),(15,4,5,1,NULL),(16,5,2,1,NULL),(17,5,3,1,NULL);
/*!40000 ALTER TABLE `chitietgoidichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitiethoadon`
--

DROP TABLE IF EXISTS `chitiethoadon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitiethoadon` (
  `MaCTHD` int NOT NULL AUTO_INCREMENT,
  `MaHD` int DEFAULT NULL,
  `MaDichVu` int DEFAULT NULL,
  `SoTien` decimal(10,2) DEFAULT NULL,
  `MaThuoc` int DEFAULT NULL,
  `LoaiMuc` enum('DichVu','Thuoc') DEFAULT 'DichVu',
  `SoLuong` int DEFAULT '1',
  `DonGia` decimal(12,2) DEFAULT '0.00',
  `ThanhTien` decimal(12,2) DEFAULT '0.00',
  `DienGiai` varchar(255) DEFAULT NULL,
  `MaPX` int DEFAULT NULL,
  PRIMARY KEY (`MaCTHD`),
  KEY `MaHD` (`MaHD`),
  KEY `MaDichVu` (`MaDichVu`),
  KEY `MaThuoc` (`MaThuoc`),
  KEY `MaPX` (`MaPX`),
  CONSTRAINT `chitiethoadon_ibfk_1` FOREIGN KEY (`MaHD`) REFERENCES `hoadon` (`MaHD`),
  CONSTRAINT `chitiethoadon_ibfk_2` FOREIGN KEY (`MaDichVu`) REFERENCES `dichvu` (`MaDichVu`),
  CONSTRAINT `chitiethoadon_ibfk_3` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`),
  CONSTRAINT `chitiethoadon_ibfk_4` FOREIGN KEY (`MaPX`) REFERENCES `phieuxuatthuoc` (`MaPX`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitiethoadon`
--

LOCK TABLES `chitiethoadon` WRITE;
/*!40000 ALTER TABLE `chitiethoadon` DISABLE KEYS */;
INSERT INTO `chitiethoadon` VALUES (7,3,1,250000.00,NULL,'DichVu',1,250000.00,250000.00,'Khám nội tổng quát',NULL),(8,3,2,120000.00,NULL,'DichVu',1,120000.00,120000.00,'Xét nghiệm đường huyết',NULL),(9,3,3,450000.00,NULL,'DichVu',1,450000.00,450000.00,'Siêu âm ổ bụng',NULL),(30,3,NULL,217000.00,1,'Thuoc',14,15500.00,217000.00,'Augmentin | Số lô: AUGM2134 | PX-00005',5),(31,3,NULL,12500.00,2,'Thuoc',10,1250.00,12500.00,'Panadol Extra | Số lô: PAN25012 | PX-00005',5);
/*!40000 ALTER TABLE `chitiethoadon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietkiemke`
--

DROP TABLE IF EXISTS `chitietkiemke`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietkiemke` (
  `MaCTKK` int NOT NULL AUTO_INCREMENT,
  `MaKK` int DEFAULT NULL,
  `MaLo` int DEFAULT NULL,
  `SoLuongHeThong` int DEFAULT NULL,
  `SoLuongThucTe` int DEFAULT NULL,
  `ChenhLech` int DEFAULT NULL,
  `LyDo` text,
  PRIMARY KEY (`MaCTKK`),
  KEY `MaKK` (`MaKK`),
  KEY `MaLo` (`MaLo`),
  CONSTRAINT `chitietkiemke_ibfk_1` FOREIGN KEY (`MaKK`) REFERENCES `phieukiemke` (`MaKK`),
  CONSTRAINT `chitietkiemke_ibfk_2` FOREIGN KEY (`MaLo`) REFERENCES `lothuoc` (`MaLo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietkiemke`
--

LOCK TABLES `chitietkiemke` WRITE;
/*!40000 ALTER TABLE `chitietkiemke` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietkiemke` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietphieunhap`
--

DROP TABLE IF EXISTS `chitietphieunhap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietphieunhap` (
  `MaCTPN` int NOT NULL AUTO_INCREMENT,
  `MaPN` int DEFAULT NULL,
  `MaThuoc` int DEFAULT NULL,
  `SoLuong` int NOT NULL,
  `GiaNhap` decimal(10,2) DEFAULT NULL,
  `DonViNhap` varchar(50) DEFAULT NULL,
  `SoLuongNhap` int DEFAULT NULL,
  `HeSoQuyDoi` int DEFAULT NULL,
  PRIMARY KEY (`MaCTPN`),
  KEY `MaPN` (`MaPN`),
  KEY `MaThuoc` (`MaThuoc`),
  CONSTRAINT `chitietphieunhap_ibfk_1` FOREIGN KEY (`MaPN`) REFERENCES `phieunhapthuoc` (`MaPN`),
  CONSTRAINT `chitietphieunhap_ibfk_2` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`),
  CONSTRAINT `chk_gianhap` CHECK ((`GiaNhap` >= 0)),
  CONSTRAINT `chk_soluong_nhap` CHECK ((`SoLuong` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietphieunhap`
--

LOCK TABLES `chitietphieunhap` WRITE;
/*!40000 ALTER TABLE `chitietphieunhap` DISABLE KEYS */;
INSERT INTO `chitietphieunhap` VALUES (61,21,1,280,11000.00,NULL,NULL,NULL),(62,21,2,1800,950.00,NULL,NULL,NULL),(63,22,5,50,75000.00,NULL,NULL,NULL),(64,22,8,240,9500.00,NULL,NULL,NULL),(65,23,3,300,7200.00,NULL,NULL,NULL),(66,23,9,300,14500.00,NULL,NULL,NULL),(67,24,6,140,18500.00,NULL,NULL,NULL),(68,24,7,280,15000.00,NULL,NULL,NULL),(69,25,4,1000,3200.00,NULL,NULL,NULL),(70,25,10,300,4800.00,NULL,NULL,NULL),(72,29,1,1400,11000.00,'Thung',1,1400),(73,30,1,1400,11000.00,'Thung',1,1400),(74,31,1,1400,11000.00,'Thung',1,1400),(75,32,2,7200,850.00,'Thung',1,7200),(76,33,8,576,9500.00,'Thung',1,576);
/*!40000 ALTER TABLE `chitietphieunhap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chitietphieuxuat`
--

DROP TABLE IF EXISTS `chitietphieuxuat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietphieuxuat` (
  `MaCTPX` int NOT NULL AUTO_INCREMENT,
  `MaPX` int DEFAULT NULL,
  `MaLo` int DEFAULT NULL,
  `SoLuong` int DEFAULT NULL,
  `DonGia` decimal(10,2) DEFAULT NULL,
  `ThanhTien` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`MaCTPX`),
  KEY `MaPX` (`MaPX`),
  KEY `MaLo` (`MaLo`),
  CONSTRAINT `chitietphieuxuat_ibfk_1` FOREIGN KEY (`MaPX`) REFERENCES `phieuxuatthuoc` (`MaPX`),
  CONSTRAINT `chitietphieuxuat_ibfk_2` FOREIGN KEY (`MaLo`) REFERENCES `lothuoc` (`MaLo`),
  CONSTRAINT `chk_dongia` CHECK ((`DonGia` >= 0)),
  CONSTRAINT `chk_soluong_xuat` CHECK ((`SoLuong` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chitietphieuxuat`
--

LOCK TABLES `chitietphieuxuat` WRITE;
/*!40000 ALTER TABLE `chitietphieuxuat` DISABLE KEYS */;
INSERT INTO `chitietphieuxuat` VALUES (3,5,13,14,15500.00,217000.00),(4,5,2,10,1250.00,12500.00);
/*!40000 ALTER TABLE `chitietphieuxuat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chuyenkhoa`
--

DROP TABLE IF EXISTS `chuyenkhoa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chuyenkhoa` (
  `MaChuyenKhoa` int NOT NULL AUTO_INCREMENT,
  `TenChuyenKhoa` varchar(100) NOT NULL,
  PRIMARY KEY (`MaChuyenKhoa`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chuyenkhoa`
--

LOCK TABLES `chuyenkhoa` WRITE;
/*!40000 ALTER TABLE `chuyenkhoa` DISABLE KEYS */;
INSERT INTO `chuyenkhoa` VALUES (1,'Nội Tổng Quát'),(2,'Nhi Khoa'),(3,'Sản Phụ Khoa'),(4,'Da Liễu'),(5,'Tim Mạch'),(6,'Tai Mũi Họng');
/*!40000 ALTER TABLE `chuyenkhoa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dichvu`
--

DROP TABLE IF EXISTS `dichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dichvu` (
  `MaDichVu` int NOT NULL AUTO_INCREMENT,
  `TenDichVu` varchar(100) DEFAULT NULL,
  `Gia` decimal(10,2) DEFAULT NULL,
  `Loai` enum('KhamBenh','XetNghiem','SieuAm') DEFAULT NULL,
  `MaDV` varchar(20) DEFAULT NULL,
  `MoTa` text,
  `TrangThai` tinyint(1) DEFAULT '1',
  `ThoiLuongPhut` int DEFAULT '15',
  `CanDatTruoc` tinyint(1) DEFAULT '0',
  `CanChiDinhBacSi` tinyint(1) DEFAULT '0',
  `HuongDanTruocKham` text,
  `ThuTuHienThi` int DEFAULT '0',
  `MauNhan` varchar(20) DEFAULT NULL,
  `MaChuyenKhoa` int DEFAULT NULL,
  PRIMARY KEY (`MaDichVu`),
  UNIQUE KEY `MaDV` (`MaDV`),
  KEY `MaChuyenKhoa` (`MaChuyenKhoa`),
  CONSTRAINT `dichvu_ibfk_1` FOREIGN KEY (`MaChuyenKhoa`) REFERENCES `chuyenkhoa` (`MaChuyenKhoa`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dichvu`
--

LOCK TABLES `dichvu` WRITE;
/*!40000 ALTER TABLE `dichvu` DISABLE KEYS */;
INSERT INTO `dichvu` VALUES (1,'Khám nội tổng quát',250000.00,'KhamBenh','DVK001','Khám lâm sàng tổng quát cho bệnh nhân',1,15,0,0,NULL,0,NULL,NULL),(2,'Xét nghiệm công thức máu',180000.00,'XetNghiem','DVX001','Phân tích chỉ số máu cơ bản',1,15,0,0,NULL,0,NULL,NULL),(3,'Siêu âm ổ bụng',450000.00,'SieuAm','DVS001','Siêu âm tổng quát vùng ổ bụng',1,15,0,0,NULL,0,NULL,NULL),(4,'Khám tai mũi họng',220000.00,'KhamBenh','DVK002','Khám chuyên khoa tai mũi họng',1,15,0,0,NULL,0,NULL,NULL),(5,'Xét nghiệm đường huyết',120000.00,'XetNghiem','DVX002','Đo nồng độ đường huyết trong máu',1,15,0,0,NULL,0,NULL,NULL);
/*!40000 ALTER TABLE `dichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donthuoc`
--

DROP TABLE IF EXISTS `donthuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donthuoc` (
  `MaDT` int NOT NULL AUTO_INCREMENT,
  `MaBA` int NOT NULL,
  `NgayKeDon` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` enum('ChuaXuat','DaXuat') DEFAULT 'ChuaXuat',
  PRIMARY KEY (`MaDT`),
  KEY `MaBA` (`MaBA`),
  CONSTRAINT `donthuoc_ibfk_1` FOREIGN KEY (`MaBA`) REFERENCES `benhan` (`MaBA`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donthuoc`
--

LOCK TABLES `donthuoc` WRITE;
/*!40000 ALTER TABLE `donthuoc` DISABLE KEYS */;
INSERT INTO `donthuoc` VALUES (4,3,'2026-04-16 13:23:37','DaXuat');
/*!40000 ALTER TABLE `donthuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goidichvu`
--

DROP TABLE IF EXISTS `goidichvu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goidichvu` (
  `MaGoi` int NOT NULL AUTO_INCREMENT,
  `MaGDV` varchar(20) DEFAULT NULL,
  `TenGoi` varchar(150) NOT NULL,
  `MoTa` text,
  `GiaGoi` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TrangThai` tinyint(1) DEFAULT '1',
  `MauHienThi` varchar(20) DEFAULT NULL,
  `BieuTuong` varchar(50) DEFAULT NULL,
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayCapNhat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaGoi`),
  UNIQUE KEY `MaGDV` (`MaGDV`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goidichvu`
--

LOCK TABLES `goidichvu` WRITE;
/*!40000 ALTER TABLE `goidichvu` DISABLE KEYS */;
INSERT INTO `goidichvu` VALUES (2,NULL,'Gói chăm sóc thai kỳ','Gói theo dõi và chăm sóc thai kỳ định kỳ',8400000.00,1,'#7c3aed','fa-user-md','2026-04-17 05:35:23','2026-04-17 05:35:23'),(3,NULL,'Gói tầm soát tim mạch','Gói kiểm tra sức khỏe tim mạch và các chỉ số liên quan',2100000.00,1,'#dc2626','fa-heart','2026-04-17 05:35:23','2026-04-17 05:35:23'),(4,'GDV004','Gói combo xét nghiệm',NULL,2000000.00,1,NULL,'fa-heartbeat','2026-04-17 15:53:38','2026-04-17 15:54:13'),(5,'GDV005','Gói siêu âm và xét nghiệm',NULL,2300000.00,1,NULL,'fa-heartbeat','2026-04-17 15:55:36','2026-04-17 15:55:36');
/*!40000 ALTER TABLE `goidichvu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoadon`
--

DROP TABLE IF EXISTS `hoadon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hoadon` (
  `MaHD` int NOT NULL AUTO_INCREMENT,
  `MaBA` int DEFAULT NULL,
  `MaNhanVien` int DEFAULT NULL,
  `PhuongThucThanhToan` enum('TienMat','ChuyenKhoan') DEFAULT NULL,
  `NgayThanhToan` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` enum('ChuaThanhToan','DaThanhToan','QuaHan','Huy') DEFAULT 'ChuaThanhToan',
  `MaHoaDon` varchar(30) DEFAULT NULL,
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `TongTien` decimal(12,2) DEFAULT '0.00',
  `GiamGia` decimal(12,2) DEFAULT '0.00',
  `ThanhTienCuoi` decimal(12,2) DEFAULT '0.00',
  `HanThanhToan` date DEFAULT NULL,
  `GhiChu` text,
  `MaPX` int DEFAULT NULL,
  PRIMARY KEY (`MaHD`),
  UNIQUE KEY `MaHoaDon` (`MaHoaDon`),
  KEY `MaBA` (`MaBA`),
  KEY `MaNhanVien` (`MaNhanVien`),
  KEY `fk_hoadon_mapx` (`MaPX`),
  CONSTRAINT `fk_hoadon_mapx` FOREIGN KEY (`MaPX`) REFERENCES `phieuxuatthuoc` (`MaPX`),
  CONSTRAINT `hoadon_ibfk_1` FOREIGN KEY (`MaBA`) REFERENCES `benhan` (`MaBA`),
  CONSTRAINT `hoadon_ibfk_2` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNV`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoadon`
--

LOCK TABLES `hoadon` WRITE;
/*!40000 ALTER TABLE `hoadon` DISABLE KEYS */;
INSERT INTO `hoadon` VALUES (3,3,15,'TienMat',NULL,'ChuaThanhToan','HD00001','2026-04-17 07:00:24',1279000.00,20000.00,1259000.00,'2026-04-20','Hóa đơn khám ngoại trú',NULL);
/*!40000 ALTER TABLE `hoadon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kho`
--

DROP TABLE IF EXISTS `kho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kho` (
  `MaKho` int NOT NULL AUTO_INCREMENT,
  `TenKho` varchar(100) DEFAULT NULL,
  `NhietDoToiThieu` float DEFAULT NULL,
  `NhietDoToiDa` float DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`MaKho`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kho`
--

LOCK TABLES `kho` WRITE;
/*!40000 ALTER TABLE `kho` DISABLE KEYS */;
INSERT INTO `kho` VALUES (1,'Kho Chính',15,30,1);
/*!40000 ALTER TABLE `kho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lichkham`
--

DROP TABLE IF EXISTS `lichkham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lichkham` (
  `MaLK` int NOT NULL AUTO_INCREMENT,
  `MaBN` int NOT NULL,
  `MaBacSi` int NOT NULL,
  `NgayHen` date NOT NULL,
  `GioHen` time DEFAULT NULL,
  `LyDoKham` text,
  `TrangThai` enum('ChoXacNhan','DaXacNhan','DaHuy','DaKham') DEFAULT 'ChoXacNhan',
  `MaLich` int DEFAULT NULL,
  PRIMARY KEY (`MaLK`),
  KEY `MaBN` (`MaBN`),
  KEY `MaBacSi` (`MaBacSi`),
  KEY `MaLich` (`MaLich`),
  CONSTRAINT `lichkham_ibfk_1` FOREIGN KEY (`MaBN`) REFERENCES `benhnhan` (`MaBN`),
  CONSTRAINT `lichkham_ibfk_2` FOREIGN KEY (`MaBacSi`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `lichkham_ibfk_3` FOREIGN KEY (`MaLich`) REFERENCES `lichlamviecbacsi` (`MaLich`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichkham`
--

LOCK TABLES `lichkham` WRITE;
/*!40000 ALTER TABLE `lichkham` DISABLE KEYS */;
INSERT INTO `lichkham` VALUES (5,1,10,'2026-04-16','08:30:00','Đau dạ dày','DaXacNhan',3),(6,2,11,'2026-04-16','09:00:00','Ho sốt','DaXacNhan',4);
/*!40000 ALTER TABLE `lichkham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lichlamviecbacsi`
--

DROP TABLE IF EXISTS `lichlamviecbacsi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lichlamviecbacsi` (
  `MaLich` int NOT NULL AUTO_INCREMENT,
  `MaBacSi` int NOT NULL,
  `MaPhong` int DEFAULT NULL,
  `NgayLam` date DEFAULT NULL,
  `GioBatDau` time DEFAULT NULL,
  `GioKetThuc` time DEFAULT NULL,
  PRIMARY KEY (`MaLich`),
  KEY `MaBacSi` (`MaBacSi`),
  KEY `MaPhong` (`MaPhong`),
  CONSTRAINT `lichlamviecbacsi_ibfk_1` FOREIGN KEY (`MaBacSi`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `lichlamviecbacsi_ibfk_2` FOREIGN KEY (`MaPhong`) REFERENCES `phongkham` (`MaPhong`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichlamviecbacsi`
--

LOCK TABLES `lichlamviecbacsi` WRITE;
/*!40000 ALTER TABLE `lichlamviecbacsi` DISABLE KEYS */;
INSERT INTO `lichlamviecbacsi` VALUES (3,10,1,'2026-04-16','07:30:00','11:30:00'),(4,11,1,'2026-04-16','13:30:00','17:30:00'),(5,12,2,'2026-04-16','07:30:00','11:30:00'),(6,13,2,'2026-04-16','13:30:00','17:30:00');
/*!40000 ALTER TABLE `lichlamviecbacsi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lichsukho`
--

DROP TABLE IF EXISTS `lichsukho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lichsukho` (
  `MaLS` int NOT NULL AUTO_INCREMENT,
  `MaThuoc` int DEFAULT NULL,
  `MaLo` int DEFAULT NULL,
  `Loai` enum('Nhap','Xuat','KiemKe','Huy') DEFAULT NULL,
  `SoLuong` int DEFAULT NULL,
  `ThoiGian` datetime DEFAULT CURRENT_TIMESTAMP,
  `ThamChieuID` int DEFAULT NULL,
  `GhiChu` text,
  PRIMARY KEY (`MaLS`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lichsukho`
--

LOCK TABLES `lichsukho` WRITE;
/*!40000 ALTER TABLE `lichsukho` DISABLE KEYS */;
INSERT INTO `lichsukho` VALUES (1,1,12,'Nhap',1400,'2026-04-12 20:36:22',30,NULL),(2,1,13,'Nhap',1400,'2026-04-12 21:34:35',31,NULL),(3,2,14,'Nhap',7200,'2026-04-12 21:41:07',32,NULL),(4,1,13,'Xuat',14,'2026-04-16 23:26:01',5,NULL),(5,2,2,'Xuat',10,'2026-04-16 23:26:01',5,NULL),(6,8,15,'Nhap',576,'2026-04-23 19:26:01',33,NULL);
/*!40000 ALTER TABLE `lichsukho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lothuoc`
--

DROP TABLE IF EXISTS `lothuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lothuoc` (
  `MaLo` int NOT NULL AUTO_INCREMENT,
  `MaThuoc` int DEFAULT NULL,
  `SoLo` varchar(50) DEFAULT NULL,
  `HanSuDung` date DEFAULT NULL,
  `GiaNhap` decimal(10,2) DEFAULT NULL,
  `MaCTPN` int DEFAULT NULL,
  `NgaySanXuat` date DEFAULT NULL,
  `NhietDoBaoQuan` varchar(50) DEFAULT NULL,
  `TrangThai` enum('ConHan','SapHetHan','HetHan','DaHuy') DEFAULT 'ConHan',
  `SoLuongNhap` int DEFAULT NULL,
  `SoLuongDaXuat` int DEFAULT '0',
  `GhiChu` text,
  `MaKho` int DEFAULT NULL,
  `MaNCC` int DEFAULT NULL,
  PRIMARY KEY (`MaLo`),
  UNIQUE KEY `unique_ctpn` (`MaCTPN`),
  UNIQUE KEY `unique_lo_thuoc` (`MaThuoc`,`SoLo`),
  KEY `MaKho` (`MaKho`),
  KEY `MaNCC` (`MaNCC`),
  KEY `idx_lo_hansudung` (`HanSuDung`),
  KEY `idx_lo_thuoc` (`MaThuoc`),
  KEY `idx_ctpn` (`MaCTPN`),
  KEY `idx_fefo` (`MaThuoc`,`MaKho`,`HanSuDung`),
  CONSTRAINT `lothuoc_ibfk_1` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`),
  CONSTRAINT `lothuoc_ibfk_2` FOREIGN KEY (`MaCTPN`) REFERENCES `chitietphieunhap` (`MaCTPN`),
  CONSTRAINT `lothuoc_ibfk_3` FOREIGN KEY (`MaKho`) REFERENCES `kho` (`MaKho`),
  CONSTRAINT `lothuoc_ibfk_4` FOREIGN KEY (`MaNCC`) REFERENCES `nhacungcap` (`MaNCC`),
  CONSTRAINT `chk_trangthai_lo` CHECK ((`TrangThai` in (_utf8mb4'ConHan',_utf8mb4'SapHetHan',_utf8mb4'HetHan',_utf8mb4'DaHuy')))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lothuoc`
--

LOCK TABLES `lothuoc` WRITE;
/*!40000 ALTER TABLE `lothuoc` DISABLE KEYS */;
INSERT INTO `lothuoc` VALUES (1,1,'AUG24001','2026-12-01',11000.00,61,'2023-12-01','Dưới 25°C','ConHan',280,0,'Lô nhập khẩu Pháp, hộp 14 viên',1,1),(2,2,'PAN25012','2027-05-20',850.00,62,'2024-05-20','Dưới 30°C','ConHan',1800,10,'Lô Australia, hộp 180 viên',1,1),(3,5,'VEN2309','2026-03-15',75000.00,63,'2023-03-15','Dưới 30°C','HetHan',50,0,'Bình xịt định liều',1,1),(4,8,'GAV2408','2026-09-12',9500.00,64,'2023-09-12','Dưới 30°C','ConHan',240,0,'Hỗn dịch uống, hộp 24 gói',1,1),(5,3,'AML2405','2026-08-30',7200.00,65,'2023-08-30','Dưới 30°C','ConHan',300,0,'Hộp 30 viên',1,2),(6,9,'LIP2411','2026-11-15',14500.00,66,'2023-11-15','Dưới 30°C','ConHan',300,0,'Thuốc mỡ máu Pfizer',1,2),(7,6,'NEX2402','2026-11-30',18500.00,67,'2024-02-28','Dưới 30°C','ConHan',140,0,'Viên nén bao tan trong ruột',1,3),(8,7,'CRE2411','2027-01-05',15000.00,68,'2024-01-05','Dưới 30°C','ConHan',280,0,'Hộp 28 viên',1,3),(9,4,'GLU2410','2027-02-10',3200.00,69,'2024-02-10','Dưới 25°C','ConHan',1000,0,'Thuốc tiểu đường Merck',1,4),(10,10,'LOS2403','2026-03-20',4800.00,70,'2023-03-20','Dưới 30°C','HetHan',300,0,'Hộp 30 viên từ Stada',1,5),(11,1,'AUG24678','2027-01-16',11000.00,72,'2025-06-05',NULL,'ConHan',NULL,0,NULL,1,1),(12,1,'AUGM6066','2027-12-12',11000.00,73,'2025-02-11',NULL,'ConHan',1400,0,NULL,1,1),(13,1,'AUGM2134','2026-06-15',11000.00,74,'2025-07-12',NULL,'SapHetHan',1400,14,NULL,1,1),(14,2,'PANA1435','2026-04-04',850.00,75,'2024-02-12',NULL,'HetHan',7200,0,NULL,1,1),(15,8,'GAV2409','2027-10-23',9500.00,76,'2025-01-23',NULL,'ConHan',576,0,NULL,1,1);
/*!40000 ALTER TABLE `lothuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `lothuoc_fefo`
--

DROP TABLE IF EXISTS `lothuoc_fefo`;
/*!50001 DROP VIEW IF EXISTS `lothuoc_fefo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `lothuoc_fefo` AS SELECT 
 1 AS `MaLo`,
 1 AS `MaThuoc`,
 1 AS `MaKho`,
 1 AS `SoLo`,
 1 AS `HanSuDung`,
 1 AS `TrangThai`,
 1 AS `Ton`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `nhacungcap`
--

DROP TABLE IF EXISTS `nhacungcap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhacungcap` (
  `MaNCC` int NOT NULL AUTO_INCREMENT,
  `TenNCC` varchar(100) DEFAULT NULL,
  `DiaChi` text,
  `SoDienThoai` varchar(15) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `MaSoThue` varchar(50) DEFAULT NULL,
  `NguoiLienHe` varchar(100) DEFAULT NULL,
  `DieuKhoanThanhToan` text,
  PRIMARY KEY (`MaNCC`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhacungcap`
--

LOCK TABLES `nhacungcap` WRITE;
/*!40000 ALTER TABLE `nhacungcap` DISABLE KEYS */;
INSERT INTO `nhacungcap` VALUES (1,'GlaxoSmithKline Vietnam','Lô I-5, Đường D1, KCN Tân Thuận, Q.7, TP.HCM','02837701234','contact@gsk.com.vn','0101234567','Nguyễn Thị Lan','Thanh toán trong 30 ngày kể từ ngày nhận hàng'),(2,'Pfizer Vietnam','Tầng 12, Tòa nhà Saigon Centre, Q.1, TP.HCM','02838245678','procurement@pfizer.com.vn','0107654321','Trần Văn Bình','Thanh toán 45 ngày'),(3,'AstraZeneca Vietnam','Số 2, Đường Nguyễn Thị Minh Khai, Q.3, TP.HCM','02839345678','supply@astrazeneca.com.vn','0109876543','Lê Thị Hương','Thanh toán 30 ngày'),(4,'Merck Vietnam','Tầng 15, Tòa nhà Bitexco, Q.1, TP.HCM','02839123456','vnprocurement@merckgroup.com','0101122334','Phạm Minh Quân','Thanh toán 60 ngày'),(5,'Stada Vietnam','Khu công nghiệp Biên Hòa, Đồng Nai','02513891234','info@stada.vn','0105566778','Hoàng Văn Nam','Thanh toán 30 ngày'),(6,'Sanofi Vietnam','10 Hàm Nghi, Quận 1, TP.HCM','02838298526','supply.vn@sanofi.com','0102233445','Nguyễn Minh Triết','Thanh toán 30 ngày'),(7,'Zuellig Pharma Vietnam','KCN Tân Tạo, Quận Bình Tân, TP.HCM','02837542655','zp.vn@zuelligpharma.com','0103344556','Trương Mỹ Linh','Thanh toán 45 ngày'),(8,'Dược Hậu Giang (DHG)','288 Nguyễn Văn Cừ, Cần Thơ','02923891433','dhgpharma@dhgpharma.com.vn','1800156801','Lê Hoàng Nam','Thanh toán 15 ngày'),(9,'Traphaco Vietnam','75 Yên Ninh, Ba Đình, Hà Nội','02436810615','info@traphaco.com.vn','0100108656','Đặng Thu Thảo','Thanh toán 30 ngày'),(10,'DKSH Vietnam','Số 23 Đại lộ Thống Nhất, KCN VSIP, Bình Dương','02743756312','healthcare.vn@dksh.com','3700303206','Phan Anh Tuấn','Thanh toán 60 ngày');
/*!40000 ALTER TABLE `nhacungcap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nhanvien`
--

DROP TABLE IF EXISTS `nhanvien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhanvien` (
  `MaNV` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `SoDienThoai` varchar(15) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Username` varchar(50) DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `MaVaiTro` int NOT NULL,
  `MaChuyenKhoa` int DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `NgayTao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaNV`),
  UNIQUE KEY `Username` (`Username`),
  KEY `MaVaiTro` (`MaVaiTro`),
  KEY `MaChuyenKhoa` (`MaChuyenKhoa`),
  CONSTRAINT `nhanvien_ibfk_1` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`),
  CONSTRAINT `nhanvien_ibfk_2` FOREIGN KEY (`MaChuyenKhoa`) REFERENCES `chuyenkhoa` (`MaChuyenKhoa`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhanvien`
--

LOCK TABLES `nhanvien` WRITE;
/*!40000 ALTER TABLE `nhanvien` DISABLE KEYS */;
INSERT INTO `nhanvien` VALUES (9,'Nguyen Van Tuan','0901234567','admin@clinic.com','admin','123456',1,NULL,1,'2026-03-20 19:20:04'),(10,'BS. Le Van Hai','0912345678','bsb@clinic.com','bsb','123456',2,1,1,'2026-03-20 19:20:04'),(11,'BS. Tran Thi Ngan','0923456789','bsc@clinic.com','bsc','123456',2,2,1,'2026-03-20 19:20:04'),(12,'BS. Pham Van Dong','0934567890','bsd@clinic.com','bsd','123456',2,3,1,'2026-03-20 19:20:04'),(13,'BS. Nguyen Thi Hoa','0945678901','bse@clinic.com','bse','123456',2,4,1,'2026-03-20 19:20:04'),(14,'BS. Hoang Van Kien','0956789012','bsf@clinic.com','bsf','123456',2,5,1,'2026-03-20 19:20:04'),(15,'Tran Thi Hien','0967890123','letang@clinic.com','letang','123456',3,NULL,1,'2026-03-20 19:20:04'),(16,'Le Van Quynh','0978901234','letanh@clinic.com','letanh','123456',3,NULL,1,'2026-03-20 19:20:04'),(17,'BS. Nguyen Van Minh','0987654321','bs.minh@clinic.com','bsminh','123456',2,1,1,'2026-03-20 19:20:04'),(18,'BS. Tran Thi Hong','0976543210','bs.hong@clinic.com','bshong','123456',2,1,1,'2026-03-20 19:20:04'),(19,'BS. Le Van Thanh','0965432109','bs.thanh@clinic.com','bsthanh','123456',2,2,1,'2026-03-20 19:20:04'),(20,'BS. Pham Thi Lan','0954321098','bs.lan@clinic.com','bslan','123456',2,2,1,'2026-03-20 19:20:04'),(21,'BS. Hoang Thi Huong','0943210987','bs.huong@clinic.com','bshuong','123456',2,3,1,'2026-03-20 19:20:04'),(22,'BS. Nguyen Thi Thanh','0932109876','bs.thanh@clinic.com','bsthanh2','123456',2,3,1,'2026-03-20 19:20:04'),(23,'BS. Tran Van Duc','0921098765','bs.duc@clinic.com','bsduc','123456',2,4,1,'2026-03-20 19:20:04'),(24,'BS. Le Thi Ngoc','0910987654','bs.ngoc@clinic.com','bsngoc','123456',2,4,1,'2026-03-20 19:20:04'),(25,'BS. Pham Van Cuong','0909876543','bs.cuong@clinic.com','bscuong','123456',2,5,1,'2026-03-20 19:20:04'),(26,'BS. Nguyen Thi Kim','0898765432','bs.kim@clinic.com','bskim','123456',2,5,1,'2026-03-20 19:20:04'),(27,'BS. Hoang Van Anh','0887654321','bs.anh@clinic.com','bsanh','123456',2,6,1,'2026-03-20 19:20:04'),(28,'BS. Tran Thi Thu','0876543210','bs.thu@clinic.com','bsthu','123456',2,6,1,'2026-03-20 19:20:04'),(29,'Nguyen The Anh','0989234567','theanh@clinic.com','tanh','123456',6,NULL,1,'2026-03-20 19:31:01'),(30,'Nguyen Hoang Hung','0989234867','hhung@clinic.com','hhung','123456',6,NULL,1,'2026-03-20 19:31:01');
/*!40000 ALTER TABLE `nhanvien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieuhuythuoc`
--

DROP TABLE IF EXISTS `phieuhuythuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieuhuythuoc` (
  `MaHuy` int NOT NULL AUTO_INCREMENT,
  `MaLo` int DEFAULT NULL,
  `SoLuong` int DEFAULT NULL,
  `LyDo` text,
  `NgayHuy` datetime DEFAULT CURRENT_TIMESTAMP,
  `MaNhanVien` int DEFAULT NULL,
  PRIMARY KEY (`MaHuy`),
  KEY `MaLo` (`MaLo`),
  KEY `MaNhanVien` (`MaNhanVien`),
  CONSTRAINT `phieuhuythuoc_ibfk_1` FOREIGN KEY (`MaLo`) REFERENCES `lothuoc` (`MaLo`),
  CONSTRAINT `phieuhuythuoc_ibfk_2` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNV`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieuhuythuoc`
--

LOCK TABLES `phieuhuythuoc` WRITE;
/*!40000 ALTER TABLE `phieuhuythuoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `phieuhuythuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieukham`
--

DROP TABLE IF EXISTS `phieukham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieukham` (
  `MaPK` int NOT NULL AUTO_INCREMENT,
  `MaLK` int DEFAULT NULL,
  `MaLeTan` int DEFAULT NULL,
  `MaPhong` int DEFAULT NULL,
  `MaBacSi` int DEFAULT NULL,
  `MaChuyenKhoa` int DEFAULT NULL,
  `STT` int DEFAULT NULL,
  `NgayKham` date DEFAULT (curdate()),
  `TrangThai` enum('ChoKham','DangKham','DaKham','BoVe') DEFAULT 'ChoKham',
  `MaLich` int DEFAULT NULL,
  `MaBN` int DEFAULT NULL,
  PRIMARY KEY (`MaPK`),
  KEY `MaLK` (`MaLK`),
  KEY `MaLeTan` (`MaLeTan`),
  KEY `MaPhong` (`MaPhong`),
  KEY `MaLich` (`MaLich`),
  KEY `MaBN` (`MaBN`),
  KEY `fk_phieukham_bacsi` (`MaBacSi`),
  KEY `fk_phieukham_chuyenkhoa` (`MaChuyenKhoa`),
  CONSTRAINT `fk_phieukham_bacsi` FOREIGN KEY (`MaBacSi`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `fk_phieukham_chuyenkhoa` FOREIGN KEY (`MaChuyenKhoa`) REFERENCES `chuyenkhoa` (`MaChuyenKhoa`),
  CONSTRAINT `phieukham_ibfk_1` FOREIGN KEY (`MaLK`) REFERENCES `lichkham` (`MaLK`),
  CONSTRAINT `phieukham_ibfk_2` FOREIGN KEY (`MaLeTan`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `phieukham_ibfk_3` FOREIGN KEY (`MaPhong`) REFERENCES `phongkham` (`MaPhong`),
  CONSTRAINT `phieukham_ibfk_4` FOREIGN KEY (`MaLich`) REFERENCES `lichlamviecbacsi` (`MaLich`),
  CONSTRAINT `phieukham_ibfk_5` FOREIGN KEY (`MaBN`) REFERENCES `benhnhan` (`MaBN`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieukham`
--

LOCK TABLES `phieukham` WRITE;
/*!40000 ALTER TABLE `phieukham` DISABLE KEYS */;
INSERT INTO `phieukham` VALUES (1,5,15,1,10,1,1,'2026-04-16','DangKham',5,1),(2,6,15,2,11,2,2,'2026-04-16','ChoKham',6,2);
/*!40000 ALTER TABLE `phieukham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieukiemke`
--

DROP TABLE IF EXISTS `phieukiemke`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieukiemke` (
  `MaKK` int NOT NULL AUTO_INCREMENT,
  `MaKho` int DEFAULT NULL,
  `MaNhanVien` int DEFAULT NULL,
  `NgayKiemKe` datetime DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` enum('Nhap','DaDuyet') DEFAULT NULL,
  PRIMARY KEY (`MaKK`),
  KEY `MaKho` (`MaKho`),
  KEY `MaNhanVien` (`MaNhanVien`),
  CONSTRAINT `phieukiemke_ibfk_1` FOREIGN KEY (`MaKho`) REFERENCES `kho` (`MaKho`),
  CONSTRAINT `phieukiemke_ibfk_2` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNV`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieukiemke`
--

LOCK TABLES `phieukiemke` WRITE;
/*!40000 ALTER TABLE `phieukiemke` DISABLE KEYS */;
/*!40000 ALTER TABLE `phieukiemke` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieunhapthuoc`
--

DROP TABLE IF EXISTS `phieunhapthuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieunhapthuoc` (
  `MaPN` int NOT NULL AUTO_INCREMENT,
  `MaNCC` int DEFAULT NULL,
  `MaNhanVien` int DEFAULT NULL,
  `NgayNhap` date DEFAULT (curdate()),
  `TongTien` decimal(12,2) DEFAULT '0.00',
  `LoaiPhieu` enum('NhapMua','NhapTra','NhapKhac') DEFAULT 'NhapMua',
  `GhiChu` text,
  `MaKho` int DEFAULT NULL,
  PRIMARY KEY (`MaPN`),
  KEY `MaNCC` (`MaNCC`),
  KEY `MaNhanVien` (`MaNhanVien`),
  KEY `MaKho` (`MaKho`),
  CONSTRAINT `phieunhapthuoc_ibfk_1` FOREIGN KEY (`MaNCC`) REFERENCES `nhacungcap` (`MaNCC`),
  CONSTRAINT `phieunhapthuoc_ibfk_2` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `phieunhapthuoc_ibfk_3` FOREIGN KEY (`MaKho`) REFERENCES `kho` (`MaKho`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieunhapthuoc`
--

LOCK TABLES `phieunhapthuoc` WRITE;
/*!40000 ALTER TABLE `phieunhapthuoc` DISABLE KEYS */;
INSERT INTO `phieunhapthuoc` VALUES (21,1,29,'2026-03-01',4790000.00,'NhapMua','Nhập lô hàng tháng 3/2026 từ GSK: Augmentin và Panadol Extra',1),(22,1,29,'2026-03-05',6030000.00,'NhapMua','Nhập bổ sung từ GSK: Ventolin Evohaler và Gaviscon Dual Action',1),(23,2,30,'2026-03-10',6510000.00,'NhapMua','Nhập từ Pfizer: Amlor và Lipitor (thuốc tim mạch)',1),(24,3,30,'2026-03-12',6790000.00,'NhapMua','Nhập từ AstraZeneca: Nexium Mups và Crestor (dạ dày và mỡ máu)',1),(25,4,29,'2026-03-15',4640000.00,'NhapMua','Nhập từ Merck: Glucophage; và Losartan từ Stada (đái tháo đường & huyết áp)',1),(29,1,29,'2026-04-05',15400000.00,'NhapMua','',1),(30,1,29,'2026-04-12',15400000.00,'NhapMua','',1),(31,1,29,'2026-04-12',15400000.00,'NhapMua','',1),(32,1,29,'2026-04-12',6120000.00,'NhapMua','',1),(33,1,29,'2026-04-23',5472000.00,'NhapMua','',1);
/*!40000 ALTER TABLE `phieunhapthuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieuxuatthuoc`
--

DROP TABLE IF EXISTS `phieuxuatthuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phieuxuatthuoc` (
  `MaPX` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int DEFAULT NULL,
  `MaKho` int DEFAULT NULL,
  `LoaiXuat` enum('BanChoBN','NoiBo','TraNCC','Huy') DEFAULT NULL,
  `MaBN` int DEFAULT NULL,
  `NgayXuat` datetime DEFAULT CURRENT_TIMESTAMP,
  `GhiChu` text,
  `TrangThai` enum('Nhap','HoanThanh','Huy') DEFAULT 'Nhap',
  `MaDT` int DEFAULT NULL,
  `TongTien` decimal(12,2) DEFAULT '0.00',
  `MaNCC` int DEFAULT NULL,
  `LyDoHuy` text,
  PRIMARY KEY (`MaPX`),
  KEY `MaNhanVien` (`MaNhanVien`),
  KEY `MaKho` (`MaKho`),
  KEY `MaBN` (`MaBN`),
  KEY `MaDT` (`MaDT`),
  KEY `MaNCC` (`MaNCC`),
  CONSTRAINT `phieuxuatthuoc_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNV`),
  CONSTRAINT `phieuxuatthuoc_ibfk_2` FOREIGN KEY (`MaKho`) REFERENCES `kho` (`MaKho`),
  CONSTRAINT `phieuxuatthuoc_ibfk_3` FOREIGN KEY (`MaBN`) REFERENCES `benhnhan` (`MaBN`),
  CONSTRAINT `phieuxuatthuoc_ibfk_4` FOREIGN KEY (`MaDT`) REFERENCES `donthuoc` (`MaDT`),
  CONSTRAINT `phieuxuatthuoc_ibfk_5` FOREIGN KEY (`MaNCC`) REFERENCES `nhacungcap` (`MaNCC`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieuxuatthuoc`
--

LOCK TABLES `phieuxuatthuoc` WRITE;
/*!40000 ALTER TABLE `phieuxuatthuoc` DISABLE KEYS */;
INSERT INTO `phieuxuatthuoc` VALUES (5,29,1,'BanChoBN',1,'2026-04-16 23:25:00','{\"note\":\"Theo đơn #4\",\"meta\":{\"MaKhoa\":null,\"TenKhoa\":\"\",\"MaNCC\":null,\"TenNCC\":\"\",\"LyDo\":\"\",\"updatedAt\":\"2026-04-16T16:26:01.338Z\",\"completedAt\":\"2026-04-16T16:26:01.417Z\"},\"items\":[{\"MaThuoc\":1,\"TenThuoc\":\"Augmentin\",\"HoatChat\":\"\",\"SoLuong\":14,\"DonGia\":15500,\"DonVi\":\"Viên\",\"LieuDung\":\"\",\"GhiChu\":\"\",\"LoSoLuong\":1,\"SoLo\":\"AUGM2134\",\"HanSuDung\":\"2026-06-14T17:00:00.000Z\",\"NgaySanXuat\":\"2025-07-11T17:00:00.000Z\",\"DonViCoBan\":\"Viên\",\"Ton\":3080,\"ThanhTien\":217000,\"allocations\":[{\"MaLo\":13,\"SoLo\":\"AUGM2134\",\"HanSuDung\":\"2026-06-14T17:00:00.000Z\",\"NgaySanXuat\":\"2025-07-11T17:00:00.000Z\",\"NhietDoBaoQuan\":null,\"TenNCC\":\"GlaxoSmithKline Vietnam\",\"NgayNhap\":\"2026-04-11T17:00:00.000Z\",\"Ton\":1400,\"SoLuongXuat\":14,\"DonGia\":15500,\"ThanhTien\":217000,\"warnings\":[{\"level\":\"warning\",\"code\":\"near_expiry\",\"message\":\"Lô c?n date còn 60 ngày\"}]}],\"warnings\":[{\"level\":\"warning\",\"code\":\"near_expiry\",\"message\":\"Lô c?n date còn 60 ngày\"}]},{\"MaThuoc\":2,\"TenThuoc\":\"Panadol Extra\",\"HoatChat\":\"\",\"SoLuong\":10,\"DonGia\":1250,\"DonVi\":\"Viên\",\"LieuDung\":\"\",\"GhiChu\":\"\",\"LoSoLuong\":1,\"SoLo\":\"PAN25012\",\"HanSuDung\":\"2027-05-19T17:00:00.000Z\",\"NgaySanXuat\":\"2024-05-19T17:00:00.000Z\",\"DonViCoBan\":\"Viên\",\"Ton\":1800,\"ThanhTien\":12500,\"allocations\":[{\"MaLo\":2,\"SoLo\":\"PAN25012\",\"HanSuDung\":\"2027-05-19T17:00:00.000Z\",\"NgaySanXuat\":\"2024-05-19T17:00:00.000Z\",\"NhietDoBaoQuan\":\"Dưới 30°C\",\"TenNCC\":\"GlaxoSmithKline Vietnam\",\"NgayNhap\":\"2026-02-28T17:00:00.000Z\",\"Ton\":1800,\"SoLuongXuat\":10,\"DonGia\":1250,\"ThanhTien\":12500,\"warnings\":[{\"level\":\"info\",\"code\":\"storage\",\"message\":\"B?o qu?n: Dưới 30°C\"}]}],\"warnings\":[{\"level\":\"info\",\"code\":\"storage\",\"message\":\"B?o qu?n: Dưới 30°C\"}]}]}','HoanThanh',4,229500.00,NULL,NULL);
/*!40000 ALTER TABLE `phieuxuatthuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phongkham`
--

DROP TABLE IF EXISTS `phongkham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phongkham` (
  `MaPhong` int NOT NULL AUTO_INCREMENT,
  `TenPhong` varchar(50) NOT NULL,
  `GhiChu` text,
  `MaChuyenKhoa` int NOT NULL,
  PRIMARY KEY (`MaPhong`),
  KEY `fk_phongkham_chuyenkhoa` (`MaChuyenKhoa`),
  CONSTRAINT `fk_phongkham_chuyenkhoa` FOREIGN KEY (`MaChuyenKhoa`) REFERENCES `chuyenkhoa` (`MaChuyenKhoa`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phongkham`
--

LOCK TABLES `phongkham` WRITE;
/*!40000 ALTER TABLE `phongkham` DISABLE KEYS */;
INSERT INTO `phongkham` VALUES (1,'Phòng 101 - Nội Tổng Quát','Tầng 1',1),(2,'Phòng 102 - Nhi Khoa','Tầng 1',2),(3,'Phòng 103 - Sản Phụ Khoa','Tầng 1',3),(4,'Phòng 201 - Da Liễu','Tầng 2',4),(5,'Phòng 202 - Tim Mạch','Tầng 2',5),(6,'Phòng 203 - Tai Mũi Họng','Tầng 2',6);
/*!40000 ALTER TABLE `phongkham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quydoidonvi`
--

DROP TABLE IF EXISTS `quydoidonvi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quydoidonvi` (
  `MaQD` int NOT NULL AUTO_INCREMENT,
  `MaThuoc` int DEFAULT NULL,
  `TenDonVi` varchar(50) DEFAULT NULL,
  `SoLuong` int DEFAULT NULL,
  PRIMARY KEY (`MaQD`),
  KEY `MaThuoc` (`MaThuoc`),
  CONSTRAINT `quydoidonvi_ibfk_1` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quydoidonvi`
--

LOCK TABLES `quydoidonvi` WRITE;
/*!40000 ALTER TABLE `quydoidonvi` DISABLE KEYS */;
INSERT INTO `quydoidonvi` VALUES (1,1,'Vien',1),(2,1,'Vi',7),(3,1,'Hop',14),(4,1,'Thung',1400),(5,2,'Vien',1),(6,2,'Vi',12),(7,2,'Hop',180),(8,2,'Thung',7200),(9,3,'Vien',1),(10,3,'Vi',10),(11,3,'Hop',30),(12,4,'Vien',1),(13,4,'Vi',20),(14,4,'Hop',100),(15,5,'Vien',1),(16,5,'Vi',10),(17,5,'Hop',100),(18,6,'Vien',1),(19,6,'Vi',7),(20,6,'Hop',14),(21,7,'Vien',1),(22,7,'Vi',10),(23,7,'Hop',100),(24,8,'Goi',1),(25,8,'Hop',24),(26,8,'Thung',576),(27,9,'Goi',1),(28,9,'Hop',30),(29,10,'Vien',1),(30,10,'Vi',10),(31,10,'Hop',30);
/*!40000 ALTER TABLE `quydoidonvi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thuoc`
--

DROP TABLE IF EXISTS `thuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thuoc` (
  `MaThuoc` int NOT NULL AUTO_INCREMENT,
  `TenThuoc` varchar(100) NOT NULL,
  `DonViCoBan` varchar(20) DEFAULT NULL,
  `GiaBan` decimal(10,2) DEFAULT NULL,
  `HoatChat` varchar(255) DEFAULT NULL,
  `HamLuong` varchar(100) DEFAULT NULL,
  `DangBaoChe` varchar(100) DEFAULT NULL,
  `QuyCachDongGoi` varchar(100) DEFAULT NULL,
  `HangSanXuat` varchar(255) DEFAULT NULL,
  `NuocSanXuat` varchar(100) DEFAULT NULL,
  `NhietDoBaoQuan` varchar(50) DEFAULT NULL,
  `MaVach` varchar(100) DEFAULT NULL,
  `LoaiThuoc` enum('ThuocKeDon','KhongKeDon','VatTuYTe') DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`MaThuoc`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thuoc`
--

LOCK TABLES `thuoc` WRITE;
/*!40000 ALTER TABLE `thuoc` DISABLE KEYS */;
INSERT INTO `thuoc` VALUES (1,'Augmentin','Viên',15500.00,'Amoxicillin, Acid Clavulanic','500mg/125mg','Viên nén bao phim','Hộp 2 vỉ x 7 viên','GlaxoSmithKline','Pháp/Anh','Dưới 25°C','3004508200123','ThuocKeDon',NULL),(2,'Panadol Extra','Viên',1250.00,'Paracetamol, Caffeine','500mg/65mg','Viên nén','Hộp 15 vỉ x 12 viên','GSK','Australia','Dưới 30°C','8934658000012','KhongKeDon',NULL),(3,'Amlor','Viên',9800.00,'Amlodipine besylate','5mg','Viên nang cứng','Hộp 3 vỉ x 10 viên','Pfizer','Pháp','Dưới 30°C','3004500012345','ThuocKeDon',NULL),(4,'Glucophage','Viên',4500.00,'Metformin hydrochloride','850mg','Viên nén bao phim','Hộp 5 vỉ x 20 viên','Merck','Pháp','Dưới 25°C','4022536789012','ThuocKeDon',NULL),(5,'Ventolin Evohaler','Bình',95000.00,'Salbutamol','100mcg/liều','Hỗn dịch xịt định liều','Hộp 1 bình 200 liều','GSK','Tây Ban Nha/Anh','Dưới 30°C','5012345678901','ThuocKeDon',NULL),(6,'Nexium Mups','Viên',22500.00,'Esomeprazole magnesium','40mg','Viên nén','Hộp 2 vỉ x 7 viên','AstraZeneca','Thụy Điển','Dưới 30°C','7321835002015','ThuocKeDon',NULL),(7,'Crestor','Viên',18500.00,'Rosuvastatin calcium','10mg','Viên nén bao phim','Hộp 2 vỉ x 14 viên','AstraZeneca','Anh','Dưới 30°C','7321835010041','ThuocKeDon',NULL),(8,'Gaviscon Dual Action','Gói',12000.00,'Natri bicarbonate, Canxi carbonate','10ml','Hỗn dịch uống','Hộp 24 gói x 10ml','Reckitt Benckiser','Anh','Dưới 30°C','5000158069542','KhongKeDon',NULL),(9,'Lipitor','Viên',18000.00,'Atorvastatin calcium','10mg','Viên nén bao phim','Hộp 3 vỉ x 10 viên','Pfizer','Ireland','Dưới 30°C','3004501234567','ThuocKeDon',NULL),(10,'Losartan','Viên',6500.00,'Losartan potassium','50mg','Viên nén bao phim','Hộp 3 vỉ x 10 viên','Stada','Hàn Quốc','Dưới 30°C','8931234567890','ThuocKeDon',NULL);
/*!40000 ALTER TABLE `thuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thuoc_nhacungcap`
--

DROP TABLE IF EXISTS `thuoc_nhacungcap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thuoc_nhacungcap` (
  `MaThuoc` int NOT NULL,
  `MaNCC` int NOT NULL,
  `GiaNhap` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`MaThuoc`,`MaNCC`),
  KEY `MaNCC` (`MaNCC`),
  CONSTRAINT `thuoc_nhacungcap_ibfk_1` FOREIGN KEY (`MaThuoc`) REFERENCES `thuoc` (`MaThuoc`),
  CONSTRAINT `thuoc_nhacungcap_ibfk_2` FOREIGN KEY (`MaNCC`) REFERENCES `nhacungcap` (`MaNCC`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thuoc_nhacungcap`
--

LOCK TABLES `thuoc_nhacungcap` WRITE;
/*!40000 ALTER TABLE `thuoc_nhacungcap` DISABLE KEYS */;
INSERT INTO `thuoc_nhacungcap` VALUES (1,1,11000.00),(2,1,950.00),(3,2,7200.00),(4,4,3200.00),(5,1,75000.00),(6,3,18500.00),(7,3,15000.00),(8,1,9500.00),(9,2,14500.00),(10,5,4800.00);
/*!40000 ALTER TABLE `thuoc_nhacungcap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `thuocsaphethan`
--

DROP TABLE IF EXISTS `thuocsaphethan`;
/*!50001 DROP VIEW IF EXISTS `thuocsaphethan`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `thuocsaphethan` AS SELECT 
 1 AS `MaLo`,
 1 AS `MaThuoc`,
 1 AS `SoLo`,
 1 AS `HanSuDung`,
 1 AS `GiaNhap`,
 1 AS `MaCTPN`,
 1 AS `NgaySanXuat`,
 1 AS `NhietDoBaoQuan`,
 1 AS `TrangThai`,
 1 AS `SoLuongNhap`,
 1 AS `SoLuongDaXuat`,
 1 AS `GhiChu`,
 1 AS `MaKho`,
 1 AS `MaNCC`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `tonkhotheolo`
--

DROP TABLE IF EXISTS `tonkhotheolo`;
/*!50001 DROP VIEW IF EXISTS `tonkhotheolo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `tonkhotheolo` AS SELECT 
 1 AS `MaLo`,
 1 AS `MaThuoc`,
 1 AS `TonLo`,
 1 AS `HanSuDung`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `tonkhotheothuoc`
--

DROP TABLE IF EXISTS `tonkhotheothuoc`;
/*!50001 DROP VIEW IF EXISTS `tonkhotheothuoc`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `tonkhotheothuoc` AS SELECT 
 1 AS `MaThuoc`,
 1 AS `TongTon`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `vaitro`
--

DROP TABLE IF EXISTS `vaitro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaitro` (
  `MaVaiTro` int NOT NULL AUTO_INCREMENT,
  `TenVaiTro` varchar(50) NOT NULL,
  PRIMARY KEY (`MaVaiTro`),
  UNIQUE KEY `TenVaiTro` (`TenVaiTro`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vaitro`
--

LOCK TABLES `vaitro` WRITE;
/*!40000 ALTER TABLE `vaitro` DISABLE KEYS */;
INSERT INTO `vaitro` VALUES (1,'Admin'),(2,'Bac Si'),(5,'Duoc Si'),(4,'Ke Toan'),(3,'Le Tan'),(6,'Nhan Vien Kho');
/*!40000 ALTER TABLE `vaitro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `baocaonhapxuat`
--

/*!50001 DROP VIEW IF EXISTS `baocaonhapxuat`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `baocaonhapxuat` AS select `lichsukho`.`Loai` AS `Loai`,`lichsukho`.`MaThuoc` AS `MaThuoc`,`lichsukho`.`MaLo` AS `MaLo`,`lichsukho`.`SoLuong` AS `SoLuong`,`lichsukho`.`ThoiGian` AS `ThoiGian` from `lichsukho` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `lothuoc_fefo`
--

/*!50001 DROP VIEW IF EXISTS `lothuoc_fefo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `lothuoc_fefo` AS select `lothuoc`.`MaLo` AS `MaLo`,`lothuoc`.`MaThuoc` AS `MaThuoc`,`lothuoc`.`MaKho` AS `MaKho`,`lothuoc`.`SoLo` AS `SoLo`,`lothuoc`.`HanSuDung` AS `HanSuDung`,`lothuoc`.`TrangThai` AS `TrangThai`,(coalesce(`lothuoc`.`SoLuongNhap`,0) - coalesce(`lothuoc`.`SoLuongDaXuat`,0)) AS `Ton` from `lothuoc` where (((coalesce(`lothuoc`.`SoLuongNhap`,0) - coalesce(`lothuoc`.`SoLuongDaXuat`,0)) > 0) and (`lothuoc`.`TrangThai` in ('ConHan','SapHetHan'))) order by `lothuoc`.`HanSuDung` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `thuocsaphethan`
--

/*!50001 DROP VIEW IF EXISTS `thuocsaphethan`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `thuocsaphethan` AS select `lothuoc`.`MaLo` AS `MaLo`,`lothuoc`.`MaThuoc` AS `MaThuoc`,`lothuoc`.`SoLo` AS `SoLo`,`lothuoc`.`HanSuDung` AS `HanSuDung`,`lothuoc`.`GiaNhap` AS `GiaNhap`,`lothuoc`.`MaCTPN` AS `MaCTPN`,`lothuoc`.`NgaySanXuat` AS `NgaySanXuat`,`lothuoc`.`NhietDoBaoQuan` AS `NhietDoBaoQuan`,`lothuoc`.`TrangThai` AS `TrangThai`,`lothuoc`.`SoLuongNhap` AS `SoLuongNhap`,`lothuoc`.`SoLuongDaXuat` AS `SoLuongDaXuat`,`lothuoc`.`GhiChu` AS `GhiChu`,`lothuoc`.`MaKho` AS `MaKho`,`lothuoc`.`MaNCC` AS `MaNCC` from `lothuoc` where ((`lothuoc`.`HanSuDung` <= (curdate() + interval 90 day)) and (`lothuoc`.`TrangThai` <> 'HetHan')) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `tonkhotheolo`
--

/*!50001 DROP VIEW IF EXISTS `tonkhotheolo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `tonkhotheolo` AS select `lothuoc`.`MaLo` AS `MaLo`,`lothuoc`.`MaThuoc` AS `MaThuoc`,(coalesce(`lothuoc`.`SoLuongNhap`,0) - coalesce(`lothuoc`.`SoLuongDaXuat`,0)) AS `TonLo`,`lothuoc`.`HanSuDung` AS `HanSuDung` from `lothuoc` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `tonkhotheothuoc`
--

/*!50001 DROP VIEW IF EXISTS `tonkhotheothuoc`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `tonkhotheothuoc` AS select `lothuoc`.`MaThuoc` AS `MaThuoc`,sum((coalesce(`lothuoc`.`SoLuongNhap`,0) - coalesce(`lothuoc`.`SoLuongDaXuat`,0))) AS `TongTon` from `lothuoc` group by `lothuoc`.`MaThuoc` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-23 22:17:55
