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

// Từ khóa nhận diện từng nhóm dị ứng trong tên + thành phần sản phẩm.
// Giữ nguyên dấu tiếng Việt và so khớp nguyên từ: bỏ dấu thì "lon" (lon pate) trùng "lợn",
// "cà rốt" trùng "cá", "bơ" trùng "bò" và khách bị cảnh báo sai.
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  "thit ga": ["gà", "chicken"],
  "thit bo": ["bò", "beef"],
  "thit heo": ["heo", "lợn", "pork"],
  "ca / hai san": ["cá", "hải sản", "tôm", "cua", "mực", "fish", "salmon", "tuna"],
  "trung": ["trứng", "egg"],
  "sua": ["sữa", "phô mai", "milk", "cheese"],
  "ngu coc / lua mi": ["ngũ cốc", "lúa mì", "bột mì", "yến mạch", "wheat"],
  "bap / ngo": ["bắp", "ngô", "corn"],
  "dau nanh": ["đậu nành", "soy"],
};

const lowerNfc = (text: string) => text.normalize("NFC").toLowerCase();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Nguyên từ theo chữ cái Unicode (có dấu), không dùng \b vì \b chỉ hiểu chữ không dấu
const wholeWord = (word: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "u");

function keywordsFor(allergy: string): string[] {
  const key = normalizeText(allergy).trim();
  if (ALLERGEN_KEYWORDS[key]) return ALLERGEN_KEYWORDS[key];
  // Nhãn cũ từ Quiz ("Gà", "Hải sản", "Sữa bò"...) hoặc tự nhập: chọn nhóm có từ khóa khớp dài nhất
  // ("sữa bò" là dị ứng sữa chứ không phải thịt bò)
  const label = lowerNfc(allergy);
  let best: { words: string[]; len: number } | null = null;
  for (const words of Object.values(ALLERGEN_KEYWORDS)) {
    for (const w of words) {
      if (wholeWord(w).test(label) && (!best || w.length > best.len)) best = { words, len: w.length };
    }
  }
  // Dị ứng tự nhập không thuộc nhóm nào ("Thịt vịt"): dò đúng từ đó, bỏ chữ "thịt" ở đầu
  return best ? best.words : [label.trim().replace(/^thịt\s+/, "")];
}

/**
 * Sản phẩm có chứa nhóm dị ứng này không (so theo tên + thành phần, nguyên từ, có dấu).
 * Dùng chung cho cảnh báo khách khi mua và cho màn hình tuyển chọn hộp của admin.
 * Dựa trên tên + thành phần sản phẩm vì DB chưa có cột allergens chuẩn hóa.
 */
export function productHasAllergen(product: { name: string; ingredients: string[] | null }, allergy: string): boolean {
  const haystack = lowerNfc([product.name, ...(product.ingredients || [])].join(" | "));
  return keywordsFor(allergy).some((w) => w !== "" && wholeWord(w).test(haystack));
}

/** Các cặp (bé, dị ứng) khớp với sản phẩm. Chỉ để cảnh báo khách, vẫn cho mua. */
export function findAllergyConflicts(product: Pick<Product, "name" | "ingredients" | "species">, pets: Pet[]) {
  const conflicts: { petName: string; allergy: string }[] = [];
  for (const pet of pets) {
    if (product.species !== "both" && product.species !== pet.species) continue;
    for (const allergy of pet.allergies) {
      if (productHasAllergen(product, allergy)) conflicts.push({ petName: pet.name, allergy });
    }
  }
  return conflicts;
}
