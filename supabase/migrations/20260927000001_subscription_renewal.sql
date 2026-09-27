-- ==============================================================================
-- Hoàn thiện vòng đời gói định kỳ theo SPEC §5:
--   1. Sửa generate_subscription_cycle_orders: đơn đăng ký ban đầu cũng mang
--      cycle_index = 1 nên hàm cũ tưởng "kỳ 1 đã có đơn" và bỏ qua mãi mãi,
--      khiến không hộp nào được đưa vào hàng chờ tuyển chọn.
--   2. Gia hạn: khách chọn lại gói (có thể đổi gói) và thanh toán online;
--      thanh toán xong gói nối tiếp, gói "Quá hạn" được mở lại.
--   3. Đơn đăng ký gói hết hạn thanh toán -> hủy luôn gói đang chờ.
--   4. Thông báo web: sửa link, thêm thông báo khi gói quá hạn / hết hạn.
--   5. Gói đã hủy vẫn được sinh đơn cho các hộp đã trả trước.
-- ==============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS renewal_plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- 1. Sinh đơn box cho từng kỳ ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_subscription_cycle_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_order_id uuid;
  v_order_code text;
  v_count integer := 0;
  v_addr jsonb;
BEGIN
  FOR v_sub IN
    SELECT * FROM public.subscriptions
    -- Gói đã hủy vẫn giao hết các hộp đã trả trước (SPEC §5 Pause/Cancel)
    WHERE status IN ('dang_hoat_dong', 'da_huy') AND remaining_cycles > 0 AND cutoff_date <= CURRENT_DATE
    FOR UPDATE
  LOOP
    -- Chỉ so với đơn giao theo kỳ; đơn thanh toán ban đầu/gia hạn không phải đơn giao hộp
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE subscription_id = v_sub.id AND cycle_index = v_sub.current_cycle AND order_type = 'subscription_cycle'
    ) THEN
      CONTINUE;
    END IF;

    v_addr := v_sub.shipping_address_snapshot;
    v_order_code := 'FPET-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

    INSERT INTO public.orders (
      order_code, user_id, order_type, subscription_id, cycle_index, status, payment_method, payment_status,
      subtotal, shipping_fee, discount_amount, total_amount,
      recipient_name, recipient_phone, shipping_address, province_city, district, ward
    ) VALUES (
      v_order_code, v_sub.user_id, 'subscription_cycle', v_sub.id, v_sub.current_cycle, 'da_xac_nhan', 'vnpay', 'paid',
      0, 0, 0, 0,
      COALESCE(v_addr->>'recipient_name', ''), COALESCE(v_addr->>'phone', ''), COALESCE(v_addr->>'address', ''),
      COALESCE(v_addr->>'province_city', ''), COALESCE(v_addr->>'district', ''), COALESCE(v_addr->>'ward', '')
    ) RETURNING id INTO v_order_id;

    INSERT INTO public.box_curations (order_id, pet_id, box_type_id, status)
    VALUES (v_order_id, v_sub.pet_id, v_sub.box_type_id, 'pending_curation');

    IF v_sub.remaining_cycles - 1 <= 0 AND v_sub.status = 'da_huy' THEN
      -- Gói đã hủy: giao xong hộp cuối là kết thúc, không nhắc gia hạn
      UPDATE public.subscriptions SET remaining_cycles = 0 WHERE id = v_sub.id;
    ELSIF v_sub.remaining_cycles - 1 <= 0 THEN
      UPDATE public.subscriptions
        SET remaining_cycles = 0, status = 'qua_han', grace_period_expires_at = now() + interval '5 days'
        WHERE id = v_sub.id;
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_sub.user_id,
        'Gói ' || v_sub.subscription_code || ' đã hết lượt hộp',
        'Hộp cuối của gói đang được chuẩn bị. Gia hạn trong 5 ngày để giữ ưu đãi và lịch giao cho bé.',
        'subscription',
        '/my-account/subscriptions'
      );
    ELSE
      UPDATE public.subscriptions
        SET remaining_cycles = remaining_cycles - 1,
            current_cycle = current_cycle + 1,
            next_delivery_date = next_delivery_date + interval '1 month',
            cutoff_date = cutoff_date + interval '1 month'
        WHERE id = v_sub.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. Khách gia hạn gói ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renew_subscription(
  p_subscription_id uuid,
  p_plan_id uuid,
  p_payment_method public.payment_method
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_sub public.subscriptions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_addr jsonb;
  v_unit_price numeric;
  v_total numeric;
  v_shipping_fee numeric;
  v_order_id uuid;
  v_order_code text;
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

  -- Chỉ gia hạn khi còn hộp cuối hoặc đang trong 5 ngày quá hạn
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

  -- Mỗi gói chỉ giữ 1 đơn gia hạn đang chờ thanh toán
  UPDATE public.orders
    SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Thay bằng yêu cầu gia hạn mới'
    WHERE subscription_id = v_sub.id AND order_type = 'subscription_renewal' AND status = 'cho_thanh_toan';

  v_addr := v_sub.shipping_address_snapshot;
  v_unit_price := round(v_box.baseprice * (1 - v_plan.discount_percentage / 100.0));
  v_total := v_unit_price * v_plan.cycle_count;
  v_shipping_fee := public.calc_shipping_fee(COALESCE(v_addr->>'province_city', ''), v_total, v_plan.free_shipping);
  v_order_code := 'FPET-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO public.orders (
    order_code, user_id, order_type, subscription_id, renewal_plan_id, status, payment_method, payment_status,
    subtotal, shipping_fee, discount_amount, total_amount,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    payment_expires_at
  ) VALUES (
    v_order_code, v_user_id, 'subscription_renewal', v_sub.id, v_plan.id, 'cho_thanh_toan', p_payment_method, 'pending',
    v_total, v_shipping_fee, 0, v_total + v_shipping_fee,
    COALESCE(v_addr->>'recipient_name', ''), COALESCE(v_addr->>'phone', ''), COALESCE(v_addr->>'address', ''),
    COALESCE(v_addr->>'province_city', ''), COALESCE(v_addr->>'district', ''), COALESCE(v_addr->>'ward', ''),
    now() + interval '30 minutes'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
  VALUES (v_order_id, v_sub.box_type_id, v_sub.pet_id, 'Gia hạn ' || v_box.name || ' - ' || v_plan.name, v_unit_price, v_plan.cycle_count, v_total);

  RETURN jsonb_build_object('order_id', v_order_id, 'order_code', v_order_code, 'total_amount', v_total + v_shipping_fee);
END;
$$;

REVOKE ALL ON FUNCTION public.renew_subscription(uuid, uuid, public.payment_method) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_subscription(uuid, uuid, public.payment_method) TO authenticated;

-- 3. Xác nhận thanh toán: kích hoạt gói mới / nối tiếp gói gia hạn --------------------
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_cycles integer;
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
  ELSIF v_order.order_type = 'subscription_renewal' AND v_order.subscription_id IS NOT NULL THEN
    SELECT COALESCE(sum(quantity), 0) INTO v_cycles FROM public.order_items WHERE order_id = p_order_id;
    UPDATE public.subscriptions s SET
      plan_id = COALESCE(v_order.renewal_plan_id, s.plan_id),
      total_cycles = s.total_cycles + v_cycles,
      total_prepaid_amount = s.total_prepaid_amount + v_order.subtotal,
      remaining_cycles = s.remaining_cycles + v_cycles,
      -- Gói đã giao hết hộp (quá hạn/hết hạn): mở lại và lùi lịch sang kỳ kế tiếp
      current_cycle = CASE WHEN s.status IN ('qua_han', 'het_han') THEN s.current_cycle + 1 ELSE s.current_cycle END,
      next_delivery_date = CASE WHEN s.status IN ('qua_han', 'het_han') THEN (s.next_delivery_date + interval '1 month')::date ELSE s.next_delivery_date END,
      cutoff_date = CASE WHEN s.status IN ('qua_han', 'het_han') THEN (s.cutoff_date + interval '1 month')::date ELSE s.cutoff_date END,
      status = 'dang_hoat_dong',
      grace_period_expires_at = NULL
    WHERE s.id = v_order.subscription_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_order.user_id, 'Gia hạn gói thành công',
      'Gói của bé đã được cộng thêm ' || v_cycles || ' hộp. Cảm ơn bạn đã tiếp tục đồng hành cùng FPETS!',
      'subscription', '/my-account/subscriptions');
  END IF;

  RETURN jsonb_build_object('status', 'da_xac_nhan', 'payment_status', 'paid');
END;
$$;

-- 4. Hủy đơn quá hạn thanh toán; gói đăng ký mới không trả tiền thì hủy luôn gói -------
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH cancelled AS (
    UPDATE public.orders
      SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Hết hạn thanh toán tự động (30 phút)'
      WHERE status = 'cho_thanh_toan' AND payment_expires_at IS NOT NULL AND payment_expires_at < now()
      RETURNING id, order_type, subscription_id
  ), subs AS (
    UPDATE public.subscriptions s
      SET status = 'da_huy', cancellation_reason = 'Không thanh toán khi đăng ký'
      FROM cancelled c
      WHERE c.order_type = 'subscription_initial' AND c.subscription_id = s.id AND s.status = 'cho_thanh_toan'
      RETURNING s.id
  )
  SELECT (SELECT count(*) FROM cancelled) INTO v_count;
  RETURN v_count;
END;
$$;

-- 5. Nhắc gia hạn (sửa link về trang quản lý gói) -----------------------------------
CREATE OR REPLACE FUNCTION public.send_subscription_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_days_left integer;
  v_count integer := 0;
BEGIN
  FOR v_sub IN
    SELECT * FROM public.subscriptions
    WHERE status = 'dang_hoat_dong' AND remaining_cycles = 1
  LOOP
    v_days_left := v_sub.cutoff_date - CURRENT_DATE;
    IF v_days_left IN (7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_sub.user_id AND type = 'subscription'
          AND title = 'Gói ' || v_sub.subscription_code || ' sắp hết hạn'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          v_sub.user_id,
          'Gói ' || v_sub.subscription_code || ' sắp hết hạn',
          'Còn ' || v_days_left || ' ngày trước ngày chốt hộp cuối. Gia hạn ngay để bé không bị gián đoạn nhận hộp!',
          'subscription',
          '/my-account/subscriptions'
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6. Hết 5 ngày quá hạn -> Hết hạn, kèm thông báo -----------------------------------
CREATE OR REPLACE FUNCTION public.check_subscription_grace_periods()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.subscriptions
      SET status = 'het_han'
      WHERE status = 'qua_han' AND grace_period_expires_at < now()
      RETURNING id, user_id, subscription_code
  ), notified AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT user_id, 'Gói ' || subscription_code || ' đã hết hạn',
      'Gói đã kết thúc vì chưa được gia hạn. Hồ sơ của bé vẫn được giữ, bạn có thể đăng ký lại bất kỳ lúc nào.',
      'subscription', '/subscription'
    FROM expired
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM expired) INTO v_count;
  RETURN v_count;
END;
$$;

-- Thông báo cũ trỏ tới /my-account/subscriptions/<id> (trang không tồn tại)
UPDATE public.notifications SET link = '/my-account/subscriptions'
  WHERE link LIKE '/my-account/subscriptions/%';

-- Các hàm cron chỉ được gọi từ route /api/cron (service role)
REVOKE EXECUTE ON FUNCTION public.generate_subscription_cycle_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_expired_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_subscription_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_subscription_grace_periods() FROM PUBLIC, anon, authenticated;
