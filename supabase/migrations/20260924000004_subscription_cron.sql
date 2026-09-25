-- ==============================================================================
-- FPETS DATABASE MIGRATION - 20260924000004_subscription_cron.sql
-- Logic chạy định kỳ (mục 5 SPEC): sinh đơn cho kỳ giao mới trước cut-off,
-- nhắc gia hạn 7/3/1 ngày, và chuyển Quá hạn -> Hết hạn sau 5 ngày ân hạn.
-- Gọi bởi Vercel Cron qua route /api/cron/* (có kiểm tra secret header).
-- ==============================================================================

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
    WHERE status = 'dang_hoat_dong' AND remaining_cycles > 0 AND cutoff_date <= CURRENT_DATE
    FOR UPDATE
  LOOP
    IF EXISTS (SELECT 1 FROM public.orders WHERE subscription_id = v_sub.id AND cycle_index = v_sub.current_cycle) THEN
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

    IF v_sub.remaining_cycles - 1 <= 0 THEN
      UPDATE public.subscriptions
        SET remaining_cycles = 0, status = 'qua_han', grace_period_expires_at = now() + interval '5 days'
        WHERE id = v_sub.id;
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

REVOKE ALL ON FUNCTION public.generate_subscription_cycle_orders FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_subscription_cycle_orders TO anon, authenticated;

-- ------------------------------------------------------------------------------

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
        WHERE user_id = v_sub.user_id AND type = 'subscription' AND link = '/my-account/subscriptions/' || v_sub.id
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          v_sub.user_id,
          'Gói ' || v_sub.subscription_code || ' sắp hết hạn',
          'Còn ' || v_days_left || ' ngày trước khi hộp cuối được giao. Gia hạn ngay để bé không bị gián đoạn nhận hộp!',
          'subscription',
          '/my-account/subscriptions/' || v_sub.id
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_subscription_reminders FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_subscription_reminders TO anon, authenticated;

-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_subscription_grace_periods()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscriptions
    SET status = 'het_han'
    WHERE status = 'qua_han' AND grace_period_expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.check_subscription_grace_periods FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_subscription_grace_periods TO anon, authenticated;
