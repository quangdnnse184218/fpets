-- Khách được XEM (không sửa) các món FPETS đã chọn cho hộp của chính mình, để chấm từng món
-- "Bé thích / Bình thường / Không thích" khi đánh giá (SPEC §8). Trước đây chỉ admin đọc được
-- nên form đánh giá không bao giờ hiện danh sách món.

CREATE POLICY box_curations_own_select ON public.box_curations
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY box_curation_items_own_select ON public.box_curation_items
  FOR SELECT TO authenticated
  USING (box_curation_id IN (
    SELECT c.id FROM public.box_curations c
    JOIN public.orders o ON o.id = c.order_id
    WHERE o.user_id = auth.uid()
  ));
