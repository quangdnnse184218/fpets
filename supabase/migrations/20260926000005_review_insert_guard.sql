-- ==============================================================================
-- Khách tự tạo review không được tự ghi các cột do admin quản lý
-- (admin_reply hiển thị công khai dưới tên FPETS, is_rewarded, status).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public._trg_reviews_customer_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    NEW.admin_reply := NULL;
    NEW.admin_reply_at := NULL;
    NEW.is_rewarded := false;
    NEW.status := 'published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_customer_guard ON public.reviews;
CREATE TRIGGER trg_reviews_customer_guard
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public._trg_reviews_customer_guard();
