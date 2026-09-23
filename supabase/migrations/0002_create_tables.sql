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
