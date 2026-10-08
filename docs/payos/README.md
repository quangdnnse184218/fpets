# Thanh toán payOS (chuyển khoản VietQR)

Đã tích hợp 08/10/2026. Hai hình thức thanh toán: **chuyển khoản VietQR qua payOS** và **COD** (gói định kỳ chỉ payOS).

## Luồng

1. Khách đặt hàng chọn chuyển khoản → sang `/checkout/pay/[orderId]`.
2. Trang gọi `POST /api/payos/create`: server kiểm khách là chủ đơn (`payos_prepare`), lấy số tiền và hạn thanh toán
   **từ database**, tạo yêu cầu thanh toán payOS (`orderCode` là số `payos_order_code`, nội dung chuyển khoản
   `FP` + 6 ký tự cuối mã đơn, hết hạn cùng lúc đơn tự hủy sau 30 phút), lưu dữ liệu mã vào cột `payos_qr`.
3. Trang **tự vẽ mã VietQR** (thư viện `qrcode`) kèm số tài khoản, chủ tài khoản, số tiền, nội dung. Khách không rời trang.
4. Khách chuyển khoản. Hai đường xác nhận, đường nào tới trước cũng được (hàm xác nhận gọi lặp lại vẫn an toàn):
   - payOS gọi **webhook** `POST /api/payos/webhook`: server kiểm chữ ký HMAC-SHA256 bằng checksum key rồi gọi
     `confirm_payos_payment(mã payOS, số tiền, mã giao dịch, khóa bí mật server)`.
   - Trang gọi `POST /api/payos/sync` mỗi 3 giây: server hỏi `GET /v2/payment-requests/{orderCode}` của payOS,
     thấy `PAID` thì gọi `confirm_payos_payment`.
5. Đơn được xác nhận → trang chuyển sang kết quả.

Khách tự hủy đơn thì `POST /api/payos/cancel` hủy luôn yêu cầu thanh toán bên payOS. Nếu tiền vẫn về cho đơn đã hủy
(hết hạn, hết hàng, gói đã kết thúc), đơn hủy được ghi "Đã thanh toán" để nhân viên hoàn tiền (nút "Đã hoàn tiền cho
khách" ở trang Đơn hàng). Chuyển thiếu tiền thì không xác nhận, admin và staff nhận thông báo.

## Bảo mật

- Trình duyệt không gọi được `confirm_order_payment` nữa; chỉ server xác nhận thanh toán.
- Webhook không có phiên đăng nhập nên không dùng khóa `service_role`: `confirm_payos_payment` chỉ chạy khi có đúng
  khóa bí mật `PAYOS_SERVER_SECRET`, trùng giá trị `payos_server_secret` trong bảng `app_secrets` (bật RLS, không có
  policy, không ai đọc được qua API).
- Khóa payOS chỉ nằm ở biến môi trường server, không xuống trình duyệt.

## Cấu hình

Biến môi trường (`.env.local` và Vercel, không commit): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`
(my.payos.vn → kênh thanh toán), `PAYOS_SERVER_SECRET` (chuỗi ngẫu nhiên 64 ký tự).

Đổi `PAYOS_SERVER_SECRET` thì cập nhật cả database:
`UPDATE public.app_secrets SET value = '<khóa mới>' WHERE name = 'payos_server_secret';`

Webhook URL đăng ký ở my.payos.vn: `https://fpets.vercel.app/api/payos/webhook`

Thiếu biến môi trường thì trang thanh toán báo "Cổng thanh toán đang bảo trì" (ví dụ project Vercel khác chưa cấu hình).

Tài liệu payOS: https://payos.vn/docs/api/ và https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/
