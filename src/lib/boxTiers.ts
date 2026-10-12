"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BoxType } from "@/types/models";

// Hạng hộp (bảng box_tiers): tên và mô tả do admin sửa ở trang Loại Mystery Box.
// Mỗi loại hộp thuộc một hạng theo slug: có chữ "premium" là hạng "premium", còn lại là "standard".

export type TierKey = "standard" | "premium";

export interface BoxTier {
  key: TierKey;
  name: string; // ví dụ "Box nhỏ"
  description: string;
  sortOrder: number;
}

// Dùng trong lúc chờ tải, hoặc khi database chưa có bảng
export const DEFAULT_TIERS: BoxTier[] = [
  { key: "premium", name: "Box nhỏ", description: "Đủ đồ ăn, đồ chơi và 1 món chăm sóc", sortOrder: 1 },
  { key: "standard", name: "Box tiêu chuẩn", description: "Nhiều món hơn, có đồ chơi giấu thức ăn", sortOrder: 2 },
];

export const tierOf = (box: Pick<BoxType, "slug">): TierKey => (box.slug.includes("premium") ? "premium" : "standard");

// Tên ngắn không có chữ "Box" ở đầu, cho nhãn và bộ lọc ("nhỏ" -> "Nhỏ")
export const shortTierName = (tier: BoxTier) => {
  const s = tier.name.replace(/^box\s+/i, "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

let cache: Promise<BoxTier[]> | null = null;

export function fetchBoxTiers(force = false): Promise<BoxTier[]> {
  if (!cache || force) {
    cache = Promise.resolve(
      createClient()
        .from("box_tiers")
        .select("key, name, description, sort_order")
        .order("sort_order")
    ).then(({ data, error }) => {
      if (error || !data || data.length === 0) return DEFAULT_TIERS;
      return (data as { key: TierKey; name: string; description: string; sort_order: number }[]).map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        sortOrder: t.sort_order,
      }));
    });
  }
  return cache;
}

// Danh sách hạng theo thứ tự hiển thị, kèm tra cứu theo key
export function useBoxTiers() {
  const [tiers, setTiers] = useState<BoxTier[]>(DEFAULT_TIERS);
  useEffect(() => {
    let alive = true;
    fetchBoxTiers().then((t) => alive && setTiers(t));
    return () => {
      alive = false;
    };
  }, []);
  const byKey = (key: TierKey) => tiers.find((t) => t.key === key) || DEFAULT_TIERS.find((t) => t.key === key)!;
  return { tiers, byKey };
}

// Số món của một hạng theo các loại hộp đang bán (ví dụ "4–5 món"); khác nhau giữa các hộp thì lấy khoảng chung
export function tierItemCount(boxes: BoxType[], key: TierKey): string {
  const group = boxes.filter((b) => tierOf(b) === key);
  if (group.length === 0) return "";
  const ranges = group.map((b) => b.itemCount.match(/(\d+)\D+(\d+)/)).filter(Boolean) as RegExpMatchArray[];
  if (ranges.length === 0) return group[0].itemCount;
  const min = Math.min(...ranges.map((m) => Number(m[1])));
  const max = Math.max(...ranges.map((m) => Number(m[2])));
  return min === max ? `${min} món` : `${min}–${max} món`;
}
