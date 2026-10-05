import { normalizeText } from "@/lib/petOptions";

// Tìm kiếm dùng chung: gõ tới đâu lọc tới đó, không cần gõ đủ chữ, không cần gõ dấu.

/**
 * Lọc danh sách (các ô tìm trong trang quản trị): mọi từ khách gõ đều phải xuất hiện trong các trường,
 * không phân biệt hoa thường và dấu ("muop" ra "Mướp", "fpet 0846" ra đơn FPET-…-0846).
 */
export function textMatches(fields: (string | null | undefined)[], query: string): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(" \n "));
  return tokens.every((t) => haystack.includes(t));
}

export interface SearchableProduct {
  name: string;
  description?: string | null;
  ingredients?: string[] | null;
}

const splitWords = (text: string) => text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Điểm khớp của một sản phẩm với chữ khách đang gõ; 0 là không khớp, điểm cao xếp trước.
 * Mỗi từ khách gõ phải là phần đầu của một từ trong TÊN sản phẩm: gõ "p" đã ra Pate, phản quang, phát tiếng…
 * Từ 3 ký tự trở lên mới dò thêm mô tả và thành phần, để gõ 1–2 chữ không ra gần hết cửa hàng.
 * Khách gõ có dấu ("gà") thì so đúng dấu, không lẫn sang "gạo", "gặm"; gõ không dấu thì so không dấu.
 */
export function productSearchScore(product: SearchableProduct, query: string): number {
  const tokens = splitWords(query);
  if (tokens.length === 0) return 1;
  const nameWords = splitWords(product.name);
  const restWords = splitWords(`${product.description || ""} ${(product.ingredients || []).join(" ")}`);
  const namePlain = nameWords.map(normalizeText);
  const restPlain = restWords.map(normalizeText);

  let score = 0;
  for (const raw of tokens) {
    const plain = normalizeText(raw);
    const typedWithAccents = plain !== raw;
    const token = typedWithAccents ? raw : plain;
    const inName = typedWithAccents ? nameWords : namePlain;
    const inRest = typedWithAccents ? restWords : restPlain;
    if (inName.some((w) => w === token)) score += 4;
    else if (inName.some((w) => w.startsWith(token))) score += 3;
    else if (token.length >= 3 && inRest.some((w) => w.startsWith(token))) score += 1;
    else return 0;
  }
  // Tên bắt đầu bằng đúng cụm khách gõ thì xếp trên cùng
  if (normalizeText(product.name).startsWith(normalizeText(query.trim()))) score += 5;
  return score;
}

/** Lọc và xếp sản phẩm theo chữ khách gõ (giữ nguyên thứ tự gốc giữa các món cùng điểm). */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  if (!query.trim()) return products;
  return products
    .map((product, index) => ({ product, index, score: productSearchScore(product, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.product);
}
