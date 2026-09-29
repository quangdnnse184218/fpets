-- Đơn COD: shipper thu tiền khi giao, nên giao thành công cũng là đã thanh toán.
-- Trước đây đơn COD đã giao vẫn giữ payment_status = 'pending', khiến doanh thu
-- (Dashboard, Báo cáo chỉ tính đơn đã thanh toán) không bao giờ gồm đơn COD.

CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  UPDATE public.orders
    SET status = 'da_giao',
        payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END,
        paid_at = CASE WHEN payment_method = 'cod' AND paid_at IS NULL THEN now() ELSE paid_at END
    WHERE id = p_order_id AND status = 'dang_giao';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  RETURN jsonb_build_object('status', 'da_giao');
END;
$$;

-- Sửa các đơn COD đã giao trước đó
UPDATE public.orders
  SET payment_status = 'paid', paid_at = COALESCE(paid_at, updated_at)
  WHERE payment_method = 'cod' AND status = 'da_giao' AND payment_status <> 'paid';
