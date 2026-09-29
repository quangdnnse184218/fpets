-- Gói tạm dừng (SPEC §5): khách bỏ qua 1–2 kỳ, lịch giao đã được dời trước khi tạm dừng.
-- Trước đây không có bước nào tự đưa gói về "Đang hoạt động", nên gói tạm dừng
-- không bao giờ được sinh đơn giao hộp nữa nếu khách không tự bấm "Tiếp tục".
--  1. Job sinh đơn hằng ngày tự tiếp tục gói khi tới ngày chốt đã dời, rồi sinh đơn luôn trong cùng lượt.
--  2. Khách bấm "Tiếp tục ngay": lịch lùi về như cũ, nhưng nếu ngày chốt cũ đã qua
--     thì chuyển sang đợt giao gần nhất còn kịp chốt, tránh lịch nằm trong quá khứ.

CREATE OR REPLACE FUNCTION public.resume_subscription(p_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_next date;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR (v_sub.user_id <> auth.uid() AND NOT public.is_staff()) THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_sub.status <> 'tam_dung' THEN
    RAISE EXCEPTION 'ERR_INVALID_STATUS_FOR_RESUME';
  END IF;

  v_next := (v_sub.next_delivery_date - (v_sub.paused_cycles_left * interval '1 month'))::date;
  IF v_next - 7 < CURRENT_DATE THEN
    v_next := public.next_delivery_window(v_sub.delivery_schedule, CURRENT_DATE);
  END IF;

  UPDATE public.subscriptions SET
    status = 'dang_hoat_dong',
    paused_cycles_left = 0,
    next_delivery_date = v_next,
    cutoff_date = v_next - 7
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object('status', 'dang_hoat_dong', 'next_delivery_date', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_subscription_cycle_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub RECORD;
  v_order_id uuid;
  v_order_code text;
  v_count integer := 0;
  v_addr jsonb;
BEGIN
  -- Hết thời gian tạm dừng: tiếp tục gói và báo khách
  WITH resumed AS (
    UPDATE public.subscriptions
      SET status = 'dang_hoat_dong', paused_cycles_left = 0
      WHERE status = 'tam_dung' AND cutoff_date <= CURRENT_DATE
      RETURNING user_id, subscription_code, next_delivery_date
  )
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id,
         'Gói ' || subscription_code || ' đã tiếp tục',
         'Hết thời gian tạm dừng. Hộp tiếp theo của bé sẽ giao từ ngày ' || to_char(next_delivery_date, 'DD/MM/YYYY') || '.',
         'subscription', '/my-account/subscriptions'
  FROM resumed;

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

REVOKE ALL ON FUNCTION public.generate_subscription_cycle_orders() FROM PUBLIC, anon, authenticated;
