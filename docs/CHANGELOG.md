# Nhật Ký Thay Đổi Dự Án FPETS (CHANGELOG)

Tài liệu này ghi lại chi tiết các thay đổi, tính năng mới, bản sửa lỗi và cải tiến kỹ thuật theo từng ngày phát triển của dự án FPETS.

---

## [24/09/2026] - Hoàn Thiện Nền Móng, Supabase Auth, Tinh Gọn Phân Quyền & UI Admin

### 1. Hệ Thống Xác Thực (Authentication) & Phân Quyền (RBAC)
- **Tích hợp Supabase Auth thật**: Kết nối luồng Đăng ký (`/register`), Đăng nhập (`/login`), và Quên mật khẩu (`/forgot-password`) trực tiếp với Supabase GoTrue Auth.
- **Tự động liên kết Profile**: Sử dụng trigger database tự động chèn bản ghi vào bảng `profiles` khi người dùng đăng ký tài khoản mới.
- **Bảo mật thông tin lỗi (Security Sanitize)**: Chuẩn hóa toàn bộ thông báo lỗi từ Supabase Auth sang tiếng Việt thân thiện, che giấu các chi tiết nhạy cảm về cấu trúc database (ngăn ngừa enumeration attack).
- **Tinh gọn mô hình phân quyền (Role Simplification)**:
  - Rút gọn hệ thống phân quyền xuống 2 vai trò cốt lõi: **Super Admin** (`admin` - toàn quyền quản trị) và **Khách hàng** (`customer`).
  - Loại bỏ các role trung gian chưa cần thiết (`kho`, `cskh`) để đơn giản hóa luồng vận hành và RLS.
- **Lưu trữ tài khoản mẫu**: Tạo tài liệu `docs/tk,mk account.txt` lưu trữ thông tin đăng nhập mẫu phục vụ kiểm thử (Admin & Khách hàng).
- **Tinh giản giao diện Form Auth**: Xóa bỏ `DemoRoleSwitcher`, thanh bar demo và các khối marketing thừa trên desktop để form đăng nhập/đăng ký tập trung, tải nhanh và thanh lịch.

### 2. Database Schema & Supabase Migrations
- **Bộ SQL hoàn chỉnh**: Tạo `supabase/init_full_database.sql` và `supabase/seed.sql` với đầy đủ 20 bảng, Enums, RLS policies, Functions, Triggers và Seed data mẫu.
- **Tương thích Supabase Auth**:
  - Bổ sung logic chèn tự động vào bảng nội bộ `auth.identities` khi seed tài khoản, đảm bảo GoTrue nhận diện danh tính người dùng mà không báo lỗi.
  - Sửa các trường token GoTrue (`confirmation_token`, `recovery_token`, `email_change_token_new/current`) thành chuỗi rỗng `''` thay vì `NULL` để tránh lỗi 500 từ GoTrue.
- **Sửa lỗi tính toàn vẹn dữ liệu**:
  - Sửa lỗi định dạng UUID không hợp lệ (non-hex UUIDs).
  - Khắc phục lỗi trùng lặp Product ID trong seed data đảm bảo toàn vẹn khóa ngoại (Foreign Key Integrity).
  - Cấu hình file SQL dưới định dạng chuẩn UTF-8 tránh lỗi hiển thị tiếng Việt có dấu.

### 3. Giao Diện Người Dùng & Các Trang Còn Thiếu
- **Bổ sung 100% các trang người dùng**:
  - `/about`: Trang giới thiệu thương hiệu và sứ mệnh của FPETS.
  - `/faq`: Hệ thống câu hỏi thường gặp có phân loại Accordion.
  - `/contact`: Kênh liên hệ đa phương tiện (Hotline, Zalo, Messenger, Email).
  - `/subscription`: Giới thiệu chi tiết quyền lợi các gói định kỳ 1, 3, 6 hộp.
  - `/reviews`: Trang tổng hợp đánh giá unbox và trải nghiệm thực tế từ cộng đồng nuôi thú cưng.
- **Cập nhật hình ảnh sản phẩm thực tế**: Thay thế ảnh placeholder bằng 12 ảnh thật chất lượng cao từ Unsplash cho toàn bộ danh mục sản phẩm lẻ.
- **Tối ưu trải nghiệm My Account & Footer**:
  - Thêm redirect tự động từ `/my-account` sang `/my-account/pets` để tránh lỗi 404.
  - Tinh gọn footer, loại bỏ liên kết tra cứu đơn thừa để layout cân đối và thoáng mắt.

### 4. Giao Diện Quản Trị (Admin Dashboard)
- **Bổ sung đầy đủ 7 module Admin**:
  - Quản lý Mystery Box (`/admin/box-types`)
  - Quản lý khách hàng (`/admin/customers`)
  - Quản lý Pet Profile (`/admin/pets`)
  - Quản lý gói subscription (`/admin/subscriptions`)
  - Quản lý Voucher & Khuyến mãi (`/admin/vouchers`)
  - Quản lý đánh giá Review (`/admin/reviews`)
  - Thống kê & Báo cáo doanh thu (`/admin/dashboard`)
- **Chuẩn hóa Icon**: Thay thế toàn bộ emoji sang bộ icon vector chất lượng cao từ thư viện `lucide-react`.

### 5. Hạ Tầng & Triển Khai (Deployment)
- **API Kiểm tra môi trường**: Tạo route `/api/env-check` giúp chẩn đoán trạng thái các biến môi trường Supabase.
- **Cơ chế Fallback an toàn trên Vercel**: Xây dựng client Supabase an toàn giúp ứng dụng không bị crash trên Vercel khi các biến môi trường chưa kịp cấu hình.

---

## Lịch Sử Commit (23/09 - 24/09/2026)
- `56e765b` - refactor: simplify roles and auth down to single super admin and customer
- `2b34745` - fix(db): ensure all GoTrue token fields are non-null empty strings in auth seed
- `04120ee` - fix(db): add auth.identities seed logic for Supabase Auth compatibility
- `5afb907` - refactor(auth): simplify login/register UI, remove demo bar and marketing blocks, clean up sparkle icons
- `91c73f7` - security: sanitize all auth errors to prevent exposing internal database details
- `8d10878` - fix(account): add /my-account/page.tsx redirecting to /my-account/pets to prevent 404
- `6520ab3` - feat(debug): add /api/env-check and detailed missing env reporting
- `c529e64` - fix(vercel): add safe fallback when Supabase env vars are missing to prevent client crash
- `b36d273` - refactor(footer): remove order-tracking link and streamline footer layout
- `1222367` - feat(auth): implement register, login, forgot-password with Supabase Auth
- `bb6eb58` - fix(db): resolve duplicate product IDs in seed data ensuring foreign key integrity
- `9f20105` - fix(db): correct non-hex UUIDs and encode UTF-8 in init_full_database.sql
- `9681429` - refactor: replace emoji with professional vector icons from lucide-react in admin
- `ca7f670` - feat: complete missing pages, real product images, admin CRUD, and footer update
