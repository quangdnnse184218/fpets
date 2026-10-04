"use client";

import { createClient } from "@/lib/supabase/client";
import { productRowToProduct, ProductWithCategory } from "@/lib/adapters";
import { Tables } from "@/types/database";
import { Product } from "@/types/models";
import { productHasAllergen } from "@/lib/petOptions";

export interface CurationQueueRow {
  id: string;
  status: string;
  order_id: string;
  pet_id: string;
  box_type_id: string;
  created_at: string;
  orders: { order_code: string; order_type: string; status: string; created_at: string; cycle_index: number | null } | null;
  pets: Tables<"pets">;
  box_types: Tables<"box_types">;
}

export async function fetchPendingCurations(): Promise<CurationQueueRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("box_curations")
    .select("id, status, order_id, pet_id, box_type_id, created_at, orders!inner(order_code, order_type, status, created_at, cycle_index), pets(*), box_types(*)")
    .eq("status", "pending_curation")
    // Chỉ hộp của đơn đã xác nhận: đơn chờ thanh toán / đã hủy không được tuyển chọn (khớp approve_box_curation)
    .in("orders.status", ["da_xac_nhan", "dang_chuan_bi"])
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as unknown as CurationQueueRow[];
}

export interface CandidateProduct extends Product {
  isAllergic: boolean;
  wasSentBefore: boolean;
  wasDisliked: boolean;
}

// Thuật toán tuyển chọn thật (mục 3, 9 SPEC): lọc theo loài/size/tuổi, loại
// trừ dị ứng (chặn cứng), cảnh báo món đã gửi / bé từng chấm "không thích"
// (cảnh báo, không chặn cứng - để nhân viên kho tự quyết khi tồn kho hạn chế).
export async function fetchCandidateProducts(
  pet: Tables<"pets">
): Promise<CandidateProduct[]> {
  const supabase = createClient();

  const { data: productsData } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("is_active", true)
    .eq("is_box_item", true)
    .gt("stock_quantity", 0);

  const rows = (productsData as unknown as ProductWithCategory[]) || [];
  const matched = rows.filter((p) => {
    const speciesOk = p.species === "both" || p.species === pet.species;
    const sizeOk = p.target_size === "all" || p.target_size === pet.size;
    const ageOk = p.target_age === "all" || p.target_age === pet.age_group;
    return speciesOk && sizeOk && ageOk;
  });

  const { data: historyRows } = await supabase
    .from("box_curation_items")
    .select("product_id, box_curations(pet_id)")
    .eq("box_curations.pet_id", pet.id);
  const sentBefore = new Set(
    ((historyRows as unknown as { product_id: string; box_curations: { pet_id: string } | null }[]) || [])
      .filter((r) => r.box_curations?.pet_id === pet.id)
      .map((r) => r.product_id)
  );

  const { data: dislikedRows } = await supabase
    .from("pet_item_feedback")
    .select("product_id")
    .eq("pet_id", pet.id)
    .eq("rating", "dislike");
  const disliked = new Set((dislikedRows || []).map((r) => r.product_id));

  return matched.map((row) => {
    const product = productRowToProduct(row);
    // Cùng bộ so khớp với cảnh báo phía khách: "Thịt gà" chặn cả "Snack ức gà", "chicken"...
    // Chỉ chặn món bé ăn vào; đồ chơi, phụ kiện không bị chặn vì trùng chữ trong tên hay chất liệu.
    const isAllergic = (pet.allergies || []).some((allergy) => productHasAllergen(product, allergy));
    return {
      ...product,
      isAllergic,
      wasSentBefore: sentBefore.has(row.id),
      wasDisliked: disliked.has(row.id),
    };
  });
}

// Tự động gợi ý danh sách món ban đầu: ưu tiên món chưa gửi/không bị ghét,
// đảm bảo tối thiểu 1 food + 1 toy + 1 accessory, đạt tổng giá trị tối thiểu
// với ít món nhất có thể. Giá trị tối thiểu là cam kết với khách nên được ưu tiên hơn số món:
// nếu các món hiện có không đủ giá trị trong giới hạn số món, vẫn thêm món và màn hình sẽ báo cho admin.
export function autoSuggest(candidates: CandidateProduct[], minRetailValue: number): CandidateProduct[] {
  const safe = candidates.filter((c) => !c.isAllergic && !c.wasSentBefore && !c.wasDisliked);
  const pool = safe.length > 0 ? safe : candidates.filter((c) => !c.isAllergic);

  // Mỗi nhóm lấy món giá trị cao nhất để đạt giá trị tối thiểu với ít món nhất
  const topOf = (cat: Product["category"]) => pool.filter((p) => p.category === cat).sort((a, b) => b.price - a.price)[0];

  const selected: CandidateProduct[] = [];
  for (const cat of ["food", "toy", "accessory"] as const) {
    const item = topOf(cat);
    if (item) selected.push(item);
  }

  let total = selected.reduce((s, p) => s + p.price, 0);
  const remaining = pool.filter((p) => !selected.some((s) => s.id === p.id)).sort((a, b) => b.price - a.price);
  for (const item of remaining) {
    if (total >= minRetailValue) break;
    selected.push(item);
    total += item.price;
  }

  return selected;
}
