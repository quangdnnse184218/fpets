// Giá 1 hộp khi mua theo gói: giảm theo % của gói rồi làm tròn đến 1.000₫
// (269.100₫ → 269.000₫). Khớp hàm plan_unit_price ở database, nơi tính số tiền thật.
export function planUnitPrice(basePrice: number, discountPercent: number): number {
  return Math.round((basePrice * (1 - discountPercent / 100)) / 1000) * 1000;
}

export function planTotalPrice(basePrice: number, discountPercent: number, cycles: number): number {
  return planUnitPrice(basePrice, discountPercent) * cycles;
}
