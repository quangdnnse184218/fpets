# FPETS — Bối cảnh dự án

## Tổng quan
Web bán Mystery Box cho chó/mèo: hộp quà cá nhân hóa theo hồ sơ từng bé.
Mua lẻ 1 hộp hoặc gói định kỳ 1/3/6 hộp. Kèm shop bán lẻ và admin dashboard.
Dự án làm cho khách hàng thật. Tài liệu: docs/SPEC.md (nghiệp vụ), docs/PLAN.md (schema + task).

## Trạng thái hiện tại
- Toàn bộ trang khách và admin chạy trên dữ liệu Supabase thật (không còn src/mock).
- Đăng nhập: email/mật khẩu và Google (Supabase Auth). Chỉ 2 vai trò: admin, customer.
- Nghiệp vụ tính ở server bằng RPC SECURITY DEFINER (checkout_create_order, subscribe_to_box, renew_subscription...);
  cron chạy bằng pg_cron trong Supabase (không dùng Vercel Cron).
- Schema chỉ thay đổi qua supabase/migrations. Không lưu tài khoản/mật khẩu trong repo.
- Deploy: https://fpets.vercel.app (tự deploy khi push nhánh main).
- Repo: github.com/quangdnnse184218/fpets
- Supabase project: fpets, ref dmrcjuoxfbzepeyffxwn, region Singapore.

## Supabase Storage (đã tạo sẵn, KHÔNG tạo lại)
- product-images (public): product-images/<ten-file>.jpg
- pet-avatars (private): pet-avatars/<user_id>/<ten-file>.jpg
- review-photos (public): review-photos/<user_id>/<ten-file>.jpg

Giới hạn 5MB, chỉ jpeg/png/webp/avif. DB chỉ lưu đường dẫn text, không lưu ảnh nhị phân.

Chỉ admin được ghi/xóa product-images (migration 20260929000003).

## Quyết định nghiệp vụ đã chốt
Chi tiết đầy đủ nằm trong docs/SPEC.md; dưới đây là các điểm dễ nhầm.
1. Mọi đơn đều cần đăng nhập (không còn mua hàng kiểu khách vãng lai).
2. Giỏ hàng có ô tick: chỉ thanh toán các món đã tick, món chưa tick ở lại giỏ. "Mua ngay" chỉ tính món vừa bấm.
3. Một đơn chứa được nhiều Mystery Box, mỗi hộp gắn với một bé (không trùng cùng loại hộp cho cùng bé).
4. Gói định kỳ trả trước: hộp đầu tạo ngay khi thanh toán, hộp thứ 2 giao theo đợt cách ngày đăng ký ít nhất 20 ngày, các hộp sau cách nhau 1 tháng.
5. Cut-off 7 ngày trước đợt giao. Tạm dừng tối đa 2 kỳ. Hết hộp trả trước thì nhắc gia hạn 7/3/1 ngày; quá hạn còn 5 ngày rồi gói kết thúc.
6. Hủy gói: vẫn giao hết hộp đã trả, không hoàn tiền. Gói đăng ký mà không thanh toán thì không sinh hộp.
7. Đơn thanh toán online quá 30 phút chưa trả thì tự hủy. Tồn kho chỉ bị trừ khi đơn được xác nhận (đã thanh toán, hoặc đơn COD), đơn chờ thanh toán KHÔNG giữ hàng. Điểm này khác SPEC, xem mục "Còn phải làm".
8. COD chỉ cho đơn mua 1 lần không quá 2.000.000₫; gói định kỳ chỉ thanh toán online.
9. Dị ứng khai trong hồ sơ chỉ xét với món ăn (danh mục Thức ăn, Bánh thưởng), không xét đồ chơi, phụ kiện.
10. Đề xuất món cho hộp (src/lib/boxSuggestion.ts): đạt giá trị tối thiểu và vượt không quá 20.000₫, đúng số món, đủ 3 nhóm món; thứ tự ưu tiên ghi trong SPEC §3.
11. Tra cứu đơn chỉ cần mã đơn; kết quả che bớt tên, số điện thoại và chỉ hiện tỉnh/thành.
12. Địa chỉ theo địa giới từ 01/07/2025: 34 tỉnh/thành, phường/xã, không có quận/huyện. Phí ship tính theo tỉnh/thành.
13. Vai trò người dùng: chỉ có admin và customer.

## Quy ước thiết kế (khách đã duyệt, đừng đổi)
- Font: Bricolage Grotesque (tiêu đề) + Be Vietnam Pro (nội dung), subset vietnamese.
- Màu: xanh rêu pine làm chủ đạo, cam honey dùng tiết kiệm.
- Logo: ảnh public/images/logo-icon.png kèm chữ FPETS, dựng trong src/components/common/BrandLogo.tsx.
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
Việc cần chủ cửa hàng quyết định hoặc cung cấp:
- Cổng thanh toán thật. Hiện MoMo/VNPay là trang giả lập /checkout/pay (bấm "Tôi đã thanh toán"). Phương án đã bàn: chuyển khoản VietQR (xác nhận tự động qua payOS/SePay/Casso hoặc xác nhận tay) kèm COD.
- Đơn vị vận chuyển và API (đã đề xuất GHN); hiện phí ship đồng giá, admin nhập mã vận đơn bằng tay.
- Chính sách hủy gói: giữ như hiện tại (không hoàn tiền) hay hoàn phần hộp chưa giao.
- Thông tin thật trong src/lib/contactInfo.ts (hotline, email đang là mẫu) và các mục để null trong src/config/business.ts (nguồn gốc hàng, hạn dùng, thiệp tên bé, hộp bán chạy…).
- Ảnh chụp hộp và sản phẩm thật thay ảnh minh họa; 19 sản phẩm hiện chỉ dùng cho hộp, chưa bật bán lẻ.

Việc kỹ thuật còn dang dở:
- Giữ hàng cho đơn chờ thanh toán: SPEC ghi "tự hủy và trả tồn kho" nhưng hệ thống chỉ trừ kho khi thanh toán xong và không kiểm tra còn hàng lúc đó, nên hai khách cùng trả tiền cho món cuối có thể làm tồn kho âm.
- Màn admin chưa nhắc quà sinh nhật cho gói 6 hộp (SPEC có quyền lợi này).
- Voucher thưởng cho đánh giá có ảnh (SPEC §8) chưa làm.
- Email giao dịch chưa có; khách chỉ nhận thông báo trên web.
- Hàm lookup_order(mã đơn, số điện thoại) bản cũ còn trong database, gỡ bằng một migration sau khi không còn bản web nào dùng.
- Dự án chưa cấu hình ESLint và chưa có test tự động; kiểm tra bằng typecheck, build và thử tay theo danh sách kiểm thử.

## Ưu tiên bảo mật (web có tiền và dữ liệu khách thật)
- RLS phải test thật: giả lập user A truy vấn dữ liệu user B, phải bị chặn.
- Thanh toán: verify chữ ký ở server, không tin dữ liệu client.
- Giá, tồn kho, trạng thái đơn/gói: luôn tính và kiểm ở server.
