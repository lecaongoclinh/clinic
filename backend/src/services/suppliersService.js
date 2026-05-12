import SuppliersModel from "../models/suppliersModel.js";

function normalizeSupplierPayload(data = {}) {
    const payload = {
        TenNCC: String(data.TenNCC || "").trim(),
        DiaChi: String(data.DiaChi || "").trim(),
        SoDienThoai: String(data.SoDienThoai || "").trim(),
        Email: data.Email || null,
        MaSoThue: data.MaSoThue || null,
        NguoiLienHe: data.NguoiLienHe || null,
        DieuKhoanThanhToan: data.DieuKhoanThanhToan || null
    };

    if (!payload.TenNCC) throw new Error("Tên nhà cung cấp là bắt buộc");
    if (!payload.DiaChi) throw new Error("Địa chỉ là bắt buộc");
    if (!payload.SoDienThoai) throw new Error("Số điện thoại là bắt buộc");
    return payload;
}

const SuppliersService = {
    getAllSuppliers: async (filters = {}) => SuppliersModel.getAll(filters),
    getSupplierById: async (id) => SuppliersModel.getById(id),
    getMedicinesBySupplier: async (MaNCC) => SuppliersModel.getMedicinesBySupplier(MaNCC),
    createSupplier: async (data) => SuppliersModel.create(normalizeSupplierPayload(data)),
    updateSupplier: async (id, data) => SuppliersModel.update(id, normalizeSupplierPayload(data)),
    deleteSupplier: async (id) => SuppliersModel.delete(id),
    getImportsBySupplier: async (MaNCC) => SuppliersModel.getImportsBySupplier(MaNCC)
};

export default SuppliersService;
