"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Order, OrderStatus } from "@/mock/orders";
import { Package, Truck, Check, Eye, Search, Filter } from "lucide-react";

export default function AdminOrdersPage() {
  const { orders } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchCode, setSearchCode] = useState<string>("");
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus, label: string) => {
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              statusLabel: label,
              trackingCode: newStatus === 'dang_giao' ? 'GHN-99882211VN' : o.trackingCode,
              carrier: newStatus === 'dang_giao' ? 'Giao Hàng Nhanh' : o.carrier,
            }
          : o
      )
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              statusLabel: label,
              trackingCode: newStatus === 'dang_giao' ? 'GHN-99882211VN' : prev.trackingCode,
            }
          : null
      );
    }
  };

  const filteredOrders = localOrders.filter((o) => {
    const matchStatus = selectedStatus === "all" || o.status === selectedStatus;
    const matchSearch =
      !searchCode ||
      o.orderCode.toLowerCase().includes(searchCode.toLowerCase()) ||
      o.recipientName.toLowerCase().includes(searchCode.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Đơn hàng ({localOrders.length} đơn)
          </h1>
          <p className="text-xs text-bark-500">
            Xem danh sách, kiểm tra chi tiết, xác nhận đơn COD và cập nhật mã vận đơn giao hàng.
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc trạng thái */}
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
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-box border border-surface-border bg-white text-bark-800"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách đơn hàng */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
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
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-muted/60 transition-colors">
                <td className="p-3.5 font-mono font-bold text-pine-950">
                  {order.orderCode}
                </td>
                <td className="p-3.5">
                  <div className="font-bold text-pine-950">{order.recipientName}</div>
                  <div className="text-[11px] text-bark-500">{order.recipientPhone}</div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-tag bg-surface-muted font-bold text-[10px] text-bark-700">
                    {order.orderType === 'mystery_box' ? 'Mystery Box' : order.orderType === 'subscription_cycle' ? 'Gói định kỳ' : 'Mua lẻ'}
                  </span>
                </td>
                <td className="p-3.5 text-bark-600">{order.createdAt}</td>
                <td className="p-3.5">
                  <span className="font-semibold text-bark-800">{order.paymentMethod}</span>
                  <span className={`block text-[10px] ${order.paymentStatus === 'Đã thanh toán' ? 'text-grass-700' : 'text-amber-700'}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="p-3.5 font-extrabold text-pine-950 font-display">
                  {order.totalAmount === 0 ? "0₫ (Gói)" : formatVND(order.totalAmount)}
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-tag bg-pine-100 text-pine-900 font-bold text-[11px]">
                    {order.statusLabel}
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-1">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="p-1.5 rounded-box bg-surface-muted hover:bg-surface-border text-bark-700 font-semibold text-xs inline-flex items-center gap-1"
                    title="Xem chi tiết"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Xem chi tiết & Đổi trạng thái */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-pine-950">
                  Chi tiết đơn hàng {selectedOrder.orderCode}
                </h3>
                <p className="text-[11px] text-bark-500">Khách: {selectedOrder.recipientName} · {selectedOrder.recipientPhone}</p>
              </div>
              <span className="px-2.5 py-1 rounded-tag bg-pine-100 text-pine-900 font-bold">
                {selectedOrder.statusLabel}
              </span>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-pine-950">Địa chỉ giao:</div>
              <p className="text-bark-600 bg-surface-muted p-2 rounded-box">{selectedOrder.shippingAddress}</p>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-pine-950">Món trong đơn:</div>
              {selectedOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between p-2 rounded bg-surface-muted">
                  <span>{it.quantity}x {it.name} {it.petName ? `(Bé ${it.petName})` : ''}</span>
                  <span className="font-bold">{it.totalPrice === 0 ? "0₫" : formatVND(it.totalPrice)}</span>
                </div>
              ))}
            </div>

            {/* Thao tác đổi trạng thái nhanh */}
            <div className="pt-3 border-t border-surface-border space-y-2">
              <div className="font-bold text-pine-950">Cập nhật trạng thái đơn (Vận hành):</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'dang_chuan_bi', 'Đang chuẩn bị')}
                  className="px-3 py-1.5 rounded-box bg-pine-100 hover:bg-pine-200 text-pine-900 font-bold"
                >
                  Đang chuẩn bị đóng gói
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'dang_giao', 'Đang giao hàng')}
                  className="px-3 py-1.5 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" /> Bàn giao GHN (Đang giao)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'da_giao', 'Đã giao thành công')}
                  className="px-3 py-1.5 rounded-box bg-grass-700 hover:bg-grass-800 text-white font-bold"
                >
                  Đã giao thành công
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
