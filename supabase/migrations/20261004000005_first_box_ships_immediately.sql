-- GÓI ĐỊNH KỲ: HỘP ĐẦU TIÊN GỬI NGAY SAU KHI THANH TOÁN
--
-- Trước đây hộp đầu phải chờ tới đợt giao kế tiếp (đăng ký 03/10 với đợt "đầu tháng" thì 01/11 mới nhận).
-- Quy tắc mới:
--   1. Hộp 1: tạo đơn và đưa vào hàng chờ tuyển chọn ngay khi thanh toán xong.
--   2. Hộp 2 trở đi: giao theo đợt khách chọn (đầu tháng / giữa tháng). Hộp 2 rơi vào đợt đầu tiên
--      cách ngày đăng ký ít nhất 20 ngày, các hộp sau cách nhau 1 tháng. Ngày chốt vẫn là 7 ngày trước đợt giao.
--   3. "Tới hạn" gia hạn = ngày chốt của hộp KẾ TIẾP sau khi đã giao hết số hộp trả trước (trước đây là
--      ngày chốt của hộp cuối, tức khách bị nhắc gia hạn khi còn chưa nhận hộp cuối). Nhắc trước 7, 3, 1 ngày;
--      tới hạn chưa gia hạn thì "Quá hạn" 5 ngày rồi "Hết hạn".

-- Đợt giao cho hộp thứ 2: đợt đầu tiên của lịch đã chọn, bắt đầu sau ngày p_from ít nhất 20 ngày
CREATE OR REPLACE FUNCTION public.second_delivery_window(p_schedule delivery_schedule, p_from date)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day integer := CASE WHEN p_schedule = 'dau_thang' THEN 1 ELSE 15 END;
  v_month date := date_trunc('month', p_from)::date;
  v_candidate date;
BEGIN
  FOR i IN 0..3 LOOP
    v_candidate := (v_month + make_interval(months => i))::date + (v_day - 1);
    IF v_candidate >= p_from + 20 THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
  RETURN v_candidate;
END;
$function$;

CREATE OR REPLACE FUNCTION public.subscribe_to_box(p_box_type_id uuid, p_pet_id uuid, p_plan_id uuid, p_delivery_schedule delivery_schedule, p_recipient_name text, p_recipient_phone text, p_province_city text, p_district text, p_ward text, p_shipping_address text, p_payment_method payment_method)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_box public.box_types%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_pet_owner uuid;
  v_unit_price numeric;
  v_total numeric;
  v_shipping_fee numeric;
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
  v_shipping_fee := public.calc_shipping_fee(p_province_city, v_total, v_plan.free_shipping);

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
    subtotal, shipping_fee, discount_amount, total_amount,
    recipient_name, recipient_phone, shipping_address, province_city, district, ward,
    payment_expires_at
  ) VALUES (
    v_order_code, v_user_id, 'subscription_initial', v_sub_id, 1, 'cho_thanh_toan', p_payment_method, 'pending',
    v_total, v_shipping_fee, 0, v_total + v_shipping_fee,
    p_recipient_name, p_recipient_phone, p_shipping_address, p_province_city, p_district, p_ward,
    now() + interval '30 minutes'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
  VALUES (v_order_id, p_box_type_id, p_pet_id, v_box.name || ' - ' || v_plan.name, v_unit_price, v_plan.cycle_count, v_total);

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id, 'order_id', v_order_id, 'order_code', v_order_code,
    'total_amount', v_total + v_shipping_fee, 'payment_expires_at', now() + interval '30 minutes',
    'next_delivery_date', v_next_delivery, 'cutoff_date', v_cutoff,
    'second_delivery_date', public.second_delivery_window(p_delivery_schedule, CURRENT_DATE)
  );
END;
$function$;

-- Tạo đơn hộp cho các kỳ đã đến hạn chuẩn bị (chạy hằng ngày, và ngay sau khi khách thanh toán gói / gia hạn)
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
    SELECT * FROM public.subscriptions
    WHERE status IN ('dang_hoat_dong', 'da_huy') AND remaining_cycles > 0 AND cutoff_date <= CURRENT_DATE
    FOR UPDATE
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

-- Nhắc gia hạn trước hạn 7, 3, 1 ngày (hạn = ngày chốt của kỳ kế tiếp sau khi đã giao hết hộp trả trước)
CREATE OR REPLACE FUNCTION public.send_subscription_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_days_left integer;
  v_count integer := 0;
BEGIN
  FOR v_sub IN
    SELECT * FROM public.subscriptions
    WHERE status = 'dang_hoat_dong' AND remaining_cycles = 0
  LOOP
    v_days_left := v_sub.cutoff_date - CURRENT_DATE;
    IF v_days_left IN (7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_sub.user_id AND type = 'subscription'
          AND title = 'Gói ' || v_sub.subscription_code || ' sắp đến hạn gia hạn'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          v_sub.user_id,
          'Gói ' || v_sub.subscription_code || ' sắp đến hạn gia hạn',
          'Còn ' || v_days_left || ' ngày để gia hạn. Gia hạn trước ngày ' || to_char(v_sub.cutoff_date, 'DD/MM/YYYY')
            || ' để bé nhận hộp tiếp theo từ ngày ' || to_char(v_sub.next_delivery_date, 'DD/MM/YYYY') || '.',
          'subscription',
          '/my-account/subscriptions'
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Kích hoạt gói; hộp đầu tiên đến hạn chuẩn bị ngay hôm nay
    UPDATE public.subscriptions
      SET status = 'dang_hoat_dong', next_delivery_date = CURRENT_DATE, cutoff_date = CURRENT_DATE
      WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
    PERFORM public.generate_subscription_cycle_orders();
  ELSIF v_order.order_type = 'subscription_renewal' AND v_order.subscription_id IS NOT NULL THEN
    SELECT COALESCE(sum(quantity), 0) INTO v_cycles FROM public.order_items WHERE order_id = p_order_id;
    -- Lịch của kỳ kế tiếp đã được tính sẵn khi giao hết hộp cũ, nên gia hạn chỉ cộng thêm số hộp
    UPDATE public.subscriptions s SET
      plan_id = COALESCE(v_order.renewal_plan_id, s.plan_id),
      total_cycles = s.total_cycles + v_cycles,
      total_prepaid_amount = s.total_prepaid_amount + v_order.subtotal,
      remaining_cycles = s.remaining_cycles + v_cycles,
      status = 'dang_hoat_dong',
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

  UPDATE public.subscriptions SET
    status = 'tam_dung',
    paused_cycles_left = v_cycles,
    next_delivery_date = next_delivery_date + (v_cycles * interval '1 month'),
    cutoff_date = cutoff_date + (v_cycles * interval '1 month')
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object('status', 'tam_dung', 'paused_cycles_left', v_cycles);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_subscription_delivery(p_subscription_id uuid, p_delivery_schedule delivery_schedule DEFAULT NULL::delivery_schedule, p_address jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_next date;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR v_sub.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_sub.status NOT IN ('dang_hoat_dong', 'tam_dung', 'cho_thanh_toan') THEN
    RAISE EXCEPTION 'ERR_INVALID_STATUS';
  END IF;

  IF p_address IS NOT NULL THEN
    IF char_length(trim(coalesce(p_address->>'recipient_name', ''))) < 2
       OR trim(coalesce(p_address->>'province_city', '')) = ''
       OR trim(coalesce(p_address->>'ward', '')) = ''
       OR char_length(trim(coalesce(p_address->>'address', ''))) < 3 THEN
      RAISE EXCEPTION 'ERR_ADDRESS_INCOMPLETE';
    END IF;
    IF coalesce(p_address->>'phone', '') !~ '^0[0-9]{9}$' THEN
      RAISE EXCEPTION 'ERR_PHONE_INVALID';
    END IF;
  END IF;

  IF p_delivery_schedule IS NOT NULL AND p_delivery_schedule <> v_sub.delivery_schedule THEN
    IF v_sub.status = 'cho_thanh_toan' THEN
      -- Chưa thanh toán: hộp đầu vẫn gửi ngay khi trả tiền, đợt mới chỉ áp dụng từ hộp thứ 2
      UPDATE public.subscriptions SET delivery_schedule = p_delivery_schedule WHERE id = p_subscription_id;
    ELSE
      v_next := public.next_delivery_window(
        p_delivery_schedule,
        GREATEST(CURRENT_DATE, date_trunc('month', v_sub.next_delivery_date)::date)
      );
      UPDATE public.subscriptions
        SET delivery_schedule = p_delivery_schedule, next_delivery_date = v_next, cutoff_date = v_next - 7
        WHERE id = p_subscription_id;
    END IF;
  END IF;

  IF p_address IS NOT NULL THEN
    UPDATE public.subscriptions
      SET shipping_address_snapshot = jsonb_build_object(
        'recipient_name', trim(p_address->>'recipient_name'), 'phone', p_address->>'phone',
        'province_city', p_address->>'province_city', 'district', '', 'ward', p_address->>'ward',
        'address', trim(p_address->>'address'))
      WHERE id = p_subscription_id;
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
  RETURN jsonb_build_object('next_delivery_date', v_sub.next_delivery_date, 'cutoff_date', v_sub.cutoff_date);
END;
$function$;

-- Thông báo "đăng ký gói thành công": nói rõ hộp đầu đang được chuẩn bị
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_message text;
  v_type text := 'order';
  v_link text := '/my-account/orders/' || NEW.id;
  v_sub_code text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status OR OLD.status = 'doi_tra' THEN RETURN NEW; END IF;

  -- Gia hạn gói: confirm_order_payment đã gửi thông báo riêng
  IF NEW.order_type = 'subscription_renewal' AND NEW.status = 'da_xac_nhan' THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'da_xac_nhan' THEN
      IF NEW.order_type = 'subscription_initial' THEN
        SELECT subscription_code INTO v_sub_code FROM public.subscriptions WHERE id = NEW.subscription_id;
        v_title := 'Đăng ký gói ' || COALESCE(v_sub_code, NEW.order_code) || ' thành công';
        v_message := 'FPETS đã nhận thanh toán và đang chuẩn bị hộp đầu tiên cho bé. Lịch giao các hộp sau có trong mục Gói định kỳ.';
        v_type := 'subscription';
        v_link := '/my-account/subscriptions';
      ELSE
        v_title := 'Đơn ' || NEW.order_code || ' đã được xác nhận';
        v_message := 'FPETS đã nhận đơn của bạn và sẽ chuẩn bị hàng sớm.';
      END IF;
    WHEN 'dang_giao' THEN
      v_title := 'Đơn ' || NEW.order_code || ' đang được giao';
      v_message := CASE WHEN NEW.tracking_code IS NOT NULL
        THEN 'Mã vận đơn: ' || NEW.tracking_code || '. Bạn để ý điện thoại để nhận hàng nhé.'
        ELSE 'Đơn đã bàn giao cho đơn vị vận chuyển.' END;
    WHEN 'da_giao' THEN
      v_title := 'Đơn ' || NEW.order_code || ' đã giao thành công';
      v_message := 'Chúc bé vui với món quà! Bạn có thể đánh giá và chấm từng món trong đơn.';
    WHEN 'da_huy' THEN
      v_title := 'Đơn ' || NEW.order_code || ' đã hủy';
      v_message := COALESCE('Lý do: ' || NEW.cancellation_reason, 'Đơn đã được hủy.');
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, v_title, v_message, v_type, v_link);
  RETURN NEW;
END;
$function$;

-- Các gói đã thanh toán nhưng chưa có hộp nào được tạo (đang chờ đợt giao theo quy tắc cũ):
-- áp dụng quy tắc mới, hộp đầu được chuẩn bị ngay.
UPDATE public.subscriptions s
  SET next_delivery_date = CURRENT_DATE, cutoff_date = CURRENT_DATE
  WHERE s.status = 'dang_hoat_dong' AND s.current_cycle = 1 AND s.remaining_cycles > 0
    AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.subscription_id = s.id AND o.order_type = 'subscription_cycle');

SELECT public.generate_subscription_cycle_orders();
