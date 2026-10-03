"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";

interface MonthBucket {
  label: string;
  value: number;
}
interface RetailRow {
  name: string;
  quantity: number;
  revenue: number;
}
interface BoxItemRow {
  name: string;
  count: number;
}
interface CancelReason {
  reason: string;
  count: number;
}

const TZ = "Asia/Ho_Chi_Minh";
const YEAR_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" });
const MONTH_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "numeric" });

const SUB_ROWS = [
  { key: "dang_hoat_dong", label: "Đang hoạt động", color: "bg-grass-600" },
  { key: "tam_dung", label: "Tạm dừng", color: "bg-honey-500" },
  { key: "qua_han", label: "Hết hộp, chờ gia hạn", color: "bg-amber-500" },
  { key: "het_han", label: "Đã kết thúc", color: "bg-bark-300" },
  { key: "da_huy", label: "Đã hủy", color: "bg-red-400" },
] as const;

const card = "p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-4";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [year] = useState(() => Number(YEAR_FMT.format(new Date())));
  const [monthly, setMonthly] = useState<MonthBucket[]>([]);
  const [retailTop, setRetailTop] = useState<RetailRow[]>([]);
  const [boxTop, setBoxTop] = useState<BoxItemRow[]>([]);
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([]);
  const [ytd, setYtd] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const yearStart = new Date(`${year}-01-01T00:00:00+07:00`).toISOString();

    const [{ data: paid }, { data: retailItems }, { data: boxItems }, { data: subs }] = await Promise.all([
      // Doanh thu = tiền đã thu, tính theo lúc thu tiền (đơn đã hoàn tiền không tính)
      supabase.from("orders").select("total_amount, paid_at, created_at").eq("payment_status", "paid").gte("created_at", yearStart).limit(10000),
      // Bán lẻ: chỉ đơn đã xác nhận trở đi, bỏ đơn hủy / chưa thanh toán
      supabase
        .from("order_items")
        .select("product_name_snapshot, quantity, total_price, orders!inner(status, created_at)")
        .not("product_id", "is", null)
        .not("orders.status", "in", "(da_huy,cho_thanh_toan)")
        .gte("orders.created_at", yearStart)
        .limit(10000),
      // Món thật trong các hộp đã tuyển chọn
      supabase.from("box_curation_items").select("quantity, products(name), box_curations!inner(status, curated_at)").eq("box_curations.status", "curated").gte("box_curations.curated_at", yearStart).limit(10000),
      supabase.from("subscriptions").select("status, cancellation_reason"),
    ]);

    const buckets = new Array(12).fill(0) as number[];
    (paid || []).forEach((o) => {
      const at = new Date(o.paid_at || o.created_at);
      if (Number(YEAR_FMT.format(at)) !== year) return;
      buckets[Number(MONTH_FMT.format(at)) - 1] += o.total_amount;
    });
    const months = Number(MONTH_FMT.format(new Date()));
    setMonthly(buckets.slice(0, months).map((value, i) => ({ label: `T${i + 1}`, value })));
    setYtd(buckets.reduce((s, v) => s + v, 0));

    const retail = new Map<string, RetailRow>();
    ((retailItems as unknown as { product_name_snapshot: string; quantity: number; total_price: number }[]) || []).forEach((it) => {
      const cur = retail.get(it.product_name_snapshot) || { name: it.product_name_snapshot, quantity: 0, revenue: 0 };
      cur.quantity += it.quantity;
      cur.revenue += it.total_price;
      retail.set(it.product_name_snapshot, cur);
    });
    setRetailTop(Array.from(retail.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5));

    const inBox = new Map<string, number>();
    ((boxItems as unknown as { quantity: number; products: { name: string } | null }[]) || []).forEach((it) => {
      const name = it.products?.name || "Sản phẩm đã xóa";
      inBox.set(name, (inBox.get(name) || 0) + it.quantity);
    });
    setBoxTop(Array.from(inBox.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

    const counts: Record<string, number> = {};
    const reasons = new Map<string, number>();
    (subs || []).forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
      // Gói không thanh toán khi đăng ký không phải khách hủy
      if (s.status === "da_huy" && s.cancellation_reason && s.cancellation_reason !== "Không thanh toán khi đăng ký") {
        reasons.set(s.cancellation_reason, (reasons.get(s.cancellation_reason) || 0) + 1);
      }
    });
    setSubCounts(counts);
    setCancelReasons(Array.from(reasons.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const rows: string[][] = [
      ["Tháng", "Doanh thu (VND)"],
      ...monthly.map((m) => [m.label, String(m.value)]),
      [],
      ["Sản phẩm bán lẻ", "Số lượng", "Doanh thu (VND)"],
      ...retailTop.map((p) => [p.name, String(p.quantity), String(p.revenue)]),
      [],
      ["Món trong hộp", "Số lượt"],
      ...boxTop.map((p) => [p.name, String(p.count)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `FPETS_bao_cao_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonth = Math.max(1, ...monthly.map((m) => m.value));
  const relevantSubs = SUB_ROWS.reduce((s, r) => s + (subCounts[r.key] || 0), 0);
  const subsBase = relevantSubs || 1;

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải báo cáo…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Báo cáo</h1>
          <p className="text-xs text-bark-500">Doanh thu năm {year}, gói định kỳ và sản phẩm. Số liệu tính theo giờ Việt Nam.</p>
        </div>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors">
          <Download className="w-3.5 h-3.5" /> Xuất file Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <Stat label={`Doanh thu năm ${year}`} value={formatVND(ytd)} />
        <Stat label="Gói đang hoạt động" value={`${subCounts.dang_hoat_dong || 0} gói`} />
        <Stat label="Gói chờ gia hạn" value={`${subCounts.qua_han || 0} gói`} />
        <Stat label="Gói đã hủy" value={`${(subCounts.da_huy || 0)} gói`} />
      </div>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-pine-950 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-pine-800" /> Doanh thu theo tháng</h2>
          <span className="text-[11px] text-bark-500">Đơn vị: ₫</span>
        </div>
        {monthly.every((m) => m.value === 0) ? (
          <p className="text-xs text-bark-500 py-8 text-center">Chưa có doanh thu trong năm {year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="h-52 flex items-end gap-2 sm:gap-4 px-1 border-b border-surface-border min-w-[480px]">
              {monthly.map((m) => (
                <div key={m.label} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-pine-900 tabular-nums">{m.value > 0 ? `${Math.round(m.value / 100000) / 10}tr` : ""}</span>
                  <div className="w-full max-w-[40px] rounded-t-sm bg-pine-800" style={{ height: `${Math.round((m.value / maxMonth) * 85)}%` }} title={formatVND(m.value)} />
                  <span className="text-[11px] font-semibold text-bark-600">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <section className={`${card} text-xs`}>
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h2 className="font-bold text-pine-950 text-sm">Gói định kỳ theo trạng thái</h2>
            <span className="text-bark-500 text-[11px]">{relevantSubs} gói</span>
          </div>
          <div className="space-y-3">
            {SUB_ROWS.map((row) => {
              const n = subCounts[row.key] || 0;
              return (
                <div key={row.key}>
                  <div className="flex justify-between text-bark-800 font-semibold mb-1">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{n} ({Math.round((n / subsBase) * 100)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`} style={{ width: `${(n / subsBase) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${card} text-xs`}>
          <h2 className="font-bold text-pine-950 text-sm pb-2 border-b border-surface-border">Lý do hủy gói</h2>
          {cancelReasons.length === 0 ? (
            <p className="text-bark-500 py-3 text-center">Chưa có khách nào hủy gói.</p>
          ) : (
            <ul className="space-y-2">
              {cancelReasons.map((r) => (
                <li key={r.reason} className="flex justify-between gap-3">
                  <span className="text-bark-800">{r.reason}</span>
                  <span className="font-bold text-pine-950 shrink-0">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <section className={`${card} text-xs`}>
          <h2 className="font-bold text-pine-950 text-sm">Bán lẻ chạy nhất</h2>
          {retailTop.length === 0 ? (
            <p className="text-bark-500 py-4 text-center">Chưa có đơn bán lẻ.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-[11px] text-bark-500 border-b border-surface-border">
                <tr><th className="py-2 font-semibold">Sản phẩm</th><th className="py-2 font-semibold text-right">SL</th><th className="py-2 font-semibold text-right">Doanh thu</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {retailTop.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-2 text-pine-950 font-semibold">{p.name}</td>
                    <td className="py-2 text-right tabular-nums">{p.quantity}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{formatVND(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={`${card} text-xs`}>
          <h2 className="font-bold text-pine-950 text-sm">Món dùng nhiều trong hộp</h2>
          {boxTop.length === 0 ? (
            <p className="text-bark-500 py-4 text-center">Chưa có hộp nào được tuyển chọn.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-[11px] text-bark-500 border-b border-surface-border">
                <tr><th className="py-2 font-semibold">Sản phẩm</th><th className="py-2 font-semibold text-right">Số hộp</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {boxTop.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-2 text-pine-950 font-semibold">{p.name}</td>
                    <td className="py-2 text-right tabular-nums font-bold">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border">
      <span className="text-bark-500 text-[11px] block mb-1">{label}</span>
      <span className="font-extrabold text-pine-950 text-base sm:text-xl font-display truncate block">{value}</span>
    </div>
  );
}
