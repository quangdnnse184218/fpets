import { Tables } from "@/types/database";
import { Product } from "@/mock/products";
import { BoxType } from "@/mock/boxTypes";
import { Pet } from "@/mock/pets";

// Chuyển dữ liệu thật từ Supabase sang đúng hình dạng (shape) mà UI hiện tại
// đang dùng (vốn được thiết kế theo src/mock/*). Làm vậy để không phải sửa
// lại hàng loạt component hiển thị, trong khi dữ liệu nguồn đã là dữ liệu
// thật 100% từ database, không còn là mock nữa.

const CATEGORY_BUCKET: Record<string, { bucket: Product["category"]; color: string }> = {
  "thuc-an-dinh-duong": { bucket: "food", color: "#FEF7E6" },
  "banh-thuong-snack": { bucket: "food", color: "#FDECC4" },
  "do-choi-van-dong": { bucket: "toy", color: "#E1EDE8" },
  "do-choi-tuong-tac": { bucket: "toy", color: "#FEF7E6" },
  "cham-soc-ve-sinh": { bucket: "accessory", color: "#C2DBD2" },
  "phu-kien-dung-cu": { bucket: "accessory", color: "#E1EDE8" },
};

const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80";

// Dữ liệu seed hiện lưu images dạng path tương đối trong Storage bucket
// (chưa có ảnh thật được upload). next/image bắt buộc src phải là URL tuyệt
// đối hoặc bắt đầu bằng "/", nên chỉ dùng images[0] khi nó thực sự hợp lệ.
export function resolveImageUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return fallback;
}

// Món "tiêu biểu" chỉ là gợi ý minh họa trên trang danh sách box (marketing copy),
// món thật trong từng hộp cụ thể do nhân viên kho tuyển chọn ở admin/box-curation.
const BOX_TYPICAL_ITEMS: Record<string, string[]> = {
  "box-tieu-chuan-cho-nho": ["Snack thịt sấy giòn", "Bánh quy sạch răng", "Bóng phát tiếng kêu nhỏ", "Khăn lau tai mắt dịu nhẹ"],
  "box-tieu-chuan-cho-lon": ["Gặm xương sạch răng size L", "Dây thừng kéo co siêu bền", "Thịt sấy giàu đạm", "Xịt khử mùi chân lông"],
  "box-tieu-chuan-meo": ["Pate cá hồi Na Uy 85g", "Cá nhồi cỏ catnip", "Súp thưởng nắp vặn", "Cần câu lông vũ chuông"],
  "box-premium-cho": ["Thịt bò Úc sấy thăng hoa", "Đồ chơi giấu thức ăn IQ", "Gel dinh dưỡng lông bóng", "Khăn yếm thiết kế riêng", "Bóng nảy siêu đàn hồi"],
  "box-premium-meo": ["Pate tôm hùm thượng hạng", "Cá ngừ đại dương sấy lạnh", "Lược chải nút bấm thông minh", "Đồ chơi chuột chạy pin mini", "Dầu cá Omega 3"],
};

export type ProductWithCategory = Tables<"products"> & {
  categories: Pick<Tables<"categories">, "name" | "slug"> | null;
};

export function productRowToProduct(row: ProductWithCategory): Product {
  const catInfo = row.categories ? CATEGORY_BUCKET[row.categories.slug] : undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: catInfo?.bucket || "accessory",
    categoryLabel: row.categories?.name || "Sản phẩm",
    price: row.price,
    originalPrice: row.original_price || undefined,
    stock: row.stock_quantity,
    species: (row.species as Product["species"]) || "both",
    targetSize: (row.target_size as Product["targetSize"]) || "all",
    targetAge: (row.target_age as Product["targetAge"]) || "all",
    ingredients: row.ingredients || [],
    description: row.description || "",
    rating: 0,
    reviewCount: 0,
    isRetail: row.is_retail,
    isBoxItem: row.is_box_item,
    placeholderColor: catInfo?.color || "#E1EDE8",
    image: resolveImageUrl(row.images?.[0], FALLBACK_PRODUCT_IMAGE),
  };
}

export function boxTypeRowToBoxType(row: Tables<"box_types">): BoxType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    species: row.species,
    size: row.size,
    sizeLabel: row.size === "small" ? "Dưới 10 kg" : "Từ 10 kg trở lên",
    itemCount: `${row.item_count_min}–${row.item_count_max} món`,
    minRetailValue: row.min_retail_value,
    basePrice: row.baseprice,
    description: row.description || "",
    highlight: `Giá trị tối thiểu ${row.min_retail_value.toLocaleString("vi-VN")}₫`,
    imagePlaceholderColor: "#E1EDE8",
    imageUrl: resolveImageUrl(row.images?.[0], FALLBACK_PRODUCT_IMAGE),
    typicalItems: BOX_TYPICAL_ITEMS[row.slug] || [],
  };
}

export function petRowToPet(row: Tables<"pets">): Pet {
  const ageLabelMap: Record<string, string> = {
    puppy_kitten: "Dưới 1 tuổi",
    adult: "Trưởng thành",
    senior: "Trên 7 tuổi",
  };
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed || "",
    weight: row.weight || 0,
    size: row.size,
    ageGroup: row.age_group,
    ageLabel: ageLabelMap[row.age_group] || "",
    gender: (row.gender as Pet["gender"]) || "Đực",
    birthdate: row.birthdate || undefined,
    allergies: row.allergies || [],
    preferences: row.preferences || [],
    notes: row.notes || undefined,
    avatarColor: row.species === "dog" ? "#E1EDE8" : "#FEF7E6",
    receivedBoxesCount: 0,
  };
}
