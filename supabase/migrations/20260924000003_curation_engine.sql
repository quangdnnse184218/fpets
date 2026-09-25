-- ==============================================================================
-- FPETS DATABASE MIGRATION - 20260924000003_curation_engine.sql
-- Duyệt tuyển chọn Mystery Box (mục 3, 9 SPEC): nhân viên kho/admin chọn món
-- xong, gọi 1 hàm duy nhất để: kiểm tra lại tổng giá trị tối thiểu, trừ tồn
-- kho, ghi log inventory_movements, và chuyển trạng thái box_curations +
-- orders — toàn bộ trong 1 transaction (SECURITY DEFINER để đảm bảo atomic,
-- dù is_staff() đã có quyền ghi trực tiếp từng bảng).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.approve_box_curation(p_curation_id uuid, p_product_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curation public.box_curations%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_pid uuid;
  v_total numeric := 0;
  v_new_stock integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;

  SELECT * INTO v_curation FROM public.box_curations WHERE id = p_curation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CURATION_NOT_FOUND';
  END IF;
  IF v_curation.status <> 'pending_curation' THEN
    RAISE EXCEPTION 'ERR_ALREADY_CURATED';
  END IF;
  IF array_length(p_product_ids, 1) IS NULL OR array_length(p_product_ids, 1) = 0 THEN
    RAISE EXCEPTION 'ERR_NO_ITEMS';
  END IF;

  SELECT * INTO v_box FROM public.box_types WHERE id = v_curation.box_type_id;

  -- Kiểm tra & trừ tồn kho từng món (lock hàng để tránh race)
  FOREACH v_pid IN ARRAY p_product_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_pid FOR UPDATE;
    IF NOT FOUND OR v_product.is_active = false THEN
      RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND: %', v_pid;
    END IF;
    IF v_product.stock_quantity < 1 THEN
      RAISE EXCEPTION 'ERR_OUT_OF_STOCK: %', v_product.name;
    END IF;
    v_total := v_total + v_product.price;
  END LOOP;

  IF v_total < v_box.min_retail_value THEN
    RAISE EXCEPTION 'ERR_BELOW_MIN_VALUE';
  END IF;

  FOREACH v_pid IN ARRAY p_product_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_pid FOR UPDATE;
    v_new_stock := v_product.stock_quantity - 1;
    UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_pid;
    INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
    VALUES (v_pid, 'box_curation', -1, v_product.stock_quantity, v_new_stock, p_curation_id::text, 'Xuất đóng Mystery Box', auth.uid());
    INSERT INTO public.box_curation_items (box_curation_id, product_id, quantity, retail_price)
    VALUES (p_curation_id, v_pid, 1, v_product.price);
  END LOOP;

  UPDATE public.box_curations
    SET status = 'curated', curated_by = auth.uid(), curated_at = now(), total_retail_value = v_total
    WHERE id = p_curation_id;

  UPDATE public.orders SET status = 'dang_chuan_bi' WHERE id = v_curation.order_id AND status IN ('da_xac_nhan', 'dang_chuan_bi');

  RETURN jsonb_build_object('status', 'curated', 'total_retail_value', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_box_curation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_box_curation TO authenticated;

-- Đánh dấu đơn "Đang giao" kèm mã vận đơn (nhân viên kho)
CREATE OR REPLACE FUNCTION public.mark_order_shipping(p_order_id uuid, p_tracking_code text, p_carrier text DEFAULT 'Giao Hàng Nhanh')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  UPDATE public.orders
    SET status = 'dang_giao', tracking_code = p_tracking_code, admin_notes = COALESCE(admin_notes || ' | ', '') || 'Vận chuyển: ' || p_carrier
    WHERE id = p_order_id AND status = 'dang_chuan_bi';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  RETURN jsonb_build_object('status', 'dang_giao');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_shipping FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_order_shipping TO authenticated;

-- Xác nhận đã giao thành công (mở quyền review)
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  UPDATE public.orders SET status = 'da_giao' WHERE id = p_order_id AND status = 'dang_giao';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  RETURN jsonb_build_object('status', 'da_giao');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_delivered FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered TO authenticated;

-- Xác nhận đơn COD đầu tiên của khách (hoặc bất kỳ đơn chờ xác nhận nào, đơn giản hóa)
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
  UPDATE public.orders SET status = 'da_xac_nhan', paid_at = now() WHERE id = p_order_id;
  PERFORM public._deduct_retail_stock(p_order_id);
  RETURN jsonb_build_object('status', 'da_xac_nhan');
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_cod_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_cod_order TO authenticated;

-- Admin/CSKH hủy đơn + hoàn tồn kho nếu đã trừ
CREATE OR REPLACE FUNCTION public.cancel_order_by_staff(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_new_stock integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IN ('da_huy', 'da_giao') THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;

  -- Hoàn kho các dòng bán lẻ nếu đã từng bị trừ (đơn đã ở trạng thái xác nhận trở lên)
  IF v_order.status <> 'cho_thanh_toan' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity, p.stock_quantity
      FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
      FOR UPDATE OF p
    LOOP
      v_new_stock := v_item.stock_quantity + v_item.quantity;
      UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
      VALUES (v_item.product_id, 'return_restock', v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Hoàn kho do hủy đơn', auth.uid());
    END LOOP;
  END IF;

  UPDATE public.orders SET status = 'da_huy', cancelled_at = now(), cancellation_reason = p_reason WHERE id = p_order_id;
  RETURN jsonb_build_object('status', 'da_huy');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_by_staff FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_by_staff TO authenticated;
