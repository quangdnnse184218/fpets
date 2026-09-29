-- SPEC §10: Mystery Box báo lỗi trong 3 ngày; sản phẩm lẻ còn nguyên seal đổi trả trong 7 ngày.
-- Đơn có ít nhất 1 sản phẩm lẻ dùng hạn 7 ngày (tính từ lúc giao).

CREATE OR REPLACE FUNCTION public.request_order_return(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_days integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  IF v_order.status <> 'da_giao' THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_DELIVERED';
  END IF;
  IF v_order.return_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'ERR_RETURN_ALREADY_REQUESTED';
  END IF;

  v_days := CASE WHEN EXISTS (
    SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND box_type_id IS NULL AND product_id IS NOT NULL
  ) THEN 7 ELSE 3 END;
  IF COALESCE(v_order.delivered_at, v_order.updated_at) < now() - make_interval(days => v_days) THEN
    RAISE EXCEPTION 'ERR_RETURN_WINDOW_EXPIRED';
  END IF;
  IF char_length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_REASON_REQUIRED';
  END IF;

  UPDATE public.orders
    SET status = 'doi_tra', return_requested_at = now(), return_reason = left(trim(p_reason), 1000)
    WHERE id = p_order_id;

  RETURN jsonb_build_object('status', 'doi_tra');
END;
$$;
