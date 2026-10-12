-- NƠI GỬI HÀNG CHUYỂN VỀ HÀ NỘI (12/10/2026)
-- Shop ở Thôn 3 - Thạch Hòa - Thạch Thất - Hòa Lạc. Mức phí ship nội thành (25.000đ) áp dụng cho địa chỉ tại Hà Nội
-- thay cho TP.HCM; tỉnh thành khác vẫn 35.000đ, đơn từ 500.000đ và gói 3, 6 hộp vẫn miễn phí.
-- Bản sao phía client: src/lib/shipping.ts (isLocalProvince).
CREATE OR REPLACE FUNCTION public.calc_shipping_fee(p_province text, p_subtotal numeric, p_free_shipping boolean DEFAULT false)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_free_shipping OR p_subtotal >= 500000 THEN
    RETURN 0;
  END IF;
  IF p_province ILIKE '%Hà Nội%' OR p_province ILIKE '%Ha Noi%' OR p_province ILIKE '%Hanoi%' THEN
    RETURN 25000;
  END IF;
  RETURN 35000;
END;
$function$;
