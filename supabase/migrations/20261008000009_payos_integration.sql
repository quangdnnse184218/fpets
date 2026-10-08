-- TÍCH HỢP payOS (08/10/2026)
--
-- Luồng: trang thanh toán gọi /api/payos/create (server, phiên của khách) -> payos_prepare lấy mã số payOS và số tiền
-- từ database -> tạo yêu cầu thanh toán payOS -> trang tự vẽ mã VietQR từ dữ liệu payOS trả về (khách không rời trang)
-- -> khách chuyển khoản -> payOS gọi /api/payos/webhook (chữ ký HMAC kiểm ở server) -> server gọi
-- confirm_payos_payment kèm khóa bí mật của server. Trong lúc chờ, trang gọi /api/payos/sync vài giây một lần
-- để hỏi payOS (phòng webhook đến chậm).
-- Không cần khóa service_role: các hàm xác nhận chỉ chạy khi có đúng khóa bí mật lưu ở bảng app_secrets
-- (không ai đọc được qua API) và ở biến môi trường PAYOS_SERVER_SECRET trên Vercel. Giá trị khóa KHÔNG nằm trong
-- file này; nạp riêng bằng: INSERT INTO public.app_secrets VALUES ('payos_server_secret', '<khóa>').
-- Trình duyệt không còn gọi được confirm_order_payment (đóng lỗ hổng tự bấm "đã thanh toán").

-- =====================================================================================
-- 1. Cột liên kết với payOS
-- =====================================================================================
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START WITH 100001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payos_order_code bigint UNIQUE, -- payOS yêu cầu mã đơn là số nguyên
  ADD COLUMN IF NOT EXISTS payos_payment_link_id text,
  ADD COLUMN IF NOT EXISTS payos_checkout_url text,
  ADD COLUMN IF NOT EXISTS payos_reference text,
  -- Dữ liệu để FPETS tự vẽ mã VietQR trên trang của mình: chuỗi qrCode, số / tên tài khoản nhận, BIN ngân hàng, nội dung
  ADD COLUMN IF NOT EXISTS payos_qr jsonb;           -- mã giao dịch ngân hàng do payOS gửi về


-- =====================================================================================
-- 2. Khóa bí mật của server
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL
);
-- Bật RLS và không tạo policy nào: không ai đọc / ghi được qua API, chỉ hàm SECURITY DEFINER đọc
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._payos_secret_ok(p_secret text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(char_length(p_secret), 0) >= 32
     AND EXISTS (SELECT 1 FROM public.app_secrets WHERE name = 'payos_server_secret' AND value = p_secret);
$function$;

REVOKE ALL ON FUNCTION public._payos_secret_ok(text) FROM PUBLIC, anon, authenticated;

-- =====================================================================================
-- 3. Xác nhận thanh toán: phần chung, chỉ server gọi
-- =====================================================================================
-- Thân hàm lấy từ confirm_order_payment (20261008000005), bỏ kiểm tra mã đơn và hạn 30 phút:
-- người gọi đã xác thực khoản tiền với payOS.
CREATE OR REPLACE FUNCTION public._confirm_order_payment(p_order_id uuid)
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
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND';
  END IF;
  IF v_order.status <> 'cho_thanh_toan' THEN
    RETURN jsonb_build_object('status', v_order.status, 'payment_status', v_order.payment_status);
  END IF;

  -- Đơn chờ thanh toán không giữ hàng: món có thể đã bán hết cho khách khác trong lúc chờ
  v_short := public._order_short_item(p_order_id);
  IF v_short IS NOT NULL THEN
    PERFORM public._cancel_order(p_order_id, 'Hết hàng trước khi thanh toán: ' || v_short, false);
    RETURN jsonb_build_object('status', 'da_huy', 'payment_status', 'pending', 'reason', 'out_of_stock', 'product', v_short);
  END IF;

  -- Gia hạn: gói phải còn sống lúc trả tiền
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
    UPDATE public.subscriptions
      SET status = 'dang_hoat_dong', next_delivery_date = CURRENT_DATE, cutoff_date = CURRENT_DATE
      WHERE id = v_order.subscription_id AND status = 'cho_thanh_toan';
    PERFORM public.generate_subscription_cycle_orders();
  ELSIF v_order.order_type = 'subscription_renewal' AND v_order.subscription_id IS NOT NULL THEN
    SELECT COALESCE(sum(quantity), 0) INTO v_cycles FROM public.order_items WHERE order_id = p_order_id;
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
    PERFORM public.generate_subscription_cycle_orders();
  END IF;

  RETURN jsonb_build_object('status', 'da_xac_nhan', 'payment_status', 'paid');
END;
$function$;

REVOKE ALL ON FUNCTION public._confirm_order_payment(uuid) FROM PUBLIC, anon, authenticated;

-- Bản cũ cho trang giả lập: trình duyệt không còn gọi được. Các hàm đặt hàng vẫn gọi nội bộ khi điểm / voucher trả hết tiền.
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_order_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND order_code = p_order_code;
  IF NOT FOUND OR (v_order.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_staff()) THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND';
  END IF;
  IF v_order.status = 'cho_thanh_toan' AND v_order.payment_expires_at IS NOT NULL AND v_order.payment_expires_at < now() THEN
    RAISE EXCEPTION 'ERR_PAYMENT_EXPIRED';
  END IF;
  RETURN public._confirm_order_payment(p_order_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text) FROM PUBLIC, anon, authenticated;

-- =====================================================================================
-- 4. Hàm cho route payOS
-- =====================================================================================
-- Khách (đã đăng nhập) chuẩn bị thanh toán đơn của mình: cấp mã số payOS (giữ nguyên nếu đã có),
-- trả số tiền và hạn thanh toán từ database cho server tạo link. Không tin số tiền từ trình duyệt.
CREATE OR REPLACE FUNCTION public.payos_prepare(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND';
  END IF;
  IF v_order.payment_method <> 'payos' THEN
    RAISE EXCEPTION 'ERR_NOT_PAYOS_ORDER';
  END IF;
  IF v_order.status <> 'cho_thanh_toan' OR v_order.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  IF v_order.payment_expires_at IS NOT NULL AND v_order.payment_expires_at < now() THEN
    RAISE EXCEPTION 'ERR_PAYMENT_EXPIRED';
  END IF;
  IF v_order.payos_order_code IS NULL THEN
    UPDATE public.orders SET payos_order_code = nextval('public.payos_order_code_seq')
      WHERE id = p_order_id RETURNING * INTO v_order;
  END IF;
  RETURN jsonb_build_object(
    'payos_order_code', v_order.payos_order_code,
    'order_code', v_order.order_code,
    'amount', v_order.total_amount,
    'expires_at', v_order.payment_expires_at,
    'checkout_url', v_order.payos_checkout_url,
    'qr', v_order.payos_qr
  );
END;
$function$;

-- Lưu link payOS vừa tạo (kèm dữ liệu mã VietQR) để lần mở lại trang dùng đúng mã cũ (payOS không cho tạo trùng mã đơn)
CREATE OR REPLACE FUNCTION public.payos_save_link(p_order_id uuid, p_payment_link_id text, p_checkout_url text, p_qr jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_checkout_url !~ '^https://pay\.payos\.vn/' THEN
    RAISE EXCEPTION 'ERR_INVALID_CHECKOUT_URL';
  END IF;
  UPDATE public.orders
    SET payos_payment_link_id = p_payment_link_id, payos_checkout_url = p_checkout_url, payos_qr = p_qr
    WHERE id = p_order_id AND user_id = auth.uid() AND status = 'cho_thanh_toan';
END;
$function$;

-- payOS báo đã nhận tiền (webhook có chữ ký đã kiểm, hoặc server hỏi lại payOS). Gọi lặp lại vẫn an toàn.
--  - Đơn đang chờ thanh toán: xác nhận như bình thường (kể cả quá 30 phút vài giây: tiền đã vào thật).
--  - Đơn bị hủy trong lúc khách đang chuyển khoản (hết hạn, hết hàng, gói kết thúc, khách tự hủy):
--    ghi nhận "Đã thanh toán" trên đơn đã hủy để nhân viên hoàn tiền (trang Đơn hàng có nút "Đã hoàn tiền").
CREATE OR REPLACE FUNCTION public.confirm_payos_payment(p_payos_order_code bigint, p_amount numeric, p_reference text, p_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_result jsonb;
BEGIN
  IF NOT public._payos_secret_ok(p_secret) THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE payos_order_code = p_payos_order_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'unknown_order');
  END IF;
  IF v_order.payment_status IN ('paid', 'refunded') THEN
    RETURN jsonb_build_object('result', 'already_recorded', 'status', v_order.status);
  END IF;
  -- Chuyển thiếu tiền: không xác nhận, báo nhân viên xử lý
  IF p_amount < v_order.total_amount THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT p.id, 'Đơn ' || v_order.order_code || ' chuyển khoản thiếu',
      'payOS báo nhận ' || p_amount || '₫, đơn cần ' || v_order.total_amount || '₫. Kiểm tra và liên hệ khách.',
      'system', '/admin/orders?q=' || v_order.order_code
    FROM public.profiles p WHERE p.role IN ('admin', 'staff') AND p.is_active;
    RETURN jsonb_build_object('result', 'amount_mismatch');
  END IF;

  UPDATE public.orders SET payos_reference = p_reference WHERE id = v_order.id;

  IF v_order.status = 'cho_thanh_toan' THEN
    v_result := public._confirm_order_payment(v_order.id);
    IF v_result->>'status' = 'da_huy' THEN
      -- Hết hàng / gói đã kết thúc: đơn bị hủy nhưng tiền đã vào, ghi nhận để hoàn tiền
      UPDATE public.orders SET payment_status = 'paid', paid_at = now() WHERE id = v_order.id;
      RETURN v_result || jsonb_build_object('result', 'paid_but_cancelled', 'payment_status', 'paid');
    END IF;
    RETURN v_result || jsonb_build_object('result', 'confirmed');
  END IF;

  -- Đơn đã hủy trước khi tiền về
  UPDATE public.orders
    SET payment_status = 'paid', paid_at = now(),
        cancellation_reason = COALESCE(cancellation_reason, 'Đơn đã hủy') || ' (khách đã chuyển khoản sau khi đơn hủy, cần hoàn tiền)'
    WHERE id = v_order.id;
  RETURN jsonb_build_object('result', 'paid_but_cancelled', 'status', v_order.status, 'payment_status', 'paid');
END;
$function$;

REVOKE ALL ON FUNCTION public.payos_prepare(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.payos_save_link(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_payos_payment(bigint, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payos_prepare(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payos_save_link(uuid, text, text, jsonb) TO authenticated;
-- Webhook gọi bằng khóa anon (không có phiên đăng nhập); hàm tự kiểm khóa bí mật của server
GRANT EXECUTE ON FUNCTION public.confirm_payos_payment(bigint, numeric, text, text) TO anon, authenticated;
