"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import ProductItemImage from "@/components/common/ProductItemImage";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { Tables } from "@/types/database";
import { resolveImageUrl } from "@/lib/adapters";
import {
  Plus, Edit2, Trash2, AlertTriangle, Search, X, PackagePlus, CheckCircle2,
} from "lucide-react";

type ProductRow = Tables<"products"> & { categories: { name: string; slug: string } | null };

export default function AdminProductsPage() {
  const [productList, setProductList] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSpecies, setFormSpecies] = useState<"dog" | "cat" | "both">("dog");
  const [formPrice, setFormPrice] = useState(45000);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | undefined>(undefined);
  const [formStock, setFormStock] = useState(50);
  const [formIngredients, setFormIngredients] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formIsRetail, setFormIsRetail] = useState(true);
  const [formIsBoxItem, setFormIsBoxItem] = useState(true);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: products }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*, categories(name, slug)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProductList((products as unknown as ProductRow[]) || []);
    setCategories(cats || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName(""); setFormCategoryId(categories[0]?.id || ""); setFormSpecies("dog");
    setFormPrice(45000); setFormOriginalPrice(undefined); setFormStock(50);
    setFormIngredients(""); setFormDescription(""); setFormImage("");
    setFormIsRetail(true); setFormIsBoxItem(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: ProductRow) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategoryId(prod.category_id || "");
    setFormSpecies((prod.species as "dog" | "cat" | "both") || "both");
    setFormPrice(prod.price);
    setFormOriginalPrice(prod.original_price || undefined);
    setFormStock(prod.stock_quantity);
    setFormIngredients((prod.ingredients || []).join(", "));
    setFormDescription(prod.description || "");
    setFormImage(prod.images?.[0] || "");
    setFormIsRetail(prod.is_retail);
    setFormIsBoxItem(prod.is_box_item);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const ingredientsArray = formIngredients.split(",").map((i) => i.trim()).filter(Boolean);
    const slug = formName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);

    const payload = {
      name: formName,
      category_id: formCategoryId || null,
      species: formSpecies,
      price: Number(formPrice),
      original_price: formOriginalPrice ? Number(formOriginalPrice) : null,
      stock_quantity: Math.max(0, Number(formStock)),
      ingredients: ingredientsArray,
      description: formDescription,
      images: formImage.trim() ? [formImage.trim()] : [],
      is_retail: formIsRetail,
      is_box_item: formIsBoxItem,
    };

    if (editingProduct) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      if (!error) showNotification(`Đã cập nhật sản phẩm "${formName}" thành công!`);
    } else {
      const { error } = await supabase.from("products").insert({ ...payload, slug });
      if (!error) showNotification(`Đã thêm sản phẩm mới "${formName}"!`);
    }
    setSaving(false);
    setIsModalOpen(false);
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const supabase = createClient();
    // Ẩn sản phẩm (soft-delete) thay vì xóa cứng, tránh vỡ ràng buộc khóa
    // ngoại với order_items/box_curation_items đã tồn tại.
    await supabase.from("products").update({ is_active: false }).eq("id", deletingProduct.id);
    showNotification(`Đã ẩn sản phẩm "${deletingProduct.name}" khỏi Shop.`);
    setDeletingProduct(null);
    loadData();
  };

  const adjustStock = async (prod: ProductRow, delta: number) => {
    const supabase = createClient();
    const newStock = Math.max(0, prod.stock_quantity + delta);
    setProductList((prev) => prev.map((p) => (p.id === prod.id ? { ...p, stock_quantity: newStock } : p)));
    await supabase.from("products").update({ stock_quantity: newStock }).eq("id", prod.id);
    const { data: authData } = await supabase.auth.getUser();
    await supabase.from("inventory_movements").insert({
      product_id: prod.id,
      movement_type: "adjustment",
      quantity: delta,
      previous_stock: prod.stock_quantity,
      new_stock: newStock,
      note: "Điều chỉnh nhanh từ trang Sản phẩm",
      performed_by: authData.user?.id,
    });
  };

  const toggleRetail = async (prod: ProductRow) => {
    const supabase = createClient();
    const next = !prod.is_retail;
    setProductList((prev) => prev.map((p) => (p.id === prod.id ? { ...p, is_retail: next } : p)));
    await supabase.from("products").update({ is_retail: next }).eq("id", prod.id);
  };

  const toggleBoxItem = async (prod: ProductRow) => {
    const supabase = createClient();
    const next = !prod.is_box_item;
    setProductList((prev) => prev.map((p) => (p.id === prod.id ? { ...p, is_box_item: next } : p)));
    await supabase.from("products").update({ is_box_item: next }).eq("id", prod.id);
  };

  const filtered = productList.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.categories?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải sản phẩm...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Sản phẩm & Tồn kho ({productList.length} mặt hàng)
          </h1>
          <p className="text-xs text-bark-500">
            Quản lý tồn kho trực tiếp, thêm/sửa/ẩn sản phẩm và cấu hình bán lẻ hoặc tuyển chọn Mystery Box.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs shrink-0">
          <Plus className="w-4 h-4" />
          <span>Thêm sản phẩm mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm tên sản phẩm hoặc danh mục..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : (
          filtered.map((prod) => {
            const isLowStock = prod.stock_quantity <= prod.low_stock_threshold;
            return (
              <div
                key={prod.id}
                className={`p-3.5 rounded-container bg-surface-card border border-surface-border space-y-3 shadow-2xs ${
                  !prod.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                    <ProductItemImage
                      src={resolveImageUrl(prod.images?.[0], "")}
                      alt={prod.name}
                      placeholderColor="#E1EDE8"
                      sizes="56px"
                      showNote={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-bark-700">
                        {prod.categories?.name || "Chưa phân loại"}
                      </span>
                      <PetSpeciesIcon species={prod.species as "dog" | "cat" | "both"} variant="badge" size="xs" />
                      {!prod.is_active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          Đã ẩn
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-pine-950 text-xs sm:text-sm mt-1 leading-snug line-clamp-2">
                      {prod.name}
                    </h3>
                    <div className="text-sm font-extrabold text-pine-950 font-display mt-0.5">
                      {formatVND(prod.price)}
                    </div>
                  </div>
                </div>

                {/* Tồn kho & Thao tác chuyển đổi */}
                <div className="pt-2.5 border-t border-surface-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-bark-500 font-medium">Tồn kho:</span>
                    <div className="flex items-center border border-surface-border rounded-box bg-white overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => adjustStock(prod, -1)}
                        className="px-2 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs"
                      >
                        −
                      </button>
                      <span
                        className={`w-10 text-center font-bold text-xs py-1 ${
                          isLowStock ? "text-amber-700 font-extrabold" : "text-bark-900"
                        }`}
                      >
                        {prod.stock_quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustStock(prod, 1)}
                        className="px-2 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                    {isLowStock && (
                      <span title="Tồn kho sắp hết">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleRetail(prod)}
                      className={`px-2 py-1 rounded-box text-[10px] font-bold transition-colors ${
                        prod.is_retail ? "bg-grass-100 text-grass-800" : "bg-surface-muted text-bark-400"
                      }`}
                      title="Bật/Tắt bán lẻ"
                    >
                      Bán lẻ: {prod.is_retail ? "Bật" : "Tắt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBoxItem(prod)}
                      className={`px-2 py-1 rounded-box text-[10px] font-bold transition-colors ${
                        prod.is_box_item ? "bg-honey-100 text-honey-800" : "bg-surface-muted text-bark-400"
                      }`}
                      title="Bật/Tắt dùng cho Box"
                    >
                      Box: {prod.is_box_item ? "Bật" : "Tắt"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/50">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prod)}
                    className="px-2.5 py-1 rounded-box bg-pine-50 hover:bg-pine-100 text-pine-900 font-semibold text-xs inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingProduct(prod)}
                    className="px-2.5 py-1 rounded-box bg-bark-100 hover:bg-red-100 text-bark-700 hover:text-red-700 font-semibold text-xs inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{prod.is_active ? "Ẩn" : "Hiện"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Tên sản phẩm</th>
              <th className="p-3.5">Danh mục</th>
              <th className="p-3.5">Dành cho</th>
              <th className="p-3.5">Giá bán lẻ</th>
              <th className="p-3.5">Tồn kho</th>
              <th className="p-3.5 text-center">Bán lẻ</th>
              <th className="p-3.5 text-center">Dùng Box</th>
              <th className="p-3.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-xs text-bark-500">Không tìm thấy sản phẩm phù hợp.</td>
              </tr>
            )}
            {filtered.map((prod) => {
              const isLowStock = prod.stock_quantity <= prod.low_stock_threshold;
              return (
                <tr key={prod.id} className={`hover:bg-surface-muted/60 transition-colors ${!prod.is_active ? "opacity-50" : ""}`}>
                  <td className="p-3.5 max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                        <ProductItemImage src={resolveImageUrl(prod.images?.[0], "")} alt={prod.name} placeholderColor="#E1EDE8" sizes="40px" showNote={false} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-pine-950 leading-snug truncate" title={prod.name}>
                          {prod.name} {!prod.is_active && <span className="text-red-500">(Đã ẩn)</span>}
                        </div>
                        <div className="text-[10px] text-bark-500 truncate mt-0.5">
                          Thành phần: {(prod.ingredients || []).join(", ") || "Không có"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-semibold text-[10px]">
                      {prod.categories?.name || "Chưa phân loại"}
                    </span>
                  </td>
                  <td className="p-3.5"><PetSpeciesIcon species={prod.species as "dog" | "cat" | "both"} variant="badge" size="xs" /></td>
                  <td className="p-3.5 font-bold text-pine-950 font-display">{formatVND(prod.price)}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-surface-border rounded-box bg-white overflow-hidden shadow-2xs">
                        <button type="button" onClick={() => adjustStock(prod, -1)} className="px-1.5 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs">−</button>
                        <span className={`w-14 text-center font-bold text-xs py-1 ${isLowStock ? "text-amber-700 font-extrabold" : "text-bark-900"}`}>{prod.stock_quantity}</span>
                        <button type="button" onClick={() => adjustStock(prod, 1)} className="px-1.5 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs">+</button>
                      </div>
                      {isLowStock && <span title="Tồn kho sắp hết"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /></span>}
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <button type="button" onClick={() => toggleRetail(prod)} className={`px-2.5 py-1 rounded-box text-[11px] font-bold transition-colors ${prod.is_retail ? "bg-grass-100 text-grass-800" : "bg-surface-muted text-bark-400"}`}>
                      {prod.is_retail ? "Bật" : "Tắt"}
                    </button>
                  </td>
                  <td className="p-3.5 text-center">
                    <button type="button" onClick={() => toggleBoxItem(prod)} className={`px-2.5 py-1 rounded-box text-[11px] font-bold transition-colors ${prod.is_box_item ? "bg-honey-100 text-honey-800" : "bg-surface-muted text-bark-400"}`}>
                      {prod.is_box_item ? "Bật" : "Tắt"}
                    </button>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => handleOpenEdit(prod)} className="p-1.5 rounded-box bg-pine-50 hover:bg-pine-100 text-pine-900 transition-colors" title="Chỉnh sửa">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setDeletingProduct(prod)} className="p-1.5 rounded-box bg-bark-100 hover:bg-red-100 text-bark-700 hover:text-red-700 transition-colors" title="Ẩn sản phẩm">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-4 sm:p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-pine-800" />
                <span>{editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : "Thêm sản phẩm mới"}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Tên sản phẩm *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Danh mục *</label>
                  <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white text-xs">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Dành cho loài *</label>
                  <select value={formSpecies} onChange={(e) => setFormSpecies(e.target.value as "dog" | "cat" | "both")}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white text-xs">
                    <option value="dog">Chó</option>
                    <option value="cat">Mèo</option>
                    <option value="both">Cả Chó và Mèo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá bán lẻ (VND) *</label>
                  <input type="number" required value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold text-pine-900 focus:border-pine-900 focus:outline-none text-xs" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá gốc (VND)</label>
                  <input type="number" value={formOriginalPrice || ""} onChange={(e) => setFormOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Không bắt buộc" className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs" />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Tồn kho *</label>
                  <input type="number" required min="0" value={formStock} onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold focus:border-pine-900 focus:outline-none text-xs" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">Thành phần / Chất liệu (ngăn cách bởi dấu phẩy)</label>
                <input type="text" value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs" />
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">Mô tả sản phẩm</label>
                <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs" />
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">URL hình ảnh</label>
                <input type="text" value={formImage} onChange={(e) => setFormImage(e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs" />
              </div>

              <div className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-pine-950 block">Cho phép bán lẻ</span>
                  <span className="text-[11px] text-bark-500">Hiển thị và cho phép khách mua lẻ trên Shop</span>
                </div>
                <input type="checkbox" checked={formIsRetail} onChange={(e) => setFormIsRetail(e.target.checked)} className="w-4 h-4 accent-pine-900 cursor-pointer" />
              </div>

              <div className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-pine-950 block">Dùng cho Mystery Box</span>
                  <span className="text-[11px] text-bark-500">Cho phép tuyển chọn vào hộp định kỳ</span>
                </div>
                <input type="checkbox" checked={formIsBoxItem} onChange={(e) => setFormIsBoxItem(e.target.checked)} className="w-4 h-4 accent-pine-900 cursor-pointer" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-bark-600 hover:text-bark-900 font-semibold">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors shadow-xs disabled:opacity-60">
                  {saving ? "Đang lưu..." : editingProduct ? "Lưu thay đổi" : "Tạo sản phẩm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận ẩn sản phẩm</h3>
            </div>
            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc muốn ẩn sản phẩm <strong>&ldquo;{deletingProduct.name}&rdquo;</strong>? Sản phẩm sẽ không còn hiển thị trên Shop, nhưng lịch sử đơn hàng cũ vẫn giữ nguyên.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button type="button" onClick={() => setDeletingProduct(null)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold">Hủy</button>
              <button type="button" onClick={handleConfirmDelete} className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors">Ẩn ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
