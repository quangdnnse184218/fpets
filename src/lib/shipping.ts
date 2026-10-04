import { formatVND } from "@/lib/formatters";
import { BUSINESS } from "@/config/business";

// Chính sách vận chuyển (SPEC §6) – nguồn duy nhất cho giỏ hàng, checkout và mọi câu chữ trên site.
// Bản sao hiển thị của public.calc_shipping_fee: số tiền thật luôn do server tính lại khi tạo đơn.
export const SHIPPING_CONFIG = {
  hcmFee: 25000,
  otherFee: 35000,
  freeShippingThreshold: 500000,
  deliveryDaysHcm: "1–2 ngày",
  deliveryDaysOther: "3–5 ngày",
} as const;

// Một câu chính sách dùng lại ở mọi nơi.
// Phí tính theo tỉnh/thành của địa chỉ nhận (địa chỉ không có cấp quận): mọi địa chỉ tại TP.HCM cùng một mức.
export const SHIPPING_POLICY = `Phí ship ${formatVND(SHIPPING_CONFIG.hcmFee)} tại TP.HCM, ${formatVND(SHIPPING_CONFIG.otherFee)} tỉnh thành khác. Miễn phí cho đơn từ ${formatVND(SHIPPING_CONFIG.freeShippingThreshold)} và gói 3, 6 hộp.`;
export const DELIVERY_DAYS = `${SHIPPING_CONFIG.deliveryDaysHcm} tại TP.HCM, ${SHIPPING_CONFIG.deliveryDaysOther} tỉnh thành khác`;
export const DELIVERY_TIME = `Giao ${DELIVERY_DAYS}.`;
// Nơi gửi hàng: chỉ hiện khi cửa hàng đã điền trong src/config/business.ts
export const SHIP_FROM = BUSINESS.shipFrom ? `Hàng gửi từ ${BUSINESS.shipFrom}.` : "";
// Câu đầy đủ về giao hàng: nơi gửi (nếu có), thời gian giao, phí ship
export const SHIPPING_SUMMARY = [SHIP_FROM, DELIVERY_TIME, SHIPPING_POLICY].filter(Boolean).join(" ");

export function isHcmProvince(province: string): boolean {
  const p = province.toLowerCase();
  return p.includes("hồ chí minh") || p.includes("tp.hcm") || p.includes("tphcm");
}

/**
 * Phí ship của một đơn. Chưa biết tỉnh (giỏ hàng) thì trả null nếu đơn chưa được miễn phí,
 * để giao diện hiện "tính theo địa chỉ" thay vì đoán sai một con số.
 */
export function calcShippingFee(province: string | null, subtotal: number, freeShipping = false): number | null {
  if (subtotal <= 0) return 0;
  if (freeShipping || subtotal >= SHIPPING_CONFIG.freeShippingThreshold) return 0;
  if (!province) return null;
  return isHcmProvince(province) ? SHIPPING_CONFIG.hcmFee : SHIPPING_CONFIG.otherFee;
}

export function formatShippingFee(fee: number | null): string {
  if (fee === null) return "Tính theo địa chỉ";
  return fee === 0 ? "Miễn phí" : formatVND(fee);
}
