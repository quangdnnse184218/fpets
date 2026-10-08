-- QUYỀN CỦA VAI TRÒ STAFF (nhân viên vận hành)
--
-- Staff dùng các module vận hành: Đơn hàng (cập nhật trạng thái, mã vận đơn, xác nhận COD, đổi/trả, hủy đơn),
-- Hàng chờ tuyển chọn box, Tồn kho (nhập/xuất), Gói định kỳ (tạm dừng, tiếp tục, hủy hộ khách),
-- Hồ sơ thú cưng, Đánh giá & góp ý.
-- Chỉ admin: thống kê doanh thu, sửa sản phẩm/giá/danh mục, loại Mystery Box, voucher,
-- khóa tài khoản khách và cấp/thu hồi vai trò staff.
--
-- Các policy và RPC vận hành vốn kiểm tra public.is_staff() (trước đây tương đương is_admin()),
-- nên chỉ cần mở is_staff() cho staff rồi thu hẹp lại những chỗ chỉ dành cho admin.

-- 1. is_staff(): admin hoặc staff đang hoạt động
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
  );
$$;

-- 2. Sản phẩm, danh mục: staff chỉ đọc (kể cả món đang ẩn, để xem tồn kho); sửa giá, thông tin chỉ admin.
--    Staff đổi số tồn qua RPC adjust_product_stock (SECURITY DEFINER), không ghi thẳng bảng products.
DROP POLICY IF EXISTS "products_staff_all" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_staff_select" ON public.products;
CREATE POLICY "products_staff_select" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "categories_staff_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Voucher: staff xem được (tra mã khách dùng trong đơn), tạo/sửa/tắt chỉ admin
DROP POLICY IF EXISTS "vouchers_staff_all" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_admin_all" ON public.vouchers;
CREATE POLICY "vouchers_admin_all" ON public.vouchers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vouchers_staff_select" ON public.vouchers;
CREATE POLICY "vouchers_staff_select" ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4. Góp ý / liên hệ của khách nằm trong module Đánh giá & góp ý: staff đọc và đánh dấu đã xử lý, xóa chỉ admin
DROP POLICY IF EXISTS feedback_admin_select ON public.feedback_messages;
DROP POLICY IF EXISTS feedback_staff_select ON public.feedback_messages;
CREATE POLICY feedback_staff_select ON public.feedback_messages
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS feedback_admin_update ON public.feedback_messages;
DROP POLICY IF EXISTS feedback_staff_update ON public.feedback_messages;
CREATE POLICY feedback_staff_update ON public.feedback_messages
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 5. Số liệu Tổng quan có doanh thu: chỉ admin. Thay đúng câu kiểm tra quyền trong hàm hiện có.
DO $$
DECLARE
  v_def text;
  v_old constant text := 'IF NOT public.is_staff() THEN RAISE EXCEPTION ''ERR_FORBIDDEN''; END IF;';
  v_new constant text := 'IF NOT public.is_admin() THEN RAISE EXCEPTION ''ERR_FORBIDDEN''; END IF;';
BEGIN
  SELECT pg_get_functiondef('public.admin_dashboard_stats()'::regprocedure) INTO v_def;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'admin_dashboard_stats: không tìm thấy câu kiểm tra quyền cần thay';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END;
$$;

-- 6. Admin cấp / thu hồi vai trò staff (trang Khách hàng). Không đổi được tài khoản admin hay chính mình.
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role public.user_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.user_role;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN';
  END IF;
  IF p_role NOT IN ('customer', 'staff') THEN
    RAISE EXCEPTION 'ERR_INVALID_ROLE';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'ERR_CANNOT_CHANGE_SELF';
  END IF;

  SELECT role INTO v_current FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_USER_NOT_FOUND';
  END IF;
  IF v_current = 'admin' THEN
    RAISE EXCEPTION 'ERR_CANNOT_CHANGE_ADMIN';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  RETURN jsonb_build_object('role', p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.user_role) TO authenticated;
