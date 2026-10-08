-- TÍCH ĐIỂM + CHỈ CÒN payOS VÀ COD (08/10/2026)
--
-- Quy tắc tích điểm (chủ cửa hàng chốt 08/10/2026):
--  - Mua 10.000₫ được 1 điểm (tính trên tiền hàng khách thật trả: tổng đơn trừ phí ship, sau voucher và điểm).
--  - 1 điểm trừ 1.000₫ vào tiền hàng khi thanh toán (không trừ phí ship), không giới hạn số điểm mỗi đơn,
--    dùng chung với voucher. Điểm không hết hạn.
--  - Cộng điểm khi đơn giao thành công; gói định kỳ (biên nhận đăng ký / gia hạn) cộng khi thanh toán xong.
--  - Điểm đã dùng được trả lại khi đơn bị hủy (hết hạn thanh toán, khách hủy, nhân viên hủy, hết hàng...).
--  - Đơn đổi / trả được hoàn tiền thì thu lại điểm đã cộng của đơn đó.
-- Sổ điểm là bảng point_transactions (mỗi dòng một lần cộng / trừ); số dư = tổng cột points.
-- Khách chỉ đọc sổ của mình, không ghi trực tiếp được.
--
-- Thanh toán: chỉ nhận payOS (chuyển khoản VietQR) và COD cho đơn mới. Phần nối API payOS làm sau
-- (bản nháp phía server ở docs/payos/payos_server.sql); trong lúc chờ, trang thanh toán vẫn dùng nút giả lập.

-- =====================================================================================
-- 1. Chỉ nhận payOS hoặc COD cho đơn mới
-- =====================================================================================
-- Đơn hộp theo kỳ chép phương thức của gói (gói cũ có thể là MoMo/VNPay) nên không xét
CREATE OR REPLACE FUNCTION public._trg_orders_payment_method()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_type <> 'subscription_cycle' AND NEW.payment_method NOT IN ('payos', 'cod') THEN
    RAISE EXCEPTION 'ERR_PAYMENT_METHOD_NOT_SUPPORTED';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_orders_payment_method() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_payment_method ON public.orders;
CREATE TRIGGER trg_orders_payment_method
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_orders_payment_method();

-- Nút "đã thanh toán" giả lập: chỉ chủ đơn (hoặc nhân viên) bấm được cho đơn của mình.
-- Trước đây ai biết mã đơn + id cũng xác nhận được, kể cả không đăng nhập.
DO $$
DECLARE
  v_def text;
  v_old constant text := '  IF NOT FOUND THEN
    RAISE EXCEPTION ''ERR_ORDER_NOT_FOUND'';
  END IF;';
  v_new constant text := '  IF NOT FOUND OR (v_order.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_staff()) THEN
    RAISE EXCEPTION ''ERR_ORDER_NOT_FOUND'';
  END IF;';
BEGIN
  SELECT pg_get_functiondef('public.confirm_order_payment(uuid, text)'::regprocedure) INTO v_def;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'confirm_order_payment: không tìm thấy câu kiểm tra đơn cần thay';
  END IF;
  EXECUTE overlay(v_def PLACING v_new FROM position(v_old IN v_def) FOR length(v_old));
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text) TO authenticated;

-- =====================================================================================
-- 2. Sổ điểm
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  -- earn: cộng khi giao / thanh toán gói; redeem: dùng khi đặt hàng; refund_redeem: trả lại khi đơn hủy;
  -- revoke_earn: thu lại khi đơn được hoàn tiền; adjust: admin điều chỉnh tay
  kind text NOT NULL CHECK (kind IN ('earn', 'redeem', 'refund_redeem', 'revoke_earn', 'adjust')),
  points integer NOT NULL CHECK (points <> 0),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mỗi đơn chỉ có tối đa một dòng mỗi loại (chạy lại trigger / hàm không cộng trùng)
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_order_kind_key
  ON public.point_transactions (order_id, kind) WHERE order_id IS NOT NULL AND kind <> 'adjust';
CREATE INDEX IF NOT EXISTS point_transactions_user_idx ON public.point_transactions (user_id, created_at DESC);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS point_transactions_own_select ON public.point_transactions;
CREATE POLICY point_transactions_own_select ON public.point_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS point_transactions_staff_select ON public.point_transactions;
CREATE POLICY point_transactions_staff_select ON public.point_transactions
  FOR SELECT TO authenticated USING (public.is_staff());

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0 CHECK (points_used >= 0),
  ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0 CHECK (points_discount >= 0);

CREATE OR REPLACE FUNCTION public._points_balance(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(sum(points), 0)::integer FROM public.point_transactions WHERE user_id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public._points_balance(uuid) FROM PUBLIC, anon, authenticated;

-- Số điểm hiện có của người đang đăng nhập
CREATE OR REPLACE FUNCTION public.my_points()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public._points_balance(auth.uid());
$function$;

REVOKE ALL ON FUNCTION public.my_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_points() TO authenticated;

-- Số điểm thật sự được dùng cho một đơn: không quá số dư, không quá tiền hàng (1 điểm = 1.000₫).
-- Khóa hồ sơ khách để hai đơn đặt cùng lúc không tiêu trùng một lượng điểm.
CREATE OR REPLACE FUNCTION public._points_usable(p_user_id uuid, p_requested integer, p_goods_amount numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_requested, 0) <= 0 THEN
    RETURN 0;
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  RETURN GREATEST(0, LEAST(p_requested, public._points_balance(p_user_id), floor(GREATEST(p_goods_amount, 0) / 1000)::integer));
END;
$function$;

REVOKE ALL ON FUNCTION public._points_usable(uuid, integer, numeric) FROM PUBLIC, anon, authenticated;

-- Cộng / trả / thu lại điểm theo thay đổi của đơn
CREATE OR REPLACE FUNCTION public._trg_orders_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_earn integer;
  v_earned integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cộng điểm: đơn hàng giao thành công, hoặc biên nhận gói định kỳ đã thanh toán
  IF (NEW.order_type IN ('retail', 'mystery_box') AND NEW.status = 'da_giao' AND OLD.status IS DISTINCT FROM 'da_giao')
     OR (NEW.order_type IN ('subscription_initial', 'subscription_renewal')
         AND NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.status <> 'da_huy') THEN
    v_earn := floor(GREATEST(NEW.total_amount - NEW.shipping_fee, 0) / 10000)::integer;
    IF v_earn > 0 THEN
      INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
      VALUES (NEW.user_id, NEW.id, 'earn', v_earn, 'Tích điểm đơn ' || NEW.order_code)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.user_id, 'Bạn được cộng ' || v_earn || ' điểm',
          'Từ đơn ' || NEW.order_code || '. Mỗi điểm trừ 1.000₫ ở lần mua sau.', 'order', '/my-account/points');
      END IF;
    END IF;
  END IF;

  -- Đơn bị hủy: trả lại điểm đã dùng
  IF NEW.status = 'da_huy' AND OLD.status IS DISTINCT FROM 'da_huy' AND NEW.points_used > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
    VALUES (NEW.user_id, NEW.id, 'refund_redeem', NEW.points_used, 'Trả lại điểm do đơn ' || NEW.order_code || ' bị hủy')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Đổi / trả được hoàn tiền: thu lại điểm đã cộng của đơn
  IF NEW.return_resolution = 'refunded' AND OLD.return_resolution IS DISTINCT FROM 'refunded' THEN
    SELECT points INTO v_earned FROM public.point_transactions WHERE order_id = NEW.id AND kind = 'earn';
    IF v_earned IS NOT NULL THEN
      INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
      VALUES (NEW.user_id, NEW.id, 'revoke_earn', -v_earned, 'Thu lại điểm do đơn ' || NEW.order_code || ' được hoàn tiền')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_orders_points() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_points ON public.orders;
CREATE TRIGGER trg_orders_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status
        OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
        OR OLD.return_resolution IS DISTINCT FROM NEW.return_resolution)
  EXECUTE FUNCTION public._trg_orders_points();

-- Admin cộng / trừ điểm tay (bồi thường, sửa sai)
CREATE OR REPLACE FUNCTION public.admin_adjust_points(p_user_id uuid, p_points integer, p_note text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF COALESCE(p_points, 0) = 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_POINTS';
  END IF;
  IF char_length(trim(COALESCE(p_note, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_NOTE_REQUIRED';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_USER_NOT_FOUND';
  END IF;
  IF p_points < 0 AND public._points_balance(p_user_id) + p_points < 0 THEN
    RAISE EXCEPTION 'ERR_POINTS_NEGATIVE';
  END IF;
  INSERT INTO public.point_transactions (user_id, kind, points, note, created_by)
  VALUES (p_user_id, 'adjust', p_points, trim(p_note), auth.uid());
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id,
    CASE WHEN p_points > 0 THEN 'Bạn được cộng ' || p_points || ' điểm' ELSE 'Điểm của bạn được điều chỉnh ' || p_points END,
    trim(p_note), 'system', '/my-account/points');
  RETURN public._points_balance(p_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_adjust_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid, integer, text) TO authenticated;

-- =====================================================================================
-- 3. Dùng điểm khi đặt hàng (thân hàm lấy từ bản đang chạy, thêm p_points)
-- =====================================================================================
DROP FUNCTION IF EXISTS public.checkout_create_order(jsonb, text, text, text, text, text, text, payment_method, text, text);

CREATE OR REPLACE FUNCTION public.checkout_create_order(p_items jsonb, p_recipient_name text, p_recipient_phone text, p_province_city text, p_district text, p_ward text, p_shipping_address text, p_payment_method payment_method, p_customer_notes text DEFAULT NULL::text, p_voucher_code text DEFAULT NULL::text, p_points integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_points integer := 0;
  v_points_discount numeric := 0;
  v_total numeric;
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

  IF p_voucher_code IS NOT NULL AND length(trim(p_voucher_code)) > 0 THEN
    SELECT * INTO v_voucher FROM public.vouchers
      WHERE code = upper(trim(p_voucher_code)) AND is_active = true
        AND valid_from <= now() AND valid_to >= now()
      FOR UPDATE; -- khóa dòng voucher: hai đơn cùng lúc không vượt giới hạn lượt dùng
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_VOUCHER_INVALID';
    END IF;
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

  -- Điểm trừ vào tiền hàng còn lại sau voucher (không trừ phí ship)
  v_points := public._points_usable(v_user_id, p_points, v_subtotal - v_discount);
  v_points_discount := v_points * 1000;
  v_total := greatest(v_subtotal + v_shipping_fee - v_discount - v_points_discount, 0);

  v_order_code := public.new_order_code();

  IF p_payment_method = 'cod' THEN
    IF v_total > 2000000 THEN
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
    subtotal, shipping_fee, discount_amount, points_used, points_discount, total_amount, voucher_id,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    customer_notes, payment_expires_at, paid_at
  ) VALUES (
    v_order_code, v_user_id, v_order_type, v_status, p_payment_method, v_payment_status,
    v_subtotal, v_shipping_fee, v_discount, v_points, v_points_discount, v_total, v_voucher.id,
    p_recipient_name, p_recipient_phone, p_shipping_address, p_province_city, p_district, p_ward,
    p_customer_notes, v_expires, NULL
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

  IF v_points > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
    VALUES (v_user_id, v_order_id, 'redeem', -v_points, 'Dùng điểm cho đơn ' || v_order_code);
  END IF;

  IF v_status = 'da_xac_nhan' THEN
    PERFORM public._deduct_retail_stock(v_order_id);
  ELSIF v_total = 0 THEN
    -- Điểm / voucher trả hết tiền: không cần thanh toán online
    PERFORM public.confirm_order_payment(v_order_id, v_order_code);
    v_status := 'da_xac_nhan';
    v_payment_status := 'paid';
    v_expires := NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'status', v_status,
    'payment_status', v_payment_status,
    'total_amount', v_total,
    'points_used', v_points,
    'payment_expires_at', v_expires
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.checkout_create_order(jsonb, text, text, text, text, text, text, payment_method, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_create_order(jsonb, text, text, text, text, text, text, payment_method, text, text, integer) TO authenticated;

-- =====================================================================================
-- 4. Dùng điểm khi đăng ký gói (thân hàm lấy từ bản đang chạy, thêm p_points)
-- =====================================================================================
DROP FUNCTION IF EXISTS public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method, text);

CREATE OR REPLACE FUNCTION public.subscribe_to_box(
  p_box_type_id uuid, p_pet_id uuid, p_plan_id uuid, p_delivery_schedule delivery_schedule,
  p_recipient_name text, p_recipient_phone text, p_province_city text, p_district text, p_ward text,
  p_shipping_address text, p_payment_method payment_method, p_voucher_code text DEFAULT NULL, p_points integer DEFAULT 0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_box public.box_types%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_voucher public.vouchers%ROWTYPE;
  v_pet_owner uuid;
  v_unit_price numeric;
  v_total numeric;
  v_shipping_fee numeric;
  v_discount numeric := 0;
  v_free_ship boolean := false;
  v_points integer := 0;
  v_points_discount numeric := 0;
  v_amount numeric;
  v_next_delivery date;
  v_cutoff date;
  v_sub_id uuid;
  v_sub_code text;
  v_order_id uuid;
  v_order_code text;
  v_paid boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERR_LOGIN_REQUIRED';
  END IF;
  IF p_payment_method = 'cod' THEN
    RAISE EXCEPTION 'ERR_COD_NOT_ALLOWED_FOR_SUBSCRIPTION';
  END IF;

  SELECT * INTO v_box FROM public.box_types WHERE id = p_box_type_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_BOX_NOT_FOUND'; END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_PLAN_NOT_FOUND'; END IF;

  SELECT user_id INTO v_pet_owner FROM public.pets WHERE id = p_pet_id;
  IF v_pet_owner IS NULL OR v_pet_owner <> v_user_id THEN
    RAISE EXCEPTION 'ERR_PET_NOT_OWNED';
  END IF;

  v_unit_price := public.plan_unit_price(v_box.baseprice, v_plan.discount_percentage);
  v_total := v_unit_price * v_plan.cycle_count;

  IF p_voucher_code IS NOT NULL AND length(trim(p_voucher_code)) > 0 THEN
    SELECT * INTO v_voucher FROM public.vouchers
      WHERE code = upper(trim(p_voucher_code)) AND is_active = true
        AND valid_from <= now() AND valid_to >= now()
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_VOUCHER_INVALID';
    END IF;
    IF v_voucher.scope NOT IN ('all', 'box', 'first_subscription') THEN
      RAISE EXCEPTION 'ERR_VOUCHER_SCOPE';
    END IF;
    -- SPEC §8: voucher không cộng dồn với giảm giá của gói 3/6
    IF v_plan.discount_percentage > 0 THEN
      RAISE EXCEPTION 'ERR_VOUCHER_NOT_STACKABLE';
    END IF;
    IF v_voucher.scope = 'first_subscription' AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE user_id = v_user_id AND order_type = 'subscription_initial' AND payment_status IN ('paid', 'refunded')
    ) THEN
      RAISE EXCEPTION 'ERR_VOUCHER_NOT_FIRST_SUBSCRIPTION';
    END IF;
    IF v_total < v_voucher.min_order_value THEN
      RAISE EXCEPTION 'ERR_VOUCHER_MIN_ORDER';
    END IF;
    IF v_voucher.used_count >= v_voucher.usage_limit_total THEN
      RAISE EXCEPTION 'ERR_VOUCHER_EXHAUSTED';
    END IF;
    IF (
      SELECT count(*) FROM public.voucher_usages vu
      JOIN public.orders o ON o.id = vu.order_id
      WHERE vu.voucher_id = v_voucher.id
        AND o.status <> 'da_huy'
        AND (vu.user_id = v_user_id
             OR regexp_replace(o.recipient_phone, '\D', '', 'g') = regexp_replace(p_recipient_phone, '\D', '', 'g'))
    ) >= v_voucher.usage_limit_per_user THEN
      RAISE EXCEPTION 'ERR_VOUCHER_USER_LIMIT';
    END IF;

    IF v_voucher.voucher_type = 'percentage' THEN
      v_discount := round(v_total * v_voucher.discount_value / 100.0);
      IF v_voucher.max_discount IS NOT NULL THEN
        v_discount := least(v_discount, v_voucher.max_discount);
      END IF;
    ELSIF v_voucher.voucher_type = 'fixed_amount' THEN
      v_discount := least(v_voucher.discount_value, v_total);
    ELSIF v_voucher.voucher_type = 'free_shipping' THEN
      v_free_ship := true;
    END IF;
  END IF;

  v_shipping_fee := public.calc_shipping_fee(p_province_city, v_total, v_plan.free_shipping OR v_free_ship);

  -- Điểm trừ vào tiền gói còn lại sau voucher (không trừ phí ship)
  v_points := public._points_usable(v_user_id, p_points, v_total - v_discount);
  v_points_discount := v_points * 1000;
  v_amount := greatest(v_total + v_shipping_fee - v_discount - v_points_discount, 0);

  -- Hộp đầu tiên gửi ngay sau khi thanh toán: kỳ 1 đến hạn chuẩn bị ngay hôm nay
  v_next_delivery := CURRENT_DATE;
  v_cutoff := CURRENT_DATE;

  v_sub_code := public.new_subscription_code();

  INSERT INTO public.subscriptions (
    subscription_code, user_id, pet_id, box_type_id, plan_id,
    total_cycles, remaining_cycles, current_cycle, status,
    delivery_schedule, shipping_address_snapshot, total_prepaid_amount,
    next_delivery_date, cutoff_date
  ) VALUES (
    v_sub_code, v_user_id, p_pet_id, p_box_type_id, p_plan_id,
    v_plan.cycle_count, v_plan.cycle_count, 1, 'cho_thanh_toan',
    p_delivery_schedule,
    jsonb_build_object('recipient_name', p_recipient_name, 'phone', p_recipient_phone,
      'province_city', p_province_city, 'district', p_district, 'ward', p_ward, 'address', p_shipping_address),
    v_total, v_next_delivery, v_cutoff
  ) RETURNING id INTO v_sub_id;

  v_order_code := public.new_order_code();

  INSERT INTO public.orders (
    order_code, user_id, order_type, subscription_id, cycle_index, status, payment_method, payment_status,
    subtotal, shipping_fee, discount_amount, points_used, points_discount, total_amount, voucher_id,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    payment_expires_at
  ) VALUES (
    v_order_code, v_user_id, 'subscription_initial', v_sub_id, 1, 'cho_thanh_toan', p_payment_method, 'pending',
    v_total, v_shipping_fee, v_discount, v_points, v_points_discount, v_amount, v_voucher.id,
    p_recipient_name, p_recipient_phone, p_shipping_address, p_province_city, p_district, p_ward,
    now() + interval '30 minutes'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
  VALUES (v_order_id, p_box_type_id, p_pet_id, v_box.name || ' - ' || v_plan.name, v_unit_price, v_plan.cycle_count, v_total);

  IF v_voucher.id IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = v_voucher.id;
    INSERT INTO public.voucher_usages (voucher_id, user_id, order_id, discount_amount)
    VALUES (v_voucher.id, v_user_id, v_order_id, v_discount);
  END IF;

  IF v_points > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
    VALUES (v_user_id, v_order_id, 'redeem', -v_points, 'Dùng điểm cho gói ' || v_sub_code);
  END IF;

  -- Điểm / voucher trả hết tiền: kích hoạt gói luôn
  IF v_amount = 0 THEN
    PERFORM public.confirm_order_payment(v_order_id, v_order_code);
    v_paid := true;
  END IF;

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id, 'order_id', v_order_id, 'order_code', v_order_code,
    'total_amount', v_amount, 'points_used', v_points, 'paid', v_paid,
    'payment_expires_at', now() + interval '30 minutes',
    'next_delivery_date', v_next_delivery, 'cutoff_date', v_cutoff,
    'second_delivery_date', public.second_delivery_window(p_delivery_schedule, CURRENT_DATE)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method, text, integer) TO authenticated;

-- =====================================================================================
-- 5. Dùng điểm khi gia hạn gói (thân hàm lấy từ bản đang chạy, thêm p_points)
-- =====================================================================================
DROP FUNCTION IF EXISTS public.renew_subscription(uuid, uuid, payment_method);

CREATE OR REPLACE FUNCTION public.renew_subscription(p_subscription_id uuid, p_plan_id uuid, p_payment_method payment_method, p_points integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_sub public.subscriptions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_addr jsonb;
  v_unit_price numeric;
  v_total numeric;
  v_shipping_fee numeric;
  v_points integer := 0;
  v_points_discount numeric := 0;
  v_amount numeric;
  v_order_id uuid;
  v_order_code text;
  v_paid boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERR_LOGIN_REQUIRED';
  END IF;
  IF p_payment_method = 'cod' THEN
    RAISE EXCEPTION 'ERR_COD_NOT_ALLOWED_FOR_SUBSCRIPTION';
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  IF NOT (
    (v_sub.status = 'dang_hoat_dong' AND v_sub.remaining_cycles <= 1)
    OR (v_sub.status = 'qua_han' AND v_sub.grace_period_expires_at >= now())
  ) THEN
    RAISE EXCEPTION 'ERR_RENEW_NOT_ALLOWED';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_PLAN_NOT_FOUND'; END IF;

  SELECT * INTO v_box FROM public.box_types WHERE id = v_sub.box_type_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_BOX_NOT_FOUND'; END IF;

  -- Mỗi gói chỉ giữ 1 đơn gia hạn đang chờ thanh toán (đơn cũ bị hủy thì điểm đã dùng được trả lại)
  UPDATE public.orders
    SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Thay bằng yêu cầu gia hạn mới'
    WHERE subscription_id = v_sub.id AND order_type = 'subscription_renewal' AND status = 'cho_thanh_toan';

  v_addr := v_sub.shipping_address_snapshot;
  v_unit_price := public.plan_unit_price(v_box.baseprice, v_plan.discount_percentage);
  v_total := v_unit_price * v_plan.cycle_count;
  v_shipping_fee := public.calc_shipping_fee(COALESCE(v_addr->>'province_city', ''), v_total, v_plan.free_shipping);
  v_points := public._points_usable(v_user_id, p_points, v_total);
  v_points_discount := v_points * 1000;
  v_amount := greatest(v_total + v_shipping_fee - v_points_discount, 0);
  v_order_code := public.new_order_code();

  INSERT INTO public.orders (
    order_code, user_id, order_type, subscription_id, renewal_plan_id, status, payment_method, payment_status,
    subtotal, shipping_fee, discount_amount, points_used, points_discount, total_amount,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    payment_expires_at
  ) VALUES (
    v_order_code, v_user_id, 'subscription_renewal', v_sub.id, v_plan.id, 'cho_thanh_toan', p_payment_method, 'pending',
    v_total, v_shipping_fee, 0, v_points, v_points_discount, v_amount,
    COALESCE(v_addr->>'recipient_name', ''), COALESCE(v_addr->>'phone', ''), COALESCE(v_addr->>'address', ''),
    COALESCE(v_addr->>'province_city', ''), COALESCE(v_addr->>'district', ''), COALESCE(v_addr->>'ward', ''),
    now() + interval '30 minutes'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
  VALUES (v_order_id, v_sub.box_type_id, v_sub.pet_id, 'Gia hạn ' || v_box.name || ' - ' || v_plan.name, v_unit_price, v_plan.cycle_count, v_total);

  IF v_points > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, note)
    VALUES (v_user_id, v_order_id, 'redeem', -v_points, 'Dùng điểm gia hạn gói ' || v_sub.subscription_code);
  END IF;

  IF v_amount = 0 THEN
    PERFORM public.confirm_order_payment(v_order_id, v_order_code);
    v_paid := true;
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_code', v_order_code, 'total_amount', v_amount, 'points_used', v_points, 'paid', v_paid);
END;
$function$;

REVOKE ALL ON FUNCTION public.renew_subscription(uuid, uuid, payment_method, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_subscription(uuid, uuid, payment_method, integer) TO authenticated;
