"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import {
  Gift,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Star,
  PackageSearch,
  ClipboardList,
  Warehouse,
  ChevronRight,
  Package,
  Sparkles,
} from "lucide-react";

const ORDER_STATUSES = [
  { key: "cho_thanh_toan", label: "Chờ thanh toán", bg: "bg-surface-muted", text: "text-bark-800" },
  { key: "da_xac_nhan", label: "Đã xác nhận", bg: "bg-pine-50", text: "text-pine-950" },
  { key: "dang_chuan_bi", label: "Đang chuẩn bị", bg: "bg-amber-50/70", text: "text-amber-900" },
  { key: "dang_giao", label: "Đang giao", bg: "bg-blue-50", text: "text-blue-950" },
  { key: "da_giao", label: "Đã giao", bg: "bg-grass-50", text: "text-grass-900" },
  { key: "da_huy", label: "Đã hủy", bg: "bg-red-50", text: "text-red-900" },
  { key: "doi_tra", label: "Đổi / Trả", bg: "bg-amber-50", text: "text-amber-900" },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCurations, setPendingCurations] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [pausedSubs, setPausedSubs] = useState(0);
  const [cancelledSubs, setCancelledSubs] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [newFeedback, setNewFeedback] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalOrders, setTotalOrders] = useState(0);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    const supabase = createClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      { count: curationCount },
      { data: paidOrders },
      { count: activeCount },
      { count: pausedCount },
      { count: cancelledCount },
      { data: products },
      { data: allOrders },
    ] = await Promise.all([
      supabase.from("box_curations").select("id", { count: "exact", head: true }).eq("status", "pending_curation"),
      supabase.from("orders").select("total_amount").eq("payment_status", "paid").gte("created_at", monthStart.toISOString()),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "dang_hoat_dong"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "tam_dung"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "da_huy"),
      supabase.from("products").select("stock_quantity, low_stock_threshold").eq("is_active", true),
      supabase.from("orders").select("status"),
    ]);

    const [{ count: feedbackCount }, { count: unrepliedCount }] = await Promise.all([
      supabase.from("feedback_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("reviews").select("id", { count: "exact", head: true }).is("admin_reply", null).lte("rating", 3),
    ]);

    setNewFeedback(feedbackCount || 0);
    setPendingReviews(unrepliedCount || 0);
    setPendingCurations(curationCount || 0);
    setRevenueThisMonth((paidOrders || []).reduce((s, o) => s + o.total_amount, 0));
    setActiveSubs(activeCount || 0);
    setPausedSubs(pausedCount || 0);
    setCancelledSubs(cancelledCount || 0);
    setLowStockCount((products || []).filter((p) => p.stock_quantity <= p.low_stock_threshold).length);

    const counts: Record<string, number> = {};
    const ordersList = allOrders || [];
    setTotalOrders(ordersList.length);
    ordersList.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    setStatusCounts(counts);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-pine-800 animate-spin mx-auto" />
        <p className="text-xs text-bark-500">Đang tải dữ liệu tổng quan dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header trang Dashboard */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display">
            Tổng quan Dashboard
          </h1>
          <p className="text-xs text-bark-500 hidden sm:block">
            Thống kê vận hành thời gian thực từ toàn bộ hệ thống FPETS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-box bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
          title="Tải lại dữ liệu mới nhất"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-pine-900" : ""}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Hero Banner: Hộp chờ tuyển chọn (Cần xử lý đầu tiên) */}
      <div
        className={`rounded-container p-4 sm:p-6 transition-all ${
          pendingCurations > 0
            ? "bg-gradient-to-r from-pine-950 via-pine-900 to-pine-850 text-white shadow-md border border-pine-850"
            : "bg-surface-card border border-surface-border text-bark-800 shadow-2xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-tag text-[10px] font-bold uppercase tracking-wider ${
                  pendingCurations > 0 ? "bg-honey-500 text-pine-950" : "bg-grass-100 text-grass-800"
                }`}
              >
                {pendingCurations > 0 ? "Ưu tiên vận hành" : "Đã hoàn thành"}
              </span>
              <span className={`text-[11px] ${pendingCurations > 0 ? "text-pine-300" : "text-bark-500"}`}>
                Hàng chờ tuyển chọn Mystery Box
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-extrabold font-display ${pendingCurations > 0 ? "text-white" : "text-pine-950"}`}>
                {pendingCurations}
              </span>
              <span className={`text-xs font-semibold ${pendingCurations > 0 ? "text-pine-200" : "text-bark-500"}`}>
                hộp đang chờ chọn món &amp; duyệt giao
              </span>
            </div>
          </div>

          <Link
            href="/admin/box-curation"
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-box font-bold text-xs transition-colors shadow-xs shrink-0 ${
              pendingCurations > 0
                ? "bg-white hover:bg-pine-50 text-pine-950"
                : "bg-pine-900 hover:bg-pine-800 text-white"
            }`}
          >
            <PackageSearch className="w-4 h-4" />
            <span>Mở hàng chờ tuyển chọn</span>
          </Link>
        </div>
      </div>

      {/* Lưới 4 chỉ số KPI chính (Cân bằng đẹp trên mobile 2x2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Doanh thu tháng */}
        <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-bark-500">
            <span className="text-[11px] font-medium truncate">Doanh thu tháng</span>
            <TrendingUp className="w-4 h-4 text-grass-600 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-extrabold text-pine-950 font-display truncate">
            {formatVND(revenueThisMonth)}
          </div>
          <div className="text-[10px] text-grass-700 font-semibold truncate">
            Đơn đã thanh toán
          </div>
        </div>

        {/* KPI 2: Subscription hoạt động */}
        <Link
          href="/admin/subscriptions"
          className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border hover:border-pine-800/40 space-y-1.5 shadow-2xs transition-colors group"
        >
          <div className="flex items-center justify-between text-bark-500">
            <span className="text-[11px] font-medium truncate">Gói định kỳ</span>
            <Gift className="w-4 h-4 text-pine-800 shrink-0 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-xl font-extrabold text-pine-950 font-display truncate">
            {activeSubs} gói
          </div>
          <div className="text-[10px] text-bark-500 truncate">
            {pausedSubs} tạm dừng · {cancelledSubs} hủy
          </div>
        </Link>

        {/* KPI 3: Cảnh báo tồn kho */}
        <Link
          href="/admin/products"
          className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border hover:border-pine-800/40 space-y-1.5 shadow-2xs transition-colors group"
        >
          <div className="flex items-center justify-between text-bark-500">
            <span className="text-[11px] font-medium truncate">Cảnh báo kho</span>
            <AlertTriangle
              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                lowStockCount > 0 ? "text-amber-600" : "text-bark-400"
              }`}
            />
          </div>
          <div
            className={`text-base sm:text-xl font-extrabold font-display truncate ${
              lowStockCount > 0 ? "text-amber-700" : "text-pine-950"
            }`}
          >
            {lowStockCount} món
          </div>
          <div className="text-[10px] text-bark-500 truncate">
            {lowStockCount > 0 ? "Sắp hết hàng" : "Kho đủ hàng"}
          </div>
        </Link>

        {/* KPI 4: Tổng đơn hàng */}
        <Link
          href="/admin/orders"
          className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border hover:border-pine-800/40 space-y-1.5 shadow-2xs transition-colors group"
        >
          <div className="flex items-center justify-between text-bark-500">
            <span className="text-[11px] font-medium truncate">Tổng đơn hàng</span>
            <Package className="w-4 h-4 text-pine-800 shrink-0 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-xl font-extrabold text-pine-950 font-display truncate">
            {totalOrders} đơn
          </div>
          <div className="text-[10px] text-bark-500 truncate">
            Xem danh sách đơn
          </div>
        </Link>
      </div>

      {/* Việc CSKH & Khiếu nại cần xử lý */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
        <Link
          href="/admin/reviews"
          className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border hover:border-pine-800/40 flex items-center justify-between gap-3 transition-colors shadow-2xs group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-box bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-pine-950 block truncate">Góp ý / Liên hệ mới</span>
              <span className="text-[11px] text-bark-500 block truncate">Tin nhắn từ khách qua trang Liên hệ</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-base font-extrabold px-2.5 py-0.5 rounded-full ${
                newFeedback > 0 ? "bg-amber-100 text-amber-800" : "bg-surface-muted text-bark-600"
              }`}
            >
              {newFeedback}
            </span>
            <ChevronRight className="w-4 h-4 text-bark-400 group-hover:text-pine-900 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/reviews"
          className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border hover:border-pine-800/40 flex items-center justify-between gap-3 transition-colors shadow-2xs group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-box bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-pine-950 block truncate">Đánh giá 1–3 sao</span>
              <span className="text-[11px] text-bark-500 block truncate">Cần admin kiểm tra &amp; phản hồi</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-base font-extrabold px-2.5 py-0.5 rounded-full ${
                pendingReviews > 0 ? "bg-red-100 text-red-800" : "bg-surface-muted text-bark-600"
              }`}
            >
              {pendingReviews}
            </span>
            <ChevronRight className="w-4 h-4 text-bark-400 group-hover:text-pine-900 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* Phân bổ đơn hàng theo 7 trạng thái */}
      <div className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3 sm:space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-pine-950">Phân bổ đơn hàng theo trạng thái</h2>
            <p className="text-[11px] text-bark-500">Bấm vào từng mục để xem danh sách đơn tương ứng.</p>
          </div>
          <Link href="/admin/orders" className="text-xs font-bold text-pine-900 hover:underline shrink-0">
            Tất cả đơn
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5 text-center">
          {ORDER_STATUSES.map((s) => {
            const count = statusCounts[s.key] || 0;
            return (
              <Link
                key={s.key}
                href={`/admin/orders?status=${s.key}`}
                className={`p-2.5 sm:p-3 rounded-box ${s.bg} hover:ring-1 hover:ring-pine-900/30 transition-all block`}
              >
                <span className={`text-[10px] sm:text-[11px] block font-medium truncate ${s.text}`}>{s.label}</span>
                <span className={`text-base sm:text-lg font-extrabold block mt-0.5 ${s.text}`}>{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Phím tắt truy cập nhanh cho mobile */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-2.5 shadow-2xs">
        <h3 className="text-xs font-bold text-bark-600 uppercase tracking-wider">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Link
            href="/admin/orders"
            className="p-2.5 rounded-box bg-surface-muted hover:bg-surface-border flex items-center gap-2 font-semibold text-bark-800 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-pine-800 shrink-0" />
            <span className="truncate">Quản lý Đơn hàng</span>
          </Link>
          <Link
            href="/admin/products"
            className="p-2.5 rounded-box bg-surface-muted hover:bg-surface-border flex items-center gap-2 font-semibold text-bark-800 transition-colors"
          >
            <Warehouse className="w-4 h-4 text-pine-800 shrink-0" />
            <span className="truncate">Sản phẩm &amp; Kho</span>
          </Link>
          <Link
            href="/admin/box-curation"
            className="p-2.5 rounded-box bg-surface-muted hover:bg-surface-border flex items-center gap-2 font-semibold text-bark-800 transition-colors"
          >
            <PackageSearch className="w-4 h-4 text-pine-800 shrink-0" />
            <span className="truncate">Tuyển chọn Box</span>
          </Link>
          <Link
            href="/admin/analytics"
            className="p-2.5 rounded-box bg-surface-muted hover:bg-surface-border flex items-center gap-2 font-semibold text-bark-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-pine-800 shrink-0" />
            <span className="truncate">Báo cáo &amp; Thống kê</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
