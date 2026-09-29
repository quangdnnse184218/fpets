-- Siết quyền Storage:
-- 1. product-images: chỉ admin được tải lên / sửa / xóa. Trước đây còn 3 policy cũ cho phép mọi
--    tài khoản đã đăng nhập ghi và xóa ảnh sản phẩm (policy Postgres cộng dồn theo OR).
-- 2. Bỏ các policy trùng lặp với policy khác cùng tác dụng.

DROP POLICY IF EXISTS product_images_auth_write ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_update ON storage.objects;
DROP POLICY IF EXISTS product_images_auth_delete ON storage.objects;

-- Trùng với pet_avatars_owner_* (owner_or_staff_read đã bao gồm quyền đọc của chủ)
DROP POLICY IF EXISTS pet_avatars_own_read ON storage.objects;
DROP POLICY IF EXISTS pet_avatars_own_write ON storage.objects;
DROP POLICY IF EXISTS pet_avatars_own_update ON storage.objects;
DROP POLICY IF EXISTS pet_avatars_own_delete ON storage.objects;

-- Trùng với review_photos_owner_insert / review_photos_delete
DROP POLICY IF EXISTS review_photos_own_write ON storage.objects;
DROP POLICY IF EXISTS review_photos_own_delete ON storage.objects;
