-- Siết quyền gọi hàm theo cảnh báo của Supabase Security Advisor.
-- Các hàm này đã tự kiểm tra quyền bên trong; đây là lớp chặn thêm ở tầng GRANT.

DO $$
DECLARE
  r record;
BEGIN
  -- 1. Hàm trigger: không ai được gọi trực tiếp qua /rest/v1/rpc (trigger vẫn chạy bình thường)
  FOR r IN
    SELECT p.oid::regprocedure AS fn FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('auto_confirm_user', 'handle_new_user', 'handle_updated_at')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
  END LOOP;

  -- 2. Hàm cần đăng nhập (khách của mình hoặc admin): bỏ quyền của anon
  FOR r IN
    SELECT p.oid::regprocedure AS fn FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'approve_box_curation', 'cancel_order_by_staff', 'confirm_cod_order',
        'mark_order_delivered', 'mark_order_shipping',
        'cancel_subscription', 'pause_subscription', 'resume_subscription',
        'request_order_return', 'subscribe_to_box', 'renew_subscription', 'get_user_role'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.fn);
  END LOOP;

  -- 3. Cố định search_path để không bị đánh tráo schema khi chạy SECURITY DEFINER
  FOR r IN
    SELECT p.oid::regprocedure AS fn FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('is_admin', 'is_staff', 'get_user_role', 'handle_new_user',
                        'auto_confirm_user', 'handle_updated_at', 'lookup_order')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.fn);
  END LOOP;
END $$;

-- Giữ nguyên cho khách chưa đăng nhập: checkout_create_order (mua lẻ không cần tài khoản),
-- lookup_order (tra cứu đơn), confirm_order_payment (trang thanh toán), is_admin/is_staff (dùng trong RLS).
