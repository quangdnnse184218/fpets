"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { Tables } from "@/types/database";
import { resolveImageUrl } from "@/lib/adapters";
import { Plus, Edit2, Trash2, Check, Settings, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { planUnitPrice } from "@/lib/pricing";

type BoxTypeRow = Tables<"box_types">;
type PlanRow = Tables<"subscription_plans">;

export default function AdminBoxTypesPage() {
  const [boxList, setBoxList] = useState<BoxTypeRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [savedDiscount, setSavedDiscount] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingBox, setEditingBox] = useState<BoxTypeRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingBox, setDeletingBox] = useState<BoxTypeRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSpecies, setFormSpecies] = useState<"dog" | "cat">("dog");
  const [formSize, setFormSize] = useState<"small" | "large">("small");
  const [formItemMin, setFormItemMin] = useState(4);
  const [formItemMax, setFormItemMax] = useState(5);
  const [formMinRetail, setFormMinRetail] = useState(380000);
  const [formBasePrice, setFormBasePrice] = useState(299000);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: boxes }, { data: planRows }] = await Promise.all([
      supabase.from("box_types").select("*").order("baseprice"),
      supabase.from("subscription_plans").select("*").order("cycle_count"),
    ]);
    setBoxList(boxes || []);
    setPlans(planRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const plan3 = plans.find((p) => p.cycle_count === 3);
  const plan6 = plans.find((p) => p.cycle_count === 6);
  const [discount3, setDiscount3] = useState(10);
  const [discount6, setDiscount6] = useState(15);
  useEffect(() => {
    if (plan3) setDiscount3(plan3.discount_percentage);
    if (plan6) setDiscount6(plan6.discount_percentage);
  }, [plan3, plan6]);

  const handleOpenAdd = () => {
    setEditingBox(null);
    setFormName(""); setFormSpecies("dog"); setFormSize("small");
    setFormItemMin(4); setFormItemMax(5); setFormMinRetail(380000); setFormBasePrice(299000);
    setFormImageUrl(""); setFormDescription("Hộp quà tuyển chọn định kỳ cho bé cưng");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (box: BoxTypeRow) => {
    setEditingBox(box);
    setFormName(box.name); setFormSpecies(box.species); setFormSize(box.size);
    setFormItemMin(box.item_count_min); setFormItemMax(box.item_count_max);
    setFormMinRetail(box.min_retail_value); setFormBasePrice(box.baseprice);
    setFormImageUrl(box.images?.[0] || ""); setFormDescription(box.description || "");
    setIsModalOpen(true);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: formName,
      species: formSpecies,
      size: formSize,
      item_count_min: formItemMin,
      item_count_max: formItemMax,
      min_retail_value: Number(formMinRetail),
      baseprice: Number(formBasePrice),
      description: formDescription,
      images: formImageUrl.trim() ? [formImageUrl.trim()] : [],
    };
    if (editingBox) {
      await supabase.from("box_types").update(payload).eq("id", editingBox.id);
      setNotice(`Đã cập nhật "${formName}"!`);
    } else {
      const slug = formName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
      await supabase.from("box_types").insert({ ...payload, slug });
      setNotice(`Đã thêm loại box "${formName}"!`);
    }
    setSaving(false);
    setIsModalOpen(false);
    setTimeout(() => setNotice(null), 3000);
    loadData();
  };

  const handleConfirmDeleteBox = async () => {
    if (!deletingBox) return;
    const supabase = createClient();
    await supabase.from("box_types").update({ is_active: false }).eq("id", deletingBox.id);
    setNotice(`Đã ẩn loại hộp "${deletingBox.name}".`);
    setDeletingBox(null);
    setTimeout(() => setNotice(null), 3500);
    loadData();
  };

  const handleSaveDiscountConfig = async () => {
    setSavingDiscount(true);
    const supabase = createClient();
    if (plan3) await supabase.from("subscription_plans").update({ discount_percentage: discount3 }).eq("id", plan3.id);
    if (plan6) await supabase.from("subscription_plans").update({ discount_percentage: discount6 }).eq("id", plan6.id);
    setSavingDiscount(false);
    setSavedDiscount(true);
    setTimeout(() => setSavedDiscount(false), 2500);
    loadData();
  };

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải danh sách box...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Quản lý Mystery Box & Gói Định Kỳ</h1>
          <p className="text-xs text-bark-500">Cấu hình quy cách các loại hộp quà, cam kết giá trị tối thiểu và tỉ lệ chiết khấu theo gói.</p>
        </div>
        <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 px-3.5 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs">
          <Plus className="w-4 h-4" />
          <span>Thêm loại Box mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-pine-900 font-bold text-sm">
          <Settings className="w-4 h-4 text-pine-700" />
          <span>Cấu hình tỉ lệ chiết khấu gói Subscription</span>
        </div>
        <p className="text-xs text-bark-600">Tỉ lệ này áp dụng khi khách chọn mua gói định kỳ 3 hoặc 6 hộp.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border">
            <span className="font-semibold text-bark-700 block mb-1">Gói 1 hộp</span>
            <span className="font-bold text-pine-900 text-sm">Giảm 0%</span>
          </div>
          <div className="p-3.5 rounded-box bg-grass-50/60 border border-grass-200">
            <span className="font-semibold text-pine-900 block mb-1">Gói 3 hộp</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-pine-900 text-xs">Chiết khấu:</span>
              <input type="number" value={discount3} onChange={(e) => setDiscount3(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-grass-300 rounded font-bold text-pine-900 text-xs text-center" />
              <span className="font-bold text-pine-900">%</span>
            </div>
          </div>
          <div className="p-3.5 rounded-box bg-honey-50/60 border border-honey-200">
            <span className="font-semibold text-bark-800 block mb-1">Gói 6 hộp</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-bark-800 text-xs">Chiết khấu:</span>
              <input type="number" value={discount6} onChange={(e) => setDiscount6(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-honey-300 rounded font-bold text-bark-800 text-xs text-center" />
              <span className="font-bold text-bark-800">%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handleSaveDiscountConfig} disabled={savingDiscount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-grass-700 text-white rounded-box text-xs font-semibold hover:bg-grass-800 transition-colors disabled:opacity-60">
            {savedDiscount ? (<><Check className="w-3.5 h-3.5" /><span>Đã lưu!</span></>) : (<span>{savingDiscount ? "Đang lưu..." : "Lưu cấu hình chiết khấu"}</span>)}
          </button>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {boxList.map((box) => {
          const price3 = planUnitPrice(box.baseprice, discount3);
          return (
            <div key={box.id} className={`p-3.5 rounded-container bg-surface-card border border-surface-border shadow-xs space-y-3 text-xs ${!box.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-surface-border bg-pine-50">
                  <Image src={resolveImageUrl(box.images?.[0], "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80")} alt={box.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-pine-950 text-sm">{box.name}</span>
                    {!box.is_active && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Đã ẩn</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <PetSpeciesIcon species={box.species} variant="badge" size="xs" />
                    {box.species === "dog" && (
                      <span className="text-[10px] font-medium text-bark-500 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
                        {box.size === "small" ? "Nhỏ (< 10kg)" : "Lớn (≥ 10kg)"}
                      </span>
                    )}
                    <span className="text-[11px] text-bark-500 font-medium">· {box.item_count_min}–{box.item_count_max} món</span>
                  </div>
                </div>
              </div>

              {box.description && (
                <p className="text-[11px] text-bark-600 line-clamp-2 leading-relaxed">{box.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-box bg-surface-muted border border-surface-border text-center text-[11px]">
                <div>
                  <span className="text-bark-500 block text-[10px]">Giá bán lẻ</span>
                  <span className="font-bold text-pine-900">{formatVND(box.baseprice)}</span>
                </div>
                <div>
                  <span className="text-bark-500 block text-[10px]">Gói 3 hộp (-{discount3}%)</span>
                  <span className="font-bold text-grass-700">{formatVND(price3)}</span>
                </div>
                <div>
                  <span className="text-bark-500 block text-[10px]">Giá trị tối thiểu</span>
                  <span className="font-bold text-bark-800">{formatVND(box.min_retail_value)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(box)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded-box transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingBox(box)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-box transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ẩn</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Hộp quà Mystery Box</th>
              <th className="p-3.5">Phân loại</th>
              <th className="p-3.5">Số món</th>
              <th className="p-3.5">Giá trị tối thiểu</th>
              <th className="p-3.5">Giá bán lẻ</th>
              <th className="p-3.5">Giá gói 3 hộp (-{discount3}%)</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {boxList.map((box) => {
              const price3 = planUnitPrice(box.baseprice, discount3);
              return (
                <tr key={box.id} className={`hover:bg-surface-muted/50 transition-colors ${!box.is_active ? "opacity-50" : ""}`}>
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-surface-border bg-pine-50">
                        <Image src={resolveImageUrl(box.images?.[0], "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80")} alt={box.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-pine-950 text-xs">{box.name} {!box.is_active && <span className="text-red-500">(Ẩn)</span>}</div>
                        <div className="text-[11px] text-bark-500 line-clamp-1 max-w-[260px]">{box.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <PetSpeciesIcon species={box.species} variant="badge" size="xs" />
                      {/* Chỉ hộp cho chó chia theo size; mèo dùng chung một loại */}
                      {box.species === "dog" && (
                        <span className="text-[10px] font-medium text-bark-500 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
                          {box.size === "small" ? "Nhỏ" : "Lớn"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 font-medium">{box.item_count_min}–{box.item_count_max} món</td>
                  <td className="p-3.5 font-bold text-bark-800">{formatVND(box.min_retail_value)}</td>
                  <td className="p-3.5 font-bold text-pine-900">{formatVND(box.baseprice)}</td>
                  <td className="p-3.5 font-bold text-grass-700">{formatVND(price3)}/hộp</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleOpenEdit(box)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors">
                        <Edit2 className="w-3 h-3" /><span>Sửa</span>
                      </button>
                      <button onClick={() => setDeletingBox(box)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors">
                        <Trash2 className="w-3 h-3" /><span>Ẩn</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-4 sm:p-5 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">{editingBox ? `Chỉnh sửa: ${editingBox.name}` : "Thêm loại Mystery Box mới"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBox} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Tên loại Box *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Dành cho loài *</label>
                  <select value={formSpecies} onChange={(e) => setFormSpecies(e.target.value as "dog" | "cat")}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white">
                    <option value="dog">Chó</option>
                    <option value="cat">Mèo</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Kích cỡ *</label>
                  <select value={formSize} onChange={(e) => setFormSize(e.target.value as "small" | "large")}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white">
                    <option value="small">Nhỏ (&lt; 10kg)</option>
                    <option value="large">Lớn (≥ 10kg)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Số món tối thiểu</label>
                  <input type="number" value={formItemMin} onChange={(e) => setFormItemMin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Số món tối đa</label>
                  <input type="number" value={formItemMax} onChange={(e) => setFormItemMax(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá trị tối thiểu</label>
                  <input type="number" value={formMinRetail} onChange={(e) => setFormMinRetail(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá bán lẻ</label>
                  <input type="number" value={formBasePrice} onChange={(e) => setFormBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none font-bold text-pine-900" />
                </div>
              </div>
              <div>
                <label className="font-semibold text-bark-700 block mb-1">URL hình ảnh</label>
                <input type="text" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
              </div>
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Mô tả đặc điểm</label>
                <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors disabled:opacity-60">
                  {saving ? "Đang lưu..." : editingBox ? "Lưu thay đổi" : "Tạo loại Box"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận ẩn loại Box</h3>
            </div>
            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc muốn ẩn loại hộp <strong>&ldquo;{deletingBox.name}&rdquo;</strong>?
            </p>
            <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /><span>Lưu ý:</span></div>
              <p className="text-[11px] text-amber-800 leading-normal">
                Box bị ẩn sẽ không hiển thị khi khách chọn mua mới, nhưng các gói subscription đang hoạt động dùng loại box này vẫn tiếp tục bình thường.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button type="button" onClick={() => setDeletingBox(null)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold">Hủy</button>
              <button type="button" onClick={handleConfirmDeleteBox} className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors">Xác nhận ẩn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
