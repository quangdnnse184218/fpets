"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Cat, Check, Dog } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { fetchBoxTypes, fetchPlanOptions } from "@/lib/catalog";
import { formatVND, formatWeight } from "@/lib/formatters";
import { planUnitPrice } from "@/lib/pricing";
import { calcShippingFee } from "@/lib/shipping";
import { BUSINESS } from "@/config/business";
import { AGE_LABEL, ALLERGY_OPTIONS, BREED_SUGGESTIONS, PREFERENCE_OPTIONS, normalizeText, sizeFromWeight, weightRange } from "@/lib/petOptions";
import { Button } from "@/components/ui/Button";
import { BoxType, Pet, SubscriptionPlan } from "@/types/models";

// Câu trả lời quiz được giữ tạm khi khách phải đăng ký/đăng nhập giữa chừng,
// quay lại /quiz?resume=1 sẽ tự tạo Pet Profile và tiếp tục đặt hộp (SPEC §3).
const QUIZ_PENDING_KEY = "fpets_quiz_pending";
const TOTAL_STEPS = 7;

type Species = "dog" | "cat";
type Tier = "standard" | "premium";

interface QuizAnswers {
  species: Species;
  petName: string;
  gender: Pet["gender"];
  breed: string;
  weight: number;
  ageGroup: Pet["ageGroup"];
  allergies: string[];
  preferences: string[];
  energy: string;
  tier: Tier;
  // 0 = mua thử 1 hộp (thêm vào giỏ); 3 hoặc 6 = đăng ký gói
  planCycles: number;
}

// Câu 6: mức độ gặm (chó) / vận động (mèo), giúp chọn đồ chơi đủ bền và đúng kiểu chơi
// noteLabel: tiêu đề dòng ghi chú lưu vào hồ sơ bé (admin đọc khi tuyển chọn hộp)
const ENERGY_OPTIONS: Record<Species, { question: string; noteLabel: string; options: string[] }> = {
  dog: { question: "Bé gặm đồ chơi mạnh cỡ nào?", noteLabel: "Lực gặm", options: ["Gặm nhẹ, giữ đồ chơi lâu", "Vừa phải", "Gặm rất mạnh, mau hỏng đồ"] },
  cat: { question: "Bé vận động nhiều không?", noteLabel: "Mức vận động", options: ["Thích nằm, ít chạy nhảy", "Vừa phải", "Chạy nhảy, săn đồ chơi cả ngày"] },
};

const AGE_HINT: Record<Pet["ageGroup"], string> = {
  puppy_kitten: "Món mềm, dễ nhai; đồ chơi nhỏ và an toàn",
  adult: "Năng động, cần đồ chơi vận động và bánh thưởng",
  senior: "Món dễ tiêu, đồ chơi nhẹ nhàng",
};


function pickBox(boxTypes: BoxType[], species: Species, weight: number, tier: Tier): BoxType | undefined {
  const size = sizeFromWeight(species, weight);
  const matches = boxTypes.filter((b) => b.species === species && (species === "cat" || b.size === size));
  return matches.find((b) => b.slug.includes("premium") === (tier === "premium")) || matches[0];
}

const optionCard = (selected: boolean) =>
  `w-full text-left p-4 rounded-box border transition-colors ${
    selected ? "border-pine-900 bg-pine-50/70 ring-1 ring-pine-900/20" : "border-surface-border bg-surface-card hover:bg-surface-muted"
  }`;
const chip = (selected: boolean, tone: "red" | "pine" = "pine") =>
  `min-h-10 px-3.5 rounded-full border text-sm transition-colors ${
    selected
      ? tone === "red"
        ? "border-red-300 bg-red-50 text-red-800 font-semibold"
        : "border-pine-900 bg-pine-900 text-white font-semibold"
      : "border-surface-border bg-surface-card text-bark-700 hover:bg-surface-muted"
  }`;
const inputClass = (invalid: boolean) =>
  `w-full min-h-11 px-3.5 rounded-box border bg-white text-sm focus:outline-none ${invalid ? "border-red-400 focus:border-red-600" : "border-surface-border focus:border-pine-900"}`;

export default function PetQuizPage() {
  const router = useRouter();
  const { addPet, updatePet, addToCart, pets, isLoggedIn, isLoadingAuth } = useApp();
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const resumeHandled = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [tried, setTried] = useState(false);

  // Không điền sẵn câu trả lời: khách phải tự chọn để kết quả đúng với bé
  const [species, setSpecies] = useState<Species | null>(null);
  const [petName, setPetName] = useState("");
  const [gender, setGender] = useState<Pet["gender"] | null>(null);
  const [breed, setBreed] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [ageGroup, setAgeGroup] = useState<Pet["ageGroup"] | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noAllergy, setNoAllergy] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [energy, setEnergy] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);
  const [planCycles, setPlanCycles] = useState<number | null>(null);

  useEffect(() => {
    fetchBoxTypes().then(setBoxTypes);
    fetchPlanOptions().then(setPlans);
    const plan = Number(new URLSearchParams(window.location.search).get("plan"));
    if (plan === 3 || plan === 6) setPlanCycles(plan);
    if (plan === 1) setPlanCycles(0);
  }, []);

  // Chuyển câu: đưa tiêu điểm về tiêu đề câu hỏi cho bàn phím và trình đọc màn hình
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, showResult]);

  const weight = Number(weightInput.replace(",", "."));
  const range = weightRange(species || "dog");
  const weightValid = weightInput.trim() !== "" && Number.isFinite(weight) && weight >= range.min && weight <= range.max;
  const nameValid = petName.trim().length >= 1 && petName.trim().length <= 30;

  const stepError = (s: number): string => {
    switch (s) {
      case 1:
        return species ? "" : "Chọn bé là chó hay mèo.";
      case 2:
        if (!nameValid) return "Nhập tên của bé (tối đa 30 ký tự).";
        return gender ? "" : "Chọn giới tính của bé.";
      case 3:
        return weightValid ? "" : `Nhập cân nặng của bé, từ ${range.min} đến ${range.max} kg.`;
      case 4:
        return ageGroup ? "" : "Chọn độ tuổi của bé.";
      case 5:
        return allergies.length > 0 || noAllergy ? "" : "Chọn thành phần bé dị ứng, hoặc chọn “Bé không dị ứng gì”.";
      case 6:
        if (preferences.length === 0) return "Chọn ít nhất 1 sở thích của bé.";
        return energy ? "" : "Chọn 1 mức phù hợp với bé.";
      case 7:
        if (!tier) return "Chọn loại hộp bạn muốn.";
        return planCycles === null ? "Chọn cách nhận hộp." : "";
      default:
        return "";
    }
  };

  const goNext = () => {
    if (stepError(step)) {
      setTried(true);
      return;
    }
    setTried(false);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else setShowResult(true);
  };
  const goBack = () => {
    setTried(false);
    setStep(Math.max(1, step - 1));
  };

  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const answers = (): QuizAnswers | null =>
    species && gender && ageGroup && tier && planCycles !== null && weightValid && nameValid
      ? { species, petName: petName.trim(), gender, breed: breed.trim(), weight, ageGroup, allergies, preferences, energy, tier, planCycles }
      : null;

  const current = answers();
  const recommendedBox = current ? pickBox(boxTypes, current.species, current.weight, current.tier) : undefined;
  const otherTierBox = current ? pickBox(boxTypes, current.species, current.weight, current.tier === "premium" ? "standard" : "premium") : undefined;
  const selectedPlan = current && current.planCycles > 0 ? plans.find((p) => p.cycles === current.planCycles) : undefined;
  // Bé trùng tên và loài đã có hồ sơ: cập nhật hồ sơ đó thay vì tạo trùng
  const existingPet = useMemo(
    () => (species ? pets.find((p) => p.species === species && normalizeText(p.name.trim()) === normalizeText(petName.trim())) : undefined),
    [pets, species, petName]
  );

  const savePetAndContinue = async (a: QuizAnswers) => {
    const box = pickBox(boxTypes, a.species, a.weight, a.tier);
    if (!box) return;
    setSaving(true);
    setSaveError("");
    try {
      const duplicate = pets.find((p) => p.species === a.species && normalizeText(p.name.trim()) === normalizeText(a.petName));
      // Giữ ghi chú khách tự viết trong hồ sơ cũ, chỉ thay dòng lực gặm / mức vận động
      const keptNotes = (duplicate?.notes || "")
        .split("\n")
        .filter((line) => line.trim() && !/^(Mức vận động:|Lực gặm:|Bé vận động nhiều không\?|Bé gặm đồ chơi mạnh cỡ nào\?)/.test(line.trim()));
      const profile = {
        name: a.petName,
        species: a.species,
        breed: a.breed,
        weight: a.weight,
        size: sizeFromWeight(a.species, a.weight),
        ageGroup: a.ageGroup,
        ageLabel: AGE_LABEL[a.ageGroup],
        gender: a.gender,
        allergies: a.allergies,
        preferences: a.preferences,
        notes: [...keptNotes, `${ENERGY_OPTIONS[a.species].noteLabel}: ${a.energy}`].join("\n"),
      };
      let petId = duplicate?.id;
      if (duplicate) await updatePet(duplicate.id, profile);
      else petId = (await addPet(profile)).id;

      const plan = a.planCycles > 0 ? plans.find((p) => p.cycles === a.planCycles) : undefined;
      if (plan) {
        router.push(`/checkout?type=subscription&box=${box.id}&pet=${petId}&plan=${plan.id}`);
        return;
      }
      await addToCart({ type: "box", boxTypeId: box.id, boxType: box, petId, petName: a.petName, quantity: 1, unitPrice: box.basePrice });
      router.push("/cart");
    } catch {
      setSaveError("Không lưu được hồ sơ bé, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndOrder = async () => {
    if (!current || !recommendedBox) return;
    if (!isLoggedIn) {
      try {
        window.sessionStorage.setItem(QUIZ_PENDING_KEY, JSON.stringify(current));
      } catch {
        // sessionStorage bị chặn: khách sẽ phải làm lại quiz sau khi đăng ký
      }
      router.push(`/register?redirect=${encodeURIComponent("/quiz?resume=1")}`);
      return;
    }
    await savePetAndContinue(current);
  };

  // Quay lại sau khi đăng ký/đăng nhập: tự lưu câu trả lời thành Pet Profile
  useEffect(() => {
    if (resumeHandled.current || isLoadingAuth || !isLoggedIn || boxTypes.length === 0 || plans.length === 0) return;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(QUIZ_PENDING_KEY);
      window.sessionStorage.removeItem(QUIZ_PENDING_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;
    resumeHandled.current = true;
    try {
      const a = JSON.parse(raw) as QuizAnswers;
      if (!a.species || !a.petName || !a.tier) return;
      setSpecies(a.species);
      setPetName(a.petName);
      setGender(a.gender);
      setBreed(a.breed || "");
      setWeightInput(String(a.weight));
      setAgeGroup(a.ageGroup);
      setAllergies(a.allergies || []);
      setNoAllergy((a.allergies || []).length === 0);
      setPreferences(a.preferences || []);
      setEnergy(a.energy || "");
      setTier(a.tier);
      setPlanCycles(a.planCycles);
      setShowResult(true);
      savePetAndContinue(a);
    } catch {
      // Dữ liệu tạm hỏng: bỏ qua, khách làm lại quiz
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingAuth, isLoggedIn, boxTypes, plans]);

  const error = tried ? stepError(step) : "";
  const callName = petName.trim() || "bé";
  const boxOf = (t: Tier) => (species && weightValid ? pickBox(boxTypes, species, weight, t) : boxTypes.find((b) => b.slug.includes("premium") === (t === "premium")));

  if (showResult) {
    if (!current || !recommendedBox) {
      return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm text-bark-500">Đang tải danh sách hộp…</div>;
    }
    const unit = selectedPlan ? planUnitPrice(recommendedBox.basePrice, selectedPlan.discountPercent) : recommendedBox.basePrice;
    const total = selectedPlan ? unit * selectedPlan.cycles : recommendedBox.basePrice;
    const reasons = [
      current.species === "cat"
        ? `Bé là mèo ${formatWeight(current.weight)}: hộp cho mèo dùng chung cho mọi cân nặng.`
        : `Bé là chó ${formatWeight(current.weight)}: hộp ${current.weight >= 10 ? "cho chó từ 10 kg, đồ chơi cỡ lớn và chịu lực gặm" : "cho chó dưới 10 kg, đồ chơi vừa miệng"}.`,
      `${AGE_LABEL[current.ageGroup]}: ${AGE_HINT[current.ageGroup].toLowerCase()}.`,
      current.allergies.length > 0 ? `Loại các món có: ${current.allergies.join(", ").toLowerCase()}.` : "Bé không dị ứng nên được chọn từ toàn bộ danh mục.",
      `Ưu tiên theo sở thích: ${current.preferences.join(", ").toLowerCase()}.`,
    ];
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <div className="space-y-1.5">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display focus:outline-none">
            Hộp phù hợp với bé {current.petName}
          </h1>
          <p className="text-sm text-bark-600">
            {current.species === "dog" ? "Chó" : "Mèo"} · {current.gender} · {formatWeight(current.weight)} · {AGE_LABEL[current.ageGroup]}
            {current.breed ? ` · ${current.breed}` : ""}
          </p>
        </div>

        <div className="rounded-container bg-surface-card border border-pine-900 overflow-hidden">
          <div className="flex gap-4 p-4 sm:p-5">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-box overflow-hidden bg-surface-muted shrink-0">
              <Image src={recommendedBox.imageUrl} alt="" fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className={`text-xs font-bold uppercase tracking-[0.08em] ${current.tier === "premium" ? "text-amber-800" : "text-bark-500"}`}>
                {current.tier === "premium" ? "Premium" : "Tiêu chuẩn"}
              </p>
              <h2 className="text-lg font-bold text-pine-950 leading-snug">{recommendedBox.name}</h2>
              <p className="text-xs text-bark-600">
                {recommendedBox.itemCount} · trị giá từ {formatVND(recommendedBox.minRetailValue)}
              </p>
              <p className="pt-1">
                <span className="text-xl font-extrabold text-pine-950 font-display">{formatVND(unit)}</span>
                <span className="text-xs text-bark-500"> / hộp</span>
                {selectedPlan && unit < recommendedBox.basePrice && (
                  <span className="ml-2 text-xs text-bark-500 line-through">{formatVND(recommendedBox.basePrice)}</span>
                )}
              </p>
            </div>
          </div>
          <dl className="px-4 sm:px-5 py-3 border-t border-surface-border bg-surface-muted/50 text-sm space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-bark-600">Cách nhận</dt>
              <dd className="font-semibold text-pine-950 text-right">{selectedPlan ? `${selectedPlan.name}, mỗi tháng 1 hộp` : "Mua thử 1 hộp"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-bark-600">Phí vận chuyển</dt>
              <dd className="font-semibold text-pine-950 text-right">
                {selectedPlan?.freeShipping || calcShippingFee(null, total) === 0 ? "Miễn phí" : "Tính theo địa chỉ ở bước đặt hàng"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 pt-1.5 border-t border-surface-border">
              <dt className="font-bold text-pine-950">{selectedPlan ? `Trả trước ${selectedPlan.cycles} hộp` : "Tạm tính"}</dt>
              <dd className="font-extrabold text-pine-950">{formatVND(total)}</dd>
            </div>
          </dl>
        </div>

        <section className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-2.5">
          <h2 className="text-sm font-bold text-pine-950">Vì sao FPETS gợi ý hộp này</h2>
          <ul className="space-y-2 text-sm text-bark-700">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <Check className="w-4 h-4 text-grass-700 shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {otherTierBox && otherTierBox.id !== recommendedBox.id && (
          <p className="text-sm text-bark-600">
            {current.tier === "standard" ? "Muốn nhiều món hơn?" : "Muốn thử với chi phí thấp hơn?"}{" "}
            <button
              type="button"
              onClick={() => setTier(current.tier === "standard" ? "premium" : "standard")}
              className="font-bold text-pine-900 underline underline-offset-2"
            >
              Đổi sang {otherTierBox.name} ({formatVND(otherTierBox.basePrice)}/hộp, {otherTierBox.itemCount})
            </button>
          </p>
        )}

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={handleSaveAndOrder} loading={saving} loadingText="Đang lưu hồ sơ…">
            {!isLoggedIn
              ? "Đăng ký để lưu hồ sơ và đặt hộp"
              : selectedPlan
                ? `${existingPet ? "Cập nhật" : "Lưu"} hồ sơ và đăng ký ${selectedPlan.name}`
                : `${existingPet ? "Cập nhật" : "Lưu"} hồ sơ và thêm hộp vào giỏ`}
          </Button>
          {!isLoggedIn && (
            <p className="text-xs text-bark-500 text-center">
              Đã có tài khoản?{" "}
              <Link
                href={`/login?redirect=${encodeURIComponent("/quiz?resume=1")}`}
                onClick={() => {
                  try {
                    window.sessionStorage.setItem(QUIZ_PENDING_KEY, JSON.stringify(current));
                  } catch {
                    // bỏ qua nếu trình duyệt chặn sessionStorage
                  }
                }}
                className="font-bold text-pine-900 underline underline-offset-2"
              >
                Đăng nhập
              </Link>{" "}
              để dùng lại câu trả lời này.
            </p>
          )}
          {existingPet && isLoggedIn && (
            <p className="text-xs text-bark-500 text-center">Bạn đã có hồ sơ bé {existingPet.name}; câu trả lời mới sẽ cập nhật vào hồ sơ đó.</p>
          )}
          {saveError && <p role="alert" className="text-sm text-red-700 font-semibold text-center">{saveError}</p>}
          <div className="flex items-center justify-center gap-5 text-sm">
            <button type="button" onClick={() => setShowResult(false)} className="font-semibold text-bark-600 hover:text-pine-900 min-h-11">
              Sửa câu trả lời
            </button>
            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                setStep(1);
                setSpecies(null);
                setPetName("");
                setGender(null);
                setBreed("");
                setWeightInput("");
                setAgeGroup(null);
                setAllergies([]);
                setNoAllergy(false);
                setPreferences([]);
                setEnergy("");
              }}
              className="font-semibold text-bark-600 hover:text-pine-900 min-h-11"
            >
              Làm quiz cho bé khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-xs text-bark-500">
          <span className="font-semibold text-pine-900">Pet Quiz</span>
          <span>Câu {step}/{TOTAL_STEPS}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-border overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step} aria-label="Tiến độ quiz">
          <div className="h-full bg-pine-900 rounded-full transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
        noValidate
        className="p-5 sm:p-7 rounded-container bg-surface-card border border-surface-border space-y-5"
      >
        {step === 1 && (
          <>
            <QuestionTitle ref={headingRef} title="Bé của bạn là chó hay mèo?" hint="FPETS có hộp riêng cho chó nhỏ, chó lớn và mèo." />
            <div className="grid grid-cols-2 gap-3">
              {([["dog", "Chó", Dog], ["cat", "Mèo", Cat]] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={species === value}
                  onClick={() => {
                    if (species !== value) {
                      setPreferences([]);
                      setEnergy("");
                    }
                    setSpecies(value);
                    setTried(false);
                    setStep(2);
                  }}
                  className={`${optionCard(species === value)} flex flex-col items-center gap-2 py-6`}
                >
                  <Icon className="w-10 h-10 text-pine-900" />
                  <span className="text-base font-bold text-pine-950">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <QuestionTitle ref={headingRef} title="Bé tên gì?" hint={BUSINESS.nameCard ? "Tên bé được in trên thiệp trong hộp." : "FPETS dùng tên bé trên hồ sơ, đơn hàng và khi chọn món cho bé."} />
            <div>
              <label htmlFor="quiz-name" className="text-xs font-bold text-bark-800 block mb-1">Tên của bé <span className="text-red-600">*</span></label>
              <input
                id="quiz-name"
                type="text"
                value={petName}
                maxLength={30}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Ví dụ: Bơ, Miu, Lu"
                aria-invalid={tried && !nameValid}
                className={inputClass(tried && !nameValid)}
                autoComplete="off"
              />
            </div>
            <fieldset>
              <legend className="text-xs font-bold text-bark-800 mb-1.5">Giới tính <span className="text-red-600">*</span></legend>
              <div className="grid grid-cols-2 gap-3">
                {(["Đực", "Cái"] as const).map((g) => (
                  <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)} className={`${optionCard(gender === g)} !py-3 text-center text-sm font-semibold text-pine-950`}>
                    {g === "Đực" ? "♂ Đực" : "♀ Cái"}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <QuestionTitle
              ref={headingRef}
              title={`Bé ${callName} nặng bao nhiêu?`}
              hint={species === "dog" ? "Cân nặng quyết định cỡ đồ chơi: dưới 10 kg dùng hộp chó nhỏ, từ 10 kg dùng hộp chó lớn." : "Cân nặng giúp FPETS chọn khẩu phần bánh thưởng phù hợp."}
            />
            <div>
              <label htmlFor="quiz-weight" className="text-xs font-bold text-bark-800 block mb-1">Cân nặng (kg) <span className="text-red-600">*</span></label>
              <input
                id="quiz-weight"
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
                placeholder={species === "dog" ? "Ví dụ: 6.5" : "Ví dụ: 4"}
                aria-invalid={tried && !weightValid}
                className={inputClass(tried && !weightValid)}
              />
              {weightValid && species === "dog" && (
                <p className="text-xs text-pine-900 font-semibold mt-1.5">{weight >= 10 ? "Hộp cho chó từ 10 kg" : "Hộp cho chó dưới 10 kg"}</p>
              )}
            </div>
            <div>
              <label htmlFor="quiz-breed" className="text-xs font-bold text-bark-800 block mb-1">Giống (không bắt buộc)</label>
              <input
                id="quiz-breed"
                type="text"
                list="quiz-breeds"
                value={breed}
                maxLength={40}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={species === "dog" ? "Poodle, Corgi, chó cỏ…" : "Mèo ta, Anh lông ngắn…"}
                className={inputClass(false)}
              />
              <datalist id="quiz-breeds">
                {BREED_SUGGESTIONS[species || "dog"].map((b) => <option key={b} value={b} />)}
              </datalist>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <QuestionTitle ref={headingRef} title={`Bé ${callName} bao nhiêu tuổi?`} hint="Độ tuổi quyết định độ cứng của bánh thưởng và loại đồ chơi." />
            <div className="space-y-2.5">
              {(Object.keys(AGE_LABEL) as Pet["ageGroup"][]).map((age) => (
                <button key={age} type="button" aria-pressed={ageGroup === age} onClick={() => setAgeGroup(age)} className={optionCard(ageGroup === age)}>
                  <span className="block text-sm font-bold text-pine-950">{age === "adult" ? "1 – 7 tuổi" : AGE_LABEL[age]}</span>
                  <span className="block text-xs text-bark-600 mt-0.5">{AGE_HINT[age]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <QuestionTitle ref={headingRef} title={`Bé ${callName} dị ứng với gì?`} hint="FPETS không chọn món có thành phần bạn đánh dấu. Chọn tất cả thành phần cần tránh." />
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={allergies.includes(item)}
                  onClick={() => {
                    setAllergies((prev) => toggle(prev, item));
                    setNoAllergy(false);
                  }}
                  className={chip(allergies.includes(item), "red")}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={noAllergy}
              onClick={() => {
                setNoAllergy(!noAllergy);
                setAllergies([]);
              }}
              className={`${optionCard(noAllergy)} !py-3 text-sm font-semibold text-pine-950`}
            >
              Bé không dị ứng gì
            </button>
          </>
        )}

        {step === 6 && species && (
          <>
            <QuestionTitle ref={headingRef} title={`Bé ${callName} thích gì?`} hint="Chọn tất cả những gì bé thích để hộp đầu tiên hợp ý bé." />
            <div className="flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS[species].map((item) => (
                <button key={item} type="button" aria-pressed={preferences.includes(item)} onClick={() => setPreferences((prev) => toggle(prev, item))} className={chip(preferences.includes(item))}>
                  {item}
                </button>
              ))}
            </div>
            <fieldset className="pt-4 border-t border-surface-border">
              <legend className="text-sm font-bold text-pine-950 mb-2">{ENERGY_OPTIONS[species].question} <span className="text-red-600">*</span></legend>
              <div className="space-y-2">
                {ENERGY_OPTIONS[species].options.map((opt) => (
                  <button key={opt} type="button" aria-pressed={energy === opt} onClick={() => setEnergy(opt)} className={`${optionCard(energy === opt)} !py-3 text-sm font-medium text-pine-950`}>
                    {opt}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 7 && (
          <>
            <QuestionTitle ref={headingRef} title="Bạn muốn hộp như thế nào?" hint="Cả hai loại đều tránh thành phần bé dị ứng và chọn đồ chơi đúng cỡ của bé." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["standard", "premium"] as const).map((t) => {
                const box = boxOf(t);
                return (
                  <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)} className={optionCard(tier === t)}>
                    <span className={`block text-xs font-bold uppercase tracking-[0.08em] ${t === "premium" ? "text-amber-800" : "text-bark-500"}`}>{t === "premium" ? "Premium" : "Tiêu chuẩn"}</span>
                    <span className="block text-base font-extrabold text-pine-950 mt-1">{box ? `${formatVND(box.basePrice)} / hộp` : "—"}</span>
                    <span className="block text-xs text-bark-600 mt-1">
                      {box ? `${box.itemCount}, trị giá từ ${formatVND(box.minRetailValue)}` : ""}
                    </span>
                    <span className="block text-xs text-bark-600 mt-1">{t === "premium" ? "Nhiều món hơn, có đồ chơi giấu thức ăn" : "Đủ đồ ăn, đồ chơi và 1 món chăm sóc"}</span>
                  </button>
                );
              })}
            </div>
            <fieldset className="pt-4 border-t border-surface-border">
              <legend className="text-sm font-bold text-pine-950 mb-2">Bạn muốn nhận thế nào? <span className="text-red-600">*</span></legend>
              <div className="space-y-2">
                <button type="button" aria-pressed={planCycles === 0} onClick={() => setPlanCycles(0)} className={`${optionCard(planCycles === 0)} !py-3`}>
                  <span className="block text-sm font-bold text-pine-950">Mua thử 1 hộp</span>
                  <span className="block text-xs text-bark-600 mt-0.5">Không cam kết, có thể trả tiền khi nhận hàng</span>
                </button>
                {plans.filter((p) => p.cycles > 1).map((p) => (
                  <button key={p.id} type="button" aria-pressed={planCycles === p.cycles} onClick={() => setPlanCycles(p.cycles)} className={`${optionCard(planCycles === p.cycles)} !py-3`}>
                    <span className="block text-sm font-bold text-pine-950">
                      {p.name}, mỗi tháng 1 hộp
                      {p.discountPercent > 0 && <span className="ml-2 text-xs font-bold text-grass-700">Giảm {p.discountPercent}%</span>}
                    </span>
                    <span className="block text-xs text-bark-600 mt-0.5">
                      Trả trước một lần{p.freeShipping ? ", miễn phí vận chuyển" : ""}{p.birthdayGift ? ", tặng quà sinh nhật cho bé" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}

        {step > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <button type="button" onClick={goBack} className="min-h-11 px-2 text-sm font-semibold text-bark-600 hover:text-pine-900 flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
            <Button type="submit">{step === TOTAL_STEPS ? "Xem hộp phù hợp" : "Tiếp tục"}</Button>
          </div>
        )}
      </form>
    </div>
  );
}

const QuestionTitle = React.forwardRef<HTMLHeadingElement, { title: string; hint?: string }>(function QuestionTitle({ title, hint }, ref) {
  return (
    <div className="space-y-1">
      <h1 ref={ref} tabIndex={-1} className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display focus:outline-none">
        {title}
      </h1>
      {hint && <p className="text-sm text-bark-600">{hint}</p>}
    </div>
  );
});
