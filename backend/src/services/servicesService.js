import ServicesModel from "../models/servicesModel.js";

function normalizeLoai(loai) {
    const validLoai = ["KhamBenh", "XetNghiem", "SieuAm"];
    if (!validLoai.includes(loai)) {
        throw new Error("Loại dịch vụ không hợp lệ");
    }
    return loai;
}

function normalizeTrangThai(value) {
    return Number(value) === 0 ? 0 : 1;
}

function normalizeBoolFlag(value, defaultValue = 0) {
    if (value === "" || value === undefined || value === null) return defaultValue;
    return Number(value) === 1 ? 1 : 0;
}

function buildAutoCode(loai, id) {
    const prefixMap = {
        KhamBenh: "DVK",
        XetNghiem: "DVX",
        SieuAm: "DVS"
    };
    const prefix = prefixMap[loai] || "DV";
    return `${prefix}${String(id).padStart(3, "0")}`;
}

function buildAutoPackageCode(id) {
    return `GDV${String(id).padStart(3, "0")}`;
}

const ServicesService = {
    getDashboard: async (filters = {}) => {
        const [summary, services, packages, configs, specialties] = await Promise.all([
            ServicesModel.getSummary(),
            ServicesModel.getAll(filters),
            ServicesModel.getAllPackages({}),
            ServicesModel.getAllConfigs({}),
            ServicesModel.getSpecialties()
        ]);

        return {
            summary,
            services,
            packages,
            configs,
            specialties
        };
    },

    getAll: async (filters = {}) => {
        return await ServicesModel.getAll(filters);
    },

    getById: async (id) => {
        const service = await ServicesModel.getById(id);
        if (!service) throw new Error("Không tìm thấy dịch vụ");
        return service;
    },

    getClinicalAssignable: async (filters = {}) => {
        return await ServicesModel.getClinicalAssignable(filters);
    },

    create: async (payload) => {
        if (!payload.TenDichVu?.trim()) {
            throw new Error("Tên dịch vụ không được để trống");
        }

        if (payload.Gia === undefined || Number(payload.Gia) < 0) {
            throw new Error("Giá dịch vụ không hợp lệ");
        }

        const loai = normalizeLoai(payload.Loai);
        const trangThai = normalizeTrangThai(payload.TrangThai);

        let maDV = payload.MaDV?.trim() || null;

        if (maDV) {
            const exists = await ServicesModel.existsByCode(maDV);
            if (exists) throw new Error("Mã dịch vụ đã tồn tại");
        }

        const insertId = await ServicesModel.create({
            MaDV: maDV,
            TenDichVu: payload.TenDichVu.trim(),
            Gia: Number(payload.Gia),
            Loai: loai,
            MoTa: payload.MoTa?.trim() || "",
            TrangThai: trangThai
        });

        if (!maDV) {
            maDV = buildAutoCode(loai, insertId);
            await ServicesModel.update(insertId, {
                MaDV: maDV,
                TenDichVu: payload.TenDichVu.trim(),
                Gia: Number(payload.Gia),
                Loai: loai,
                MoTa: payload.MoTa?.trim() || "",
                TrangThai: trangThai
            });
        }

        return await ServicesModel.getById(insertId);
    },

    update: async (id, payload) => {
        const current = await ServicesModel.getById(id);
        if (!current) throw new Error("Không tìm thấy dịch vụ");

        const tenDichVu = payload.TenDichVu?.trim();
        if (!tenDichVu) throw new Error("Tên dịch vụ không được để trống");

        if (payload.Gia === undefined || Number(payload.Gia) < 0) {
            throw new Error("Giá dịch vụ không hợp lệ");
        }

        const loai = normalizeLoai(payload.Loai);
        const trangThai = normalizeTrangThai(payload.TrangThai);
        const maDV = payload.MaDV?.trim() || current.MaDV;

        const exists = await ServicesModel.existsByCode(maDV, id);
        if (exists) throw new Error("Mã dịch vụ đã tồn tại");

        const affectedRows = await ServicesModel.update(id, {
            MaDV: maDV,
            TenDichVu: tenDichVu,
            Gia: Number(payload.Gia),
            Loai: loai,
            MoTa: payload.MoTa?.trim() || "",
            TrangThai: trangThai
        });

        if (!affectedRows) throw new Error("Cập nhật dịch vụ thất bại");

        return await ServicesModel.getById(id);
    },

    remove: async (id) => {
        const current = await ServicesModel.getById(id);
        if (!current) throw new Error("Không tìm thấy dịch vụ");

        if (await ServicesModel.hasInvoiceUsage(id)) {
            const affectedRows = await ServicesModel.deactivate(id);
            if (!affectedRows) throw new Error("Ngừng áp dụng dịch vụ thất bại");
            return {
                message: "Dịch vụ đã phát sinh hóa đơn, đã chuyển sang ngừng áp dụng",
                deactivated: true
            };
        }

        const affectedRows = await ServicesModel.remove(id);
        if (!affectedRows) throw new Error("Xóa dịch vụ thất bại");

        return { message: "Đã xóa dịch vụ thành công" };
    },

    getAllPackages: async (filters = {}) => {
        return await ServicesModel.getAllPackages(filters);
    },

    getPackageById: async (id) => {
        const pkg = await ServicesModel.getPackageById(id);
        if (!pkg) throw new Error("Không tìm thấy gói dịch vụ");
        return pkg;
    },

    createPackage: async (payload) => {
        if (!payload.TenGoi?.trim()) {
            throw new Error("Tên gói dịch vụ không được để trống");
        }

        const serviceIds = Array.isArray(payload.DichVuIds) ? payload.DichVuIds : [];
        if (!serviceIds.length) {
            throw new Error("Gói dịch vụ phải có ít nhất 1 dịch vụ");
        }

        const insertId = await ServicesModel.createPackage({
            MaGDV: payload.MaGDV?.trim() || null,
            TenGoi: payload.TenGoi.trim(),
            MoTa: payload.MoTa?.trim() || "",
            GiaGoi: Number(payload.GiaGoi || 0),
            TrangThai: normalizeTrangThai(payload.TrangThai),
            MauHienThi: payload.MauHienThi?.trim() || null,
            BieuTuong: payload.BieuTuong?.trim() || null
        });

        if (!payload.MaGDV?.trim()) {
            await ServicesModel.updatePackageInfo(insertId, {
                MaGDV: buildAutoPackageCode(insertId),
                TenGoi: payload.TenGoi.trim(),
                MoTa: payload.MoTa?.trim() || "",
                GiaGoi: Number(payload.GiaGoi || 0),
                TrangThai: normalizeTrangThai(payload.TrangThai),
                MauHienThi: payload.MauHienThi?.trim() || null,
                BieuTuong: payload.BieuTuong?.trim() || null
            });
        }

        await ServicesModel.replacePackageItems(insertId, payload.ChiTiet || serviceIds.map(id => ({
            MaDichVu: id,
            SoLuong: 1,
            GhiChu: ""
        })));

        return await ServicesModel.getPackageById(insertId);
    },

    updatePackage: async (id, payload) => {
        const current = await ServicesModel.getPackageById(id);
        if (!current) throw new Error("Không tìm thấy gói dịch vụ");

        if (!payload.TenGoi?.trim()) {
            throw new Error("Tên gói dịch vụ không được để trống");
        }

        await ServicesModel.updatePackageInfo(id, {
            MaGDV: payload.MaGDV?.trim() || current.MaGDV,
            TenGoi: payload.TenGoi.trim(),
            MoTa: payload.MoTa?.trim() || "",
            GiaGoi: Number(payload.GiaGoi || 0),
            TrangThai: normalizeTrangThai(payload.TrangThai),
            MauHienThi: payload.MauHienThi?.trim() || null,
            BieuTuong: payload.BieuTuong?.trim() || null
        });

        if (Array.isArray(payload.ChiTiet)) {
            await ServicesModel.replacePackageItems(id, payload.ChiTiet);
        }

        return await ServicesModel.getPackageById(id);
    },

    removePackage: async (id) => {
        const current = await ServicesModel.getPackageById(id);
        if (!current) throw new Error("Không tìm thấy gói dịch vụ");

        const affectedRows = await ServicesModel.removePackage(id);
        if (!affectedRows) throw new Error("Xóa gói dịch vụ thất bại");

        return { message: "Đã xóa gói dịch vụ thành công" };
    },

    getAllConfigs: async (filters = {}) => {
        return await ServicesModel.getAllConfigs(filters);
    },

    getConfigByServiceId: async (serviceId) => {
        const config = await ServicesModel.getConfigByServiceId(serviceId);
        if (!config) throw new Error("Không tìm thấy cấu hình dịch vụ");
        return config;
    },

    upsertConfig: async (serviceId, payload) => {
        const service = await ServicesModel.getById(serviceId);
        if (!service) throw new Error("Không tìm thấy dịch vụ");

        await ServicesModel.upsertConfig(serviceId, {
            ThoiLuongPhut: Number(payload.ThoiLuongPhut || 15),
            CanDatTruoc: normalizeBoolFlag(payload.CanDatTruoc, 0),
            CanChiDinhBacSi: normalizeBoolFlag(payload.CanChiDinhBacSi, 0),
            HuongDanTruocKham: payload.HuongDanTruocKham?.trim() || "",
            ThuTuHienThi: Number(payload.ThuTuHienThi || 0),
            MauNhan: payload.MauNhan?.trim() || null,
            MaChuyenKhoa: payload.MaChuyenKhoa || null
        });

        return await ServicesModel.getConfigByServiceId(serviceId);
    }
};

export default ServicesService;
