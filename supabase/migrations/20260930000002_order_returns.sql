-- Quy trình đổi / trả (SPEC §10):
--  1. Lưu thời điểm giao thật (delivered_at). Hạn báo đổi/trả 3 ngày tính từ mốc này,
--     không tính theo updated_at nữa (trước đây admin sửa đơn là hạn bị đếm lại).
--  2. Mỗi đơn chỉ gửi yêu cầu đổi/trả 1 lần.
--  3. Admin xử lý yêu cầu: đổi món / hoàn tiền / từ chối, kèm ghi chú gửi khách.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_resolution text CHECK (return_resolution IN ('exchanged', 'refunded', 'rejected')),
  ADD COLUMN IF NOT EXISTS return_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_admin_note text;

-- Đơn đã giao trước đây: lấy mốc gần đúng nhất đang có
UPDATE public.orders SET delivered_at = COALESCE(return_requested_at, updated_at)
  WHERE status IN ('da_giao', 'doi_tra') AND delivered_at IS NULL;

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
        delivered_at = now(),
        -- COD: shipper thu tiền khi giao
        payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END,
        paid_at = CASE WHEN payment_method = 'cod' AND paid_at IS NULL THEN now() ELSE paid_at END
    WHERE id = p_order_id AND status = 'dang_giao';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;
  RETURN jsonb_build_object('status', 'da_giao');
END;
$$;

CREATE OR REPLACE FUNCTION public.request_order_return(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
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
  IF COALESCE(v_order.delivered_at, v_order.updated_at) < now() - interval '3 days' THEN
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

CREATE OR REPLACE FUNCTION public.resolve_order_return(p_order_id uuid, p_resolution text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_title text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF p_resolution NOT IN ('exchanged', 'refunded', 'rejected') THEN
    RAISE EXCEPTION 'ERR_INVALID_RESOLUTION';
  END IF;
  IF p_resolution = 'rejected' AND char_length(trim(coalesce(p_note, ''))) = 0 THEN
    RAISE EXCEPTION 'ERR_NOTE_REQUIRED';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND';
  END IF;
  IF v_order.status <> 'doi_tra' THEN
    RAISE EXCEPTION 'ERR_INVALID_ORDER_STATUS';
  END IF;

  -- Đơn trở lại "Đã giao" và lưu kết quả xử lý; trigger thông báo bỏ qua bước này
  UPDATE public.orders
    SET status = 'da_giao', return_resolution = p_resolution, return_resolved_at = now(),
        return_admin_note = nullif(trim(coalesce(p_note, '')), '')
    WHERE id = p_order_id;

  IF v_order.user_id IS NOT NULL THEN
    v_title := CASE p_resolution
      WHEN 'exchanged' THEN 'FPETS sẽ gửi đổi món cho đơn ' || v_order.order_code
      WHEN 'refunded' THEN 'FPETS đã hoàn tiền cho đơn ' || v_order.order_code
      ELSE 'Yêu cầu đổi / trả đơn ' || v_order.order_code || ' chưa được chấp nhận'
    END;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_order.user_id, v_title,
      COALESCE(nullif(trim(coalesce(p_note, '')), ''), 'Cảm ơn bạn đã báo cho FPETS.'),
      'order', '/my-account/orders/' || v_order.id
    );
  END IF;

  RETURN jsonb_build_object('status', 'da_giao', 'resolution', p_resolution);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_order_return(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_order_return(uuid, text, text) TO authenticated;

-- Không gửi lại "đã giao thành công" khi admin đóng yêu cầu đổi/trả (đơn từ doi_tra về da_giao)
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_message text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status OR OLD.status = 'doi_tra' THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'da_xac_nhan' THEN
      v_title := 'Đơn ' || NEW.order_code || ' đã được xác nhận';
      v_message := 'FPETS đã nhận đơn của bạn và sẽ chuẩn bị hàng sớm.';
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

  IF NEW.order_type IN ('subscription_initial', 'subscription_renewal') AND NEW.status = 'da_xac_nhan' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, v_title, v_message, 'order', '/my-account/orders/' || NEW.id);
  RETURN NEW;
END;
$$;
