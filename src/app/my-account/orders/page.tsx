"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Order, OrderStatus } from "@/mock/orders";
import { Package, Truck, CheckCircle2, Clock, Star, RefreshCw, AlertCircle, PackageOpen, UtensilsCrossed, Heart } from "lucide-react";

export default function MyOrdersPage() {
  const { orders } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState("Món chứa thành phần dị ứng");
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  const filterTabs = [
    { id: "all", label: "Tất cả đơn" },
    { id: "dang_giao", label: "Đang giao" },
    { id: "da_giao", label: "Đã giao" },
    { id: "dang_chuan_bi", label: "Đang chuẩn bị" },
  ];

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "all") return true;
    return o.status === activeFilter;
  });

  const getStatusBadge = (status: OrderStatus, label: string) => {
    switch (status) {
      case 'da_giao':
        return <span className="px-2 py-0.5 rounded-tag bg-grass-100 text-grass-700 font-bold text-[11px]">{label}</span>;
      case 'dang_giao':
        return <span className="px-2 py-0.5 rounded-tag bg-honey-100 text-honey-800 font-bold text-[11px]">{label}</span>;
      case 'dang_chuan_bi':
        return <span className="px-2 py-0.5 rounded-tag bg-pine-100 text-pine-800 font-bold text-[11px]">{label}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-bold text-[11px]">{label}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs lọc đơn hàng */}
      <div className="flex gap-2 pb-1 border-b border-surface-border overflow-x-auto no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-box text-xs font-bold transition-colors whitespace-nowrap ${
              activeFilter === tab.id
                ? "bg-pine-900 text-white"
                : "bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách các đơn hàng */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs"
          >
            {/* Header đơn */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-pine-950 text-sm">{order.orderCode}</span>
                  {order.subscriptionLabel && (
                    <span className="px-2 py-0.2 rounded-tag bg-honey-100 text-honey-700 text-[10px] font-extrabold border border-honey-300">
                      {order.subscriptionLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-bark-500">Đặt lúc: {order.createdAt}</p>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(order.status, order.statusLabel)}
              </div>
            </div>

            {/* Danh sách items */}
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-surface-muted flex items-center justify-center">
                      {item.type === 'box' ? (
                        <PackageOpen className="w-3.5 h-3.5 text-pine-900" />
                      ) : (
                        <UtensilsCrossed className="w-3.5 h-3.5 text-bark-700" />
                      )}
                    </span>
                    <div>
                      <span className="font-bold text-pine-950">{item.name}</span>
                      {item.petName && (
                        <span className="text-[11px] text-honey-700 ml-1.5 font-semibold">
                          (Bé {item.petName})
                        </span>
                      )}
                      <span className="text-bark-500 ml-2">x{item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-bark-900">
                    {item.totalPrice === 0 ? "Đã trả theo gói" : formatVND(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Tracking Timeline */}
            <div className="pt-3 border-t border-surface-border bg-surface-muted/50 p-3.5 rounded-box space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-pine-950">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-pine-800" />
                  <span>Tiến độ giao hàng:</span>
                </span>
                {order.trackingCode && (
                  <span className="font-mono text-[11px] text-bark-600">
                    Mã vận đơn: <strong>{order.trackingCode}</strong> ({order.carrier})
                  </span>
                )}
              </div>

              <div className="space-y-2 pl-2 border-l-2 border-pine-800/30">
                {order.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-3 text-xs">
                    <span
                      className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full ${
                        event.completed ? "bg-grass-600" : "bg-bark-300"
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`font-bold ${event.completed ? "text-pine-950" : "text-bark-500"}`}>
                        {event.title}
                      </span>
                      <span className="text-[10px] text-bark-400">{event.time}</span>
                    </div>
                    <p className="text-[11px] text-bark-600 mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer đơn: Tổng tiền & Nút đánh giá / Đổi trả */}
            <div className="pt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-bark-500">Tổng thanh toán: </span>
                <strong className="text-sm font-extrabold text-pine-950 font-display">
                  {order.totalAmount === 0 ? "0₫ (Đã thanh toán trước)" : formatVND(order.totalAmount)}
                </strong>
                <span className="text-bark-500 ml-2">({order.paymentMethod} - {order.paymentStatus})</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Chỉ cho phép review khi đơn đã giao thành công */}
                {order.status === 'da_giao' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setReviewOrder(order)}
                      className="px-3 py-1.5 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Star className="w-3 h-3 text-butter-200 fill-butter-200" />
                      <span>Đánh giá unbox (Nhận voucher 20k)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnOrder(order)}
                      className="px-3 py-1.5 rounded-box bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border font-semibold text-xs transition-colors"
                    >
                      <span>Yêu cầu đổi / trả</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Review Unbox */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border">
            <h3 className="text-base font-bold text-pine-950">
              Đánh giá đơn hàng {reviewOrder.orderCode}
            </h3>

            {reviewSubmitted ? (
              <div className="p-4 rounded-box bg-grass-50 border border-grass-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-grass-600 mx-auto" />
                <p className="text-xs font-bold text-grass-800">
                  Cảm ơn bạn! Đánh giá đã được gửi. Bạn nhận được 1 mã voucher giảm 20.000₫ cho đơn tiếp theo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReviewOrder(null);
                    setReviewSubmitted(false);
                  }}
                  className="px-4 py-1.5 rounded-box bg-grass-700 text-white text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Đánh giá chung:</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 text-honey-500"
                      >
                        <Star className={`w-6 h-6 ${s <= rating ? "fill-honey-500" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-bark-800 block mb-1">
                    Cảm nhận của bé và bạn khi mở hộp:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Bé thích món nào nhất? Có món nào bé không ưng không?..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2.5 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-box bg-surface-muted border border-surface-border text-[11px] text-bark-600 space-y-1">
                  <div className="font-bold text-pine-950">Chấm điểm từng món trong hộp:</div>
                  <div className="flex items-center justify-between py-1">
                    <span>Pate cá hồi Na Uy:</span>
                    <span className="text-grass-700 font-bold inline-flex items-center gap-1">
                      <Heart className="w-3 h-3 text-grass-700 fill-grass-700" />
                      <span>Bé rất thích</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Cá nhồi cỏ catnip:</span>
                    <span className="text-grass-700 font-bold inline-flex items-center gap-1">
                      <Heart className="w-3 h-3 text-grass-700 fill-grass-700" />
                      <span>Bé rất thích</span>
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => setReviewOrder(null)}
                    className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewSubmitted(true)}
                    className="px-5 py-2 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold"
                  >
                    Gửi đánh giá
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Yêu Cầu Đổi Trả (Mục 10 SPEC) */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border">
            <h3 className="text-base font-bold text-pine-950">
              Yêu cầu đổi / trả cho đơn {returnOrder.orderCode}
            </h3>

            {returnSubmitted ? (
              <div className="p-4 rounded-box bg-pine-50 border border-pine-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-pine-700 mx-auto" />
                <p className="text-xs font-bold text-pine-900">
                  Yêu cầu đã được chuyển tới bộ phận CSKH FPETS. Chúng tôi sẽ liên hệ trong vòng 24h để gửi bù món mới miễn phí cho bạn!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReturnOrder(null);
                    setReturnSubmitted(false);
                  }}
                  className="px-4 py-1.5 rounded-box bg-pine-900 text-white text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Lý do yêu cầu đổi trả: *</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full p-2.5 rounded-box border border-surface-border bg-white"
                  >
                    <option value="Món chứa thành phần dị ứng đã khai báo">Món chứa thành phần dị ứng đã khai trong Pet Profile</option>
                    <option value="Hàng hỏng, vỡ, hết hạn sử dụng">Hàng hỏng, vỡ, hết hạn sử dụng</option>
                    <option value="Giao thiếu món">Giao thiếu món so với cam kết</option>
                  </select>
                </div>

                <div className="p-2.5 rounded-box bg-honey-50 border border-honey-200 text-[11px] text-honey-900 leading-relaxed">
                  Chính sách FPETS: Mystery Box đổi món miễn phí nếu lỗi thuộc về shop khi bạn báo trong vòng 3 ngày sau khi nhận hàng.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => setReturnOrder(null)}
                    className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnSubmitted(true)}
                    className="px-5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold"
                  >
                    Gửi yêu cầu CSKH
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
