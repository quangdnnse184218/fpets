"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { Gift, TrendingUp, AlertTriangle } from "lucide-react";

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
  const [pendingCurations, setPendingCurations] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [pausedSubs, setPausedSubs] = useState(0);
  const [cancelledSubs, setCancelledSubs] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ count: curationCount }, { data: paidOrders }, { count: activeCount }, { count: pausedCount }, { count: cancelledCount }, { data: products }, { data: allOrders }] = await Promise.all([
      supabase.from("box_curations").select("id", { count: "exact", head: true }).eq("status", "pending_curation"),
      supabase.from("orders").select("total_amount").eq("payment_status", "paid").gte("created_at", monthStart.toISOString()),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "dang_hoat_dong"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "tam_dung"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "da_huy"),
      supabase.from("products").select("stock_quantity, low_stock_threshold").eq("is_active", true),
      supabase.from("orders").select("status"),
    ]);

    setPendingCurations(curationCount || 0);
    setRevenueThisMonth((paidOrders || []).reduce((s, o) => s + o.total_amount, 0));
    setActiveSubs(activeCount || 0);
    setPausedSubs(pausedCount || 0);
    setCancelledSubs(cancelledCount || 0);
    setLowStockCount((products || []).filter((p) => p.stock_quantity <= p.low_stock_threshold).length);

    const counts: Record<string, number> = {};
    (allOrders || []).forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    setStatusCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải thống kê...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Tổng quan vận hành & Báo cáo</h1>
        <p className="text-xs text-bark-500">Dữ liệu thống kê thật từ hệ thống, cập nhật theo thời gian thực.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6 rounded-container bg-pine-950 text-white p-6 sm:p-7 flex flex-col justify-between shadow-md relative overflow-hidden border border-pine-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pine-300">Hàng chờ tuyển chọn</span>
            </div>
            <div>
              <span className="text-xs text-pine-300 block mb-1">Hộp đang chờ tuyển chọn</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-white font-display tracking-tight">{pendingCurations}</span>
                <span className="text-lg text-pine-200 font-semibold">hộp Mystery Box</span>
              </div>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t border-pine-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link href="/admin/box-curation" className="px-4 py-2.5 rounded-box bg-white hover:bg-pine-50 text-pine-950 font-bold text-xs shrink-0 transition-colors text-center shadow-sm">
              Mở hàng chờ tuyển chọn
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-container bg-surface-card border border-surface-border p-6 shadow-xs flex flex-col justify-between divide-y divide-surface-border">
          <div className="pb-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Doanh thu tháng này (đã thanh toán)</span>
              <TrendingUp className="w-4 h-4 text-grass-600" />
            </div>
            <span className="text-2xl font-extrabold text-pine-950 font-display block">{formatVND(revenueThisMonth)}</span>
          </div>
          <div className="py-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Gói định kỳ hoạt động</span>
              <Gift className="w-4 h-4 text-pine-800" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-pine-950 font-display">{activeSubs} gói</span>
              <span className="text-[11px] text-bark-500">{pausedSubs} tạm dừng · {cancelledSubs} đã hủy</span>
            </div>
          </div>
          <div className="pt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Cảnh báo tồn kho</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-extrabold text-amber-700 font-display block">{lowStockCount} sản phẩm</span>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-4">
        <h3 className="text-sm font-bold text-pine-950">Phân bổ đơn hàng theo 7 trạng thái</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {ORDER_STATUSES.map((s) => (
            <div key={s.key} className={`p-3 rounded-box ${s.bg}`}>
              <span className={`text-[11px] block ${s.text}`}>{s.label}</span>
              <span className={`text-lg font-bold ${s.text}`}>{statusCounts[s.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
