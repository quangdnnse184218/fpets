"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PackagePlus, AlertTriangle, History } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

interface MovementRow {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  reference_id: string | null;
  created_at: string;
  products: { name: string } | null;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
}

const MOVEMENT_LABEL: Record<string, string> = {
  import: "Nhập hàng",
  retail_sale: "Xuất bán lẻ",
  box_curation: "Xuất đóng Box",
  adjustment: "Điều chỉnh kiểm kê",
  return_restock: "Hoàn kho (hủy/trả)",
};

export default function AdminInventoryPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; stock_quantity: number }[]>([]);
  const [importProductId, setImportProductId] = useState("");
  const [importQty, setImportQty] = useState(50);
  const [importNote, setImportNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: moves }, { data: low }, { data: allProducts }] = await Promise.all([
      supabase.from("inventory_movements").select("id, movement_type, quantity, previous_stock, new_stock, note, reference_id, created_at, products(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id, name, stock_quantity, low_stock_threshold, price").eq("is_active", true),
      supabase.from("products").select("id, name, stock_quantity").eq("is_active", true).order("name"),
    ]);
    setMovements((moves as unknown as MovementRow[]) || []);
    setLowStock((low || []).filter((p) => p.stock_quantity <= p.low_stock_threshold));
    setProducts(allProducts || []);
    if (allProducts && allProducts.length > 0) setImportProductId(allProducts[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importProductId || importQty <= 0) return;
    setSaving(true);
    const supabase = createClient();
    const product = products.find((p) => p.id === importProductId);
    if (product) {
      const newStock = product.stock_quantity + importQty;
      await supabase.from("products").update({ stock_quantity: newStock }).eq("id", importProductId);
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from("inventory_movements").insert({
        product_id: importProductId,
        movement_type: "import",
        quantity: importQty,
        previous_stock: product.stock_quantity,
        new_stock: newStock,
        note: importNote || "Phiếu nhập hàng",
        performed_by: authData.user?.id,
      });
    }
    setSaving(false);
    setImportModalOpen(false);
    setImportQty(50);
    setImportNote("");
    loadData();
  };

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải dữ liệu tồn kho...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Kho & Tồn kho</h1>
          <p className="text-xs text-bark-500">Phiếu nhập hàng và lịch sử biến động kho (xuất bán lẻ, đóng box, hoàn kho, điều chỉnh).</p>
        </div>
        <button onClick={() => setImportModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs">
          <PackagePlus className="w-4 h-4" />
          <span>Tạo phiếu nhập kho</span>
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="p-4 rounded-container bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Cảnh báo sắp hết hàng ({lowStock.length} sản phẩm)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <span key={p.id} className="text-xs px-2.5 py-1 rounded-tag bg-white border border-amber-300 text-amber-800 font-semibold">
                {p.name}: còn {p.stock_quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-pine-950 text-xs px-1">
          <History className="w-4 h-4" />
          <span>Biến động kho gần đây ({movements.length})</span>
        </div>
        {movements.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Chưa có biến động kho nào.
          </div>
        ) : (
          movements.map((m) => (
            <div
              key={m.id}
              className="p-3.5 rounded-container bg-surface-card border border-surface-border space-y-2 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-pine-950 text-xs">{m.products?.name || "—"}</h4>
                  <div className="text-[10px] text-bark-400 mt-0.5">{formatDateTime(m.created_at)}</div>
                </div>
                <div className={`text-sm font-extrabold font-display shrink-0 ${m.quantity < 0 ? "text-red-600" : "text-grass-700"}`}>
                  {m.quantity > 0 ? "+" : ""}{m.quantity}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border/70 text-[11px]">
                <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-semibold text-[10px]">
                  {MOVEMENT_LABEL[m.movement_type] || m.movement_type}
                </span>
                <span className="text-bark-600">
                  Tồn: <strong>{m.previous_stock}</strong> → <strong>{m.new_stock}</strong>
                </span>
              </div>

              {m.note && (
                <div className="text-[11px] text-bark-500 bg-surface-muted p-2 rounded-box">
                  Ghi chú: {m.note}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <div className="p-4 border-b border-surface-border flex items-center gap-2 font-bold text-pine-950 text-sm">
          <History className="w-4 h-4" />
          <span>Lịch sử biến động kho (100 gần nhất)</span>
        </div>
        <table className="w-full text-left text-xs min-w-[700px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Thời gian</th>
              <th className="p-3.5">Sản phẩm</th>
              <th className="p-3.5">Loại</th>
              <th className="p-3.5">Số lượng</th>
              <th className="p-3.5">Trước → Sau</th>
              <th className="p-3.5">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-xs text-bark-500">Chưa có biến động kho nào.</td>
              </tr>
            )}
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-surface-muted/50">
                <td className="p-3.5 text-bark-600">{formatDateTime(m.created_at)}</td>
                <td className="p-3.5 font-bold text-pine-950">{m.products?.name || "—"}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-semibold text-[10px]">
                    {MOVEMENT_LABEL[m.movement_type] || m.movement_type}
                  </span>
                </td>
                <td className={`p-3.5 font-bold ${m.quantity < 0 ? "text-red-600" : "text-grass-700"}`}>
                  {m.quantity > 0 ? "+" : ""}{m.quantity}
                </td>
                <td className="p-3.5 text-bark-600">{m.previous_stock} → {m.new_stock}</td>
                <td className="p-3.5 text-bark-500">{m.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <h3 className="font-bold text-pine-950 text-sm">Tạo phiếu nhập kho</h3>
            <form onSubmit={handleImport} className="space-y-3">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Sản phẩm *</label>
                <select value={importProductId} onChange={(e) => setImportProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box bg-white">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (đang có {p.stock_quantity})</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Số lượng nhập *</label>
                <input type="number" min="1" required value={importQty} onChange={(e) => setImportQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-border rounded-box font-bold" />
              </div>
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Ghi chú (nhà cung cấp, số hóa đơn...)</label>
                <input type="text" value={importNote} onChange={(e) => setImportNote(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setImportModalOpen(false)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors disabled:opacity-60">
                  {saving ? "Đang lưu..." : "Xác nhận nhập kho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
