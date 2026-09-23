"use client";

import React, { useState } from "react";
import { PRODUCTS, Product } from "@/mock/products";
import { formatVND } from "@/lib/formatters";
import { Plus, Edit2, Check, AlertTriangle, Search } from "lucide-react";

export default function AdminProductsPage() {
  const [productList, setProductList] = useState<Product[]>(PRODUCTS);
  const [search, setSearch] = useState("");

  const toggleRetail = (id: string) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isRetail: !p.isRetail } : p))
    );
  };

  const toggleBoxItem = (id: string) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isBoxItem: !p.isBoxItem } : p))
    );
  };

  const adjustStock = (id: string, delta: number) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
    );
  };

  const filtered = productList.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Sản phẩm & Tồn kho ({productList.length} mặt hàng)
          </h1>
          <p className="text-xs text-bark-500">
            Quản lý số lượng tồn kho, cấu hình sản phẩm cho phép bán lẻ trên Shop hoặc dùng để tuyển chọn vào Mystery Box.
          </p>
        </div>
      </div>

      {/* Tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm tên sản phẩm hoặc danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Bảng sản phẩm */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Tên sản phẩm</th>
              <th className="p-3.5">Danh mục</th>
              <th className="p-3.5">Dành cho</th>
              <th className="p-3.5">Giá bán lẻ</th>
              <th className="p-3.5">Tồn kho</th>
              <th className="p-3.5 text-center">Bán lẻ</th>
              <th className="p-3.5 text-center">Dùng cho Box</th>
              <th className="p-3.5 text-right">Điều chỉnh kho</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((prod) => {
              const isLowStock = prod.stock <= 15;
              return (
                <tr key={prod.id} className="hover:bg-surface-muted/60 transition-colors">
                  <td className="p-3.5 max-w-xs">
                    <div className="font-bold text-pine-950 leading-snug">{prod.name}</div>
                    <div className="text-[10px] text-bark-500 truncate mt-0.5">
                      Thành phần: {prod.ingredients.join(", ") || "Không có"}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-semibold text-[10px]">
                      {prod.categoryLabel}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-bark-700">
                      {prod.species === 'dog' ? 'Chó' : prod.species === 'cat' ? 'Mèo' : 'Chó & Mèo'}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-pine-950 font-display">
                    {formatVND(prod.price)}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${isLowStock ? 'text-amber-700 font-extrabold' : 'text-bark-900'}`}>
                        {prod.stock}
                      </span>
                      {isLowStock && (
                        <span title="Sắp hết hàng">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleRetail(prod.id)}
                      className={`px-2.5 py-1 rounded-box text-[11px] font-bold transition-colors ${
                        prod.isRetail
                          ? "bg-grass-100 text-grass-800"
                          : "bg-surface-muted text-bark-400"
                      }`}
                    >
                      {prod.isRetail ? "Bật" : "Tắt"}
                    </button>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleBoxItem(prod.id)}
                      className={`px-2.5 py-1 rounded-box text-[11px] font-bold transition-colors ${
                        prod.isBoxItem
                          ? "bg-honey-100 text-honey-800"
                          : "bg-surface-muted text-bark-400"
                      }`}
                    >
                      {prod.isBoxItem ? "Bật" : "Tắt"}
                    </button>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center border border-surface-border rounded-box bg-surface-muted">
                      <button
                        type="button"
                        onClick={() => adjustStock(prod.id, -5)}
                        className="px-2 py-0.5 text-bark-700 hover:bg-surface-border font-bold text-xs"
                        title="Giảm 5"
                      >
                        −5
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStock(prod.id, 5)}
                        className="px-2 py-0.5 text-bark-700 hover:bg-surface-border font-bold text-xs"
                        title="Tăng 5"
                      >
                        +5
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
