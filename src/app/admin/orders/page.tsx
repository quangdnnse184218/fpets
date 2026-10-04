"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Truck, PackageCheck, PackageSearch, CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDateTime } from "@/lib/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, OrderStatus, PAYMENT_METHOD_NAME, RETURN_RESOLUTION_LABEL } from "@/lib/orderDisplay";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAdminTasks } from "../AdminTasks";

const ACTION_ERROR: Record<string, string> = {
  ERR_INVALID_ORDER_STATUS: "Trạng thái đơn vừa thay đổi. Đã tải lại danh sách, vui lòng kiểm tra lại.",
  ERR_FORBIDDEN: "Tài khoản không có quyền thực hiện thao tác này.",
  ERR_NOTE_REQUIRED: "Vui lòng nhập lý do từ chối để gửi cho khách.",
  ERR_REASON_REQUIRED: "Vui lòng nhập lý do hủy để gửi cho khách.",
  ERR_CURATION_PENDING: "Đơn còn hộp chưa tuyển chọn. Duyệt hộp ở Hàng chờ tuyển chọn trước khi đóng gói.",
  ERR_SUBSCRIPTION_ORDER: "Đơn thuộc gói định kỳ không hủy riêng được. Tạm dừng hoặc hủy gói ở trang Gói định kỳ.",
  ERR_TRACKING_REQUIRED: "Vui lòng nhập mã vận đơn.",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = { paid: "Đã thanh toán", pending: "Chưa thanh toán", refunded: "Đã hoàn tiền", failed: "Thanh toán lỗi" };

// "Thanh toán/Gia hạn gói" chỉ là biên nhận tiền; hộp giao thực tế theo đơn "Hộp theo gói"
const TYPE_LABEL: Record<string, string> = {
  retail: "Hàng lẻ",
  mystery_box: "Mystery Box",
  subscription_initial: "Thanh toán gói",
  subscription_renewal: "Gia hạn gói",
  subscription_cycle: "Hộp theo gói",
};

type TypeFilter = "delivery" | "retail" | "mystery_box" | "subscription_cycle" | "receipts" | "all";
const TYPE_FILTERS: { id: TypeFilter; label: string; types: string[] | null }[] = [
  { id: "delivery", label: "Đơn giao hàng", types: ["retail", "mystery_box", "subscription_cycle"] },
  { id: "retail", label: "Hàng lẻ", types: ["retail"] },
  { id: "mystery_box", label: "Mystery Box", types: ["mystery_box"] },
  { id: "subscription_cycle", label: "Hộp theo gói", types: ["subscription_cycle"] },
  { id: "receipts", label: "Thanh toán / gia hạn gói", types: ["subscription_initial", "subscription_renewal"] },
  { id: "all", label: "Tất cả", types: null },
];

// "todo" = bàn làm việc: mọi đơn đang cần admin thao tác, gom theo bước và xếp đơn chờ lâu nhất lên đầu.
// Các tab còn lại để tra cứu theo từng trạng thái (đơn mới nhất lên đầu).
type View = "todo" | OrderStatus | "all";
const ALL_STATUSES: OrderStatus[] = ["cho_thanh_toan", "da_xac_nhan", "dang_chuan_bi", "dang_giao", "da_giao", "doi_tra", "da_huy"];
const VIEW_TABS: View[] = ["todo", ...ALL_STATUSES, "all"];
const TODO_STATUSES: OrderStatus[] = ["doi_tra", "da_xac_nhan", "dang_chuan_bi", "dang_giao"];
const RECEIPT_TYPES = ["subscription_initial", "subscription_renewal"];
const CARRIERS = ["Giao Hàng Nhanh", "Giao Hàng Tiết Kiệm", "Viettel Post", "J&T Express", "Ahamove (nội thành)"];

interface OrderRow {
  id: string;
  order_code: string;
  order_type: string;
  cycle_index: number | null;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  ward: string | null;
  province_city: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  return_reason: string | null;
  return_requested_at: string | null;
  return_resolution: "exchanged" | "refunded" | "rejected" | null;
  return_admin_note: string | null;
  cancellation_reason: string | null;
  tracking_code: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  subscriptions: { subscription_code: string } | null;
  order_items: { id: string; product_name_snapshot: string; quantity: number; total_price: number; pets: { name: string } | null }[];
  // Một đơn có thể có nhiều hộp (mỗi bé một hộp), mỗi hộp một dòng tuyển chọn
  box_curations: BoxCurationEmbed | BoxCurationEmbed[] | null;
}

type BoxCurationEmbed = {
  status: string;
  pets: { name: string } | null;
  box_types: { name: string } | null;
  box_curation_items: { quantity: number; products: { name: string } | null }[];
};
const curationsOf = (o: OrderRow): BoxCurationEmbed[] => (o.box_curations ? ([] as BoxCurationEmbed[]).concat(o.box_curations) : []);
const hasPendingCuration = (o: OrderRow) => curationsOf(o).some((c) => c.status === "pending_curation");

// Tóm tắt hàng trong đơn ngay trên dòng, để đóng gói không phải mở từng đơn
const itemsSummary = (o: OrderRow): string => {
  if (o.order_items.length > 0) {
    return o.order_items
      .map((it) => `${it.quantity > 1 && !RECEIPT_TYPES.includes(o.order_type) ? `${it.quantity} × ` : ""}${it.product_name_snapshot}${it.pets?.name ? ` (bé ${it.pets.name})` : ""}`)
      .join(", ");
  }
  // Hộp theo gói không có dòng hàng, chỉ có hộp cần tuyển chọn
  return curationsOf(o).map((c) => `${c.box_types?.name || "Mystery Box"}${c.pets?.name ? ` (bé ${c.pets.name})` : ""}`).join(", ");
};

// Đơn đã chờ bao lâu kể từ lúc đặt; quá 1 ngày tô vàng, quá 2 ngày tô đỏ
const waitingOf = (iso: string) => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const label = mins < 60 ? `${mins} phút` : mins < 1440 ? `${Math.floor(mins / 60)} giờ` : `${Math.floor(mins / 1440)} ngày`;
  return { label, tone: mins >= 2880 ? "text-red-700 font-bold" : mins >= 1440 ? "text-amber-700 font-bold" : "text-bark-600" };
};

// Việc tiếp theo của một đơn (dùng cho nút thao tác nhanh trên dòng)
type NextStep = "return" | "curate" | "pack" | "ship" | "deliver" | null;
const nextStepOf = (o: OrderRow): NextStep => {
  if (RECEIPT_TYPES.includes(o.order_type)) return null;
  if (o.status === "doi_tra") return "return";
  if (o.status === "da_xac_nhan") return hasPendingCuration(o) ? "curate" : "pack";
  if (o.status === "dang_chuan_bi") return "ship";
  if (o.status === "dang_giao") return "deliver";
  return null;
};

const TODO_SECTIONS: { step: Exclude<NextStep, null>; title: string; hint: string; bulkLabel?: string }[] = [
  { step: "return", title: "Yêu cầu đổi / trả", hint: "Xem lý do rồi phản hồi khách." },
  { step: "curate", title: "Chờ chọn món cho hộp", hint: "Chọn món xong, đơn tự chuyển xuống mục chờ bàn giao." },
  { step: "pack", title: "Chờ đóng gói", hint: "Đơn hàng lẻ đã xác nhận.", bulkLabel: "Bắt đầu đóng gói" },
  { step: "ship", title: "Chờ bàn giao vận chuyển", hint: "Nhập mã vận đơn khi giao cho đơn vị vận chuyển." },
  { step: "deliver", title: "Đang giao", hint: "Bấm Đã giao khi khách nhận hàng.", bulkLabel: "Đánh dấu đã giao" },
];

const SELECT =
  "id, order_code, order_type, cycle_index, status, payment_method, payment_status, subtotal, shipping_fee, discount_amount, total_amount, recipient_name, recipient_phone, shipping_address, ward, province_city, customer_notes, admin_notes, return_reason, return_requested_at, return_resolution, return_admin_note, cancellation_reason, tracking_code, created_at, paid_at, delivered_at, subscriptions(subscription_code), order_items(id, product_name_snapshot, quantity, total_price, pets(name)), box_curations(status, pets(name), box_types(name), box_curation_items(quantity, products(name)))";

// Ký tự đặc biệt của bộ lọc PostgREST (dấu phẩy, ngoặc, %) bỏ đi để từ khóa không phá câu truy vấn
const cleanQuery = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-bark-500">Đang tải đơn hàng…</div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const { refresh: refreshTasks } = useAdminTasks();

  const statusParam = searchParams.get("status") || "";
  const view: View = statusParam === "all" ? "all" : (ALL_STATUSES as string[]).includes(statusParam) ? (statusParam as OrderStatus) : "todo";
  const type = (TYPE_FILTERS.find((t) => t.id === searchParams.get("type"))?.id || "delivery") as TypeFilter;
  const q = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(q);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  // Thao tác nhanh trên dòng và thao tác hàng loạt
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<NextStep>(null);

  useEffect(() => setSearchInput(q), [q]);

  const setParams = (next: Partial<{ status: string; type: string; q: string }>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || (k === "status" && v === "todo") || (k === "type" && v === "delivery")) params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const typeList = TYPE_FILTERS.find((t) => t.id === type)?.types || null;
  const search = cleanQuery(q);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const base = () => {
      let query = supabase.from("orders").select("id", { count: "exact", head: true });
      if (typeList) query = query.in("order_type", typeList);
      if (search) query = query.or(`order_code.ilike.%${search}%,recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%`);
      return query;
    };
    // Bàn làm việc: đơn chờ lâu nhất lên đầu. Tra cứu theo trạng thái: đơn mới nhất lên đầu.
    let listQuery =
      view === "todo"
        ? supabase.from("orders").select(SELECT).in("status", TODO_STATUSES).order("created_at", { ascending: true }).limit(300)
        : supabase.from("orders").select(SELECT).order("created_at", { ascending: false }).limit(100);
    if (typeList) listQuery = listQuery.in("order_type", typeList);
    if (view !== "todo" && view !== "all") listQuery = listQuery.eq("status", view);
    if (search) listQuery = listQuery.or(`order_code.ilike.%${search}%,recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%`);

    const [{ data }, ...countResults] = await Promise.all([listQuery, ...ALL_STATUSES.map((st) => base().eq("status", st))]);
    const counts: Record<string, number> = {};
    ALL_STATUSES.forEach((st, i) => (counts[st] = countResults[i].count || 0));
    counts.all = ALL_STATUSES.reduce((sum, st) => sum + counts[st], 0);
    setStatusCounts(counts);
    setOrders((data as unknown as OrderRow[]) || []);
    setChecked(new Set());
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, view, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Sau thao tác: tải lại danh sách và cập nhật đơn đang mở
  const afterAction = async (message: string, orderId: string) => {
    show(message);
    refreshTasks();
    await load();
    const { data } = await createClient().from("orders").select(SELECT).eq("id", orderId).maybeSingle();
    setSelected((data as unknown as OrderRow) || null);
  };

  const rpcFor = (step: NextStep, orderId: string) => {
    const supabase = createClient();
    return step === "pack" ? supabase.rpc("start_order_preparation", { p_order_id: orderId }) : supabase.rpc("mark_order_delivered", { p_order_id: orderId });
  };

  // Thao tác nhanh 1 đơn ngay trên dòng (đóng gói, đã giao). Các bước cần nhập thêm thông tin thì mở chi tiết đơn.
  const quick = async (o: OrderRow, step: NextStep) => {
    if (step !== "pack" && step !== "deliver") return setSelected(o);
    setBusyId(o.id);
    const { error } = await rpcFor(step, o.id);
    setBusyId(null);
    if (error) {
      const key = Object.keys(ACTION_ERROR).find((k) => error.message.includes(k));
      show(key ? ACTION_ERROR[key] : "Không thực hiện được thao tác, vui lòng thử lại.");
    } else {
      show(step === "pack" ? `Đơn ${o.order_code} đã chuyển sang Đang chuẩn bị.` : `Đã ghi nhận giao thành công đơn ${o.order_code}.`);
    }
    refreshTasks();
    load();
  };

  const bulk = async (step: NextStep, ids: string[]) => {
    if (ids.length === 0) return;
    setBulkBusy(step);
    const results = await Promise.all(ids.map((id) => rpcFor(step, id)));
    const failed = results.filter((r) => r.error).length;
    setBulkBusy(null);
    show(failed === 0 ? `Đã xử lý ${ids.length} đơn.` : `Đã xử lý ${ids.length - failed} đơn, ${failed} đơn chưa xử lý được (trạng thái đã thay đổi).`);
    refreshTasks();
    load();
  };

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleMany = (ids: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const todoCount = TODO_STATUSES.reduce((sum, st) => sum + (statusCounts[st] || 0), 0);
  const tabLabel = (v: View) => (v === "todo" ? "Cần xử lý" : v === "all" ? "Tất cả" : ORDER_STATUS_LABEL[v]);
  const tabCount = (v: View) => (v === "todo" ? todoCount : statusCounts[v] ?? 0);
  // Bàn làm việc không tính biên nhận thanh toán gói (không có hàng cần giao)
  const todoSections = TODO_SECTIONS.map((sec) => ({ ...sec, rows: orders.filter((o) => nextStepOf(o) === sec.step) })).filter((sec) => sec.rows.length > 0);

  const tableProps = { onOpen: setSelected, onQuick: quick, busyId, checked, onToggle: toggle, onToggleMany: toggleMany };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Đơn hàng</h1>
        <p className="text-xs text-bark-600">Mục Cần xử lý gom mọi đơn đang chờ thao tác theo từng bước, đơn chờ lâu nhất nằm trên cùng.</p>
      </div>

      <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Nhóm đơn">
          {VIEW_TABS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setParams({ status: v })}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold border transition-colors ${
                view === v ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-700 hover:bg-surface-muted"
              } ${v === "todo" ? "pr-3.5 font-bold" : ""} ${v === "cho_thanh_toan" ? "ml-2" : ""}`}
            >
              {tabLabel(v)}
              <span className={`text-[11px] font-extrabold tabular-nums ${view === v ? "text-pine-100" : v === "todo" && todoCount > 0 ? "text-honey-700" : "text-bark-500"}`}>{tabCount(v)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <form
            className="relative flex-1 sm:max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ q: searchInput.trim() });
            }}
          >
            <Search className="w-4 h-4 text-bark-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Mã đơn, tên hoặc SĐT người nhận"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={() => searchInput.trim() !== q && setParams({ q: searchInput.trim() })}
              aria-label="Tìm đơn hàng"
              className="w-full h-10 pl-9 pr-3 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
            />
          </form>
          <select
            value={type}
            onChange={(e) => setParams({ type: e.target.value })}
            aria-label="Loại đơn"
            className="h-10 text-xs font-semibold px-3 rounded-box border border-surface-border bg-white text-bark-800"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-bark-500">Đang tải đơn hàng…</div>
      ) : view === "todo" ? (
        todoSections.length === 0 ? (
          <div className="p-10 text-center text-sm text-bark-600 rounded-container bg-surface-card border border-surface-border">
            {search ? "Không có đơn cần xử lý nào khớp từ khóa." : "Không còn đơn nào cần xử lý."}
          </div>
        ) : (
          <div className="space-y-6">
            {todoSections.map((sec) => {
              const ids = sec.rows.map((o) => o.id);
              const picked = ids.filter((id) => checked.has(id));
              return (
                <section key={sec.step} aria-labelledby={`sec-${sec.step}`} className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                    <div>
                      <h2 id={`sec-${sec.step}`} className="text-sm font-extrabold text-pine-950">
                        {sec.title} <span className="font-bold text-honey-700 tabular-nums">{sec.rows.length}</span>
                      </h2>
                      <p className="text-xs text-bark-600">{sec.hint}</p>
                    </div>
                    {sec.step === "curate" && (
                      <Link href="/admin/box-curation" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold">
                        <PackageSearch className="w-4 h-4" /> Mở hàng chờ tuyển chọn
                      </Link>
                    )}
                    {sec.bulkLabel && picked.length > 0 && (
                      <Button size="sm" loading={bulkBusy === sec.step} onClick={() => bulk(sec.step, picked)}>
                        {sec.bulkLabel} ({picked.length})
                      </Button>
                    )}
                  </div>
                  <OrdersTable rows={sec.rows} selectable={!!sec.bulkLabel} showWaiting {...tableProps} />
                </section>
              );
            })}
            {orders.length === 300 && <p className="text-center text-xs text-bark-600">Đang hiện 300 đơn chờ lâu nhất. Xử lý bớt hoặc dùng ô tìm kiếm để thấy các đơn còn lại.</p>}
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="p-10 text-center text-sm text-bark-600 rounded-container bg-surface-card border border-surface-border">Không có đơn nào phù hợp bộ lọc.</div>
      ) : (
        <>
          <OrdersTable rows={orders} showStatus {...tableProps} />
          {orders.length === 100 && <p className="text-center text-xs text-bark-600">Đang hiện 100 đơn mới nhất. Dùng ô tìm kiếm hoặc bộ lọc để tìm đơn cũ hơn.</p>}
        </>
      )}

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onDone={afterAction} onStale={load} />}
    </div>
  );
}

const STEP_ACTION: Record<Exclude<NextStep, null>, string> = { return: "Xử lý", curate: "Chọn món", pack: "Đóng gói", ship: "Bàn giao", deliver: "Đã giao" };

// Bảng đơn dùng chung: máy tính là bảng gọn, điện thoại là thẻ. Mỗi dòng có tóm tắt hàng và nút việc tiếp theo.
function OrdersTable({
  rows,
  selectable = false,
  showStatus = false,
  showWaiting = false,
  onOpen,
  onQuick,
  busyId,
  checked,
  onToggle,
  onToggleMany,
}: {
  rows: OrderRow[];
  selectable?: boolean;
  showStatus?: boolean;
  showWaiting?: boolean;
  onOpen: (o: OrderRow) => void;
  onQuick: (o: OrderRow, step: NextStep) => void;
  busyId: string | null;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], on: boolean) => void;
}) {
  const ids = rows.map((o) => o.id);
  const allChecked = ids.length > 0 && ids.every((id) => checked.has(id));
  const money = (o: OrderRow) =>
    o.order_type === "subscription_cycle" ? "Trả trước" : `${formatVND(o.total_amount)}${o.payment_method === "cod" && o.payment_status !== "paid" ? " · COD" : ""}`;

  const action = (o: OrderRow) => {
    const step = nextStepOf(o);
    if (!step) return null;
    if (step === "curate") {
      return (
        <Link
          href={`/admin/box-curation?order=${o.order_code}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center h-9 px-3 rounded-box border border-pine-800/40 bg-white hover:bg-pine-50 text-pine-900 text-xs font-bold whitespace-nowrap"
        >
          {STEP_ACTION[step]}
        </Link>
      );
    }
    return (
      <button
        type="button"
        disabled={busyId === o.id}
        onClick={(e) => {
          e.stopPropagation();
          onQuick(o, step);
        }}
        className={`inline-flex items-center justify-center h-9 px-3 rounded-box text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-60 ${
          step === "pack" || step === "deliver" ? "bg-pine-900 hover:bg-pine-800 text-white" : "border border-pine-800/40 bg-white hover:bg-pine-50 text-pine-900"
        }`}
      >
        {busyId === o.id ? "Đang xử lý…" : STEP_ACTION[step]}
      </button>
    );
  };

  return (
    <>
      {/* Điện thoại và máy tính bảng: thẻ */}
      <ul className="lg:hidden space-y-2">
        {rows.map((o) => {
          const wait = waitingOf(o.created_at);
          return (
            <li key={o.id} className="p-3 rounded-container bg-surface-card border border-surface-border text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  {selectable && (
                    <input type="checkbox" checked={checked.has(o.id)} onChange={() => onToggle(o.id)} aria-label={`Chọn đơn ${o.order_code}`} className="w-4 h-4 accent-pine-900 shrink-0" />
                  )}
                  <button type="button" onClick={() => onOpen(o)} className="font-mono font-bold text-pine-950 underline-offset-2 hover:underline truncate">{o.order_code}</button>
                </span>
                {showStatus ? <StatusBadge order={o} /> : <span className={wait.tone}>Chờ {wait.label}</span>}
              </div>
              <button type="button" onClick={() => onOpen(o)} className="block w-full text-left space-y-0.5">
                <p className="font-bold text-pine-950">{o.recipient_name} <span className="font-normal text-bark-600">· {o.recipient_phone}{o.province_city ? ` · ${o.province_city}` : ""}</span></p>
                <p className="text-bark-700 line-clamp-2">{itemsSummary(o)}</p>
              </button>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-extrabold text-pine-950 tabular-nums">{money(o)}</span>
                {action(o)}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Máy tính: bảng gọn */}
      <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              {selectable && (
                <th className="pl-3 py-2.5 w-8">
                  <input type="checkbox" checked={allChecked} onChange={(e) => onToggleMany(ids, e.target.checked)} aria-label="Chọn tất cả đơn trong mục này" className="w-4 h-4 accent-pine-900 align-middle" />
                </th>
              )}
              <th className="px-3 py-2.5 w-[11.5rem]">Mã đơn</th>
              <th className="px-3 py-2.5 w-[13rem]">Người nhận</th>
              <th className="px-3 py-2.5">Hàng trong đơn</th>
              <th className="px-3 py-2.5 w-[7.5rem]">{showWaiting ? "Đã chờ" : "Ngày đặt"}</th>
              <th className="px-3 py-2.5 w-[8.5rem] text-right">Tổng tiền</th>
              {showStatus && <th className="px-3 py-2.5 w-[9rem]">Trạng thái</th>}
              <th className="px-3 py-2.5 w-[6.5rem]"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((o) => {
              const wait = waitingOf(o.created_at);
              return (
                <tr key={o.id} onClick={() => onOpen(o)} className={`hover:bg-surface-muted/60 transition-colors cursor-pointer ${checked.has(o.id) ? "bg-pine-50/60" : ""}`}>
                  {selectable && (
                    <td className="pl-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(o.id)} onChange={() => onToggle(o.id)} aria-label={`Chọn đơn ${o.order_code}`} className="w-4 h-4 accent-pine-900 align-middle" />
                    </td>
                  )}
                  <td className="px-3 py-2 align-top">
                    <div className="font-mono font-bold text-pine-950 whitespace-nowrap">{o.order_code}</div>
                    <div className="text-[11px] text-bark-600">{TYPE_LABEL[o.order_type]}{o.cycle_index ? ` · kỳ ${o.cycle_index}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-bold text-pine-950 truncate max-w-[12rem]">{o.recipient_name}</div>
                    <div className="text-[11px] text-bark-600 truncate max-w-[12rem]">{o.recipient_phone}{o.province_city ? ` · ${o.province_city}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 align-top text-bark-800">
                    <p className="line-clamp-2 leading-snug">{itemsSummary(o)}</p>
                    {o.customer_notes && <p className="text-[11px] text-honey-700 font-semibold truncate max-w-[26rem]">Ghi chú: {o.customer_notes}</p>}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {showWaiting ? <span className={wait.tone}>{wait.label}</span> : <span className="text-bark-600">{formatDateTime(o.created_at)}</span>}
                  </td>
                  <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                    <div className="font-extrabold text-pine-950 tabular-nums">{o.order_type === "subscription_cycle" ? "Trả trước" : formatVND(o.total_amount)}</div>
                    {o.order_type !== "subscription_cycle" && (
                      <div className={`text-[11px] ${o.payment_status === "paid" ? "text-grass-700" : o.payment_status === "refunded" ? "text-bark-500" : "text-amber-700"}`}>
                        {o.payment_method === "cod" && o.payment_status !== "paid" ? "Thu COD khi giao" : `${PAYMENT_METHOD_NAME[o.payment_method] || o.payment_method} · ${PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}`}
                      </div>
                    )}
                  </td>
                  {showStatus && <td className="px-3 py-2 align-top"><StatusBadge order={o} /></td>}
                  <td className="px-3 py-2 align-top text-right">
                    {action(o) || (
                      <span className="inline-flex items-center gap-0.5 h-9 font-semibold text-pine-900">
                        Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusBadge({ order }: { order: OrderRow }) {
  if (order.status === "da_xac_nhan" && hasPendingCuration(order)) {
    return <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-tag border text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-200">Chờ tuyển chọn</span>;
  }
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-tag border text-[11px] font-bold ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>;
}

function OrderDetail({
  order,
  onClose,
  onDone,
  onStale,
}: {
  order: OrderRow;
  onClose: () => void;
  onDone: (message: string, orderId: string) => Promise<void>;
  onStale: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"exchanged" | "refunded" | "rejected">("exchanged");
  const [returnNote, setReturnNote] = useState("");

  const isReceipt = RECEIPT_TYPES.includes(order.order_type);
  const isCycle = order.order_type === "subscription_cycle";
  const pendingCuration = hasPendingCuration(order);
  const paidOnline = order.payment_status === "paid" && order.payment_method !== "cod";
  const canCancel = !["da_huy", "da_giao", "doi_tra"].includes(order.status) && (!(isReceipt || isCycle) || order.status === "cho_thanh_toan");
  const address = useMemo(() => [order.shipping_address, order.ward, order.province_city].filter(Boolean).join(", "), [order]);

  const run = async (rpc: () => PromiseLike<{ error: { message: string } | null }>, success: string) => {
    setBusy(true);
    setError(null);
    const { error: err } = await rpc();
    setBusy(false);
    if (err) {
      const key = Object.keys(ACTION_ERROR).find((k) => err.message.includes(k));
      setError(key ? ACTION_ERROR[key] : "Không thực hiện được thao tác, vui lòng thử lại.");
      if (key === "ERR_INVALID_ORDER_STATUS") onStale();
      return;
    }
    setCancelReason(null);
    setReturnNote("");
    await onDone(success, order.id);
  };

  const supabase = createClient();
  const label = "text-[11px] font-bold text-bark-500 uppercase tracking-wide";

  return (
    <Modal open onClose={onClose} maxWidth="max-w-2xl" title={<span className="font-mono">{order.order_code}</span>}>
      <div className="space-y-5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge order={order} />
          <span className="text-bark-600">{TYPE_LABEL[order.order_type]}{order.cycle_index ? ` · kỳ ${order.cycle_index}` : ""}</span>
          {order.subscriptions && (
            <Link href={`/admin/subscriptions?q=${order.subscriptions.subscription_code}`} className="font-mono font-bold text-pine-900 hover:underline">
              {order.subscriptions.subscription_code}
            </Link>
          )}
          <span className="text-bark-500">· Đặt lúc {formatDateTime(order.created_at)}</span>
        </div>

        {error && <p role="alert" className="p-2.5 rounded-box bg-red-50 border border-red-200 text-red-700 font-semibold">{error}</p>}

        {isReceipt && (
          <p className="p-3 rounded-box bg-surface-muted text-bark-700 leading-relaxed">
            Đây là biên nhận thanh toán của gói định kỳ, không có hàng cần giao. Hộp của từng kỳ là một đơn &quot;Hộp theo gói&quot; riêng: hộp đầu được tạo ngay khi khách thanh toán, các hộp sau tạo vào ngày chốt của từng kỳ.
            Tạm dừng hoặc hủy gói ở trang <Link href="/admin/subscriptions" className="font-bold text-pine-900 underline">Gói định kỳ</Link>.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="space-y-1">
            <h4 className={label}>Người nhận</h4>
            <p className="font-bold text-pine-950">{order.recipient_name} · <a href={`tel:${order.recipient_phone}`} className="text-pine-900 hover:underline">{order.recipient_phone}</a></p>
            <p className="text-bark-700">{address}</p>
            {order.customer_notes && <p className="text-bark-600">Ghi chú: <span className="font-semibold text-bark-800">{order.customer_notes}</span></p>}
          </section>
          <section className="space-y-1">
            <h4 className={label}>Thanh toán</h4>
            {isCycle ? (
              <p className="text-bark-700">Đã trả trước theo gói</p>
            ) : (
              <>
                <p className="text-bark-700">
                  {PAYMENT_METHOD_NAME[order.payment_method] || order.payment_method} · <strong>{PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}</strong>
                  {order.paid_at ? ` lúc ${formatDateTime(order.paid_at)}` : ""}
                </p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-bark-700 max-w-xs">
                  <dt>Tạm tính</dt><dd className="text-right tabular-nums">{formatVND(order.subtotal)}</dd>
                  <dt>Phí vận chuyển</dt><dd className="text-right tabular-nums">{formatVND(order.shipping_fee)}</dd>
                  {order.discount_amount > 0 && (<><dt>Giảm giá</dt><dd className="text-right tabular-nums">−{formatVND(order.discount_amount)}</dd></>)}
                  <dt className="font-bold text-pine-950">Tổng cộng</dt><dd className="text-right font-extrabold text-pine-950 tabular-nums">{formatVND(order.total_amount)}</dd>
                </dl>
              </>
            )}
          </section>
        </div>

        <section className="space-y-1.5">
          <h4 className={label}>Sản phẩm</h4>
          <ul className="divide-y divide-surface-border rounded-box border border-surface-border">
            {order.order_items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 px-3 py-2">
                <span className="text-bark-800">
                  {it.quantity} × {it.product_name_snapshot}
                  {it.pets?.name && <span className="text-bark-500"> · bé {it.pets.name}</span>}
                </span>
                {!isCycle && <span className="font-bold tabular-nums shrink-0">{formatVND(it.total_price)}</span>}
              </li>
            ))}
          </ul>
        </section>

        {curationsOf(order).length > 0 && (
          <section className="space-y-1.5">
            <h4 className={label}>Món trong Mystery Box</h4>
            {curationsOf(order).map((c, idx) => {
              const boxLabel = [c.box_types?.name, c.pets?.name ? `bé ${c.pets.name}` : ""].filter(Boolean).join(" · ");
              return c.status === "pending_curation" ? (
                <p key={idx} className="p-2.5 rounded-box bg-amber-50 border border-amber-200 text-amber-900">
                  {boxLabel ? <strong>{boxLabel}: </strong> : null}chưa tuyển chọn món.{" "}
                  <Link href="/admin/box-curation" className="font-bold underline">Mở hàng chờ tuyển chọn</Link>
                </p>
              ) : c.status === "cancelled" ? (
                <p key={idx} className="text-bark-500">{boxLabel ? `${boxLabel}: ` : ""}hộp đã hủy theo đơn.</p>
              ) : (
                <div key={idx} className="p-2.5 rounded-box bg-surface-muted text-bark-800">
                  {boxLabel && <p className="font-bold text-pine-950 mb-1">{boxLabel}</p>}
                  <ul className="list-disc pl-4 space-y-0.5">
                    {c.box_curation_items.map((bi, j) => (
                      <li key={j}>{bi.quantity} × {bi.products?.name}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}

        {(order.tracking_code || order.admin_notes) && (
          <p className="text-bark-700">
            {order.tracking_code && <>Mã vận đơn: <strong className="font-mono">{order.tracking_code}</strong></>}
            {order.admin_notes && <span className="text-bark-500"> · {order.admin_notes}</span>}
          </p>
        )}
        {order.status === "da_huy" && order.cancellation_reason && (
          <p className="p-2.5 rounded-box bg-red-50 text-red-800">Lý do hủy: {order.cancellation_reason}</p>
        )}

        {(order.return_reason || order.return_resolution) && (
          <section className="space-y-1.5 p-3 rounded-box bg-honey-50 border border-honey-200">
            <h4 className="font-bold text-pine-950">
              Yêu cầu đổi / trả{order.return_requested_at ? ` · ${formatDateTime(order.return_requested_at)}` : ""}
            </h4>
            <p className="text-bark-800 whitespace-pre-line">{order.return_reason}</p>
            {order.return_resolution && (
              <p className="text-bark-700">
                Đã xử lý: <strong>{RETURN_RESOLUTION_LABEL[order.return_resolution]}</strong>
                {order.return_admin_note ? ` · ${order.return_admin_note}` : ""}
              </p>
            )}
          </section>
        )}

        {/* Thao tác theo trạng thái */}
        {!isReceipt && order.status === "da_xac_nhan" && (
          <section className="pt-4 border-t border-surface-border space-y-2">
            <h4 className="font-bold text-pine-950 text-sm">Bước tiếp theo</h4>
            {pendingCuration ? (
              <Link href="/admin/box-curation" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold">
                <PackageSearch className="w-4 h-4" /> Tuyển chọn món cho hộp
              </Link>
            ) : (
              <Button size="sm" loading={busy} onClick={() => run(() => supabase.rpc("start_order_preparation", { p_order_id: order.id }), "Đơn đã chuyển sang Đang chuẩn bị.")}>
                <PackageCheck className="w-4 h-4" /> Bắt đầu đóng gói
              </Button>
            )}
          </section>
        )}

        {order.status === "dang_chuan_bi" && (
          <section className="pt-4 border-t border-surface-border space-y-2">
            <h4 className="font-bold text-pine-950 text-sm">Bàn giao vận chuyển</h4>
            <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr_auto] gap-2">
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label="Đơn vị vận chuyển" className="h-10 px-3 rounded-box border border-surface-border bg-white">
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Mã vận đơn"
                aria-label="Mã vận đơn"
                className="h-10 px-3 rounded-box border border-surface-border font-mono"
              />
              <Button
                size="sm"
                loading={busy}
                disabled={!tracking.trim()}
                onClick={() =>
                  run(() => supabase.rpc("mark_order_shipping", { p_order_id: order.id, p_tracking_code: tracking.trim(), p_carrier: carrier }), "Đã bàn giao vận chuyển, khách nhận được thông báo.")
                }
              >
                <Truck className="w-4 h-4" /> Bàn giao
              </Button>
            </div>
          </section>
        )}

        {order.status === "dang_giao" && (
          <section className="pt-4 border-t border-surface-border space-y-2">
            <h4 className="font-bold text-pine-950 text-sm">Giao hàng</h4>
            {order.payment_method === "cod" && order.payment_status !== "paid" && (
              <p className="text-bark-600">Xác nhận đã giao cũng ghi nhận đã thu {formatVND(order.total_amount)} tiền mặt.</p>
            )}
            <Button size="sm" loading={busy} onClick={() => run(() => supabase.rpc("mark_order_delivered", { p_order_id: order.id }), "Đã ghi nhận giao thành công.")}>
              <CheckCircle2 className="w-4 h-4" /> Khách đã nhận hàng
            </Button>
          </section>
        )}

        {order.status === "doi_tra" && (
          <section className="pt-4 border-t border-surface-border space-y-2">
            <h4 className="font-bold text-pine-950 text-sm">Xử lý yêu cầu đổi / trả</h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RETURN_RESOLUTION_LABEL) as (keyof typeof RETURN_RESOLUTION_LABEL)[]).map((k) => (
                <label key={k} className={`flex items-center gap-1.5 h-9 px-3 rounded-box border cursor-pointer ${resolution === k ? "border-pine-900 bg-pine-50 font-bold" : "border-surface-border"}`}>
                  <input type="radio" name="return-resolution" className="accent-pine-900" checked={resolution === k} onChange={() => setResolution(k)} />
                  {RETURN_RESOLUTION_LABEL[k]}
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder={resolution === "rejected" ? "Lý do từ chối (bắt buộc, gửi cho khách)" : resolution === "refunded" ? "Ví dụ: Đã hoàn 45.000₫ qua chuyển khoản" : "Ví dụ: Gửi bù 1 hũ bánh quy trong 2 ngày tới"}
              aria-label="Ghi chú gửi khách"
              className="w-full px-3 py-2 rounded-box border border-surface-border"
            />
            <p className="text-[11px] text-bark-500">Ghi chú được gửi cho khách qua thông báo. Đơn trở về trạng thái Đã giao.</p>
            <Button
              size="sm"
              loading={busy}
              disabled={resolution === "rejected" && !returnNote.trim()}
              onClick={() => run(() => supabase.rpc("resolve_order_return", { p_order_id: order.id, p_resolution: resolution, p_note: returnNote.trim() }), "Đã xử lý yêu cầu đổi / trả.")}
            >
              Xác nhận xử lý
            </Button>
          </section>
        )}

        {canCancel && (
          <section className="pt-4 border-t border-surface-border">
            {cancelReason === null ? (
              <button type="button" onClick={() => setCancelReason("")} className="text-xs font-bold text-red-700 hover:underline">
                Hủy đơn này
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-box bg-red-50 border border-red-200">
                <label className="font-semibold text-red-800 block" htmlFor="cancel-reason">Lý do hủy (gửi cho khách)</label>
                <input
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Khách yêu cầu hủy qua hotline"
                  className="w-full h-10 px-3 rounded-box border border-red-200 bg-white"
                />
                <p className="text-[11px] text-red-800">
                  Hàng đã trừ kho (kể cả món đã đóng hộp) được hoàn lại kho.
                  {paidOnline && ` Đơn đã thanh toán qua ${PAYMENT_METHOD_NAME[order.payment_method]}: hoàn ${formatVND(order.total_amount)} cho khách, hệ thống ghi nhận Đã hoàn tiền.`}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" loading={busy} disabled={!cancelReason.trim()} onClick={() => run(() => supabase.rpc("cancel_order_by_staff", { p_order_id: order.id, p_reason: cancelReason.trim() }), "Đã hủy đơn.")}>
                    Xác nhận hủy đơn
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCancelReason(null)}>Không hủy</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
