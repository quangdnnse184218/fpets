import type { Pet, Product } from "@/types/models";

// Danh sách chuẩn dùng chung cho Pet Quiz, form hồ sơ thú cưng và cảnh báo dị ứng khi mua hàng.

export const AGE_LABEL: Record<Pet["ageGroup"], string> = {
  puppy_kitten: "Dưới 1 tuổi",
  adult: "Trưởng thành",
  senior: "Trên 7 tuổi",
};

// Cân nặng hợp lệ theo loài, dùng chung cho Pet Quiz và form hồ sơ
export const weightRange = (species: Pet["species"]) => (species === "dog" ? { min: 0.5, max: 90 } : { min: 0.3, max: 15 });

// Chó chia theo cân nặng: dưới 10 kg là size nhỏ, từ 10 kg là size lớn. Mèo dùng chung một loại hộp.
export const sizeFromWeight = (species: Pet["species"], weight: number): Pet["size"] =>
  species === "dog" && weight >= 10 ? "large" : "small";

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

// Cụm từ có chứa từ khóa nhưng là thứ khác hẳn: "sữa bò" là sữa chứ không phải thịt bò,
// "bắp cải" là rau, "bắp bò" là thịt bò chứ không phải bắp (ngô). Bỏ các cụm này trước khi dò nhóm tương ứng.
const NOT_THIS_ALLERGEN: Record<string, string[]> = {
  "thit bo": ["sữa bò"],
  "bap / ngo": ["bắp cải", "bắp bò"],
};

const lowerNfc = (text: string) => text.normalize("NFC").toLowerCase();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Nguyên từ theo chữ cái Unicode (có dấu), không dùng \b vì \b chỉ hiểu chữ không dấu
const wholeWord = (word: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "u");

type AllergenRule = { words: string[]; ignore: string[] };

function ruleFor(allergy: string): AllergenRule {
  const key = normalizeText(allergy).trim();
  if (ALLERGEN_KEYWORDS[key]) return { words: ALLERGEN_KEYWORDS[key], ignore: NOT_THIS_ALLERGEN[key] || [] };
  // Nhãn cũ từ Quiz ("Gà", "Hải sản", "Sữa bò"...) hoặc tự nhập: chọn nhóm có từ khóa khớp dài nhất
  // ("sữa bò" là dị ứng sữa chứ không phải thịt bò)
  const label = lowerNfc(allergy);
  let best: { group: string; len: number } | null = null;
  for (const [group, words] of Object.entries(ALLERGEN_KEYWORDS)) {
    for (const w of words) {
      if (wholeWord(w).test(label) && (!best || w.length > best.len)) best = { group, len: w.length };
    }
  }
  if (best) return { words: ALLERGEN_KEYWORDS[best.group], ignore: NOT_THIS_ALLERGEN[best.group] || [] };
  // Dị ứng tự nhập không thuộc nhóm nào ("Thịt vịt"): dò đúng từ đó, bỏ chữ "thịt" ở đầu
  return { words: [label.trim().replace(/^thịt\s+/, "")], ignore: [] };
}

/**
 * Sản phẩm có chứa nhóm dị ứng này không (so theo tên + thành phần, nguyên từ, có dấu).
 * Dùng chung cho cảnh báo khách khi mua và cho màn hình tuyển chọn hộp của admin.
 * Dựa trên tên + thành phần sản phẩm vì DB chưa có cột allergens chuẩn hóa.
 *
 * Dị ứng khai trong hồ sơ bé là dị ứng thực phẩm nên chỉ xét món bé ăn vào (thức ăn, bánh thưởng).
 * Đồ chơi, phụ kiện, đồ chăm sóc không xét: tên và chất liệu của chúng hay trùng chữ với thực phẩm
 * ("Cá nhồi catnip" là đồ chơi hình con cá, "Lông gà rừng" là chất liệu cần câu) nhưng bé không ăn.
 */
export function productHasAllergen(product: Pick<Product, "name" | "ingredients" | "isEdible">, allergy: string): boolean {
  if (!product.isEdible) return false;
  const { words, ignore } = ruleFor(allergy);
  let haystack = lowerNfc([product.name, ...(product.ingredients || [])].join(" | "));
  for (const phrase of ignore) haystack = haystack.replace(new RegExp(wholeWord(phrase).source, "gu"), " ");
  return words.some((w) => w !== "" && wholeWord(w).test(haystack));
}

/** Các cặp (bé, dị ứng) khớp với sản phẩm. Chỉ để cảnh báo khách, vẫn cho mua. */
export function findAllergyConflicts(product: Pick<Product, "name" | "ingredients" | "species" | "isEdible">, pets: Pet[]) {
  const conflicts: { petName: string; allergy: string }[] = [];
  for (const pet of pets) {
    if (product.species !== "both" && product.species !== pet.species) continue;
    for (const allergy of pet.allergies) {
      if (productHasAllergen(product, allergy)) conflicts.push({ petName: pet.name, allergy });
    }
  }
  return conflicts;
}

// Từ khóa nhận ra món hợp với từng sở thích khai trong hồ sơ, so trên tên món (nguyên từ, có dấu).
// Sở thích về đồ chơi chỉ so với đồ chơi, sở thích về món ăn chỉ so với món ăn:
// "chuông" trên vòng cổ không phải đồ chơi có tiếng kêu. Catnip so thêm cả chất liệu vì thường không nằm trong tên.
const PREFERENCE_RULES: Record<string, { words: string[]; category?: Product["category"]; alsoIngredients?: boolean }> = {
  "gam xuong": { words: ["xương", "gặm"] },
  "keo co": { words: ["kéo co", "dây thừng"], category: "toy" },
  "bong nay": { words: ["bóng"], category: "toy" },
  "do choi co tieng keu": { words: ["phát tiếng", "tiếng kêu", "chuông"], category: "toy" },
  "do choi tri tue": { words: ["trí tuệ", "giấu thức ăn"], category: "toy" },
  "thit say": { words: ["sấy"], category: "food" },
  "pate": { words: ["pate"], category: "food" },
  "catnip": { words: ["catnip"], alsoIngredients: true },
  "can cau long vu": { words: ["cần câu", "lông vũ"], category: "toy" },
  "chuot do choi": { words: ["chuột"], category: "toy" },
  "cao mong": { words: ["cào móng"] },
  "sup thuong": { words: ["súp"], category: "food" },
  "banh thuong gion": { words: ["bánh thưởng", "bánh quy"], category: "food" },
};

/** Món này có hợp với một sở thích bé đã khai không. Dùng để ưu tiên món khi đề xuất hộp cho admin. */
export function productMatchesPreference(product: Pick<Product, "name" | "ingredients" | "category">, preference: string): boolean {
  // Sở thích tự nhập không thuộc danh sách chuẩn: dò đúng cụm đó trong tên món
  const rule = PREFERENCE_RULES[normalizeText(preference).trim()] || { words: [lowerNfc(preference).trim()] };
  if (rule.category && rule.category !== product.category) return false;
  const haystack = lowerNfc([product.name, ...(rule.alsoIngredients ? product.ingredients || [] : [])].join(" | "));
  return rule.words.some((w) => w !== "" && wholeWord(w).test(haystack));
}
