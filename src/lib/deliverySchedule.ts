import { formatDate } from "@/lib/formatters";

// Lịch giao gói định kỳ (SPEC §5) – bản hiển thị của public.next_delivery_window ở server.
// Đầu tháng: giao ngày 1–5; giữa tháng: giao ngày 15–20. Ngày chốt = 7 ngày trước ngày đầu đợt.
export type DeliverySchedule = "dau_thang" | "giua_thang";

export const SCHEDULE_LABEL: Record<DeliverySchedule, string> = {
  dau_thang: "Đầu tháng (ngày 1–5)",
  giua_thang: "Giữa tháng (ngày 15–20)",
};

const WINDOW: Record<DeliverySchedule, [number, number]> = { dau_thang: [1, 5], giua_thang: [15, 20] };
const CUTOFF_DAYS = 7;

// Ngày hôm nay theo giờ Việt Nam (tránh lệch ngày khi máy khách để múi giờ khác)
function todayVN(): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Đợt giao gần nhất mà ngày chốt chưa qua, giống hàm server next_delivery_window */
export function nextDeliveryWindow(schedule: DeliverySchedule, from: Date = todayVN()) {
  const startDay = WINDOW[schedule][0];
  for (let i = 0; i < 3; i++) {
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, startDay));
    const cutoff = new Date(start.getTime() - CUTOFF_DAYS * 86400000);
    if (cutoff.getTime() >= from.getTime()) return { start, cutoff };
  }
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 2, startDay));
  return { start, cutoff: new Date(start.getTime() - CUTOFF_DAYS * 86400000) };
}

/** "01–05/11/2026" cho một ngày giao lưu trong DB (next_delivery_date = ngày đầu đợt) */
export function deliveryWindowLabel(startDate: string | Date, schedule: DeliverySchedule): string {
  const d = new Date(startDate);
  const [, endDay] = WINDOW[schedule];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), endDay));
  return `${dd}–${formatDate(end)}`;
}

export function cutoffOf(startDate: string | Date): Date {
  return new Date(new Date(startDate).getTime() - CUTOFF_DAYS * 86400000);
}
