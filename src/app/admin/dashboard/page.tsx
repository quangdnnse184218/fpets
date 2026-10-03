"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatVND } from "@/lib/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, OrderStatus } from "@/lib/orderDisplay";
import { ADMIN_TASK_ITEMS, useAdminTasks } from "../AdminTasks";

interface DashboardStats {
  revenue_today: number;
  revenue_month: number;
  orders_month: number;
  subs_active: number;
  subs_paused: number;
  subs_new_month: number;
  subs_cancelled_month: number;
  status_counts: Partial<Record<OrderStatus, number>>;
}

interface RecentOrder {
  id: string;
  order_code: string;
  order_type: string;
  status: OrderStatus;
  total_amount: number;
  recipient_name: string;
  created_at: string;
}

const STATUS_ORDER: OrderStatus[] = ["da_xac_nhan", "dang_chuan_bi", "dang_giao", "da_giao", "doi_tra", "da_huy"];

const TYPE_SHORT: Record<string, string> = {
  retail: "Lẻ",
  mystery_box: "Mystery Box",
  subscription_initial: "Đăng ký gói",
  subscription_renewal: "Gia hạn gói",
  subscription_cycle: "Hộp theo gói",
};

const card = "rounded-container bg-surface-card border border-surface-border";
const LONG_DATE = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const MONTH = new Intl.DateTimeFormat("vi-VN", { month: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

export default function AdminDashboardPage() {
  const { counts, refresh: refreshTasks } = useAdminTasks();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error: statsError }, { data: orders }] = await Promise.all([
      supabase.rpc("admin_dashboard_stats"),
      supabase
        .from("orders")
        .select("id, order_code, order_type, status, total_amount, recipient_name, created_at")
        .neq("status", "cho_thanh_toan")
        .neq("order_type", "subscription_cycle")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    setError(!!statsError);
    if (data) setStats(data as unknown as DashboardStats);
    setRecent((orders as RecentOrder[]) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshTasks()]);
    setRefreshing(false);
  };

  const now = new Date();
  const monthLabel = `tháng ${MONTH.format(now)}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display">Tổng quan</h1>
          <p className="text-xs text-bark-500 first-letter:uppercase">{LONG_DATE.format(now)}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-box bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border text-xs font-semibold transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          Không tải được số liệu tổng quan. Bấm Làm mới để thử lại.
        </p>
      )}

      {/* Chỉ số chính */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Kpi label="Doanh thu hôm nay" value={stats ? formatVND(stats.revenue_today) : null} note="Tiền đã thu" />
        <Kpi label={`Doanh thu ${monthLabel}`} value={stats ? formatVND(stats.revenue_month) : null} note={stats ? `${stats.orders_month} đơn trong tháng` : ""} />
        <Kpi
          label="Gói định kỳ đang chạy"
          value={stats ? `${stats.subs_active} gói` : null}
          note={stats ? `${stats.subs_paused} tạm dừng · ${stats.subs_new_month} mới · ${stats.subs_cancelled_month} hủy trong tháng` : ""}
          href="/admin/subscriptions"
        />
        <Kpi label="Đơn mới hôm nay" value={`${counts.orders_today} đơn`} note={`${counts.orders_in_transit} đơn đang giao`} href="/admin/orders" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 items-start">
        {/* Việc cần xử lý: cùng nguồn với chuông thông báo */}
        <section aria-labelledby="tasks-heading" className={`${card} lg:col-span-3`}>
          <h2 id="tasks-heading" className="px-4 sm:px-5 py-3.5 border-b border-surface-border text-sm font-bold text-pine-950">
            Việc cần xử lý
          </h2>
          <ul className="divide-y divide-surface-border">
            {ADMIN_TASK_ITEMS.map((t) => {
              const n = counts[t.key];
              return (
                <li key={t.key}>
                  <Link href={t.href} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-surface-muted/60 transition-colors">
                    <span className={`flex-1 text-xs ${n > 0 ? "font-semibold text-pine-950" : "text-bark-500"}`}>{t.label}</span>
                    <span
                      className={`min-w-8 h-6 px-2 rounded-full text-xs font-extrabold flex items-center justify-center ${
                        n === 0 ? "bg-surface-muted text-bark-400" : t.actionable ? "bg-honey-100 text-honey-800" : "bg-pine-50 text-pine-900"
                      }`}
                    >
                      {n}
                    </span>
                    <ChevronRight className="w-4 h-4 text-bark-400 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Đơn giao hàng theo trạng thái (không tính biên nhận thanh toán gói) */}
        <section aria-labelledby="status-heading" className={`${card} lg:col-span-2`}>
          <div className="px-4 sm:px-5 py-3.5 border-b border-surface-border flex items-center justify-between gap-2">
            <h2 id="status-heading" className="text-sm font-bold text-pine-950">Đơn giao hàng theo trạng thái</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-pine-900 hover:underline shrink-0">Tất cả đơn</Link>
          </div>
          <ul className="divide-y divide-surface-border">
            {STATUS_ORDER.map((s) => (
              <li key={s}>
                <Link href={`/admin/orders?status=${s}`} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 hover:bg-surface-muted/60 transition-colors">
                  <span className={`px-2 py-0.5 rounded-tag border text-[11px] font-bold ${ORDER_STATUS_STYLE[s]}`}>{ORDER_STATUS_LABEL[s]}</span>
                  <span className="text-sm font-extrabold text-pine-950 tabular-nums">{stats ? stats.status_counts[s] || 0 : "–"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="recent-heading" className={card}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-surface-border flex items-center justify-between gap-2">
          <h2 id="recent-heading" className="text-sm font-bold text-pine-950">Đơn mới nhất</h2>
          <Link href="/admin/orders" className="text-xs font-bold text-pine-900 hover:underline">Xem tất cả</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-bark-500">Chưa có đơn hàng.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(o.order_code)}&type=all`}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[10rem_1fr_7rem_6.5rem] items-center gap-x-3 gap-y-1 px-4 sm:px-5 py-3 hover:bg-surface-muted/60 transition-colors text-xs"
                >
                  <span className="font-mono font-bold text-pine-950">{o.order_code}</span>
                  <span className="text-bark-700 truncate order-3 sm:order-none col-span-2 sm:col-span-1">
                    {o.recipient_name} · {TYPE_SHORT[o.order_type] || o.order_type} · {formatDateTime(o.created_at)}
                  </span>
                  <span className="font-bold text-pine-950 text-right tabular-nums order-2 sm:order-none">{formatVND(o.total_amount)}</span>
                  <span className={`hidden sm:inline-flex justify-center px-2 py-0.5 rounded-tag border text-[11px] font-bold ${ORDER_STATUS_STYLE[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, note, href }: { label: string; value: string | null; note?: string; href?: string }) {
  const body = (
    <>
      <span className="text-[11px] font-medium text-bark-500 block truncate">{label}</span>
      {value === null ? (
        <span className="block h-6 w-24 mt-1.5 rounded bg-surface-muted animate-pulse" aria-hidden="true" />
      ) : (
        <span className="block text-base sm:text-xl font-extrabold text-pine-950 font-display truncate mt-1">{value}</span>
      )}
      {note && <span className="block text-[11px] text-bark-500 mt-1 line-clamp-2">{note}</span>}
    </>
  );
  const cls = "p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border";
  return href ? (
    <Link href={href} className={`${cls} hover:border-pine-800/40 transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
