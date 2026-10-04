-- Ảnh TẠM để demo, đợt 2: thêm 10 sản phẩm chỉ dùng trong hộp (trước đó chưa có ảnh).
-- Ảnh do chủ dự án lấy từ Internet (phần lớn mang nhãn hiệu của hãng khác), CẦN thay bằng ảnh chụp
-- sản phẩm thật trước khi cửa hàng bán chính thức: vào Admin > Sản phẩm > Sửa > Đổi ảnh.
-- File nằm ở public/images/products/. Chỉ gắn khi sản phẩm vẫn chưa có ảnh, không ghi đè ảnh admin đã tải lên.

update public.products set images = array['/images/products/thu-bong-phat-tieng.jpg']
 where slug = 'thu-bong-phat-tieng-cho-cho' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/khan-lau-tai-mat.jpg']
 where slug = 'khan-lau-tai-mat-60-mieng' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/hat-ca-ngu-ca-hoi-meo.jpg']
 where slug = 'hat-ca-ngu-ca-hoi-meo-400g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/ca-ngu-say-lanh-meo.jpg']
 where slug = 'ca-ngu-say-lanh-meo-40g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/banh-thuong-gion-nhan-kem-meo.jpg']
 where slug = 'banh-thuong-gion-nhan-kem-meo-60g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/duong-ham-vai-meo.jpg']
 where slug = 'duong-ham-vai-cho-meo' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/chuot-chay-cot.jpg']
 where slug = 'chuot-do-choi-chay-cot' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/hat-ca-hoi-khoai-lang-cho.jpg']
 where slug = 'hat-ca-hoi-khoai-lang-cho-lon-500g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/dau-tam-cho-meo.jpg']
 where slug = 'dau-tam-huong-phan-cho-meo-250ml' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/do-choi-giau-thuc-an-cho-lon.jpg']
 where slug = 'do-choi-giau-thuc-an-cho-lon' and coalesce(array_length(images, 1), 0) = 0;
