# FPETS — Bối cảnh dự án

## Tổng quan
Web bán Mystery Box cho chó/mèo: hộp quà cá nhân hóa theo hồ sơ từng bé.
Mua lẻ 1 hộp hoặc gói định kỳ 1/3/6 hộp. Kèm shop bán lẻ và admin dashboard.
Dự án làm cho khách hàng thật. Tài liệu: docs/SPEC.md (nghiệp vụ), docs/PLAN.md (schema + task).

## Trạng thái hiện tại
- Giao diện người dùng và Admin hoàn chỉnh: 100% các trang khách hàng (/about, /faq, /contact, /subscription, /reviews) và các module Admin đã hoàn thiện giao diện, chuẩn vector icon từ Lucide.
- Đã nối Supabase Auth: Đăng ký, Đăng nhập, Quên mật khẩu hoạt động với Supabase Auth thật, bảo mật thông báo lỗi, tự động liên kết Profile.
- Phân quyền tối giản: Tinh gọn còn 2 vai trò chính (Super Admin & Customer) giúp vận hành đơn giản, bảo mật cao. Danh sách tài khoản mẫu lưu tại docs/tk,mk account.txt.
- Database: Bộ script SQL hoàn chỉnh (init_full_database.sql, seed.sql) đã sửa lỗi UUID, fix duplicate product IDs, đồng bộ auth.identities và token GoTrue tương thích hoàn toàn Supabase.
- Deploy: https://fpets.vercel.app (tự deploy khi push nhánh main), có cơ chế fallback an toàn khi thiếu biến môi trường.
- Repo: github.com/quangdnnse184218/fpets
- Supabase project: fpets, ref dmrcjuoxfbzepeyffxwn, region Singapore.

## Supabase Storage (đã tạo sẵn, KHÔNG tạo lại)
- product-images (public): product-images/<ten-file>.jpg
- pet-avatars (private): pet-avatars/<user_id>/<ten-file>.jpg
- review-photos (public): review-photos/<user_id>/<ten-file>.jpg

Giới hạn 5MB, chỉ jpeg/png/webp/avif. DB chỉ lưu đường dẫn text, không lưu ảnh nhị phân.

CẦN LÀM: siết quyền ghi product-images về chỉ admin (hiện đang mở cho mọi user đã đăng nhập).

## Quyết định nghiệp vụ đã chốt
1. Trừ tồn kho tạm khi đặt hàng, hoàn lại nếu quá 30 phút không thanh toán.
2. Khách vãng lai đăng ký trùng SĐT/email → tự gộp đơn cũ vào tài khoản mới.
3. Gia hạn ở kỳ cuối + chọn gói mới → tạo subscription mới nối tiếp, không thêm trạng thái.
4. Thanh toán: dựng Payment Gateway Mock trước, MoMo/VNPay sandbox sau.
5. Email giao dịch: Resend.
6. Hủy gói: vẫn giao hết hộp đã trả, không hoàn tiền.
7. Cut-off 7 ngày trước đợt giao. Pause tối đa 2 kỳ. Quá hạn có 5 ngày grace.
8. Vai trò người dùng: Giữ 2 vai trò cơ bản (admin: Quản trị viên toàn quyền, customer: Khách hàng) để tối ưu vận hành.

## Quy ước thiết kế (khách đã duyệt, đừng đổi)
- Font: Bricolage Grotesque (tiêu đề) + Be Vietnam Pro (nội dung), subset vietnamese.
- Màu: xanh rêu pine làm chủ đạo, cam honey dùng tiết kiệm.
- Logo: SVG inline trong src/components/common/BrandLogo.tsx (hộp quà + tai thú cưng).
- Icon: lucide-react, KHÔNG dùng emoji, KHÔNG dùng icon Sparkles.
- TRÁNH khuôn mẫu AI: không nhãn VIẾT HOA tracking rộng, không mũi tên → trong nút,
  không card bo góc + shadow giống hệt nhau khắp nơi, không badge trang trí vô nghĩa.
- Mobile-first, phải dùng tốt ở 375px.

## Bẫy đã gặp — đừng lặp lại
1. overflow-x: hidden trên html/body phá vỡ position: sticky toàn site. Dùng overflow-x: clip.
2. Chỉ chạy MỘT dev server. Hai server ghi đè .next gây lỗi
   "__webpack_modules__[moduleId] is not a function".
   Sửa: taskkill /F /IM node.exe, xóa .next, npm run dev lại.
3. Supabase KHÔNG cho tạo function trong schema auth. Dùng public.is_admin(), public.is_staff().
4. next/image dùng fill thì phần tử cha phải có chiều cao ở MỌI breakpoint, và luôn có prop sizes.
5. cart_items.pet_id phải ON DELETE CASCADE, không phải SET NULL.
6. Seed auth trong Supabase: Bắt buộc chèn vào cả auth.users và auth.identities, các trường token (confirmation_token, recovery_token, email_change_token_new/current) phải là chuỗi rỗng '' thay vì NULL để GoTrue không báo lỗi 500 Database Error.

## Còn phải làm
- Kết nối dữ liệu Supabase Database thật cho các trang người dùng: Pet Quiz & Pet Profile (Task 2), Shop & Mystery Box (Task 3), Giỏ hàng & Checkout (Task 4).
- Kết nối dữ liệu Supabase Database thật cho Admin Dashboard và các module CRUD (Task 5).
- Tích hợp cổng thanh toán Mock / MoMo / VNPay (Task 8).
- Tự động hóa Cron Jobs (Task 9), Review unbox & Voucher (Task 10), Email Resend & Báo cáo (Task 11).

## Ưu tiên bảo mật (web có tiền và dữ liệu khách thật)
- RLS phải test thật: giả lập user A truy vấn dữ liệu user B, phải bị chặn.
- Thanh toán: verify chữ ký ở server, không tin dữ liệu client.
- Giá, tồn kho, trạng thái đơn/gói: luôn tính và kiểm ở server.
