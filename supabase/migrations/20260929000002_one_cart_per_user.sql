-- Mỗi tài khoản chỉ có 1 giỏ hàng.
-- Trước đây khi lỡ có 2 giỏ, client đọc bằng maybeSingle() bị lỗi "nhiều dòng" rồi tạo thêm giỏ mới,
-- làm số giỏ rỗng tăng dần sau mỗi lần tải trang.

-- 1. Gom món từ các giỏ trùng về giỏ cũ nhất của từng tài khoản rồi xóa giỏ trùng
WITH ranked AS (
  SELECT id, user_id,
         first_value(id) OVER (PARTITION BY user_id ORDER BY created_at, id) AS keep_id
  FROM public.carts
  WHERE user_id IS NOT NULL
)
UPDATE public.cart_items ci
SET cart_id = r.keep_id
FROM ranked r
WHERE ci.cart_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT id, first_value(id) OVER (PARTITION BY user_id ORDER BY created_at, id) AS keep_id
  FROM public.carts
  WHERE user_id IS NOT NULL
)
DELETE FROM public.carts c
USING ranked r
WHERE c.id = r.id AND r.id <> r.keep_id;

-- 2. Chặn tạo giỏ thứ hai ở tầng DB
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_unique ON public.carts(user_id) WHERE user_id IS NOT NULL;
DROP INDEX IF EXISTS public.idx_carts_user_id;
