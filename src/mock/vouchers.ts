export interface Voucher {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  typeLabel: string;
  discountValue: number; // số % hoặc số VND
  minOrderValue: number;
  maxDiscount?: number;
  usageLimitTotal: number;
  usageLimitPerUser: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  scope: 'all' | 'retail' | 'box' | 'first_subscription';
  scopeLabel: string;
  isActive: boolean;
  description: string;
}

export const MOCK_VOUCHERS: Voucher[] = [
  {
    id: "vouch-1",
    code: "WELCOME10",
    type: "percentage",
    typeLabel: "Giảm theo %",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 50000,
    usageLimitTotal: 1000,
    usageLimitPerUser: 1,
    usedCount: 245,
    validFrom: "01/01/2026",
    validTo: "31/12/2026",
    scope: "first_subscription",
    scopeLabel: "Gói định kỳ lần đầu",
    isActive: true,
    description: "Mã chào mừng khách hàng mới: Giảm 10% tối đa 50.000₫ cho đơn gói subscription đầu tiên."
  },
  {
    id: "vouch-2",
    code: "REVIEW20K",
    type: "fixed_amount",
    typeLabel: "Giảm tiền mặt",
    discountValue: 20000,
    minOrderValue: 150000,
    usageLimitTotal: 500,
    usageLimitPerUser: 1,
    usedCount: 88,
    validFrom: "01/08/2026",
    validTo: "31/10/2026",
    scope: "all",
    scopeLabel: "Toàn bộ đơn hàng",
    isActive: true,
    description: "Tặng khách hàng đánh giá unbox kèm hình ảnh thực tế của bé cưng."
  },
  {
    id: "vouch-3",
    code: "FREESHIPPET",
    type: "free_shipping",
    typeLabel: "Miễn phí vận chuyển",
    discountValue: 35000,
    minOrderValue: 300000,
    usageLimitTotal: 200,
    usageLimitPerUser: 2,
    usedCount: 164,
    validFrom: "01/09/2026",
    validTo: "30/09/2026",
    scope: "retail",
    scopeLabel: "Đơn mua lẻ",
    isActive: true,
    description: "Miễn phí vận chuyển tối đa 35.000₫ cho đơn hàng sản phẩm lẻ từ 300.000₫."
  },
  {
    id: "vouch-4",
    code: "TRUNGLUONG20",
    type: "percentage",
    typeLabel: "Giảm theo %",
    discountValue: 20,
    minOrderValue: 500000,
    maxDiscount: 100000,
    usageLimitTotal: 50,
    usageLimitPerUser: 1,
    usedCount: 50,
    validFrom: "01/09/2026",
    validTo: "15/09/2026",
    scope: "all",
    scopeLabel: "Toàn bộ đơn hàng",
    isActive: false,
    description: "Khuyến mãi Rằm Trung Thu cho thú cưng (Đã hết hạn/lượt dùng)."
  }
];
