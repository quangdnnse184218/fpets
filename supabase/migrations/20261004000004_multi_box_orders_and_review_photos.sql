-- 1. Một đơn được chứa NHIỀU Mystery Box (ví dụ khách có 2 bé, mỗi bé 1 hộp).
--    Quy tắc mới: trong một đơn, mỗi cặp (loại hộp, bé) chỉ có 1 hộp; số lượng mỗi dòng hộp luôn là 1.
-- 2. Ảnh trong đánh giá (SPEC §8: tối đa 5 ảnh unbox): server kiểm tra ảnh thuộc đúng thư mục của khách.

-- ---------------------------------------------------------------------------------------------
-- 1. NHIỀU HỘP TRONG MỘT ĐƠN
-- ---------------------------------------------------------------------------------------------

-- Trước đây mỗi đơn chỉ có 1 dòng tuyển chọn; nay mỗi hộp (bé + loại hộp) một dòng
ALTER TABLE public.box_curations DROP CONSTRAINT IF EXISTS box_curations_order_id_key;
ALTER TABLE public.box_curations
  ADD CONSTRAINT box_curations_order_pet_box_key UNIQUE (order_id, pet_id, box_type_id);

-- Giỏ hàng: không cho trùng cùng một hộp cho cùng một bé
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_box_pet_key
  ON public.cart_items (cart_id, box_type_id, pet_id)
  WHERE box_type_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._trg_order_items_box_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.box_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Đơn thuộc gói định kỳ: số lượng = số kỳ và bé đã được kiểm khi tạo gói
  -- (trigger trên subscriptions), bé có thể lớn lên đổi size giữa gói nên không kiểm lại.
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id AND subscription_id IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  -- Mỗi dòng hộp là 1 hộp cho 1 bé (mỗi hộp được tuyển chọn riêng)
  IF NEW.quantity <> 1 THEN
    RAISE EXCEPTION 'ERR_BOX_QUANTITY';
  END IF;
  -- Một đơn có thể có nhiều hộp, nhưng không trùng cùng loại hộp cho cùng một bé
  IF EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = NEW.order_id AND box_type_id = NEW.box_type_id AND pet_id = NEW.pet_id AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ERR_DUPLICATE_BOX';
  END IF;
  PERFORM public._assert_pet_fits_box(NEW.pet_id, NEW.box_type_id);
  RETURN NEW;
END;
$function$;

-- Duyệt tuyển chọn: đơn chỉ chuyển sang "Đang chuẩn bị" khi MỌI hộp trong đơn đã được chọn món.
-- Trả thêm remaining_pending để trang admin báo còn bao nhiêu hộp của đơn đang chờ.
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
  v_remaining integer;
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

  SELECT count(*) INTO v_remaining FROM public.box_curations
    WHERE order_id = v_curation.order_id AND status = 'pending_curation';

  IF v_remaining = 0 THEN
    UPDATE public.orders SET status = 'dang_chuan_bi'
      WHERE id = v_curation.order_id AND status IN ('da_xac_nhan', 'dang_chuan_bi');
  END IF;

  RETURN jsonb_build_object('status', 'curated', 'total_retail_value', v_total, 'remaining_pending', v_remaining);
END;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 2. ẢNH TRONG ĐÁNH GIÁ
-- ---------------------------------------------------------------------------------------------

-- Khách chỉ tải ảnh vào thư mục mang mã tài khoản của chính mình, tên file an toàn
DROP POLICY IF EXISTS review_photos_owner_insert ON storage.objects;
CREATE POLICY review_photos_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND name ~ ('^' || auth.uid()::text || '/[a-z0-9-]{1,80}\.(jpg|png|webp)$')
  );

-- Đánh giá do khách gửi: giữ các kiểm tra cũ và kiểm thêm ảnh.
-- Mỗi ảnh phải là đường dẫn công khai tới một file CÓ THẬT trong thư mục của chính khách ở bucket review-photos,
-- tối đa 5 ảnh. Không tin đường dẫn do trình duyệt gửi lên.
CREATE OR REPLACE FUNCTION public._trg_reviews_customer_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_img text;
  v_name text;
BEGIN
  NEW.images := COALESCE(NEW.images, '{}');
  IF NOT public.is_staff() THEN
    NEW.admin_reply := NULL;
    NEW.admin_reply_at := NULL;
    NEW.is_rewarded := false;
    NEW.status := 'published';

    IF COALESCE(array_length(NEW.images, 1), 0) > 5 THEN
      RAISE EXCEPTION 'ERR_TOO_MANY_PHOTOS';
    END IF;
    FOREACH v_img IN ARRAY NEW.images LOOP
      v_name := substring(v_img from '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/review-photos/(' || auth.uid()::text || '/[a-z0-9-]{1,80}\.(?:jpg|png|webp))$');
      IF v_name IS NULL OR NOT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = 'review-photos' AND name = v_name
      ) THEN
        RAISE EXCEPTION 'ERR_INVALID_PHOTO';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
