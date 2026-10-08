-- Doanh thu không tính đơn đã hủy (08/10/2026)
-- Đơn bị hủy sau khi khách đã chuyển khoản vẫn ghi "Đã thanh toán" cho tới khi nhân viên hoàn tiền và bấm
-- "Đã hoàn tiền". Trong lúc đó tiền này không phải doanh thu, nên số liệu Tổng quan bỏ đơn đã hủy.
-- (Biểu đồ Tăng trưởng và trang Báo cáo lọc tương tự ở phía web.)
DO $$
DECLARE
  v_def text;
  v_old constant text := 'WHERE payment_status = ''paid'' AND COALESCE(paid_at, created_at)';
  v_new constant text := 'WHERE payment_status = ''paid'' AND status <> ''da_huy'' AND COALESCE(paid_at, created_at)';
BEGIN
  SELECT pg_get_functiondef('public.admin_dashboard_stats()'::regprocedure) INTO v_def;
  IF (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 2 THEN
    RAISE EXCEPTION 'admin_dashboard_stats: không tìm thấy đúng 2 chỗ tính doanh thu cần sửa';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END;
$$;
