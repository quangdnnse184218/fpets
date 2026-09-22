# Quy ước dự án FPETS

- Đặc tả nghiệp vụ nằm ở docs/SPEC.md. Luôn đọc phần liên quan trước khi code. Không tự thêm tính năng ngoài spec; nếu spec thiếu hoặc mâu thuẫn, dừng lại và hỏi.
- Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage). Deploy Vercel.
- Giao diện tiếng Việt, tiền tệ VND định dạng 299.000₫, ngày dạng dd/MM/yyyy, múi giờ Asia/Ho_Chi_Minh.
- Mobile-first: mọi trang phải dùng tốt ở màn hình 375px.
- Database: mọi thay đổi schema viết thành file migration SQL trong supabase/migrations. Bật Row Level Security cho mọi bảng. Khách chỉ đọc/sửa dữ liệu của chính mình; admin theo vai trò (admin, kho, cskh).
- Giá tiền, tồn kho, trạng thái đơn và subscription luôn tính và kiểm tra ở server, không tin dữ liệu từ client.
- Không bao giờ commit file .env hoặc key bí mật; dùng .env.local và cập nhật .env.example (chỉ tên biến, không có giá trị).
- Code sạch, chia component nhỏ, đặt tên tiếng Anh; comment tiếng Việt chỗ nghiệp vụ phức tạp.
- Làm xong mỗi task: tóm tắt đã làm gì, file nào thay đổi, cách test thủ công.
