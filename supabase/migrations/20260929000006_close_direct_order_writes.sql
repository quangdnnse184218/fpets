-- Chặn khách ghi thẳng vào bảng đơn hàng / gói / tuyển chọn / voucher qua REST API.
-- Các policy dưới chỉ kiểm tra chủ sở hữu, nên khách có thể tự INSERT một đơn trạng thái
-- "Đã xác nhận / Đã thanh toán" với giá tùy ý. Mọi thao tác hợp lệ đều đi qua RPC
-- SECURITY DEFINER (checkout_create_order, subscribe_to_box, renew_subscription...) vốn tự
-- tính giá, tồn kho, voucher ở server (AGENTS.md), nên bỏ các policy này không ảnh hưởng luồng mua.

DROP POLICY IF EXISTS orders_guest_insert ON public.orders;
DROP POLICY IF EXISTS orders_own_insert ON public.orders;
-- Cho phép đổi trạng thái sang "Đã hủy" mà không hoàn tồn kho, frontend không dùng
DROP POLICY IF EXISTS orders_own_cancel ON public.orders;

DROP POLICY IF EXISTS order_items_guest_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_own_insert ON public.order_items;

DROP POLICY IF EXISTS subscriptions_own_insert ON public.subscriptions;
DROP POLICY IF EXISTS box_curations_own_insert ON public.box_curations;

DROP POLICY IF EXISTS voucher_usages_guest_insert ON public.voucher_usages;
DROP POLICY IF EXISTS voucher_usages_own_insert ON public.voucher_usages;
