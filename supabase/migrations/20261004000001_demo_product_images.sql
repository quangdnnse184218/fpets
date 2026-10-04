-- Ảnh TẠM để demo cho 6 sản phẩm chỉ dùng trong hộp (trước đó chưa có ảnh).
-- Ảnh do chủ dự án lấy từ Internet (có ảnh mang nhãn hiệu của hãng khác), CẦN thay bằng ảnh chụp
-- sản phẩm thật trước khi cửa hàng bán chính thức: vào Admin > Sản phẩm > Sửa > Đổi ảnh.
-- File nằm ở public/images/products/. Chỉ gắn khi sản phẩm vẫn chưa có ảnh, không ghi đè ảnh admin đã tải lên.

update public.products set images = array['/images/products/day-dat-phan-quang.jpg']
 where slug = 'day-dat-phan-quang-cho-lon' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/xuong-gam-sach-rang-cho-nho.jpg']
 where slug = 'xuong-gam-sach-rang-cho-nho-5-cay' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/pate-bo-rau-cu.jpg']
 where slug = 'pate-bo-rau-cu-cho-cho-375g' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/yem-dat-di-dao.jpg']
 where slug = 'yem-dat-di-dao-cho-nho' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/ban-cao-mong-carton.jpg']
 where slug = 'ban-cao-mong-giay-carton' and coalesce(array_length(images, 1), 0) = 0;

update public.products set images = array['/images/products/bat-an-chong-gu.jpg']
 where slug = 'bat-an-chong-gu-cho-meo' and coalesce(array_length(images, 1), 0) = 0;
