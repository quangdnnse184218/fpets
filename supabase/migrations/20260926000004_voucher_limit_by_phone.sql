-- ==============================================================================
-- Giới hạn lượt dùng voucher mỗi khách áp dụng cả cho khách vãng lai (theo SĐT nhận
-- hàng) và cho người đăng nhập đặt hộ bằng SĐT đã dùng mã; đơn đã hủy không tính lượt.
-- ==============================================================================

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
  v_retail_subtotal numeric := 0;
  v_box_subtotal numeric := 0;
  v_voucher_base numeric := 0;
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
    IF v_item->>'box_type_id' IS NOT NULL THEN
      v_box_subtotal := v_box_subtotal + (v_line_price * v_qty);
    ELSE
      v_retail_subtotal := v_retail_subtotal + (v_line_price * v_qty);
    END IF;
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
    -- Phạm vi voucher (SPEC §7): giảm giá chỉ tính trên phần hàng thuộc phạm vi
    v_voucher_base := CASE v_voucher.scope
      WHEN 'all' THEN v_subtotal
      WHEN 'retail' THEN v_retail_subtotal
      WHEN 'box' THEN v_box_subtotal
      ELSE 0
    END;
    IF v_voucher_base <= 0 THEN
      RAISE EXCEPTION 'ERR_VOUCHER_SCOPE';
    END IF;
    IF v_voucher_base < v_voucher.min_order_value THEN
      RAISE EXCEPTION 'ERR_VOUCHER_MIN_ORDER';
    END IF;
    IF v_voucher.used_count >= v_voucher.usage_limit_total THEN
      RAISE EXCEPTION 'ERR_VOUCHER_EXHAUSTED';
    END IF;
    -- Giới hạn lượt dùng mỗi khách: theo tài khoản, hoặc theo SĐT nhận hàng với khách vãng lai
    IF (
      SELECT count(*) FROM public.voucher_usages vu
      JOIN public.orders o ON o.id = vu.order_id
      WHERE vu.voucher_id = v_voucher.id
        AND o.status <> 'da_huy'
        AND (
          (v_user_id IS NOT NULL AND vu.user_id = v_user_id)
          OR regexp_replace(o.recipient_phone, '\D', '', 'g') = regexp_replace(p_recipient_phone, '\D', '', 'g')
        )
    ) >= v_voucher.usage_limit_per_user THEN
      RAISE EXCEPTION 'ERR_VOUCHER_USER_LIMIT';
    END IF;

    IF v_voucher.voucher_type = 'percentage' THEN
      v_discount := round(v_voucher_base * v_voucher.discount_value / 100.0);
      IF v_voucher.max_discount IS NOT NULL THEN
        v_discount := least(v_discount, v_voucher.max_discount);
      END IF;
    ELSIF v_voucher.voucher_type = 'fixed_amount' THEN
      v_discount := least(v_voucher.discount_value, v_voucher_base);
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
    p_customer_notes, v_expires, NULL -- COD chưa thu tiền; paid_at chỉ ghi khi thanh toán thật
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
