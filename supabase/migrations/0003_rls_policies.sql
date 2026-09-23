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
