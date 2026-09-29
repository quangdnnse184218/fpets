import { Tables } from "@/types/database";
import { Product } from "@/mock/products";
import { BoxType } from "@/mock/boxTypes";
import { Pet } from "@/mock/pets";

// Chuyển dữ liệu thật từ Supabase sang đúng hình dạng (shape) mà UI hiện tại
// đang dùng (vốn được thiết kế theo src/mock/*). Làm vậy để không phải sửa
// lại hàng loạt component hiển thị, trong khi dữ liệu nguồn đã là dữ liệu
// thật 100% từ database, không còn là mock nữa.

// Shop chỉ hiển thị 3 nhóm danh mục (khớp bộ lọc); danh mục chi tiết trong DB gom về 3 nhóm này
export const CATEGORY_LABEL: Record<Product["category"], string> = {
  food: "Thức ăn & bánh thưởng",
  toy: "Đồ chơi",
  accessory: "Chăm sóc & phụ kiện",
};

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
  "box-tieu-chuan-meo": ["Pate cá hồi & bí đỏ", "Cá nhồi catnip", "Súp thưởng cá ngừ", "Cần câu lông vũ"],
  "box-premium-cho": ["Thịt bò Úc sấy lạnh", "Đồ chơi giấu thức ăn", "Bóng cao su phát tiếng", "Khăn yếm cho cún", "Snack ức gà sấy lạnh"],
  "box-premium-cho-lon": ["Thịt bò Úc sấy lạnh", "Dây thừng kéo co cỡ lớn", "Đồ chơi giấu thức ăn", "Xịt khử mùi tinh dầu bưởi", "Bánh quy canxi vị bò"],
  "box-premium-meo": ["Pate cá hồi & bí đỏ", "Cá ngừ sấy lạnh", "Lược chải lông nút bấm", "Chuột đồ chơi chạy pin", "Súp thưởng cá ngừ"],
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
    categoryLabel: CATEGORY_LABEL[catInfo?.bucket || "accessory"],
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
    // Box mèo không chia size nên không hiện nhãn cân nặng
    sizeLabel: row.species === "cat" ? "Mọi bé mèo" : row.size === "small" ? "Chó dưới 10 kg" : "Chó từ 10 kg",
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
