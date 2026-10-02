-- Rà soát giá cho thị trường Việt Nam và làm cho cam kết của hộp khả thi với danh mục:
--  1. Hạ một số giá lẻ đang cao hơn mặt bằng, dùng mức giá lẻ quen thuộc (…9.000₫).
--  2. Box Premium: 7–8 món (trước là 6–7) để đạt giá trị tối thiểu 650.000₫ với mức giá món thực tế.
--  3. Thêm các món chỉ dùng trong hộp (is_retail = false). Trước đó, cộng hết mọi món cho mèo
--     cũng chỉ được 435.000₫ nên không thể chọn đủ hộp Premium 650.000₫, và hộp Tiêu chuẩn cho mèo
--     không đạt 380.000₫. Các món này là dữ liệu mẫu, thay bằng hàng thật trong kho trước khi mở bán.

UPDATE public.products SET price = 45000 WHERE slug = 'bong-cao-su-non-phat-tieng-bip';
UPDATE public.products SET price = 55000, original_price = 65000 WHERE slug = 'banh-quy-canxi-men-tieu-hoa-vi-bo-150g';
UPDATE public.products SET price = 39000 WHERE slug = 'khan-uot-khang-khuan-tram-tra-80-to';
UPDATE public.products SET price = 29000, original_price = 35000 WHERE slug = 'pate-ca-hoi-bi-do-meo-85g';
UPDATE public.products SET price = 39000 WHERE slug = 'vong-co-da-quang-phan-quang-kem-chuong';
UPDATE public.products SET price = 79000, original_price = 99000 WHERE slug = 'luoc-chai-long-nut-bam-tu-day';
UPDATE public.products SET price = 39000 WHERE slug = 'sup-thuong-ca-ngu-tao-bien-4-thanh';
UPDATE public.products SET price = 39000 WHERE slug = 'ca-nhoi-co-meo-catnip-tieng-sot-soat';
UPDATE public.products SET price = 49000 WHERE slug = 'dia-bay-silicon-deo-sieu-nay';

UPDATE public.box_types SET item_count_min = 7, item_count_max = 8 WHERE slug LIKE 'box-premium-%';

INSERT INTO public.products
  (category_id, name, slug, description, price, stock_quantity, low_stock_threshold, species, target_size, target_age, ingredients, images, is_retail, is_box_item, is_active)
VALUES
  -- Chó
  ('c0000000-0000-0000-0000-000000000004', 'Đồ chơi giấu thức ăn cho chó nhỏ', 'do-choi-giau-thuc-an-cho-nho', 'Đồ chơi cao su nhét bánh thưởng, giúp bé ăn chậm và đỡ buồn chán. Cỡ S cho chó dưới 10 kg.', 119000, 30, 5, 'dog', 'small', 'all', ARRAY['Cao su tự nhiên an toàn thực phẩm'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000004', 'Đồ chơi giấu thức ăn cho chó lớn', 'do-choi-giau-thuc-an-cho-lon', 'Đồ chơi cao su dày nhét bánh thưởng, chịu lực gặm. Cỡ L cho chó từ 10 kg.', 149000, 30, 5, 'dog', 'large', 'all', ARRAY['Cao su tự nhiên an toàn thực phẩm'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Xương gặm sạch răng cho chó nhỏ (gói 5 cây)', 'xuong-gam-sach-rang-cho-nho-5-cay', 'Xương gặm giúp làm sạch mảng bám, cỡ nhỏ cho chó dưới 10 kg.', 49000, 40, 5, 'dog', 'small', 'all', ARRAY['Tinh bột khoai tây', 'Bột gạo', 'Bạc hà'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Xương gặm sạch răng cho chó lớn (gói 3 cây)', 'xuong-gam-sach-rang-cho-lon-3-cay', 'Xương gặm cỡ lớn giúp làm sạch mảng bám cho chó từ 10 kg.', 59000, 40, 5, 'dog', 'large', 'all', ARRAY['Tinh bột khoai tây', 'Bột gạo', 'Bạc hà'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000001', 'Pate bò & rau củ cho chó (lon 375g)', 'pate-bo-rau-cu-cho-cho-375g', 'Pate thịt bò với cà rốt và bí đỏ, dùng trộn hạt hoặc ăn trực tiếp.', 45000, 40, 5, 'dog', 'all', 'all', ARRAY['Thịt bò', 'Cà rốt', 'Bí đỏ'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000001', 'Hạt cá hồi & khoai lang cho chó lớn (túi 500g)', 'hat-ca-hoi-khoai-lang-cho-lon-500g', 'Hạt khô vị cá hồi, viên to cho chó từ 10 kg.', 99000, 30, 5, 'dog', 'large', 'all', ARRAY['Cá hồi', 'Khoai lang', 'Đậu Hà Lan'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000003', 'Thú bông phát tiếng cho chó', 'thu-bong-phat-tieng-cho-cho', 'Thú bông có còi bên trong, vải dày chịu cắn.', 59000, 35, 5, 'dog', 'all', 'all', ARRAY['Vải nhung', 'Bông polyester'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000006', 'Yếm dắt đi dạo cho chó nhỏ', 'yem-dat-di-dao-cho-nho', 'Yếm vải lưới thoáng, chỉnh được vòng ngực, kèm dây dắt 1,2 m.', 129000, 25, 5, 'dog', 'small', 'all', ARRAY['Vải lưới thoáng khí', 'Khóa nhựa'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000006', 'Dây dắt phản quang cho chó lớn (1,5 m)', 'day-dat-phan-quang-cho-lon', 'Dây dắt sợi dù bản to có chỉ phản quang, móc kim loại chắc chắn.', 119000, 25, 5, 'dog', 'large', 'all', ARRAY['Sợi dù', 'Móc kim loại'], '{}', false, true, true),
  -- Dùng chung
  ('c0000000-0000-0000-0000-000000000005', 'Dầu tắm hương phấn cho chó mèo (250ml)', 'dau-tam-huong-phan-cho-meo-250ml', 'Dầu tắm dịu nhẹ, giữ lông mềm và thơm lâu.', 89000, 30, 5, 'both', 'all', 'all', ARRAY['Chiết xuất lô hội', 'Vitamin E'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000005', 'Khăn lau tai mắt (hộp 60 miếng)', 'khan-lau-tai-mat-60-mieng', 'Khăn lau dịu nhẹ cho vùng tai và mắt.', 55000, 40, 5, 'both', 'all', 'all', ARRAY['Vải không dệt', 'Nước tinh khiết', 'Chiết xuất hoa cúc'], '{}', false, true, true),
  -- Mèo
  ('c0000000-0000-0000-0000-000000000001', 'Hạt cá ngừ & cá hồi cho mèo (túi 400g)', 'hat-ca-ngu-ca-hoi-meo-400g', 'Hạt khô vị cá cho mèo mọi độ tuổi.', 79000, 30, 5, 'cat', 'all', 'all', ARRAY['Cá ngừ', 'Cá hồi', 'Gạo'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Cá ngừ sấy lạnh cho mèo (túi 40g)', 'ca-ngu-say-lanh-meo-40g', 'Cá ngừ đại dương sấy lạnh, không chất bảo quản.', 69000, 35, 5, 'cat', 'all', 'all', ARRAY['100% Cá ngừ đại dương'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Thịt vịt sấy lạnh cho mèo (túi 40g)', 'thit-vit-say-lanh-meo-40g', 'Thịt vịt sấy lạnh, hợp với bé dị ứng cá hoặc gà.', 69000, 30, 5, 'cat', 'all', 'all', ARRAY['100% Thịt vịt'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000002', 'Bánh thưởng giòn nhân kem cho mèo (gói 60g)', 'banh-thuong-gion-nhan-kem-meo-60g', 'Bánh giòn nhân kem mềm, dùng làm phần thưởng.', 35000, 40, 5, 'cat', 'all', 'all', ARRAY['Thịt gà', 'Bột mì', 'Phô mai'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000004', 'Bàn cào móng giấy carton', 'ban-cao-mong-giay-carton', 'Bàn cào móng giấy ép, kèm gói catnip khô.', 69000, 30, 5, 'cat', 'all', 'all', ARRAY['Giấy carton ép', 'Catnip khô'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000004', 'Đường hầm vải cho mèo', 'duong-ham-vai-cho-meo', 'Đường hầm gấp gọn, có lỗ ló đầu và bóng treo.', 129000, 20, 5, 'cat', 'all', 'all', ARRAY['Vải polyester', 'Khung thép lò xo'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000004', 'Chuột đồ chơi chạy cót', 'chuot-do-choi-chay-cot', 'Chuột lên dây cót tự chạy, kích thích bản năng săn mồi.', 35000, 40, 5, 'cat', 'all', 'all', ARRAY['Nhựa ABS', 'Lông nhân tạo'], '{}', false, true, true),
  ('c0000000-0000-0000-0000-000000000006', 'Bát ăn chống gù cho mèo', 'bat-an-chong-gu-cho-meo', 'Bát gốm nghiêng, đế cao giúp bé ăn không mỏi cổ.', 99000, 25, 5, 'cat', 'all', 'all', ARRAY['Gốm sứ'], '{}', false, true, true)
ON CONFLICT (slug) DO NOTHING;
