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

const STATUS_TABS: (OrderStatus | "all")[] = ["all", "cho_thanh_toan", "da_xac_nhan", "dang_chuan_bi", "dang_giao", "da_giao", "doi_tra", "da_huy"];
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

  const status = (STATUS_TABS as string[]).includes(searchParams.get("status") || "") ? (searchParams.get("status") as OrderStatus) : "all";
  const type = (TYPE_FILTERS.find((t) => t.id === searchParams.get("type"))?.id || "delivery") as TypeFilter;
  const q = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(q);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderRow | null>(null);

  useEffect(() => setSearchInput(q), [q]);

  const setParams = (next: Partial<{ status: string; type: string; q: string }>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || (k === "status" && v === "all") || (k === "type" && v === "delivery")) params.delete(k);
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
    let listQuery = supabase.from("orders").select(SELECT).order("created_at", { ascending: false }).limit(100);
    if (typeList) listQuery = listQuery.in("order_type", typeList);
    if (status !== "all") listQuery = listQuery.eq("status", status);
    if (search) listQuery = listQuery.or(`order_code.ilike.%${search}%,recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%`);

    const statuses = STATUS_TABS.filter((s) => s !== "all") as OrderStatus[];
    const [{ data }, ...countResults] = await Promise.all([listQuery, ...statuses.map((s) => base().eq("status", s))]);
    const counts: Record<string, number> = {};
    statuses.forEach((s, i) => (counts[s] = countResults[i].count || 0));
    counts.all = statuses.reduce((sum, s) => sum + counts[s], 0);
    setStatusCounts(counts);
    setOrders((data as unknown as OrderRow[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, search]);

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Đơn hàng</h1>
        <p className="text-xs text-bark-500">Xác nhận, đóng gói, bàn giao vận chuyển và xử lý đổi trả.</p>
      </div>

      <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
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
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Trạng thái đơn">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setParams({ status: s })}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                status === s ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-700 hover:bg-surface-muted"
              }`}
            >
              {s === "all" ? "Tất cả" : ORDER_STATUS_LABEL[s]}
              <span className={`text-[10px] font-extrabold ${status === s ? "text-pine-100" : "text-bark-500"}`}>{statusCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-bark-500">Đang tải đơn hàng…</div>
      ) : orders.length === 0 ? (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
          Không có đơn nào phù hợp bộ lọc.
        </div>
      ) : (
        <>
          {/* Điện thoại: danh sách thẻ */}
          <ul className="lg:hidden space-y-2.5">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className="w-full text-left p-3.5 rounded-container bg-surface-card border border-surface-border space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-pine-950">{o.order_code}</span>
                    <StatusBadge order={o} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-pine-950 truncate">{o.recipient_name}</p>
                      <p className="text-bark-500">{TYPE_LABEL[o.order_type]}{o.cycle_index ? ` · kỳ ${o.cycle_index}` : ""} · {formatDateTime(o.created_at)}</p>
                    </div>
                    <span className="font-extrabold text-pine-950 shrink-0">{o.order_type === "subscription_cycle" ? "Trả trước" : formatVND(o.total_amount)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Máy tính: bảng */}
          <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="p-3">Mã đơn</th>
                  <th className="p-3">Người nhận</th>
                  <th className="p-3">Loại</th>
                  <th className="p-3">Ngày đặt</th>
                  <th className="p-3">Thanh toán</th>
                  <th className="p-3 text-right">Tổng tiền</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3"><span className="sr-only">Chi tiết</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="hover:bg-surface-muted/60 transition-colors cursor-pointer">
                    <td className="p-3 font-mono font-bold text-pine-950">{o.order_code}</td>
                    <td className="p-3">
                      <div className="font-bold text-pine-950">{o.recipient_name}</div>
                      <div className="text-[11px] text-bark-500">{o.recipient_phone}</div>
                    </td>
                    <td className="p-3 text-bark-700">{TYPE_LABEL[o.order_type]}{o.cycle_index ? ` (kỳ ${o.cycle_index})` : ""}</td>
                    <td className="p-3 text-bark-600">{formatDateTime(o.created_at)}</td>
                    <td className="p-3">
                      <span className="font-semibold text-bark-800">{o.order_type === "subscription_cycle" ? "Theo gói" : PAYMENT_METHOD_NAME[o.payment_method] || o.payment_method}</span>
                      {o.order_type !== "subscription_cycle" && (
                        <span className={`block text-[10px] ${o.payment_status === "paid" ? "text-grass-700" : o.payment_status === "refunded" ? "text-bark-500" : "text-amber-700"}`}>
                          {PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-extrabold text-pine-950 tabular-nums">{o.order_type === "subscription_cycle" ? "–" : formatVND(o.total_amount)}</td>
                    <td className="p-3"><StatusBadge order={o} /></td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(o); }} className="inline-flex items-center gap-0.5 font-semibold text-pine-900 hover:underline">
                        Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 100 && <p className="text-center text-[11px] text-bark-500">Đang hiện 100 đơn mới nhất. Dùng ô tìm kiếm hoặc bộ lọc để tìm đơn cũ hơn.</p>}
        </>
      )}

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onDone={afterAction} onStale={load} />}
    </div>
  );
}

function StatusBadge({ order }: { order: OrderRow }) {
  if (order.status === "da_xac_nhan" && hasPendingCuration(order)) {
    return <span className="px-2 py-0.5 rounded-tag border text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-200">Chờ tuyển chọn</span>;
  }
  return <span className={`px-2 py-0.5 rounded-tag border text-[11px] font-bold ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>;
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
