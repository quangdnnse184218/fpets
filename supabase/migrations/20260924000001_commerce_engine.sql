-- ==============================================================================
-- FPETS DATABASE MIGRATION - 20260924000001_commerce_engine.sql
-- Bổ sung phần logic "server-side" còn thiếu sau audit:
--   1. RLS: thêm policy INSERT còn thiếu cho orders/order_items/subscriptions/
--      voucher_usages/box_curations (trước đây không ai insert được).
--   2. Siết lại subscriptions: khách không được UPDATE trực tiếp (dễ sửa
--      remaining_cycles/total_prepaid_amount), mọi thay đổi phải qua RPC.
--   3. Các hàm SECURITY DEFINER đóng vai trò "server" thật: tính giá/tồn kho/
--      trạng thái từ dữ liệu hiện tại trong DB, không tin tham số client gửi
--      lên ngoài id/quantity. Đây là cách làm "server-side" đúng chuẩn khi
--      app không dùng service-role key (chỉ dùng anon/authenticated key).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Policy INSERT còn thiếu
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "orders_own_insert" ON public.orders;
CREATE POLICY "orders_own_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_guest_insert" ON public.orders;
CREATE POLICY "orders_guest_insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "order_items_own_insert" ON public.order_items;
CREATE POLICY "order_items_own_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "order_items_guest_insert" ON public.order_items;
CREATE POLICY "order_items_guest_insert" ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id IS NULL));

DROP POLICY IF EXISTS "box_curations_own_insert" ON public.box_curations;
CREATE POLICY "box_curations_own_insert" ON public.box_curations
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    AND pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "voucher_usages_own_insert" ON public.voucher_usages;
CREATE POLICY "voucher_usages_own_insert" ON public.voucher_usages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "voucher_usages_guest_insert" ON public.voucher_usages;
CREATE POLICY "voucher_usages_guest_insert" ON public.voucher_usages
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Khách được insert gói của chính mình (đăng ký subscription); cập nhật vòng
-- đời (pause/resume/cancel/renew) chỉ được làm qua RPC SECURITY DEFINER bên dưới.
DROP POLICY IF EXISTS "subscriptions_own_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_own_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Bỏ quyền UPDATE trực tiếp của khách trên subscriptions: trước đây khách có
-- thể tự sửa remaining_cycles/total_prepaid_amount/status vì WITH CHECK chỉ
-- kiểm tra user_id. Toàn bộ thay đổi trạng thái gói phải đi qua RPC.
DROP POLICY IF EXISTS "subscriptions_own_update" ON public.subscriptions;

-- ------------------------------------------------------------------------------
-- 2. Hàm phụ trợ: phí ship theo khu vực (mục 6 SPEC) + kiểm tra HCM
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calc_shipping_fee(p_province text, p_subtotal numeric, p_free_shipping boolean DEFAULT false)
RETURNS numeric AS $$
BEGIN
  IF p_free_shipping OR p_subtotal >= 500000 THEN
    RETURN 0;
  END IF;
  IF p_province ILIKE '%Hồ Chí Minh%' OR p_province ILIKE '%TP.HCM%' OR p_province ILIKE '%TPHCM%' THEN
    RETURN 25000;
  END IF;
  RETURN 35000;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------------------------
-- 3. Tạo đơn mua 1 lần (retail + mystery box lẻ) - "checkout_create_order"
--    Input: p_items dạng jsonb array [{ "product_id"|"box_type_id", "pet_id", "quantity" }]
--    Toàn bộ đơn giá / tồn kho / voucher được tính lại từ DB hiện tại, KHÔNG
--    nhận giá từ client.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.checkout_create_order(
  p_items jsonb,
  p_recipient_name text,
  p_recipient_phone text,
  p_province_city text,
  p_district text,
  p_ward text,
  p_shipping_address text,
  p_payment_method public.payment_method,
  p_customer_notes text DEFAULT NULL,
  p_voucher_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_pet_owner uuid;
  v_subtotal numeric := 0;
  v_line_price numeric;
  v_line_name text;
  v_qty integer;
  v_shipping_fee numeric := 0;
  v_discount numeric := 0;
  v_voucher public.vouchers%ROWTYPE;
  v_free_ship boolean := false;
  v_order_id uuid;
  v_order_code text;
  v_order_type text := 'retail';
  v_has_box boolean := false;
  v_status public.order_status;
  v_payment_status public.payment_status := 'pending';
  v_expires timestamptz := NULL;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
BEGIN
  IF p_payment_method <> 'cod' AND v_user_id IS NULL THEN
    -- online payment cho khách vãng lai vẫn cho phép (guest), không bắt buộc login
    NULL;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ERR_EMPTY_CART';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::integer, 1);
    IF v_qty < 1 OR v_qty > 10 THEN
      RAISE EXCEPTION 'ERR_INVALID_QUANTITY';
    END IF;

    IF v_item->>'product_id' IS NOT NULL THEN
      SELECT * INTO v_product FROM public.products
        WHERE id = (v_item->>'product_id')::uuid AND is_active = true AND is_retail = true
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND';
      END IF;
      IF v_product.stock_quantity < v_qty THEN
        RAISE EXCEPTION 'ERR_OUT_OF_STOCK: %', v_product.name;
      END IF;
      v_line_price := v_product.price;
      v_line_name := v_product.name;
      v_line := jsonb_build_object(
        'product_id', v_product.id, 'name', v_line_name,
        'unit_price', v_line_price, 'quantity', v_qty,
        'total_price', v_line_price * v_qty
      );
    ELSIF v_item->>'box_type_id' IS NOT NULL THEN
      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'ERR_LOGIN_REQUIRED_FOR_BOX';
      END IF;
      SELECT * INTO v_box FROM public.box_types
        WHERE id = (v_item->>'box_type_id')::uuid AND is_active = true;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'ERR_BOX_NOT_FOUND';
      END IF;
      SELECT user_id INTO v_pet_owner FROM public.pets WHERE id = (v_item->>'pet_id')::uuid;
      IF v_pet_owner IS NULL OR v_pet_owner <> v_user_id THEN
        RAISE EXCEPTION 'ERR_PET_NOT_OWNED';
      END IF;
      v_line_price := v_box.baseprice;
      v_line_name := v_box.name;
      v_has_box := true;
      v_line := jsonb_build_object(
        'box_type_id', v_box.id, 'pet_id', v_item->>'pet_id', 'name', v_line_name,
        'unit_price', v_line_price, 'quantity', v_qty,
        'total_price', v_line_price * v_qty
      );
    ELSE
      RAISE EXCEPTION 'ERR_INVALID_ITEM';
    END IF;

    v_subtotal := v_subtotal + (v_line_price * v_qty);
    v_lines := v_lines || jsonb_build_array(v_line);
  END LOOP;

  IF v_has_box THEN
    v_order_type := 'mystery_box';
  END IF;

  -- Voucher
  IF p_voucher_code IS NOT NULL AND length(trim(p_voucher_code)) > 0 THEN
    SELECT * INTO v_voucher FROM public.vouchers
      WHERE code = upper(trim(p_voucher_code)) AND is_active = true
        AND valid_from <= now() AND valid_to >= now();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_VOUCHER_INVALID';
    END IF;
    IF v_subtotal < v_voucher.min_order_value THEN
      RAISE EXCEPTION 'ERR_VOUCHER_MIN_ORDER';
    END IF;
    IF v_voucher.used_count >= v_voucher.usage_limit_total THEN
      RAISE EXCEPTION 'ERR_VOUCHER_EXHAUSTED';
    END IF;
    IF v_user_id IS NOT NULL AND (
      SELECT count(*) FROM public.voucher_usages WHERE voucher_id = v_voucher.id AND user_id = v_user_id
    ) >= v_voucher.usage_limit_per_user THEN
      RAISE EXCEPTION 'ERR_VOUCHER_USER_LIMIT';
    END IF;

    IF v_voucher.voucher_type = 'percentage' THEN
      v_discount := round(v_subtotal * v_voucher.discount_value / 100.0);
      IF v_voucher.max_discount IS NOT NULL THEN
        v_discount := least(v_discount, v_voucher.max_discount);
      END IF;
    ELSIF v_voucher.voucher_type = 'fixed_amount' THEN
      v_discount := least(v_voucher.discount_value, v_subtotal);
    ELSIF v_voucher.voucher_type = 'free_shipping' THEN
      v_free_ship := true;
    END IF;
  END IF;

  v_shipping_fee := public.calc_shipping_fee(p_province_city, v_subtotal, v_free_ship);
  IF v_free_ship THEN
    v_discount := v_discount + v_shipping_fee;
  END IF;

  v_order_code := 'FPET-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

  IF p_payment_method = 'cod' THEN
    IF v_subtotal + v_shipping_fee - v_discount > 2000000 THEN
      RAISE EXCEPTION 'ERR_COD_LIMIT_EXCEEDED';
    END IF;
    v_status := 'da_xac_nhan';
    v_payment_status := 'pending';
    v_expires := NULL;
  ELSE
    v_status := 'cho_thanh_toan';
    v_payment_status := 'pending';
    v_expires := now() + interval '30 minutes';
  END IF;

  INSERT INTO public.orders (
    order_code, user_id, order_type, status, payment_method, payment_status,
    subtotal, shipping_fee, discount_amount, total_amount, voucher_id,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    customer_notes, payment_expires_at, paid_at
  ) VALUES (
    v_order_code, v_user_id, v_order_type, v_status, p_payment_method, v_payment_status,
    v_subtotal, v_shipping_fee, v_discount, greatest(v_subtotal + v_shipping_fee - v_discount, 0), v_voucher.id,
    p_recipient_name, p_recipient_phone, p_shipping_address, p_province_city, p_district, p_ward,
    p_customer_notes, v_expires, CASE WHEN v_status = 'da_xac_nhan' THEN now() ELSE NULL END
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    INSERT INTO public.order_items (order_id, product_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
    VALUES (
      v_order_id,
      (v_line->>'product_id')::uuid,
      (v_line->>'box_type_id')::uuid,
      (v_line->>'pet_id')::uuid,
      v_line->>'name',
      (v_line->>'unit_price')::numeric,
      (v_line->>'quantity')::integer,
      (v_line->>'total_price')::numeric
    );

    IF v_line->>'box_type_id' IS NOT NULL THEN
      INSERT INTO public.box_curations (order_id, pet_id, box_type_id, status)
      VALUES (v_order_id, (v_line->>'pet_id')::uuid, (v_line->>'box_type_id')::uuid, 'pending_curation');
    END IF;
  END LOOP;

  IF v_voucher.id IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = v_voucher.id;
    INSERT INTO public.voucher_usages (voucher_id, user_id, order_id, discount_amount)
    VALUES (v_voucher.id, v_user_id, v_order_id, v_discount);
  END IF;

  -- Đơn xác nhận ngay (COD): trừ tồn kho ngay lúc tạo đơn cho các dòng bán lẻ.
  IF v_status = 'da_xac_nhan' THEN
    PERFORM public._deduct_retail_stock(v_order_id);
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'status', v_status,
    'payment_status', v_payment_status,
    'total_amount', greatest(v_subtotal + v_shipping_fee - v_discount, 0),
    'payment_expires_at', v_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkout_create_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkout_create_order TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. Trừ tồn kho cho các dòng bán lẻ của 1 đơn (dùng nội bộ, không public)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._deduct_retail_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_stock integer;
BEGIN
  FOR v_item IN
    SELECT oi.product_id, oi.quantity, oi.order_id, p.stock_quantity
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
    FOR UPDATE OF p
  LOOP
    v_new_stock := v_item.stock_quantity - v_item.quantity;
    UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note)
    VALUES (v_item.product_id, 'retail_sale', -v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Trừ kho khi xác nhận đơn bán lẻ');
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Xác nhận thanh toán (giả lập IPN của cổng MoMo/VNPay sandbox)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND order_code = p_order_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND';
  END IF;
  IF v_order.status <> 'cho_thanh_toan' THEN
    RETURN jsonb_build_object('status', v_order.status, 'payment_status', v_order.payment_status);
  END IF;
  IF v_order.payment_expires_at IS NOT NULL AND v_order.payment_expires_at < now() THEN
    RAISE EXCEPTION 'ERR_PAYMENT_EXPIRED';
  END IF;

  UPDATE public.orders
    SET status = 'da_xac_nhan', payment_status = 'paid', paid_at = now()
    WHERE id = p_order_id;

  PERFORM public._deduct_retail_stock(p_order_id);

  IF v_order.order_type = 'subscription_initial' AND v_order.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions SET status = 'dang_hoat_dong' WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
  END IF;

  RETURN jsonb_build_object('status', 'da_xac_nhan', 'payment_status', 'paid');
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. Cron: tự hủy đơn "chờ thanh toán" quá 30 phút (không cần restock vì
--    tồn kho chỉ bị trừ khi đơn đã được xác nhận/thanh toán, xem mục 3).
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.orders
    SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Hết hạn thanh toán tự động (30 phút)'
    WHERE status = 'cho_thanh_toan' AND payment_expires_at IS NOT NULL AND payment_expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expired_orders FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders TO anon, authenticated;

COMMENT ON FUNCTION public.cancel_expired_orders IS 'Gọi định kỳ bởi Vercel Cron (route /api/cron/cancel-expired-orders, có kiểm tra secret header trước khi gọi hàm này).';
