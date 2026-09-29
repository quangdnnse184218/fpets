"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BoxType, SubscriptionPlan } from "@/mock/boxTypes";
import { fetchBoxTypeBySlug, fetchPlanOptions } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { CheckCircle2, ShieldCheck, PlusCircle, PawPrint, Truck, ChevronDown, Gift } from "lucide-react";
import { EXCHANGE_POLICY, QUIZ_LENGTH, QUIZ_NAME } from "@/lib/copy";

const BOX_FAQ = [
  {
    q: "Tôi có được chọn món trong hộp không?",
    a: "Không, món trong hộp là bất ngờ. Đội ngũ FPETS chọn sát ngày giao dựa trên hồ sơ của bé; bạn có thể cập nhật sở thích và dị ứng trong hồ sơ thú cưng bất kỳ lúc nào.",
  },
  {
    q: "Bé không thích món trong hộp thì sao?",
    a: EXCHANGE_POLICY,
  },
  {
    q: "Mua 1 hộp khác gì gói định kỳ?",
    a: "Mua 1 hộp không cam kết, có thể trả COD. Gói 3 hoặc 6 hộp trả trước, giảm 10–15% mỗi hộp, freeship và giao mỗi tháng 1 hộp.",
  },
];

export default function BoxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { pets, addToCart, isLoggedIn } = useApp();

  const [box, setBox] = useState<BoxType | null>(null);
  const [loading, setLoading] = useState(true);

  // State chọn bé nhận box
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  // State chọn hình thức: mua 1 lần hay đăng ký gói
  const [purchaseMode, setPurchaseMode] = useState<'once' | 'subscription'>('once');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBoxTypeBySlug(slug), fetchPlanOptions()]).then(([data, planData]) => {
      setBox(data);
      setPlans(planData);
      const defaultPlan = planData.find((p) => p.cycles === 3) || planData[0];
      if (defaultPlan) setSelectedPlanId(defaultPlan.id);
      setLoading(false);
    });
  }, [slug]);

  // Chỉ bé cùng loài (và với chó: cùng size) mới nhận được loại box này — server cũng chặn lại
  const eligiblePets = box
    ? pets.filter((p) => p.species === box.species && (box.species !== "dog" || p.size === box.size))
    : [];

  useEffect(() => {
    if (eligiblePets.length > 0 && !eligiblePets.some((p) => p.id === selectedPetId)) {
      setSelectedPetId(eligiblePets[0].id);
    }
  }, [eligiblePets, selectedPetId]);

  const selectedPet = eligiblePets.find((p) => p.id === selectedPetId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Giá hiển thị để khách tham khảo; số tiền thật do server (subscribe_to_box) tính lại
  const unitDiscountedPrice = box && selectedPlan ? Math.round(box.basePrice * (1 - selectedPlan.discountPercent / 100)) : 0;
  const planTotalPrice = selectedPlan ? unitDiscountedPrice * selectedPlan.cycles : 0;
  const maxDiscount = plans.reduce((m, p) => Math.max(m, p.discountPercent), 0);

  const handleAddToCart = () => {
    if (!box) return;
    if (!isLoggedIn) {
      router.push(`/login?redirect=/boxes/${slug}`);
      return;
    }
    if (!selectedPet) return;
    addToCart({
      type: "box",
      boxTypeId: box.id,
      boxType: box,
      petId: selectedPet.id,
      petName: selectedPet.name,
      quantity: 1,
      unitPrice: box.basePrice,
    });
    setAddedSuccess(true);
    setTimeout(() => {
      router.push("/cart");
    }, 600);
  };

  const handleSubscribeCheckout = () => {
    if (!box || !selectedPlan) return;
    if (!isLoggedIn) {
      router.push(`/login?redirect=/boxes/${slug}`);
      return;
    }
    // Với subscription, dẫn thẳng vào checkout gói với các tham số
    router.push(`/checkout?type=subscription&box=${box.id}&pet=${selectedPet?.id}&plan=${selectedPlan.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10" aria-busy="true">
        <div className="h-3 w-48 rounded bg-surface-muted animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-6 aspect-square rounded-container bg-surface-muted animate-pulse" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-5 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="h-8 w-3/4 rounded bg-surface-muted animate-pulse" />
            <div className="h-16 rounded bg-surface-muted animate-pulse" />
            <div className="h-32 rounded-box bg-surface-muted animate-pulse" />
            <div className="h-24 rounded-box bg-surface-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-pine-950">Không tìm thấy loại box này</h1>
        <Link href="/boxes" className="text-pine-800 font-semibold text-sm hover:underline">Quay lại danh sách Box</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Breadcrumb đơn giản */}
      <nav className="text-xs text-bark-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-bark-800">Trang chủ</Link>
        <span>/</span>
        <Link href="/boxes" className="hover:text-bark-800">Mystery Box</Link>
        <span>/</span>
        <span className="text-pine-950 font-semibold">{box.name}</span>
      </nav>

      {/* Khối Thông tin chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cột Trái: Minh họa hộp */}
        <div className="lg:col-span-6 space-y-4">
          <div className="w-full aspect-square rounded-container overflow-hidden border border-surface-border relative bg-surface-muted shadow-sm">
            {/* TODO: thay bằng ảnh thật của FPETS khi có */}
            <Image
              src={box.imageUrl}
              alt={box.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="p-4 rounded-box bg-surface-card border border-surface-border text-xs space-y-2">
            <div className="font-bold text-pine-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-grass-700" />
              <span>Chính sách đổi món</span>
            </div>
            <p className="text-bark-600 leading-relaxed">{EXCHANGE_POLICY}</p>
          </div>
        </div>

        {/* Cột Phải: Cấu hình mua & Chọn Pet */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="inline-block text-xs font-semibold text-pine-900 bg-pine-50 px-2.5 py-1 rounded-tag border border-pine-200">
              {box.sizeLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display mt-1.5">
              {box.name}
            </h1>
            <p className="text-sm text-bark-600 mt-2 leading-relaxed">
              {box.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-tag bg-surface-muted text-bark-700">{box.itemCount}</span>
              <span className="px-2.5 py-1 rounded-tag bg-grass-50 text-grass-800">Trị giá sản phẩm từ {formatVND(box.minRetailValue)}</span>
            </div>
          </div>

          {/* 1. BƯỚC 1: Chọn Bé nhận Box (Bắt buộc) */}
          <div className="p-4 rounded-box bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-pine-950">
                1. Hộp này dành cho bé cưng nào?
              </label>
              <Link
                href="/quiz"
                className="text-[11px] font-bold text-honey-700 hover:text-honey-800 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm bé qua {QUIZ_NAME}</span>
              </Link>
            </div>

            {eligiblePets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {eligiblePets.map((pet) => {
                  const isSelected = pet.id === selectedPetId;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`p-3 rounded-box text-left border transition-all ${
                        isSelected
                          ? "border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10"
                          : "border-surface-border hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-4 h-4 text-pine-900 shrink-0" />
                        <span className="text-sm font-bold text-pine-950">{pet.name}</span>
                      </div>
                      <div className="text-[11px] text-bark-500 mt-1 truncate">
                        {pet.breed} · {pet.weight}kg
                      </div>
                      {pet.allergies.length > 0 && (
                        <div className="text-[10px] text-honey-700 mt-1 truncate font-medium">
                          Dị ứng: {pet.allergies.join(", ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-bark-600 bg-surface-muted p-3 rounded-box">
                {!isLoggedIn
                  ? "Đăng nhập để chọn bé nhận hộp."
                  : pets.length === 0
                  ? `Bạn chưa có hồ sơ thú cưng. Làm ${QUIZ_NAME} (${QUIZ_LENGTH}) để tạo hồ sơ trước khi đặt hộp.`
                  : `Chưa có bé nào hợp với hộp này (dành cho ${box.sizeLabel.toLowerCase()}). Hãy chọn loại box khác hoặc thêm hồ sơ thú cưng mới.`}
              </div>
            )}
          </div>

          {/* 2. BƯỚC 2: Chọn Hình thức Mua */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-pine-950 block">
              2. Chọn hình thức đặt hộp:
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPurchaseMode('once')}
                className={`p-3.5 rounded-box border text-left transition-all ${
                  purchaseMode === 'once'
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <div className="text-xs font-bold text-pine-950">Mua thử 1 hộp</div>
                <div className="text-base font-extrabold text-pine-950 font-display mt-0.5">
                  {formatVND(box.basePrice)}
                </div>
                <div className="text-[11px] text-bark-500 mt-1">Không cam kết dài hạn</div>
              </button>

              <button
                type="button"
                onClick={() => setPurchaseMode('subscription')}
                className={`p-3.5 rounded-box border text-left transition-all relative ${
                  purchaseMode === 'subscription'
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-tag bg-honey-600 text-white text-[10px] font-bold">
                  Tiết kiệm đến {maxDiscount}%
                </span>
                <div className="text-xs font-bold text-pine-950">Gói định kỳ</div>
                <div className="text-base font-extrabold text-pine-950 font-display mt-0.5">
                  Từ {formatVND(Math.round(box.basePrice * (1 - maxDiscount / 100)))}/hộp
                </div>
                <div className="text-[11px] text-grass-700 font-medium mt-1">Freeship từ gói 3 hộp</div>
              </button>
            </div>
          </div>

          {/* Chi tiết khi chọn Gói định kỳ */}
          {purchaseMode === 'subscription' && (
            <div className="p-4 rounded-box bg-surface-muted/60 border border-surface-border space-y-3">
              <label className="text-xs font-bold text-pine-950 block">
                Chọn gói cam kết nhận hộp:
              </label>

              <div className="grid grid-cols-3 gap-2">
                {plans.map((plan) => {
                  const isPlanSelected = plan.id === selectedPlanId;
                  const discountedPerBox = Math.round(box.basePrice * (1 - plan.discountPercent / 100));

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-2.5 rounded-box border text-center transition-all ${
                        isPlanSelected
                          ? 'border-pine-900 bg-pine-50 font-bold text-pine-950 ring-1 ring-pine-900/20'
                          : 'border-surface-border bg-surface-card hover:bg-surface-muted text-bark-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{plan.name}</div>
                      <div className="text-[11px] text-pine-900 mt-0.5 font-bold">
                        {formatVND(discountedPerBox)}
                      </div>
                      <div className="text-[10px] text-grass-700 mt-0.5 font-medium">
                        {plan.discountPercent > 0 ? `Giảm ${plan.discountPercent}%` : 'Giá gốc'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-bark-500 pt-1 leading-relaxed">
                * {selectedPlan?.description}
              </div>
            </div>
          )}

          {/* Nút Đặt hàng / Thêm vào giỏ */}
          <div className="pt-2">
            {purchaseMode === 'once' ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addedSuccess || (isLoggedIn && !selectedPet)}
                className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-grass-300" />
                    <span>Đã thêm vào giỏ hàng! Đang chuyển hướng...</span>
                  </>
                ) : !isLoggedIn ? (
                  <span>Đăng nhập để đặt hộp ({formatVND(box.basePrice)})</span>
                ) : (
                  <span>Thêm vào giỏ hàng ({formatVND(box.basePrice)})</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubscribeCheckout}
                disabled={isLoggedIn && !selectedPet}
                className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {!isLoggedIn
                    ? `Đăng nhập để đăng ký ${selectedPlan?.name || "gói"}`
                    : `Đăng ký ${selectedPlan?.name || "gói"} cho bé ${selectedPet?.name || ""} (${formatVND(planTotalPrice)})`}
                </span>
              </button>
            )}
          </div>
          {!isLoggedIn && (
            <p className="text-[11px] text-bark-500 text-center">
              Mystery Box cần tài khoản để gắn với hồ sơ của bé. Sản phẩm lẻ ở Shop mua được không cần đăng nhập.
            </p>
          )}
        </div>
      </div>

      {/* Nội dung chi tiết: món ví dụ, giao hàng, câu hỏi thường gặp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {box.typicalItems.length > 0 && (
          <section className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
            <h2 className="text-base font-bold text-pine-950 flex items-center gap-2">
              <Gift className="w-4 h-4 text-honey-600" />
              <span>Ví dụ món có thể có trong hộp</span>
            </h2>
            <ul className="space-y-2 text-sm text-bark-700">
              {box.typicalItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-bark-500">Món thật trong hộp thay đổi theo hồ sơ của bé và các món đã gửi trước đó.</p>
          </section>
        )}

        <section className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
          <h2 className="text-base font-bold text-pine-950 flex items-center gap-2">
            <Truck className="w-4 h-4 text-pine-800" />
            <span>Giao hàng</span>
          </h2>
          <ul className="space-y-2 text-sm text-bark-700">
            <li>Mua 1 hộp: giao 1–2 ngày nội thành TP.HCM, 3–5 ngày tỉnh khác.</li>
            <li>Gói định kỳ: giao mỗi tháng 1 hộp, đợt đầu tháng (ngày 1–5) hoặc giữa tháng (ngày 15–20).</li>
            <li>Phí ship 25.000₫ nội thành TP.HCM, 35.000₫ tỉnh khác; freeship đơn từ 500.000₫ và gói 3, 6 hộp.</li>
          </ul>
          <Link href="/reviews" className="inline-block text-xs font-bold text-pine-900 hover:underline">Xem đánh giá của khách đã nhận hộp</Link>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-pine-950 font-display">Câu hỏi thường gặp</h2>
        <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          {BOX_FAQ.map((item) => (
            <details key={item.q} className="group p-4">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold text-pine-950">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 text-bark-500 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs sm:text-sm text-bark-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
