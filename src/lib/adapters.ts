import { Tables } from "@/types/database";
import { Product, BoxType, Pet } from "@/types/models";

// Chuyển dòng dữ liệu Supabase sang kiểu UI trong src/types/models.ts

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

// Món "tiêu biểu" là ví dụ lấy từ danh mục món dùng cho hộp, hiển thị ở trang chi tiết box;
// món thật trong từng hộp cụ thể do nhân viên kho tuyển chọn ở admin/box-curation.
const BOX_TYPICAL_ITEMS: Record<string, string[]> = {
  "box-tieu-chuan-cho-nho": ["Hạt thịt cừu & gạo lứt", "Xương gặm sạch răng", "Bóng cao su phát tiếng", "Khăn lau tai mắt"],
  "box-tieu-chuan-cho-lon": ["Hạt cá hồi & khoai lang", "Xương gặm sạch răng cỡ lớn", "Dây thừng kéo co", "Xịt khử mùi tinh dầu bưởi"],
  "box-tieu-chuan-meo": ["Pate cá hồi & bí đỏ", "Cá nhồi catnip", "Súp thưởng cá ngừ", "Cần câu lông vũ"],
  "box-premium-cho": ["Thịt bò Úc sấy lạnh", "Đồ chơi giấu thức ăn", "Yếm dắt đi dạo", "Dầu tắm hương phấn", "Snack ức gà sấy lạnh"],
  "box-premium-cho-lon": ["Thịt bò Úc sấy lạnh", "Đồ chơi giấu thức ăn cỡ lớn", "Dây dắt phản quang", "Xịt khử mùi tinh dầu bưởi", "Bánh quy canxi vị bò"],
  "box-premium-meo": ["Cá ngừ sấy lạnh", "Đường hầm vải", "Lược chải lông nút bấm", "Bát ăn chống gù", "Súp thưởng cá ngừ"],
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
    sizeLabel: row.species === "cat" ? "Mèo mọi cân nặng" : row.size === "small" ? "Chó nhỏ dưới 10 kg" : "Chó lớn từ 10 kg",
    itemCount: `${row.item_count_min}–${row.item_count_max} món`,
    minRetailValue: row.min_retail_value,
    basePrice: row.baseprice,
    description: row.description || "",
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
    avatarPath: row.avatar_url || undefined,
  };
}
