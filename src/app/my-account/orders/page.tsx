"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, RotateCcw } from "lucide-react";
import { formatVND, formatDateTime } from "@/lib/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, ORDER_TYPE_LABEL, OrderStatus, cleanItemName, paymentText } from "@/lib/orderDisplay";
import { fetchMyOrders, MyOrder, orderLines } from "@/lib/myOrders";
import { fetchProducts } from "@/lib/catalog";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ui/Toast";
import { Button, ButtonLink } from "@/components/ui/Button";

const FILTERS: { id: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { id: "all", label: "Tất cả", match: () => true },
  { id: "cho_thanh_toan", label: "Chờ thanh toán", match: (s) => s === "cho_thanh_toan" },
  { id: "dang_xu_ly", label: "Đang xử lý", match: (s) => s === "da_xac_nhan" || s === "dang_chuan_bi" },
  { id: "dang_giao", label: "Đang giao", match: (s) => s === "dang_giao" },
  { id: "da_giao", label: "Đã giao", match: (s) => s === "da_giao" },
  { id: "doi_tra", label: "Đổi / Trả", match: (s) => s === "doi_tra" },
  { id: "da_huy", label: "Đã hủy", match: (s) => s === "da_huy" },
];

export default function MyOrdersPage() {
  const router = useRouter();
  const { addToCart } = useApp();
  const { show } = useToast();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const current = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const visible = orders.filter((o) => current.match(o.status));

  // Mua lại đơn hàng lẻ: thêm lại các sản phẩm còn bán, giá theo hiện tại
  const reorder = async (order: MyOrder) => {
    setReordering(order.id);
    const products = await fetchProducts();
    let added = 0;
    for (const item of order.order_items) {
      const product = products.find((p) => p.id === item.product_id);
      if (!product || product.stock <= 0) continue;
      await addToCart({ type: "retail", productId: product.id, product, quantity: Math.min(item.quantity, product.stock), unitPrice: product.price });
      added++;
    }
    setReordering(null);
    if (added === 0) {
      show("Các sản phẩm trong đơn này hiện đã hết hàng.", { tone: "error" });
      return;
    }
    show(`Đã thêm ${added} sản phẩm vào giỏ`, { actions: [{ label: "Xem giỏ", onClick: () => router.push("/cart") }] });
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-container bg-surface-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => {
          const count = orders.filter((o) => f.match(o.status)).length;
          if (f.id !== "all" && count === 0) return null;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`min-h-10 px-3 rounded-box text-xs font-bold whitespace-nowrap border transition-colors ${
                active ? "bg-pine-900 text-white border-pine-900" : "bg-surface-card text-bark-700 border-surface-border hover:bg-surface-muted"
              }`}
            >
              {f.label} <span className={active ? "text-pine-200" : "text-bark-500"}>({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="p-10 text-center rounded-container bg-surface-card border border-surface-border space-y-3">
          <p className="text-sm text-bark-600">{orders.length === 0 ? "Bạn chưa có đơn hàng nào." : "Không có đơn nào ở mục này."}</p>
          {orders.length === 0 && <ButtonLink href="/boxes">Chọn hộp cho bé</ButtonLink>}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((order) => {
          const lines = orderLines(order);
          const canReorder = order.order_type === "retail" && order.status === "da_giao";
          return (
            <div key={order.id} className="rounded-container bg-surface-card border border-surface-border shadow-xs hover:border-pine-800/60 transition-colors">
              <Link href={`/my-account/orders/${order.id}`} className="block p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-pine-950 text-sm">{order.order_code}</span>
                      <span className="text-xs text-bark-500">{ORDER_TYPE_LABEL[order.order_type] || ""}</span>
                    </div>
                    <p className="text-xs text-bark-500">{formatDateTime(order.created_at)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-tag border text-xs font-bold ${ORDER_STATUS_STYLE[order.status]}`}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </div>

                <div className="space-y-2">
                  {lines.slice(0, 3).map((line) => (
                    <div key={line.key} className="flex items-center gap-3 text-xs">
                      <div className="relative w-12 h-12 rounded-box overflow-hidden bg-surface-muted shrink-0">
                        <Image src={line.thumb} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-pine-950 truncate">{cleanItemName(line.name)}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {line.petName && <span className="px-2 py-0.5 rounded-tag bg-pine-50 text-pine-900 text-[11px] font-semibold">Bé {line.petName}</span>}
                          <span className="text-bark-500">x{line.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lines.length > 3 && <p className="text-xs text-bark-500">và {lines.length - 3} sản phẩm khác</p>}
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2 text-xs">
                  <span className="text-bark-500">{paymentText(order.payment_method, order.payment_status, order.order_type)}</span>
                  <span className="flex items-center gap-1 font-extrabold text-pine-950 text-sm">
                    {order.order_type === "subscription_cycle" ? "Đã trả theo gói" : formatVND(order.total_amount)}
                    <ChevronRight className="w-4 h-4 text-bark-400" />
                  </span>
                </div>
              </Link>
              {canReorder && (
                <div className="px-4 sm:px-5 pb-4 -mt-1 flex justify-end">
                  <Button variant="secondary" size="sm" loading={reordering === order.id} onClick={() => reorder(order)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Mua lại
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
