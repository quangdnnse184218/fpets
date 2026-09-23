-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0001_create_enums.sql
-- Mô tả: Khởi tạo tất cả các kiểu dữ liệu ENUM chuẩn theo tài liệu docs/PLAN.md và docs/SPEC.md
-- ==============================================================================

-- 1. Vai trò người dùng trong hệ thống (RBAC)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'admin', 'kho', 'cskh');
  END IF;
END $$;

-- 2. 7 trạng thái đơn hàng theo chuẩn mục 7 của SPEC.md
-- - cho_thanh_toan: Đã tạo đơn, chưa trả tiền online (tự hủy sau 30 phút và hoàn tồn kho)
-- - da_xac_nhan: Đã thanh toán online thành công hoặc đơn COD được nhân viên xác nhận
-- - dang_chuan_bi: Đang được nhân viên kho tuyển chọn / đóng gói
-- - dang_giao: Đã giao cho đơn vị vận chuyển, có mã vận đơn
-- - da_giao: Giao thành công, khách đã nhận hàng, mở quyền đánh giá review
-- - da_huy: Hủy bởi khách hoặc admin, hoàn trả tồn kho và hoàn tiền nếu có
-- - doi_tra: Đang tiếp nhận và xử lý đổi / trả theo chính sách 3 ngày
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'cho_thanh_toan',
      'da_xac_nhan',
      'dang_chuan_bi',
      'dang_giao',
      'da_giao',
      'da_huy',
      'doi_tra'
    );
  END IF;
END $$;

-- 3. 6 trạng thái Subscription theo chuẩn mục 5 của SPEC.md
-- - cho_thanh_toan: Vừa đăng ký gói, chờ thanh toán tiền trả trước
-- - dang_hoat_dong: Đang hoạt động bình thường, giao định kỳ mỗi tháng
-- - tam_dung: Khách tạm dừng (pause 1 hoặc 2 kỳ liên tiếp)
-- - qua_han: Đã giao hết số hộp trả trước, chờ gia hạn (giữ ưu đãi 5 ngày)
-- - het_han: Quá hạn 5 ngày không gia hạn, ngừng giao nhưng giữ hồ sơ pet
-- - da_huy: Khách chủ động hủy, vẫn giao hết số hộp đã trả trước
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'cho_thanh_toan',
      'dang_hoat_dong',
      'tam_dung',
      'qua_han',
      'het_han',
      'da_huy'
    );
  END IF;
END $$;

-- 4. Đợt giao hàng định kỳ trong tháng (Ngày 1-5 hoặc Ngày 15-20)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_schedule') THEN
    CREATE TYPE delivery_schedule AS ENUM ('dau_thang', 'giua_thang');
  END IF;
END $$;

-- 5. Phương thức thanh toán
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('momo', 'vnpay', 'cod');
  END IF;
END $$;

-- 6. Trạng thái thanh toán
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

-- 7. Loài thú cưng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_species') THEN
    CREATE TYPE pet_species AS ENUM ('dog', 'cat');
  END IF;
END $$;

-- 8. Kích cỡ thú cưng (small: < 10kg, large: >= 10kg)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_size') THEN
    CREATE TYPE pet_size AS ENUM ('small', 'large');
  END IF;
END $$;

-- 9. Nhóm tuổi của thú cưng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_age_group') THEN
    CREATE TYPE pet_age_group AS ENUM ('puppy_kitten', 'adult', 'senior');
  END IF;
END $$;

-- 10. Đánh giá món trong Mystery Box của bé
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_feedback_rating') THEN
    CREATE TYPE item_feedback_rating AS ENUM ('like', 'neutral', 'dislike');
  END IF;
END $$;

-- 11. Loại biến động kho hàng
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
    CREATE TYPE inventory_movement_type AS ENUM (
      'import',          -- Nhập hàng từ nhà cung cấp
      'retail_sale',     -- Xuất bán lẻ qua giỏ hàng (hoặc tạm giữ khi đặt hàng)
      'box_curation',    -- Xuất đóng hộp Mystery Box
      'adjustment',      -- Kiểm kê điều chỉnh kho (hỏng, hao hụt)
      'return_restock'   -- Khách trả hàng hoặc đơn hết hạn thanh toán hoàn lại kho
    );
  END IF;
END $$;

-- 12. Loại mã giảm giá / khuyến mãi
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_discount_type') THEN
    CREATE TYPE voucher_discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
  END IF;
END $$;
