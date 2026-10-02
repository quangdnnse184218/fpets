"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { fetchBoxTypes, fetchPlanOptions } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { PREMIUM_ITEMS, QUIZ_LENGTH, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";
import { planUnitPrice } from "@/lib/pricing";
import { useApp } from "@/context/AppContext";
import { BoxType, SubscriptionPlan } from "@/types/models";

type Species = "all" | "dog" | "cat";
type Tier = "all" | "standard" | "premium";
type DogSize = "all" | "small" | "large";
type Sort = "default" | "price_asc" | "price_desc";

const isPremium = (box: BoxType) => box.slug.includes("premium");

export default function BoxesPage() {
  return (
    <Suspense>
      <BoxesContent />
    </Suspense>
  );
}

function BoxesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pets } = useApp();
  const [boxes, setBoxes] = useState<BoxType[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [species, setSpecies] = useState<Species>("all");
  const [tier, setTier] = useState<Tier>("all");
  const [dogSize, setDogSize] = useState<DogSize>("all");
  const [petId, setPetId] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [filterOpen, setFilterOpen] = useState(false);
  // Đến từ trang Gói định kỳ (?plan=3): giữ gói đã chọn khi sang trang chi tiết hộp
  const [planParam, setPlanParam] = useState("");

  // Lọc sẵn theo link: /boxes?tier=premium, /boxes?species=cat (menu, trang chủ, hồ sơ thú cưng)
  useEffect(() => {
    const t = searchParams.get("tier");
    const s = searchParams.get("species");
    setTier(t === "premium" || t === "standard" ? t : "all");
    setSpecies(s === "dog" || s === "cat" ? s : "all");
    const plan = searchParams.get("plan");
    setPlanParam(plan && /^[0-9]+$/.test(plan) ? plan : "");
  }, [searchParams]);

  useEffect(() => {
    Promise.all([fetchBoxTypes(), fetchPlanOptions()]).then(([boxData, planData]) => {
      setBoxes(boxData);
      setPlans(planData);
      setLoading(false);
    });
  }, []);

  const selectedPet = pets.find((p) => p.id === petId);
  const selectedPlan = plans.find((p) => String(p.cycles) === planParam);

  // Chọn "Hợp với bé X" thì lọc theo loài và size của bé, thay cho 2 bộ lọc tay
  const fits = (box: BoxType) => {
    if (selectedPet) return box.species === selectedPet.species && (box.species !== "dog" || box.size === selectedPet.size);
    if (species !== "all" && box.species !== species) return false;
    if (dogSize !== "all" && (box.species !== "dog" || box.size !== dogSize)) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const list = boxes.filter((box) => fits(box) && (tier === "all" || (tier === "premium") === isPremium(box)));
    if (sort === "price_asc") return [...list].sort((a, b) => a.basePrice - b.basePrice);
    if (sort === "price_desc") return [...list].sort((a, b) => b.basePrice - a.basePrice);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, species, tier, dogSize, petId, sort, pets]);

  const activeCount = (species !== "all" ? 1 : 0) + (tier !== "all" ? 1 : 0) + (dogSize !== "all" ? 1 : 0) + (petId ? 1 : 0);
  const reset = () => {
    setSpecies("all");
    setTier("all");
    setDogSize("all");
    setPetId("");
    router.replace(planParam ? `/boxes?plan=${planParam}` : "/boxes");
  };

  const minPrice = (premium: boolean) => {
    const prices = boxes.filter((b) => isPremium(b) === premium).map((b) => b.basePrice);
    return prices.length ? Math.min(...prices) : null;
  };
  const minValue = (premium: boolean) => {
    const values = boxes.filter((b) => isPremium(b) === premium).map((b) => b.minRetailValue);
    return values.length ? Math.min(...values) : null;
  };

  const filterPanel = (
    <div className="space-y-5">
      {pets.length > 0 && (
        <FilterGroup label="Hợp với bé của bạn">
          <FilterOption checked={!petId} onSelect={() => setPetId("")} label="Tất cả hộp" name="box-pet" />
          {pets.map((pet) => (
            <FilterOption
              key={pet.id}
              name="box-pet"
              checked={petId === pet.id}
              onSelect={() => setPetId(pet.id)}
              label={`Bé ${pet.name}`}
              hint={pet.species === "cat" ? "Mèo" : pet.size === "small" ? "Chó dưới 10 kg" : "Chó từ 10 kg"}
            />
          ))}
        </FilterGroup>
      )}

      {!selectedPet && (
        <>
          <FilterGroup label="Dành cho">
            {([["all", "Tất cả"], ["dog", "Chó"], ["cat", "Mèo"]] as const).map(([value, label]) => (
              <FilterOption
                key={value}
                name="box-species"
                checked={species === value}
                onSelect={() => {
                  setSpecies(value);
                  if (value === "cat") setDogSize("all");
                }}
                label={label}
                count={loading ? undefined : boxes.filter((b) => value === "all" || b.species === value).length}
              />
            ))}
          </FilterGroup>

          {species !== "cat" && (
            <FilterGroup label="Cân nặng của chó">
              {([["all", "Mọi cân nặng"], ["small", "Dưới 10 kg"], ["large", "Từ 10 kg"]] as const).map(([value, label]) => (
                <FilterOption key={value} name="box-size" checked={dogSize === value} onSelect={() => setDogSize(value)} label={label} />
              ))}
            </FilterGroup>
          )}
        </>
      )}

      <FilterGroup label="Loại hộp">
        {([["all", "Tất cả"], ["standard", "Tiêu chuẩn"], ["premium", "Premium"]] as const).map(([value, label]) => (
          <FilterOption
            key={value}
            name="box-tier"
            checked={tier === value}
            onSelect={() => setTier(value)}
            label={label}
            hint={value === "standard" ? STANDARD_ITEMS : value === "premium" ? PREMIUM_ITEMS : undefined}
          />
        ))}
      </FilterGroup>

      {activeCount > 0 && (
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 min-h-9 text-xs font-bold text-pine-900 hover:underline">
          <X className="w-3.5 h-3.5" /> Xóa bộ lọc
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="space-y-1.5 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Mystery Box</h1>
        <p className="text-sm text-bark-600 leading-relaxed">
          Mỗi hộp gồm đồ ăn, đồ chơi và món chăm sóc, chọn theo loài, cân nặng, độ tuổi và dị ứng của bé. Chọn hộp đúng với bé, mua thử 1 hộp hoặc đăng ký nhận hằng tháng.
        </p>
      </header>

      {selectedPlan && (
        <div className="p-2.5 sm:p-3.5 rounded-box bg-pine-50 border border-pine-200 text-sm text-pine-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            Bạn đang chọn <strong>{selectedPlan.name}</strong>
            {selectedPlan.discountPercent > 0 ? ` (giảm ${selectedPlan.discountPercent}% mỗi hộp)` : ""}. Chọn loại hộp cho bé để tiếp tục.
          </span>
          <Link href="/subscription" className="text-xs font-bold text-pine-900 underline underline-offset-2">Đổi gói</Link>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[232px_1fr] lg:gap-8 lg:items-start">
        {/* Bộ lọc: cột trái trên desktop, khối thu gọn trên mobile */}
        <aside className="lg:sticky lg:top-20">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className="lg:hidden w-full min-h-11 px-3.5 rounded-box border border-surface-border bg-surface-card flex items-center justify-between text-sm font-bold text-pine-950"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
            </span>
            <span className="text-xs font-medium text-bark-500">{filterOpen ? "Thu gọn" : "Mở"}</span>
          </button>
          <div className={`${filterOpen ? "block" : "hidden"} lg:block mt-3 lg:mt-0 p-4 rounded-container bg-surface-card border border-surface-border`}>
            <h2 className="hidden lg:block text-sm font-bold text-pine-950 pb-3 mb-4 border-b border-surface-border">Bộ lọc</h2>
            {filterPanel}
          </div>
        </aside>

        <div className="mt-4 lg:mt-0 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-bark-600" aria-live="polite">
              {loading ? "Đang tải…" : `${filtered.length} loại hộp${selectedPet ? ` hợp với bé ${selectedPet.name}` : ""}`}
            </p>
            <label className="flex items-center gap-2 text-xs text-bark-600">
              <span className="hidden sm:inline">Sắp xếp</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="min-h-9 px-2.5 rounded-box border border-surface-border bg-white text-xs font-medium text-pine-950"
              >
                <option value="default">Mặc định</option>
                <option value="price_asc">Giá thấp đến cao</option>
                <option value="price_desc">Giá cao đến thấp</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-container bg-surface-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center rounded-container bg-surface-card border border-surface-border space-y-3">
              <p className="text-sm text-bark-600">Chưa có loại hộp nào phù hợp bộ lọc này.</p>
              <button type="button" onClick={reset} className="text-sm font-bold text-pine-900 underline underline-offset-2">Xóa bộ lọc</button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((box) => {
                const premium = isPremium(box);
                const href = `/boxes/${box.slug}${planParam ? `?plan=${planParam}` : ""}`;
                const planPrice = selectedPlan ? planUnitPrice(box.basePrice, selectedPlan.discountPercent) : null;
                return (
                  <li key={box.id}>
                    <Link
                      href={href}
                      className="group h-full flex sm:flex-col rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 hover:shadow-md transition-all"
                    >
                      {/* Mobile: ảnh vuông nhỏ bên trái để thẻ gọn; từ sm trở lên ảnh nằm trên */}
                      <div className="relative w-28 shrink-0 sm:w-auto sm:aspect-[16/9] bg-surface-muted overflow-hidden">
                        <Image
                          src={box.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 40vw, 300px"
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 sm:p-3.5 sm:p-4 flex flex-col flex-1 gap-2 sm:gap-2.5 min-w-0">
                        <div className="space-y-1">
                          {/* Nhãn phân hạng dạng chữ: không icon, không huy hiệu nổi trên ảnh */}
                          <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${premium ? "text-amber-800" : "text-bark-500"}`}>
                            {premium ? "Premium" : "Tiêu chuẩn"}
                            <span className="font-medium normal-case tracking-normal text-bark-500"> · {box.sizeLabel}</span>
                          </p>
                          <h3 className="text-base font-bold text-pine-950 leading-snug group-hover:text-pine-800">{box.name}</h3>
                        </div>
                        <p className="text-xs text-bark-600">
                          {box.itemCount} · trị giá từ {formatVND(box.minRetailValue)}
                        </p>
                        <div className="mt-auto pt-2.5 sm:pt-3 border-t border-surface-border flex items-end justify-between gap-2">
                          <div>
                            <span className="text-lg font-extrabold text-pine-950 font-display">{formatVND(planPrice ?? box.basePrice)}</span>
                            <span className="text-xs text-bark-500"> / hộp</span>
                            {planPrice !== null && planPrice < box.basePrice && (
                              <span className="block text-[11px] text-bark-500 line-through">{formatVND(box.basePrice)}</span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-pine-900">
                            Xem hộp <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* So sánh 2 loại hộp */}
      <section aria-labelledby="compare-heading" className="space-y-3">
        <h2 id="compare-heading" className="text-lg sm:text-xl font-extrabold text-pine-950 font-display">Tiêu chuẩn hay Premium?</h2>
        <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border text-pine-950">
                <th scope="col" className="p-2.5 sm:p-3.5 w-[30%] text-xs font-bold text-bark-500 uppercase tracking-wide">So sánh</th>
                <th scope="col" className="p-2.5 sm:p-3.5 font-bold">Box Tiêu chuẩn</th>
                <th scope="col" className="p-2.5 sm:p-3.5 font-bold">Box Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-bark-700">
              <tr>
                <th scope="row" className="p-2.5 sm:p-3.5 font-medium text-bark-600">Giá 1 hộp</th>
                <td className="p-2.5 sm:p-3.5 font-bold text-pine-950">{minPrice(false) ? formatVND(minPrice(false)!) : "—"}</td>
                <td className="p-2.5 sm:p-3.5 font-bold text-pine-950">{minPrice(true) ? formatVND(minPrice(true)!) : "—"}</td>
              </tr>
              <tr>
                <th scope="row" className="p-2.5 sm:p-3.5 font-medium text-bark-600">Số món</th>
                <td className="p-2.5 sm:p-3.5">{STANDARD_ITEMS}</td>
                <td className="p-2.5 sm:p-3.5">{PREMIUM_ITEMS}</td>
              </tr>
              <tr>
                <th scope="row" className="p-2.5 sm:p-3.5 font-medium text-bark-600">Trị giá sản phẩm tối thiểu</th>
                <td className="p-2.5 sm:p-3.5">{minValue(false) ? formatVND(minValue(false)!) : "—"}</td>
                <td className="p-2.5 sm:p-3.5">{minValue(true) ? formatVND(minValue(true)!) : "—"}</td>
              </tr>
              <tr>
                <th scope="row" className="p-2.5 sm:p-3.5 font-medium text-bark-600">Trong hộp có</th>
                <td className="p-2.5 sm:p-3.5">Đồ ăn hoặc bánh thưởng, đồ chơi, 1 món chăm sóc hoặc phụ kiện</td>
                <td className="p-2.5 sm:p-3.5">Như Tiêu chuẩn, thêm đồ chơi giấu thức ăn và món chăm sóc dùng hằng ngày</td>
              </tr>
              <tr>
                <th scope="row" className="p-2.5 sm:p-3.5 font-medium text-bark-600">Hợp khi</th>
                <td className="p-2.5 sm:p-3.5">Muốn thử trước, hoặc bổ sung bánh thưởng và đồ chơi đều đặn</td>
                <td className="p-2.5 sm:p-3.5">Muốn nhiều món hơn trong một lần nhận</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-5 sm:p-6 rounded-container bg-pine-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold font-display">Chưa biết chọn hộp nào cho bé?</h2>
          <p className="text-xs sm:text-sm text-pine-200">
            Trả lời {QUIZ_NAME} ({QUIZ_LENGTH}), FPETS gợi ý hộp và gói phù hợp.
          </p>
        </div>
        <Link href="/quiz" className="shrink-0 inline-flex items-center justify-center min-h-11 px-5 rounded-box bg-white hover:bg-pine-50 text-pine-950 font-bold text-sm transition-colors">
          Làm {QUIZ_NAME}
        </Link>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-bold text-bark-800 mb-1.5">{label}</legend>
      {children}
    </fieldset>
  );
}

function FilterOption({
  name,
  label,
  hint,
  count,
  checked,
  onSelect,
}: {
  name: string;
  label: string;
  hint?: string;
  count?: number;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 min-h-10 px-2.5 rounded-box cursor-pointer text-sm transition-colors ${
        checked ? "bg-pine-50 text-pine-950 font-semibold" : "text-bark-700 hover:bg-surface-muted"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="w-4 h-4 accent-pine-900 shrink-0" />
      <span className="flex-1 min-w-0">
        {label}
        {hint && <span className="block text-[11px] font-normal text-bark-500">{hint}</span>}
      </span>
      {count !== undefined && <span className="text-[11px] text-bark-500">{count}</span>}
    </label>
  );
}
