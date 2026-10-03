-- Thông báo "đặt hàng / thanh toán thành công" (SPEC §8) còn thiếu ở 2 chỗ:
--  1. Đơn COD được tạo thẳng ở trạng thái da_xac_nhan, không có lần UPDATE status nào
--     nên trigger notify_order_status_change không chạy -> khách không nhận thông báo đặt hàng.
--  2. Đơn subscription_initial thanh toán xong bị trigger bỏ qua, mà confirm_order_payment
--     chỉ báo cho đơn gia hạn -> khách đăng ký gói không nhận thông báo nào.

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_message text;
  v_type text := 'order';
  v_link text := '/my-account/orders/' || NEW.id;
  v_sub_code text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status OR OLD.status = 'doi_tra' THEN RETURN NEW; END IF;

  -- Gia hạn gói: confirm_order_payment đã gửi thông báo riêng
  IF NEW.order_type = 'subscription_renewal' AND NEW.status = 'da_xac_nhan' THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'da_xac_nhan' THEN
      IF NEW.order_type = 'subscription_initial' THEN
        SELECT subscription_code INTO v_sub_code FROM public.subscriptions WHERE id = NEW.subscription_id;
        v_title := 'Đăng ký gói ' || COALESCE(v_sub_code, NEW.order_code) || ' thành công';
        v_message := 'FPETS đã nhận thanh toán. Lịch giao từng kỳ và ngày chốt hộp có trong mục Gói định kỳ.';
        v_type := 'subscription';
        v_link := '/my-account/subscriptions';
      ELSE
        v_title := 'Đơn ' || NEW.order_code || ' đã được xác nhận';
        v_message := 'FPETS đã nhận đơn của bạn và sẽ chuẩn bị hàng sớm.';
      END IF;
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

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, v_title, v_message, v_type, v_link);
  RETURN NEW;
END;
$function$;

-- Đơn COD (mua lẻ / Mystery Box mua 1 lần) vào thẳng da_xac_nhan lúc tạo
CREATE OR REPLACE FUNCTION public.notify_order_placed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL OR NEW.status <> 'da_xac_nhan' OR NEW.order_type NOT IN ('retail', 'mystery_box') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'Đặt hàng thành công: đơn ' || NEW.order_code,
    'FPETS đã nhận đơn và sẽ chuẩn bị hàng sớm.' || CASE WHEN NEW.payment_method = 'cod'
      THEN ' Bạn thanh toán ' || replace(to_char(NEW.total_amount, 'FM999,999,999'), ',', '.') || '₫ khi nhận hàng.'
      ELSE '' END,
    'order',
    '/my-account/orders/' || NEW.id
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_order_placed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_order_placed ON public.orders;
CREATE TRIGGER trg_notify_order_placed
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_placed();
