import type { Pet, Product } from "@/types/models";

// Danh sách chuẩn dùng chung cho Pet Quiz, form hồ sơ thú cưng và cảnh báo dị ứng khi mua hàng.

export const AGE_LABEL: Record<Pet["ageGroup"], string> = {
  puppy_kitten: "Dưới 1 tuổi",
  adult: "Trưởng thành",
  senior: "Trên 7 tuổi",
};

export const ALLERGY_OPTIONS = [
  "Thịt gà",
  "Thịt bò",
  "Thịt heo",
  "Cá / hải sản",
  "Trứng",
  "Sữa",
  "Ngũ cốc / lúa mì",
  "Bắp / ngô",
  "Đậu nành",
];

export const PREFERENCE_OPTIONS: Record<Pet["species"], string[]> = {
  dog: ["Gặm xương", "Kéo co", "Bóng nảy", "Đồ chơi có tiếng kêu", "Đồ chơi trí tuệ", "Thịt sấy", "Pate"],
  cat: ["Catnip", "Cần câu lông vũ", "Chuột đồ chơi", "Cào móng", "Pate", "Súp thưởng", "Bánh thưởng giòn"],
};

export const BREED_SUGGESTIONS: Record<Pet["species"], string[]> = {
  dog: ["Chó cỏ", "Poodle", "Phốc sóc (Pomeranian)", "Chihuahua", "Corgi", "Shiba Inu", "Golden Retriever", "Husky", "Alaska", "Becgie", "Pug", "Bull Pháp"],
  cat: ["Mèo ta", "Anh lông ngắn", "Anh lông dài", "Ba Tư", "Scottish Fold", "Munchkin", "Maine Coon", "Ragdoll", "Xiêm"],
};

// Bỏ dấu tiếng Việt để so khớp "Thịt gà" với "ức gà sấy", "chicken"...
export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

// Từ khóa nhận diện từng nhóm dị ứng trong tên + thành phần sản phẩm (so khớp nguyên từ)
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  "thit ga": ["ga", "chicken"],
  "thit bo": ["bo", "beef"],
  "thit heo": ["heo", "lon", "pork"],
  "ca / hai san": ["ca", "hai san", "tom", "cua", "fish", "salmon", "tuna"],
  "trung": ["trung", "egg"],
  "sua": ["sua", "milk"],
  "ngu coc / lua mi": ["ngu coc", "lua mi", "bot mi", "yen mach", "wheat"],
  "bap / ngo": ["bap", "ngo", "corn"],
  "dau nanh": ["dau nanh", "soy"],
};

function keywordsFor(allergy: string): string[] {
  const key = normalizeText(allergy).trim();
  if (ALLERGEN_KEYWORDS[key]) return ALLERGEN_KEYWORDS[key];
  // Nhãn cũ từ Quiz ("Gà", "Hải sản", "Sữa bò"...) hoặc tự nhập: chọn nhóm có từ khóa khớp dài nhất
  // ("sua bo" là dị ứng sữa chứ không phải thịt bò)
  let best: { words: string[]; len: number } | null = null;
  for (const [group, words] of Object.entries(ALLERGEN_KEYWORDS)) {
    for (const w of [group.replace(/^thit\s+/, ""), ...words]) {
      if (new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(key) && (!best || w.length > best.len)) {
        best = { words, len: w.length };
      }
    }
  }
  return best ? best.words : [key.replace(/^thit\s+/, "")];
}

/**
 * Các cặp (bé, dị ứng) khớp với sản phẩm. Chỉ để cảnh báo khách, vẫn cho mua.
 * Dựa trên tên + thành phần sản phẩm vì DB chưa có cột allergens chuẩn hóa.
 */
export function findAllergyConflicts(product: Pick<Product, "name" | "ingredients" | "species">, pets: Pet[]) {
  const haystack = ` ${normalizeText([product.name, ...product.ingredients].join(" "))} `;
  const conflicts: { petName: string; allergy: string }[] = [];
  for (const pet of pets) {
    if (product.species !== "both" && product.species !== pet.species) continue;
    for (const allergy of pet.allergies) {
      const hit = keywordsFor(allergy).some((w) => new RegExp(`[^a-z0-9]${w}[^a-z0-9]`).test(haystack));
      if (hit) conflicts.push({ petName: pet.name, allergy });
    }
  }
  return conflicts;
}
