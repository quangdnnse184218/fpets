import { formatDate } from "@/lib/formatters";

// Lịch giao gói định kỳ (SPEC §5) – bản hiển thị của các hàm lịch ở server.
// Hộp 1 gửi ngay sau khi thanh toán. Từ hộp 2 giao theo đợt: đầu tháng (ngày 1–5) hoặc giữa tháng (ngày 15–20);
// hộp 2 rơi vào đợt đầu tiên cách ngày đăng ký ít nhất 20 ngày, các hộp sau cách nhau 1 tháng.
// Ngày chốt = 7 ngày trước ngày đầu đợt.
export type DeliverySchedule = "dau_thang" | "giua_thang";

export const SCHEDULE_LABEL: Record<DeliverySchedule, string> = {
  dau_thang: "Đầu tháng (ngày 1–5)",
  giua_thang: "Giữa tháng (ngày 15–20)",
};

const WINDOW: Record<DeliverySchedule, [number, number]> = { dau_thang: [1, 5], giua_thang: [15, 20] };
const CUTOFF_DAYS = 7;
// Hộp 2 cách hộp 1 (gửi ngay) ít nhất ngần này ngày — khớp public.second_delivery_window
const SECOND_BOX_MIN_GAP_DAYS = 20;
const DAY_MS = 86400000;

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

/** Đợt giao của hộp thứ 2 nếu đăng ký vào ngày `from`, giống hàm server second_delivery_window */
export function secondDeliveryWindow(schedule: DeliverySchedule, from: Date = todayVN()) {
  const startDay = WINDOW[schedule][0];
  const earliest = from.getTime() + SECOND_BOX_MIN_GAP_DAYS * DAY_MS;
  let start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), startDay));
  for (let i = 0; i < 4; i++) {
    start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, startDay));
    if (start.getTime() >= earliest) break;
  }
  return { start, cutoff: new Date(start.getTime() - CUTOFF_DAYS * DAY_MS) };
}

/** Đợt giao nên gợi ý sẵn: đợt cho hộp 2 gần mốc "1 tháng sau hộp đầu" nhất */
export function recommendedSchedule(from: Date = todayVN()): DeliverySchedule {
  const target = from.getTime() + 30 * DAY_MS;
  const gap = (sc: DeliverySchedule) => Math.abs(secondDeliveryWindow(sc, from).start.getTime() - target);
  return gap("giua_thang") < gap("dau_thang") ? "giua_thang" : "dau_thang";
}

/**
 * Ngày bắt đầu đợt giao của các hộp từ thứ 2 trở đi khi đăng ký gói `cycles` hộp hôm nay
 * (hộp 1 gửi ngay nên không nằm trong danh sách). Phần tử cuối cùng +1 tháng là kỳ cần gia hạn.
 */
export function laterBoxWindows(schedule: DeliverySchedule, cycles: number, from: Date = todayVN()): Date[] {
  const second = secondDeliveryWindow(schedule, from).start;
  return Array.from({ length: Math.max(0, cycles - 1) }, (_, i) => new Date(Date.UTC(second.getUTCFullYear(), second.getUTCMonth() + i, second.getUTCDate())));
}

/** "01–05/11/2026" cho một ngày giao lưu trong DB (next_delivery_date = ngày đầu đợt) */
export function deliveryWindowLabel(startDate: string | Date, schedule: DeliverySchedule): string {
  const d = new Date(startDate);
  const [startDay, endDay] = WINDOW[schedule];
  // Ngày không trùng ngày đầu đợt (hộp đầu gửi ngay, chưa vào đợt): chỉ hiện ngày đó
  if (d.getUTCDate() !== startDay) return formatDate(d);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), endDay));
  return `${dd}–${formatDate(end)}`;
}

export function cutoffOf(startDate: string | Date): Date {
  return new Date(new Date(startDate).getTime() - CUTOFF_DAYS * 86400000);
}
