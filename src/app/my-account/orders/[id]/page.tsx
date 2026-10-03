"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Heart, MapPin, Minus, Star, ThumbsDown, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDateTime } from "@/lib/formatters";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TIMELINE,
  ORDER_TYPE_LABEL,
  cleanItemName,
  paymentText,
  returnDaysLeft,
  returnWindowDays,
  RETURN_RESOLUTION_LABEL,
  timelineIndex,
} from "@/lib/orderDisplay";
import { fetchMyOrder, MyOrder, orderLines } from "@/lib/myOrders";
import { EXCHANGE_POLICY } from "@/lib/copy";
import OrderStepper from "@/components/common/OrderStepper";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type ItemRating = "like" | "neutral" | "dislike";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [order, setOrder] = useState<MyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchMyOrder(id);
    setOrder(data);
    if (data) {
      const { count } = await createClient().from("reviews").select("id", { count: "exact", head: true }).eq("order_id", data.id);
      setHasReview((count || 0) > 0);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="h-96 rounded-container bg-surface-muted animate-pulse" aria-busy="true" />;
  }
  if (!order) {
    return (
      <div className="p-10 text-center rounded-container bg-surface-card border border-surface-border space-y-3">
        <p className="text-sm text-bark-600">Không tìm thấy đơn hàng.</p>
        <ButtonLink href="/my-account/orders" variant="secondary">Về danh sách đơn</ButtonLink>
      </div>
    );
  }

  const lines = orderLines(order);
  const stepIdx = timelineIndex(order.status);
  const cancelled = order.status === "da_huy";
  const isCycle = order.order_type === "subscription_cycle";
  const hasRetailItems = order.order_items.some((it) => !it.box_type_id);
  const daysLeft = returnDaysLeft(order.status, order.delivered_at || order.updated_at, !!order.return_requested_at, returnWindowDays(hasRetailItems));
  const isBoxOrder = order.order_type === "mystery_box" || isCycle;
  const pendingPayment = order.status === "cho_thanh_toan" && order.payment_expires_at && new Date(order.payment_expires_at) > new Date();

  const copyTracking = async () => {
    if (!order.tracking_code) return;
    await navigator.clipboard.writeText(order.tracking_code);
    show("Đã sao chép mã vận đơn");
  };

  return (
    <div className="space-y-5">
      <Link href="/my-account/orders" className="inline-flex items-center gap-1.5 min-h-11 text-xs font-bold text-pine-900 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Tất cả đơn hàng
      </Link>

      <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-mono text-base font-bold text-pine-950">{order.order_code}</h2>
            <p className="text-xs text-bark-500">{ORDER_TYPE_LABEL[order.order_type]} · Đặt lúc {formatDateTime(order.created_at)}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-tag border text-xs font-bold ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>

        {cancelled ? (
          <div className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-800">
            Đơn đã hủy{order.cancelled_at ? ` lúc ${formatDateTime(order.cancelled_at)}` : ""}.{order.cancellation_reason ? ` Lý do: ${order.cancellation_reason}` : ""}
          </div>
        ) : (
          <div className="py-2">
            <OrderStepper
              currentIndex={stepIdx}
              steps={ORDER_TIMELINE.map((step, i) => {
                // Mốc thời gian đang lưu: lúc đặt, lúc xác nhận (thanh toán online; đơn COD được xác nhận ngay khi đặt) và lúc giao xong
                const time = i === 0 ? order.created_at : i === 1 ? (order.payment_method === "cod" ? order.created_at : order.paid_at) : i === 4 ? order.delivered_at : null;
                return { label: step.label, time: i <= stepIdx && time ? formatDateTime(time) : null };
              })}
            />
          </div>
        )}
        {order.status === "doi_tra" && (
          <div className="p-3 rounded-box bg-honey-50 border border-honey-200 text-xs text-honey-900">
            Đã gửi yêu cầu đổi / trả{order.return_requested_at ? ` lúc ${formatDateTime(order.return_requested_at)}` : ""}. Lý do: {order.return_reason}. Đội ngũ FPETS sẽ liên hệ bạn.
          </div>
        )}
        {order.return_resolution && (
          <div className={`p-3 rounded-box border text-xs ${order.return_resolution === "rejected" ? "bg-surface-muted border-surface-border text-bark-800" : "bg-grass-50 border-grass-200 text-grass-900"}`}>
            <p className="font-bold">
              Yêu cầu đổi / trả: {RETURN_RESOLUTION_LABEL[order.return_resolution]}
              {order.return_resolved_at ? ` · ${formatDateTime(order.return_resolved_at)}` : ""}
            </p>
            {order.return_admin_note && <p className="mt-0.5">{order.return_admin_note}</p>}
          </div>
        )}

        {pendingPayment && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-box bg-amber-50 border border-amber-200 text-xs">
            <span className="text-amber-900">Đơn đang chờ thanh toán, tự hủy lúc {formatDateTime(order.payment_expires_at)}.</span>
            <ButtonLink href={`/checkout/pay/${order.id}?code=${order.order_code}&amount=${order.total_amount}&method=${order.payment_method}`} size="sm">
              Thanh toán tiếp
            </ButtonLink>
          </div>
        )}
      </div>

      {order.tracking_code && (
        <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 text-bark-700">
            <Truck className="w-4 h-4 text-pine-800" /> Mã vận đơn: <strong className="font-mono text-pine-950">{order.tracking_code}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={copyTracking}>
            <Copy className="w-3.5 h-3.5" /> Sao chép
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-2 text-sm">
          <h3 className="font-bold text-pine-950 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-pine-800" /> Địa chỉ giao hàng</h3>
          <p className="text-bark-800 font-semibold">{order.recipient_name} · {order.recipient_phone}</p>
          <p className="text-bark-600 text-xs leading-relaxed">{[order.shipping_address, order.ward, order.province_city].filter(Boolean).join(", ")}</p>
          {order.customer_notes && <p className="text-xs text-bark-500">Ghi chú: {order.customer_notes}</p>}
        </div>
        <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-2 text-sm">
          <h3 className="font-bold text-pine-950">Thanh toán</h3>
          <p className="text-bark-700 text-xs">{paymentText(order.payment_method, order.payment_status, order.order_type)}</p>
          {order.paid_at && <p className="text-xs text-bark-500">Lúc {formatDateTime(order.paid_at)}</p>}
          {order.subscriptions && (
            <Link href="/my-account/subscriptions" className="inline-block text-xs font-bold text-pine-900 hover:underline">
              Thuộc gói {order.subscriptions.subscription_code}
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
        <h3 className="text-sm font-bold text-pine-950">Sản phẩm</h3>
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-3 text-sm">
            <div className="relative w-12 h-12 rounded-box overflow-hidden bg-surface-muted shrink-0">
              <Image src={line.thumb} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-pine-950">{cleanItemName(line.name)}</div>
              <div className="flex items-center gap-1.5 text-xs text-bark-500 mt-0.5">
                {line.petName && <span className="px-2 py-0.5 rounded-tag bg-pine-50 text-pine-900 text-[11px] font-semibold">Bé {line.petName}</span>}
                <span>x{line.quantity}</span>
              </div>
            </div>
            <span className="font-semibold text-bark-900 text-sm">{isCycle ? "Đã trả theo gói" : formatVND(line.amount)}</span>
          </div>
        ))}

        {!isCycle && (
          <dl className="pt-3 border-t border-surface-border space-y-1.5 text-sm">
            <div className="flex justify-between text-bark-600"><dt>Tạm tính</dt><dd>{formatVND(order.subtotal)}</dd></div>
            <div className="flex justify-between text-bark-600"><dt>Phí vận chuyển</dt><dd>{order.shipping_fee > 0 ? formatVND(order.shipping_fee) : "Miễn phí"}</dd></div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-grass-700"><dt>Giảm giá</dt><dd>−{formatVND(order.discount_amount)}</dd></div>
            )}
            <div className="flex justify-between pt-2 border-t border-surface-border font-extrabold text-pine-950"><dt>Tổng cộng</dt><dd>{formatVND(order.total_amount)}</dd></div>
          </dl>
        )}
      </div>

      {order.status === "da_giao" && (
        <div className="flex flex-wrap gap-2">
          {hasReview ? (
            <p className="flex items-center gap-1.5 min-h-11 text-xs text-grass-800 font-semibold">
              <Star className="w-4 h-4 fill-honey-500 text-honey-500" /> Bạn đã đánh giá đơn này. Cảm ơn bạn!
            </p>
          ) : (
            <Button onClick={() => setReviewOpen(true)}>
              <Star className="w-4 h-4" /> {isBoxOrder ? "Đánh giá hộp" : "Đánh giá sản phẩm"}
            </Button>
          )}
          {daysLeft > 0 && (
            <Button variant="secondary" onClick={() => setReturnOpen(true)}>
              Yêu cầu đổi / trả (còn {daysLeft} ngày)
            </Button>
          )}
        </div>
      )}

      {reviewOpen && (
        <ReviewModal
          order={order}
          isBoxOrder={isBoxOrder}
          onClose={() => setReviewOpen(false)}
          onDone={() => {
            setReviewOpen(false);
            setHasReview(true);
            show("Cảm ơn bạn đã đánh giá!");
          }}
        />
      )}
      {returnOpen && (
        <ReturnModal
          order={order}
          onClose={() => setReturnOpen(false)}
          onDone={() => {
            setReturnOpen(false);
            show("Đã gửi yêu cầu đổi / trả");
            load();
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({ order, isBoxOrder, onClose, onDone }: { order: MyOrder; isBoxOrder: boolean; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [items, setItems] = useState<{ product_id: string; name: string; rating: ItemRating | null }[]>([]);
  const [petId, setPetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Món FPETS đã chọn cho hộp này, để khách chấm từng món (SPEC §8)
  useEffect(() => {
    if (!isBoxOrder) return;
    createClient()
      .from("box_curations")
      .select("pet_id, box_curation_items(product_id, products(name))")
      .eq("order_id", order.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setPetId(data.pet_id);
        const rows = (data.box_curation_items as unknown as { product_id: string; products: { name: string } | null }[]) || [];
        setItems(rows.map((r) => ({ product_id: r.product_id, name: r.products?.name || "Sản phẩm", rating: null })));
      });
  }, [isBoxOrder, order.id]);

  const submit = async () => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error: err } = await supabase.from("reviews").insert({ order_id: order.id, user_id: auth.user.id, rating, comment: comment.trim() || null });
    if (err) {
      setSaving(false);
      setError("Không gửi được đánh giá, vui lòng thử lại.");
      return;
    }
    const rows = items.filter((i) => i.rating && petId).map((i) => ({ pet_id: petId as string, product_id: i.product_id, rating: i.rating as ItemRating }));
    if (rows.length > 0) await supabase.from("pet_item_feedback").insert(rows);
    setSaving(false);
    onDone();
  };

  const rate = (productId: string, r: ItemRating) => setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, rating: r } : i)));

  return (
    <Modal
      open
      onClose={onClose}
      title={isBoxOrder ? "Đánh giá hộp" : "Đánh giá sản phẩm"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Để sau</Button>
          <Button onClick={submit} loading={saving}>Gửi đánh giá</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold text-bark-800 block mb-1">Đánh giá chung</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} sao`} className="min-w-11 min-h-11 flex items-center justify-center text-honey-500">
                <Star className={`w-6 h-6 ${s <= rating ? "fill-honey-500" : ""}`} />
              </button>
            ))}
          </div>
        </div>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={isBoxOrder ? "Bé thích món nào nhất?" : "Sản phẩm dùng thế nào?"}
          className="w-full p-3 rounded-box border border-surface-border text-sm" />
        {items.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-bark-800 block">Bé thích từng món thế nào?</span>
            {items.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-bark-800">{item.name}</span>
                <div className="flex gap-1">
                  {([["like", Heart, "Bé thích"], ["neutral", Minus, "Bình thường"], ["dislike", ThumbsDown, "Không thích"]] as const).map(([value, Icon, label]) => (
                    <button key={value} type="button" onClick={() => rate(item.product_id, value)} aria-label={label} title={label} aria-pressed={item.rating === value}
                      className={`min-w-10 min-h-10 rounded-box border flex items-center justify-center ${item.rating === value ? "bg-pine-50 border-pine-800 text-pine-900" : "border-surface-border text-bark-400"}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      </div>
    </Modal>
  );
}

const RETURN_REASONS = [
  "Món chứa thành phần dị ứng đã khai trong hồ sơ thú cưng",
  "Hàng hỏng, vỡ hoặc hết hạn sử dụng",
  "Giao thiếu món",
];
// Chỉ sản phẩm lẻ được trả vì đổi ý (SPEC §10), Mystery Box thì không
const RETAIL_RETURN_REASON = "Muốn đổi / trả sản phẩm lẻ còn nguyên seal (khách chịu phí ship)";

function ReturnModal({ order, onClose, onDone }: { order: MyOrder; onClose: () => void; onDone: () => void }) {
  const hasRetailItems = order.order_items.some((it) => !it.box_type_id);
  const reasons = hasRetailItems ? [...RETURN_REASONS, RETAIL_RETURN_REASON] : RETURN_REASONS;
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    const { error: err } = await createClient().rpc("request_order_return", {
      p_order_id: order.id,
      p_reason: detail.trim() ? `${reason}. Mô tả: ${detail.trim()}` : reason,
    });
    setSaving(false);
    if (err) {
      setError(
        err.message.includes("ERR_RETURN_WINDOW_EXPIRED")
          ? `Đã quá ${returnWindowDays(hasRetailItems)} ngày kể từ khi nhận hàng.`
          : err.message.includes("ERR_RETURN_ALREADY_REQUESTED")
            ? "Đơn này đã gửi yêu cầu đổi / trả trước đó."
            : "Không gửi được yêu cầu, vui lòng thử lại."
      );
      return;
    }
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Yêu cầu đổi / trả"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={submit} loading={saving}>Gửi yêu cầu</Button>
        </>
      }
    >
      <div className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-bark-800 mb-1">Lý do</legend>
          {reasons.map((r) => (
            <label key={r} className={`flex items-center gap-2.5 min-h-11 px-3 rounded-box border cursor-pointer text-sm ${reason === r ? "bg-pine-50 border-pine-800" : "border-surface-border"}`}>
              <input type="radio" name="return-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-pine-900" />
              {r}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="return-detail" className="text-xs font-bold text-bark-800 block mb-1">Mô tả chi tiết (không bắt buộc)</label>
          <textarea
            id="return-detail"
            rows={3}
            maxLength={500}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Ví dụ: Lon pate bị móp, hạt bị ẩm..."
            className="w-full p-3 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none"
          />
        </div>
        <p className="text-xs text-bark-600 leading-relaxed">{EXCHANGE_POLICY}</p>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      </div>
    </Modal>
  );
}
