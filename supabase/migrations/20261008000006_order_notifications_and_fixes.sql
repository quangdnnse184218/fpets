-- THÔNG BÁO TỰ ĐỘNG + SỬA NHỎ (08/10/2026)
--  1. Thông báo "Box sắp được giao" 3 ngày trước đợt giao của hộp theo gói, và "Mời đánh giá" 2 ngày sau khi giao (SPEC §8).
--     Chỉ thông báo trên web (email giao dịch chưa có). Chạy hằng ngày lúc 08:30 giờ Việt Nam.
--  2. Đơn hộp theo kỳ ghi đúng phương thức khách đã trả gói (trước đây luôn ghi VNPay).
--  3. Gỡ hàm tra cứu đơn bản cũ lookup_order(mã đơn, số điện thoại): web đã chuyển sang lookup_order(mã đơn).

-- =====================================================================================
-- 1. Cột theo dõi
-- =====================================================================================
ALTER TABLE public.orders
  -- Ngày đầu đợt giao của hộp theo kỳ (đơn hộp tạo ở ngày chốt, 7 ngày trước đợt giao)
  ADD COLUMN IF NOT EXISTS scheduled_delivery_date date,
  ADD COLUMN IF NOT EXISTS delivery_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_invited_at timestamptz;

-- Đơn hộp theo kỳ nhận ngày giao từ gói ngay lúc tạo: generate_subscription_cycle_orders tạo đơn trước,
-- rồi mới dời next_delivery_date của gói sang kỳ sau, nên lúc này next_delivery_date vẫn là ngày của kỳ đang tạo.
CREATE OR REPLACE FUNCTION public._trg_orders_cycle_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_type = 'subscription_cycle' AND NEW.subscription_id IS NOT NULL AND NEW.scheduled_delivery_date IS NULL THEN
    SELECT next_delivery_date INTO NEW.scheduled_delivery_date FROM public.subscriptions WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_orders_cycle_schedule() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_cycle_schedule ON public.orders;
CREATE TRIGGER trg_orders_cycle_schedule
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_orders_cycle_schedule();

-- Đơn hộp theo kỳ đã có: ước lượng ngày giao = ngày tạo đơn (ngày chốt) + 7; hộp đầu gửi ngay lúc tạo
UPDATE public.orders
  SET scheduled_delivery_date = (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + CASE WHEN cycle_index > 1 THEN 7 ELSE 0 END
  WHERE order_type = 'subscription_cycle' AND scheduled_delivery_date IS NULL;

-- Không mời đánh giá dồn cho các đơn đã giao từ trước khi có tính năng này (chỉ mời đơn giao trong 3 ngày gần đây)
UPDATE public.orders o
  SET review_invited_at = now()
  WHERE o.status = 'da_giao' AND o.review_invited_at IS NULL
    AND (COALESCE(o.delivered_at, o.updated_at) < now() - interval '3 days'
         OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.order_id = o.id));

-- =====================================================================================
-- 2. Gửi thông báo hằng ngày
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.send_order_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row RECORD;
  v_count integer := 0;
  v_end date;
BEGIN
  -- Box sắp được giao: hộp kỳ 2 trở đi (hộp đầu gửi ngay khi thanh toán), đợt giao bắt đầu trong 3 ngày tới
  FOR v_row IN
    SELECT o.id, o.user_id, o.order_code, o.cycle_index, o.scheduled_delivery_date,
           s.subscription_code, s.delivery_schedule, p.name AS pet_name
    FROM public.orders o
    JOIN public.subscriptions s ON s.id = o.subscription_id
    LEFT JOIN public.pets p ON p.id = s.pet_id
    WHERE o.order_type = 'subscription_cycle'
      AND o.cycle_index > 1
      AND o.delivery_reminder_sent_at IS NULL
      AND o.status IN ('da_xac_nhan', 'dang_chuan_bi', 'dang_giao')
      AND o.scheduled_delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    -- Đợt đầu tháng giao ngày 1–5, giữa tháng ngày 15–20
    v_end := v_row.scheduled_delivery_date + CASE WHEN v_row.delivery_schedule = 'dau_thang' THEN 4 ELSE 5 END;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_row.user_id,
      'Hộp kỳ ' || v_row.cycle_index || COALESCE(' của bé ' || v_row.pet_name, '') || ' sắp được giao',
      'Hộp thuộc gói ' || v_row.subscription_code || ' dự kiến giao trong đợt '
        || to_char(v_row.scheduled_delivery_date, 'DD/MM') || ' – ' || to_char(v_end, 'DD/MM/YYYY')
        || '. Bạn để ý điện thoại để nhận hàng nhé.',
      'order',
      '/my-account/orders/' || v_row.id
    );
    UPDATE public.orders SET delivery_reminder_sent_at = now() WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;

  -- Mời đánh giá: đơn có hàng giao (không tính biên nhận thanh toán gói), đã giao từ 2 ngày, chưa đánh giá,
  -- còn trong hạn 30 ngày được đánh giá
  FOR v_row IN
    SELECT o.id, o.user_id, o.order_code, o.order_type, COALESCE(o.delivered_at, o.updated_at) AS delivered
    FROM public.orders o
    WHERE o.status = 'da_giao'
      AND o.order_type IN ('retail', 'mystery_box', 'subscription_cycle')
      AND o.review_invited_at IS NULL
      AND o.user_id IS NOT NULL
      AND COALESCE(o.delivered_at, o.updated_at) <= now() - interval '2 days'
      AND COALESCE(o.delivered_at, o.updated_at) > now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.order_id = o.id)
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_row.user_id,
      CASE WHEN v_row.order_type = 'retail' THEN 'Bé dùng sản phẩm có hợp không?' ELSE 'Bé có thích hộp quà không?' END,
      'Đánh giá đơn ' || v_row.order_code
        || CASE WHEN v_row.order_type = 'retail' THEN '' ELSE ' và chấm từng món để FPETS chọn hộp sau hợp ý bé hơn' END
        || '. Bạn có thể đánh giá tới ngày '
        || to_char((v_row.delivered AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 30, 'DD/MM/YYYY') || '.',
      'order',
      '/my-account/orders/' || v_row.id
    );
    UPDATE public.orders SET review_invited_at = now() WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_order_reminders() FROM PUBLIC, anon, authenticated;

-- pg_cron chạy theo giờ GMT: 01:30 GMT = 08:30 giờ Việt Nam (sau lượt tạo đơn hộp theo kỳ lúc 01:00)
SELECT cron.schedule('fpets-order-reminders', '30 1 * * *', $$SELECT public.send_order_reminders()$$);

-- =====================================================================================
-- 3. Đơn hộp theo kỳ ghi đúng phương thức thanh toán của gói
-- =====================================================================================
-- Phương thức của lần trả tiền gần nhất cho gói (đăng ký hoặc gia hạn)
CREATE OR REPLACE FUNCTION public._subscription_payment_method(p_subscription_id uuid)
 RETURNS public.payment_method
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT o.payment_method FROM public.orders o
     WHERE o.subscription_id = p_subscription_id
       AND o.order_type IN ('subscription_initial', 'subscription_renewal')
       AND o.payment_status IN ('paid', 'refunded')
     ORDER BY o.paid_at DESC NULLS LAST, o.created_at DESC
     LIMIT 1),
    'vnpay'::public.payment_method
  );
$function$;

REVOKE ALL ON FUNCTION public._subscription_payment_method(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_def text;
  v_old constant text := '''da_xac_nhan'', ''vnpay'', ''paid''';
  v_new constant text := '''da_xac_nhan'', public._subscription_payment_method(v_sub.id), ''paid''';
BEGIN
  SELECT pg_get_functiondef('public.generate_subscription_cycle_orders()'::regprocedure) INTO v_def;
  IF (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 THEN
    RAISE EXCEPTION 'generate_subscription_cycle_orders: không tìm thấy đúng 1 chỗ ghi phương thức VNPay cố định';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END;
$$;

UPDATE public.orders
  SET payment_method = public._subscription_payment_method(subscription_id)
  WHERE order_type = 'subscription_cycle' AND subscription_id IS NOT NULL;

-- =====================================================================================
-- 4. Gỡ hàm tra cứu đơn bản cũ
-- =====================================================================================
DROP FUNCTION IF EXISTS public.lookup_order(text, text);
