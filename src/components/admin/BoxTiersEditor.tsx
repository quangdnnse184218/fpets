"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BoxTier, fetchBoxTiers } from "@/lib/boxTiers";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

// Admin sửa tên và mô tả của 2 hạng hộp (bảng box_tiers). Tên hiện ở trang chủ, Mystery Box, Quiz, Gói định kỳ;
// mô tả hiện dưới giá ở ô chọn hộp và bảng so sánh. Hạng của từng loại hộp xác định theo slug (có "premium").
export default function BoxTiersEditor() {
  const { show } = useToast();
  const [rows, setRows] = useState<BoxTier[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchBoxTiers(true).then(setRows);
  }, []);

  const update = (key: string, patch: Partial<BoxTier>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = async (row: BoxTier) => {
    if (row.name.trim().length < 2) return show("Tên hạng cần ít nhất 2 ký tự.", { tone: "error" });
    setSaving(row.key);
    const { error } = await createClient()
      .from("box_tiers")
      .update({ name: row.name.trim(), description: row.description.trim(), sort_order: row.sortOrder, updated_at: new Date().toISOString() })
      .eq("key", row.key);
    setSaving(null);
    if (error) return show("Không lưu được hạng hộp.", { tone: "error" });
    fetchBoxTiers(true);
    show(`Đã lưu "${row.name.trim()}".`);
  };

  return (
    <section className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
      <div>
        <h2 className="text-sm font-bold text-pine-950">Hạng hộp</h2>
        <p className="text-xs text-bark-500">
          Tên và mô tả của 2 hạng, hiện trên trang chủ, Mystery Box, Quiz và Gói định kỳ. Giá, số món, trị giá tối thiểu sửa ở từng loại hộp bên dưới.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.key} className="p-3 rounded-box border border-surface-border space-y-2 text-xs">
            <p className="text-[11px] text-bark-500">
              Áp dụng cho các hộp có slug {row.key === "premium" ? "chứa" : "không chứa"} chữ <code>premium</code>
            </p>
            <label className="block space-y-1">
              <span className="font-semibold text-bark-700">Tên hạng</span>
              <input value={row.name} maxLength={40} onChange={(e) => update(row.key, { name: e.target.value })}
                className="w-full h-9 px-2 rounded-box border border-surface-border text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-bark-700">Mô tả ngắn</span>
              <textarea value={row.description} maxLength={160} rows={2} onChange={(e) => update(row.key, { description: e.target.value })}
                className="w-full px-2 py-1.5 rounded-box border border-surface-border text-sm" />
            </label>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <span className="font-semibold text-bark-700">Thứ tự hiển thị</span>
                <input type="number" min={0} max={9} value={row.sortOrder} onChange={(e) => update(row.key, { sortOrder: Number(e.target.value) || 0 })}
                  className="w-16 h-8 px-2 rounded-box border border-surface-border tabular-nums" />
              </label>
              <Button size="sm" onClick={() => save(row)} loading={saving === row.key}>Lưu</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
