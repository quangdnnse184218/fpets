-- Dọn nội dung catalog cho đợt mở bán:
-- 1. Đủ 3 phiên bản Box Premium theo SPEC §3 (chó nhỏ, chó lớn, mèo).
-- 2. Tên box/sản phẩm gọn, viết hoa chữ đầu; bỏ các tuyên bố khó chứng minh (99%, 98%, "hoàng gia"...).
-- 3. Sửa phản hồi mẫu của admin có ngày trước ngày đánh giá.

-- 1. Box Premium cho chó lớn + đổi tên box Premium chó hiện có thành "chó nhỏ"
UPDATE public.box_types SET name = 'Box Premium cho Chó nhỏ' WHERE slug = 'box-premium-cho';

INSERT INTO public.box_types (name, slug, species, size, item_count_min, item_count_max, min_retail_value, baseprice, description, images, is_active)
SELECT 'Box Premium cho Chó lớn', 'box-premium-cho-lon', 'dog', 'large', 6, 7, 650000, 499000,
       'Đồ ăn nhập khẩu, đồ chơi trí tuệ chịu lực gặm và phụ kiện chắc chắn cho các bé cún từ 10 kg.',
       ARRAY['/images/boxes/box-prm-dog-large.jpg'], true
WHERE NOT EXISTS (SELECT 1 FROM public.box_types WHERE slug = 'box-premium-cho-lon');

UPDATE public.box_types SET description = CASE slug
  WHEN 'box-tieu-chuan-cho-nho' THEN 'Bánh thưởng, đồ chơi vừa miệng và một món chăm sóc, chọn cho các bé cún dưới 10 kg.'
  WHEN 'box-tieu-chuan-cho-lon' THEN 'Đồ chơi chịu lực gặm, đồ ăn bổ sung và phụ kiện chắc chắn cho các bé cún từ 10 kg.'
  WHEN 'box-tieu-chuan-meo' THEN 'Pate, bánh thưởng và đồ chơi rèn phản xạ săn mồi cho các bé mèo.'
  WHEN 'box-premium-cho' THEN 'Nhiều món hơn: đồ ăn nhập khẩu, đồ chơi trí tuệ và phụ kiện, cho các bé cún dưới 10 kg.'
  WHEN 'box-premium-meo' THEN 'Pate và snack nhập khẩu, đồ chơi trí tuệ cùng một món chăm sóc lông cho các bé mèo.'
  ELSE description END
WHERE slug IN ('box-tieu-chuan-cho-nho', 'box-tieu-chuan-cho-lon', 'box-tieu-chuan-meo', 'box-premium-cho', 'box-premium-meo');

-- 2. Tên sản phẩm ngắn gọn (chi tiết để ở mô tả)
UPDATE public.products SET name = CASE slug
  WHEN 'banh-quy-canxi-men-tieu-hoa-vi-bo-150g' THEN 'Bánh quy canxi vị bò (hũ 150g)'
  WHEN 'snack-uc-ga-say-thang-hoa-50g' THEN 'Snack ức gà sấy lạnh (túi 50g)'
  WHEN 'thit-bo-uc-say-thang-hoa-60g' THEN 'Thịt bò Úc sấy lạnh (túi 60g)'
  WHEN 'khan-uot-khang-khuan-tram-tra-80-to' THEN 'Khăn ướt tràm trà cho thú cưng (80 tờ)'
  WHEN 'xit-khu-mui-duong-long-tinh-dau-buoi-150ml' THEN 'Xịt khử mùi tinh dầu bưởi (150ml)'
  WHEN 'ca-nhoi-co-meo-catnip-tieng-sot-soat' THEN 'Cá nhồi catnip cho mèo'
  WHEN 'can-cau-long-vu-chuong-meo' THEN 'Cần câu lông vũ cho mèo'
  WHEN 'bong-cao-su-non-phat-tieng-bip' THEN 'Bóng cao su phát tiếng cho chó'
  WHEN 'dia-bay-silicon-deo-sieu-nay' THEN 'Đĩa bay silicon cho chó'
  WHEN 'do-choi-day-thung-keo-co-cotton' THEN 'Dây thừng kéo co cotton'
  WHEN 'luoc-chai-long-nut-bam-tu-day' THEN 'Lược chải lông nút bấm'
  WHEN 'vong-co-da-quang-phan-quang-kem-chuong' THEN 'Vòng cổ phản quang kèm chuông'
  WHEN 'hat-dinh-duong-thit-cuu-gao-lut-cun-nho-400g' THEN 'Hạt thịt cừu & gạo lứt cho chó nhỏ (400g)'
  WHEN 'pate-ca-hoi-bi-do-meo-85g' THEN 'Pate cá hồi & bí đỏ cho mèo (lon 85g)'
  WHEN 'sup-thuong-ca-ngu-tao-bien-4-thanh' THEN 'Súp thưởng cá ngừ cho mèo (4 thanh)'
  ELSE name END;

UPDATE public.products SET description = 'Công nghệ sấy lạnh giữ phần lớn đạm và dưỡng chất tự nhiên. Không chất bảo quản, không muối.'
WHERE slug = 'snack-uc-ga-say-thang-hoa-50g';
UPDATE public.products SET description = 'Khử mùi hôi lông và nước tiểu, lưu hương vỏ bưởi nhẹ nhàng; tinh dầu giúp lông mềm, bớt xơ rối.'
WHERE slug = 'xit-khu-mui-duong-long-tinh-dau-buoi-150ml';

-- 3. Phản hồi mẫu: ngày phản hồi phải sau ngày đánh giá, không nhắc tên bé khách không nêu
UPDATE public.reviews
SET admin_reply = 'FPETS cảm ơn bạn đã dành thời gian đánh giá. Chúc bé luôn khỏe và vui với các món quà nhé!',
    admin_reply_at = created_at + interval '1 day'
WHERE admin_reply IS NOT NULL AND admin_reply_at < created_at;
