-- 1. Giá 1 hộp theo gói làm tròn đến 1.000₫ (269.100₫ → 269.000₫) cho dễ đọc và dễ thanh toán.
--    Bản hiển thị ở giao diện: src/lib/pricing.ts (planUnitPrice).
-- 2. Đơn mới bắt buộc đủ thông tin nhận hàng; trước đây server nhận cả đơn thiếu phường/xã hoặc sai số điện thoại.

CREATE OR REPLACE FUNCTION public.plan_unit_price(p_base numeric, p_discount_percentage numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT round(p_base * (1 - p_discount_percentage / 100.0) / 1000) * 1000;
$$;

-- subscribe_to_box và renew_subscription dùng chung công thức giá cũ; thay đúng biểu thức đó bằng hàm mới.
-- Dừng lại nếu không tìm thấy biểu thức, tránh áp dụng nhầm khi hàm đã bị sửa khác đi.
DO $$
DECLARE
  v_fn text;
  v_def text;
  v_old constant text := 'round(v_box.baseprice * (1 - v_plan.discount_percentage / 100.0))';
  v_new constant text := 'public.plan_unit_price(v_box.baseprice, v_plan.discount_percentage)';
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['subscribe_to_box', 'renew_subscription'] LOOP
    v_def := pg_get_functiondef(('public.' || v_fn)::regproc);
    IF position(v_new in v_def) > 0 THEN
      CONTINUE;
    END IF;
    IF position(v_old in v_def) = 0 THEN
      RAISE EXCEPTION 'Không tìm thấy công thức giá cũ trong hàm %', v_fn;
    END IF;
    EXECUTE replace(v_def, v_old, v_new);
  END LOOP;
END $$;

-- Chặn đơn thiếu thông tin nhận hàng ở mọi đường tạo đơn mới của khách.
-- Đơn giao hộp theo kỳ và đơn gia hạn lấy địa chỉ từ gói (đã kiểm tra khi đăng ký hoặc đổi địa chỉ) nên không chặn ở đây.
CREATE OR REPLACE FUNCTION public._trg_orders_address_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_type NOT IN ('retail', 'mystery_box', 'subscription_initial') THEN
    RETURN NEW;
  END IF;
  IF char_length(trim(coalesce(NEW.recipient_name, ''))) < 2
     OR trim(coalesce(NEW.province_city, '')) = ''
     OR trim(coalesce(NEW.ward, '')) = ''
     OR char_length(trim(coalesce(NEW.shipping_address, ''))) < 3 THEN
    RAISE EXCEPTION 'ERR_ADDRESS_INCOMPLETE';
  END IF;
  IF coalesce(NEW.recipient_phone, '') !~ '^0[0-9]{9}$' THEN
    RAISE EXCEPTION 'ERR_PHONE_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._trg_orders_address_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_address_guard ON public.orders;
CREATE TRIGGER trg_orders_address_guard
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_orders_address_guard();

-- Đổi địa chỉ của gói: cùng quy tắc (thêm phường/xã và định dạng số điện thoại)
CREATE OR REPLACE FUNCTION public.update_my_subscription_delivery(
  p_subscription_id uuid,
  p_delivery_schedule public.delivery_schedule DEFAULT NULL,
  p_address jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    v_next := public.next_delivery_window(
      p_delivery_schedule,
      GREATEST(CURRENT_DATE, date_trunc('month', v_sub.next_delivery_date)::date)
    );
    UPDATE public.subscriptions
      SET delivery_schedule = p_delivery_schedule, next_delivery_date = v_next, cutoff_date = v_next - 7
      WHERE id = p_subscription_id;
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
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_subscription_delivery FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_subscription_delivery TO authenticated;
