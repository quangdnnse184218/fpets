"use client";

import { createClient } from "@/lib/supabase/client";

// Số liệu tăng trưởng cho trang Tổng quan (admin): doanh thu và khách hàng mới theo ngày / tháng, giờ Việt Nam.
// Doanh thu = tiền đã thu (payment_status = paid), tính theo lúc thu tiền; đơn đã hoàn tiền không tính
// (cùng định nghĩa với trang Báo cáo). Khách mới = tài khoản vai trò khách hàng, theo ngày tạo.

export type GrowthRange = "7d" | "30d" | "12m";

export const GROWTH_RANGES: { id: GrowthRange; label: string; previousLabel: string }[] = [
  { id: "7d", label: "7 ngày", previousLabel: "7 ngày trước đó" },
  { id: "30d", label: "30 ngày", previousLabel: "30 ngày trước đó" },
  { id: "12m", label: "12 tháng", previousLabel: "12 tháng trước đó" },
];

export interface GrowthBucket {
  key: string; // YYYY-MM-DD hoặc YYYY-MM
  label: string; // nhãn trục: 08/10 hoặc T10
  longLabel: string; // trong tooltip, bảng: 08/10/2026 hoặc Tháng 10/2026
  revenue: number;
  newCustomers: number;
}

export interface GrowthData {
  buckets: GrowthBucket[];
  revenueTotal: number;
  revenuePrevious: number;
  customersTotal: number;
  customersPrevious: number;
}

const TZ = "Asia/Ho_Chi_Minh";
const VN_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const PAGE = 1000; // Supabase trả tối đa 1000 dòng mỗi lần

// Ngày theo giờ Việt Nam dạng YYYY-MM-DD
const vnDay = (d: Date) => VN_DATE.format(d);

// Cộng ngày / tháng trên chuỗi ngày (tính theo lịch, không phụ thuộc múi giờ máy)
function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function bucketKeys(range: GrowthRange, today: string): string[] {
  if (range === "12m") {
    const thisMonth = today.slice(0, 7);
    return Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, i - 11));
  }
  const n = range === "7d" ? 7 : 30;
  return Array.from({ length: n }, (_, i) => shiftDay(today, i - (n - 1)));
}

function labelsFor(key: string): { label: string; longLabel: string } {
  if (key.length === 7) {
    const [y, m] = key.split("-");
    return { label: `T${Number(m)}`, longLabel: `Tháng ${Number(m)}/${y}` };
  }
  const [y, m, d] = key.split("-");
  return { label: `${d}/${m}`, longLabel: `${d}/${m}/${y}` };
}

// Đọc hết các trang kết quả (bảng đơn có thể vượt 1000 dòng trong 12 tháng)
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function fetchGrowth(range: GrowthRange): Promise<GrowthData> {
  const supabase = createClient();
  const today = vnDay(new Date());
  const keys = bucketKeys(range, today);
  const monthly = range === "12m";

  // Kỳ trước có cùng độ dài, nằm ngay trước kỳ đang xem, để so sánh
  const firstDay = monthly ? `${keys[0]}-01` : keys[0];
  const previousStartDay = monthly ? `${shiftMonth(keys[0], -12)}-01` : shiftDay(keys[0], -keys.length);
  const since = new Date(`${previousStartDay}T00:00:00+07:00`).toISOString();

  const [orders, profiles] = await Promise.all([
    fetchAll<{ total_amount: number; paid_at: string | null; created_at: string }>((from, to) =>
      supabase
        .from("orders")
        .select("total_amount, paid_at, created_at")
        .eq("payment_status", "paid")
        .or(`paid_at.gte.${since},and(paid_at.is.null,created_at.gte.${since})`)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ created_at: string }>((from, to) =>
      supabase.from("profiles").select("created_at").eq("role", "customer").gte("created_at", since).order("id").range(from, to)
    ),
  ]);

  const index = new Map(keys.map((k, i) => [k, i]));
  const buckets: GrowthBucket[] = keys.map((key) => ({ key, ...labelsFor(key), revenue: 0, newCustomers: 0 }));
  const keyOf = (iso: string) => (monthly ? vnDay(new Date(iso)).slice(0, 7) : vnDay(new Date(iso)));
  const inPrevious = (iso: string) => {
    const day = vnDay(new Date(iso));
    return day >= previousStartDay && day < firstDay;
  };

  let revenuePrevious = 0;
  for (const o of orders) {
    const at = o.paid_at || o.created_at;
    const i = index.get(keyOf(at));
    if (i !== undefined) buckets[i].revenue += Number(o.total_amount) || 0;
    else if (inPrevious(at)) revenuePrevious += Number(o.total_amount) || 0;
  }

  let customersPrevious = 0;
  for (const p of profiles) {
    const i = index.get(keyOf(p.created_at));
    if (i !== undefined) buckets[i].newCustomers += 1;
    else if (inPrevious(p.created_at)) customersPrevious += 1;
  }

  return {
    buckets,
    revenueTotal: buckets.reduce((s, b) => s + b.revenue, 0),
    revenuePrevious,
    customersTotal: buckets.reduce((s, b) => s + b.newCustomers, 0),
    customersPrevious,
  };
}

// "tăng 12%" / "giảm 5%" / "bằng" so với kỳ trước; kỳ trước bằng 0 thì không tính được phần trăm
export function compareText(current: number, previous: number, previousLabel: string): string {
  if (previous === 0) return current === 0 ? `Bằng ${previousLabel}` : `${previousLabel} chưa có số liệu`;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return `Bằng ${previousLabel}`;
  return `${pct > 0 ? "Tăng" : "Giảm"} ${Math.abs(pct)}% so với ${previousLabel}`;
}
