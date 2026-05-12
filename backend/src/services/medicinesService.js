import MedicinesModel from "../models/medicinesModel.js";

function normalizeMedicinePayload(data = {}) {
    const payload = {
        TenThuoc: String(data.TenThuoc || "").trim(),
        DonViCoBan: String(data.DonViCoBan || "").trim(),
        HoatChat: data.HoatChat || null,
        HamLuong: data.HamLuong || null,
        DangBaoChe: data.DangBaoChe || null,
        QuyCachDongGoi: data.QuyCachDongGoi || null,
        HangSanXuat: data.HangSanXuat || null,
        NuocSanXuat: data.NuocSanXuat || null,
        NhietDoBaoQuan: data.NhietDoBaoQuan || null,
        GiaBan: Number(data.GiaBan),
        MaVach: data.MaVach || null,
        LoaiThuoc: data.LoaiThuoc || "",
        TrangThai: data.TrangThai === 0 || data.TrangThai === "0" ? 0 : 1
    };

    if (!payload.TenThuoc) throw new Error("Tên thuốc là bắt buộc");
    if (!payload.DonViCoBan) throw new Error("Đơn vị cơ bản là bắt buộc");
    if (!payload.LoaiThuoc) throw new Error("Loại thuốc là bắt buộc");
    if (!Number.isFinite(payload.GiaBan) || payload.GiaBan < 0) {
        throw new Error("Giá bán phải lớn hơn hoặc bằng 0");
    }

    return payload;
}

const MedicinesService = {
    getAllMedicines: async (filters = {}) => MedicinesModel.getAll(filters),
    getMedicineById: async (id) => MedicinesModel.getById(id),
    createMedicine: async (data) => MedicinesModel.create(normalizeMedicinePayload(data)),
    updateMedicine: async (id, data) => MedicinesModel.update(id, normalizeMedicinePayload(data)),
    deleteMedicine: async (id) => MedicinesModel.delete(id),
    getLowStock: async () => MedicinesModel.lowStock(),
    getMedicinesBySupplier: async (filters = {}) => MedicinesModel.getBySupplier(filters)
};

export default MedicinesService;
