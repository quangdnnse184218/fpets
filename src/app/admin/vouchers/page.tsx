"use client";

import React, { useState } from "react";
import { MOCK_VOUCHERS, Voucher } from "@/mock/vouchers";
import { formatVND } from "@/lib/formatters";
import { Plus, Edit2, Trash2, Check, Power, Tag, Search, Calendar, AlertCircle, X, CheckCircle2 } from "lucide-react";

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>(MOCK_VOUCHERS);
  const [search, setSearch] = useState("");
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<'percentage' | 'fixed_amount' | 'free_shipping'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState(10);
  const [formMinOrder, setFormMinOrder] = useState(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number | undefined>(50000);
  const [formUsageLimitTotal, setFormUsageLimitTotal] = useState(500);
  const [formUsageLimitPerUser, setFormUsageLimitPerUser] = useState(1);
  const [formValidFrom, setFormValidFrom] = useState("01/10/2026");
  const [formValidTo, setFormValidTo] = useState("31/12/2026");
  const [formScope, setFormScope] = useState<'all' | 'retail' | 'box' | 'first_subscription'>('all');
  const [formDescription, setFormDescription] = useState("");

  const handleOpenAdd = () => {
    setEditingVoucher(null);
    setFormCode("");
    setFormType("percentage");
    setFormDiscountValue(10);
    setFormMinOrder(0);
    setFormMaxDiscount(50000);
    setFormUsageLimitTotal(500);
    setFormUsageLimitPerUser(1);
    setFormValidFrom("01/10/2026");
    setFormValidTo("31/12/2026");
    setFormScope("all");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Voucher) => {
    setEditingVoucher(v);
    setFormCode(v.code);
    setFormType(v.type);
    setFormDiscountValue(v.discountValue);
    setFormMinOrder(v.minOrderValue);
    setFormMaxDiscount(v.maxDiscount);
    setFormUsageLimitTotal(v.usageLimitTotal);
    setFormUsageLimitPerUser(v.usageLimitPerUser);
    setFormValidFrom(v.validFrom);
    setFormValidTo(v.validTo);
    setFormScope(v.scope);
    setFormDescription(v.description);
    setIsModalOpen(true);
  };

  const toggleActive = (id: string) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel =
      formType === "percentage"
        ? "Giảm theo %"
        : formType === "fixed_amount"
        ? "Giảm tiền mặt"
        : "Miễn phí vận chuyển";

    const scopeLabel =
      formScope === "all"
        ? "Toàn bộ đơn hàng"
        : formScope === "retail"
        ? "Chỉ sản phẩm lẻ"
        : formScope === "box"
        ? "Chỉ Mystery Box"
        : "Gói định kỳ lần đầu";

    if (editingVoucher) {
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === editingVoucher.id
            ? {
                ...v,
                code: formCode.toUpperCase().trim(),
                type: formType,
                typeLabel,
                discountValue: Number(formDiscountValue),
                minOrderValue: Number(formMinOrder),
                maxDiscount: formMaxDiscount ? Number(formMaxDiscount) : undefined,
                usageLimitTotal: Number(formUsageLimitTotal),
                usageLimitPerUser: Number(formUsageLimitPerUser),
                validFrom: formValidFrom,
                validTo: formValidTo,
                scope: formScope,
                scopeLabel,
                description: formDescription,
              }
            : v
        )
      );
    } else {
      const newV: Voucher = {
        id: `vouch-${Date.now()}`,
        code: formCode.toUpperCase().trim(),
        type: formType,
        typeLabel,
        discountValue: Number(formDiscountValue),
        minOrderValue: Number(formMinOrder),
        maxDiscount: formMaxDiscount ? Number(formMaxDiscount) : undefined,
        usageLimitTotal: Number(formUsageLimitTotal),
        usageLimitPerUser: Number(formUsageLimitPerUser),
        usedCount: 0,
        validFrom: formValidFrom,
        validTo: formValidTo,
        scope: formScope,
        scopeLabel,
        isActive: true,
        description: formDescription,
      };
      setVouchers((prev) => [newV, ...prev]);
      setNotice(`Đã tạo mã khuyến mãi "${newV.code}" thành công!`);
    }
    setTimeout(() => setNotice(null), 3000);
    setIsModalOpen(false);
  };

  const handleConfirmDeleteVoucher = () => {
    if (!deletingVoucher) return;
    setVouchers((prev) => prev.filter((v) => v.id !== deletingVoucher.id));
    setNotice(`Đã xóa mã voucher "${deletingVoucher.code}".`);
    setDeletingVoucher(null);
    setTimeout(() => setNotice(null), 3000);
  };

  const filtered = vouchers.filter(
    (v) =>
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Mã Khuyến Mãi (Voucher)
          </h1>
          <p className="text-xs text-bark-500">
            Tạo mã giảm giá theo %, tiền mặt hoặc miễn phí ship; thiết lập phạm vi áp dụng và giới hạn lượt sử dụng.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo voucher mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã voucher hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Bảng Voucher */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Mã & Mô tả</th>
              <th className="p-3.5">Loại giảm</th>
              <th className="p-3.5">Mức giảm</th>
              <th className="p-3.5">Đơn tối thiểu</th>
              <th className="p-3.5">Phạm vi</th>
              <th className="p-3.5">Đã dùng / Giới hạn</th>
              <th className="p-3.5">Thời hạn</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="font-extrabold text-pine-900 font-mono text-sm tracking-wide">
                    {v.code}
                  </div>
                  <div className="text-[11px] text-bark-500 line-clamp-1 max-w-[220px]">
                    {v.description}
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="font-medium text-bark-800">{v.typeLabel}</span>
                </td>
                <td className="p-3.5">
                  <span className="font-bold text-pine-900 text-xs">
                    {v.type === "percentage"
                      ? `${v.discountValue}%`
                      : v.type === "fixed_amount"
                      ? formatVND(v.discountValue)
                      : "Freeship"}
                  </span>
                  {v.maxDiscount && (
                    <span className="text-[10px] text-bark-500 block">
                      Tối đa {formatVND(v.maxDiscount)}
                    </span>
                  )}
                </td>
                <td className="p-3.5 font-medium text-bark-800">
                  {v.minOrderValue > 0 ? formatVND(v.minOrderValue) : "0₫"}
                </td>
                <td className="p-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-bark-700 border border-surface-border">
                    {v.scopeLabel}
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="font-bold text-bark-800">
                    {v.usedCount} / {v.usageLimitTotal}
                  </div>
                  <div className="w-16 bg-surface-muted h-1 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-pine-700 h-full rounded-full"
                      style={{ width: `${Math.min(100, (v.usedCount / v.usageLimitTotal) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="text-[11px] text-bark-700">{v.validFrom} – {v.validTo}</div>
                </td>
                <td className="p-3.5">
                  <button
                    onClick={() => toggleActive(v.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      v.isActive
                        ? "bg-grass-100 text-grass-800 hover:bg-grass-200"
                        : "bg-bark-100 text-bark-600 hover:bg-bark-200"
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{v.isActive ? "Đang bật" : "Đã tắt"}</span>
                  </button>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                      title="Chỉnh sửa mã"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={() => setDeletingVoucher(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      title="Xóa mã voucher"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">
                {editingVoucher ? `Chỉnh sửa mã: ${editingVoucher.code}` : "Tạo mã khuyến mãi mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Mã Voucher (Code) *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="VD: FPETS10"
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-mono font-bold uppercase focus:border-pine-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Loại chiết khấu *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white"
                  >
                    <option value="percentage">Giảm theo %</option>
                    <option value="fixed_amount">Giảm tiền mặt (VND)</option>
                    <option value="free_shipping">Miễn phí vận chuyển (Freeship)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">
                    {formType === "percentage" ? "Mức giảm (%)" : "Số tiền giảm (VND)"}
                  </label>
                  <input
                    type="number"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold text-pine-900 focus:border-pine-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Đơn hàng tối thiểu (VND)</label>
                  <input
                    type="number"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
              </div>

              {formType === "percentage" && (
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giảm tối đa (VND - để trống nếu không giới hạn)</label>
                  <input
                    type="number"
                    value={formMaxDiscount || ""}
                    onChange={(e) => setFormMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="VD: 50000"
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Phạm vi áp dụng</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as any)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white"
                  >
                    <option value="all">Toàn bộ đơn hàng</option>
                    <option value="retail">Chỉ sản phẩm Shop bán lẻ</option>
                    <option value="box">Chỉ Mystery Box</option>
                    <option value="first_subscription">Gói định kỳ lần đầu</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Tổng lượt dùng tối đa</label>
                  <input
                    type="number"
                    value={formUsageLimitTotal}
                    onChange={(e) => setFormUsageLimitTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Ngày bắt đầu</label>
                  <input
                    type="text"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    placeholder="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Ngày hết hạn</label>
                  <input
                    type="text"
                    value={formValidTo}
                    onChange={(e) => setFormValidTo(e.target.value)}
                    placeholder="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">Mô tả hiển thị cho khách hàng</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="VD: Nhập mã để được giảm ngay 10% cho đơn hàng đầu tiên..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors"
                >
                  {editingVoucher ? "Lưu thay đổi" : "Tạo mã Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Voucher */}
      {deletingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận xóa Voucher</h3>
            </div>

            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn mã khuyến mãi <strong className="font-mono font-bold text-pine-900">{deletingVoucher.code}</strong>?
            </p>

            <div className="p-3 rounded-box bg-surface-muted border border-surface-border space-y-1 text-[11px] text-bark-600">
              <div>Đã dùng: <strong className="text-bark-900">{deletingVoucher.usedCount}</strong> lượt / Giới hạn: {deletingVoucher.usageLimitTotal}</div>
              <div>Mức giảm: <strong className="text-pine-900">{deletingVoucher.type === 'percentage' ? `${deletingVoucher.discountValue}%` : formatVND(deletingVoucher.discountValue)}</strong></div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setDeletingVoucher(null)}
                className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVoucher}
                className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
