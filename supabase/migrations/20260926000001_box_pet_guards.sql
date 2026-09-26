-- ==============================================================================
-- Ràng buộc nghiệp vụ Mystery Box ở tầng database (không tin client):
--  1. Bé nhận box phải cùng loài với loại box; với chó thì size (dưới/trên 10kg)
--     cũng phải khớp. Mèo chỉ xét loài vì box mèo không tách size.
--  2. Mỗi đơn mua 1 lần chỉ chứa 1 Mystery Box với số lượng 1 (box_curations
--     ràng buộc 1 lượt tuyển chọn / đơn). Đơn thuộc gói định kỳ không áp dụng.
-- Dùng trigger để áp dụng cho mọi đường ghi (RPC checkout, subscribe, admin).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public._assert_pet_fits_box(p_pet_id uuid, p_box_type_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_box public.box_types%ROWTYPE;
BEGIN
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id;
  SELECT * INTO v_box FROM public.box_types WHERE id = p_box_type_id;
  IF v_pet.id IS NULL OR v_box.id IS NULL THEN
    RAISE EXCEPTION 'ERR_PET_BOX_MISMATCH';
  END IF;
  IF v_pet.species <> v_box.species THEN
    RAISE EXCEPTION 'ERR_PET_BOX_MISMATCH';
  END IF;
  IF v_box.species = 'dog' AND v_pet.size <> v_box.size THEN
    RAISE EXCEPTION 'ERR_PET_BOX_MISMATCH';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_pet_fits_box(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._assert_pet_fits_box(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._trg_order_items_box_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.box_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Đơn thuộc gói định kỳ: số lượng = số kỳ và bé đã được kiểm khi tạo gói
  -- (trigger trên subscriptions), bé có thể lớn lên đổi size giữa gói nên không kiểm lại.
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id AND subscription_id IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  IF NEW.quantity <> 1 THEN
    RAISE EXCEPTION 'ERR_ONE_BOX_PER_ORDER';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = NEW.order_id AND box_type_id IS NOT NULL AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ERR_ONE_BOX_PER_ORDER';
  END IF;
  PERFORM public._assert_pet_fits_box(NEW.pet_id, NEW.box_type_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_box_guard ON public.order_items;
CREATE TRIGGER trg_order_items_box_guard
  BEFORE INSERT OR UPDATE OF box_type_id, pet_id, quantity ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public._trg_order_items_box_guard();

CREATE OR REPLACE FUNCTION public._trg_subscriptions_box_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_pet_fits_box(NEW.pet_id, NEW.box_type_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_box_guard ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_box_guard
  BEFORE INSERT OR UPDATE OF pet_id, box_type_id ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public._trg_subscriptions_box_guard();
