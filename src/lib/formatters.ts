/**
 * Định dạng tiền tệ VND theo quy ước: 299.000₫
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// Hiển thị theo giờ Việt Nam dù trình duyệt/máy chủ đặt múi giờ khác (AGENTS.md)
const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

/**
 * Ngày dạng dd/MM/yyyy, ví dụ 05/09/2026
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : DATE_FORMAT.format(d);
}

/**
 * Ngày giờ dạng HH:mm · dd/MM/yyyy (không hiện giây)
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : `${TIME_FORMAT.format(d)} · ${DATE_FORMAT.format(d)}`;
}
