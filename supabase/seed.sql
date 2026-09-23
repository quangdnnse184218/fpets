-- ==============================================================================
-- FPETS DATABASE MIGRATION - 0004_seed_data.sql
-- Mô tả: Dữ liệu mẫu (Seed Data) chuẩn hóa từ src/mock/ theo đặc tả PLAN.md
-- Quy định: Cột hình ảnh CHỈ lưu đường dẫn text trong bucket quy ước, không lưu nhị phân.
-- ==============================================================================

-- 1. TÀI KHOẢN MẪU (AUTH & PROFILES)
-- Lưu ý: Chèn bản ghi giả lập vào auth.users để đảm bảo khóa ngoại cho public.profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES
      ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@fpets.vn', crypt('Admin@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Quản Trị"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kho@fpets.vn', crypt('Kho@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Thủ Kho Vận Hành"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cskh@fpets.vn', crypt('Cskh@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"CSKH Hỗ Trợ"}', now(), now()),
      ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'khachhang@fpets.vn', crypt('Khach@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nguyễn Văn Quang","phone":"0988123456"}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Tạo hồ sơ tương ứng trong public.profiles
INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@fpets.vn', 'Admin Quản Trị', '0901234567', 'admin', true),
  ('a0000000-0000-0000-0000-000000000002', 'kho@fpets.vn', 'Thủ Kho Vận Hành', '0901234568', 'kho', true),
  ('a0000000-0000-0000-0000-000000000003', 'cskh@fpets.vn', 'CSKH Hỗ Trợ', '0901234569', 'cskh', true),
  ('a0000000-0000-0000-0000-000000000004', 'khachhang@fpets.vn', 'Nguyễn Văn Quang', '0988123456', 'customer', true)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- 2. SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESSES)
INSERT INTO public.addresses (id, user_id, recipient_name, phone, province_city, district, ward, street_address, is_default)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Nguyễn Văn Quang', '0988123456', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng Hậu', 'Số 24 ngõ 105 Xuân Thủy', true)
ON CONFLICT (id) DO NOTHING;

-- 3. HỒ SƠ THÚ CƯNG (PETS - Lấy chuẩn từ src/mock/pets.ts)
INSERT INTO public.pets (id, user_id, name, species, breed, weight, size, age_group, birthdate, gender, avatar_url, allergies, preferences, notes)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Bơ',
    'dog',
    'Golden Retriever',
    18.5,
    'large',
    'adult',
    '2024-04-12',
    'Đực',
    'pet-avatars/a0000000-0000-0000-0000-000000000004/bo-golden.webp',
    ARRAY['Thịt gà', 'Bắp / Ngô'],
    ARRAY['Gặm xương giòn', 'Đồ chơi dây thừng kéo co', 'Thịt cừu sấy'],
    'Bé rất mê gặm đồ vật khi ở nhà một mình, cần đồ chơi dai bền.'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'Miu',
    'cat',
    'Mèo Anh Lông Ngắn',
    4.2,
    'small',
    'puppy_kitten',
    '2025-10-05',
    'Cái',
    'pet-avatars/a0000000-0000-0000-0000-000000000004/miu-aln.webp',
    ARRAY[]::text[],
    ARRAY['Cỏ bạc hà Catnip', 'Pate cá hồi', 'Cần câu lông vũ'],
    'Bé hơi nhát với âm thanh lớn, thích đồ chơi mềm mại.'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. DANH MỤC SẢN PHẨM (CATEGORIES)
INSERT INTO public.categories (id, name, slug, description)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Thức ăn dinh dưỡng', 'thuc-an-dinh-duong', 'Pate, hạt giàu đạm, súp thưởng và sữa dinh dưỡng cho chó mèo'),
  ('c0000000-0000-0000-0000-000000000002', 'Bánh thưởng & Snack', 'banh-thuong-snack', 'Snack sấy thăng hoa, bánh quy sạch răng và bánh gặm canxi'),
  ('c0000000-0000-0000-0000-000000000003', 'Đồ chơi vận động', 'do-choi-van-dong', 'Dây thừng kéo co, bóng cao su nảy, đĩa bay bền chắc'),
  ('c0000000-0000-0000-0000-000000000004', 'Đồ chơi tương tác', 'do-choi-tuong-tac', 'Cần câu lông vũ, cá nhồi catnip, đồ chơi rèn luyện trí tuệ IQ'),
  ('c0000000-0000-0000-0000-000000000005', 'Chăm sóc & Vệ sinh', 'cham-soc-ve-sinh', 'Khăn ướt kháng khuẩn, xịt khử mùi, găng tay chải lông'),
  ('c0000000-0000-0000-0000-000000000006', 'Phụ kiện & Dụng cụ', 'phu-kien-dung-cu', 'Lược chải nút bấm, vòng cổ dạ quang, bát ăn chống gù')
ON CONFLICT (id) DO NOTHING;

-- 5. ĐỊNH NGHĨA LOẠI MYSTERY BOX (BOX_TYPES - Lấy chuẩn từ src/mock/boxTypes.ts)
INSERT INTO public.box_types (id, name, slug, species, size, item_count_min, item_count_max, min_retail_value, basePrice, description, images, is_active)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Box Tiêu chuẩn cho Chó nhỏ',
    'box-tieu-chuan-cho-nho',
    'dog',
    'small',
    4,
    5,
    380000,
    299000,
    'Hộp quà tuyển chọn riêng gồm bánh thưởng dinh dưỡng, đồ chơi kích thước vừa miệng và vật dụng vệ sinh an toàn cho các bé cún nhỏ dưới 10kg.',
    ARRAY['product-images/box-std-dog-small.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Box Tiêu chuẩn cho Chó lớn',
    'box-tieu-chuan-cho-lon',
    'dog',
    'large',
    4,
    5,
    380000,
    299000,
    'Hộp quà dành riêng cho các bé cún lớn từ 10kg trở lên với đồ chơi chịu lực gặm cao, thức ăn bổ sung canxi và phụ kiện chắc chắn.',
    ARRAY['product-images/box-std-dog-large.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Box Tiêu chuẩn cho Mèo',
    'box-tieu-chuan-meo',
    'cat',
    'small',
    4,
    5,
    380000,
    299000,
    'Hộp quà mê hoặc các hoàng thượng với pate thượng hạng, cỏ catnip hữu cơ sấy khô và đồ chơi tương tác rèn phản xạ săn mồi.',
    ARRAY['product-images/box-std-cat.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Box Premium cho Chó',
    'box-premium-cho',
    'dog',
    'small',
    6,
    7,
    650000,
    499000,
    'Phiên bản cao cấp gấp đôi niềm vui: thực phẩm dinh dưỡng nhập khẩu, đồ chơi thông minh trí tuệ và phụ kiện thời trang riêng biệt.',
    ARRAY['product-images/box-prm-dog.webp'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'Box Premium cho Mèo',
    'box-premium-meo',
    'cat',
    'small',
    6,
    7,
    650000,
    499000,
    'Trải nghiệm hoàng gia với pate hữu cơ cao cấp, đồ chơi kích thích não bộ, thảm cào móng mini và lược chải mát-xa lông rụng.',
    ARRAY['product-images/box-prm-cat.webp'],
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 6. CẤU HÌNH GÓI ĐỊNH KỲ (SUBSCRIPTION_PLANS - 1, 3, 6 hộp)
INSERT INTO public.subscription_plans (id, name, cycle_count, discount_percentage, free_shipping, birthday_gift, badge, description, is_active)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'Gói 1 hộp',
    1,
    0.00,
    false,
    false,
    NULL,
    'Nhận 1 hộp thử nghiệm để xem phản ứng và sở thích của bé trước khi cam kết lâu dài.',
    true
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'Gói 3 hộp',
    3,
    10.00,
    true,
    false,
    'Phổ biến nhất',
    'Giao định kỳ 1 hộp mỗi tháng trong 3 tháng. Tiết kiệm 10% và miễn phí vận chuyển toàn bộ kỳ giao.',
    true
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'Gói 6 hộp',
    6,
    15.00,
    true,
    true,
    'Tiết kiệm nhất',
    'Giao định kỳ 6 tháng. Giảm 15%, miễn phí giao hàng và tặng thêm phần quà sinh nhật độc quyền cho bé.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 7. 15 SẢN PHẨM MẪU TRONG KHO (PRODUCTS - Lấy từ src/mock/products.ts)
INSERT INTO public.products (id, category_id, name, slug, description, price, original_price, stock_quantity, low_stock_threshold, species, target_size, target_age, ingredients, images, is_retail, is_box_item, is_active)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Pate Cá Hồi Tươi & Bí Đỏ Hầm Cho Mèo (Lon 85g)',
    'pate-ca-hoi-bi-do-meo-85g',
    'Thịt cá hồi phi lê tươi nguyên chất kết hợp bí đỏ bổ sung chất xơ hòa tan, hỗ trợ tiêu hóa và đào thải búi lông tự nhiên ở mèo.',
    35000, 42000, 48, 5, 'cat', 'all', 'all',
    ARRAY['Cá hồi', 'Bí đỏ', 'Nước hầm xương cá', 'Taurine', 'Vitamin E'],
    ARRAY['product-images/pate-ca-hoi-85g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Snack Ức Gà Sấy Thăng Hoa Giòn Tan (Túi 50g)',
    'snack-uc-ga-say-thang-hoa-50g',
    'Công nghệ sấy lạnh giữ trọn 98% hàm lượng đạm tự nhiên và dưỡng chất, không chất bảo quản, không muối, thơm ngon hấp dẫn.',
    45000, 55000, 62, 10, 'both', 'all', 'all',
    ARRAY['100% Ức gà tươi nguyên miếng'],
    ARRAY['product-images/snack-uc-ga-50g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Bánh Quy Canxi Men Tiêu Hóa Vị Bò (Hũ 150g)',
    'banh-quy-canxi-men-tieu-hoa-vi-bo-150g',
    'Cấu trúc giòn rụm giúp làm sạch mảng bám trên răng cún khi nhai, bổ sung canxi và lợi khuẩn đường ruột ngừa tiêu chảy.',
    65000, 75000, 24, 5, 'dog', 'all', 'adult',
    ARRAY['Bột mì nguyên cám', 'Thịt bò sấy', 'Men vi sinh Probiotic', 'Canxi hữu cơ'],
    ARRAY['product-images/banh-quy-canxi-bo-150g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Hạt Dinh Dưỡng Thịt Cừu & Gạo Lứt Cho Cún Nhỏ (Túi 400g)',
    'hat-dinh-duong-thit-cuu-gao-lut-cun-nho-400g',
    'Hạt kích cỡ nhỏ 6mm được thiết kế riêng cho khung hàm nhỏ của Poodle, Phốc, Pom; công thức lành tính ngừa dị ứng da ngứa đỏ.',
    85000, NULL, 19, 5, 'dog', 'small', 'all',
    ARRAY['Thịt cừu Úc', 'Gạo lứt', 'Bột trứng', 'Dầu cá hồi Omega 3'],
    ARRAY['product-images/hat-cuu-gao-lut-400g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Súp Thưởng Nắp Vặn Cá Ngừ & Tảo Biển (Túi 4 thanh)',
    'sup-thuong-ca-ngu-tao-bien-4-thanh',
    'Dạng sốt sệt mịn bổ sung nước hiệu quả cho mèo lười uống nước, giảm thiểu nguy cơ sỏi bàng quang.',
    40000, NULL, 55, 10, 'cat', 'all', 'all',
    ARRAY['Cá ngừ đại dương', 'Bột tảo Spirulina', 'Nước khoáng tinh khiết', 'FOS'],
    ARRAY['product-images/sup-thuong-ca-ngu.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'Đồ Chơi Dây Thừng Bện Kéo Co Đôi Cotton Tự Nhiên',
    'do-choi-day-thung-keo-co-cotton',
    'Sợi cotton bện xoắn chịu lực kéo mạnh, vừa là món đồ chơi giải tỏa căng thẳng vừa làm sạch kẽ răng khi cún cắn gặm.',
    55000, NULL, 35, 5, 'dog', 'large', 'all',
    ARRAY['100% Sợi bông tự nhiên'],
    ARRAY['product-images/day-thung-cotton.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'Cá Nhồi Cỏ Mèo Catnip Phát Tiếng Sột Soạt Tương Tác',
    'ca-nhoi-co-meo-catnip-tieng-sot-soat',
    'Món đồ chơi kinh điển khiến mọi bé mèo hưng phấn, ôm đạp chân sau thỏa thích và giảm stress hiệu quả khi chủ vắng nhà.',
    40000, NULL, 42, 5, 'cat', 'all', 'all',
    ARRAY['Vải nhung mềm', 'Cỏ bạc hà mèo Catnip', 'Màng nilon tạo âm'],
    ARRAY['product-images/ca-catnip.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'Bóng Cao Su Non Phát Tiếng Bíp Siêu Đàn Hồi Cho Chó',
    'bong-cao-su-non-phat-tieng-bip',
    'Bóng nảy bất quy tắc kích thích bản năng đuổi bắt, phát tiếng kêu bíp vui nhộn khi cắn mà không gây mòn men răng cún.',
    60000, NULL, 28, 5, 'dog', 'all', 'all',
    ARRAY['Cao su tự nhiên an toàn thực phẩm'],
    ARRAY['product-images/bong-cao-su-bip.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'Cần Câu Lông Vũ Chuông Kèm Đồ Rung Cho Mèo',
    'can-cau-long-vu-chuong-meo',
    'Cần câu chuyển động dẻo dai như chim bay thật, kích hoạt phản xạ nhảy vồ săn mồi và giúp mèo vận động ngừa béo phì.',
    35000, NULL, 50, 10, 'cat', 'all', 'all',
    ARRAY['Dây thép dẻo bọc nhựa', 'Lông gà rừng tự nhiên', 'Chuông đồng'],
    ARRAY['product-images/can-cau-long-vu.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000005',
    'Khăn Ướt Kháng Khuẩn Chiết Xuất Tràm Trà & Nha Đam (Gói 80 tờ)',
    'khan-uot-khang-khuan-tram-tra-80-to',
    'Không cồn, không paraben, an toàn khi bé liếm lông. Dùng lau sạch bụi bẩn kẽ móng, viền mắt và hậu môn sau khi đi dạo.',
    45000, NULL, 75, 10, 'both', 'all', 'all',
    ARRAY['Vải không dệt cotton', 'Nước tinh khiết RO', 'Chiết xuất tràm trà', 'Gel nha đam hữu cơ'],
    ARRAY['product-images/khan-uot-tram-tra.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000006',
    'Lược Chải Lông Nút Bấm Tự Đẩy Lông Rụng Thông Minh',
    'luoc-chai-long-nut-bam-tu-day',
    'Bấm nút 1 chạm để đẩy sạch cả mảng lông rụng ra ngoài, đầu kim có hạt massage tăng lưu thông máu dưới da cho bé yêu.',
    85000, 110000, 14, 5, 'both', 'all', 'all',
    ARRAY['Đầu chọc inox bọc đầu tròn bảo vệ da', 'Nhựa ABS kháng khuẩn'],
    ARRAY['product-images/luoc-chai-nut-bam.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000006',
    'Vòng Cổ Dạ Quang Phản Quang Kèm Chuông Báo Lạc (Tăng đơ)',
    'vong-co-da-quang-phan-quang-kem-chuong',
    'Dải phản quang phát sáng rõ trong bóng tối khi có ánh đèn xe rọi vào, khóa an toàn tự nhả khi bé bị mắc kẹt.',
    45000, NULL, 31, 5, 'both', 'small', 'all',
    ARRAY['Sợi dù bọc dải phản quang 3M', 'Khóa nhựa an toàn tự bật khi kẹt'],
    ARRAY['product-images/vong-co-da-quang.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Thịt Bò Úc Sấy Thăng Hoa Giàu Đạm (Túi 60g)',
    'thit-bo-uc-say-thang-hoa-60g',
    'Thịt thăn bò Úc tươi cắt hạt lựu sấy lạnh giữ vị ngọt đậm đà, bổ sung sắt và kẽm hỗ trợ phát triển cơ bắp cho cún.',
    75000, 90000, 40, 5, 'dog', 'all', 'all',
    ARRAY['100% Thịt thăn bò Úc'],
    ARRAY['product-images/thit-bo-say-60g.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'Đĩa Bay Silicon Dẻo Siêu Nảy Ném Xa Cho Chó',
    'dia-bay-silicon-deo-sieu-nay',
    'Chất liệu silicon thực phẩm mềm dẻo không gây đau nướu răng khi cún đớp trên không, bay đầm gió và nổi được trên mặt nước.',
    50000, NULL, 30, 5, 'dog', 'all', 'all',
    ARRAY['Silicon dẻo kháng khuẩn an toàn thực phẩm'],
    ARRAY['product-images/dia-bay-silicon.webp'],
    true, true, true
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000005',
    'Xịt Khử Mùi & Dưỡng Lông Tinh Dầu Bưởi (Chai 150ml)',
    'xit-khu-mui-duong-long-tinh-dau-buoi-150ml',
    'Khử sạch 99% mùi hôi lông và nước tiểu, lưu hương vỏ bưởi tự nhiên thư giãn, tinh dầu giúp lông mềm mượt chống xơ rối.',
    65000, 80000, 25, 5, 'both', 'all', 'all',
    ARRAY['Nước cất vỏ bưởi', 'Nano bạc diệt khuẩn', 'Dầu dừa hữu cơ', 'Vitamin B5'],
    ARRAY['product-images/xit-khu-mui-buoi.webp'],
    true, true, true
  )
ON CONFLICT (id) DO NOTHING;

-- 8. MÃ GIẢM GIÁ & VOUCHER MẪU (VOUCHERS)
INSERT INTO public.vouchers (id, code, voucher_type, discount_value, min_order_value, max_discount, usage_limit_total, usage_limit_per_user, used_count, valid_from, valid_to, scope, is_active)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'FPETSNEW',
    'percentage',
    10,
    200000,
    50000,
    500,
    1,
    12,
    now() - interval '30 days',
    now() + interval '90 days',
    'all',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'FREESHIP',
    'free_shipping',
    30000,
    250000,
    30000,
    1000,
    2,
    85,
    now() - interval '30 days',
    now() + interval '90 days',
    'all',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'REVIEW20K',
    'fixed_amount',
    20000,
    100000,
    NULL,
    1000,
    1,
    45,
    now() - interval '30 days',
    now() + interval '180 days',
    'retail',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 9. GÓI ĐỊNH KỲ MẪU (SUBSCRIPTIONS)
INSERT INTO public.subscriptions (
  id, subscription_code, user_id, pet_id, box_type_id, plan_id,
  total_cycles, remaining_cycles, current_cycle, status, delivery_schedule,
  shipping_address_id, shipping_address_snapshot, total_prepaid_amount,
  next_delivery_date, cutoff_date, paused_cycles_left
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'SUB-2026-8912',
  'a0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000002', -- Bé Miu
  'b0000000-0000-0000-0000-000000000003', -- Box Tiêu chuẩn cho Mèo
  '50000000-0000-0000-0000-000000000002', -- Gói 3 hộp
  3,
  2,
  2,
  'dang_hoat_dong',
  'dau_thang',
  'f0000000-0000-0000-0000-000000000001',
  '{"recipient_name":"Nguyễn Văn Quang","phone":"0988123456","address":"Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội"}'::jsonb,
  807000,
  '2026-10-02',
  '2026-09-25',
  0
)
ON CONFLICT (id) DO NOTHING;

-- 10. ĐƠN HÀNG MẪU (ORDERS & ORDER_ITEMS)
-- 10.1. Đơn 1: Mystery Box đang giao (FPET-20260920-8812)
INSERT INTO public.orders (
  id, order_code, user_id, order_type, subscription_id, cycle_index,
  status, payment_method, payment_status, subtotal, shipping_fee, discount_amount, total_amount,
  recipient_name, recipient_phone, shipping_address, province_city, district, ward,
  tracking_code, paid_at
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'FPET-20260920-8812',
  'a0000000-0000-0000-0000-000000000004',
  'mystery_box',
  NULL,
  NULL,
  'dang_giao',
  'momo',
  'paid',
  299000,
  25000,
  0,
  324000,
  'Nguyễn Văn Quang',
  '0988123456',
  'Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  'Hà Nội',
  'Cầu Giấy',
  'Dịch Vọng Hậu',
  'VNPOST-8812-HN',
  now() - interval '3 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_id, box_type_id, pet_id, product_name_snapshot, unit_price, quantity, total_price)
VALUES (
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  NULL,
  'b0000000-0000-0000-0000-000000000002', -- Box Tiêu chuẩn cho Chó lớn
  'e0000000-0000-0000-0000-000000000001', -- Bé Bơ
  'Box Tiêu chuẩn cho Chó lớn (Dành cho bé Bơ)',
  299000,
  1,
  299000
)
ON CONFLICT (id) DO NOTHING;

-- 10.2. Đơn 2: Bán lẻ đã giao thành công (FPET-20260921-9923)
INSERT INTO public.orders (
  id, order_code, user_id, order_type, status, payment_method, payment_status,
  subtotal, shipping_fee, discount_amount, total_amount,
  recipient_name, recipient_phone, shipping_address, province_city, district, ward,
  paid_at
)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'FPET-20260921-9923',
  'a0000000-0000-0000-0000-000000000004',
  'retail',
  'da_giao',
  'vnpay',
  'paid',
  230000,
  25000,
  20000,
  235000,
  'Nguyễn Văn Quang',
  '0988123456',
  'Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  'Hà Nội',
  'Cầu Giấy',
  'Dịch Vọng Hậu',
  now() - interval '5 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (id, order_id, product_id, product_name_snapshot, unit_price, quantity, total_price)
VALUES
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Snack Ức Gà Sấy Thăng Hoa Giòn Tan (Túi 50g)', 45000, 1, 45000),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'Đồ Chơi Dây Thừng Bện Kéo Co Đôi Cotton Tự Nhiên', 55000, 1, 55000),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000011', 'Lược Chải Lông Nút Bấm Tự Đẩy Lông Rụng Thông Minh', 85000, 1, 85000),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000010', 'Khăn Ướt Kháng Khuẩn Chiết Xuất Tràm Trà (Gói 80 tờ)', 45000, 1, 45000)
ON CONFLICT (id) DO NOTHING;

-- 11. HÀNG CHỜ TUYỂN CHỌN BOX (BOX_CURATIONS & ITEMS)
-- Tuyển chọn mẫu cho đơn hàng 1 (bé Bơ - Không có thịt gà hay bắp)
INSERT INTO public.box_curations (id, order_id, pet_id, box_type_id, status, curated_by, total_retail_value, notes, created_at, curated_at)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001', -- Bé Bơ
  'b0000000-0000-0000-0000-000000000002', -- Box Chó lớn
  'packed',
  'a0000000-0000-0000-0000-000000000002', -- Thủ kho
  380000,
  'Đã kiểm tra kỹ: loại trừ 100% thành phần gà và bắp theo đúng hồ sơ dị ứng của bé Bơ.',
  now() - interval '3 days',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Các món đã tuyển chọn vào hộp của bé Bơ
INSERT INTO public.box_curation_items (id, box_curation_id, product_id, quantity, retail_price)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 1, 65000), -- Bánh quy bò
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 1, 85000), -- Hạt thịt cừu
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 1, 55000), -- Dây thừng kéo co
  ('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 1, 60000), -- Bóng bíp
  ('31000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000011', 1, 85000), -- Lược chải thông minh
  ('31000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 1, 45000)  -- Khăn ướt tràm trà
ON CONFLICT (id) DO NOTHING;

-- 12. PHẢN HỒI MÓN CỦA BÉ (PET_ITEM_FEEDBACK)
INSERT INTO public.pet_item_feedback (id, pet_id, product_id, box_curation_id, rating, notes)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', 'like', 'Bé Bơ rất thích chơi kéo co với sợi thừng này.'),
  ('40000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'like', 'Bánh quy bò giòn rụm bé ăn ngon lành không bị ngứa.')
ON CONFLICT (id) DO NOTHING;

-- 13. ĐÁNH GIÁ ĐƠN HÀNG (REVIEWS)
INSERT INTO public.reviews (id, order_id, user_id, rating, comment, images, is_rewarded, status, admin_reply, admin_reply_at)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004',
  5,
  'Giao hàng nhanh, đồ chơi dây thừng rất chắc chắn, bé cún nhà mình cắn cả ngày không đứt. Lược chải bấm phát là ra cả búi lông rất tiện!',
  ARRAY['review-photos/a0000000-0000-0000-0000-000000000004/review-unbox-1.webp'],
  true,
  'published',
  'Dạ FPETS cảm ơn bạn và bé Bơ nhiều ạ! Chúc bé luôn khỏe mạnh và thích mê các món quà nhé ạ.',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 14. THÔNG BÁO CHO NGƯỜI DÙNG (NOTIFICATIONS)
INSERT INTO public.notifications (id, user_id, title, message, type, link, is_read)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Đơn hàng đang trên đường giao!',
    'Đơn hàng FPET-20260920-8812 đang được chuyển phát nhanh bởi VNPost (Mã: VNPOST-8812-HN).',
    'order',
    '/my-account/orders',
    false
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'Mystery Box kỳ 2 của bé Miu đang chuẩn bị',
    'Hệ thống đang bắt đầu tuyển chọn món cho kỳ giao đầu tháng 10. Bạn có thể cập nhật sở thích bé trước ngày chốt 25/09.',
    'subscription',
    '/my-account/subscriptions',
    true
  )
ON CONFLICT (id) DO NOTHING;
