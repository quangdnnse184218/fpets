-- ==============================================================================
-- Chạy các tác vụ định kỳ ngay trong database bằng pg_cron thay cho Vercel Cron:
--  - Route /api/cron gọi RPC bằng anon key, nhưng các hàm này đã bị thu hồi quyền
--    của anon (đúng về bảo mật) nên route không còn chạy được.
--  - Vercel gói Hobby chỉ cho cron chạy 1 lần/ngày, không đủ cho việc hủy đơn
--    chờ thanh toán quá 30 phút.
-- Job chạy dưới quyền postgres nên vẫn gọi được các hàm đã thu hồi quyền công khai.
-- Lịch theo giờ UTC (Việt Nam = UTC+7).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('fpets-cancel-expired-orders', '*/10 * * * *', $$SELECT public.cancel_expired_orders()$$);
-- 01:00 giờ VN: sinh đơn box cho các gói đã tới ngày chốt
SELECT cron.schedule('fpets-generate-sub-orders', '0 18 * * *', $$SELECT public.generate_subscription_cycle_orders()$$);
-- 02:00 giờ VN: nhắc gia hạn 7/3/1 ngày trước ngày chốt hộp cuối
SELECT cron.schedule('fpets-sub-reminders', '0 19 * * *', $$SELECT public.send_subscription_reminders()$$);
-- 03:00 giờ VN: gói quá hạn quá 5 ngày chuyển Hết hạn
SELECT cron.schedule('fpets-sub-status-check', '0 20 * * *', $$SELECT public.check_subscription_grace_periods()$$);
