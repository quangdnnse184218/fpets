-- Ảnh TẠM để demo, đợt 3: 3 sản phẩm cuối cùng còn thiếu ảnh. Sau đợt này mọi sản phẩm đều có ảnh.
-- Ảnh do chủ dự án lấy từ Internet (có ảnh mang nhãn hiệu của hãng khác), CẦN thay bằng ảnh chụp
-- sản phẩm thật trước khi cửa hàng bán chính thức: vào Admin > Sản phẩm > Sửa > Đổi ảnh.
-- File nằm ở public/images/products/. Chỉ gắn khi sản phẩm vẫn chưa có ảnh, không ghi đè ảnh admin đã tải lên.

update public.products set images = array['/images/products/thit-vit-say-lanh-meo.jpg']
 where slug = 'thit-vit-say-lanh-meo-40g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/xuong-gam-sach-rang-cho-lon.jpg']
 where slug = 'xuong-gam-sach-rang-cho-lon-3-cay' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/do-choi-giau-thuc-an-cho-nho.jpg']
 where slug = 'do-choi-giau-thuc-an-cho-nho' and coalesce(array_length(images, 1), 0) = 0;
