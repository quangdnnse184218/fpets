import { formatVND } from "@/lib/formatters";
import { planUnitPrice } from "@/lib/pricing";

// Câu chữ về mức giảm của gói định kỳ, sinh từ MỘT nguồn: bảng subscription_plans.
// Trang chủ, trang Gói định kỳ, giỏ hàng, FAQ, trang hộp đều gọi các hàm này nên luôn khớp nhau.

export interface PlanLite {
  cycles: number;
  discountPercent: number;
  freeShipping: boolean;
  birthdayGift: boolean;
}

// Giá trị hiển thị trong lúc chờ tải gói từ DB (trùng dữ liệu gốc của bảng subscription_plans, SPEC §5)
export const DEFAULT_PLANS: PlanLite[] = [
  { cycles: 1, discountPercent: 0, freeShipping: false, birthdayGift: false },
  { cycles: 3, discountPercent: 10, freeShipping: true, birthdayGift: false },
  { cycles: 6, discountPercent: 15, freeShipping: true, birthdayGift: true },
];

const byCycles = (plans: PlanLite[]) => [...plans].sort((a, b) => a.cycles - b.cycles);
const discounted = (plans: PlanLite[]) => byCycles(plans).filter((p) => p.discountPercent > 0);
const joinVi = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} và ${parts[parts.length - 1]}`);

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Số tiền tiết kiệm của cả gói so với mua lẻ từng hộp */
export function planSavings(basePrice: number, plan: PlanLite): number {
  return (basePrice - planUnitPrice(basePrice, plan.discountPercent)) * plan.cycles;
}

/** "10–15%" */
export function discountRange(plans: PlanLite[]): string {
  const values = discounted(plans).map((p) => p.discountPercent);
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}%` : `${min}–${max}%`;
}

/** "gói 3 hộp giảm 10% và gói 6 hộp giảm 15%" */
export function discountSentence(plans: PlanLite[]): string {
  return joinVi(discounted(plans).map((p) => `gói ${p.cycles} hộp giảm ${p.discountPercent}%`));
}

/** "gói 3 hộp tiết kiệm 90.000₫ và gói 6 hộp tiết kiệm 270.000₫" (tính trên một giá hộp cụ thể) */
export function savingsSentence(plans: PlanLite[], basePrice: number): string {
  return joinVi(discounted(plans).map((p) => `gói ${p.cycles} hộp tiết kiệm ${formatVND(planSavings(basePrice, p))}`));
}

/** "Gói 1 hộp (giá gốc), Gói 3 hộp (giảm 10%, miễn phí vận chuyển) và Gói 6 hộp (giảm 15%, miễn phí vận chuyển, kèm quà sinh nhật cho bé)" */
export function planListSentence(plans: PlanLite[]): string {
  return joinVi(
    byCycles(plans).map((p) => {
      const perks = [
        p.discountPercent > 0 ? `giảm ${p.discountPercent}%` : "giá gốc",
        p.freeShipping ? "miễn phí vận chuyển" : "",
        p.birthdayGift ? "kèm quà sinh nhật cho bé" : "",
      ].filter(Boolean);
      return `Gói ${p.cycles} hộp (${perks.join(", ")})`;
    })
  );
}

/** Gói có miễn phí vận chuyển: "gói 3, 6 hộp" */
export function freeShippingPlans(plans: PlanLite[]): string {
  const cycles = byCycles(plans).filter((p) => p.freeShipping).map((p) => p.cycles);
  return cycles.length ? `gói ${cycles.join(", ")} hộp` : "";
}
