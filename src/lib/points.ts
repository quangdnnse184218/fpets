// Tích điểm (chủ cửa hàng chốt 08/10/2026), khớp public._trg_orders_points và public._points_usable:
// mua 10.000₫ được 1 điểm, 1 điểm trừ 1.000₫ tiền hàng (không trừ phí ship), không giới hạn số điểm mỗi đơn,
// cộng khi đơn giao thành công (gói định kỳ: khi thanh toán xong), điểm không hết hạn.
export const VND_PER_EARNED_POINT = 10_000;
export const VND_PER_POINT = 1_000;

// Điểm sẽ được cộng cho số tiền hàng khách thật trả (tổng đơn trừ phí ship)
export const pointsEarnedFor = (goodsPaid: number) => Math.max(0, Math.floor(goodsPaid / VND_PER_EARNED_POINT));

// Số điểm dùng được cho một khoản tiền hàng: không quá số dư, không quá tiền hàng
export const usablePoints = (balance: number, goodsAmount: number) =>
  Math.max(0, Math.min(balance, Math.floor(Math.max(goodsAmount, 0) / VND_PER_POINT)));

export const POINTS_RULE = "Mua 10.000₫ được 1 điểm, mỗi điểm trừ 1.000₫ ở lần mua sau. Điểm cộng khi đơn giao thành công và không hết hạn.";

export const POINT_KIND_LABEL: Record<string, string> = {
  earn: "Tích điểm",
  redeem: "Dùng điểm",
  refund_redeem: "Trả lại điểm",
  revoke_earn: "Thu lại điểm",
  adjust: "Điều chỉnh",
};
