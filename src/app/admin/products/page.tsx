"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, EyeOff, Eye, AlertTriangle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import ProductItemImage from "@/components/common/ProductItemImage";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { Tables } from "@/types/database";
import { resolveImageUrl } from "@/lib/adapters";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAdminTasks } from "../AdminTasks";
import ImageUpload from "@/components/admin/ImageUpload";

type ProductRow = Tables<"products"> & { categories: { name: string; slug: string } | null };
type Species = "dog" | "cat" | "both";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "low", label: "Sắp hết hàng" },
  { id: "no_image", label: "Chưa có ảnh" },
  { id: "retail", label: "Đang bán lẻ" },
  { id: "box_only", label: "Chỉ dùng cho hộp" },
  { id: "hidden", label: "Đã ẩn" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const SIZE_LABEL: Record<string, string> = { all: "Mọi cỡ", small: "Chó dưới 10 kg", large: "Chó từ 10 kg" };
const AGE_LABEL: Record<string, string> = { all: "Mọi độ tuổi", puppy_kitten: "Dưới 1 tuổi", adult: "Trưởng thành", senior: "Trên 7 tuổi" };

const isLow = (p: ProductRow) => p.is_active && p.stock_quantity <= p.low_stock_threshold;
const hasNoImage = (p: ProductRow) => p.is_active && !(p.images && p.images[0]);
const matchesFilter = (p: ProductRow, f: FilterId) =>
  f === "all" ? true : f === "low" ? isLow(p) : f === "no_image" ? hasNoImage(p) : f === "retail" ? p.is_active && p.is_retail : f === "box_only" ? p.is_active && !p.is_retail && p.is_box_item : !p.is_active;

interface FormState {
  name: string;
  categoryId: string;
  species: Species;
  targetSize: string;
  targetAge: string;
  price: string;
  originalPrice: string;
  stock: string;
  lowStock: string;
  ingredients: string;
  description: string;
  image: string;
  isRetail: boolean;
  isBoxItem: boolean;
}

const emptyForm = (categoryId = ""): FormState => ({
  name: "",
  categoryId,
  species: "dog",
  targetSize: "all",
  targetAge: "all",
  price: "",
  originalPrice: "",
  stock: "0",
  lowStock: "5",
  ingredients: "",
  description: "",
  image: "",
  isRetail: true,
  isBoxItem: true,
});

const slugify = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-bark-500">Đang tải sản phẩm…</div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const { refresh: refreshTasks } = useAdminTasks();

  const filter = (FILTERS.find((f) => f.id === searchParams.get("filter"))?.id || "all") as FilterId;
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hiding, setHiding] = useState<ProductRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rows }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*, categories(name, slug)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts((rows as unknown as ProductRow[]) || []);
    setCategories(cats || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (id: FilterId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("filter");
    else params.set("filter", id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?.id || ""));
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      categoryId: p.category_id || "",
      species: (p.species as Species) || "both",
      targetSize: p.target_size || "all",
      targetAge: p.target_age || "all",
      price: String(p.price),
      originalPrice: p.original_price ? String(p.original_price) : "",
      stock: String(p.stock_quantity),
      lowStock: String(p.low_stock_threshold),
      ingredients: (p.ingredients || []).join(", "),
      description: p.description || "",
      image: p.images?.[0] || "",
      isRetail: p.is_retail,
      isBoxItem: p.is_box_item,
    });
    setFormError("");
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const original = form.originalPrice.trim() ? Number(form.originalPrice) : null;
    const stock = Number(form.stock);
    const lowStock = Number(form.lowStock);
    if (!form.name.trim()) return setFormError("Vui lòng nhập tên sản phẩm.");
    if (!Number.isInteger(price) || price < 1000) return setFormError("Giá bán phải là số nguyên từ 1.000₫.");
    if (original !== null && (!Number.isInteger(original) || original <= price)) return setFormError("Giá gốc phải lớn hơn giá bán (để trống nếu không giảm giá).");
    if (!editing && (!Number.isInteger(stock) || stock < 0)) return setFormError("Tồn kho ban đầu phải là số nguyên không âm.");
    if (!Number.isInteger(lowStock) || lowStock < 0) return setFormError("Ngưỡng báo sắp hết phải là số nguyên không âm.");
    if (!form.isRetail && !form.isBoxItem) return setFormError("Chọn ít nhất một nơi dùng: bán lẻ hoặc cho vào hộp.");

    setSaving(true);
    setFormError("");
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      category_id: form.categoryId || null,
      species: form.species,
      // Cỡ chỉ áp dụng cho đồ của chó
      target_size: form.species === "cat" ? "all" : form.targetSize,
      target_age: form.targetAge,
      price,
      original_price: original,
      low_stock_threshold: lowStock,
      ingredients: form.ingredients.split(",").map((i) => i.trim()).filter(Boolean),
      description: form.description.trim(),
      images: form.image.trim() ? [form.image.trim()] : [],
      is_retail: form.isRetail,
      is_box_item: form.isBoxItem,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      setSaving(false);
      if (error) return setFormError("Không lưu được sản phẩm, vui lòng thử lại.");
      show(`Đã lưu "${payload.name}".`);
    } else {
      // Tạo với tồn 0 rồi ghi phiếu nhập để có lịch sử kho ngay từ đầu
      const { data, error } = await supabase
        .from("products")
        .insert({ ...payload, slug: `${slugify(payload.name)}-${Date.now().toString(36)}`, stock_quantity: 0 })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        return setFormError("Không tạo được sản phẩm, vui lòng thử lại.");
      }
      if (stock > 0) await supabase.rpc("adjust_product_stock", { p_product_id: data.id, p_delta: stock, p_movement_type: "import", p_note: "Tồn kho ban đầu" });
      setSaving(false);
      show(`Đã thêm "${payload.name}".`);
    }
    setFormOpen(false);
    refreshTasks();
    load();
  };

  // Cộng/trừ trên số tồn hiện tại trong DB (không ghi đè số đang hiện trên màn hình)
  const adjustStock = async (p: ProductRow, delta: number) => {
    setBusyId(p.id);
    const { data, error } = await createClient().rpc("adjust_product_stock", { p_product_id: p.id, p_delta: delta, p_movement_type: "adjustment", p_note: "Điều chỉnh nhanh từ trang Sản phẩm" });
    setBusyId(null);
    if (error) {
      show(error.message.includes("ERR_STOCK_NEGATIVE") ? "Tồn kho không thể âm." : "Không cập nhật được tồn kho.", { tone: "error" });
      return;
    }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock_quantity: data as number } : x)));
    refreshTasks();
  };

  const updateFlag = async (p: ProductRow, patch: Partial<Pick<ProductRow, "is_retail" | "is_box_item" | "is_active">>, message: string) => {
    setBusyId(p.id);
    const { error } = await createClient().from("products").update(patch).eq("id", p.id);
    setBusyId(null);
    if (error) return show("Không cập nhật được sản phẩm.", { tone: "error" });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    show(message);
    refreshTasks();
  };

  const q = search.trim().toLowerCase();
  const visible = products.filter((p) => matchesFilter(p, filter) && (!q || p.name.toLowerCase().includes(q) || (p.categories?.name || "").toLowerCase().includes(q)));

  const stockControl = (p: ProductRow) => (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center border border-surface-border rounded-box bg-white overflow-hidden">
        <button type="button" aria-label={`Giảm tồn kho ${p.name}`} disabled={busyId === p.id || p.stock_quantity === 0} onClick={() => adjustStock(p, -1)} className="w-7 h-7 text-bark-600 hover:bg-surface-muted font-bold disabled:opacity-40">−</button>
        <span className={`w-10 text-center font-bold text-xs tabular-nums ${isLow(p) ? "text-amber-700" : "text-bark-900"}`}>{p.stock_quantity}</span>
        <button type="button" aria-label={`Tăng tồn kho ${p.name}`} disabled={busyId === p.id} onClick={() => adjustStock(p, 1)} className="w-7 h-7 text-bark-600 hover:bg-surface-muted font-bold disabled:opacity-40">+</button>
      </div>
      {isLow(p) && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-label="Sắp hết hàng" />}
    </div>
  );

  const usage = (p: ProductRow) => (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        disabled={busyId === p.id}
        onClick={() => updateFlag(p, { is_retail: !p.is_retail }, p.is_retail ? `Đã tắt bán lẻ "${p.name}".` : `Đã mở bán lẻ "${p.name}".`)}
        className={`px-2 py-1 rounded-box text-[11px] font-bold border ${p.is_retail ? "bg-grass-50 text-grass-800 border-grass-200" : "bg-white text-bark-500 border-surface-border"}`}
        aria-pressed={p.is_retail}
      >
        Bán lẻ
      </button>
      <button
        type="button"
        disabled={busyId === p.id}
        onClick={() => updateFlag(p, { is_box_item: !p.is_box_item }, p.is_box_item ? `"${p.name}" không còn dùng cho hộp.` : `"${p.name}" được dùng cho hộp.`)}
        className={`px-2 py-1 rounded-box text-[11px] font-bold border ${p.is_box_item ? "bg-honey-50 text-honey-800 border-honey-200" : "bg-white text-bark-500 border-surface-border"}`}
        aria-pressed={p.is_box_item}
      >
        Cho vào hộp
      </button>
    </div>
  );

  const rowActions = (p: ProductRow) => (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
        <Pencil className="w-3.5 h-3.5" /> Sửa
      </Button>
      {p.is_active ? (
        <Button size="sm" variant="secondary" onClick={() => setHiding(p)}>
          <EyeOff className="w-3.5 h-3.5" /> Ẩn
        </Button>
      ) : (
        <Button size="sm" variant="secondary" disabled={busyId === p.id} onClick={() => updateFlag(p, { is_active: true }, `Đã hiện lại "${p.name}".`)}>
          <Eye className="w-3.5 h-3.5" /> Hiện lại
        </Button>
      )}
    </div>
  );

  const input = "w-full h-10 px-3 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white text-xs";
  const labelCls = "font-semibold text-bark-700 block mb-1 text-xs";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Sản phẩm</h1>
          <p className="text-xs text-bark-500">Giá, tồn kho, nơi dùng (bán lẻ / cho vào hộp) và thông tin để tuyển chọn hộp.</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="search" placeholder="Tên sản phẩm hoặc danh mục" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm sản phẩm" className="w-full h-10 pl-9 pr-3 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${filter === f.id ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-700 hover:bg-surface-muted"}`}
            >
              {f.label}
              <span className={`text-[10px] font-extrabold ${filter === f.id ? "text-pine-100" : "text-bark-500"}`}>{products.filter((p) => matchesFilter(p, f.id)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {!loading && products.some(hasNoImage) && filter !== "no_image" && (
        <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>{products.filter(hasNoImage).length} sản phẩm chưa có ảnh.</strong> Khách thấy ô trống thay cho ảnh; bấm Sửa để tải ảnh từ máy.
          </span>
          <button type="button" onClick={() => setFilter("no_image")} className="font-bold underline">Xem danh sách</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-bark-500">Đang tải sản phẩm…</div>
      ) : visible.length === 0 ? (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">Không có sản phẩm phù hợp.</div>
      ) : (
        <>
          <ul className="lg:hidden space-y-2.5">
            {visible.map((p) => (
              <li key={p.id} className={`p-3.5 rounded-container bg-surface-card border border-surface-border space-y-3 text-xs ${!p.is_active ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                    <ProductItemImage src={resolveImageUrl(p.images?.[0], "")} alt={p.name} placeholderColor="#E1EDE8" sizes="56px" showNote={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-pine-950 leading-snug line-clamp-2">{p.name}{!p.is_active && <span className="text-red-600"> · Đã ẩn</span>}</p>
                    {hasNoImage(p) && <p className="text-amber-700 font-semibold">Chưa có ảnh</p>}
                    <p className="text-bark-500 mt-0.5">{p.categories?.name || "Chưa phân loại"} · {SIZE_LABEL[p.target_size] || "Mọi cỡ"}</p>
                    <p className="font-extrabold text-pine-950 mt-0.5">{formatVND(p.price)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {stockControl(p)}
                  {usage(p)}
                </div>
                {rowActions(p)}
              </li>
            ))}
          </ul>

          <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">Dành cho</th>
                  <th className="p-3 text-right">Giá bán</th>
                  <th className="p-3">Tồn kho</th>
                  <th className="p-3">Nơi dùng</th>
                  <th className="p-3"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {visible.map((p) => (
                  <tr key={p.id} className={!p.is_active ? "opacity-60" : ""}>
                    <td className="p-3 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                          <ProductItemImage src={resolveImageUrl(p.images?.[0], "")} alt={p.name} placeholderColor="#E1EDE8" sizes="40px" showNote={false} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-pine-950 leading-snug line-clamp-2">{p.name}{!p.is_active && <span className="text-red-600"> · Đã ẩn</span>}</div>
                          <div className="text-[11px] text-bark-500 truncate">
                            {p.categories?.name || "Chưa phân loại"}
                            {hasNoImage(p) && <span className="text-amber-700 font-semibold"> · Chưa có ảnh</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <PetSpeciesIcon species={p.species as Species} variant="badge" size="xs" />
                      <div className="text-[11px] text-bark-500 mt-1">{p.species !== "cat" ? SIZE_LABEL[p.target_size] || "Mọi cỡ" : ""}{p.target_age !== "all" ? ` · ${AGE_LABEL[p.target_age]}` : ""}</div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="font-bold text-pine-950 tabular-nums">{formatVND(p.price)}</div>
                      {p.original_price && <div className="text-[11px] text-bark-500 line-through tabular-nums">{formatVND(p.original_price)}</div>}
                    </td>
                    <td className="p-3">{stockControl(p)}</td>
                    <td className="p-3">{usage(p)}</td>
                    <td className="p-3">{rowActions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button type="submit" form="product-form" loading={saving}>{editing ? "Lưu thay đổi" : "Thêm sản phẩm"}</Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} noValidate className="space-y-4 text-xs">
          <div>
            <label className={labelCls} htmlFor="p-name">Tên sản phẩm *</label>
            <input id="p-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={150} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-cat">Danh mục *</label>
              <select id="p-cat" className={input} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-species">Dành cho *</label>
              <select id="p-species" className={input} value={form.species} onChange={(e) => set("species", e.target.value as Species)}>
                <option value="dog">Chó</option>
                <option value="cat">Mèo</option>
                <option value="both">Cả chó và mèo</option>
              </select>
            </div>
            {form.species !== "cat" && (
              <div>
                <label className={labelCls} htmlFor="p-size">Cỡ chó phù hợp</label>
                <select id="p-size" className={input} value={form.targetSize} onChange={(e) => set("targetSize", e.target.value)}>
                  {Object.entries(SIZE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="p-age">Độ tuổi phù hợp</label>
              <select id="p-age" className={input} value={form.targetAge} onChange={(e) => set("targetAge", e.target.value)}>
                {Object.entries(AGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-price">Giá bán (₫) *</label>
              <input id="p-price" className={`${input} font-bold`} inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} placeholder="45000" />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-orig">Giá gốc (₫)</label>
              <input id="p-orig" className={input} inputMode="numeric" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value.replace(/\D/g, ""))} placeholder="Không giảm" />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-stock">{editing ? "Tồn kho" : "Tồn kho ban đầu"}</label>
              <input id="p-stock" className={`${input} disabled:bg-surface-muted`} inputMode="numeric" value={form.stock} disabled={!!editing} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-low">Báo sắp hết khi còn</label>
              <input id="p-low" className={input} inputMode="numeric" value={form.lowStock} onChange={(e) => set("lowStock", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          {editing && <p className="text-[11px] text-bark-500 -mt-2">Đổi tồn kho bằng nút +/− trong danh sách hoặc phiếu nhập kho, để mọi thay đổi đều có trong lịch sử kho.</p>}
          <div>
            <label className={labelCls} htmlFor="p-ing">Thành phần / chất liệu (cách nhau bởi dấu phẩy)</label>
            <input id="p-ing" className={input} value={form.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder="Ví dụ: thịt bò, khoai lang" />
            <p className="text-[11px] text-bark-500 mt-1">Dùng để cảnh báo dị ứng cho khách và loại món khi tuyển chọn hộp.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-desc">Mô tả</label>
            <textarea id="p-desc" rows={3} className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <ImageUpload label="Ảnh sản phẩm" folder="products" nameHint={form.name} value={form.image} onChange={(url) => set("image", url)} />
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <legend className={labelCls}>Nơi dùng *</legend>
            <label className="flex items-start gap-2.5 p-3 rounded-box border border-surface-border cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-pine-900" checked={form.isRetail} onChange={(e) => set("isRetail", e.target.checked)} />
              <span><span className="font-bold text-pine-950 block">Bán lẻ</span><span className="text-[11px] text-bark-500">Hiện trong Cửa hàng</span></span>
            </label>
            <label className="flex items-start gap-2.5 p-3 rounded-box border border-surface-border cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-pine-900" checked={form.isBoxItem} onChange={(e) => set("isBoxItem", e.target.checked)} />
              <span><span className="font-bold text-pine-950 block">Cho vào hộp</span><span className="text-[11px] text-bark-500">Xuất hiện khi tuyển chọn Mystery Box</span></span>
            </label>
          </fieldset>
          {formError && <p role="alert" className="p-2.5 rounded-box bg-red-50 border border-red-200 text-red-700 font-semibold">{formError}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!hiding}
        title="Ẩn sản phẩm"
        message={<>Ẩn <strong>{hiding?.name}</strong> khỏi Cửa hàng và danh sách tuyển chọn hộp? Đơn cũ vẫn giữ nguyên; có thể hiện lại bất cứ lúc nào.</>}
        confirmLabel="Ẩn sản phẩm"
        loading={!!hiding && busyId === hiding.id}
        onClose={() => setHiding(null)}
        onConfirm={async () => {
          if (!hiding) return;
          await updateFlag(hiding, { is_active: false }, `Đã ẩn "${hiding.name}".`);
          setHiding(null);
        }}
      />
    </div>
  );
}
