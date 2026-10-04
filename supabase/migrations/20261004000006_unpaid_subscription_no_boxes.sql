-- Gói đăng ký nhưng KHÔNG thanh toán (hết 30 phút, tự hủy) không được sinh hộp.
-- Trước đây gói này chuyển "Đã hủy" mà vẫn giữ nguyên số hộp, trong khi gói "Đã hủy" còn hộp được hiểu là
-- "khách hủy nhưng vẫn giao nốt hộp đã trả". Sửa hai lớp:
--   1. Khi hết hạn thanh toán: đưa số hộp còn lại về 0.
--   2. Hàm tạo đơn hộp chỉ chạy cho gói có biên nhận đăng ký đã thanh toán.

CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH cancelled AS (
    UPDATE public.orders
      SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Hết hạn thanh toán tự động (30 phút)'
      WHERE status = 'cho_thanh_toan' AND payment_expires_at IS NOT NULL AND payment_expires_at < now()
      RETURNING id, order_type, subscription_id, voucher_id
  ), subs AS (
    UPDATE public.subscriptions s
      SET status = 'da_huy', remaining_cycles = 0, cancellation_reason = 'Không thanh toán khi đăng ký'
      FROM cancelled c
      WHERE c.order_type = 'subscription_initial' AND c.subscription_id = s.id AND s.status = 'cho_thanh_toan'
      RETURNING s.id
  ), curations AS (
    UPDATE public.box_curations bc SET status = 'cancelled'
      FROM cancelled c
      WHERE bc.order_id = c.id AND bc.status = 'pending_curation'
      RETURNING bc.id
  ), voucher_back AS (
    UPDATE public.vouchers v SET used_count = greatest(v.used_count - x.n, 0)
      FROM (SELECT voucher_id, count(*)::integer AS n FROM cancelled WHERE voucher_id IS NOT NULL GROUP BY voucher_id) x
      WHERE v.id = x.voucher_id
      RETURNING v.id
  )
  SELECT (SELECT count(*) FROM cancelled) INTO v_count;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_subscription_cycle_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_order_id uuid;
  v_order_code text;
  v_count integer := 0;
  v_addr jsonb;
  v_next date;
BEGIN
  WITH resumed AS (
    UPDATE public.subscriptions SET status = 'dang_hoat_dong', paused_cycles_left = 0
      WHERE status = 'tam_dung' AND cutoff_date <= CURRENT_DATE
      RETURNING user_id, subscription_code, next_delivery_date
  )
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, 'Gói ' || subscription_code || ' đã tiếp tục',
         'Hết thời gian tạm dừng. Hộp tiếp theo của bé sẽ giao từ ngày ' || to_char(next_delivery_date, 'DD/MM/YYYY') || '.',
         'subscription', '/my-account/subscriptions'
  FROM resumed;

  FOR v_sub IN
    SELECT s.* FROM public.subscriptions s
    WHERE s.status IN ('dang_hoat_dong', 'da_huy') AND s.remaining_cycles > 0 AND s.cutoff_date <= CURRENT_DATE
      -- Chỉ gói đã thanh toán lúc đăng ký mới được chuẩn bị hộp
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.subscription_id = s.id AND o.order_type = 'subscription_initial' AND o.payment_status = 'paid'
      )
    FOR UPDATE OF s
  LOOP
    IF EXISTS (SELECT 1 FROM public.orders WHERE subscription_id = v_sub.id AND cycle_index = v_sub.current_cycle AND order_type = 'subscription_cycle') THEN
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
    INSERT INTO public.box_curations (order_id, pet_id, box_type_id, status) VALUES (v_order_id, v_sub.pet_id, v_sub.box_type_id, 'pending_curation');

    -- Lịch của kỳ kế tiếp: sau hộp 1 (gửi ngay) thì vào đợt đã chọn; từ đó mỗi kỳ cách 1 tháng
    IF v_sub.current_cycle = 1 THEN
      v_next := public.second_delivery_window(v_sub.delivery_schedule, CURRENT_DATE);
    ELSE
      v_next := (v_sub.next_delivery_date + interval '1 month')::date;
    END IF;

    IF v_sub.remaining_cycles - 1 <= 0 AND v_sub.status = 'da_huy' THEN
      -- Gói đã hủy: giao xong hộp cuối đã trả là kết thúc
      UPDATE public.subscriptions SET remaining_cycles = 0 WHERE id = v_sub.id;
    ELSIF v_sub.remaining_cycles - 1 <= 0 THEN
      -- Hộp cuối của số đã trả. Gói vẫn "Đang hoạt động" và chờ gia hạn tới ngày chốt của kỳ kế tiếp
      UPDATE public.subscriptions
        SET remaining_cycles = 0, current_cycle = current_cycle + 1,
            next_delivery_date = v_next, cutoff_date = v_next - 7
        WHERE id = v_sub.id;
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_sub.user_id, 'Gói ' || v_sub.subscription_code || ': hộp cuối đang được chuẩn bị',
        'Đây là hộp cuối bạn đã trả trước. Gia hạn trước ngày ' || to_char(v_next - 7, 'DD/MM/YYYY')
          || ' để bé nhận hộp tiếp theo từ ngày ' || to_char(v_next, 'DD/MM/YYYY') || '.',
        'subscription', '/my-account/subscriptions');
    ELSE
      UPDATE public.subscriptions
        SET remaining_cycles = remaining_cycles - 1, current_cycle = current_cycle + 1,
            next_delivery_date = v_next, cutoff_date = v_next - 7
        WHERE id = v_sub.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  -- Tới hạn gia hạn (đã giao hết hộp trả trước, tới ngày chốt của kỳ kế tiếp mà chưa trả tiếp):
  -- chuyển "Quá hạn", giữ ưu đãi và lịch giao thêm 5 ngày
  WITH due AS (
    UPDATE public.subscriptions
      SET status = 'qua_han', grace_period_expires_at = now() + interval '5 days'
      WHERE status = 'dang_hoat_dong' AND remaining_cycles = 0 AND cutoff_date <= CURRENT_DATE
      RETURNING user_id, subscription_code
  )
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, 'Gói ' || subscription_code || ' đã đến hạn gia hạn',
         'Gia hạn trong 5 ngày để giữ ưu đãi và lịch giao cho bé. Quá 5 ngày gói sẽ kết thúc.',
         'subscription', '/my-account/subscriptions'
  FROM due;

  RETURN v_count;
END;
$function$;
