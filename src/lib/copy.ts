// Câu chữ dùng chung toàn site, để mọi trang nói cùng một chính sách (SPEC §3, §10).
// Sửa ở đây thay vì viết lại ở từng trang.

// Chính sách đổi món Mystery Box (SPEC §10)
export const EXCHANGE_POLICY =
  "FPETS đổi món miễn phí khi lỗi thuộc về shop (món chứa thành phần dị ứng đã khai, hàng hỏng hoặc hết hạn, giao thiếu). Báo trong 3 ngày sau khi nhận; FPETS sẽ liên hệ qua điện thoại hoặc Zalo để nhận ảnh/video mở hộp. Mystery Box không đổi trả vì bé không thích món.";

// Bé chưa thích một món: nói theo hướng tích cực nhưng vẫn ghi rõ là không đổi trả vì lý do này.
// Dùng ở FAQ, trang chính sách đổi trả, trang chủ và trang chi tiết hộp.
export const DISLIKE_POLICY =
  "Mỗi hộp đã được loại các món chứa thành phần bé dị ứng. Nếu bé chưa mê món nào, bạn chấm “Không thích” cho món đó để FPETS không gửi lại ở hộp sau. Mystery Box không đổi trả vì bé không thích món; món sai dị ứng, hỏng hoặc giao thiếu được đổi miễn phí.";
export const DISLIKE_POLICY_SHORT = "Không đổi trả vì lý do này. Chấm “Không thích” để FPETS không gửi lại món đó ở hộp sau.";

// Gói định kỳ (SPEC §5): trả trước, không tự trừ tiền; hủy thì không hoàn tiền, hộp đã trả vẫn giao đủ.
export const NO_AUTO_CHARGE = "Trả trước một lần, FPETS không lưu thẻ và không tự trừ tiền; hết gói bạn chủ động gia hạn.";
export const CANCEL_POLICY =
  "Bạn hủy gói bất kỳ lúc nào trong tài khoản. Khi hủy, FPETS ngừng nhắc gia hạn; các hộp đã trả trước vẫn được giao đủ theo lịch và không hoàn tiền.";

// COD (SPEC §6): hệ thống nhận COD khi tổng đơn không vượt 2.000.000₫ (checkout_create_order chặn đơn trên mức này)
export const COD_RULE = "đơn mua 1 lần không quá 2.000.000₫";
export const COD_MAX_AMOUNT = 2000000;
export const COD_OVER_LIMIT = "Đơn trên 2.000.000₫ không hỗ trợ thanh toán khi nhận hàng (COD). Vui lòng chọn chuyển khoản VietQR (payOS).";

// Thanh toán (SPEC §6, chốt 08/10/2026): chuyển khoản VietQR qua payOS hoặc COD
export const ONLINE_PAYMENT = "chuyển khoản ngân hàng bằng mã VietQR (qua payOS)";
export const PAYMENT_METHODS_SHORT = "Chuyển khoản VietQR (payOS) hoặc COD";

// Pet Quiz (SPEC §3: không cần đăng nhập)
export const QUIZ_NAME = "Pet Quiz";
export const QUIZ_LENGTH = "7 câu, khoảng 2 phút";

// Số món theo loại box (SPEC §3)
export const STANDARD_ITEMS = "4–5 món";
export const PREMIUM_ITEMS = "7–8 món";
