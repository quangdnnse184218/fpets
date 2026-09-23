"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { BOX_TYPES } from "@/mock/boxTypes";
import { formatVND } from "@/lib/formatters";
import { Sparkles, ArrowLeft, CheckCircle2, Gift, Dog, Cat, PackageOpen, PawPrint, Baby, Zap, Moon } from "lucide-react";

export default function PetQuizPage() {
  const router = useRouter();
  const { addPet, addToCart } = useApp();

  // Trạng thái Form 5 câu hỏi
  const [step, setStep] = useState(1);
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState<'Đực' | 'Cái'>('Đực');
  const [weight, setWeight] = useState<number>(8);
  const [ageGroup, setAgeGroup] = useState<'puppy_kitten' | 'adult' | 'senior'>('adult');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  const [showResult, setShowResult] = useState(false);

  // Danh sách dị ứng phổ biến theo loài
  const allergyOptions = species === 'dog'
    ? ["Gà", "Bò", "Ngũ cốc / Lúa mì", "Trứng", "Sữa bò", "Hải sản"]
    : ["Gà", "Cá biển", "Sữa động vật", "Ngũ cốc", "Thịt bò"];

  const dogPreferences = ["Gặm xương giòn", "Đồ chơi dây thừng kéo co", "Thịt cừu sấy", "Bóng nảy cao", "Pate bổ sung dinh dưỡng"];
  const catPreferences = ["Cỏ bạc hà Catnip", "Pate cá hồi", "Cần câu lông vũ", "Bánh thưởng giòn răng", "Đồ chơi chuột nhồi"];

  const toggleAllergy = (item: string) => {
    if (selectedAllergies.includes(item)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== item));
    } else {
      setSelectedAllergies([...selectedAllergies, item]);
    }
  };

  const togglePreference = (item: string) => {
    if (selectedPreferences.includes(item)) {
      setSelectedPreferences(selectedPreferences.filter((p) => p !== item));
    } else {
      setSelectedPreferences([...selectedPreferences, item]);
    }
  };

  // Thuật toán đề xuất Mystery Box từ 5 câu trả lời
  const getRecommendedBox = () => {
    if (species === 'cat') {
      if (ageGroup === 'puppy_kitten') {
        return BOX_TYPES[4]; // Mèo Con Tinh Nghịch
      }
      return BOX_TYPES[2]; // Mèo Cưng Khỏe Mạnh
    }

    // Chó
    if (weight <= 10) {
      return BOX_TYPES[0]; // Chó Nhỏ Nhí Nhảnh
    }
    return BOX_TYPES[1]; // Chó Lớn Năng Động
  };

  const recommendedBox = getRecommendedBox();

  const handleFinishQuiz = () => {
    setShowResult(true);
  };

  const handleSaveAndOrder = () => {
    const ageLabelMap = {
      puppy_kitten: species === 'dog' ? 'Dưới 1 tuổi (Chó con)' : 'Dưới 1 tuổi (Mèo con)',
      adult: '1 - 7 tuổi (Trưởng thành)',
      senior: 'Trên 7 tuổi (Lớn tuổi)',
    };

    // 1. Tạo Pet mới và lưu vào Context
    const createdPet = addPet({
      name: petName.trim() || (species === 'dog' ? "Cún Cưng" : "Miu Con"),
      species,
      breed: breed.trim() || (species === 'dog' ? "Chó Cảnh" : "Mèo Cảnh"),
      weight,
      size: weight <= 10 ? 'small' : 'large',
      ageGroup,
      ageLabel: ageLabelMap[ageGroup],
      gender,
      allergies: selectedAllergies,
      preferences: selectedPreferences,
    });

    // 2. Thêm Box đề xuất vào giỏ hàng gắn với bé vừa tạo
    addToCart({
      type: 'box',
      boxTypeId: recommendedBox.id,
      boxType: recommendedBox,
      petId: createdPet.id,
      petName: createdPet.name,
      quantity: 1,
      unitPrice: recommendedBox.basePrice,
    });

    // 3. Chuyển thẳng vào giỏ hàng
    router.push("/cart");
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8">
      {/* Tiêu đề & thanh tiến trình */}
      {!showResult && (
        <div className="space-y-4 mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-50 text-pine-900 border border-pine-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-pine-700" />
            <span>Pet Quiz 2 phút</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Tìm Mystery Box hoàn hảo cho bé cưng
          </h1>
          <p className="text-xs sm:text-sm text-bark-600">
            Hệ thống sẽ dựa vào câu trả lời của bạn để loại trừ món dị ứng và chọn đúng kích cỡ đồ chơi.
          </p>

          {/* Thanh bước 1 -> 5 */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step
                    ? "w-8 bg-pine-900"
                    : s < step
                    ? "w-4 bg-pine-700"
                    : "w-4 bg-surface-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* MÀN HÌNH CÂU HỎI 1: Loài */}
      {!showResult && step === 1 && (
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border space-y-6">
          <h2 className="text-lg font-bold text-pine-950 text-center">
            Câu 1: Bé cưng của bạn là Chó hay Mèo?
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setSpecies('dog');
                setStep(2);
              }}
              className={`p-6 rounded-box border text-center transition-all ${
                species === 'dog'
                  ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <Dog className="w-12 h-12 mx-auto text-pine-900 mb-2" />
              <span className="text-base font-bold text-pine-950 block">Bé Cún</span>
              <span className="text-xs text-bark-500 mt-1 block">Chó nhỏ hoặc Chó lớn</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSpecies('cat');
                setStep(2);
              }}
              className={`p-6 rounded-box border text-center transition-all ${
                species === 'cat'
                  ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <Cat className="w-12 h-12 mx-auto text-pine-900 mb-2" />
              <span className="text-base font-bold text-pine-950 block">Hoàng Thượng</span>
              <span className="text-xs text-bark-500 mt-1 block">Mọi giống mèo</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH CÂU HỎI 2: Tên & Giới tính */}
      {!showResult && step === 2 && (
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border space-y-5">
          <h2 className="text-lg font-bold text-pine-950 text-center">
            Câu 2: Tên và giống của bé là gì?
          </h2>

          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="text-xs font-bold text-bark-800 block mb-1">
                Tên bé cưng: *
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Bơ, Miu, Lu, Kem..."
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-box border border-surface-border text-sm focus:border-pine-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-bark-800 block mb-1">
                  Giới tính:
                </label>
                <div className="flex gap-2">
                  {(['Đực', 'Cái'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 text-xs font-bold rounded-box border transition-colors ${
                        gender === g
                          ? 'border-pine-900 bg-pine-900 text-white'
                          : 'border-surface-border bg-surface-muted text-bark-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bark-800 block mb-1">
                  Giống của bé:
                </label>
                <input
                  type="text"
                  placeholder={species === 'dog' ? "Poodle, Corgi, Golden..." : "Mèo Anh, Ba Tư, Ta..."}
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-box border border-surface-border text-sm focus:border-pine-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-bold text-bark-600 hover:text-bark-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH CÂU HỎI 3: Cân nặng / Size */}
      {!showResult && step === 3 && (
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border space-y-6">
          <h2 className="text-lg font-bold text-pine-950 text-center">
            Câu 3: Cân nặng hiện tại của bé {petName || "cưng"}?
          </h2>

          <div className="space-y-4 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWeight(species === 'cat' ? 4 : 7)}
                className={`p-4 rounded-box border text-center transition-all ${
                  weight < 10
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <span className="text-xs font-bold text-pine-950 block">Size Nhỏ (&lt; 10 kg)</span>
                <span className="text-[11px] text-bark-500 mt-1 block">
                  {species === 'dog' ? 'Poodle, Phốc, Pom, Corgi nhỏ...' : 'Mèo con, mèo trưởng thành nhỏ'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWeight(15)}
                className={`p-4 rounded-box border text-center transition-all ${
                  weight >= 10
                    ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <span className="text-xs font-bold text-pine-950 block">Size Lớn (≥ 10 kg)</span>
                <span className="text-[11px] text-bark-500 mt-1 block">
                  {species === 'dog' ? 'Golden, Husky, Alaska, Becgie...' : 'Mèo béo, giống mèo Maine Coon'}
                </span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-bark-800 block mb-1">
                Số kg ước tính: ({weight} kg)
              </label>
              <input
                type="range"
                min={1}
                max={45}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full accent-pine-900"
              />
              <div className="flex justify-between text-[10px] text-bark-400 mt-1">
                <span>1 kg</span>
                <span>10 kg (ranh giới size)</span>
                <span>45 kg</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-bold text-bark-600 hover:text-bark-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH CÂU HỎI 4: Độ tuổi */}
      {!showResult && step === 4 && (
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border space-y-6">
          <h2 className="text-lg font-bold text-pine-950 text-center">
            Câu 4: Độ tuổi của bé {petName || "cưng"}?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => setAgeGroup('puppy_kitten')}
              className={`p-4 rounded-box border text-center transition-all flex flex-col items-center ${
                ageGroup === 'puppy_kitten'
                  ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <Baby className="w-6 h-6 mb-1.5 text-pine-900" />
              <span className="text-xs font-bold text-pine-950 block">Dưới 1 tuổi</span>
              <span className="text-[10px] text-bark-500 mt-0.5 block">Cần đồ ăn mềm, đồ chơi an toàn</span>
            </button>

            <button
              type="button"
              onClick={() => setAgeGroup('adult')}
              className={`p-4 rounded-box border text-center transition-all flex flex-col items-center ${
                ageGroup === 'adult'
                  ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <Zap className="w-6 h-6 mb-1.5 text-pine-900" />
              <span className="text-xs font-bold text-pine-950 block">1 – 7 tuổi</span>
              <span className="text-[10px] text-bark-500 mt-0.5 block">Năng động, thích gặm & vận động</span>
            </button>

            <button
              type="button"
              onClick={() => setAgeGroup('senior')}
              className={`p-4 rounded-box border text-center transition-all flex flex-col items-center ${
                ageGroup === 'senior'
                  ? 'border-pine-900 bg-pine-50/60 ring-2 ring-pine-900/10'
                  : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <Moon className="w-6 h-6 mb-1.5 text-pine-900" />
              <span className="text-xs font-bold text-pine-950 block">Trên 7 tuổi</span>
              <span className="text-[10px] text-bark-500 mt-0.5 block">Cần bổ sung khớp & tiêu hóa</span>
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-xs font-bold text-bark-600 hover:text-bark-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH CÂU HỎI 5: Dị ứng & Sở thích */}
      {!showResult && step === 5 && (
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-pine-950">
              Câu 5: Thành phần dị ứng cần tránh & Sở thích của bé?
            </h2>
            <p className="text-xs text-bark-500">
              FPETS cam kết 100% không bao giờ nhặt các món có thành phần ba mẹ tick bên dưới.
            </p>
          </div>

          {/* Chọn thành phần dị ứng */}
          <div className="space-y-2 max-w-lg mx-auto">
            <span className="text-xs font-bold text-bark-800 block">
              Thành phần bé dị ứng hoặc ba mẹ muốn tránh:
            </span>
            <div className="flex flex-wrap gap-2">
              {allergyOptions.map((item) => {
                const isSelected = selectedAllergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAllergy(item)}
                    className={`px-3 py-1.5 rounded-box text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-honey-600 bg-honey-100 text-honey-800 font-bold"
                        : "border-surface-border bg-surface-muted text-bark-700 hover:bg-surface-border"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn sở thích */}
          <div className="space-y-2 max-w-lg mx-auto pt-2 border-t border-surface-border">
            <span className="text-xs font-bold text-bark-800 block">
              Sở thích đặc trưng của bé:
            </span>
            <div className="flex flex-wrap gap-2">
              {(species === 'dog' ? dogPreferences : catPreferences).map((item) => {
                const isSelected = selectedPreferences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => togglePreference(item)}
                    className={`px-3 py-1.5 rounded-box text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-pine-900 bg-pine-100 text-pine-900 font-bold"
                        : "border-surface-border bg-surface-muted text-bark-700 hover:bg-surface-border"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 text-xs font-bold text-bark-600 hover:text-bark-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <button
              type="button"
              onClick={handleFinishQuiz}
              className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-pine-200" />
              <span>Xem kết quả Mystery Box gợi ý</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH KẾT QUẢ: 1 khoảnh khắc chuyển động có chủ đích */}
      {showResult && (
        <div className="p-6 sm:p-10 rounded-container bg-surface-card border-2 border-pine-900 shadow-xl space-y-6 animate-[scaleIn_0.35s_ease-out]">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-grass-100 text-grass-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã khớp thành công Pet Profile</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Chiếc hộp phù hợp nhất cho bé {petName || (species === 'dog' ? "Cún" : "Miu")}
            </h2>
            <p className="text-xs sm:text-sm text-bark-600 max-w-md mx-auto">
              Hồ sơ: {species === 'dog' ? 'Chó' : 'Mèo'} · {weight} kg · {ageGroup === 'puppy_kitten' ? 'Dưới 1 tuổi' : ageGroup === 'adult' ? 'Trưởng thành' : 'Lớn tuổi'}
              {selectedAllergies.length > 0 && ` · Tránh: ${selectedAllergies.join(", ")}`}
            </p>
          </div>

          {/* Chi tiết Box đề xuất */}
          <div className="p-5 rounded-box bg-surface-muted border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-box overflow-hidden border border-surface-border shrink-0">
                {/* TODO: thay bằng ảnh thật của FPETS khi có */}
                <Image
                  src={recommendedBox.imageUrl}
                  alt={recommendedBox.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-pine-950">{recommendedBox.name}</h3>
                <p className="text-xs text-bark-500 mt-0.5">{recommendedBox.itemCount} tuyển chọn riêng</p>
                <div className="text-xs text-grass-700 font-semibold mt-1">
                  Giá trị hàng tối thiểu: {formatVND(recommendedBox.minRetailValue)}
                </div>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="text-xs text-bark-500">Giá mua thử:</div>
              <div className="text-2xl font-extrabold text-pine-950 font-display">
                {formatVND(recommendedBox.basePrice)}
              </div>
            </div>
          </div>

          {/* Lợi ích khi đặt ngay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-bark-700">
            <div className="p-3 rounded-box bg-pine-50 border border-pine-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
              <span>Đã loại trừ 100% món dị ứng</span>
            </div>
            <div className="p-3 rounded-box bg-pine-50 border border-pine-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
              <span>Lưu sẵn vào Pet Profile của bạn</span>
            </div>
            <div className="p-3 rounded-box bg-pine-50 border border-pine-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
              <span>Được đổi món miễn phí nếu lỗi</span>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleSaveAndOrder}
              className="w-full py-4 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-pine-200" />
              <span>Lưu hồ sơ bé {petName || "cưng"} & Đặt thử hộp này ({formatVND(recommendedBox.basePrice)})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                setStep(1);
              }}
              className="w-full text-center text-xs text-bark-500 hover:text-bark-800 py-1"
            >
              Làm lại Quiz cho bé khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
