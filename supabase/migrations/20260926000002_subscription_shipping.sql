-- ==============================================================================
-- Gói định kỳ không freeship (gói 1 hộp) phải cộng phí ship theo tỉnh (SPEC §5, §6).
-- Trước đây subscribe_to_box luôn để shipping_fee = 0 cho mọi gói.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.subscribe_to_box(
  p_box_type_id uuid,
  p_pet_id uuid,
  p_plan_id uuid,
  p_delivery_schedule public.delivery_schedule,
  p_recipient_name text,
  p_recipient_phone text,
  p_province_city text,
  p_district text,
  p_ward text,
  p_shipping_address text,
  p_payment_method public.payment_method
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  v_unit_price := round(v_box.baseprice * (1 - v_plan.discount_percentage / 100.0));
  v_total := v_unit_price * v_plan.cycle_count;
  -- SPEC §5-6: gói có free_shipping (3, 6) miễn ship; gói 1 hộp tính phí ship theo tỉnh
  v_shipping_fee := public.calc_shipping_fee(p_province_city, v_total, v_plan.free_shipping);

  -- Đợt giao gần nhất theo lịch (đầu tháng 1-5 / giữa tháng 15-20), tối thiểu 7 ngày nữa.
  IF p_delivery_schedule = 'dau_thang' THEN
    v_next_delivery := date_trunc('month', now() + interval '1 month')::date + 2;
  ELSE
    v_next_delivery := date_trunc('month', now() + interval '1 month')::date + 16;
  END IF;
  v_cutoff := v_next_delivery - interval '7 days';

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
    'total_amount', v_total + v_shipping_fee, 'payment_expires_at', now() + interval '30 minutes'
  );
END;
$$;
