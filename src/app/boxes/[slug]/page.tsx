"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchBoxTypeBySlug, fetchPlanOptions } from "@/lib/catalog";
import { formatVND, formatWeight } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { Check, CheckCircle2, Info, ShieldCheck, ShoppingCart, PlusCircle, PawPrint, Truck, ChevronDown, Gift } from "lucide-react";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { DISLIKE_POLICY, EXCHANGE_POLICY, QUIZ_LENGTH, QUIZ_NAME } from "@/lib/copy";
import { DEFAULT_PLANS, PlanLite, discountSentence, freeShippingPlans } from "@/lib/planCopy";
import { planUnitPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { DeliverySchedule, SCHEDULE_LABEL, deliveryWindowLabel, recommendedSchedule, secondDeliveryWindow } from "@/lib/deliverySchedule";
import { BoxType, SubscriptionPlan } from "@/types/models";
import { DELIVERY_DAYS, SHIPPING_POLICY } from "@/lib/shipping";

// Mức giảm của gói lấy từ bảng subscription_plans (cùng nguồn với trang Gói định kỳ, giỏ hàng, FAQ)
const buildBoxFaq = (plans: PlanLite[]) => [
  {
    q: "Tôi có được chọn món trong hộp không?",
    a: "Không, món trong hộp là bất ngờ. Đội ngũ FPETS chọn sát ngày giao dựa trên hồ sơ của bé; bạn có thể cập nhật sở thích và dị ứng trong hồ sơ thú cưng bất kỳ lúc nào.",
  },
  {
    q: "Bé không thích món trong hộp thì sao?",
    a: DISLIKE_POLICY,
  },
  {
    q: "Mua 1 hộp khác gì gói định kỳ?",
    a: `Mua 1 hộp không cam kết, có thể trả COD. Gói định kỳ trả trước và giao mỗi tháng 1 hộp: ${discountSentence(plans)}, ${freeShippingPlans(plans)} được miễn phí vận chuyển.`,
  },
];

// Bố cục 2 cột: cột ảnh hẹp, cột đặt hộp rộng hơn. Khung chờ tải dùng chung để trang không giật khi dữ liệu về.
const LAYOUT_GRID = "grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 md:gap-8 lg:gap-12 items-start";
// Ảnh hộp gốc tỉ lệ 4:3 nên hiện đủ khung thay vì cắt thành ô vuông; điện thoại thấp hơn một chút (3:2)
const IMAGE_FRAME = "relative w-full aspect-[3/2] md:aspect-[4/3] rounded-container overflow-hidden border border-surface-border bg-surface-muted";

function ExchangePolicyCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-box bg-surface-card border border-surface-border text-xs space-y-2 ${className}`}>
      <div className="font-bold text-pine-950 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-grass-700" aria-hidden="true" />
        <span>Chính sách đổi món</span>
      </div>
      <p className="text-bark-600 leading-relaxed">{EXCHANGE_POLICY}</p>
    </div>
  );
}

export default function BoxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { pets, cart, addToCart, isLoggedIn, isLoadingAuth, isCartReady, user } = useApp();
  const { show } = useToast();

  const [box, setBox] = useState<BoxType | null>(null);
  const [loading, setLoading] = useState(true);

  // State chọn bé nhận box
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  // State chọn hình thức: mua 1 lần hay đăng ký gói
  const [purchaseMode, setPurchaseMode] = useState<'once' | 'subscription'>('once');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  // Nút đang xử lý: "add" = thêm vào giỏ, "buy" = mua ngay
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  // Gợi ý sẵn đợt giao để hộp thứ 2 cách hộp đầu (gửi ngay) gần 1 tháng nhất
  const [schedule, setSchedule] = useState<DeliverySchedule>(() => recommendedSchedule());
  // Gói còn hiệu lực theo bé: cảnh báo khi mua trùng
  const [activeSubs, setActiveSubs] = useState<Record<string, { planName: string; remaining: number }>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBoxTypeBySlug(slug), fetchPlanOptions()]).then(([data, planData]) => {
      setBox(data);
      setPlans(planData);
      // Đến từ trang Gói định kỳ (?plan=N) thì chọn sẵn gói đó; mặc định gợi ý gói 3 hộp
      const planParam = Number(new URLSearchParams(window.location.search).get("plan"));
      const fromLink = planData.find((p) => p.cycles === planParam);
      const defaultPlan = fromLink || planData.find((p) => p.cycles === 3) || planData[0];
      if (defaultPlan) setSelectedPlanId(defaultPlan.id);
      if (fromLink) setPurchaseMode("subscription");
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!user.id) return;
    createClient()
      .from("subscriptions")
      .select("pet_id, remaining_cycles, subscription_plans(name)")
      .eq("user_id", user.id)
      .in("status", ["cho_thanh_toan", "dang_hoat_dong", "tam_dung", "qua_han"])
      .then(({ data }) => {
        const map: Record<string, { planName: string; remaining: number }> = {};
        (data as unknown as { pet_id: string; remaining_cycles: number; subscription_plans: { name: string } | null }[] | null)?.forEach((s) => {
          map[s.pet_id] = { planName: s.subscription_plans?.name || "gói định kỳ", remaining: s.remaining_cycles };
        });
        setActiveSubs(map);
      });
  }, [user.id]);

  // Hộp đầu gửi ngay sau khi thanh toán; đợt giao khách chọn áp dụng từ hộp thứ 2
  const secondBox = secondDeliveryWindow(schedule);

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

  // Hồ sơ thú cưng tải cùng lúc với giỏ hàng; chưa tải xong thì chưa kết luận "không có bé phù hợp"
  const petsReady = !isLoadingAuth && isCartReady;
  // Lý do chưa đặt được hộp: đã đăng nhập nhưng chưa có hồ sơ bé, hoặc không bé nào đúng loài/cỡ của hộp.
  // Khi bị chặn, trang nói rõ lý do và đưa lối đi tiếp thay vì chỉ để nút mờ.
  const blocked: "no_pet" | "no_match" | null =
    !isLoggedIn || !petsReady || eligiblePets.length > 0 ? null : pets.length === 0 ? "no_pet" : "no_match";
  const tierParam = box?.slug.includes("premium") ? "premium" : "standard";
  const petGroup = (p: { species: string; size: string }) => (p.species === "cat" ? "mèo" : p.size === "small" ? "chó nhỏ dưới 10 kg" : "chó lớn từ 10 kg");

  // Giá hiển thị để khách tham khảo; số tiền thật do server (subscribe_to_box) tính lại
  const unitDiscountedPrice = box && selectedPlan ? planUnitPrice(box.basePrice, selectedPlan.discountPercent) : 0;
  const planTotalPrice = selectedPlan ? unitDiscountedPrice * selectedPlan.cycles : 0;
  const maxDiscount = plans.reduce((m, p) => Math.max(m, p.discountPercent), 0);

  // Giỏ đã có đúng hộp này cho đúng bé đang chọn (một đơn có thể có nhiều hộp, nhưng không trùng hộp cho cùng một bé)
  const alreadyInCart = !!box && !!selectedPet && cart.some((c) => c.type === "box" && c.boxTypeId === box.id && c.petId === selectedPet.id);

  // Đưa hộp đang xem vào giỏ. Trả về false khi chưa đủ điều kiện (chưa đăng nhập thì chuyển sang trang đăng nhập).
  const putBoxInCart = async (mode: "add" | "buy"): Promise<boolean> => {
    if (!box) return false;
    if (!isLoggedIn) {
      router.push(`/login?redirect=/boxes/${slug}`);
      return false;
    }
    if (!selectedPet) return false;
    if (alreadyInCart) return true;
    setBusy(mode);
    await addToCart({
      type: "box",
      boxTypeId: box.id,
      boxType: box,
      petId: selectedPet.id,
      petName: selectedPet.name,
      quantity: 1,
      unitPrice: box.basePrice,
    });
    return true;
  };

  // Mua ngay: thêm vào giỏ rồi sang thẳng trang thanh toán (giỏ có món khác thì thanh toán cùng lúc)
  const handleBuyNow = async () => {
    if (await putBoxInCart("buy")) router.push("/checkout");
  };

  // Thêm vào giỏ rồi ở lại trang, khách tự chọn xem giỏ hay mua tiếp
  const handleAddToCart = async () => {
    const existed = alreadyInCart;
    if (!box || !(await putBoxInCart("add")) || !selectedPet) return;
    setBusy(null);
    show(existed ? `${box.name} cho bé ${selectedPet.name} đã có trong giỏ` : `Đã thêm ${box.name} cho bé ${selectedPet.name} vào giỏ`, {
      actions: [
        { label: "Xem giỏ", onClick: () => router.push("/cart") },
        { label: "Mua tiếp", onClick: () => router.push("/shop") },
      ],
      duration: 7000,
    });
  };

  const handleSubscribeCheckout = () => {
    if (!box || !selectedPlan) return;
    if (!isLoggedIn) {
      router.push(`/login?redirect=/boxes/${slug}`);
      return;
    }
    // Với subscription, dẫn thẳng vào checkout gói với các tham số
    router.push(`/checkout?type=subscription&box=${box.id}&pet=${selectedPet?.id}&plan=${selectedPlan.id}&schedule=${schedule}`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10" aria-busy="true">
        <div className="h-3 w-48 rounded bg-surface-muted animate-pulse" />
        <div className={LAYOUT_GRID}>
          <div className={`${IMAGE_FRAME} animate-pulse`} />
          <div className="space-y-4">
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb đơn giản */}
      <nav className="text-xs text-bark-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-bark-800">Trang chủ</Link>
        <span>/</span>
        <Link href="/boxes" className="hover:text-bark-800">Mystery Box</Link>
        <span>/</span>
        <span className="text-pine-950 font-semibold">{box.name}</span>
      </nav>

      {/* Khối Thông tin chính */}
      <div className={LAYOUT_GRID}>
        {/* Cột trái: ảnh hộp, giữ nguyên vị trí khi cuộn phần đặt hộp bên phải */}
        <div className="space-y-4 md:sticky md:top-24">
          <div className={IMAGE_FRAME}>
            <Image
              src={box.imageUrl}
              alt={box.name}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 40vw, 380px"
              className="object-cover"
              priority
            />
          </div>
          <ExchangePolicyCard className="hidden md:block" />
        </div>

        {/* Cột phải: chọn bé, hình thức đặt và nút mua */}
        <div className="min-w-0 space-y-6">
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
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-tag bg-surface-muted text-bark-700">{box.itemCount}</span>
              <span className="px-2.5 py-1 rounded-tag bg-grass-50 text-grass-800">Trị giá sản phẩm từ {formatVND(box.minRetailValue)}</span>
            </div>
          </div>

          {/* 1. BƯỚC 1: Chọn Bé nhận Box (Bắt buộc) */}
          <div className="p-4 rounded-box bg-surface-card border border-surface-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <label className="text-xs font-bold text-pine-950">
                1. Hộp này dành cho bé cưng nào?
              </label>
              <Link
                href="/quiz"
                className="min-h-9 text-xs font-bold text-pine-900 hover:underline flex items-center gap-1 whitespace-nowrap"
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
                      aria-pressed={isSelected}
                      className={`relative p-3 rounded-box text-left border transition-all ${
                        isSelected
                          ? "border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10"
                          : "border-surface-border hover:bg-surface-muted"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pine-900 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                      <div className="flex items-center gap-2 pr-6">
                        <PawPrint className="w-4 h-4 text-pine-900 shrink-0" />
                        <span className="text-sm font-bold text-pine-950">{pet.name}</span>
                      </div>
                      <div className="text-xs text-bark-500 mt-1 truncate">
                        {[pet.breed, pet.weight ? formatWeight(pet.weight) : ""].filter(Boolean).join(" · ")}
                      </div>
                      {pet.allergies.length > 0 && (
                        <div className="text-[11px] text-red-700 mt-1 truncate font-medium">
                          Dị ứng: {pet.allergies.join(", ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : !petsReady ? (
              <div className="h-16 rounded-box bg-surface-muted animate-pulse" aria-hidden="true" />
            ) : !blocked ? (
              <div className="text-sm text-bark-700 bg-surface-muted p-3 rounded-box">Đăng nhập để chọn bé nhận hộp.</div>
            ) : (
              <div role="status" className="p-3.5 rounded-box bg-honey-100 border border-honey-200 space-y-2">
                <p className="flex items-start gap-2 text-sm font-bold text-pine-950">
                  <Info className="w-4 h-4 mt-0.5 text-honey-700 shrink-0" aria-hidden="true" />
                  <span>{blocked === "no_pet" ? "Chưa đặt được: bạn chưa có hồ sơ thú cưng" : "Chưa đặt được hộp này cho các bé của bạn"}</span>
                </p>
                {blocked === "no_pet" ? (
                  <p className="text-sm text-bark-800 leading-relaxed">
                    Mỗi hộp gắn với một bé để FPETS chọn đúng món và tránh thành phần bé dị ứng. Làm {QUIZ_NAME} ({QUIZ_LENGTH}) để tạo hồ sơ rồi quay lại đặt hộp.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-bark-800 leading-relaxed">
                      Hộp này chỉ dành cho <strong>{box.sizeLabel.toLowerCase()}</strong>. Các bé của bạn: {pets.map((p) => `${p.name} (${petGroup(p)})`).join(", ")}.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {pets.slice(0, 4).map((p) => (
                        <Link key={p.id} href={`/boxes?pet=${p.id}&tier=${tierParam}`} className={buttonClass("secondary", "sm", "!text-[13px]")}>
                          Xem hộp cho bé {p.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {selectedPet && activeSubs[selectedPet.id] && (
            <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Bé {selectedPet.name} đang có {activeSubs[selectedPet.id].planName} (còn {activeSubs[selectedPet.id].remaining} hộp).
              Bạn vẫn có thể mua thêm 1 hộp lẻ, hoặc <Link href="/my-account/subscriptions" className="font-bold underline">xem gói hiện tại</Link>.
            </div>
          )}

          {/* 2. BƯỚC 2: Chọn Hình thức Mua */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-pine-950 block">
              2. Chọn hình thức đặt hộp:
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPurchaseMode('once')}
                aria-pressed={purchaseMode === 'once'}
                className={`p-3.5 rounded-box border text-left transition-all ${
                  purchaseMode === 'once'
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <div className="text-xs font-bold text-pine-950">{purchaseMode === 'once' ? "✓ " : ""}Mua 1 hộp</div>
                <div className="text-base font-extrabold text-pine-950 font-display mt-0.5">
                  {formatVND(box.basePrice)}
                </div>
                <div className="text-xs text-bark-500 mt-1">Không cam kết dài hạn</div>
              </button>

              <button
                type="button"
                onClick={() => setPurchaseMode('subscription')}
                aria-pressed={purchaseMode === 'subscription'}
                className={`p-3.5 rounded-box border text-left transition-all relative ${
                  purchaseMode === 'subscription'
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-tag bg-grass-100 text-grass-800 border border-grass-200 text-[11px] font-bold">
                  Tiết kiệm đến {maxDiscount}%
                </span>
                <div className="text-xs font-bold text-pine-950">{purchaseMode === 'subscription' ? "✓ " : ""}Đăng ký định kỳ</div>
                <div className="text-base font-extrabold text-pine-950 font-display mt-0.5">
                  Từ {formatVND(planUnitPrice(box.basePrice, maxDiscount))}/hộp
                </div>
                <div className="text-xs text-grass-700 font-medium mt-1">Gói 1, 3, 6 hộp · freeship gói 3, 6</div>
              </button>
            </div>
          </div>

          {/* Chi tiết khi chọn Gói định kỳ */}
          {purchaseMode === 'subscription' && (
            <div className="p-4 rounded-box bg-surface-muted/60 border border-surface-border space-y-3">
              <span className="text-xs font-bold text-pine-950 block">
                Chọn gói:
              </span>

              <div className="grid grid-cols-3 gap-2">
                {plans.map((plan) => {
                  const isPlanSelected = plan.id === selectedPlanId;
                  const discountedPerBox = planUnitPrice(box.basePrice, plan.discountPercent);

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      aria-pressed={isPlanSelected}
                      className={`min-h-11 p-2.5 rounded-box border text-center transition-all ${
                        isPlanSelected
                          ? 'border-pine-900 bg-pine-50 font-bold text-pine-950 ring-1 ring-pine-900/20'
                          : 'border-surface-border bg-surface-card hover:bg-surface-muted text-bark-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{isPlanSelected ? "✓ " : ""}{plan.name}</div>
                      <div className="text-xs text-pine-900 mt-0.5 font-bold">
                        {formatVND(discountedPerBox)}
                      </div>
                      <div className="text-[11px] text-grass-700 mt-0.5 font-medium">
                        {plan.discountPercent > 0 ? `Giảm ${plan.discountPercent}%` : 'Giá gốc'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-bark-500 pt-1 leading-relaxed">
                * {selectedPlan?.description}
              </div>

              <div className="pt-3 border-t border-surface-border space-y-2">
                <span className="text-xs font-bold text-pine-950 block">3. Chọn đợt giao cho các hộp sau:</span>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SCHEDULE_LABEL) as DeliverySchedule[]).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setSchedule(sc)}
                      aria-pressed={schedule === sc}
                      className={`min-h-11 px-3 rounded-box border text-xs font-bold ${schedule === sc ? "border-pine-900 bg-pine-50 text-pine-950" : "border-surface-border bg-surface-card text-bark-700"}`}
                    >
                      {schedule === sc ? "✓ " : ""}{SCHEDULE_LABEL[sc]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-bark-700 leading-relaxed">
                  <strong className="text-pine-950">Hộp đầu tiên gửi ngay sau khi thanh toán</strong> (giao {DELIVERY_DAYS}).{" "}
                  {(selectedPlan?.cycles || 1) > 1
                    ? `Hộp thứ 2 giao ${deliveryWindowLabel(secondBox.start, schedule)}, các hộp sau cách nhau 1 tháng.`
                    : `Nếu gia hạn, hộp tiếp theo giao ${deliveryWindowLabel(secondBox.start, schedule)}.`}
                </p>
              </div>
            </div>
          )}

          {/* Nút Đặt hàng / Thêm vào giỏ. Không đặt được thì đổi thành nút dẫn tới việc cần làm, kèm một dòng lý do. */}
          <div className="pt-2 space-y-2">
            {isLoggedIn && !petsReady ? (
              <div className="w-full min-h-12 rounded-box bg-surface-muted animate-pulse" aria-hidden="true" />
            ) : blocked === "no_pet" ? (
              <>
                <ButtonLink href="/quiz" size="lg" className="w-full">Tạo hồ sơ bé</ButtonLink>
                <p className="text-sm text-bark-700 text-center">Cần có hồ sơ thú cưng trước khi đặt hộp.</p>
              </>
            ) : blocked === "no_match" ? (
              <>
                <ButtonLink href={`/boxes?pet=${pets[0].id}&tier=${tierParam}`} size="lg" className="w-full">Xem hộp hợp với bé {pets[0].name}</ButtonLink>
                <p className="text-sm text-bark-700 text-center">
                  Chưa thêm vào giỏ được vì hộp này không đúng loài hoặc cân nặng của các bé bạn đã khai.{" "}
                  <Link href="/quiz" className="font-bold text-pine-900 underline underline-offset-2">Thêm bé khác</Link>
                </p>
              </>
            ) : purchaseMode === 'once' ? (
              !isLoggedIn ? (
                <Button size="lg" className="w-full" onClick={handleAddToCart}>Đăng nhập để mua</Button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="secondary" size="lg" className="!px-3" onClick={handleAddToCart} loading={busy === "add"} loadingText="Đang thêm…" disabled={busy !== null || !selectedPet}>
                    <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Thêm vào giỏ
                  </Button>
                  <Button size="lg" className="!px-3" onClick={handleBuyNow} loading={busy === "buy"} loadingText="Đang chuyển…" disabled={busy !== null || !selectedPet}>
                    Mua ngay
                  </Button>
                </div>
              )
            ) : (
              <Button size="lg" className="w-full" onClick={handleSubscribeCheckout} disabled={isLoggedIn && !selectedPet}>
                {!isLoggedIn ? "Đăng nhập để đăng ký" : `Đăng ký ${selectedPlan?.name || "gói"} · ${formatVND(planTotalPrice)}`}
              </Button>
            )}
          </div>
          {!isLoggedIn && (
            <p className="text-xs text-bark-500 text-center">
              Mystery Box cần tài khoản để gắn với hồ sơ của bé.
            </p>
          )}
          {/* Điện thoại: chính sách nằm sau nút mua để tên hộp và giá hiện ngay dưới ảnh */}
          <ExchangePolicyCard className="md:hidden" />
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
            <p className="text-xs text-bark-600">Món thật trong hộp thay đổi theo cân nặng, dị ứng của bé và các món bé đã nhận trước đó.</p>
          </section>
        )}

        <section className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
          <h2 className="text-base font-bold text-pine-950 flex items-center gap-2">
            <Truck className="w-4 h-4 text-pine-800" />
            <span>Giao hàng</span>
          </h2>
          <ul className="space-y-2 text-sm text-bark-700">
            <li>Mua 1 hộp: giao {DELIVERY_DAYS}.</li>
            <li>Gói định kỳ: hộp đầu gửi ngay sau khi thanh toán; các hộp sau giao mỗi tháng 1 hộp, đợt đầu tháng (ngày 1–5) hoặc giữa tháng (ngày 15–20).</li>
            <li>{SHIPPING_POLICY}</li>
          </ul>
          <Link href="/reviews" className="inline-block text-xs font-bold text-pine-900 hover:underline">Xem đánh giá của khách đã nhận hộp</Link>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-pine-950 font-display">Câu hỏi thường gặp</h2>
        <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          {buildBoxFaq(plans.length > 0 ? plans : DEFAULT_PLANS).map((item) => (
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
