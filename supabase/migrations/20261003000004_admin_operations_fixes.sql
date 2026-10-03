-- Sửa luồng vận hành phía admin (rà soát toàn bộ trang quản trị 03/10/2026):
--  1. Đơn bán lẻ đã xác nhận không có cách chuyển sang "Đang chuẩn bị" (chỉ duyệt hộp mới chuyển) -> kẹt mãi.
--  2. Hủy đơn hộp đã tuyển chọn không hoàn kho các món trong hộp; hộp của đơn đã hủy vẫn nằm trong hàng chờ.
--  3. Admin hủy được đơn "Thanh toán gói" (biên nhận) trong khi gói vẫn chạy.
--  4. Hàng chờ tuyển chọn duyệt được cả hộp của đơn chưa thanh toán / đã hủy (trừ kho oan).
--  5. Nút +/- tồn kho và phiếu nhập kho ghi đè số tồn cũ phía trình duyệt (mất số đã bán trong lúc đó).
--  6. Khóa tài khoản khách không có tác dụng: khách bị khóa vẫn đặt hàng được.
--  7. Ai cũng đọc được toàn bộ mã voucher đang chạy qua API (policy public select).
--  8. Số việc cần xử lý cho chuông thông báo và Dashboard admin, tính ở server trong 1 lần gọi.

-- 1. Bắt đầu đóng gói đơn đã xác nhận (đơn có hộp phải duyệt tuyển chọn trước)
CREATE OR REPLACE FUNCTION public.start_order_preparation(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'ERR_FORBIDDEN'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'da_xac_nhan' OR v_order.order_type IN ('subscription_initial', 'subscription_renewal') THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.box_curations WHERE order_id = p_order_id AND status = 'pending_curation') THEN
    RAISE EXCEPTION 'ERR_CURATION_PENDING';
  END IF;
  UPDATE public.orders SET status = 'dang_chuan_bi' WHERE id = p_order_id;
  RETURN jsonb_build_object('status', 'dang_chuan_bi');
END;
$function$;

REVOKE ALL ON FUNCTION public.start_order_preparation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_order_preparation(uuid) TO authenticated;

-- 2 + 3. Hủy đơn bởi admin
CREATE OR REPLACE FUNCTION public.cancel_order_by_staff(p_order_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_new_stock integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF char_length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_REASON_REQUIRED';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IN ('da_huy', 'da_giao', 'doi_tra') THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  -- Biên nhận thanh toán / gia hạn và đơn giao hộp của gói: xử lý ở trang Gói định kỳ (tạm dừng, hủy gói)
  IF v_order.order_type IN ('subscription_initial', 'subscription_renewal', 'subscription_cycle')
     AND v_order.status <> 'cho_thanh_toan' THEN
    RAISE EXCEPTION 'ERR_SUBSCRIPTION_ORDER';
  END IF;

  IF v_order.status <> 'cho_thanh_toan' THEN
    -- Hàng lẻ đã trừ kho khi xác nhận
    FOR v_item IN
      SELECT oi.product_id, oi.quantity, p.stock_quantity
      FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
      FOR UPDATE OF p
    LOOP
      v_new_stock := v_item.stock_quantity + v_item.quantity;
      UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
      VALUES (v_item.product_id, 'return_restock', v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Hoàn kho do hủy đơn ' || v_order.order_code, auth.uid());
    END LOOP;

    -- Món trong hộp đã trừ kho khi duyệt tuyển chọn
    FOR v_item IN
      SELECT bci.product_id, bci.quantity, p.stock_quantity
      FROM public.box_curation_items bci
      JOIN public.box_curations bc ON bc.id = bci.box_curation_id
      JOIN public.products p ON p.id = bci.product_id
      WHERE bc.order_id = p_order_id AND bc.status = 'curated'
      FOR UPDATE OF p
    LOOP
      v_new_stock := v_item.stock_quantity + v_item.quantity;
      UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_id, note, performed_by)
      VALUES (v_item.product_id, 'return_restock', v_item.quantity, v_item.stock_quantity, v_new_stock, p_order_id::text, 'Hoàn kho món trong hộp do hủy đơn ' || v_order.order_code, auth.uid());
    END LOOP;
  END IF;

  UPDATE public.box_curations SET status = 'cancelled' WHERE order_id = p_order_id AND status IN ('pending_curation', 'curated');

  -- Đăng ký gói chưa thanh toán bị hủy theo đơn
  IF v_order.order_type = 'subscription_initial' AND v_order.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions SET status = 'da_huy', cancellation_reason = trim(p_reason)
      WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
  END IF;

  IF v_order.voucher_id IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = greatest(used_count - 1, 0) WHERE id = v_order.voucher_id;
  END IF;

  -- Đơn đã trả online: admin hoàn tiền thủ công cho khách, hệ thống ghi nhận "Đã hoàn tiền"
  UPDATE public.orders
    SET status = 'da_huy', cancelled_at = now(), cancellation_reason = trim(p_reason),
        payment_status = CASE WHEN payment_status = 'paid' AND payment_method <> 'cod' THEN 'refunded'::public.payment_status ELSE payment_status END
    WHERE id = p_order_id;
  RETURN jsonb_build_object('status', 'da_huy');
END;
$function$;

-- 2. Đơn hết hạn thanh toán: rút hộp khỏi hàng chờ, trả lượt voucher
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH cancelled AS (
    UPDATE public.orders
      SET status = 'da_huy', cancelled_at = now(), cancellation_reason = 'Hết hạn thanh toán tự động (30 phút)'
      WHERE status = 'cho_thanh_toan' AND payment_expires_at IS NOT NULL AND payment_expires_at < now()
      RETURNING id, order_type, subscription_id, voucher_id
  ), subs AS (
    UPDATE public.subscriptions s
      SET status = 'da_huy', cancellation_reason = 'Không thanh toán khi đăng ký'
      FROM cancelled c
      WHERE c.order_type = 'subscription_initial' AND c.subscription_id = s.id AND s.status = 'cho_thanh_toan'
      RETURNING s.id
  ), curations AS (
    UPDATE public.box_curations bc SET status = 'cancelled'
      FROM cancelled c
      WHERE bc.order_id = c.id AND bc.status = 'pending_curation'
      RETURNING bc.id
  ), voucher_back AS (
    UPDATE public.vouchers v SET used_count = greatest(v.used_count - x.n, 0)
      FROM (SELECT voucher_id, count(*)::integer AS n FROM cancelled WHERE voucher_id IS NOT NULL GROUP BY voucher_id) x
      WHERE v.id = x.voucher_id
      RETURNING v.id
  )
  SELECT (SELECT count(*) FROM cancelled) INTO v_count;
  RETURN v_count;
END;
$function$;

-- 4. Chỉ tuyển chọn hộp của đơn đã xác nhận
CREATE OR REPLACE FUNCTION public.approve_box_curation(p_curation_id uuid, p_product_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_curation public.box_curations%ROWTYPE;
  v_box public.box_types%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_order_status public.order_status;
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
  SELECT status INTO v_order_status FROM public.orders WHERE id = v_curation.order_id FOR UPDATE;
  IF v_order_status IS NULL OR v_order_status NOT IN ('da_xac_nhan', 'dang_chuan_bi') THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_READY';
  END IF;
  IF array_length(p_product_ids, 1) IS NULL OR array_length(p_product_ids, 1) = 0 THEN
    RAISE EXCEPTION 'ERR_NO_ITEMS';
  END IF;

  SELECT * INTO v_box FROM public.box_types WHERE id = v_curation.box_type_id;

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
$function$;

-- Đơn vị vận chuyển để trống thì vẫn ghi chú đúng (trước đây NULL làm mất cả admin_notes)
CREATE OR REPLACE FUNCTION public.mark_order_shipping(p_order_id uuid, p_tracking_code text, p_carrier text DEFAULT 'Giao Hàng Nhanh'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF char_length(trim(coalesce(p_tracking_code, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_TRACKING_REQUIRED';
  END IF;
  UPDATE public.orders
    SET status = 'dang_giao', tracking_code = trim(p_tracking_code),
        admin_notes = COALESCE(admin_notes || ' | ', '') || 'Vận chuyển: ' || COALESCE(nullif(trim(p_carrier), ''), 'Giao Hàng Nhanh')
    WHERE id = p_order_id AND status = 'dang_chuan_bi';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  RETURN jsonb_build_object('status', 'dang_giao');
END;
$function$;

-- 5. Điều chỉnh / nhập kho cộng trừ trên số tồn hiện tại trong DB
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid, p_delta integer, p_movement_type public.inventory_movement_type, p_note text DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'ERR_FORBIDDEN'; END IF;
  IF p_delta = 0 THEN RAISE EXCEPTION 'ERR_INVALID_QUANTITY'; END IF;
  IF p_movement_type NOT IN ('import', 'adjustment') THEN RAISE EXCEPTION 'ERR_INVALID_MOVEMENT'; END IF;
  IF p_movement_type = 'import' AND p_delta < 0 THEN RAISE EXCEPTION 'ERR_INVALID_QUANTITY'; END IF;

  SELECT stock_quantity INTO v_prev FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND'; END IF;
  v_new := v_prev + p_delta;
  IF v_new < 0 THEN RAISE EXCEPTION 'ERR_STOCK_NEGATIVE'; END IF;

  UPDATE public.products SET stock_quantity = v_new WHERE id = p_product_id;
  INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, note, performed_by)
  VALUES (p_product_id, p_movement_type, p_delta, v_prev, v_new,
          COALESCE(nullif(trim(p_note), ''), CASE WHEN p_movement_type = 'import' THEN 'Phiếu nhập hàng' ELSE 'Điều chỉnh tồn kho' END),
          auth.uid());
  RETURN v_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid, integer, public.inventory_movement_type, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, public.inventory_movement_type, text) TO authenticated;

-- 6. Tài khoản bị khóa không tạo được đơn mua / đăng ký / gia hạn (mọi RPC đặt hàng đều đi qua INSERT orders)
CREATE OR REPLACE FUNCTION public._trg_orders_account_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND NEW.order_type IN ('retail', 'mystery_box', 'subscription_initial', 'subscription_renewal')
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND is_active = false) THEN
    RAISE EXCEPTION 'ERR_ACCOUNT_LOCKED';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._trg_orders_account_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_account_guard ON public.orders;
CREATE TRIGGER trg_orders_account_guard
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._trg_orders_account_guard();

-- 7. Kiểm tra đúng 1 mã khách nhập thay vì để lộ cả bảng voucher
CREATE OR REPLACE FUNCTION public.preview_voucher(p_code text)
 RETURNS TABLE (code text, voucher_type public.voucher_discount_type, discount_value numeric, max_discount numeric, min_order_value numeric, scope text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.code, v.voucher_type, v.discount_value, v.max_discount, v.min_order_value, v.scope
  FROM public.vouchers v
  WHERE v.code = upper(trim(p_code))
    AND v.is_active
    AND v.valid_from <= now() AND v.valid_to >= now()
    AND v.used_count < v.usage_limit_total
$function$;

REVOKE ALL ON FUNCTION public.preview_voucher(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_voucher(text) TO anon, authenticated;

DROP POLICY IF EXISTS vouchers_public_select ON public.vouchers;

-- 8. Việc cần xử lý + số liệu tổng quan cho admin
CREATE OR REPLACE FUNCTION public.admin_task_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'ERR_FORBIDDEN'; END IF;
  RETURN jsonb_build_object(
    'curation_pending', (
      SELECT count(*) FROM public.box_curations bc JOIN public.orders o ON o.id = bc.order_id
      WHERE bc.status = 'pending_curation' AND o.status IN ('da_xac_nhan', 'dang_chuan_bi')),
    'orders_to_prepare', (
      SELECT count(*) FROM public.orders o
      WHERE o.status = 'da_xac_nhan' AND o.order_type NOT IN ('subscription_initial', 'subscription_renewal')
        AND NOT EXISTS (SELECT 1 FROM public.box_curations bc WHERE bc.order_id = o.id AND bc.status = 'pending_curation')),
    'orders_to_ship', (SELECT count(*) FROM public.orders WHERE status = 'dang_chuan_bi'),
    'orders_in_transit', (SELECT count(*) FROM public.orders WHERE status = 'dang_giao'),
    'returns_pending', (SELECT count(*) FROM public.orders WHERE status = 'doi_tra'),
    'feedback_new', (SELECT count(*) FROM public.feedback_messages WHERE status = 'new'),
    'reviews_unreplied', (SELECT count(*) FROM public.reviews WHERE admin_reply IS NULL AND rating <= 3),
    'low_stock', (SELECT count(*) FROM public.products WHERE is_active AND stock_quantity <= low_stock_threshold),
    'subs_cutoff_soon', (
      SELECT count(*) FROM public.subscriptions
      WHERE status = 'dang_hoat_dong' AND remaining_cycles > 0 AND cutoff_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
    'subs_overdue', (SELECT count(*) FROM public.subscriptions WHERE status = 'qua_han'),
    'orders_today', (
      SELECT count(*) FROM public.orders
      WHERE order_type IN ('retail', 'mystery_box', 'subscription_initial', 'subscription_renewal')
        AND status NOT IN ('da_huy', 'cho_thanh_toan') AND created_at >= date_trunc('day', now()))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_task_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_task_counts() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day timestamptz := date_trunc('day', now());
  v_month timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'ERR_FORBIDDEN'; END IF;
  -- Doanh thu = tiền đã thu (đơn đã thanh toán, tính theo lúc thu tiền); đơn đã hoàn tiền không tính
  RETURN jsonb_build_object(
    'revenue_today', (SELECT COALESCE(sum(total_amount), 0) FROM public.orders WHERE payment_status = 'paid' AND COALESCE(paid_at, created_at) >= v_day),
    'revenue_month', (SELECT COALESCE(sum(total_amount), 0) FROM public.orders WHERE payment_status = 'paid' AND COALESCE(paid_at, created_at) >= v_month),
    'orders_month', (
      SELECT count(*) FROM public.orders
      WHERE order_type IN ('retail', 'mystery_box', 'subscription_initial') AND status NOT IN ('da_huy', 'cho_thanh_toan') AND created_at >= v_month),
    'subs_active', (SELECT count(*) FROM public.subscriptions WHERE status = 'dang_hoat_dong'),
    'subs_paused', (SELECT count(*) FROM public.subscriptions WHERE status = 'tam_dung'),
    'subs_new_month', (SELECT count(*) FROM public.subscriptions WHERE status <> 'cho_thanh_toan' AND created_at >= v_month),
    'subs_cancelled_month', (SELECT count(*) FROM public.subscriptions WHERE status = 'da_huy' AND updated_at >= v_month AND cancellation_reason IS DISTINCT FROM 'Không thanh toán khi đăng ký'),
    -- Phân bổ trạng thái chỉ tính đơn phải giao hàng (bỏ biên nhận thanh toán / gia hạn gói)
    'status_counts', (
      SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb)
      FROM (SELECT status, count(*) AS n FROM public.orders
            WHERE order_type IN ('retail', 'mystery_box', 'subscription_cycle') GROUP BY status) s)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- Dọn dữ liệu cũ: hộp của đơn đã hủy không còn nằm trong hàng chờ
UPDATE public.box_curations bc SET status = 'cancelled'
  FROM public.orders o
  WHERE o.id = bc.order_id AND o.status = 'da_huy' AND bc.status = 'pending_curation';
