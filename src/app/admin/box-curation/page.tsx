"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProductItemImage from "@/components/common/ProductItemImage";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatWeight } from "@/lib/formatters";
import { fetchPendingCurations, fetchCandidateProducts, CurationQueueRow, CandidateProduct } from "@/lib/curation";
import { suggestBoxItems, SUGGEST_TOLERANCE, BoxRule } from "@/lib/boxSuggestion";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldAlert, Plus, PlusCircle, RotateCcw, Search, XCircle } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { Modal } from "@/components/ui/Modal";
import { useAdminTasks } from "../AdminTasks";
import { textMatches } from "@/lib/search";

const ORDER_TYPE_SHORT: Record<string, string> = { mystery_box: "Mua 1 lần", subscription_cycle: "Theo gói" };

// Hộp đã chờ bao lâu kể từ lúc khách đặt; quá 1 ngày tô vàng, quá 2 ngày tô đỏ
const waitingOf = (iso?: string) => {
  if (!iso) return null;
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const label = mins < 60 ? `${mins} phút` : mins < 1440 ? `${Math.floor(mins / 60)} giờ` : `${Math.floor(mins / 1440)} ngày`;
  return { label, tone: mins >= 2880 ? "text-red-700 font-bold" : mins >= 1440 ? "text-amber-700 font-bold" : "text-bark-600" };
};

const ruleOf = (row: CurationQueueRow): BoxRule => ({
  minRetailValue: row.box_types.min_retail_value,
  itemCountMin: row.box_types.item_count_min,
  itemCountMax: row.box_types.item_count_max,
});
const GROUP_ORDER: CandidateProduct["category"][] = ["food", "toy", "accessory"];
const sumPrice = (items: CandidateProduct[]) => items.reduce((s, p) => s + p.price, 0);

// Nhãn đi kèm từng món để admin xem nhanh món đó có hợp với bé không
function ItemFlags({ prod }: { prod: CandidateProduct }) {
  return (
    <>
      {prod.isAllergic && <span className="text-red-600 font-bold">· Chứa dị ứng!</span>}
      {prod.wasDisliked && <span className="text-red-600 font-bold">· Bé không thích</span>}
      {prod.wasSentBefore && <span className="text-amber-700 font-bold">· Đã gửi trước</span>}
      {prod.matchedPreferences.length > 0 && <span className="text-grass-700 font-bold">· Hợp sở thích: {prod.matchedPreferences.join(", ")}</span>}
    </>
  );
}

type SpeciesFilter = "all" | "dog" | "cat";
const SPECIES_FILTERS: { id: SpeciesFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "dog", label: "Chó" },
  { id: "cat", label: "Mèo" },
];

export default function AdminBoxCurationPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-bark-500">Đang tải hàng chờ tuyển chọn...</div>}>
      <CurationContent />
    </Suspense>
  );
}

function CurationContent() {
  // Mở từ trang Đơn hàng (?order=MÃ ĐƠN): chọn sẵn hộp của đơn đó
  const orderParam = useSearchParams().get("order");
  const [species, setSpecies] = useState<SpeciesFilter>("all");
  const [query, setQuery] = useState("");
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

  // Tải lại danh sách mà không che cả trang (chỉ lần đầu mới hiện "Đang tải"), giữ hộp đang chọn nếu còn trong hàng chờ
  const loadQueue = useCallback(async () => {
    const rows = await fetchPendingCurations();
    setQueue(rows);
    if (rows.length > 0) {
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return (orderParam && rows.find((r) => r.orders?.order_code === orderParam)?.id) || rows[0].id;
      });
    }
    setLoading(false);
  }, [orderParam]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const active = queue.find((q) => q.id === selectedId) || null;

  // Danh sách chờ sau khi lọc theo loài và từ khóa (tên bé, mã đơn, tên hộp)
  const visibleQueue = useMemo(() => {
    return queue.filter(
      (item) =>
        (species === "all" || item.pets.species === species) &&
        textMatches([item.pets.name, item.orders?.order_code, item.box_types.name], query)
    );
  }, [queue, species, query]);
  // Số hộp của cùng một đơn còn trong hàng chờ (đơn có nhiều hộp chỉ chuyển bước khi duyệt hết)
  const boxesInOrder = (orderId: string) => queue.filter((q) => q.order_id === orderId).length;
  const oldest = waitingOf(queue[0]?.orders?.created_at);

  // Đổi sang hộp khác thì tải món phù hợp với bé và đề xuất sẵn. Chỉ chạy lại khi đổi hộp,
  // không chạy khi danh sách chờ tự tải lại, để không xóa các món admin vừa chỉnh tay.
  const activeId = active?.id;
  useEffect(() => {
    if (!active) {
      setCandidates([]);
      setSelectedIds([]);
      return;
    }
    let cancelled = false;
    setCandidates([]);
    setSelectedIds([]);
    fetchCandidateProducts(active.pets).then((list) => {
      if (cancelled) return;
      setCandidates(list);
      setSelectedIds(suggestBoxItems(list, ruleOf(active)).map((item) => item.id));
    });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const rule = active ? ruleOf(active) : null;
  const minValue = rule?.minRetailValue || 0;
  // Hiện theo nhóm (ăn, chơi, chăm sóc/phụ kiện), giá cao trước để dễ xem lướt
  const selectedProducts = candidates
    .filter((c) => selectedIds.includes(c.id))
    .sort((a, b) => GROUP_ORDER.indexOf(a.category) - GROUP_ORDER.indexOf(b.category) || b.price - a.price);
  const totalValue = sumPrice(selectedProducts);
  const isValueValid = totalValue >= minValue;
  const overValue = totalValue - minValue;
  const hasAllergyViolation = selectedProducts.some((p) => p.isAllergic);

  // Số liệu để giải thích vì sao đề xuất phải lệch quy định (kho thiếu món mới, thiếu món giá trị cao...)
  const usable = candidates.filter((c) => !c.isAllergic);
  const usableValue = sumPrice(usable);
  // Giá trị cao nhất đạt được nếu chỉ dùng món bé chưa nhận, trong giới hạn số món của hộp
  const freshTopValue = sumPrice(
    usable.filter((c) => !c.wasSentBefore && !c.wasDisliked).sort((a, b) => b.price - a.price).slice(0, rule?.itemCountMax || 0)
  );
  const repeated = selectedProducts.filter((p) => p.wasSentBefore);
  const dislikedPicked = selectedProducts.filter((p) => p.wasDisliked);
  const missingGroups = GROUP_ORDER.filter((g) => usable.some((c) => c.category === g) && !selectedProducts.some((p) => p.category === g));
  const GROUP_NAME: Record<CandidateProduct["category"], string> = { food: "món ăn", toy: "đồ chơi", accessory: "đồ chăm sóc hoặc phụ kiện" };

  // Cửa sổ thêm món: món nên chọn lên đầu (hợp sở thích, chưa gửi), món không nên chọn xuống cuối
  const pickRank = (c: CandidateProduct) =>
    (c.isAllergic ? 8 : 0) + (c.wasDisliked ? 4 : 0) + (c.wasSentBefore ? 2 : 0) + (c.matchedPreferences.length > 0 ? 0 : 1);
  const pickerItems = candidates.filter((c) => !selectedIds.includes(c.id)).sort((a, b) => pickRank(a) - pickRank(b) || b.price - a.price);

  const resuggest = () => {
    if (active) setSelectedIds(suggestBoxItems(candidates, ruleOf(active)).map((item) => item.id));
  };

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
    // Duyệt xong tự chuyển sang hộp kế tiếp trong danh sách đang lọc
    const idx = visibleQueue.findIndex((q) => q.id === active.id);
    const next = visibleQueue[idx + 1] || visibleQueue[idx - 1];
    setSelectedId(next ? next.id : null);
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
        <p className="text-xs text-bark-600">
          Mỗi hộp đã có sẵn món đề xuất theo hồ sơ bé (loài, cỡ, tuổi, dị ứng, sở thích) và sát giá trị tối thiểu; xem lại rồi duyệt.
          {queue.length > 0 && oldest && (
            <>
              {" "}Còn <strong className="text-pine-950">{queue.length} hộp</strong>, hộp cũ nhất đã chờ <span className={oldest.tone}>{oldest.label}</span>.
            </>
          )}
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
          <div className="lg:col-span-4 lg:sticky lg:top-[4.5rem] rounded-container bg-surface-card border border-surface-border overflow-hidden">
            <div className="p-3 border-b border-surface-border space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-pine-950">
                  Danh sách chờ <span className="text-honey-700 tabular-nums">{visibleQueue.length}</span>
                  {visibleQueue.length !== queue.length && <span className="font-medium text-bark-600"> / {queue.length} hộp</span>}
                </span>
                <div role="group" aria-label="Lọc theo loài" className="inline-flex p-0.5 rounded-box bg-surface-muted text-[11px]">
                  {SPECIES_FILTERS.map((f) => (
                    <button key={f.id} type="button" aria-pressed={species === f.id} onClick={() => setSpecies(f.id)}
                      className={`h-7 px-2.5 rounded-lg font-bold transition-colors ${species === f.id ? "bg-white text-pine-950 shadow-xs" : "text-bark-600"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-bark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tên bé, mã đơn hoặc tên hộp"
                  aria-label="Tìm trong danh sách chờ"
                  className="w-full h-9 pl-9 pr-3 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Danh sách cuộn riêng để khung chọn món bên phải luôn nằm trong tầm mắt */}
            <ul className="max-h-[22rem] lg:max-h-[calc(100vh-13.5rem)] overflow-y-auto divide-y divide-surface-border">
              {visibleQueue.length === 0 && <li className="p-6 text-center text-xs text-bark-600">Không có hộp nào khớp bộ lọc.</li>}
              {visibleQueue.map((item) => {
                const isSelected = item.id === active?.id;
                const wait = waitingOf(item.orders?.created_at);
                const siblings = boxesInOrder(item.order_id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-l-[3px] ${
                        isSelected ? "border-l-pine-900 bg-pine-50" : "border-l-transparent hover:bg-surface-muted/60"
                      }`}
                    >
                      <PetSpeciesIcon species={item.pets.species} variant="avatar" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-pine-950 truncate">Bé {item.pets.name}</span>
                          {wait && <span className={`text-[11px] shrink-0 ${wait.tone}`}>chờ {wait.label}</span>}
                        </span>
                        <span className="block text-[11px] text-bark-700 truncate">{item.box_types.name}</span>
                        <span className="block text-[11px] text-bark-600 truncate">
                          <span className="font-mono">{item.orders?.order_code}</span>
                          {" · "}
                          {ORDER_TYPE_SHORT[item.orders?.order_type || ""] || "Mystery Box"}
                          {item.orders?.cycle_index ? ` kỳ ${item.orders.cycle_index}` : ""}
                          {siblings > 1 ? ` · đơn còn ${siblings} hộp` : ""}
                        </span>
                        {item.pets.allergies?.length > 0 && (
                          <span className="block text-[11px] font-bold text-red-700 truncate">Dị ứng: {item.pets.allergies.join(", ")}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
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
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold text-pine-950">
                    <span>
                      Món đề xuất ({selectedProducts.length} món; quy định {active.box_types.item_count_min}–{active.box_types.item_count_max} món)
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-bark-600 font-normal">
                        Cam kết tối thiểu: <strong>{formatVND(minValue)}</strong>
                      </span>
                      <button type="button" onClick={resuggest} className="inline-flex items-center gap-1 text-pine-900 hover:underline">
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Đề xuất lại</span>
                      </button>
                    </span>
                  </div>
                  <p className="text-[11px] text-bark-600">
                    Hệ thống chọn tổ hợp món đạt mức tối thiểu và vượt không quá {formatVND(SUGGEST_TOLERANCE)}, đủ món ăn, đồ chơi, đồ chăm sóc, ưu tiên món hợp sở thích và món bé chưa nhận.
                  </p>

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

                  {/* Kho không đủ món để đạt cam kết: không duyệt được cho tới khi nhập thêm hàng */}
                  {candidates.length > 0 && usableValue < minValue && (
                    <div className="p-3 rounded-box bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Kho chỉ còn {formatVND(usableValue)} món hợp với bé {active.pets.name} (đã loại món dị ứng), chưa đủ mức tối thiểu {formatVND(minValue)}. Cần nhập thêm hàng trước khi duyệt hộp này.
                      </span>
                    </div>
                  )}

                  {/* Những chỗ đề xuất phải lệch quy định, kèm lý do, để admin cân nhắc trước khi duyệt */}
                  {(selectedProducts.length > active.box_types.item_count_max ||
                    (selectedProducts.length > 0 && selectedProducts.length < active.box_types.item_count_min) ||
                    repeated.length > 0 || dislikedPicked.length > 0 || (selectedProducts.length > 0 && missingGroups.length > 0)) && (
                    <ul className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                      {selectedProducts.length > active.box_types.item_count_max && (
                        <li>
                          <strong>Nhiều hơn quy định {selectedProducts.length - active.box_types.item_count_max} món.</strong>{" "}
                          Các món hợp với bé còn trong kho không đạt {formatVND(minValue)} nếu chỉ lấy {active.box_types.item_count_max} món. Nên nhập thêm món giá trị cao.
                        </li>
                      )}
                      {selectedProducts.length > 0 && selectedProducts.length < active.box_types.item_count_min && (
                        <li><strong>Ít hơn quy định {active.box_types.item_count_min - selectedProducts.length} món.</strong></li>
                      )}
                      {repeated.length > 0 && (
                        <li>
                          <strong>{repeated.length} món bé đã nhận ở hộp trước:</strong> {repeated.map((p) => p.name).join(", ")}.
                          {freshTopValue < minValue && ` Món bé chưa nhận chỉ đạt tối đa ${formatVND(freshTopValue)} trong ${active.box_types.item_count_max} món nên phải dùng lại món đã gửi. Nên nhập thêm món mới.`}
                        </li>
                      )}
                      {dislikedPicked.length > 0 && (
                        <li><strong>{dislikedPicked.length} món bé từng chấm không thích:</strong> {dislikedPicked.map((p) => p.name).join(", ")}.</li>
                      )}
                      {selectedProducts.length > 0 && missingGroups.length > 0 && (
                        <li><strong>Hộp chưa có {missingGroups.map((g) => GROUP_NAME[g]).join(", ")}.</strong> Mỗi hộp cần ít nhất 1 món ăn, 1 đồ chơi và 1 đồ chăm sóc hoặc phụ kiện.</li>
                      )}
                    </ul>
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
                          <span className="text-[11px] text-bark-600 flex flex-wrap items-center gap-x-1.5">
                            {prod.categoryLabel} · Tồn kho: {prod.stock}
                            <ItemFlags prod={prod} />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-pine-950">{formatVND(prod.price)}</span>
                        <button type="button" aria-label={`Bỏ ${prod.name} khỏi hộp`} onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== prod.id))}
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

                {/* Dính ở đáy màn hình khi danh sách món dài, để nút duyệt luôn bấm được */}
                <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 rounded-b-container bg-surface-card border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-bark-500">Tổng giá trị thực tế các món:</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-pine-950 font-display">{formatVND(totalValue)}</span>
                      {!isValueValid ? (
                        <span className="text-xs font-bold text-red-600">(Thiếu {formatVND(-overValue)} so với tối thiểu {formatVND(minValue)})</span>
                      ) : overValue === 0 ? (
                        <span className="text-xs font-bold text-grass-700">(Đạt, đúng mức tối thiểu)</span>
                      ) : overValue <= SUGGEST_TOLERANCE ? (
                        <span className="text-xs font-bold text-grass-700">(Đạt, vượt tối thiểu {formatVND(overValue)})</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700">(Đạt, vượt tối thiểu {formatVND(overValue)})</span>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={handleApprove} disabled={approving || !isValueValid || hasAllergyViolation}
                    className="w-full sm:w-auto px-6 py-3 rounded-box text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-pine-900 hover:bg-pine-800 text-white shadow-sm disabled:bg-surface-muted disabled:text-bark-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{approving ? "Đang xử lý..." : visibleQueue.length > 1 ? "Duyệt và sang hộp kế tiếp" : "Duyệt hộp này"}</span>
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
              {pickerItems.length === 0 && (
                <p className="py-6 text-center text-bark-500">Không còn món phù hợp nào trong kho.</p>
              )}
              {pickerItems.map((prod) => (
                <div key={prod.id} className="p-3 rounded-box border border-surface-border hover:bg-surface-muted flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                      <ProductItemImage src={prod.image} alt={prod.name} category={prod.category} placeholderColor={prod.placeholderColor} sizes="40px" showNote={false} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-pine-950 block truncate">{prod.name}</span>
                      <span className="text-[11px] text-bark-600 flex flex-wrap items-center gap-x-1.5">
                        {prod.categoryLabel} · Tồn: {prod.stock}
                        <ItemFlags prod={prod} />
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
