"use client";

import { createClient } from "@/lib/supabase/client";
import { productRowToProduct, ProductWithCategory } from "@/lib/adapters";
import { Tables } from "@/types/database";
import { Product } from "@/types/models";

export interface CurationQueueRow {
  id: string;
  status: string;
  order_id: string;
  pet_id: string;
  box_type_id: string;
  created_at: string;
  orders: { order_code: string; order_type: string } | null;
  pets: Tables<"pets">;
  box_types: Tables<"box_types">;
}

export async function fetchPendingCurations(): Promise<CurationQueueRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("box_curations")
    .select("id, status, order_id, pet_id, box_type_id, created_at, orders(order_code, order_type), pets(*), box_types(*)")
    .eq("status", "pending_curation")
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
    const isAllergic = (pet.allergies || []).some((allergy) =>
      row.ingredients?.some((ing) => ing.toLowerCase().includes(allergy.toLowerCase()))
    );
    return {
      ...product,
      isAllergic,
      wasSentBefore: sentBefore.has(row.id),
      wasDisliked: disliked.has(row.id),
    };
  });
}

// Tự động gợi ý danh sách món ban đầu: ưu tiên món chưa gửi/không bị ghét,
// đảm bảo tối thiểu 1 food + 1 toy + 1 accessory, đạt tổng giá trị tối thiểu.
export function autoSuggest(candidates: CandidateProduct[], minRetailValue: number): CandidateProduct[] {
  const safe = candidates.filter((c) => !c.isAllergic && !c.wasSentBefore && !c.wasDisliked);
  const pool = safe.length > 0 ? safe : candidates.filter((c) => !c.isAllergic);

  const byCategory = (cat: Product["category"]) => pool.filter((p) => p.category === cat).sort((a, b) => a.price - b.price);

  const selected: CandidateProduct[] = [];
  const food = byCategory("food")[0];
  const toy = byCategory("toy")[0];
  const accessory = byCategory("accessory")[0];
  if (food) selected.push(food);
  if (toy) selected.push(toy);
  if (accessory) selected.push(accessory);

  let total = selected.reduce((s, p) => s + p.price, 0);
  const remaining = pool.filter((p) => !selected.some((s) => s.id === p.id)).sort((a, b) => b.price - a.price);
  for (const item of remaining) {
    if (total >= minRetailValue) break;
    selected.push(item);
    total += item.price;
  }

  return selected;
}
