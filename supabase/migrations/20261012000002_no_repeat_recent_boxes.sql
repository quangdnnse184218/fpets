-- KHÔNG GỬI LẠI MÓN TRONG 3 HỘP KẾ TIẾP (chủ cửa hàng yêu cầu 12/10/2026)
-- Món đã có trong một hộp của bé thì 3 hộp tiếp theo của bé đó không được có lại món này.
-- Trước đây chỉ "hạn chế gửi lại" (đề xuất tự động ưu tiên món mới). Nay chặn cứng ở server khi duyệt hộp;
-- trang admin cũng khóa các món này và đề xuất tự động bỏ qua chúng.
-- Chèn kiểm tra vào approve_box_curation đang chạy, ngay sau bước kiểm dị ứng của từng món.
DO $$
DECLARE
  v_def text;
  v_anchor constant text := '    v_total := v_total + v_product.price;';
  v_check constant text := '    -- Món đã có trong 3 hộp đã tuyển chọn gần nhất của bé thì không gửi lại
    IF EXISTS (
      SELECT 1 FROM public.box_curation_items bci
      JOIN (
        SELECT bc.id FROM public.box_curations bc
        WHERE bc.pet_id = v_curation.pet_id AND bc.status = ''curated'' AND bc.id <> p_curation_id
        ORDER BY bc.curated_at DESC NULLS LAST
        LIMIT 3
      ) recent ON recent.id = bci.box_curation_id
      WHERE bci.product_id = v_pid
    ) THEN
      RAISE EXCEPTION ''ERR_RECENTLY_SENT: %'', v_product.name;
    END IF;
';
BEGIN
  SELECT pg_get_functiondef('public.approve_box_curation(uuid, uuid[])'::regprocedure) INTO v_def;
  IF position('ERR_RECENTLY_SENT' IN v_def) > 0 THEN
    RETURN; -- đã chạy rồi
  END IF;
  IF (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 THEN
    RAISE EXCEPTION 'approve_box_curation: không tìm thấy đúng 1 chỗ cộng giá trị món để chèn kiểm tra';
  END IF;
  EXECUTE replace(v_def, v_anchor, v_check || v_anchor);
END;
$$;
