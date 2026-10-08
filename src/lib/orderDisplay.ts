// Nhãn và quy tắc hiển thị đơn hàng dùng chung cho tab Đơn hàng, trang chi tiết đơn và tra cứu đơn.

export type OrderStatus = "cho_thanh_toan" | "da_xac_nhan" | "dang_chuan_bi" | "dang_giao" | "da_giao" | "da_huy" | "doi_tra";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  da_xac_nhan: "Đã xác nhận",
  dang_chuan_bi: "Đang chuẩn bị",
  dang_giao: "Đang giao",
  da_giao: "Đã giao",
  da_huy: "Đã hủy",
  doi_tra: "Đổi / Trả",
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  cho_thanh_toan: "bg-amber-50 text-amber-800 border-amber-200",
  da_xac_nhan: "bg-surface-muted text-bark-700 border-surface-border",
  dang_chuan_bi: "bg-pine-50 text-pine-800 border-pine-200",
  dang_giao: "bg-honey-50 text-honey-700 border-honey-200",
  da_giao: "bg-grass-50 text-grass-700 border-grass-200",
  da_huy: "bg-red-50 text-red-700 border-red-200",
  doi_tra: "bg-honey-50 text-honey-700 border-honey-200",
};

// Các bước hiển thị trên timeline (SPEC §7)
export const ORDER_TIMELINE: { key: OrderStatus | "dat_hang"; label: string }[] = [
  { key: "dat_hang", label: "Đã đặt" },
  { key: "da_xac_nhan", label: "Xác nhận" },
  { key: "dang_chuan_bi", label: "Chuẩn bị" },
  { key: "dang_giao", label: "Đang giao" },
  { key: "da_giao", label: "Đã giao" },
];

export function timelineIndex(status: OrderStatus): number {
  if (status === "cho_thanh_toan") return 0;
  if (status === "doi_tra") return 4;
  return Math.max(0, ORDER_TIMELINE.findIndex((s) => s.key === status));
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  retail: "Sản phẩm lẻ",
  mystery_box: "Mystery Box",
  subscription_initial: "Thanh toán gói định kỳ",
  subscription_renewal: "Gia hạn gói định kỳ",
  subscription_cycle: "Hộp theo gói định kỳ",
};

// payOS: chuyển khoản ngân hàng bằng mã VietQR. MoMo/VNPay chỉ còn ở đơn cũ.
const METHOD_LABEL: Record<string, string> = { payos: "chuyển khoản VietQR (payOS)", momo: "MoMo", vnpay: "VNPay", cod: "COD" };

export function paymentText(method: string, paymentStatus: string, orderType: string): string {
  if (orderType === "subscription_cycle") return "Đã trả trước theo gói";
  if (method === "cod") return paymentStatus === "paid" ? "Đã thanh toán khi nhận hàng" : "Thanh toán khi nhận hàng (COD)";
  const name = METHOD_LABEL[method] || method;
  if (paymentStatus === "paid") return `Đã thanh toán qua ${name}`;
  if (paymentStatus === "refunded") return `Đã hoàn tiền qua ${name}`;
  return `Chờ thanh toán qua ${name}`;
}

export const PAYMENT_METHOD_NAME = METHOD_LABEL;

// SPEC §10: Mystery Box báo lỗi trong 3 ngày; đơn có sản phẩm lẻ (còn nguyên seal) được đổi trả trong 7 ngày.
// Tính từ lúc giao (delivered_at), mỗi đơn 1 lần — khớp request_order_return.
export const RETURN_WINDOW_DAYS = 3;
export const RETAIL_RETURN_WINDOW_DAYS = 7;

export function returnWindowDays(hasRetailItems: boolean): number {
  return hasRetailItems ? RETAIL_RETURN_WINDOW_DAYS : RETURN_WINDOW_DAYS;
}

export function returnDaysLeft(status: OrderStatus, deliveredAt: string | null, alreadyRequested = false, windowDays = RETURN_WINDOW_DAYS): number {
  if (status !== "da_giao" || !deliveredAt || alreadyRequested) return 0;
  const deadline = new Date(deliveredAt).getTime() + windowDays * 86400000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 86400000));
}

// SPEC §8: chỉ đơn "Đã giao" mới được đánh giá, trong vòng 30 ngày kể từ lúc giao (khớp policy reviews_own_insert)
export const REVIEW_WINDOW_DAYS = 30;
export const reviewDaysLeft = (status: OrderStatus, deliveredAt: string | null) =>
  returnDaysLeft(status, deliveredAt, false, REVIEW_WINDOW_DAYS);

// Tên dòng hàng Box đã gồm "(Dành cho bé X)"; bỏ đi để hiện 1 chip tên bé riêng
export const RETURN_RESOLUTION_LABEL: Record<"exchanged" | "refunded" | "rejected", string> = {
  exchanged: "Đổi món",
  refunded: "Hoàn tiền",
  rejected: "Từ chối",
};

export function cleanItemName(name: string): string {
  return name.replace(/\s*\((Dành cho )?bé [^)]*\)/gi, "").trim();
}
