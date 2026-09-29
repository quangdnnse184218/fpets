-- Khách tự đổi đợt giao và/hoặc địa chỉ nhận cho các kỳ sau của gói (SPEC §5).
-- Chỉ ảnh hưởng các hộp chưa được tạo đơn: hộp đã qua ngày chốt vẫn giao theo thông tin cũ.
-- Đổi đợt giao: ngày giao mới không sớm hơn tháng đang dự kiến, và ngày chốt mới chưa qua,
-- để hai hộp liên tiếp không bị dồn sát nhau.

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
    IF coalesce(p_address->>'recipient_name', '') = '' OR coalesce(p_address->>'phone', '') = ''
       OR coalesce(p_address->>'province_city', '') = '' OR coalesce(p_address->>'address', '') = '' THEN
      RAISE EXCEPTION 'ERR_ADDRESS_INCOMPLETE';
    END IF;
    UPDATE public.subscriptions
      SET shipping_address_snapshot = jsonb_build_object(
        'recipient_name', p_address->>'recipient_name', 'phone', p_address->>'phone',
        'province_city', p_address->>'province_city', 'district', '', 'ward', coalesce(p_address->>'ward', ''),
        'address', p_address->>'address')
      WHERE id = p_subscription_id;
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
  RETURN jsonb_build_object('next_delivery_date', v_sub.next_delivery_date, 'cutoff_date', v_sub.cutoff_date);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_subscription_delivery FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_subscription_delivery TO authenticated;
