-- SỬA NGHIỆP VỤ ĐỢT 2 (08/10/2026)
--  1. Đánh giá chỉ trong 30 ngày sau khi giao (SPEC §8): trước đây đơn giao từ lâu vẫn đánh giá được.
--  2. Mã đơn FPET-ngày-4 số (10.000 mã/ngày) dễ trùng khi đông đơn (trùng là đặt hàng lỗi) và dễ dò khi tra cứu
--     chỉ bằng mã. Mã gói SUB-năm-4 số còn tệ hơn (10.000 mã/năm). Đổi sang 6 ký tự ngẫu nhiên (chữ + số, bỏ ký tự
--     dễ nhầm 0/O, 1/I/L), kiểm tra trùng trước khi dùng. Mã cũ vẫn tra cứu được như trước.
--  3. Thanh toán gia hạn không còn bật lại gói đã hết hạn / đã hủy trong lúc chờ thanh toán; gói đang tạm dừng
--     thì vẫn nhận gia hạn và giữ nguyên trạng thái tạm dừng.
--  4. Đặt hàng khóa dòng voucher trước khi đếm lượt dùng (hai đơn cùng lúc không vượt giới hạn).

-- =====================================================================================
-- 1. Đánh giá trong 30 ngày sau khi giao
-- =====================================================================================
DROP POLICY IF EXISTS "reviews_own_insert" ON public.reviews;
CREATE POLICY "reviews_own_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid() AND status = 'da_giao'
        AND COALESCE(delivered_at, updated_at) >= now() - interval '30 days'
    )
  );

-- =====================================================================================
-- 2. Mã đơn / mã gói ngẫu nhiên, không trùng
-- =====================================================================================
-- 6 ký tự từ bảng 31 ký tự dễ đọc (~887 triệu tổ hợp mỗi ngày). Lấy từ gen_random_uuid() (ngẫu nhiên mật mã),
-- 6 byte đầu của UUID v4 là ngẫu nhiên hoàn toàn.
CREATE OR REPLACE FUNCTION public._random_code6()
 RETURNS text
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_alpha constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  v_out text := '';
BEGIN
  FOR i IN 0..5 LOOP
    v_out := v_out || substr(v_alpha, 1 + get_byte(v_bytes, i) % 31, 1);
  END LOOP;
  RETURN v_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.new_order_code()
 RETURNS text
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'FPET-' || to_char(now(), 'YYYYMMDD') || '-' || public._random_code6();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.new_subscription_code()
 RETURNS text
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'SUB-' || to_char(now(), 'YYYY') || '-' || public._random_code6();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE subscription_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$function$;

REVOKE ALL ON FUNCTION public._random_code6() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.new_order_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.new_subscription_code() FROM PUBLIC, anon, authenticated;

-- Thay công thức sinh mã cũ trong mọi hàm đang dùng (checkout_create_order, subscribe_to_box,
-- renew_subscription, generate_subscription_cycle_orders), giữ nguyên phần còn lại của từng hàm.
DO $$
DECLARE
  v_fn record;
  v_def text;
  v_count integer := 0;
  v_old_order constant text := '''FPET-'' || to_char(now(), ''YYYYMMDD'') || ''-'' || lpad(floor(random() * 10000)::text, 4, ''0'')';
  v_old_sub constant text := '''SUB-'' || to_char(now(), ''YYYY'') || ''-'' || lpad(floor(random() * 10000)::text, 4, ''0'')';
BEGIN
  FOR v_fn IN
    SELECT p.oid FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND (position(v_old_order IN p.prosrc) > 0 OR position(v_old_sub IN p.prosrc) > 0)
  LOOP
    v_def := pg_get_functiondef(v_fn.oid);
    v_def := replace(replace(v_def, v_old_order, 'public.new_order_code()'), v_old_sub, 'public.new_subscription_code()');
    EXECUTE v_def;
    v_count := v_count + 1;
  END LOOP;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'Chỉ thay được công thức mã đơn ở % hàm, cần ít nhất 4', v_count;
  END IF;
END;
$$;

-- =====================================================================================
-- 4. Khóa dòng voucher khi đặt hàng
-- =====================================================================================
DO $$
DECLARE
  v_def text;
  v_old constant text := 'AND valid_from <= now() AND valid_to >= now();';
  v_new constant text := 'AND valid_from <= now() AND valid_to >= now()
      FOR UPDATE; -- khóa dòng voucher: hai đơn cùng lúc không vượt giới hạn lượt dùng';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'checkout_create_order';
  IF (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 THEN
    RAISE EXCEPTION 'checkout_create_order: không tìm thấy đúng 1 câu chọn voucher cần khóa';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END;
$$;

-- =====================================================================================
-- 3. Xác nhận thanh toán: không bật lại gói đã kết thúc
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_cycles integer;
  v_short text;
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

  -- Đơn chờ thanh toán không giữ hàng: món có thể đã bán hết cho khách khác trong lúc chờ.
  -- Hết hàng thì hủy đơn (trả lượt voucher) thay vì nhận tiền cho đơn không giao được.
  -- Khi nối cổng thanh toán thật (tiền đã bị trừ trước khi tới bước này), đơn hủy kiểu này cần hoàn tiền.
  v_short := public._order_short_item(p_order_id);
  IF v_short IS NOT NULL THEN
    PERFORM public._cancel_order(p_order_id, 'Hết hàng trước khi thanh toán: ' || v_short, false);
    RETURN jsonb_build_object('status', 'da_huy', 'payment_status', 'pending', 'reason', 'out_of_stock', 'product', v_short);
  END IF;

  -- Gia hạn: gói phải còn sống lúc trả tiền. Trong 30 phút chờ thanh toán gói có thể đã hết 5 ngày "Quá hạn"
  -- hoặc bị hủy; khi đó không nhận tiền gia hạn (khách đăng ký gói mới).
  IF v_order.order_type = 'subscription_renewal' AND v_order.subscription_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM public.subscriptions WHERE id = v_order.subscription_id FOR UPDATE;
    IF NOT FOUND OR NOT (
      v_sub.status IN ('dang_hoat_dong', 'tam_dung')
      OR (v_sub.status = 'qua_han' AND (v_sub.grace_period_expires_at IS NULL OR v_sub.grace_period_expires_at >= now()))
    ) THEN
      PERFORM public._cancel_order(p_order_id, 'Gói đã kết thúc trước khi thanh toán gia hạn', false);
      RETURN jsonb_build_object('status', 'da_huy', 'payment_status', 'pending', 'reason', 'subscription_ended');
    END IF;
  END IF;

  UPDATE public.orders
    SET status = 'da_xac_nhan', payment_status = 'paid', paid_at = now()
    WHERE id = p_order_id;

  PERFORM public._deduct_retail_stock(p_order_id);

  IF v_order.order_type = 'subscription_initial' AND v_order.subscription_id IS NOT NULL THEN
    -- Kích hoạt gói; hộp đầu tiên đến hạn chuẩn bị ngay hôm nay
    UPDATE public.subscriptions
      SET status = 'dang_hoat_dong', next_delivery_date = CURRENT_DATE, cutoff_date = CURRENT_DATE
      WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
    PERFORM public.generate_subscription_cycle_orders();
  ELSIF v_order.order_type = 'subscription_renewal' AND v_order.subscription_id IS NOT NULL THEN
    SELECT COALESCE(sum(quantity), 0) INTO v_cycles FROM public.order_items WHERE order_id = p_order_id;
    -- Lịch của kỳ kế tiếp đã được tính sẵn khi giao hết hộp cũ, nên gia hạn chỉ cộng thêm số hộp.
    -- Gói đang tạm dừng thì giữ tạm dừng (hết thời gian tạm dừng tự hoạt động lại).
    UPDATE public.subscriptions s SET
      plan_id = COALESCE(v_order.renewal_plan_id, s.plan_id),
      total_cycles = s.total_cycles + v_cycles,
      total_prepaid_amount = s.total_prepaid_amount + v_order.subtotal,
      remaining_cycles = s.remaining_cycles + v_cycles,
      status = CASE WHEN s.status = 'tam_dung' THEN 'tam_dung'::public.subscription_status ELSE 'dang_hoat_dong'::public.subscription_status END,
      grace_period_expires_at = NULL
    WHERE s.id = v_order.subscription_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_order.user_id, 'Gia hạn gói thành công',
      'Gói của bé đã được cộng thêm ' || v_cycles || ' hộp. Cảm ơn bạn đã tiếp tục đồng hành cùng FPETS!',
      'subscription', '/my-account/subscriptions');
    -- Gia hạn trong thời gian "Quá hạn": kỳ này đã qua ngày chốt nên tạo đơn hộp ngay
    PERFORM public.generate_subscription_cycle_orders();
  END IF;

  RETURN jsonb_build_object('status', 'da_xac_nhan', 'payment_status', 'paid');
END;
$function$;
