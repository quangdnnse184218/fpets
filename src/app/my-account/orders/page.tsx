"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDateTime } from "@/lib/formatters";
import { Truck, CheckCircle2, Star, PackageOpen, UtensilsCrossed, Heart, ThumbsDown, Minus } from "lucide-react";

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

interface OrderItemRow {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  total_price: number;
  box_type_id: string | null;
  pets: { name: string } | null;
}

interface OrderRow {
  id: string;
  order_code: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  cycle_index: number | null;
  tracking_code: string | null;
  created_at: string;
  order_items: OrderItemRow[];
}

interface CurationFeedbackItem {
  product_id: string;
  name: string;
  rating: "like" | "neutral" | "dislike" | null;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [reviewOrder, setReviewOrder] = useState<OrderRow | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [curationItems, setCurationItems] = useState<CurationFeedbackItem[]>([]);
  const [petIdForFeedback, setPetIdForFeedback] = useState<string | null>(null);

  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [returnReason, setReturnReason] = useState("Món chứa thành phần dị ứng đã khai báo");
  const [returnSubmitted, setReturnSubmitted] = useState(false);
  const [returnErr, setReturnErr] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_code, status, payment_method, payment_status, total_amount, cycle_index, tracking_code, created_at, order_items(id, product_name_snapshot, quantity, total_price, box_type_id, pets(name))")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setOrders(data as unknown as OrderRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filterTabs = [
    { id: "all", label: "Tất cả đơn" },
    { id: "dang_giao", label: "Đang giao" },
    { id: "da_giao", label: "Đã giao" },
    { id: "dang_chuan_bi", label: "Đang chuẩn bị" },
  ];

  const filteredOrders = orders.filter((o) => activeFilter === "all" || o.status === activeFilter);

  const getStatusBadge = (status: OrderStatus) => {
    const label = STATUS_LABEL[status];
    const styles: Record<OrderStatus, string> = {
      da_giao: "bg-grass-100 text-grass-700",
      dang_giao: "bg-honey-100 text-honey-800",
      dang_chuan_bi: "bg-pine-100 text-pine-800",
      da_xac_nhan: "bg-surface-muted text-bark-700",
      cho_thanh_toan: "bg-surface-muted text-bark-700",
      da_huy: "bg-red-100 text-red-700",
      doi_tra: "bg-honey-100 text-honey-800",
    };
    return <span className={`px-2 py-0.5 rounded-tag font-bold text-[11px] ${styles[status]}`}>{label}</span>;
  };

  const openReview = async (order: OrderRow) => {
    setReviewOrder(order);
    setReviewSubmitted(false);
    setRating(5);
    setComment("");
    setCurationItems([]);
    setPetIdForFeedback(null);

    const boxLine = order.order_items.find((i) => i.box_type_id);
    if (!boxLine) return;

    const supabase = createClient();
    const { data: curation } = await supabase
      .from("box_curations")
      .select("id, pet_id, box_curation_items(product_id, products(name))")
      .eq("order_id", order.id)
      .maybeSingle();

    if (curation) {
      setPetIdForFeedback(curation.pet_id);
      const items = (curation.box_curation_items as unknown as { product_id: string; products: { name: string } | null }[]) || [];
      setCurationItems(items.map((i) => ({ product_id: i.product_id, name: i.products?.name || "Sản phẩm", rating: null })));
    }
  };

  const setItemRating = (productId: string, rating: "like" | "neutral" | "dislike") => {
    setCurationItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, rating } : i)));
  };

  const submitReview = async () => {
    if (!reviewOrder) return;
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { error } = await supabase.from("reviews").insert({
      order_id: reviewOrder.id,
      user_id: authData.user.id,
      rating,
      comment: comment || null,
    });
    if (error) return;

    if (petIdForFeedback) {
      const rows = curationItems
        .filter((i): i is CurationFeedbackItem & { rating: "like" | "neutral" | "dislike" } => i.rating !== null)
        .map((i) => ({ pet_id: petIdForFeedback as string, product_id: i.product_id, rating: i.rating }));
      if (rows.length > 0) {
        await supabase.from("pet_item_feedback").insert(rows);
      }
    }
    setReviewSubmitted(true);
  };

  const submitReturn = async () => {
    if (!returnOrder) return;
    setReturnErr("");
    const supabase = createClient();
    const { error } = await supabase.rpc("request_order_return", {
      p_order_id: returnOrder.id,
      p_reason: returnReason,
    });
    if (error) {
      setReturnErr(error.message.includes("ERR_RETURN_WINDOW_EXPIRED") ? "Đã quá 3 ngày kể từ khi nhận hàng." : "Không thể gửi yêu cầu.");
      return;
    }
    setReturnSubmitted(true);
    loadOrders();
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-bark-500">Đang tải đơn hàng...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 pb-1 border-b border-surface-border overflow-x-auto no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-box text-xs font-bold transition-colors whitespace-nowrap ${
              activeFilter === tab.id ? "bg-pine-900 text-white" : "bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
          Chưa có đơn hàng nào.
        </div>
      )}

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-pine-950 text-sm">{order.order_code}</span>
                  {order.cycle_index && (
                    <span className="px-2 py-0.2 rounded-tag bg-honey-100 text-honey-700 text-[10px] font-extrabold border border-honey-300">
                      Kỳ {order.cycle_index}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-bark-500">
                  Đặt lúc: {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(order.status)}</div>
            </div>

            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-surface-muted flex items-center justify-center">
                      {item.box_type_id ? (
                        <PackageOpen className="w-3.5 h-3.5 text-pine-900" />
                      ) : (
                        <UtensilsCrossed className="w-3.5 h-3.5 text-bark-700" />
                      )}
                    </span>
                    <div>
                      <span className="font-bold text-pine-950">{item.product_name_snapshot}</span>
                      {item.pets?.name && (
                        <span className="text-[11px] text-honey-700 ml-1.5 font-semibold">(Bé {item.pets.name})</span>
                      )}
                      <span className="text-bark-500 ml-2">x{item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-bark-900">
                    {item.total_price === 0 ? "Đã trả theo gói" : formatVND(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            {order.tracking_code && (
              <div className="pt-3 border-t border-surface-border bg-surface-muted/50 p-3.5 rounded-box flex items-center justify-between text-xs font-bold text-pine-950">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-pine-800" />
                  <span>Mã vận đơn:</span>
                </span>
                <span className="font-mono text-[11px] text-bark-600">{order.tracking_code}</span>
              </div>
            )}

            <div className="pt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-bark-500">Tổng thanh toán: </span>
                <strong className="text-sm font-extrabold text-pine-950 font-display">
                  {order.total_amount === 0 ? "0₫ (Đã thanh toán trước)" : formatVND(order.total_amount)}
                </strong>
                <span className="text-bark-500 ml-2">({order.payment_method} - {order.payment_status})</span>
              </div>

              <div className="flex items-center gap-2">
                {order.status === "da_giao" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openReview(order)}
                      className="px-3 py-1.5 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Star className="w-3 h-3 text-butter-200 fill-butter-200" />
                      <span>Đánh giá unbox</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReturnOrder(order); setReturnSubmitted(false); setReturnErr(""); }}
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

      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-pine-950">Đánh giá đơn hàng {reviewOrder.order_code}</h3>

            {reviewSubmitted ? (
              <div className="p-4 rounded-box bg-grass-50 border border-grass-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-grass-600 mx-auto" />
                <p className="text-xs font-bold text-grass-800">Cảm ơn bạn! Đánh giá đã được ghi nhận.</p>
                <button type="button" onClick={() => setReviewOrder(null)} className="px-4 py-1.5 rounded-box bg-grass-700 text-white text-xs font-bold">
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Đánh giá chung:</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="p-1 text-honey-500">
                        <Star className={`w-6 h-6 ${s <= rating ? "fill-honey-500" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-bark-800 block mb-1">Cảm nhận của bé và bạn khi mở hộp:</label>
                  <textarea rows={3} placeholder="Bé thích món nào nhất?..." value={comment} onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2.5 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
                </div>

                {curationItems.length > 0 ? (
                  <div className="p-3 rounded-box bg-surface-muted border border-surface-border text-[11px] text-bark-600 space-y-2">
                    <div className="font-bold text-pine-950">Chấm điểm từng món trong hộp:</div>
                    {curationItems.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between py-1">
                        <span>{item.name}:</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setItemRating(item.product_id, "like")}
                            className={`p-1 rounded ${item.rating === "like" ? "bg-grass-200 text-grass-800" : "text-bark-400"}`}>
                            <Heart className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setItemRating(item.product_id, "neutral")}
                            className={`p-1 rounded ${item.rating === "neutral" ? "bg-honey-200 text-honey-800" : "text-bark-400"}`}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setItemRating(item.product_id, "dislike")}
                            className={`p-1 rounded ${item.rating === "dislike" ? "bg-red-200 text-red-800" : "text-bark-400"}`}>
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-box bg-surface-muted text-[11px] text-bark-500">
                    Đơn này không có dữ liệu món cụ thể để chấm điểm (đơn hàng lẻ, hoặc chưa được tuyển chọn box).
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                  <button type="button" onClick={() => setReviewOrder(null)} className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold">
                    Hủy
                  </button>
                  <button type="button" onClick={submitReview} className="px-5 py-2 rounded-box bg-honey-600 hover:bg-honey-700 text-white font-bold">
                    Gửi đánh giá
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border">
            <h3 className="text-base font-bold text-pine-950">Yêu cầu đổi / trả cho đơn {returnOrder.order_code}</h3>

            {returnSubmitted ? (
              <div className="p-4 rounded-box bg-pine-50 border border-pine-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-pine-700 mx-auto" />
                <p className="text-xs font-bold text-pine-900">
                  Yêu cầu đã được ghi nhận, đơn chuyển sang trạng thái &quot;Đổi / Trả&quot; để CSKH xử lý.
                </p>
                <button type="button" onClick={() => setReturnOrder(null)} className="px-4 py-1.5 rounded-box bg-pine-900 text-white text-xs font-bold">
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {returnErr && <div className="p-2.5 rounded-box bg-red-50 border border-red-200 text-red-700">{returnErr}</div>}
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Lý do yêu cầu đổi trả: *</label>
                  <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full p-2.5 rounded-box border border-surface-border bg-white">
                    <option value="Món chứa thành phần dị ứng đã khai báo">Món chứa thành phần dị ứng đã khai trong hồ sơ thú cưng</option>
                    <option value="Hàng hỏng, vỡ, hết hạn sử dụng">Hàng hỏng, vỡ, hết hạn sử dụng</option>
                    <option value="Giao thiếu món">Giao thiếu món so với cam kết</option>
                  </select>
                </div>
                <div className="p-2.5 rounded-box bg-honey-50 border border-honey-200 text-[11px] text-honey-900 leading-relaxed">
                  Chính sách FPETS: đổi món miễn phí nếu lỗi thuộc về shop khi bạn báo trong vòng 3 ngày sau khi nhận hàng.
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                  <button type="button" onClick={() => setReturnOrder(null)} className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold">
                    Hủy
                  </button>
                  <button type="button" onClick={submitReturn} className="px-5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold">
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
