"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, ORDER_TIMELINE, OrderStatus, timelineIndex } from "@/lib/orderDisplay";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import OrderStepper from "@/components/common/OrderStepper";

interface LookupResult {
  order_code: string;
  status: OrderStatus;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  ward: string | null;
  province_city: string | null;
  total_amount: number;
  tracking_code: string | null;
}

const STATUS_NOTE: Record<OrderStatus, string> = {
  cho_thanh_toan: "Đơn đang chờ thanh toán online. Quá 30 phút chưa thanh toán, đơn tự hủy.",
  da_xac_nhan: "FPETS đã nhận đơn và sẽ chuẩn bị hàng.",
  dang_chuan_bi: "Hàng đang được chọn và đóng gói.",
  dang_giao: "Đơn đã giao cho đơn vị vận chuyển. Bạn để ý điện thoại để nhận hàng.",
  da_giao: "Đơn đã giao thành công.",
  da_huy: "Đơn đã hủy.",
  doi_tra: "Đơn đang được xử lý đổi / trả. FPETS sẽ liên hệ bạn.",
};

const input = "w-full min-h-11 px-3.5 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none";

export default function OrderTrackingPage() {
  const { isLoggedIn } = useApp();
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Điền sẵn mã đơn khi đến từ trang đặt hàng thành công (?code=...)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) setOrderCode(code);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orderCode.trim()) return setError("Nhập mã đơn hàng.");
    if (!/^0[0-9]{9}$/.test(phone.trim())) return setError("Số điện thoại gồm 10 số, bắt đầu bằng 0.");
    setLoading(true);
    const { data, error: rpcError } = await createClient().rpc("lookup_order", {
      p_order_code: orderCode.trim().toUpperCase(),
      p_phone: phone.trim(),
    });
    setLoading(false);
    if (rpcError) return setError("Chưa tra cứu được, vui lòng thử lại sau ít phút.");
    setSearched(true);
    setOrder(((data as unknown as LookupResult[]) || [])[0] || null);
  };

  const copyTracking = async () => {
    if (!order?.tracking_code) return;
    try {
      await navigator.clipboard.writeText(order.tracking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Trình duyệt chặn clipboard: khách tự bôi đen mã để sao chép
    }
  };

  const cancelled = order?.status === "da_huy";
  const stepIndex = order ? timelineIndex(order.status) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Tra cứu đơn hàng</h1>
        <p className="text-sm text-bark-600">
          Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.
          {isLoggedIn && (
            <>
              {" "}Bạn đã đăng nhập, xem mọi đơn trong{" "}
              <Link href="/my-account/orders" className="font-bold text-pine-900 underline underline-offset-2">Đơn hàng của tôi</Link>.
            </>
          )}
        </p>
      </header>

      <form onSubmit={handleSearch} noValidate className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end">
          <div>
            <label htmlFor="track-code" className="text-xs font-bold text-bark-800 block mb-1">Mã đơn hàng</label>
            <input id="track-code" type="text" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="FPET-20261003-1234" autoComplete="off" className={`${input} font-mono uppercase placeholder:normal-case placeholder:font-sans`} />
          </div>
          <div>
            <label htmlFor="track-phone" className="text-xs font-bold text-bark-800 block mb-1">Số điện thoại đặt hàng</label>
            <input id="track-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))} placeholder="0912345678" autoComplete="tel" className={input} />
          </div>
          <Button type="submit" loading={loading} loadingText="Đang tìm…">
            <Search className="w-4 h-4" /> Tra cứu
          </Button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        <p className="text-xs text-bark-500">Mã đơn có dạng FPET-ngày-4 số, nằm trên trang xác nhận sau khi đặt hàng.</p>
      </form>

      {searched && !loading && order && (
        <section aria-live="polite" className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-mono font-bold text-pine-950 text-base">{order.order_code}</h2>
              <p className="text-sm text-bark-600 mt-0.5">{STATUS_NOTE[order.status]}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-tag border text-xs font-bold ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
          </div>

          {!cancelled && (
            <div className="p-4 sm:p-5">
              <OrderStepper steps={ORDER_TIMELINE.map((s) => ({ label: s.label }))} currentIndex={stepIndex} />
            </div>
          )}

          <dl className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-bark-500">Người nhận</dt>
              <dd className="font-semibold text-pine-950">{order.recipient_name} · {order.recipient_phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-bark-500">Tổng tiền</dt>
              <dd className="font-semibold text-pine-950">{formatVND(order.total_amount)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-bark-500">Địa chỉ giao</dt>
              <dd className="text-bark-800">{[order.shipping_address, order.ward, order.province_city].filter(Boolean).join(", ")}</dd>
            </div>
            {order.tracking_code && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-bark-500">Mã vận đơn</dt>
                <dd className="flex items-center gap-3">
                  <span className="font-mono font-bold text-pine-950">{order.tracking_code}</span>
                  <button type="button" onClick={copyTracking} className="text-xs font-bold text-pine-900 underline underline-offset-2 min-h-9">
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                </dd>
              </div>
            )}
          </dl>

          <p className="p-4 sm:p-5 text-xs text-bark-600">
            Muốn đánh giá đơn hoặc yêu cầu đổi / trả?{" "}
            <Link href="/my-account/orders" className="font-bold text-pine-900 underline underline-offset-2">Mở Đơn hàng của tôi</Link>.
          </p>
        </section>
      )}

      {searched && !loading && !order && (
        <div role="status" className="p-5 rounded-container bg-surface-card border border-surface-border space-y-1.5">
          <h2 className="text-sm font-bold text-pine-950">Không tìm thấy đơn khớp thông tin này</h2>
          <p className="text-sm text-bark-600">
            Kiểm tra lại mã đơn (bắt đầu bằng FPET-) và số điện thoại đã dùng khi đặt. Cần hỗ trợ, gọi{" "}
            <a href={`tel:${CONTACT_INFO.hotlineTel}`} className="font-bold text-pine-900 underline underline-offset-2">{CONTACT_INFO.hotline}</a>.
          </p>
        </div>
      )}
    </div>
  );
}
