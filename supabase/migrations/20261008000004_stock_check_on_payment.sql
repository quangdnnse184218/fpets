-- TỒN KHO KHÔNG ĐƯỢC ÂM
--
-- Đơn chờ thanh toán không giữ hàng (CONTEXT, quyết định 7), nên hai khách có thể cùng đặt món cuối cùng.
-- Trước đây lúc xác nhận thanh toán không kiểm tra lại tồn kho: cả hai đơn đều được trừ và kho xuống âm.
--  1. _deduct_retail_stock khóa các sản phẩm, cộng gộp số lượng theo sản phẩm (cùng món ở nhiều dòng)
--     và từ chối nếu không đủ hàng. Áp dụng cho mọi nơi trừ kho hàng lẻ (đặt COD, xác nhận thanh toán).
--  2. confirm_order_payment kiểm tra tồn kho trước khi nhận tiền: hết hàng thì hủy đơn và báo khách,
--     thay vì xác nhận một đơn không giao được.
--  3. confirm_cod_order (không còn trang nào gọi) trừ kho lần nữa cho đơn COD đã trừ lúc đặt: chặn lại.

-- 1. Trừ kho hàng lẻ của một đơn
CREATE OR REPLACE FUNCTION public._deduct_retail_stock(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_new_stock integer;
BEGIN
  -- Khóa theo thứ tự id để hai đơn cùng lúc không khóa chéo nhau; đơn đến sau chờ rồi thấy số tồn đã trừ
  FOR v_item IN
    SELECT p.id, p.name, p.stock_quantity, x.qty
    FROM (
      SELECT product_id, sum(quantity)::integer AS qty
      FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL
      GROUP BY product_id
    ) x
    JOIN public.products p ON p.id = x.product_id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF v_item.stock_quantity < v_item.qty THEN
      RAISE EXCEPTION 'ERR_OUT_OF_STOCK: %', v_item.name;
    END IF;
    v_new_stock := v_item.stock_quantity - v_item.qty;
    UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.id;
    INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note)
    VALUES (v_item.id, 'retail_sale', -v_item.qty, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Trừ kho khi xác nhận đơn bán lẻ');
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public._deduct_retail_stock(uuid) FROM PUBLIC, anon, authenticated;

-- Món đầu tiên trong đơn không đủ hàng (NULL nếu đủ). Khóa các sản phẩm của đơn tới hết giao dịch.
CREATE OR REPLACE FUNCTION public._order_short_item(p_order_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT p.name, p.stock_quantity, x.qty
    FROM (
      SELECT product_id, sum(quantity)::integer AS qty
      FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL
      GROUP BY product_id
    ) x
    JOIN public.products p ON p.id = x.product_id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF v_item.stock_quantity < v_item.qty THEN
      RETURN v_item.name;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public._order_short_item(uuid) FROM PUBLIC, anon, authenticated;

-- 2. Xác nhận thanh toán (giữ nguyên phần kích hoạt gói / gia hạn của bản 20261004000005)
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
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

-- 3. Đơn COD đã được xác nhận và trừ kho ngay lúc đặt (checkout_create_order); hàm này chỉ còn
--    tác dụng trừ kho lần hai. Chỉ cho chạy với đơn COD chưa xác nhận (hiện không có luồng nào tạo ra).
CREATE OR REPLACE FUNCTION public.confirm_cod_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.payment_method <> 'cod' THEN
    RAISE EXCEPTION 'ERR_NOT_COD_ORDER';
  END IF;
  IF v_order.status <> 'cho_thanh_toan' THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  UPDATE public.orders SET status = 'da_xac_nhan' WHERE id = p_order_id;
  PERFORM public._deduct_retail_stock(p_order_id);
  RETURN jsonb_build_object('status', 'da_xac_nhan');
END;
$$;
