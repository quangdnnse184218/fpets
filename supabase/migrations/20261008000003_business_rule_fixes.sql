-- SỬA CÁC CHỖ LỆCH SPEC (rà soát nghiệp vụ 08/10/2026)
--  1. Mọi đơn đều cần đăng nhập (SPEC §4): trước đây chỉ giao diện chặn, server vẫn nhận đơn của khách vãng lai.
--  2. Khách tự hủy đơn khi đơn còn "Chờ thanh toán" hoặc "Đã xác nhận" (SPEC §7); đơn đã trả online
--     thì nhân viên hoàn tiền rồi bấm "Đã hoàn tiền".
--  3. Tạm dừng gói tối đa 2 kỳ liên tiếp (SPEC §5): trước đây tạm dừng, tiếp tục, tạm dừng lại được mãi.
--  4. Áp voucher khi đăng ký gói (SPEC §5 bước 4, §8): phạm vi "gói định kỳ lần đầu" trước đây không dùng được ở đâu.
--     Voucher không cộng dồn với giảm giá của gói 3/6, nên chỉ áp cho gói không có giảm giá.
--  5. Hộp không bao giờ chứa món bé dị ứng (SPEC §3): trước đây chỉ giao diện admin chặn;
--     duyệt hộp còn nhận trùng một món hai lần (kiểm tồn sai, cộng trùng giá trị).

-- =====================================================================================
-- 1. Đơn mới bắt buộc có tài khoản
-- =====================================================================================
-- Kiểm tra lúc tạo đơn (trigger), không dùng CHECK constraint vì đơn khách vãng lai cũ vẫn phải cập nhật trạng thái được.
CREATE OR REPLACE FUNCTION public._trg_orders_require_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'ERR_LOGIN_REQUIRED';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_orders_require_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_require_user ON public.orders;
CREATE TRIGGER trg_orders_require_user
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_orders_require_user();

DO $$
DECLARE
  v_fn regprocedure;
BEGIN
  FOR v_fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = 'checkout_create_order' LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
  END LOOP;
END;
$$;

-- =====================================================================================
-- 2. Hủy đơn: phần chung cho nhân viên và khách
-- =====================================================================================
-- Hoàn kho (hàng lẻ đã trừ khi xác nhận, món trong hộp đã trừ khi duyệt), rút hộp khỏi hàng chờ,
-- hủy gói chưa thanh toán, trả lượt voucher. p_refunded: true khi nhân viên đã hoàn tiền ngay lúc hủy.
CREATE OR REPLACE FUNCTION public._cancel_order(p_order_id uuid, p_reason text, p_refunded boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_new_stock integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.status <> 'cho_thanh_toan' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity, p.stock_quantity
      FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
      FOR UPDATE OF p
    LOOP
      v_new_stock := v_item.stock_quantity + v_item.quantity;
      UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
      VALUES (v_item.product_id, 'return_restock', v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Hoàn kho do hủy đơn ' || v_order.order_code, auth.uid());
    END LOOP;

    FOR v_item IN
      SELECT bci.product_id, bci.quantity, p.stock_quantity
      FROM public.box_curation_items bci
      JOIN public.box_curations bc ON bc.id = bci.box_curation_id
      JOIN public.products p ON p.id = bci.product_id
      WHERE bc.order_id = p_order_id AND bc.status = 'curated'
      FOR UPDATE OF p
    LOOP
      v_new_stock := v_item.stock_quantity + v_item.quantity;
      UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
      VALUES (v_item.product_id, 'return_restock', v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Hoàn kho món trong hộp do hủy đơn ' || v_order.order_code, auth.uid());
    END LOOP;
  END IF;

  UPDATE public.box_curations SET status = 'cancelled' WHERE order_id = p_order_id AND status IN ('pending_curation', 'curated');

  -- Gói đăng ký mà không thanh toán thì không sinh hộp
  IF v_order.order_type = 'subscription_initial' AND v_order.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions SET status = 'da_huy', remaining_cycles = 0, cancellation_reason = trim(p_reason)
      WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
  END IF;

  IF v_order.voucher_id IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = greatest(used_count - 1, 0) WHERE id = v_order.voucher_id;
  END IF;

  UPDATE public.orders
    SET status = 'da_huy', cancelled_at = now(), cancellation_reason = trim(p_reason),
        payment_status = CASE
          WHEN p_refunded AND payment_status = 'paid' AND payment_method <> 'cod' THEN 'refunded'::public.payment_status
          ELSE payment_status END
    WHERE id = p_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public._cancel_order(uuid, text, boolean) FROM PUBLIC, anon, authenticated;

-- Nhân viên / admin hủy đơn: hoàn tiền thủ công cho khách ngay lúc hủy (giữ nguyên hành vi cũ)
CREATE OR REPLACE FUNCTION public.cancel_order_by_staff(p_order_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF char_length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_REASON_REQUIRED';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IN ('da_huy', 'da_giao', 'doi_tra') THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  -- Biên nhận thanh toán / gia hạn và đơn giao hộp của gói: xử lý ở trang Gói định kỳ (tạm dừng, hủy gói)
  IF v_order.order_type IN ('subscription_initial', 'subscription_renewal', 'subscription_cycle')
     AND v_order.status <> 'cho_thanh_toan' THEN
    RAISE EXCEPTION 'ERR_SUBSCRIPTION_ORDER';
  END IF;

  PERFORM public._cancel_order(p_order_id, p_reason, true);
  RETURN jsonb_build_object('status', 'da_huy');
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_order_by_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_by_staff(uuid, text) TO authenticated;

-- Khách tự hủy đơn của mình khi đơn còn "Chờ thanh toán" hoặc "Đã xác nhận" (chưa bắt đầu đóng gói).
-- Đơn của gói định kỳ: chỉ hủy được biên nhận chưa thanh toán; gói đã trả thì dùng Tạm dừng / Hủy gói.
CREATE OR REPLACE FUNCTION public.cancel_my_order(p_order_id uuid, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason text := COALESCE(NULLIF(trim(p_reason), ''), 'Khách hủy đơn');
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_order.status NOT IN ('cho_thanh_toan', 'da_xac_nhan') THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  IF v_order.order_type = 'subscription_cycle'
     OR (v_order.order_type IN ('subscription_initial', 'subscription_renewal') AND v_order.status <> 'cho_thanh_toan') THEN
    RAISE EXCEPTION 'ERR_SUBSCRIPTION_ORDER';
  END IF;
  IF char_length(v_reason) > 500 THEN
    v_reason := left(v_reason, 500);
  END IF;

  -- Đơn đã trả online vẫn ghi "Đã thanh toán" cho tới khi nhân viên hoàn tiền (mark_order_refunded)
  PERFORM public._cancel_order(p_order_id, v_reason, false);
  RETURN jsonb_build_object(
    'status', 'da_huy',
    'needs_refund', v_order.payment_status = 'paid' AND v_order.payment_method <> 'cod'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_my_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(uuid, text) TO authenticated;

-- Nhân viên ghi nhận đã hoàn tiền cho đơn đã hủy mà khách đã trả online
CREATE OR REPLACE FUNCTION public.mark_order_refunded(p_order_id uuid, p_note text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'da_huy' OR v_order.payment_status <> 'paid' OR v_order.payment_method = 'cod' THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;

  UPDATE public.orders SET payment_status = 'refunded' WHERE id = p_order_id;

  IF v_order.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_order.user_id, 'Đơn ' || v_order.order_code || ' đã được hoàn tiền',
      'FPETS đã hoàn ' || replace(to_char(v_order.total_amount, 'FM999,999,999'), ',', '.') || '₫ cho đơn đã hủy.'
        || COALESCE(' ' || NULLIF(trim(p_note), ''), ''),
      'order', '/my-account/orders/' || v_order.id);
  END IF;
  RETURN jsonb_build_object('payment_status', 'refunded');
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_order_refunded(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_refunded(uuid, text) TO authenticated;

-- =====================================================================================
-- 3. Tạm dừng tối đa 2 kỳ liên tiếp
-- =====================================================================================
-- Đếm số kỳ đã bỏ liên tiếp; về 0 khi gói có đơn giao hộp mới (bé đã nhận lại hộp).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS consecutive_paused_cycles integer NOT NULL DEFAULT 0
  CHECK (consecutive_paused_cycles BETWEEN 0 AND 2);

UPDATE public.subscriptions SET consecutive_paused_cycles = LEAST(paused_cycles_left, 2) WHERE status = 'tam_dung';

CREATE OR REPLACE FUNCTION public._trg_reset_pause_streak()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_type = 'subscription_cycle' AND NEW.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions SET consecutive_paused_cycles = 0 WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_reset_pause_streak() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_reset_pause_streak ON public.orders;
CREATE TRIGGER trg_orders_reset_pause_streak
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_reset_pause_streak();

CREATE OR REPLACE FUNCTION public.pause_subscription(p_subscription_id uuid, p_cycles integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_cycles integer;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR (v_sub.user_id <> auth.uid() AND NOT public.is_staff()) THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_sub.status <> 'dang_hoat_dong' THEN
    RAISE EXCEPTION 'ERR_INVALID_STATUS_FOR_PAUSE';
  END IF;
  -- Đã giao hết hộp trả trước (đang chờ gia hạn) thì không còn kỳ nào để tạm dừng
  IF v_sub.remaining_cycles <= 0 THEN
    RAISE EXCEPTION 'ERR_NOTHING_TO_PAUSE';
  END IF;
  IF CURRENT_DATE > v_sub.cutoff_date THEN
    RAISE EXCEPTION 'ERR_PAST_CUTOFF';
  END IF;

  v_cycles := LEAST(GREATEST(p_cycles, 1), 2);
  -- Tối đa 2 kỳ liên tiếp không nhận hộp, kể cả khi tạm dừng, tiếp tục rồi tạm dừng lại
  IF v_sub.consecutive_paused_cycles + v_cycles > 2 THEN
    RAISE EXCEPTION 'ERR_PAUSE_LIMIT: %', 2 - v_sub.consecutive_paused_cycles;
  END IF;

  UPDATE public.subscriptions SET
    status = 'tam_dung',
    paused_cycles_left = v_cycles,
    consecutive_paused_cycles = consecutive_paused_cycles + v_cycles,
    next_delivery_date = next_delivery_date + (v_cycles * interval '1 month'),
    cutoff_date = cutoff_date + (v_cycles * interval '1 month')
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object('status', 'tam_dung', 'paused_cycles_left', v_cycles);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_subscription(p_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_next date;
  v_streak integer;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR (v_sub.user_id <> auth.uid() AND NOT public.is_staff()) THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_sub.status <> 'tam_dung' THEN
    RAISE EXCEPTION 'ERR_INVALID_STATUS_FOR_RESUME';
  END IF;

  v_next := (v_sub.next_delivery_date - (v_sub.paused_cycles_left * interval '1 month'))::date;
  v_streak := v_sub.consecutive_paused_cycles;
  IF v_next - 7 < CURRENT_DATE THEN
    -- Ngày chốt cũ đã qua: kỳ đó coi như đã bỏ, chuyển sang đợt gần nhất còn kịp chốt
    v_next := public.next_delivery_window(v_sub.delivery_schedule, CURRENT_DATE);
  ELSE
    -- Lịch về lại như chưa tạm dừng: các kỳ định bỏ không còn tính là đã bỏ
    v_streak := GREATEST(v_streak - v_sub.paused_cycles_left, 0);
  END IF;

  UPDATE public.subscriptions SET
    status = 'dang_hoat_dong',
    paused_cycles_left = 0,
    consecutive_paused_cycles = v_streak,
    next_delivery_date = v_next,
    cutoff_date = v_next - 7
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object('status', 'dang_hoat_dong', 'next_delivery_date', v_next);
END;
$$;

-- =====================================================================================
-- 4. Voucher khi đăng ký gói định kỳ
-- =====================================================================================
DROP FUNCTION IF EXISTS public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method);

CREATE OR REPLACE FUNCTION public.subscribe_to_box(
  p_box_type_id uuid, p_pet_id uuid, p_plan_id uuid, p_delivery_schedule delivery_schedule,
  p_recipient_name text, p_recipient_phone text, p_province_city text, p_district text, p_ward text,
  p_shipping_address text, p_payment_method payment_method, p_voucher_code text DEFAULT NULL
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
  v_next_delivery date;
  v_cutoff date;
  v_sub_id uuid;
  v_sub_code text;
  v_order_id uuid;
  v_order_code text;
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
    -- Khóa dòng voucher: hai đơn cùng lúc không vượt được giới hạn lượt dùng
    SELECT * INTO v_voucher FROM public.vouchers
      WHERE code = upper(trim(p_voucher_code)) AND is_active = true
        AND valid_from <= now() AND valid_to >= now()
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_VOUCHER_INVALID';
    END IF;
    -- Gói định kỳ là Mystery Box: nhận mã cho mọi đơn, cho box, hoặc cho lần đăng ký gói đầu tiên
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

  -- Hộp đầu tiên gửi ngay sau khi thanh toán: kỳ 1 đến hạn chuẩn bị ngay hôm nay
  v_next_delivery := CURRENT_DATE;
  v_cutoff := CURRENT_DATE;

  v_sub_code := 'SUB-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

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

  v_order_code := 'FPET-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO public.orders (
    order_code, user_id, order_type, subscription_id, cycle_index, status, payment_method, payment_status,
    subtotal, shipping_fee, discount_amount, total_amount, voucher_id,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    payment_expires_at
  ) VALUES (
    v_order_code, v_user_id, 'subscription_initial', v_sub_id, 1, 'cho_thanh_toan', p_payment_method, 'pending',
    v_total, v_shipping_fee, v_discount, greatest(v_total + v_shipping_fee - v_discount, 0), v_voucher.id,
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

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id, 'order_id', v_order_id, 'order_code', v_order_code,
    'total_amount', greatest(v_total + v_shipping_fee - v_discount, 0), 'payment_expires_at', now() + interval '30 minutes',
    'next_delivery_date', v_next_delivery, 'cutoff_date', v_cutoff,
    'second_delivery_date', public.second_delivery_window(p_delivery_schedule, CURRENT_DATE)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_box(uuid, uuid, uuid, delivery_schedule, text, text, text, text, text, text, payment_method, text) TO authenticated;

-- =====================================================================================
-- 5. Duyệt hộp: chặn món dị ứng và món trùng ở server
-- =====================================================================================
-- Bản SQL của productHasAllergen (src/lib/petOptions.ts): cùng nhóm từ khóa, so nguyên từ, có dấu.
-- Sửa danh sách từ khóa thì sửa cả hai nơi.

-- Chữ cái tiếng Việt có dấu: tính là chữ khi xác định ranh giới từ (không phụ thuộc locale của database)
CREATE OR REPLACE FUNCTION public._whole_word_pattern(p_word text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT '(^|[^[:alnum:]àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])'
    || regexp_replace(p_word, '([].[^$*+?(){}|\\-])', '\\\1', 'g')
    || '($|[^[:alnum:]àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])';
$function$;

CREATE OR REPLACE FUNCTION public._vn_lower(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT lower(normalize(replace(coalesce(p_text, ''), 'Đ', 'đ'), NFC));
$function$;

CREATE OR REPLACE FUNCTION public._product_has_allergen(p_product_id uuid, p_allergy text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_groups constant jsonb := '{
    "thịt gà": ["gà", "chicken"],
    "thịt bò": ["bò", "beef"],
    "thịt heo": ["heo", "lợn", "pork"],
    "cá / hải sản": ["cá", "hải sản", "tôm", "cua", "mực", "fish", "salmon", "tuna"],
    "trứng": ["trứng", "egg"],
    "sữa": ["sữa", "phô mai", "milk", "cheese"],
    "ngũ cốc / lúa mì": ["ngũ cốc", "lúa mì", "bột mì", "yến mạch", "wheat"],
    "bắp / ngô": ["bắp", "ngô", "corn"],
    "đậu nành": ["đậu nành", "soy"]
  }';
  v_ignore constant jsonb := '{"thịt bò": ["sữa bò"], "bắp / ngô": ["bắp cải", "bắp bò"]}';
  v_name text;
  v_ingredients text[];
  v_slug text;
  v_label text := public._vn_lower(trim(p_allergy));
  v_group text;
  v_word text;
  v_best text;
  v_best_len integer := 0;
  v_words text[];
  v_hay text;
BEGIN
  IF v_label = '' THEN RETURN false; END IF;

  SELECT p.name, p.ingredients, c.slug INTO v_name, v_ingredients, v_slug
  FROM public.products p LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.id = p_product_id;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Dị ứng thực phẩm chỉ xét món bé ăn vào; đồ chơi, chăm sóc, phụ kiện không xét (khớp isEdible phía web)
  IF v_slug IN ('do-choi-van-dong', 'do-choi-tuong-tac', 'cham-soc-ve-sinh', 'phu-kien-dung-cu') THEN
    RETURN false;
  END IF;

  IF v_groups ? v_label THEN
    v_best := v_label;
  ELSE
    -- Nhãn cũ hoặc tự nhập: chọn nhóm có từ khóa khớp dài nhất ("sữa bò" là dị ứng sữa)
    FOR v_group IN SELECT jsonb_object_keys(v_groups) LOOP
      FOR v_word IN SELECT jsonb_array_elements_text(v_groups -> v_group) LOOP
        IF v_label ~* public._whole_word_pattern(v_word) AND char_length(v_word) > v_best_len THEN
          v_best := v_group;
          v_best_len := char_length(v_word);
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  v_hay := public._vn_lower(array_to_string(ARRAY[v_name] || COALESCE(v_ingredients, '{}'::text[]), ' | '));

  IF v_best IS NOT NULL THEN
    v_words := ARRAY(SELECT jsonb_array_elements_text(v_groups -> v_best));
    FOR v_word IN SELECT jsonb_array_elements_text(COALESCE(v_ignore -> v_best, '[]'::jsonb)) LOOP
      v_hay := regexp_replace(v_hay, public._whole_word_pattern(v_word), '\1 \2', 'gi');
    END LOOP;
  ELSE
    -- Dị ứng tự nhập không thuộc nhóm nào ("Thịt vịt"): dò đúng từ đó, bỏ chữ "thịt" ở đầu
    v_words := ARRAY[regexp_replace(v_label, '^thịt\s+', '')];
  END IF;

  FOREACH v_word IN ARRAY v_words LOOP
    IF v_word <> '' AND v_hay ~* public._whole_word_pattern(v_word) THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public._product_has_allergen(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._product_has_allergen(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_box_curation(p_curation_id uuid, p_product_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_curation public.box_curations%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_order_status public.order_status;
  v_allergies text[];
  v_allergy text;
  v_pid uuid;
  v_total numeric := 0;
  v_new_stock integer;
  v_remaining integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;

  SELECT * INTO v_curation FROM public.box_curations WHERE id = p_curation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CURATION_NOT_FOUND';
  END IF;
  IF v_curation.status <> 'pending_curation' THEN
    RAISE EXCEPTION 'ERR_ALREADY_CURATED';
  END IF;
  SELECT status INTO v_order_status FROM public.orders WHERE id = v_curation.order_id FOR UPDATE;
  IF v_order_status IS NULL OR v_order_status NOT IN ('da_xac_nhan', 'dang_chuan_bi') THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_READY';
  END IF;
  IF array_length(p_product_ids, 1) IS NULL OR array_length(p_product_ids, 1) = 0 THEN
    RAISE EXCEPTION 'ERR_NO_ITEMS';
  END IF;
  -- Mỗi món chỉ 1 lần: trùng món thì kiểm tồn sai và giá trị hộp bị cộng trùng
  IF array_length(p_product_ids, 1) <> (SELECT count(DISTINCT x) FROM unnest(p_product_ids) AS x) THEN
    RAISE EXCEPTION 'ERR_DUPLICATE_ITEM';
  END IF;

  SELECT * INTO v_box FROM public.box_types WHERE id = v_curation.box_type_id;
  SELECT COALESCE(allergies, '{}'::text[]) INTO v_allergies FROM public.pets WHERE id = v_curation.pet_id;

  FOREACH v_pid IN ARRAY p_product_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_pid FOR UPDATE;
    IF NOT FOUND OR v_product.is_active = false THEN
      RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND: %', v_pid;
    END IF;
    IF v_product.stock_quantity < 1 THEN
      RAISE EXCEPTION 'ERR_OUT_OF_STOCK: %', v_product.name;
    END IF;
    FOREACH v_allergy IN ARRAY COALESCE(v_allergies, '{}'::text[]) LOOP
      IF public._product_has_allergen(v_pid, v_allergy) THEN
        RAISE EXCEPTION 'ERR_ALLERGEN: % (%)', v_product.name, v_allergy;
      END IF;
    END LOOP;
    v_total := v_total + v_product.price;
  END LOOP;

  IF v_total < v_box.min_retail_value THEN
    RAISE EXCEPTION 'ERR_BELOW_MIN_VALUE';
  END IF;

  FOREACH v_pid IN ARRAY p_product_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_pid FOR UPDATE;
    v_new_stock := v_product.stock_quantity - 1;
    UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_pid;
    INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
    VALUES (v_pid, 'box_curation', -1, v_product.stock_quantity, v_new_stock, p_curation_id::text, 'Xuất đóng Mystery Box', auth.uid());
    INSERT INTO public.box_curation_items (box_curation_id, product_id, quantity, retail_price)
    VALUES (p_curation_id, v_pid, 1, v_product.price);
  END LOOP;

  UPDATE public.box_curations
    SET status = 'curated', curated_by = auth.uid(), curated_at = now(), total_retail_value = v_total
    WHERE id = p_curation_id;

  SELECT count(*) INTO v_remaining FROM public.box_curations
    WHERE order_id = v_curation.order_id AND status = 'pending_curation';

  IF v_remaining = 0 THEN
    UPDATE public.orders SET status = 'dang_chuan_bi'
      WHERE id = v_curation.order_id AND status IN ('da_xac_nhan', 'dang_chuan_bi');
  END IF;

  RETURN jsonb_build_object('status', 'curated', 'total_retail_value', v_total, 'remaining_pending', v_remaining);
END;
$function$;
