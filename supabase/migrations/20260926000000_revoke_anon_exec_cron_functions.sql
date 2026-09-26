-- Thu hồi quyền EXECUTE của anon/authenticated trên các hàm cron nội bộ.
--
-- 4 hàm dưới đây là SECURITY DEFINER, được tạo để chỉ chạy từ route Next.js
-- /api/cron/* (route kiểm tra header Authorization: Bearer ${CRON_SECRET} rồi
-- mới gọi bằng service-role client). Vì Postgres mặc định cấp EXECUTE cho
-- PUBLIC khi tạo hàm, PostgREST lộ chúng tại /rest/v1/rpc/<fn_name> và bất kỳ
-- ai (kể cả chưa đăng nhập, dùng anon key) đều có thể gọi trực tiếp, bỏ qua
-- hoàn toàn CRON_SECRET. Supabase security advisor báo đây là finding
-- anon_security_definer_function_executable / authenticated_security_definer_function_executable.
--
-- Giữ lại quyền cho service_role (và postgres) vì route cron dùng service-role
-- client để gọi các hàm này.
revoke execute on function public.cancel_expired_orders() from anon, authenticated;
revoke execute on function public.generate_subscription_cycle_orders() from anon, authenticated;
revoke execute on function public.send_subscription_reminders() from anon, authenticated;
revoke execute on function public.check_subscription_grace_periods() from anon, authenticated;
