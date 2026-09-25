"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { BarChart3, Download } from "lucide-react";

interface MonthBucket { label: string; value: number }
interface TopProduct { name: string; boxCount: number; retailCount: number; revenue: number }
interface CancelReason { reason: string; count: number }

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthBucket[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [subCounts, setSubCounts] = useState({ active: 0, paused: 0, cancelled: 0, expired: 0 });
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([]);
  const [ytdRevenue, setYtdRevenue] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

    const [{ data: paidOrders }, { data: orderItems }, { data: subs }] = await Promise.all([
      supabase.from("orders").select("total_amount, created_at").eq("payment_status", "paid").gte("created_at", yearStart),
      supabase.from("order_items").select("product_name_snapshot, quantity, total_price, product_id, box_type_id"),
      supabase.from("subscriptions").select("status, cancellation_reason"),
    ]);

    const buckets = new Map<string, number>();
    (paidOrders || []).forEach((o) => {
      const d = new Date(o.created_at);
      const key = `T${d.getMonth() + 1}`;
      buckets.set(key, (buckets.get(key) || 0) + o.total_amount);
    });
    const orderedMonths = Array.from({ length: new Date().getMonth() + 1 }, (_, i) => `T${i + 1}`);
    setMonthlyRevenue(orderedMonths.map((label) => ({ label, value: buckets.get(label) || 0 })));
    setYtdRevenue((paidOrders || []).reduce((s, o) => s + o.total_amount, 0));

    const productMap = new Map<string, TopProduct>();
    (orderItems || []).forEach((item) => {
      const key = item.product_name_snapshot;
      const cur = productMap.get(key) || { name: key, boxCount: 0, retailCount: 0, revenue: 0 };
      if (item.box_type_id) cur.boxCount += item.quantity;
      else cur.retailCount += item.quantity;
      cur.revenue += item.total_price;
      productMap.set(key, cur);
    });
    setTopProducts(Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

    const active = (subs || []).filter((s) => s.status === "dang_hoat_dong").length;
    const paused = (subs || []).filter((s) => s.status === "tam_dung").length;
    const cancelled = (subs || []).filter((s) => s.status === "da_huy").length;
    const expired = (subs || []).filter((s) => s.status === "het_han").length;
    setSubCounts({ active, paused, cancelled, expired });

    const reasonMap = new Map<string, number>();
    (subs || []).filter((s) => s.status === "da_huy" && s.cancellation_reason).forEach((s) => {
      const r = s.cancellation_reason as string;
      reasonMap.set(r, (reasonMap.get(r) || 0) + 1);
    });
    setCancelReasons(Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExportCsv = () => {
    const rows = [
      ["Tháng", "Doanh thu (VND)"],
      ...monthlyRevenue.map((m) => [m.label, String(m.value)]),
      [],
      ["Top sản phẩm", "Lượt vào Box", "Bán lẻ", "Doanh thu (VND)"],
      ...topProducts.map((p) => [p.name, String(p.boxCount), String(p.retailCount), String(p.revenue)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FPETS_Bao_Cao_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxVal = Math.max(1, ...monthlyRevenue.map((m) => m.value));
  const totalSubs = subCounts.active + subCounts.paused + subCounts.cancelled + subCounts.expired || 1;

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải báo cáo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Báo cáo & Thống kê Hoạt động</h1>
          <p className="text-xs text-bark-500">Doanh thu, cơ cấu trạng thái gói định kỳ và hiệu suất sản phẩm — số liệu thật từ hệ thống.</p>
        </div>
        <button onClick={handleExportCsv} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-grass-800 text-white rounded-box text-xs font-bold hover:bg-grass-900 transition-colors shadow-xs">
          <Download className="w-3.5 h-3.5" /><span>Xuất báo cáo (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 text-[11px] block mb-1">Tổng doanh thu (YTD)</span>
          <span className="font-extrabold text-pine-950 text-xl font-display">{formatVND(ytdRevenue)}</span>
        </div>
        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 text-[11px] block mb-1">Gói Subscription đang hoạt động</span>
          <span className="font-extrabold text-pine-900 text-xl font-display">{subCounts.active} gói</span>
        </div>
        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 text-[11px] block mb-1">Đã hủy</span>
          <span className="font-extrabold text-bark-800 text-xl font-display">{subCounts.cancelled} gói</span>
        </div>
        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 text-[11px] block mb-1">Hết hạn chưa gia hạn</span>
          <span className="font-extrabold text-amber-700 text-xl font-display">{subCounts.expired} gói</span>
        </div>
      </div>

      <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-pine-800" />
            <h3 className="font-bold text-pine-950 text-sm">Doanh thu theo tháng ({new Date().getFullYear()})</h3>
          </div>
          <span className="text-[11px] text-bark-500 font-medium">Đơn vị: VNĐ</span>
        </div>
        {monthlyRevenue.every((m) => m.value === 0) ? (
          <p className="text-xs text-bark-500 py-8 text-center">Chưa có đơn hàng thanh toán nào trong năm nay.</p>
        ) : (
          <div className="pt-6 pb-2">
            <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-surface-border">
              {monthlyRevenue.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-bold text-pine-900 opacity-0 group-hover:opacity-100 transition-opacity">{formatVND(item.value)}</span>
                  <div className="w-full max-w-[40px] rounded-t-sm bg-pine-800 hover:bg-grass-600 transition-all duration-300" style={{ height: `${Math.round((item.value / maxVal) * 100)}%` }} />
                  <span className="text-[11px] font-semibold text-bark-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="font-bold text-pine-950 text-sm">Cơ cấu Trạng thái Subscription</h3>
            <span className="text-bark-500 text-[11px]">Tổng {totalSubs} gói</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Đang hoạt động", count: subCounts.active, color: "bg-grass-600" },
              { label: "Tạm dừng", count: subCounts.paused, color: "bg-honey-500" },
              { label: "Đã hủy", count: subCounts.cancelled, color: "bg-bark-400" },
              { label: "Hết hạn", count: subCounts.expired, color: "bg-red-400" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-bark-800 font-semibold mb-1">
                  <span>{row.label}</span>
                  <span>{row.count} gói ({Math.round((row.count / totalSubs) * 100)}%)</span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full`} style={{ width: `${(row.count / totalSubs) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="font-bold text-pine-950 text-sm">Lý do Hủy gói (thực tế)</h3>
          </div>
          {cancelReasons.length === 0 ? (
            <p className="text-bark-500 py-3 text-center">Chưa có gói nào bị hủy.</p>
          ) : (
            <div className="space-y-3">
              {cancelReasons.map((r) => (
                <div key={r.reason}>
                  <div className="flex justify-between text-bark-800 font-medium mb-1">
                    <span className="line-clamp-1">{r.reason}</span>
                    <span className="font-bold text-pine-900 shrink-0 ml-2">{r.count} khách</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full bg-pine-800 rounded-full" style={{ width: `${(r.count / Math.max(...cancelReasons.map((x) => x.count))) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <h3 className="font-bold text-pine-950 text-sm">Top 5 Sản phẩm Hiệu quả nhất</h3>
        {topProducts.length === 0 ? (
          <p className="text-xs text-bark-500 py-4 text-center">Chưa có dữ liệu bán hàng.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">Tuyển vào Box</th>
                  <th className="p-3">Bán lẻ Shop</th>
                  <th className="p-3">Tổng doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-bark-700">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3 font-semibold text-pine-950 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-pine-100 text-pine-900 text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                      <span>{p.name}</span>
                    </td>
                    <td className="p-3 font-medium text-bark-900">{p.boxCount} lượt</td>
                    <td className="p-3 font-medium text-bark-900">{p.retailCount} món</td>
                    <td className="p-3 font-bold text-grass-800">{formatVND(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
