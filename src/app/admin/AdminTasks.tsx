"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Số việc đang chờ admin, tính ở server (RPC admin_task_counts) trong 1 lần gọi.
// Dùng chung cho chuông thông báo, số đếm trên menu và khối "Việc cần xử lý" ở Tổng quan.
export interface AdminTaskCounts {
  returns_pending: number;
  curation_pending: number;
  orders_to_prepare: number;
  orders_to_ship: number;
  orders_in_transit: number;
  feedback_new: number;
  reviews_unreplied: number;
  reviews_low_unreplied: number;
  low_stock: number;
  products_no_image: number;
  subs_overdue: number;
  subs_cutoff_soon: number;
  orders_today: number;
}

const EMPTY: AdminTaskCounts = {
  returns_pending: 0,
  curation_pending: 0,
  orders_to_prepare: 0,
  orders_to_ship: 0,
  orders_in_transit: 0,
  feedback_new: 0,
  reviews_unreplied: 0,
  reviews_low_unreplied: 0,
  low_stock: 0,
  products_no_image: 0,
  subs_overdue: 0,
  subs_cutoff_soon: 0,
  orders_today: 0,
};

export interface AdminTaskItem {
  key: keyof AdminTaskCounts;
  label: string;
  href: string;
  // false: chỉ để theo dõi, không tính vào số trên chuông
  actionable: boolean;
}

// Thứ tự = mức ưu tiên xử lý
export const ADMIN_TASK_ITEMS: AdminTaskItem[] = [
  { key: "returns_pending", label: "Yêu cầu đổi / trả chờ xử lý", href: "/admin/orders?status=doi_tra", actionable: true },
  { key: "curation_pending", label: "Hộp chờ tuyển chọn món", href: "/admin/box-curation", actionable: true },
  { key: "orders_to_prepare", label: "Đơn chờ đóng gói", href: "/admin/orders?status=da_xac_nhan", actionable: true },
  { key: "orders_to_ship", label: "Đơn chờ bàn giao vận chuyển", href: "/admin/orders?status=dang_chuan_bi", actionable: true },
  { key: "feedback_new", label: "Góp ý / liên hệ mới", href: "/admin/reviews?tab=feedback", actionable: true },
  { key: "reviews_unreplied", label: "Đánh giá chưa phản hồi", href: "/admin/reviews?filter=unreplied", actionable: true },
  { key: "low_stock", label: "Sản phẩm sắp hết hàng", href: "/admin/products?filter=low", actionable: true },
  { key: "products_no_image", label: "Sản phẩm chưa có ảnh", href: "/admin/products?filter=no_image", actionable: false },
  { key: "subs_overdue", label: "Gói hết hộp, chờ khách gia hạn", href: "/admin/subscriptions?status=qua_han", actionable: false },
  { key: "subs_cutoff_soon", label: "Gói đến ngày chốt trong 7 ngày", href: "/admin/subscriptions?filter=cutoff", actionable: false },
];

interface AdminTasksValue {
  counts: AdminTaskCounts;
  loaded: boolean;
  updatedAt: Date | null;
  refresh: () => Promise<void>;
}

const AdminTasksContext = createContext<AdminTasksValue>({ counts: EMPTY, loaded: false, updatedAt: null, refresh: async () => {} });

export const useAdminTasks = () => useContext(AdminTasksContext);

export const actionableTotal = (counts: AdminTaskCounts) =>
  ADMIN_TASK_ITEMS.filter((t) => t.actionable).reduce((sum, t) => sum + counts[t.key], 0);

const REFRESH_MS = 60_000;

export function AdminTasksProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminTaskCounts>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await createClient().rpc("admin_task_counts");
    if (error || !data) return;
    setCounts({ ...EMPTY, ...(data as Partial<AdminTaskCounts>) });
    setLoaded(true);
    setUpdatedAt(new Date());
  }, []);

  // Tải lại khi đổi trang (vừa xử lý xong việc), mỗi phút và khi quay lại tab
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return <AdminTasksContext.Provider value={{ counts, loaded, updatedAt, refresh }}>{children}</AdminTasksContext.Provider>;
}

const TIME = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });

/** Chuông "Việc cần xử lý" trên thanh trên cùng của trang quản trị */
export function AdminNotificationBell() {
  const { counts, loaded, updatedAt } = useAdminTasks();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = actionableTotal(counts);
  const items = ADMIN_TASK_ITEMS.filter((t) => counts[t.key] > 0);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={total > 0 ? `Việc cần xử lý: ${total}` : "Việc cần xử lý"}
        className={`relative w-9 h-9 flex items-center justify-center rounded-box border border-surface-border hover:bg-surface-muted transition-colors ${open ? "bg-pine-50 border-pine-300" : ""}`}
      >
        <Bell className="w-4 h-4 text-pine-950" />
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-honey-700 text-white text-[10px] font-extrabold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-surface-card rounded-container border border-surface-border shadow-xl z-50 text-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border flex items-baseline justify-between gap-2">
            <p className="font-bold text-pine-950 text-sm">Việc cần xử lý</p>
            {updatedAt && <span className="text-[11px] text-bark-500">Cập nhật {TIME.format(updatedAt)}</span>}
          </div>
          {!loaded ? (
            <p className="px-4 py-6 text-center text-bark-500">Đang tải…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-bark-500">Không có việc nào đang chờ.</p>
          ) : (
            <ul className="divide-y divide-surface-border max-h-80 overflow-y-auto">
              {items.map((t) => (
                <li key={t.key}>
                  <Link href={t.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors">
                    <span className={`min-w-7 h-6 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${t.actionable ? "bg-honey-100 text-honey-800" : "bg-surface-muted text-bark-700"}`}>
                      {counts[t.key]}
                    </span>
                    <span className="flex-1 font-semibold text-bark-800">{t.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-bark-400 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 py-2.5 border-t border-surface-border bg-surface-muted/60 text-[11px] text-bark-600 flex items-center justify-between">
            <span>Đơn mới hôm nay: <strong className="text-pine-950">{counts.orders_today}</strong></span>
            <Link href="/admin/dashboard" className="font-bold text-pine-900 hover:underline">Xem tổng quan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
