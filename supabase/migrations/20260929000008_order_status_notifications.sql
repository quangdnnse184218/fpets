-- Thông báo trên web khi đơn đổi trạng thái (SPEC §8), bấm vào đi thẳng tới chi tiết đơn.
-- Chỉ áp dụng cho đơn có tài khoản; đơn kỳ gói định kỳ tạo sẵn ở trạng thái "Đã xác nhận" nên
-- chỉ báo từ lúc bắt đầu giao.

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
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

  -- Đơn thanh toán gói / gia hạn đã có thông báo riêng ở luồng gói định kỳ
  IF NEW.order_type IN ('subscription_initial', 'subscription_renewal') AND NEW.status = 'da_xac_nhan' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, v_title, v_message, 'order', '/my-account/orders/' || NEW.id);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
