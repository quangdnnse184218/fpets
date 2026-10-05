"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatVND } from "@/lib/formatters";
import { Tables } from "@/types/database";
import { Plus, Edit2, Trash2, Power, Search, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { textMatches } from "@/lib/search";

type VoucherRow = Tables<"vouchers">;

const TYPE_LABEL: Record<string, string> = { percentage: "Giảm theo %", fixed_amount: "Giảm tiền mặt", free_shipping: "Miễn phí vận chuyển" };
const SCOPE_LABEL: Record<string, string> = { all: "Toàn bộ đơn hàng", retail: "Chỉ sản phẩm lẻ", box: "Chỉ Mystery Box", first_subscription: "Gói định kỳ lần đầu" };

// Ngày trong ô chọn ngày theo giờ Việt Nam (yyyy-MM-dd), không lấy theo UTC
function toDateInput(iso: string) {
  return iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso)) : "";
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingVoucher, setDeletingVoucher] = useState<VoucherRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { show } = useToast();

  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed_amount" | "free_shipping">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState(10);
  const [formMinOrder, setFormMinOrder] = useState(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number | undefined>(50000);
  const [formUsageLimitTotal, setFormUsageLimitTotal] = useState(500);
  const [formUsageLimitPerUser, setFormUsageLimitPerUser] = useState(1);
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidTo, setFormValidTo] = useState("");
  const [formScope, setFormScope] = useState<"all" | "retail" | "box" | "first_subscription">("all");

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3000); };

  const handleOpenAdd = () => {
    setEditingVoucher(null);
    setFormCode(""); setFormType("percentage"); setFormDiscountValue(10); setFormMinOrder(0);
    setFormMaxDiscount(50000); setFormUsageLimitTotal(500); setFormUsageLimitPerUser(1);
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    setFormValidFrom(today); setFormValidTo(future); setFormScope("all");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VoucherRow) => {
    setEditingVoucher(v);
    setFormCode(v.code); setFormType(v.voucher_type); setFormDiscountValue(v.discount_value);
    setFormMinOrder(v.min_order_value); setFormMaxDiscount(v.max_discount || undefined);
    setFormUsageLimitTotal(v.usage_limit_total); setFormUsageLimitPerUser(v.usage_limit_per_user);
    setFormValidFrom(toDateInput(v.valid_from)); setFormValidTo(toDateInput(v.valid_to));
    setFormScope(v.scope as "all" | "retail" | "box" | "first_subscription");
    setFormError("");
    setIsModalOpen(true);
  };

  const toggleActive = async (v: VoucherRow) => {
    const supabase = createClient();
    setVouchers((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: !x.is_active } : x)));
    const { error } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id);
    if (error) {
      setVouchers((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: v.is_active } : x)));
      show("Không cập nhật được voucher.", { tone: "error" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = formCode.toUpperCase().trim();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setFormError("Mã gồm 3–30 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới.");
    if (formType === "percentage" && (formDiscountValue < 1 || formDiscountValue > 100)) return setFormError("Mức giảm theo % phải từ 1 đến 100.");
    if (formType === "fixed_amount" && formDiscountValue < 1000) return setFormError("Số tiền giảm phải từ 1.000₫.");
    if (formMinOrder < 0) return setFormError("Đơn tối thiểu không được âm.");
    if (formUsageLimitTotal < 1 || formUsageLimitPerUser < 1) return setFormError("Giới hạn lượt dùng phải từ 1.");
    if (!formValidFrom || !formValidTo || formValidTo < formValidFrom) return setFormError("Ngày hết hạn phải sau hoặc bằng ngày bắt đầu.");
    setFormError("");
    setSaving(true);
    const supabase = createClient();
    const payload = {
      code,
      voucher_type: formType,
      // Voucher miễn phí vận chuyển không có mức giảm riêng
      discount_value: formType === "free_shipping" ? 0 : Number(formDiscountValue),
      min_order_value: Number(formMinOrder),
      max_discount: formType === "percentage" && formMaxDiscount ? Number(formMaxDiscount) : null,
      usage_limit_total: Number(formUsageLimitTotal),
      usage_limit_per_user: Number(formUsageLimitPerUser),
      // Hiệu lực từ 00:00 ngày bắt đầu đến 23:59:59 ngày kết thúc, theo giờ Việt Nam
      valid_from: new Date(`${formValidFrom}T00:00:00+07:00`).toISOString(),
      valid_to: new Date(`${formValidTo}T23:59:59+07:00`).toISOString(),
      scope: formScope,
    };
    const { error } = editingVoucher
      ? await supabase.from("vouchers").update(payload).eq("id", editingVoucher.id)
      : await supabase.from("vouchers").insert(payload);
    setSaving(false);
    if (error) {
      return setFormError(error.code === "23505" ? `Mã "${code}" đã tồn tại.` : "Không lưu được voucher, vui lòng thử lại.");
    }
    showNotice(editingVoucher ? `Đã cập nhật mã ${code}.` : `Đã tạo mã ${code}.`);
    setIsModalOpen(false);
    loadVouchers();
  };

  const handleConfirmDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    const supabase = createClient();
    if (deletingVoucher.used_count > 0) {
      await supabase.from("vouchers").update({ is_active: false }).eq("id", deletingVoucher.id);
      showNotice(`Voucher đã từng được dùng nên chỉ tắt hoạt động, không xóa vĩnh viễn.`);
    } else {
      await supabase.from("vouchers").delete().eq("id", deletingVoucher.id);
      showNotice(`Đã xóa mã voucher "${deletingVoucher.code}".`);
    }
    setDeletingVoucher(null);
    loadVouchers();
  };

  const filtered = vouchers.filter((v) => textMatches([v.code], search));

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải voucher...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Voucher</h1>
          <p className="text-xs text-bark-500">Tạo mã giảm giá theo %, tiền mặt hoặc miễn phí ship; thiết lập phạm vi và giới hạn lượt dùng.</p>
        </div>
        <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 px-3.5 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs">
          <Plus className="w-4 h-4" /><span>Tạo voucher mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" /><span>{notice}</span>
        </div>
      )}

      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm mã voucher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="lg:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Chưa có voucher nào phù hợp.
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="p-3.5 rounded-container bg-surface-card border border-surface-border space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-pine-900 font-mono text-sm tracking-wide">
                    {v.code}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-bark-700 border border-surface-border">
                    {SCOPE_LABEL[v.scope]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(v)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                    v.is_active ? "bg-grass-100 text-grass-800" : "bg-bark-100 text-bark-600"
                  }`}
                >
                  <Power className="w-2.5 h-2.5" />
                  <span>{v.is_active ? "Bật" : "Tắt"}</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between text-xs pt-0.5">
                <div>
                  <span className="text-bark-500 text-[11px] block">{TYPE_LABEL[v.voucher_type]}:</span>
                  <span className="font-bold text-pine-900 text-sm">
                    {v.voucher_type === "percentage"
                      ? `${v.discount_value}%`
                      : v.voucher_type === "fixed_amount"
                      ? formatVND(v.discount_value)
                      : "Freeship"}
                  </span>
                  {v.max_discount && (
                    <span className="text-[10px] text-bark-500 block">Tối đa {formatVND(v.max_discount)}</span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-bark-500 text-[11px] block">Đơn tối thiểu:</span>
                  <span className="font-bold text-bark-800 text-xs">
                    {v.min_order_value > 0 ? formatVND(v.min_order_value) : "0₫"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border/70 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-bark-500">Lượt dùng:</span>
                  <span className="font-bold text-bark-800">{v.used_count} / {v.usage_limit_total}</span>
                </div>
                <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-pine-700 h-full rounded-full"
                    style={{ width: `${Math.min(100, (v.used_count / v.usage_limit_total) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-bark-500">
                <span>Hạn: {formatDate(v.valid_from)} – {formatDate(v.valid_to)}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(v)}
                    className="px-2 py-0.5 rounded bg-pine-50 hover:bg-pine-100 text-pine-900 font-semibold text-[11px]"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingVoucher(v)}
                    className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px]"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Mã</th>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-xs text-bark-500">Chưa có voucher nào phù hợp.</td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5"><div className="font-extrabold text-pine-900 font-mono text-sm tracking-wide">{v.code}</div></td>
                <td className="p-3.5"><span className="font-medium text-bark-800">{TYPE_LABEL[v.voucher_type]}</span></td>
                <td className="p-3.5">
                  <span className="font-bold text-pine-900 text-xs">
                    {v.voucher_type === "percentage" ? `${v.discount_value}%` : v.voucher_type === "fixed_amount" ? formatVND(v.discount_value) : "Freeship"}
                  </span>
                  {v.max_discount && <span className="text-[10px] text-bark-500 block">Tối đa {formatVND(v.max_discount)}</span>}
                </td>
                <td className="p-3.5 font-medium text-bark-800">{v.min_order_value > 0 ? formatVND(v.min_order_value) : "0₫"}</td>
                <td className="p-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-bark-700 border border-surface-border">{SCOPE_LABEL[v.scope]}</span></td>
                <td className="p-3.5">
                  <div className="font-bold text-bark-800">{v.used_count} / {v.usage_limit_total}</div>
                  <div className="w-16 bg-surface-muted h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-pine-700 h-full rounded-full" style={{ width: `${Math.min(100, (v.used_count / v.usage_limit_total) * 100)}%` }} />
                  </div>
                </td>
                <td className="p-3.5"><div className="text-[11px] text-bark-700">{formatDate(v.valid_from)} – {formatDate(v.valid_to)}</div></td>
                <td className="p-3.5">
                  <button onClick={() => toggleActive(v)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${v.is_active ? "bg-grass-100 text-grass-800 hover:bg-grass-200" : "bg-bark-100 text-bark-600 hover:bg-bark-200"}`}>
                    <Power className="w-2.5 h-2.5" /><span>{v.is_active ? "Đang bật" : "Đã tắt"}</span>
                  </button>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleOpenEdit(v)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors">
                      <Edit2 className="w-3 h-3" /><span>Sửa</span>
                    </button>
                    <button onClick={() => setDeletingVoucher(v)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors">
                      <Trash2 className="w-3 h-3" /><span>Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-4 sm:p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">{editingVoucher ? `Chỉnh sửa mã: ${editingVoucher.code}` : "Tạo mã khuyến mãi mới"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Mã Voucher *</label>
                  <input type="text" required value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-mono font-bold uppercase focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Loại chiết khấu *</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as "percentage" | "fixed_amount" | "free_shipping")}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white">
                    <option value="percentage">Giảm theo %</option>
                    <option value="fixed_amount">Giảm tiền mặt (VND)</option>
                    <option value="free_shipping">Miễn phí vận chuyển</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formType !== "free_shipping" && (
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">{formType === "percentage" ? "Mức giảm (%)" : "Số tiền giảm (VND)"}</label>
                  <input type="number" value={formDiscountValue} onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold text-pine-900 focus:border-pine-900 focus:outline-none" />
                </div>
                )}
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Đơn hàng tối thiểu (VND)</label>
                  <input type="number" value={formMinOrder} onChange={(e) => setFormMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
              </div>
              {formType === "percentage" && (
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giảm tối đa (VND)</label>
                  <input type="number" value={formMaxDiscount || ""} onChange={(e) => setFormMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Phạm vi áp dụng</label>
                  <select value={formScope} onChange={(e) => setFormScope(e.target.value as "all" | "retail" | "box" | "first_subscription")}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white">
                    <option value="all">Toàn bộ đơn hàng</option>
                    <option value="retail">Chỉ sản phẩm Shop bán lẻ</option>
                    <option value="box">Chỉ Mystery Box mua 1 lần</option>
                  </select>
                  <p className="text-[11px] text-bark-500 mt-1">Gói định kỳ đã có ưu đãi riêng nên không áp dụng voucher.</p>
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Tổng lượt dùng tối đa</label>
                  <input type="number" value={formUsageLimitTotal} onChange={(e) => setFormUsageLimitTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Giới hạn mỗi khách</label>
                <input type="number" value={formUsageLimitPerUser} onChange={(e) => setFormUsageLimitPerUser(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Ngày bắt đầu</label>
                  <input type="date" required value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Ngày hết hạn</label>
                  <input type="date" required value={formValidTo} onChange={(e) => setFormValidTo(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
              </div>
              {formError && <p role="alert" className="p-2.5 rounded-box bg-red-50 border border-red-200 text-red-700 font-semibold">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors disabled:opacity-60">
                  {saving ? "Đang lưu..." : editingVoucher ? "Lưu thay đổi" : "Tạo mã Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận xóa Voucher</h3>
            </div>
            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc muốn xóa mã <strong className="font-mono font-bold text-pine-900">{deletingVoucher.code}</strong>?
              {deletingVoucher.used_count > 0 && " Mã đã được dùng nên sẽ chỉ bị tắt hoạt động, không xóa vĩnh viễn."}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button type="button" onClick={() => setDeletingVoucher(null)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold">Hủy</button>
              <button type="button" onClick={handleConfirmDeleteVoucher} className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
