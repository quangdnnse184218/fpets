-- Phương thức thanh toán payOS (chuyển khoản VietQR, payOS báo về khi tiền vào). Thay MoMo/VNPay giả lập.
-- Giá trị enum mới phải được commit trước khi dùng, nên tách riêng; phần nghiệp vụ ở migration kế tiếp.
-- Giữ momo/vnpay trong enum cho các đơn cũ.
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'payos';
