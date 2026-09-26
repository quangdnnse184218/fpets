// Bản sao hiển thị của public.calc_shipping_fee (SPEC §6): chỉ để khách xem trước,
// số tiền thật luôn do server tính lại khi tạo đơn.
export const FREE_SHIPPING_THRESHOLD = 500000;

export function isHcmProvince(province: string): boolean {
  const p = province.toLowerCase();
  return p.includes("hồ chí minh") || p.includes("tp.hcm") || p.includes("tphcm");
}

export function calcShippingFee(province: string, subtotal: number, freeShipping = false): number {
  if (subtotal <= 0) return 0;
  if (freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return isHcmProvince(province) ? 25000 : 35000;
}
