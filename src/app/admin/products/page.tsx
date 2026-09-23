"use client";

import React, { useState } from "react";
import { PRODUCTS, Product } from "@/mock/products";
import { formatVND } from "@/lib/formatters";
import ProductItemImage from "@/components/common/ProductItemImage";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Search,
  X,
  PackagePlus,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default function AdminProductsPage() {
  const [productList, setProductList] = useState<Product[]>(PRODUCTS);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // State Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // State Modal Xóa
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<'food' | 'toy' | 'accessory'>('food');
  const [formCategoryLabel, setFormCategoryLabel] = useState("Thức ăn dinh dưỡng");
  const [formSpecies, setFormSpecies] = useState<'dog' | 'cat' | 'both'>('dog');
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

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("food");
    setFormCategoryLabel("Thức ăn dinh dưỡng");
    setFormSpecies("dog");
    setFormPrice(45000);
    setFormOriginalPrice(undefined);
    setFormStock(50);
    setFormIngredients("");
    setFormDescription("");
    setFormImage("");
    setFormIsRetail(true);
    setFormIsBoxItem(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormCategoryLabel(prod.categoryLabel);
    setFormSpecies(prod.species);
    setFormPrice(prod.price);
    setFormOriginalPrice(prod.originalPrice);
    setFormStock(prod.stock);
    setFormIngredients(prod.ingredients.join(", "));
    setFormDescription(prod.description);
    setFormImage(prod.image);
    setFormIsRetail(prod.isRetail);
    setFormIsBoxItem(prod.isBoxItem);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const ingredientsArray = formIngredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    if (editingProduct) {
      // Sửa sản phẩm
      setProductList((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formName,
                category: formCategory,
                categoryLabel: formCategoryLabel,
                species: formSpecies,
                price: Number(formPrice),
                originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
                stock: Math.max(0, Number(formStock)),
                ingredients: ingredientsArray,
                description: formDescription,
                image: formImage.trim(),
                isRetail: formIsRetail,
                isBoxItem: formIsBoxItem,
              }
            : p
        )
      );
      showNotification(`Đã cập nhật sản phẩm "${formName}" thành công!`);
    } else {
      // Thêm sản phẩm mới
      const newProduct: Product = {
        id: `prod-custom-${Date.now()}`,
        name: formName,
        slug: formName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        category: formCategory,
        categoryLabel: formCategoryLabel,
        price: Number(formPrice),
        originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
        stock: Math.max(0, Number(formStock)),
        species: formSpecies,
        targetSize: "all",
        targetAge: "all",
        ingredients: ingredientsArray,
        description: formDescription,
        rating: 5.0,
        reviewCount: 0,
        isRetail: formIsRetail,
        isBoxItem: formIsBoxItem,
        placeholderColor: formCategory === "food" ? "#FEF7E6" : formCategory === "toy" ? "#E1EDE8" : "#C2DBD2",
        image: formImage.trim(),
      };
      setProductList((prev) => [newProduct, ...prev]);
      showNotification(`Đã thêm sản phẩm mới "${formName}" vào danh mục!`);
    }
    setIsModalOpen(false);
  };

  // Xác nhận xóa
  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    setProductList((prev) => prev.filter((p) => p.id !== deletingProduct.id));
    showNotification(`Đã xóa sản phẩm "${deletingProduct.name}".`);
    setDeletingProduct(null);
  };

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

  // Nhập số lượng tồn kho trực tiếp
  const handleUpdateStockDirectly = (id: string, newStock: number) => {
    const val = isNaN(newStock) ? 0 : Math.max(0, newStock);
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: val } : p))
    );
  };

  const adjustStock = (id: string, delta: number) => {
    setProductList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
    );
  };

  const filtered = productList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút Thêm sản phẩm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Sản phẩm & Tồn kho ({productList.length} mặt hàng)
          </h1>
          <p className="text-xs text-bark-500">
            Quản lý số lượng tồn kho trực tiếp, thêm/sửa/xóa sản phẩm và cấu hình bán lẻ hoặc tuyển chọn Mystery Box.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm sản phẩm mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

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
              <th className="p-3.5">Tồn kho trực tiếp</th>
              <th className="p-3.5 text-center">Bán lẻ</th>
              <th className="p-3.5 text-center">Dùng Box</th>
              <th className="p-3.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((prod) => {
              const isLowStock = prod.stock <= 15;
              return (
                <tr key={prod.id} className="hover:bg-surface-muted/60 transition-colors">
                  <td className="p-3.5 max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                        <ProductItemImage
                          src={prod.image}
                          alt={prod.name}
                          category={prod.category}
                          placeholderColor={prod.placeholderColor}
                          sizes="40px"
                          showNote={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-pine-950 leading-snug truncate" title={prod.name}>
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-bark-500 truncate mt-0.5">
                          Thành phần: {prod.ingredients.join(", ") || "Không có"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-tag bg-surface-muted text-bark-700 font-semibold text-[10px]">
                      {prod.categoryLabel}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-bark-700">
                      {prod.species === 'dog' ? '🐶 Chó' : prod.species === 'cat' ? '🐱 Mèo' : '🐶🐱 Chó & Mèo'}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-pine-950 font-display">
                    {formatVND(prod.price)}
                  </td>
                  <td className="p-3.5">
                    {/* Nhập tồn kho trực tiếp */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-surface-border rounded-box bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => adjustStock(prod.id, -1)}
                          className="px-1.5 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs"
                          title="Giảm 1"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={prod.stock}
                          onChange={(e) => handleUpdateStockDirectly(prod.id, parseInt(e.target.value))}
                          className={`w-14 text-center font-bold text-xs py-1 focus:outline-none focus:bg-pine-50 ${
                            isLowStock ? 'text-amber-700 font-extrabold' : 'text-bark-900'
                          }`}
                          title="Nhấp để nhập số lượng tồn kho trực tiếp"
                        />
                        <button
                          type="button"
                          onClick={() => adjustStock(prod.id, 1)}
                          className="px-1.5 py-1 text-bark-600 hover:bg-surface-muted font-bold text-xs"
                          title="Tăng 1"
                        >
                          +
                        </button>
                      </div>

                      {isLowStock && (
                        <span title="Cảnh báo: Tồn kho sắp hết (≤ 15 món)">
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
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-box bg-pine-50 hover:bg-pine-100 text-pine-900 transition-colors"
                        title="Chỉnh sửa sản phẩm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(prod)}
                        className="p-1.5 rounded-box bg-bark-100 hover:bg-red-100 text-bark-700 hover:text-red-700 transition-colors"
                        title="Xóa sản phẩm"
                      >
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

      {/* Modal Thêm / Chỉnh sửa Sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-pine-800" />
                <span>{editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : "Thêm sản phẩm mới"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Hạt dinh dưỡng thịt bò nướng..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Danh mục *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as 'food' | 'toy' | 'accessory';
                      setFormCategory(cat);
                      if (cat === 'food') setFormCategoryLabel("Thức ăn dinh dưỡng");
                      else if (cat === 'toy') setFormCategoryLabel("Đồ chơi vận động");
                      else setFormCategoryLabel("Chăm sóc & Phụ kiện");
                    }}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white text-xs"
                  >
                    <option value="food">Thức ăn & Bánh thưởng</option>
                    <option value="toy">Đồ chơi thú cưng</option>
                    <option value="accessory">Chăm sóc & Phụ kiện</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Dành cho loài *</label>
                  <select
                    value={formSpecies}
                    onChange={(e) => setFormSpecies(e.target.value as any)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white text-xs"
                  >
                    <option value="dog">Chó</option>
                    <option value="cat">Mèo</option>
                    <option value="both">Cả Chó và Mèo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá bán lẻ (VND) *</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold text-pine-900 focus:border-pine-900 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá gốc (VND)</label>
                  <input
                    type="number"
                    value={formOriginalPrice || ""}
                    onChange={(e) => setFormOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Không bắt buộc"
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Tồn kho ban đầu *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box font-bold focus:border-pine-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">
                  Thành phần / Chất liệu (ngăn cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  placeholder="Thịt bò Úc, Gạo lứt, Men Probiotic, Canxi..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">Mô tả sản phẩm</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả công dụng, hương vị, độ bền hoặc lợi ích sức khỏe..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">
                  URL hình ảnh (để trống nếu dùng ảnh Studio chuẩn FPETS)
                </label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/... (không bắt buộc)"
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none text-xs"
                />
                <p className="text-[10px] text-bark-500 mt-1">
                  Lưu ý: Chỉ dùng ảnh chụp nền sạch thương mại điện tử, tuyệt đối không dùng ảnh có logo thương hiệu nước ngoài.
                </p>
              </div>

              <div className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-pine-950 block">Cho phép bán lẻ</span>
                  <span className="text-[11px] text-bark-500">Hiển thị và cho phép khách mua lẻ trên Shop</span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsRetail}
                  onChange={(e) => setFormIsRetail(e.target.checked)}
                  className="w-4 h-4 text-pine-900 rounded accent-pine-900 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-pine-950 block">Dùng cho Mystery Box</span>
                  <span className="text-[11px] text-bark-500">Cho phép đội ngũ vận hành tuyển chọn vào hộp định kỳ</span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsBoxItem}
                  onChange={(e) => setFormIsBoxItem(e.target.checked)}
                  className="w-4 h-4 text-pine-900 rounded accent-pine-900 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-bark-600 hover:text-bark-900 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors shadow-xs"
                >
                  {editingProduct ? "Lưu thay đổi" : "Tạo sản phẩm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa sản phẩm */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận xóa sản phẩm</h3>
            </div>

            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa sản phẩm <strong>&ldquo;{deletingProduct.name}&rdquo;</strong>? Hành động này sẽ loại bỏ sản phẩm khỏi Shop và hàng chờ tuyển chọn Box.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
