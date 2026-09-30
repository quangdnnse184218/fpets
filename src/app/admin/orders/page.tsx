"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDate, formatDateTime } from "@/lib/formatters";
import { RETURN_RESOLUTION_LABEL } from "@/lib/orderDisplay";
import { Truck, Eye, Search, CheckCircle2 } from "lucide-react";

const ACTION_ERROR: Record<string, string> = {
  ERR_INVALID_ORDER_STATUS: "Trạng thái đơn đã thay đổi, vui lòng tải lại trang.",
  ERR_FORBIDDEN: "Tài khoản không có quyền thực hiện thao tác này.",
  ERR_NOTE_REQUIRED: "Vui lòng nhập lý do từ chối để gửi cho khách.",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = { paid: "Đã thanh toán", pending: "Chưa thanh toán", refunded: "Đã hoàn tiền", failed: "Thanh toán lỗi" };

type OrderStatus = "cho_thanh_toan" | "da_xac_nhan" | "dang_chuan_bi" | "dang_giao" | "da_giao" | "da_huy" | "doi_tra";

const STATUS_LABEL: Record<OrderStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  da_xac_nhan: "Đã xác nhận",
  dang_chuan_bi: "Đang chuẩn bị",
  dang_giao: "Đang giao",
  da_giao: "Đã giao",
  da_huy: "Đã hủy",
  doi_tra: "Đổi / Trả",
};

interface OrderRow {
  id: string;
  order_code: string;
  order_type: string;
  cycle_index: number | null;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  ward: string | null;
  province_city: string | null;
  customer_notes: string | null;
  return_reason: string | null;
  return_requested_at: string | null;
  return_resolution: "exchanged" | "refunded" | "rejected" | null;
  return_admin_note: string | null;
  tracking_code: string | null;
  created_at: string;
  order_items: { id: string; product_name_snapshot: string; quantity: number; total_price: number; pets: { name: string } | null }[];
  // order_id là unique nên API trả về 1 object (hoặc null), không phải mảng
  box_curations: BoxCurationEmbed | BoxCurationEmbed[] | null;
}

type BoxCurationEmbed = { status: string; box_curation_items: { quantity: number; products: { name: string } | null }[] };
const curationsOf = (o: OrderRow): BoxCurationEmbed[] => (o.box_curations ? ([] as BoxCurationEmbed[]).concat(o.box_curations) : []);

// Đơn "Thanh toán/Gia hạn gói" chỉ là biên nhận tiền; hộp thực tế giao theo đơn "Giao hộp gói"
const ORDER_TYPE_LABEL: Record<string, string> = {
  retail: "Mua lẻ",
  mystery_box: "Mystery Box",
  subscription_initial: "Thanh toán gói",
  subscription_renewal: "Gia hạn gói",
  subscription_cycle: "Giao hộp gói",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchCode, setSearchCode] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [returnResolution, setReturnResolution] = useState<"exchanged" | "refunded" | "rejected">("exchanged");
  const [returnNote, setReturnNote] = useState("");

  const statuses: { id: string; label: string }[] = [
    { id: "all", label: "Tất cả đơn" },
    { id: "cho_thanh_toan", label: "Chờ thanh toán" },
    { id: "da_xac_nhan", label: "Đã xác nhận" },
    { id: "dang_chuan_bi", label: "Đang chuẩn bị" },
    { id: "dang_giao", label: "Đang giao" },
    { id: "da_giao", label: "Đã giao" },
    { id: "da_huy", label: "Đã hủy" },
    { id: "doi_tra", label: "Đổi / Trả" },
  ];

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_code, order_type, cycle_index, status, payment_method, payment_status, total_amount, recipient_name, recipient_phone, shipping_address, ward, province_city, customer_notes, return_reason, return_requested_at, return_resolution, return_admin_note, tracking_code, created_at, order_items(id, product_name_snapshot, quantity, total_price, pets(name)), box_curations(status, box_curation_items(quantity, products(name)))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setOrders(data as unknown as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((o) => {
    const matchStatus = selectedStatus === "all" || o.status === selectedStatus;
    const matchSearch =
      !searchCode ||
      o.order_code.toLowerCase().includes(searchCode.toLowerCase()) ||
      o.recipient_name.toLowerCase().includes(searchCode.toLowerCase());
    return matchStatus && matchSearch;
  });

  const runAction = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    setActionError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      const key = Object.keys(ACTION_ERROR).find((k) => error.message.includes(k));
      setActionError(key ? ACTION_ERROR[key] : `Không thực hiện được: ${error.message}`);
      return false;
    }
    await loadOrders();
    return true;
  };

  const handleConfirmCod = async () => {
    if (!selectedOrder) return;
    const supabase = createClient();
    const ok = await runAction(() => supabase.rpc("confirm_cod_order", { p_order_id: selectedOrder.id }));
    if (ok) closeDetail();
  };

  const handleMarkShipping = async () => {
    if (!selectedOrder || !trackingInput.trim()) return;
    const supabase = createClient();
    const ok = await runAction(() => supabase.rpc("mark_order_shipping", { p_order_id: selectedOrder.id, p_tracking_code: trackingInput.trim() }));
    if (ok) closeDetail();
  };

  const handleMarkDelivered = async () => {
    if (!selectedOrder) return;
    const supabase = createClient();
    const ok = await runAction(() => supabase.rpc("mark_order_delivered", { p_order_id: selectedOrder.id }));
    if (ok) closeDetail();
  };

  // Lý do hủy được gửi kèm thông báo cho khách, nên bắt buộc nhập
  const handleCancel = async () => {
    if (!selectedOrder || !cancelReason?.trim()) return;
    const supabase = createClient();
    const ok = await runAction(() => supabase.rpc("cancel_order_by_staff", { p_order_id: selectedOrder.id, p_reason: cancelReason.trim() }));
    if (ok) closeDetail();
  };

  const handleResolveReturn = async () => {
    if (!selectedOrder) return;
    const supabase = createClient();
    const ok = await runAction(() =>
      supabase.rpc("resolve_order_return", { p_order_id: selectedOrder.id, p_resolution: returnResolution, p_note: returnNote.trim() })
    );
    if (ok) closeDetail();
  };

  const closeDetail = () => {
    setSelectedOrder(null);
    setCancelReason(null);
    setReturnNote("");
    setReturnResolution("exchanged");
    setActionError(null);
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-bark-500">Đang tải đơn hàng...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Đơn hàng ({orders.length} đơn)
          </h1>
          <p className="text-xs text-bark-500">
            Xem danh sách, kiểm tra chi tiết, xác nhận đơn COD và cập nhật mã vận đơn giao hàng.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên khách..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-xs font-bold text-bark-500 whitespace-nowrap">Trạng thái:</span>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-box border border-surface-border bg-white text-bark-800">
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Mã đơn</th>
              <th className="p-3.5">Khách hàng</th>
              <th className="p-3.5">Loại đơn</th>
              <th className="p-3.5">Ngày đặt</th>
              <th className="p-3.5">Thanh toán</th>
              <th className="p-3.5">Tổng tiền</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-xs text-bark-500">Chưa có đơn hàng nào phù hợp.</td>
              </tr>
            )}
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-muted/60 transition-colors">
                <td className="p-3.5 font-mono font-bold text-pine-950">{order.order_code}</td>
                <td className="p-3.5">
                  <div className="font-bold text-pine-950">{order.recipient_name}</div>
                  <div className="text-[11px] text-bark-500">{order.recipient_phone}</div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-tag bg-surface-muted font-bold text-[10px] text-bark-700">
                    {ORDER_TYPE_LABEL[order.order_type] || "Mua lẻ"}{order.order_type === "subscription_cycle" && order.cycle_index ? ` (kỳ ${order.cycle_index})` : ""}
                  </span>
                </td>
                <td className="p-3.5 text-bark-600">{formatDate(order.created_at)}</td>
                <td className="p-3.5">
                  <span className="font-semibold text-bark-800 uppercase">{order.payment_method}</span>
                  <span className={`block text-[10px] ${order.payment_status === "paid" ? "text-grass-700" : "text-amber-700"}`}>
                    {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                  </span>
                </td>
                <td className="p-3.5 font-extrabold text-pine-950 font-display">
                  {order.total_amount === 0 ? "0₫ (Gói)" : formatVND(order.total_amount)}
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-tag bg-pine-100 text-pine-900 font-bold text-[11px]">
                    {STATUS_LABEL[order.status]}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <button type="button" onClick={() => { setSelectedOrder(order); setTrackingInput(""); setActionError(null); }}
                    className="p-1.5 rounded-box bg-surface-muted hover:bg-surface-border text-bark-700 font-semibold text-xs inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-container p-4 sm:p-6 space-y-4 shadow-xl border border-surface-border text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-pine-950">Chi tiết đơn hàng {selectedOrder.order_code}</h3>
                <p className="text-[11px] text-bark-500">Khách: {selectedOrder.recipient_name} · {selectedOrder.recipient_phone}</p>
              </div>
              <span className="px-2.5 py-1 rounded-tag bg-pine-100 text-pine-900 font-bold">{STATUS_LABEL[selectedOrder.status]}</span>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-box bg-red-50 border border-red-200 text-red-700 font-semibold">{actionError}</div>
            )}

            <div className="space-y-2">
              <div className="font-bold text-pine-950">Địa chỉ giao:</div>
              <p className="text-bark-600 bg-surface-muted p-2 rounded-box">
                {[selectedOrder.shipping_address, selectedOrder.ward, selectedOrder.province_city].filter(Boolean).join(", ")}
              </p>
              {selectedOrder.customer_notes && (
                <p className="text-bark-600">Ghi chú của khách: <span className="font-semibold text-bark-800">{selectedOrder.customer_notes}</span></p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-pine-950">Món trong đơn:</div>
              {selectedOrder.order_items.map((it) => (
                <div key={it.id} className="flex justify-between p-2 rounded bg-surface-muted">
                  <span>{it.quantity}x {it.product_name_snapshot} {it.pets?.name ? `(Bé ${it.pets.name})` : ""}</span>
                  <span className="font-bold">{it.total_price === 0 ? "0₫" : formatVND(it.total_price)}</span>
                </div>
              ))}
            </div>

            {/* Danh sách món đã tuyển chọn để nhân viên kho đóng hộp */}
            {curationsOf(selectedOrder).length > 0 && (
              <div className="space-y-1.5">
                <div className="font-bold text-pine-950">Món trong Mystery Box:</div>
                {curationsOf(selectedOrder).map((c, idx) =>
                  c.status === "pending_curation" ? (
                    <p key={idx} className="p-2 rounded bg-amber-50 text-amber-800">Hộp chưa được tuyển chọn. Vào Hàng chờ tuyển chọn để chọn món.</p>
                  ) : (
                    <ul key={idx} className="p-2 rounded bg-surface-muted list-disc pl-6 space-y-0.5">
                      {c.box_curation_items.map((bi, j) => (
                        <li key={j}>{bi.quantity}x {bi.products?.name}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )}

            {(selectedOrder.return_reason || selectedOrder.return_resolution) && (
              <div className="space-y-1.5 p-3 rounded-box bg-honey-50 border border-honey-200">
                <div className="font-bold text-pine-950">
                  Yêu cầu đổi / trả{selectedOrder.return_requested_at ? ` · ${formatDateTime(selectedOrder.return_requested_at)}` : ""}
                </div>
                <p className="text-bark-800">{selectedOrder.return_reason}</p>
                {selectedOrder.return_resolution && (
                  <p className="text-bark-700">
                    Đã xử lý: <strong>{RETURN_RESOLUTION_LABEL[selectedOrder.return_resolution]}</strong>
                    {selectedOrder.return_admin_note ? ` · ${selectedOrder.return_admin_note}` : ""}
                  </p>
                )}
              </div>
            )}

            {selectedOrder.status === "doi_tra" && (
              <div className="space-y-2 pt-3 border-t border-surface-border">
                <div className="font-bold text-pine-950">Xử lý yêu cầu đổi / trả:</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(RETURN_RESOLUTION_LABEL) as (keyof typeof RETURN_RESOLUTION_LABEL)[]).map((k) => (
                    <label key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-box border cursor-pointer ${returnResolution === k ? "border-pine-900 bg-pine-50 font-bold" : "border-surface-border"}`}>
                      <input type="radio" name="return-resolution" className="accent-pine-900" checked={returnResolution === k} onChange={() => setReturnResolution(k)} />
                      {RETURN_RESOLUTION_LABEL[k]}
                    </label>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder={returnResolution === "rejected" ? "Lý do từ chối (bắt buộc, gửi cho khách)" : returnResolution === "refunded" ? "Ví dụ: Đã hoàn 45.000₫ qua chuyển khoản" : "Ví dụ: Gửi bù 1 hũ bánh quy trong 2 ngày tới"}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs"
                />
                <p className="text-[11px] text-bark-500">Ghi chú được gửi cho khách qua thông báo. Đơn trở về trạng thái Đã giao.</p>
                <button type="button" disabled={busy || (returnResolution === "rejected" && !returnNote.trim())} onClick={handleResolveReturn}
                  className="px-3 py-1.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold disabled:opacity-60">
                  Xác nhận xử lý
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-surface-border space-y-2">
              <div className="font-bold text-pine-950">Thao tác vận hành:</div>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.payment_method === "cod" && selectedOrder.status === "cho_thanh_toan" && (
                  <button type="button" disabled={busy} onClick={handleConfirmCod}
                    className="px-3 py-1.5 rounded-box bg-grass-700 hover:bg-grass-800 text-white font-bold flex items-center gap-1 disabled:opacity-60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận đơn COD
                  </button>
                )}
                {selectedOrder.status === "dang_chuan_bi" && (
                  <div className="w-full flex items-center gap-2">
                    <input type="text" value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Nhập mã vận đơn (VD: GHN-123456)"
                      className="flex-1 px-3 py-2 rounded-box border border-surface-border text-xs" />
                    <button type="button" disabled={busy || !trackingInput.trim()} onClick={handleMarkShipping}
                      className="px-3 py-1.5 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold flex items-center gap-1 disabled:opacity-60">
                      <Truck className="w-3.5 h-3.5" /> Bàn giao vận chuyển
                    </button>
                  </div>
                )}
                {selectedOrder.status === "dang_giao" && (
                  <button type="button" disabled={busy} onClick={handleMarkDelivered}
                    className="px-3 py-1.5 rounded-box bg-grass-700 hover:bg-grass-800 text-white font-bold disabled:opacity-60">
                    Đã giao thành công
                  </button>
                )}
                {!["da_huy", "da_giao", "doi_tra"].includes(selectedOrder.status) && cancelReason === null && (
                  <button type="button" disabled={busy} onClick={() => setCancelReason("")}
                    className="px-3 py-1.5 rounded-box bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold disabled:opacity-60">
                    Hủy đơn
                  </button>
                )}
                {cancelReason !== null && (
                  <div className="w-full space-y-2 p-3 rounded-box bg-red-50 border border-red-200">
                    <label className="font-semibold text-red-800 block" htmlFor="cancel-reason">Lý do hủy (gửi cho khách; tồn kho được hoàn lại nếu đã trừ)</label>
                    <input id="cancel-reason" type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Ví dụ: Khách yêu cầu hủy qua hotline"
                      className="w-full px-3 py-2 rounded-box border border-red-200 bg-white text-xs" />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy || !cancelReason.trim()} onClick={handleCancel}
                        className="px-3 py-1.5 rounded-box bg-red-700 hover:bg-red-800 text-white font-bold disabled:opacity-60">
                        Xác nhận hủy đơn
                      </button>
                      <button type="button" onClick={() => setCancelReason(null)} className="px-3 py-1.5 rounded-box border border-surface-border bg-white font-semibold">
                        Không hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-border">
              <button type="button" onClick={closeDetail} className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
