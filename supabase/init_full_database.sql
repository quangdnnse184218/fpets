-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0001_create_enums.sql
-- Mô tả: Khởi tạo tất cả các kiểu dữ liệu ENUM chuẩn theo tài liệu docs/PLAN.md và docs/SPEC.md
-- ==============================================================================

-- 1. Vai trò người dùng trong hệ thống (RBAC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'admin', 'kho', 'cskh');
  END IF;
END $$;

-- 2. 7 trạng thái đơn hàng theo chuẩn mục 7 của SPEC.md
-- - cho_thanh_toan: Đã tạo đơn, chưa trả tiền online (tự hủy sau 30 phút và hoàn tồn kho)
-- - da_xac_nhan: Đã thanh toán online thành công hoặc đơn COD được nhân viên xác nhận
-- - dang_chuan_bi: Đang được nhân viên kho tuyển chọn / đóng gói
-- - dang_giao: Đã giao cho đơn vị vận chuyển, có mã vận đơn
-- - da_giao: Giao thành công, khách đã nhận hàng, mở quyền đánh giá review
-- - da_huy: Hủy bởi khách hoặc admin, hoàn trả tồn kho và hoàn tiền nếu có
-- - doi_tra: Đang tiếp nhận và xử lý đổi / trả theo chính sách 3 ngày
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'cho_thanh_toan',
      'da_xac_nhan',
      'dang_chuan_bi',
      'dang_giao',
      'da_giao',
      'da_huy',
      'doi_tra'
    );
  END IF;
END $$;

-- 3. 6 trạng thái Subscription theo chuẩn mục 5 của SPEC.md
-- - cho_thanh_toan: Vừa đăng ký gói, chờ thanh toán tiền trả trước
-- - dang_hoat_dong: Đang hoạt động bình thường, giao định kỳ mỗi tháng
-- - tam_dung: Khách tạm dừng (pause 1 hoặc 2 kỳ liên tiếp)
-- - qua_han: Đã giao hết số hộp trả trước, chờ gia hạn (giữ ưu đãi 5 ngày)
-- - het_han: Quá hạn 5 ngày không gia hạn, ngừng giao nhưng giữ hồ sơ pet
-- - da_huy: Khách chủ động hủy, vẫn giao hết số hộp đã trả trước
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'cho_thanh_toan',
      'dang_hoat_dong',
      'tam_dung',
      'qua_han',
      'het_han',
      'da_huy'
    );
  END IF;
END $$;

-- 4. Đợt giao hàng định kỳ trong tháng (Ngày 1-5 hoặc Ngày 15-20)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_schedule') THEN
    CREATE TYPE delivery_schedule AS ENUM ('dau_thang', 'giua_thang');
  END IF;
END $$;

-- 5. Phương thức thanh toán
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('momo', 'vnpay', 'cod');
  END IF;
END $$;

-- 6. Trạng thái thanh toán
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

-- 7. Loài thú cưng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_species') THEN
    CREATE TYPE pet_species AS ENUM ('dog', 'cat');
  END IF;
END $$;

-- 8. Kích cỡ thú cưng (small: < 10kg, large: >= 10kg)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_size') THEN
    CREATE TYPE pet_size AS ENUM ('small', 'large');
  END IF;
END $$;

-- 9. Nhóm tuổi của thú cưng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_age_group') THEN
    CREATE TYPE pet_age_group AS ENUM ('puppy_kitten', 'adult', 'senior');
  END IF;
END $$;

-- 10. Đánh giá món trong Mystery Box của bé
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_feedback_rating') THEN
    CREATE TYPE item_feedback_rating AS ENUM ('like', 'neutral', 'dislike');
  END IF;
END $$;

-- 11. Loại biến động kho hàng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
    CREATE TYPE inventory_movement_type AS ENUM (
      'import',          -- Nhập hàng từ nhà cung cấp
      'retail_sale',     -- Xuất bán lẻ qua giỏ hàng (hoặc tạm giữ khi đặt hàng)
      'box_curation',    -- Xuất đóng hộp Mystery Box
      'adjustment',      -- Kiểm kê điều chỉnh kho (hỏng, hao hụt)
      'return_restock'   -- Khách trả hàng hoặc đơn hết hạn thanh toán hoàn lại kho
    );
  END IF;
END $$;

-- 12. Loại mã giảm giá / khuyến mãi
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_discount_type') THEN
    CREATE TYPE voucher_discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
  END IF;
END $$;


-- -----------------------------------------------------------------------------

-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0002_create_tables.sql
-- Mô tả: Khởi tạo đầy đủ 20 bảng cơ sở dữ liệu theo tài liệu docs/PLAN.md
-- Quy định: Cột hình ảnh CHỈ lưu đường dẫn text (Storage path / URL), không lưu ảnh nhị phân.
-- ==============================================================================

-- 1. BẢNG PROFILES (Mở rộng từ auth.users của Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  avatar_url text, -- Đường dẫn text lưu trong bucket pet-avatars hoặc avatar bên thứ ba
  role public.user_role NOT NULL DEFAULT 'customer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. BẢNG ADDRESSES (Sổ địa chỉ nhận hàng của khách)
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  province_city text NOT NULL,
  district text NOT NULL,
  ward text NOT NULL,
  street_address text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- 3. BẢNG PETS (Hồ sơ thú cưng Pet Profile)
CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  species public.pet_species NOT NULL,
  breed text,
  weight numeric(5,2),
  size public.pet_size NOT NULL,
  age_group public.pet_age_group NOT NULL,
  birthdate date,
  gender text,
  avatar_url text, -- Đường dẫn text: pet-avatars/<user_id>/<file>.jpg
  allergies text[] NOT NULL DEFAULT '{}'::text[], -- Danh sách dị ứng để quét loại trừ
  preferences text[] NOT NULL DEFAULT '{}'::text[], -- Sở thích (gặm, kéo co, cá hồi...)
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_species_size ON public.pets(species, size);

-- 4. BẢNG CATEGORIES (Danh mục sản phẩm bán lẻ)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- 5. BẢNG PRODUCTS (Sản phẩm bán lẻ và ứng viên đóng Mystery Box)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(12,0) NOT NULL, -- Giá bán lẻ niêm yết (VND)
  original_price numeric(12,0),
  stock_quantity integer NOT NULL DEFAULT 0, -- Tồn kho khả dụng
  low_stock_threshold integer NOT NULL DEFAULT 5, -- Ngưỡng cảnh báo sắp hết hàng
  species text NOT NULL DEFAULT 'both', -- 'dog', 'cat', 'both'
  target_size text NOT NULL DEFAULT 'all', -- 'small', 'large', 'all'
  target_age text NOT NULL DEFAULT 'all', -- 'puppy_kitten', 'adult', 'senior', 'all'
  ingredients text[] NOT NULL DEFAULT '{}'::text[], -- Thành phần nguyên liệu quét dị ứng
  images text[] NOT NULL DEFAULT '{}'::text[], -- Mảng đường dẫn text trong product-images/
  is_retail boolean NOT NULL DEFAULT true, -- Có bán lẻ trên shop hay không
  is_box_item boolean NOT NULL DEFAULT true, -- Có được tuyển chọn vào Mystery Box hay không
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active_retail ON public.products(is_active, is_retail);
CREATE INDEX IF NOT EXISTS idx_products_box_item ON public.products(is_active, is_box_item);

-- 6. BẢNG BOX_TYPES (Định nghĩa loại Mystery Box Tiêu chuẩn / Premium)
CREATE TABLE IF NOT EXISTS public.box_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  species public.pet_species NOT NULL,
  size public.pet_size NOT NULL,
  item_count_min integer NOT NULL, -- 4 (tiêu chuẩn) hoặc 6 (premium)
  item_count_max integer NOT NULL, -- 5 (tiêu chuẩn) hoặc 7 (premium)
  min_retail_value numeric(12,0) NOT NULL, -- Cam kết giá trị tối thiểu (380.000₫ hoặc 650.000₫)
  basePrice numeric(12,0) NOT NULL, -- Giá niêm yết cơ sở (299.000₫ hoặc 499.000₫)
  description text,
  images text[] NOT NULL DEFAULT '{}'::text[], -- Mảng text đường dẫn ảnh mẫu
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_box_types_slug ON public.box_types(slug);
CREATE INDEX IF NOT EXISTS idx_box_types_species_size ON public.box_types(species, size);

-- 7. BẢNG SUBSCRIPTION_PLANS (Cấu hình gói định kỳ 1, 3, 6 hộp)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cycle_count integer NOT NULL UNIQUE, -- 1, 3, 6
  discount_percentage numeric(5,2) NOT NULL, -- 0.00, 10.00, 15.00
  free_shipping boolean NOT NULL DEFAULT false, -- Gói 3 và 6 freeship
  birthday_gift boolean NOT NULL DEFAULT false, -- Gói 6 tặng quà sinh nhật
  badge text, -- "Phổ biến nhất", "Tiết kiệm nhất"
  description text,
  is_active boolean NOT NULL DEFAULT true
);

-- 8. BẢNG CARTS (Giỏ hàng người dùng hoặc khách vãng lai)
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text, -- Dành cho khách vãng lai chưa đăng nhập
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON public.carts(session_id);

-- 9. BẢNG CART_ITEMS (Chi tiết món trong giỏ hàng mua 1 lần)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  box_type_id uuid REFERENCES public.box_types(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE, -- ON DELETE CASCADE tránh vi phạm ràng buộc khi xóa pet
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_item_target_check CHECK (
    (product_id IS NOT NULL AND box_type_id IS NULL) OR
    (product_id IS NULL AND box_type_id IS NOT NULL AND pet_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

-- 10. BẢNG VOUCHERS (Mã giảm giá và khuyến mãi)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  voucher_type public.voucher_discount_type NOT NULL,
  discount_value numeric(12,0) NOT NULL, -- Số tiền VND hoặc số phần trăm
  min_order_value numeric(12,0) NOT NULL DEFAULT 0,
  max_discount numeric(12,0),
  usage_limit_total integer NOT NULL DEFAULT 100,
  usage_limit_per_user integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NOT NULL,
  scope text NOT NULL DEFAULT 'all', -- 'retail', 'box', 'first_subscription', 'all'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);

-- 11. BẢNG SUBSCRIPTIONS (Hợp đồng gói định kỳ trả trước)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_code text NOT NULL UNIQUE, -- SUB-YYYY-XXXX
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
  box_type_id uuid NOT NULL REFERENCES public.box_types(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  total_cycles integer NOT NULL, -- 1, 3, 6
  remaining_cycles integer NOT NULL, -- Số hộp chưa giao
  current_cycle integer NOT NULL DEFAULT 1, -- Đang ở kỳ thứ mấy
  status public.subscription_status NOT NULL DEFAULT 'cho_thanh_toan',
  delivery_schedule public.delivery_schedule NOT NULL, -- 'dau_thang' hoặc 'giua_thang'
  shipping_address_id uuid REFERENCES public.addresses(id) ON DELETE RESTRICT,
  shipping_address_snapshot jsonb NOT NULL,
  total_prepaid_amount numeric(12,0) NOT NULL,
  next_delivery_date date NOT NULL,
  cutoff_date date NOT NULL, -- Trước ngày giao 7 ngày
  paused_cycles_left integer NOT NULL DEFAULT 0, -- Số kỳ tạm dừng còn lại (tối đa 2)
  grace_period_expires_at timestamptz, -- Hạn chót 5 ngày khi rơi vào 'qua_han'
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_code ON public.subscriptions(subscription_code);

-- 12. BẢNG ORDERS (Đơn hàng bao gồm mua lẻ, mystery box và từng kỳ subscription)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE, -- FPET-YYYYMMDD-XXXX
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL nếu là khách vãng lai
  order_type text NOT NULL, -- 'retail', 'mystery_box', 'subscription_initial', 'subscription_cycle'
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  cycle_index integer, -- Ví dụ: kỳ 2/3
  status public.order_status NOT NULL DEFAULT 'cho_thanh_toan',
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  subtotal numeric(12,0) NOT NULL,
  shipping_fee numeric(12,0) NOT NULL DEFAULT 0,
  discount_amount numeric(12,0) NOT NULL DEFAULT 0,
  total_amount numeric(12,0) NOT NULL, -- = 0 đối với 'subscription_cycle' do đã thanh toán trước
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  shipping_address text NOT NULL,
  province_city text NOT NULL,
  district text NOT NULL,
  ward text NOT NULL,
  customer_notes text,
  admin_notes text,
  tracking_code text, -- Mã vận đơn của nhà vận chuyển
  payment_expires_at timestamptz, -- Quá hạn 30 phút tự hủy và hoàn kho
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  return_requested_at timestamptz,
  return_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(order_code, recipient_phone);

-- 13. BẢNG ORDER_ITEMS (Chi tiết món trong đơn hàng)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  box_type_id uuid REFERENCES public.box_types(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  unit_price numeric(12,0) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric(12,0) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 14. BẢNG BOX_CURATIONS (Bản ghi hàng chờ tuyển chọn Box)
CREATE TABLE IF NOT EXISTS public.box_curations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
  box_type_id uuid NOT NULL REFERENCES public.box_types(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_curation', -- 'pending_curation', 'curated', 'packed'
  curated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_retail_value numeric(12,0) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  curated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_box_curations_order_id ON public.box_curations(order_id);
CREATE INDEX IF NOT EXISTS idx_box_curations_status ON public.box_curations(status);
CREATE INDEX IF NOT EXISTS idx_box_curations_pet_id ON public.box_curations(pet_id);

-- 15. BẢNG BOX_CURATION_ITEMS (Sản phẩm cụ thể được tuyển chọn vào Box)
CREATE TABLE IF NOT EXISTS public.box_curation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_curation_id uuid NOT NULL REFERENCES public.box_curations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  retail_price numeric(12,0) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curation_items_box ON public.box_curation_items(box_curation_id);
CREATE INDEX IF NOT EXISTS idx_curation_items_product ON public.box_curation_items(product_id);

-- 16. BẢNG PET_ITEM_FEEDBACK (Đánh giá chi tiết của pet cho từng món trong Box)
CREATE TABLE IF NOT EXISTS public.pet_item_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  box_curation_id uuid REFERENCES public.box_curations(id) ON DELETE CASCADE,
  rating public.item_feedback_rating NOT NULL, -- 'like', 'neutral', 'dislike'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_pet_product_curation UNIQUE (pet_id, product_id, box_curation_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_pet_id ON public.pet_item_feedback(pet_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.pet_item_feedback(pet_id, rating);

-- 17. BẢNG INVENTORY_MOVEMENTS (Nhật ký biến động tồn kho chi tiết)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type public.inventory_movement_type NOT NULL,
  quantity integer NOT NULL, -- Dương khi nhập/hoàn, âm khi xuất bán/đóng hộp
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reference_id text, -- Mã đơn order_code hoặc mã box_curation
  note text,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_movements(created_at);

-- 18. BẢNG VOUCHER_USAGES (Lịch sử sử dụng voucher của từng khách hàng)
CREATE TABLE IF NOT EXISTS public.voucher_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount numeric(12,0) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voucher_usages_user ON public.voucher_usages(voucher_id, user_id);

-- 19. BẢNG REVIEWS (Đánh giá đơn hàng 1-5 sao kèm tối đa 5 ảnh)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  images text[] NOT NULL DEFAULT '{}'::text[], -- Mảng đường dẫn text trong review-photos/<user_id>/
  is_rewarded boolean NOT NULL DEFAULT false, -- Đã tặng voucher 20k cho review kèm ảnh hay chưa
  status text NOT NULL DEFAULT 'published', -- 'published', 'hidden'
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_order ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- 20. BẢNG NOTIFICATIONS (Thông báo web cho khách hàng)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'order', 'subscription', 'voucher', 'system'
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);


-- -----------------------------------------------------------------------------

-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0003_rls_policies.sql
-- Mô tả: Các hàm phân quyền (public schema), triggers, bật RLS cho 20 bảng,
--        và thiết lập chính sách bảo mật RLS cho 20 bảng + 3 Storage Buckets.
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: CÁC HÀM HỖ TRỢ PHÂN QUYỀN (Đặt trong schema public)
-- ==============================================================================

-- 1.1. Lấy role của user hiện tại
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1.2. Kiểm tra có phải Admin (Chủ shop / Quản trị viên tối cao)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1.3. Kiểm tra có phải nhân viên nội bộ (Admin, Kho, CSKH)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'kho', 'cskh') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- PHẦN 2: CÁC TRIGGER TỰ ĐỘNG
-- ==============================================================================

-- 2.1. Hàm tự động cập nhật cột updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger updated_at cho các bảng có cột updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pets_updated_at') THEN
    CREATE TRIGGER trg_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_carts_updated_at') THEN
    CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cart_items_updated_at') THEN
    CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subscriptions_updated_at') THEN
    CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 2.2. Trigger đồng bộ auth.users -> public.profiles & TỰ ĐỘNG GỘP ĐƠN KHÁCH VÃNG LAI
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_phone text;
  v_full_name text;
BEGIN
  -- Lấy phone và full_name từ raw_user_meta_data nếu có
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');

  -- Tạo hồ sơ mới trong public.profiles
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_phone,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone);

  -- Tự động gộp đơn hàng cũ của khách vãng lai nếu trùng số điện thoại
  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    UPDATE public.orders
    SET user_id = NEW.id
    WHERE user_id IS NULL AND recipient_phone = v_phone;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger vào auth.users (nếu chưa có)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2.3. Postgres RPC tra cứu đơn an toàn cho khách vãng lai (không lộ đơn người khác)
CREATE OR REPLACE FUNCTION public.lookup_order(
  p_order_code text,
  p_phone text
)
RETURNS TABLE (
  id uuid,
  order_code text,
  order_type text,
  status public.order_status,
  payment_method public.payment_method,
  payment_status public.payment_status,
  subtotal numeric,
  shipping_fee numeric,
  discount_amount numeric,
  total_amount numeric,
  recipient_name text,
  recipient_phone text,
  shipping_address text,
  province_city text,
  district text,
  ward text,
  tracking_code text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_code,
    o.order_type,
    o.status,
    o.payment_method,
    o.payment_status,
    o.subtotal,
    o.shipping_fee,
    o.discount_amount,
    o.total_amount,
    o.recipient_name,
    o.recipient_phone,
    o.shipping_address,
    o.province_city,
    o.district,
    o.ward,
    o.tracking_code,
    o.created_at
  FROM public.orders o
  WHERE o.order_code = trim(p_order_code)
    AND o.recipient_phone = trim(p_phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- PHẦN 3: BẬT RLS (ROW LEVEL SECURITY) CHO TẤT CẢ 20 BẢNG
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_curations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_curation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_item_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PHẦN 4: THIẾT LẬP CHÍNH SÁCH RLS CHO 20 BẢNG THEO MA TRẬN PLAN.MD
-- ==============================================================================

-- 4.1. PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_staff_select" ON public.profiles;
CREATE POLICY "profiles_staff_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.2. ADDRESSES
DROP POLICY IF EXISTS "addresses_own_all" ON public.addresses;
CREATE POLICY "addresses_own_all" ON public.addresses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "addresses_staff_select" ON public.addresses;
CREATE POLICY "addresses_staff_select" ON public.addresses
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4.3. PETS
DROP POLICY IF EXISTS "pets_own_all" ON public.pets;
CREATE POLICY "pets_own_all" ON public.pets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pets_staff_select" ON public.pets;
CREATE POLICY "pets_staff_select" ON public.pets
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "pets_staff_update" ON public.pets;
CREATE POLICY "pets_staff_update" ON public.pets
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.4. CATEGORIES
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "categories_staff_all" ON public.categories;
CREATE POLICY "categories_staff_all" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.5. PRODUCTS
DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "products_staff_all" ON public.products;
CREATE POLICY "products_staff_all" ON public.products
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.6. BOX_TYPES
DROP POLICY IF EXISTS "box_types_public_select" ON public.box_types;
CREATE POLICY "box_types_public_select" ON public.box_types
  FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "box_types_admin_all" ON public.box_types;
CREATE POLICY "box_types_admin_all" ON public.box_types
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.7. SUBSCRIPTION_PLANS
DROP POLICY IF EXISTS "subscription_plans_public_select" ON public.subscription_plans;
CREATE POLICY "subscription_plans_public_select" ON public.subscription_plans
  FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "subscription_plans_admin_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_all" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.8. CARTS
DROP POLICY IF EXISTS "carts_own_all" ON public.carts;
CREATE POLICY "carts_own_all" ON public.carts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "carts_staff_select" ON public.carts;
CREATE POLICY "carts_staff_select" ON public.carts
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4.9. CART_ITEMS
DROP POLICY IF EXISTS "cart_items_own_all" ON public.cart_items;
CREATE POLICY "cart_items_own_all" ON public.cart_items
  FOR ALL TO authenticated
  USING (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()))
  WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()));

-- 4.10. VOUCHERS
DROP POLICY IF EXISTS "vouchers_public_select" ON public.vouchers;
CREATE POLICY "vouchers_public_select" ON public.vouchers
  FOR SELECT TO public
  USING (is_active = true AND valid_to >= now());

DROP POLICY IF EXISTS "vouchers_staff_all" ON public.vouchers;
CREATE POLICY "vouchers_staff_all" ON public.vouchers
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.11. SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_own_select" ON public.subscriptions;
CREATE POLICY "subscriptions_own_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_own_update" ON public.subscriptions;
CREATE POLICY "subscriptions_own_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_staff_all" ON public.subscriptions;
CREATE POLICY "subscriptions_staff_all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.12. ORDERS
DROP POLICY IF EXISTS "orders_own_select" ON public.orders;
CREATE POLICY "orders_own_select" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_own_cancel" ON public.orders;
CREATE POLICY "orders_own_cancel" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'cho_thanh_toan')
  WITH CHECK (user_id = auth.uid() AND status = 'da_huy');

DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
CREATE POLICY "orders_staff_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
CREATE POLICY "orders_staff_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.13. ORDER_ITEMS
DROP POLICY IF EXISTS "order_items_own_select" ON public.order_items;
CREATE POLICY "order_items_own_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "order_items_staff_all" ON public.order_items;
CREATE POLICY "order_items_staff_all" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.14. BOX_CURATIONS
DROP POLICY IF EXISTS "box_curations_staff_all" ON public.box_curations;
CREATE POLICY "box_curations_staff_all" ON public.box_curations
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.15. BOX_CURATION_ITEMS
DROP POLICY IF EXISTS "box_curation_items_staff_all" ON public.box_curation_items;
CREATE POLICY "box_curation_items_staff_all" ON public.box_curation_items
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.16. PET_ITEM_FEEDBACK
DROP POLICY IF EXISTS "feedback_own_select" ON public.pet_item_feedback;
CREATE POLICY "feedback_own_select" ON public.pet_item_feedback
  FOR SELECT TO authenticated
  USING (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "feedback_own_insert" ON public.pet_item_feedback;
CREATE POLICY "feedback_own_insert" ON public.pet_item_feedback
  FOR INSERT TO authenticated
  WITH CHECK (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "feedback_own_update" ON public.pet_item_feedback;
CREATE POLICY "feedback_own_update" ON public.pet_item_feedback
  FOR UPDATE TO authenticated
  USING (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid()))
  WITH CHECK (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "feedback_staff_select" ON public.pet_item_feedback;
CREATE POLICY "feedback_staff_select" ON public.pet_item_feedback
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4.17. INVENTORY_MOVEMENTS (Cấm khách hàng truy cập)
DROP POLICY IF EXISTS "inventory_movements_staff_select" ON public.inventory_movements;
CREATE POLICY "inventory_movements_staff_select" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "inventory_movements_staff_insert" ON public.inventory_movements;
CREATE POLICY "inventory_movements_staff_insert" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

-- 4.18. VOUCHER_USAGES
DROP POLICY IF EXISTS "voucher_usages_own_select" ON public.voucher_usages;
CREATE POLICY "voucher_usages_own_select" ON public.voucher_usages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "voucher_usages_staff_select" ON public.voucher_usages;
CREATE POLICY "voucher_usages_staff_select" ON public.voucher_usages
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4.19. REVIEWS
DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
CREATE POLICY "reviews_public_select" ON public.reviews
  FOR SELECT TO public
  USING (status = 'published');

DROP POLICY IF EXISTS "reviews_own_select" ON public.reviews;
CREATE POLICY "reviews_own_select" ON public.reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_own_insert" ON public.reviews;
CREATE POLICY "reviews_own_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid() AND status = 'da_giao'
    )
  );

DROP POLICY IF EXISTS "reviews_staff_all" ON public.reviews;
CREATE POLICY "reviews_staff_all" ON public.reviews
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4.20. NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_own_select" ON public.notifications;
CREATE POLICY "notifications_own_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_staff_all" ON public.notifications;
CREATE POLICY "notifications_staff_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ==============================================================================
-- PHẦN 5: RLS POLICIES CHO SUPABASE STORAGE (storage.objects)
-- Lưu ý: 3 Buckets (product-images, pet-avatars, review-photos) ĐÃ CÓ SẴN trên Supabase.
-- Dưới đây chỉ cập nhật/siết lại chính sách bảo mật cho từng bucket:
-- ==============================================================================

-- 5.1. BUCKET "product-images" (Public)
-- Đọc công khai cho mọi người
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Siết quyền ghi: Xóa các policy cũ mở rộng cho mọi authenticated user (nếu có)
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to product-images" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

-- Chỉ duy nhất Admin (public.is_admin()) mới được Upload / Sửa / Xóa ảnh sản phẩm và box
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- 5.2. BUCKET "pet-avatars" (Private)
-- Chỉ chính chủ (theo folder auth.uid()) hoặc nhân viên nội bộ (public.is_staff()) mới được đọc
DROP POLICY IF EXISTS "pet_avatars_owner_or_staff_read" ON storage.objects;
CREATE POLICY "pet_avatars_owner_or_staff_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pet-avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.is_staff()
    )
  );

-- Chỉ chính chủ mới được Upload / Sửa / Xóa avatar pet vào đúng thư mục user_id của mình
DROP POLICY IF EXISTS "pet_avatars_owner_insert" ON storage.objects;
CREATE POLICY "pet_avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pet-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pet_avatars_owner_update" ON storage.objects;
CREATE POLICY "pet_avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pet-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pet-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pet_avatars_owner_delete" ON storage.objects;
CREATE POLICY "pet_avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pet-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5.3. BUCKET "review-photos" (Public)
-- Đọc công khai ảnh unbox đính kèm review
DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
CREATE POLICY "review_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'review-photos');

-- Chỉ khách hàng đã đăng nhập mới được upload vào đúng thư mục mang user_id của mình
DROP POLICY IF EXISTS "review_photos_owner_insert" ON storage.objects;
CREATE POLICY "review_photos_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Khách hàng được xóa ảnh của mình, hoặc Admin được gỡ ảnh nếu vi phạm
DROP POLICY IF EXISTS "review_photos_delete" ON storage.objects;
CREATE POLICY "review_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'review-photos' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.is_admin()
    )
  );


-- -----------------------------------------------------------------------------

-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0004_seed_data.sql
-- Mô tả: Dữ liệu mẫu (Seed Data) chuẩn hóa từ src/mock/ theo đặc tả PLAN.md
-- Quy định: Cột hình ảnh CHỈ lưu đường dẫn text trong bucket quy ước, không lưu nhị phân.
-- ==============================================================================

-- 1. TÀI KHOẢN MẪU (AUTH & PROFILES)
-- Lưu ý: Chèn bản ghi giả lập vào auth.users để đảm bảo khóa ngoại cho public.profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES
      ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@fpets.vn', crypt('Admin@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Quản Trị"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kho@fpets.vn', crypt('Kho@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Thủ Kho Vận Hành"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cskh@fpets.vn', crypt('Cskh@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"CSKH Hỗ Trợ"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'khachhang@fpets.vn', crypt('Khach@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nguyễn Văn Quang","phone":"0988123456"}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Tạo hồ sơ tương ứng trong public.profiles
INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@fpets.vn', 'Admin Quản Trị', '0901234567', 'admin', true),
  ('a0000000-0000-0000-0000-000000000002', 'kho@fpets.vn', 'Thủ Kho Vận Hành', '0901234568', 'kho', true),
  ('a0000000-0000-0000-0000-000000000003', 'cskh@fpets.vn', 'CSKH Hỗ Trợ', '0901234569', 'cskh', true),
  ('a0000000-0000-0000-0000-000000000004', 'khachhang@fpets.vn', 'Nguyễn Văn Quang', '0988123456', 'customer', true)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- 2. SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESSES)
INSERT INTO public.addresses (id, user_id, recipient_name, phone, province_city, district, ward, street_address, is_default)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Nguyễn Văn Quang', '0988123456', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng Hậu', 'Số 24 ngõ 105 Xuân Thủy', true)
ON CONFLICT (id) DO NOTHING;

-- 3. HỒ SƠ THÚ CƯNG (PETS - Lấy chuẩn từ src/mock/pets.ts)
INSERT INTO public.pets (id, user_id, name, species, breed, weight, size, age_group, birthdate, gender, avatar_url, allergies, preferences, notes)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Bơ',
    'dog',
    'Golden Retriever',
    18.5,
    'large',
    'adult',
    '2024-04-12',
    'Đực',
    'pet-avatars/a0000000-0000-0000-0000-000000000004/bo-golden.webp',
    ARRAY['Thịt gà', 'Bắp / Ngô'],
    ARRAY['Gặm xương giòn', 'Đồ chơi dây thừng kéo co', 'Thịt cừu sấy'],
    'Bé rất mê gặm đồ vật khi ở nhà một mình, cần đồ chơi dai bền.'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'Miu',
    'cat',
    'Mèo Anh Lông Ngắn',
    4.2,
    'small',
    'puppy_kitten',
    '2025-10-05',
    'Cái',
    'pet-avatars/a0000000-0000-0000-0000-000000000004/miu-aln.webp',
    ARRAY[]::text[],
    ARRAY['Cỏ bạc hà Catnip', 'Pate cá hồi', 'Cần câu lông vũ'],
    'Bé hơi nhát với âm thanh lớn, thích đồ chơi mềm mại.'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. DANH MỤC SẢN PHẨM (CATEGORIES)
INSERT INTO public.categories (id, name, slug, description)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Thức ăn dinh dưỡng', 'thuc-an-dinh-duong', 'Pate, hạt giàu đạm, súp thưởng và sữa dinh dưỡng cho chó mèo'),
  ('c0000000-0000-0000-0000-000000000002', 'Bánh thưởng & Snack', 'banh-thuong-snack', 'Snack sấy thăng hoa, bánh quy sạch răng và bánh gặm canxi'),
  ('c0000000-0000-0000-0000-000000000003', 'Đồ chơi vận động', 'do-choi-van-dong', 'Dây thừng kéo co, bóng cao su nảy, đĩa bay bền chắc'),
  ('c0000000-0000-0000-0000-000000000004', 'Đồ chơi tương tác', 'do-choi-tuong-tac', 'Cần câu lông vũ, cá nhồi catnip, đồ chơi rèn luyện trí tuệ IQ'),
  ('c0000000-0000-0000-0000-000000000005', 'Chăm sóc & Vệ sinh', 'cham-soc-ve-sinh', 'Khăn ướt kháng khuẩn, xịt khử mùi, găng tay chải lông'),
  ('c0000000-0000-0000-0000-000000000006', 'Phụ kiện & Dụng cụ', 'phu-kien-dung-cu', 'Lược chải nút bấm, vòng cổ dạ quang, bát ăn chống gù')
ON CONFLICT (id) DO NOTHING;

-- 5. ĐỊNH NGHĨA LOẠI MYSTERY BOX (BOX_TYPES - Lấy chuẩn từ src/mock/boxTypes.ts)
INSERT INTO public.box_types (id, name, slug, species, size, item_count_min, item_count_max, min_retail_value, basePrice, description, images, is_active)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Box Tiêu chuẩn cho Chó nhỏ',
    'box-tieu-chuan-cho-nho',
    'dog',
    'small',
    4,
    5,
    380000,
    299000,
    'Hộp quà tuyển chọn riêng gồm bánh thưởng dinh dưỡng, đồ chơi kích thước vừa miệng và vật dụng vệ sinh an toàn cho các bé cún nhỏ dưới 10kg.',
    ARRAY['product-images/box-std-dog-small.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Box Tiêu chuẩn cho Chó lớn',
    'box-tieu-chuan-cho-lon',
    'dog',
    'large',
    4,
    5,
    380000,
    299000,
    'Hộp quà dành riêng cho các bé cún lớn từ 10kg trở lên với đồ chơi chịu lực gặm cao, thức ăn bổ sung canxi và phụ kiện chắc chắn.',
    ARRAY['product-images/box-std-dog-large.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Box Tiêu chuẩn cho Mèo',
    'box-tieu-chuan-meo',
    'cat',
    'small',
    4,
    5,
    380000,
    299000,
    'Hộp quà mê hoặc các hoàng thượng với pate thượng hạng, cỏ catnip hữu cơ sấy khô và đồ chơi tương tác rèn phản xạ săn mồi.',
    ARRAY['product-images/box-std-cat.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Box Premium cho Chó',
    'box-premium-cho',
    'dog',
    'small',
    6,
    7,
    650000,
    499000,
    'Phiên bản cao cấp gấp đôi niềm vui: thực phẩm dinh dưỡng nhập khẩu, đồ chơi thông minh trí tuệ và phụ kiện thời trang riêng biệt.',
    ARRAY['product-images/box-prm-dog.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'Box Premium cho Mèo',
    'box-premium-meo',
    'cat',
    'small',
    6,
    7,
    650000,
    499000,
    'Trải nghiệm hoàng gia với pate hữu cơ cao cấp, đồ chơi kích thích não bộ, thảm cào móng mini và lược chải mát-xa lông rụng.',
    ARRAY['product-images/box-prm-cat.webp'],
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 6. CẤU HÌNH GÓI ĐỊNH KỲ (SUBSCRIPTION_PLANS - 1, 3, 6 hộp)
INSERT INTO public.subscription_plans (id, name, cycle_count, discount_percentage, free_shipping, birthday_gift, badge, description, is_active)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'Gói 1 hộp',
    1,
    0.00,
    false,
    false,
    NULL,
    'Nhận 1 hộp thử nghiệm để xem phản ứng và sở thích của bé trước khi cam kết lâu dài.',
    true
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'Gói 3 hộp',
    3,
    10.00,
    true,
    false,
    'Phổ biến nhất',
    'Giao định kỳ 1 hộp mỗi tháng trong 3 tháng. Tiết kiệm 10% và miễn phí vận chuyển toàn bộ kỳ giao.',
    true
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'Gói 6 hộp',
    6,
    15.00,
    true,
    true,
    'Tiết kiệm nhất',
    'Giao định kỳ 6 tháng. Giảm 15%, miễn phí giao hàng và tặng thêm phần quà sinh nhật độc quyền cho bé.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 7. 15 SẢN PHẨM MẪU TRONG KHO (PRODUCTS - Lấy từ src/mock/products.ts)
INSERT INTO public.products (id, category_id, name, slug, description, price, original_price, stock_quantity, low_stock_threshold, species, target_size, target_age, ingredients, images, is_retail, is_box_item, is_active)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Pate Cá Hồi Tươi & Bí Đỏ Hầm Cho Mèo (Lon 85g)',
    'pate-ca-hoi-bi-do-meo-85g',
    'Thịt cá hồi phi lê tươi nguyên chất kết hợp bí đỏ bổ sung chất xơ hòa tan, hỗ trợ tiêu hóa và đào thải búi lông tự nhiên ở mèo.',
    35000, 42000, 48, 5, 'cat', 'all', 'all',
    ARRAY['Cá hồi', 'Bí đỏ', 'Nước hầm xương cá', 'Taurine', 'Vitamin E'],
    ARRAY['/images/products/pate-ca-hoi.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Snack Ức Gà Sấy Thăng Hoa Giòn Tan (Túi 50g)',
    'snack-uc-ga-say-thang-hoa-50g',
    'Công nghệ sấy lạnh giữ trọn 98% hàm lượng đạm tự nhiên và dưỡng chất, không chất bảo quản, không muối, thơm ngon hấp dẫn.',
    45000, 55000, 62, 10, 'both', 'all', 'all',
    ARRAY['100% Ức gà tươi nguyên miếng'],
    ARRAY['/images/products/snack-uc-ga.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'Bánh Quy Canxi Men Tiêu Hóa Vị Bò (Hũ 150g)',
    'banh-quy-canxi-men-tieu-hoa-vi-bo-150g',
    'Cấu trúc giòn rụm giúp làm sạch mảng bám trên răng cún khi nhai, bổ sung canxi và lợi khuẩn đường ruột ngừa tiêu chảy.',
    65000, 75000, 24, 5, 'dog', 'all', 'adult',
    ARRAY['Bột mì nguyên cám', 'Thịt bò sấy', 'Men vi sinh Probiotic', 'Canxi hữu cơ'],
    ARRAY['/images/products/banh-quy-canxi.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    'Hạt Dinh Dưỡng Thịt Cừu & Gạo Lứt Cho Cún Nhỏ (Túi 400g)',
    'hat-dinh-duong-thit-cuu-gao-lut-cun-nho-400g',
    'Hạt kích cỡ nhỏ 6mm được thiết kế riêng cho khung hàm nhỏ của Poodle, Phốc, Pom; công thức lành tính ngừa dị ứng da ngứa đỏ.',
    85000, NULL, 19, 5, 'dog', 'small', 'all',
    ARRAY['Thịt cừu Úc', 'Gạo lứt', 'Bột trứng', 'Dầu cá hồi Omega 3'],
    ARRAY['/images/products/hat-dinh-duong.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000001',
    'Súp Thưởng Nắp Vặn Cá Ngừ & Tảo Biển (Túi 4 thanh)',
    'sup-thuong-ca-ngu-tao-bien-4-thanh',
    'Dạng sốt sệt mịn bổ sung nước hiệu quả cho mèo lười uống nước, giảm thiểu nguy cơ sỏi bàng quang.',
    40000, NULL, 55, 10, 'cat', 'all', 'all',
    ARRAY['Cá ngừ đại dương', 'Bột tảo Spirulina', 'Nước khoáng tinh khiết', 'FOS'],
    ARRAY['/images/products/sup-thuong.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000003',
    'Đồ Chơi Dây Thừng Bện Kéo Co Đôi Cotton Tự Nhiên',
    'do-choi-day-thung-keo-co-cotton',
    'Sợi cotton bện xoắn chịu lực kéo mạnh, vừa là món đồ chơi giải tỏa căng thẳng vừa làm sạch kẽ răng khi cún cắn gặm.',
    55000, NULL, 35, 5, 'dog', 'large', 'all',
    ARRAY['100% Sợi bông tự nhiên'],
    ARRAY['/images/products/day-thung-keo-co.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    'c0000000-0000-0000-0000-000000000004',
    'Cá Nhồi Cỏ Mèo Catnip Phát Tiếng Sột Soạt Tương Tác',
    'ca-nhoi-co-meo-catnip-tieng-sot-soat',
    'Món đồ chơi kinh điển khiến mọi bé mèo hưng phấn, ôm đạp chân sau thỏa thích và giảm stress hiệu quả khi chủ vắng nhà.',
    40000, NULL, 42, 5, 'cat', 'all', 'all',
    ARRAY['Vải nhung mềm', 'Cỏ bạc hà mèo Catnip', 'Màng nilon tạo âm'],
    ARRAY['/images/products/ca-nhoi-catnip.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000008',
    'c0000000-0000-0000-0000-000000000003',
    'Bóng Cao Su Non Phát Tiếng Bíp Siêu Đàn Hồi Cho Chó',
    'bong-cao-su-non-phat-tieng-bip',
    'Bóng nảy bất quy tắc kích thích bản năng đuổi bắt, phát tiếng kêu bíp vui nhộn khi cắn mà không gây mòn men răng cún.',
    60000, NULL, 28, 5, 'dog', 'all', 'all',
    ARRAY['Cao su tự nhiên an toàn thực phẩm'],
    ARRAY['/images/products/bong-cao-su.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000009',
    'c0000000-0000-0000-0000-000000000004',
    'Cần Câu Lông Vũ Chuông Kèm Đồ Rung Cho Mèo',
    'can-cau-long-vu-chuong-meo',
    'Cần câu chuyển động dẻo dai như chim bay thật, kích hoạt phản xạ nhảy vồ săn mồi và giúp mèo vận động ngừa béo phì.',
    35000, NULL, 50, 10, 'cat', 'all', 'all',
    ARRAY['Dây thép dẻo bọc nhựa', 'Lông gà rừng tự nhiên', 'Chuông đồng'],
    ARRAY['/images/products/can-cau-long-vu.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000010',
    'c0000000-0000-0000-0000-000000000005',
    'Khăn Ướt Kháng Khuẩn Chiết Xuất Tràm Trà & Nha Đam (Gói 80 tờ)',
    'khan-uot-khang-khuan-tram-tra-80-to',
    'Không cồn, không paraben, an toàn khi bé liếm lông. Dùng lau sạch bụi bẩn kẽ móng, viền mắt và hậu môn sau khi đi dạo.',
    45000, NULL, 75, 10, 'both', 'all', 'all',
    ARRAY['Vải không dệt cotton', 'Nước tinh khiết RO', 'Chiết xuất tràm trà', 'Gel nha đam hữu cơ'],
    ARRAY['/images/products/khan-uot.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000011',
    'c0000000-0000-0000-0000-000000000006',
    'Lược Chải Lông Nút Bấm Tự Đẩy Lông Rụng Thông Minh',
    'luoc-chai-long-nut-bam-tu-day',
    'Bấm nút 1 chạm để đẩy sạch cả mảng lông rụng ra ngoài, đầu kim có hạt massage tăng lưu thông máu dưới da cho bé yêu.',
    85000, 110000, 14, 5, 'both', 'all', 'all',
    ARRAY['Đầu chọc inox bọc đầu tròn bảo vệ da', 'Nhựa ABS kháng khuẩn'],
    ARRAY['/images/products/luoc-chai-long.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000012',
    'c0000000-0000-0000-0000-000000000006',
    'Vòng Cổ Dạ Quang Phản Quang Kèm Chuông Báo Lạc (Tăng đơ)',
    'vong-co-da-quang-phan-quang-kem-chuong',
    'Dải phản quang phát sáng rõ trong bóng tối khi có ánh đèn xe rọi vào, khóa an toàn tự nhả khi bé bị mắc kẹt.',
    45000, NULL, 31, 5, 'both', 'small', 'all',
    ARRAY['Sợi dù bọc dải phản quang 3M', 'Khóa nhựa an toàn tự bật khi kẹt'],
    ARRAY['/images/products/vong-co-da-quang.jpg'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000013',
    'c0000000-0000-0000-0000-000000000002',
    'Thịt Bò Úc Sấy Thăng Hoa Giàu Đạm (Túi 60g)',
    'thit-bo-uc-say-thang-hoa-60g',
    'Thịt thăn bò Úc tươi cắt hạt lựu sấy lạnh giữ vị ngọt đậm đà, bổ sung sắt và kẽm hỗ trợ phát triển cơ bắp cho cún.',
    75000, 90000, 40, 5, 'dog', 'all', 'all',
    ARRAY['100% Thịt thăn bò Úc'],
    ARRAY['product-images/thit-bo-say-60g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000014',
    'c0000000-0000-0000-0000-000000000003',
    'Đĩa Bay Silicon Dẻo Siêu Nảy Ném Xa Cho Chó',
    'dia-bay-silicon-deo-sieu-nay',
    'Chất liệu silicon thực phẩm mềm dẻo không gây đau nướu răng khi cún đớp trên không, bay đầm gió và nổi được trên mặt nước.',
    50000, NULL, 30, 5, 'dog', 'all', 'all',
    ARRAY['Silicon dẻo kháng khuẩn an toàn thực phẩm'],
    ARRAY['product-images/dia-bay-silicon.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000015',
    'c0000000-0000-0000-0000-000000000005',
    'Xịt Khử Mùi & Dưỡng Lông Tinh Dầu Bưởi (Chai 150ml)',
    'xit-khu-mui-duong-long-tinh-dau-buoi-150ml',
    'Khử sạch 99% mùi hôi lông và nước tiểu, lưu hương vỏ bưởi tự nhiên thư giãn, tinh dầu giúp lông mềm mượt chống xơ rối.',
    65000, 80000, 25, 5, 'both', 'all', 'all',
    ARRAY['Nước cất vỏ bưởi', 'Nano bạc diệt khuẩn', 'Dầu dừa hữu cơ', 'Vitamin B5'],
    ARRAY['product-images/xit-khu-mui-buoi.webp'],
    true, true, true
  )
ON CONFLICT (id) DO NOTHING;

-- 8. MÃ GIẢM GIÁ & VOUCHER MẪU (VOUCHERS)
INSERT INTO public.vouchers (id, code, voucher_type, discount_value, min_order_value, max_discount, usage_limit_total, usage_limit_per_user, used_count, valid_from, valid_to, scope, is_active)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'FPETSNEW',
    'percentage',
    10,
    200000,
    50000,
    500,
    1,
    12,
    now() - interval '30 days',
    now() + interval '90 days',
    'all',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'FREESHIP',
    'free_shipping',
    30000,
    250000,
    30000,
    1000,
    2,
    85,
    now() - interval '30 days',
    now() + interval '90 days',
    'all',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'REVIEW20K',
    'fixed_amount',
    20000,
    100000,
    NULL,
    1000,
    1,
    45,
    now() - interval '30 days',
    now() + interval '180 days',
    'retail',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 9. GÓI ĐỊNH KỲ MẪU (SUBSCRIPTIONS)
INSERT INTO public.subscriptions (
  id, subscription_code, user_id, pet_id, box_type_id, plan_id,
  total_cycles, remaining_cycles, current_cycle, status, delivery_schedule,
  shipping_address_id, shipping_address_snapshot, total_prepaid_amount,
  next_delivery_date, cutoff_date, paused_cycles_left
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'SUB-2026-8912',
  'a0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000002', -- Bé Miu
  'b0000000-0000-0000-0000-000000000003', -- Box Tiêu chuẩn cho Mèo
  '50000000-0000-0000-0000-000000000002', -- Gói 3 hộp
  3,
  2,
  2,
  'dang_hoat_dong',
  'dau_thang',
  'f0000000-0000-0000-0000-000000000001',
  '{"recipient_name":"Nguyễn Văn Quang","phone":"0988123456","address":"Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội"}'::jsonb,
  807000,
  '2026-10-02',
  '2026-09-25',
  0
)
ON CONFLICT (id) DO NOTHING;

-- 10. ĐƠN HÀNG MẪU (ORDERS & ORDER_ITEMS)
-- 10.1. Đơn 1: Mystery Box đang giao (FPET-20260920-8812)
INSERT INTO public.orders (
  id, order_code, user_id, order_type, subscription_id, cycle_index,
  status, payment_method, payment_status, subtotal, shipping_fee, discount_amount, total_amount,
  recipient_name, recipient_phone, shipping_address, province_city, district, ward,
  tracking_code, paid_at
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'FPET-20260920-8812',
  'a0000000-0000-0000-0000-000000000004',
  'mystery_box',
  NULL,
  NULL,
  'dang_giao',
  'momo',
  'paid',
  299000,
  25000,
  0,
  324000,
  'Nguyễn Văn Quang',
  '0988123456',
  'Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  'Hà Nội',
  'Cầu Giấy',
  'Dịch Vọng Hậu',
  'VNPOST-8812-HN',
  now() - interval '3 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
VALUES (
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  NULL,
  'b0000000-0000-0000-0000-000000000002', -- Box Tiêu chuẩn cho Chó lớn
  'e0000000-0000-0000-0000-000000000001', -- Bé Bơ
  'Box Tiêu chuẩn cho Chó lớn (Dành cho bé Bơ)',
  299000,
  1,
  299000
)
ON CONFLICT (id) DO NOTHING;

-- 10.2. Đơn 2: Bán lẻ đã giao thành công (FPET-20260921-9923)
INSERT INTO public.orders (
  id, order_code, user_id, order_type, status, payment_method, payment_status,
  subtotal, shipping_fee, discount_amount, total_amount,
  recipient_name, recipient_phone, shipping_address, province_city, district, ward,
  paid_at
)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'FPET-20260921-9923',
  'a0000000-0000-0000-0000-000000000004',
  'retail',
  'da_giao',
  'vnpay',
  'paid',
  230000,
  25000,
  20000,
  235000,
  'Nguyễn Văn Quang',
  '0988123456',
  'Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  'Hà Nội',
  'Cầu Giấy',
  'Dịch Vọng Hậu',
  now() - interval '5 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_id, product_name_snapshot, unit_price, quantity, total_price)
VALUES
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Snack Ức Gà Sấy Thăng Hoa Giòn Tan (Túi 50g)', 45000, 1, 45000),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Đồ Chơi Dây Thừng Bện Kéo Co Đôi Cotton Tự Nhiên', 55000, 1, 55000),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000011', 'Lược Chải Lông Nút Bấm Tự Đẩy Lông Rụng Thông Minh', 85000, 1, 85000),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000010', 'Khăn Ướt Kháng Khuẩn Chiết Xuất Tràm Trà (Gói 80 tờ)', 45000, 1, 45000)
ON CONFLICT (id) DO NOTHING;

-- 11. HÀNG CHỜ TUYỂN CHỌN BOX (BOX_CURATIONS & ITEMS)
-- Tuyển chọn mẫu cho đơn hàng 1 (bé Bơ - Không có thịt gà hay bắp)
INSERT INTO public.box_curations (id, order_id, pet_id, box_type_id, status, curated_by, total_retail_value, notes, created_at, curated_at)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001', -- Bé Bơ
  'b0000000-0000-0000-0000-000000000002', -- Box Chó lớn
  'packed',
  'a0000000-0000-0000-0000-000000000002', -- Thủ kho
  380000,
  'Đã kiểm tra kỹ: loại trừ 100% thành phần gà và bắp theo đúng hồ sơ dị ứng của bé Bơ.',
  now() - interval '3 days',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Các món đã tuyển chọn vào hộp của bé Bơ
INSERT INTO public.box_curation_items (id, box_curation_id, product_id, quantity, retail_price)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 1, 65000), -- Bánh quy bò
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 1, 85000), -- Hạt thịt cừu
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 1, 55000), -- Dây thừng kéo co
  ('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 1, 60000), -- Bóng bíp
  ('31000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000011', 1, 85000), -- Lược chải thông minh
  ('31000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 1, 45000)  -- Khăn ướt tràm trà
ON CONFLICT (id) DO NOTHING;

-- 12. PHẢN HỒI MÓN CỦA BÉ (PET_ITEM_FEEDBACK)
INSERT INTO public.pet_item_feedback (id, pet_id, product_id, box_curation_id, rating, notes)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'like', 'Bé Bơ rất thích chơi kéo co với sợi thừng này.'),
  ('40000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'like', 'Bánh quy bò giòn rụm bé ăn ngon lành không bị ngứa.')
ON CONFLICT (id) DO NOTHING;

-- 13. ĐÁNH GIÁ ĐƠN HÀNG (REVIEWS)
INSERT INTO public.reviews (id, order_id, user_id, rating, comment, images, is_rewarded, status, admin_reply, admin_reply_at)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004',
  5,
  'Giao hàng nhanh, đồ chơi dây thừng rất chắc chắn, bé cún nhà mình cắn cả ngày không đứt. Lược chải bấm phát là ra cả búi lông rất tiện!',
  ARRAY['review-photos/a0000000-0000-0000-0000-000000000004/review-unbox-1.webp'],
  true,
  'published',
  'Dạ FPETS cảm ơn bạn và bé Bơ nhiều ạ! Chúc bé luôn khỏe mạnh và thích mê các món quà nhé ạ.',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 14. THÔNG BÁO CHO NGƯỜI DÙNG (NOTIFICATIONS)
INSERT INTO public.notifications (id, user_id, title, message, type, link, is_read)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Đơn hàng đang trên đường giao!',
    'Đơn hàng FPET-20260920-8812 đang được chuyển phát nhanh bởi VNPost (Mã: VNPOST-8812-HN).',
    'order',
    '/my-account/orders',
    false
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'Mystery Box kỳ 2 của bé Miu đang chuẩn bị',
    'Hệ thống đang bắt đầu tuyển chọn món cho kỳ giao đầu tháng 10. Bạn có thể cập nhật sở thích bé trước ngày chốt 25/09.',
    'subscription',
    '/my-account/subscriptions',
    true
  )
ON CONFLICT (id) DO NOTHING;
