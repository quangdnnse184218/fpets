-- 1. Upload ảnh sản phẩm / loại hộp từ máy (admin) vào bucket công khai "product-images".
--    Kiểm tra ở server: chỉ JPG/PNG/WEBP, tối đa 5MB, chỉ admin, tên file an toàn trong thư mục products/ hoặc boxes/.
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 5242880
  WHERE id = 'product-images';

DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
    AND name ~ '^(products|boxes)/[a-z0-9][a-z0-9-]{0,100}\.(jpg|png|webp)$'
  );

-- 2. Việc cần xử lý của admin: đếm MỌI đánh giá chưa phản hồi (trước đây chỉ 1–3 sao),
--    tách riêng số đánh giá 1–3 sao để làm nổi bật.
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
    'reviews_unreplied', (SELECT count(*) FROM public.reviews WHERE admin_reply IS NULL),
    'reviews_low_unreplied', (SELECT count(*) FROM public.reviews WHERE admin_reply IS NULL AND rating <= 3),
    'low_stock', (SELECT count(*) FROM public.products WHERE is_active AND stock_quantity <= low_stock_threshold),
    'products_no_image', (SELECT count(*) FROM public.products WHERE is_active AND coalesce(array_length(images, 1), 0) = 0),
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
