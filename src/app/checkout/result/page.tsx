"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatVND } from "@/lib/formatters";
import { CheckCircle2, Package, Home } from "lucide-react";

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get("code") || "FPET-20260922-8812";
  const paymentMethod = searchParams.get("method") || "MoMo";
  const amount = Number(searchParams.get("amount")) || 334000;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-grass-100 text-grass-700 flex items-center justify-center mx-auto text-3xl">
        <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-grass-700 bg-grass-50 px-3 py-1 rounded-tag border border-grass-200">
          Đặt hàng thành công
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
          Cảm ơn bạn đã đặt hàng tại FPETS!
        </h1>
        <p className="text-xs sm:text-sm text-bark-600 max-w-md mx-auto">
          Mã đơn hàng của bạn là <strong className="text-pine-950 font-mono">{orderCode}</strong>. Chúng tôi đã gửi thông tin chi tiết qua email và thông báo web.
        </p>
      </div>

      {/* Tóm tắt nhanh thông tin */}
      <div className="p-5 rounded-container bg-surface-card border border-surface-border text-xs text-left space-y-3">
        <div className="flex justify-between pb-2 border-b border-surface-border">
          <span className="text-bark-500">Mã đơn hàng:</span>
          <span className="font-mono font-bold text-pine-950">{orderCode}</span>
        </div>
        <div className="flex justify-between pb-2 border-b border-surface-border">
          <span className="text-bark-500">Hình thức thanh toán:</span>
          <span className="font-semibold text-bark-900">{paymentMethod}</span>
        </div>
        <div className="flex justify-between pb-2 border-b border-surface-border">
          <span className="text-bark-500">Trạng thái thanh toán:</span>
          <span className="font-bold text-grass-700">
            {paymentMethod === 'COD' ? 'Chờ thanh toán khi nhận hàng' : 'Đã thanh toán'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-bark-500">Tổng thanh toán:</span>
          <span className="font-extrabold text-pine-950 text-sm">{formatVND(amount)}</span>
        </div>
      </div>

      {/* Hai nút hành động */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        <Link
          href="/my-account/orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs transition-colors"
        >
          <Package className="w-4 h-4" />
          <span>Theo dõi trạng thái đơn hàng</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-box bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold text-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <React.Suspense fallback={<div className="max-w-xl mx-auto py-16 text-center text-xs text-bark-500">Đang tải kết quả đơn hàng...</div>}>
      <CheckoutResultContent />
    </React.Suspense>
  );
}
