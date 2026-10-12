-- HẠNG HỘP: tên và mô tả do admin sửa (12/10/2026)
-- Mỗi loại Mystery Box thuộc một trong 2 hạng, xác định theo slug (có chữ "premium" là hạng premium).
-- Tên hạng trước đây viết cứng "Tiêu chuẩn" / "Premium" trong code; nay đọc từ bảng này để admin đổi được.
-- Giá, số món, giá trị tối thiểu vẫn lấy từ từng loại hộp (box_types).
CREATE TABLE IF NOT EXISTS public.box_tiers (
  key text PRIMARY KEY CHECK (key IN ('standard', 'premium')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 40),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 160),
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.box_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS box_tiers_public_select ON public.box_tiers;
CREATE POLICY box_tiers_public_select ON public.box_tiers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS box_tiers_admin_update ON public.box_tiers;
CREATE POLICY box_tiers_admin_update ON public.box_tiers FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Giá trị ban đầu theo cách cửa hàng đang đặt tên hộp: hộp slug "premium" là Box nhỏ (rẻ hơn, xếp trước),
-- hộp slug "tieu-chuan" là Box tiêu chuẩn
INSERT INTO public.box_tiers (key, name, description, sort_order) VALUES
  ('premium', 'Box nhỏ', 'Đủ đồ ăn, đồ chơi và 1 món chăm sóc', 1),
  ('standard', 'Box tiêu chuẩn', 'Nhiều món hơn, có đồ chơi giấu thức ăn', 2)
ON CONFLICT (key) DO NOTHING;
