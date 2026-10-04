"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProductItemImage from "@/components/common/ProductItemImage";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatWeight } from "@/lib/formatters";
import { fetchPendingCurations, fetchCandidateProducts, autoSuggest, CurationQueueRow, CandidateProduct } from "@/lib/curation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldAlert, Plus, PlusCircle, XCircle } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/formatters";
import { useAdminTasks } from "../AdminTasks";

const ORDER_TYPE_SHORT: Record<string, string> = { mystery_box: "Mua 1 lần", subscription_cycle: "Theo gói" };
const sizeLabel = (pet: { species: string; size: string }) => (pet.species === "cat" ? "Mèo" : pet.size === "small" ? "Chó nhỏ dưới 10 kg" : "Chó lớn từ 10 kg");

export default function AdminBoxCurationPage() {
  const [queue, setQueue] = useState<CurationQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastApproved, setLastApproved] = useState<string | null>(null);
  const { refresh: refreshTasks } = useAdminTasks();

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const rows = await fetchPendingCurations();
    setQueue(rows);
    if (rows.length > 0) setSelectedId((prev) => prev && rows.some((r) => r.id === prev) ? prev : rows[0].id);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const active = queue.find((q) => q.id === selectedId) || null;

  useEffect(() => {
    if (!active) {
      setCandidates([]);
      setSelectedIds([]);
      return;
    }
    fetchCandidateProducts(active.pets).then((list) => {
      setCandidates(list);
      const suggested = autoSuggest(list, active.box_types.min_retail_value);
      setSelectedIds(suggested.map((s) => s.id));
    });
  }, [active]);

  const selectedProducts = candidates.filter((c) => selectedIds.includes(c.id));
  const totalValue = selectedProducts.reduce((s, p) => s + p.price, 0);
  const isValueValid = totalValue >= (active?.box_types.min_retail_value || 0);
  const hasAllergyViolation = selectedProducts.some((p) => p.isAllergic);

  const handleApprove = async () => {
    if (!active) return;
    setApproving(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: rpcError } = await supabase.rpc("approve_box_curation", {
      p_curation_id: active.id,
      p_product_ids: selectedIds,
    });
    setApproving(false);
    if (rpcError) {
      const map: Record<string, string> = {
        ERR_BELOW_MIN_VALUE: "Chưa đạt giá trị tối thiểu, vui lòng thêm món.",
        ERR_OUT_OF_STOCK: "Một món đã hết hàng, vui lòng chọn món khác.",
        ERR_ALREADY_CURATED: "Hộp này đã được duyệt trước đó.",
        ERR_ORDER_NOT_READY: "Đơn của hộp này chưa thanh toán hoặc đã hủy nên chưa tuyển chọn được.",
      };
      const key = Object.keys(map).find((k) => rpcError.message.includes(k));
      setError(key ? map[key] : rpcError.message);
      return;
    }
    // Đơn có nhiều hộp chỉ chuyển sang "Đang chuẩn bị" khi hộp cuối cùng được duyệt
    const remaining = Number((result as { remaining_pending?: number } | null)?.remaining_pending ?? 0);
    setNotice(
      remaining > 0
        ? `Đã duyệt hộp cho bé ${active.pets.name}, tồn kho đã được trừ. Đơn ${active.orders?.order_code} còn ${remaining} hộp chờ tuyển chọn.`
        : `Đã duyệt hộp cho bé ${active.pets.name}. Đơn ${active.orders?.order_code} chuyển sang Đang chuẩn bị, tồn kho đã được trừ.`
    );
    setLastApproved(remaining > 0 ? null : active.orders?.order_code || null);
    setTimeout(() => setNotice(null), 6000);
    refreshTasks();
    loadQueue();
  };

  const ageLabel: Record<string, string> = { puppy_kitten: "Dưới 1 tuổi", adult: "Trưởng thành", senior: "Trên 7 tuổi" };

  if (loading) {
    return <div className="py-16 text-center text-xs text-bark-500">Đang tải hàng chờ tuyển chọn...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Hàng chờ tuyển chọn</h1>
        <p className="text-xs text-bark-500">
          Món được gợi ý theo hồ sơ bé (loài, cỡ, tuổi), loại món chứa thành phần dị ứng và đánh dấu món đã gửi hoặc bé không thích.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          {lastApproved && (
            <Link href={`/admin/orders?q=${lastApproved}&status=dang_chuan_bi`} className="underline shrink-0">Bàn giao vận chuyển</Link>
          )}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-box bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
          Không có hộp nào đang chờ tuyển chọn.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-bold text-bark-700 block">Danh sách chờ ({queue.length} hộp)</span>
            {queue.map((item) => {
              const isSelected = item.id === active?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full p-4 rounded-container border text-left transition-all ${isSelected ? "border-pine-900 bg-surface-card ring-2 ring-pine-900/10 shadow-sm" : "border-surface-border bg-surface-card hover:bg-surface-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-bark-600">{item.orders?.order_code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700">
                      {ORDER_TYPE_SHORT[item.orders?.order_type || ""] || "Mystery Box"}{item.orders?.cycle_index ? ` · kỳ ${item.orders.cycle_index}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <PetSpeciesIcon species={item.pets.species} variant="avatar" size="sm" />
                    <div>
                      <h3 className="text-sm font-bold text-pine-950">Bé {item.pets.name}</h3>
                      <p className="text-[11px] text-bark-500">{sizeLabel(item.pets)} · {item.box_types.name}</p>
                      {item.orders?.created_at && <p className="text-[10px] text-bark-500">Đặt lúc {formatDateTime(item.orders.created_at)}</p>}
                    </div>
                  </div>
                  {item.pets.allergies?.length > 0 && (
                    <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded inline-block">
                      Dị ứng: {item.pets.allergies.join(", ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 space-y-5">
            {active && (
              <div className="p-4 sm:p-6 rounded-container bg-surface-card border border-surface-border space-y-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-surface-border">
                  <div>
                    <span className="inline-block text-xs font-semibold text-pine-900 bg-pine-50 px-2.5 py-0.5 rounded-tag border border-pine-200">
                      {active.box_types.name}
                    </span>
                    <h2 className="text-xl font-extrabold text-pine-950 font-display mt-1">
                      Tuyển chọn hộp cho bé {active.pets.name}
                    </h2>
                    <p className="text-xs text-bark-600 mt-1">
                      Đơn hàng: <strong>{active.orders?.order_code}</strong> · {[active.pets.breed, active.pets.weight ? formatWeight(active.pets.weight) : null, ageLabel[active.pets.age_group]].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-1">
                    <span className="font-bold text-pine-950 block">Thành phần dị ứng cần tránh:</span>
                    {active.pets.allergies?.length > 0 ? (
                      <span className="font-extrabold text-red-700 bg-red-100/70 px-2 py-0.5 rounded border border-red-200 inline-flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{active.pets.allergies.join(", ")}</span>
                      </span>
                    ) : (
                      <span className="text-grass-700 font-semibold">Không có khai báo dị ứng</span>
                    )}
                    <div className="text-[11px] text-bark-500 pt-1">
                      Sở thích: {active.pets.preferences?.join(", ") || "Không có"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-1">
                    <span className="font-bold text-pine-950 block">Ghi chú tuyển chọn:</span>
                    {active.pets.notes && (
                      <p className="text-[11px] text-pine-950 font-semibold whitespace-pre-line">{active.pets.notes}</p>
                    )}
                    <p className="text-[11px] text-bark-600">
                      Món có nhãn &quot;Đã gửi trước&quot; hoặc &quot;Bé không thích&quot; nên tránh chọn lại nếu còn lựa chọn khác.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-pine-950">
                    <span>
                      Món đã chọn ({selectedProducts.length}; quy định {active.box_types.item_count_min}–{active.box_types.item_count_max} món):
                      {selectedProducts.length > active.box_types.item_count_max && (
                        <span className="block text-[11px] font-medium text-amber-700">
                          Vượt số món quy định vì các món phù hợp hiện có chưa đủ giá trị tối thiểu. Nên nhập thêm món giá trị cao.
                        </span>
                      )}
                    </span>
                    <span className="text-bark-500 font-normal">
                      Cam kết tối thiểu: <strong>{formatVND(active.box_types.min_retail_value)}</strong>
                    </span>
                  </div>

                  {hasAllergyViolation ? (
                    <div className="p-3 rounded-box bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Cảnh báo: có món chứa thành phần dị ứng của bé! Bắt buộc đổi món trước khi duyệt.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                      <span>Không có món nào chứa thành phần dị ứng đã khai báo.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedProducts.map((prod) => (
                    <div key={prod.id} className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                          <ProductItemImage src={prod.image} alt={prod.name} category={prod.category} placeholderColor={prod.placeholderColor} sizes="36px" showNote={false} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-pine-950 truncate block">{prod.name}</span>
                          <span className="text-[10px] text-bark-500 flex items-center gap-1.5">
                            {prod.categoryLabel} · Tồn kho: {prod.stock}
                            {prod.isAllergic && <span className="text-red-600 font-bold">· Chứa dị ứng!</span>}
                            {prod.wasSentBefore && <span className="text-amber-600 font-bold">· Đã gửi trước</span>}
                            {prod.wasDisliked && <span className="text-amber-600 font-bold">· Bé không thích</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-pine-950">{formatVND(prod.price)}</span>
                        <button type="button" onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== prod.id))}
                          className="p-1.5 rounded text-bark-400 hover:text-red-600">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={() => setPickerOpen(true)}
                    className="w-full p-2.5 rounded-box border border-dashed border-surface-border text-bark-600 hover:bg-surface-muted text-xs font-semibold flex items-center justify-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm / đổi món khác</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-bark-500">Tổng giá trị thực tế các món:</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-pine-950 font-display">{formatVND(totalValue)}</span>
                      {isValueValid ? (
                        <span className="text-xs font-bold text-grass-700">(Đạt chuẩn)</span>
                      ) : (
                        <span className="text-xs font-bold text-red-600">(Chưa đạt tối thiểu {formatVND(active.box_types.min_retail_value)})</span>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={handleApprove} disabled={approving || !isValueValid || hasAllergyViolation}
                    className="w-full sm:w-auto px-6 py-3 rounded-box text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-pine-900 hover:bg-pine-800 text-white shadow-sm disabled:bg-surface-muted disabled:text-bark-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{approving ? "Đang xử lý..." : "Xác nhận duyệt tuyển chọn hộp"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {active && (
        <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={`Thêm món cho hộp bé ${active.pets.name}`} maxWidth="max-w-lg">
            <div className="space-y-2 text-xs">
              {candidates.filter((c) => !selectedIds.includes(c.id)).length === 0 && (
                <p className="py-6 text-center text-bark-500">Không còn món phù hợp nào trong kho.</p>
              )}
              {candidates.filter((c) => !selectedIds.includes(c.id)).map((prod) => (
                <div key={prod.id} className="p-3 rounded-box border border-surface-border hover:bg-surface-muted flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                      <ProductItemImage src={prod.image} alt={prod.name} category={prod.category} placeholderColor={prod.placeholderColor} sizes="40px" showNote={false} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-pine-950 block truncate">{prod.name}</span>
                      <span className="text-[11px] text-bark-500 flex items-center gap-1.5">
                        {prod.categoryLabel} · Tồn: {prod.stock}
                        {prod.isAllergic && <span className="text-red-600 font-bold">Dị ứng!</span>}
                        {prod.wasSentBefore && <span className="text-amber-600 font-bold">Đã gửi</span>}
                        {prod.wasDisliked && <span className="text-amber-600 font-bold">Không thích</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-pine-950">{formatVND(prod.price)}</span>
                    <button type="button" disabled={prod.isAllergic}
                      onClick={() => { setSelectedIds((prev) => [...prev, prod.id]); setPickerOpen(false); }}
                      className="px-3 py-1.5 rounded-box bg-pine-900 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
        </Modal>
      )}
    </div>
  );
}
