-- 1) Tra cứu đơn chỉ bằng mã đơn (bỏ ô số điện thoại theo yêu cầu).
-- Mã đơn có dạng FPET-ngày-4 số nên người lạ có thể dò ra. Vì vậy bản tra cứu chỉ bằng mã KHÔNG trả
-- thông tin cá nhân đầy đủ: tên và số điện thoại được che bớt, địa chỉ chỉ còn tỉnh/thành.
-- Khách xem đầy đủ trong Tài khoản → Đơn hàng (có đăng nhập, có RLS).
-- Bản cũ lookup_order(mã đơn, số điện thoại) được giữ lại cho bản web đang chạy; sẽ gỡ ở migration sau.
CREATE OR REPLACE FUNCTION public.lookup_order(p_order_code text)
RETURNS TABLE (
  order_code text,
  status public.order_status,
  total_amount numeric,
  tracking_code text,
  province_city text,
  recipient_name text,
  recipient_phone text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.order_code,
    o.status,
    o.total_amount,
    o.tracking_code,
    o.province_city,
    CASE
      WHEN char_length(trim(o.recipient_name)) <= 2 THEN left(trim(o.recipient_name), 1) || '***'
      ELSE left(trim(o.recipient_name), 1) || '***' || right(trim(o.recipient_name), 1)
    END,
    CASE
      WHEN char_length(o.recipient_phone) >= 7 THEN left(o.recipient_phone, 3) || '****' || right(o.recipient_phone, 3)
      ELSE '****'
    END,
    o.created_at
  FROM public.orders o
  WHERE o.order_code = upper(trim(p_order_code));
$$;

REVOKE ALL ON FUNCTION public.lookup_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order(text) TO anon, authenticated;

-- 2) Đơn quá 30 phút chưa thanh toán phải sang "Đã hủy" ngay khi khách hoặc admin mở trang đơn hàng,
-- không chờ lượt chạy định kỳ (10 phút/lần) như trước: trong khoảng chờ đó đơn vẫn nằm ở "Chờ thanh toán"
-- nhưng không thanh toán được. Hàm chỉ hủy đơn thật sự đã quá hạn nên cho tài khoản đã đăng nhập gọi là an toàn.
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders() TO authenticated;
