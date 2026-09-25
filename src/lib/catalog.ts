"use client";

import { createClient } from "@/lib/supabase/client";
import { productRowToProduct, boxTypeRowToBoxType, ProductWithCategory } from "@/lib/adapters";
import { Product } from "@/mock/products";
import { BoxType } from "@/mock/boxTypes";

// Lấy dữ liệu sản phẩm / box thật từ Supabase (bảng products/box_types),
// thay cho việc đọc thẳng từ src/mock/*.

export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("is_active", true)
    .eq("is_retail", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ProductWithCategory[]).map(productRowToProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return productRowToProduct(data as unknown as ProductWithCategory);
}

export async function fetchBoxTypes(): Promise<BoxType[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("box_types")
    .select("*")
    .eq("is_active", true)
    .order("baseprice", { ascending: true });

  if (error || !data) return [];
  return data.map(boxTypeRowToBoxType);
}

export async function fetchSubscriptionPlans() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("cycle_count", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function fetchBoxTypeById(id: string): Promise<BoxType | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("box_types").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return boxTypeRowToBoxType(data);
}

export async function fetchBoxTypeBySlug(slug: string): Promise<BoxType | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("box_types")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return boxTypeRowToBoxType(data);
}
