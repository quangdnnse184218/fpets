-- Thêm vai trò nhân viên vận hành (staff), thay đổi so với SPEC §9 cũ (chỉ có admin) theo yêu cầu chủ cửa hàng 08/10/2026.
-- Giá trị enum mới phải được commit trước khi dùng, nên tách riêng file này; quyền của staff nằm ở migration kế tiếp.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
