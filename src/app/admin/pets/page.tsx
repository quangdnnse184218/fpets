"use client";

import React, { useState } from "react";
import { formatVND } from "@/lib/formatters";
import { Search, Filter, Heart, AlertTriangle, Eye, ThumbsUp, Meh, ThumbsDown, Package, CheckCircle2, X } from "lucide-react";

interface AdminPetItem {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  weight: number;
  size: 'small' | 'large';
  ageLabel: string;
  ownerName: string;
  ownerPhone: string;
  allergies: string[];
  preferences: string[];
  notes?: string;
  avatarColor: string;
  receivedBoxesCount: number;
  boxHistory: {
    cycleName: string;
    receivedDate: string;
    itemsFeedback: {
      productName: string;
      category: string;
      rating: 'like' | 'neutral' | 'dislike';
      comment?: string;
    }[];
  }[];
}

const ALL_MOCK_PETS: AdminPetItem[] = [
  {
    id: "pet-bo",
    name: "Bơ",
    species: "dog",
    breed: "Golden Retriever",
    weight: 18.5,
    size: "large",
    ageLabel: "2 tuổi (Trưởng thành)",
    ownerName: "Nguyễn Văn Quang",
    ownerPhone: "0912345678",
    allergies: ["Thịt gà", "Bắp / Ngô"],
    preferences: ["Gặm xương giòn", "Đồ chơi dây thừng kéo co", "Thịt cừu sấy"],
    notes: "Bé rất mê gặm đồ vật khi ở nhà một mình, cần đồ chơi dai bền.",
    avatarColor: "#FDECC4",
    receivedBoxesCount: 2,
    boxHistory: [
      {
        cycleName: "Hộp Tháng 8/2026 (Kỳ 1)",
        receivedDate: "03/08/2026",
        itemsFeedback: [
          { productName: "Snack ức gà sấy giòn", category: "Snack", rating: "dislike", comment: "Bé bị dị ứng thịt gà nên chủ không cho ăn" },
          { productName: "Dây thừng kéo co thể thao", category: "Đồ chơi", rating: "like", comment: "Cắn mê mệt cả ngày không rách" },
          { productName: "Bánh quy canxi sạch răng", category: "Bánh thưởng", rating: "like", comment: "Rất giòn thơm" },
          { productName: "Khăn ướt lau lông dịu nhẹ", category: "Vệ sinh", rating: "neutral", comment: "Dùng ổn" }
        ]
      },
      {
        cycleName: "Hộp Tháng 9/2026 (Kỳ 2)",
        receivedDate: "04/09/2026",
        itemsFeedback: [
          { productName: "Bóng cao su phát tiếng kêu", category: "Đồ chơi", rating: "like", comment: "Đuổi theo bóng không biết mệt" },
          { productName: "Thịt bò que sấy mềm", category: "Snack", rating: "like", comment: "Thay thế thịt gà rất tuyệt vời!" },
          { productName: "Lược chải lông rụng gỡ rối", category: "Chăm sóc", rating: "like", comment: "Chải ra cả đống lông thừa" }
        ]
      }
    ]
  },
  {
    id: "pet-miu",
    name: "Miu",
    species: "cat",
    breed: "Mèo Anh Lông Ngắn",
    weight: 4.2,
    size: "small",
    ageLabel: "8 tháng (Mèo con)",
    ownerName: "Nguyễn Văn Quang",
    ownerPhone: "0912345678",
    allergies: ["Không có"],
    preferences: ["Cỏ bạc hà Catnip", "Pate cá hồi", "Cần câu lông vũ"],
    notes: "Bé hơi nhát với âm thanh lớn, thích đồ chơi mềm mại.",
    avatarColor: "#E1EDE8",
    receivedBoxesCount: 2,
    boxHistory: [
      {
        cycleName: "Hộp Tháng 8/2026 (Kỳ 1)",
        receivedDate: "03/08/2026",
        itemsFeedback: [
          { productName: "Pate cá hồi Na Uy tươi nguyên chất", category: "Thức ăn ướt", rating: "like", comment: "Ăn sạch bách trong 2 phút" },
          { productName: "Cá nhồi bông cỏ bạc hà Catnip", category: "Đồ chơi", rating: "like", comment: "Ôm cào phấn khích cả buổi" },
          { productName: "Súp thưởng dinh dưỡng vị cá ngừ", category: "Súp thưởng", rating: "like", comment: "Bé liếm sạch thìa" }
        ]
      },
      {
        cycleName: "Hộp Tháng 9/2026 (Kỳ 2)",
        receivedDate: "04/09/2026",
        itemsFeedback: [
          { productName: "Cần câu lông vũ tương tác chuông", category: "Đồ chơi", rating: "like", comment: "Nhảy cao bắt lông vũ rất vui" },
          { productName: "Pate gà xé sốt gravy", category: "Thức ăn ướt", rating: "neutral", comment: "Ăn túc tắc không hào hứng bằng cá hồi" }
        ]
      }
    ]
  },
  {
    id: "pet-banhbao",
    name: "Bánh Bao",
    species: "cat",
    breed: "Mèo Munchkin chân ngắn",
    weight: 3.5,
    size: "small",
    ageLabel: "1.5 tuổi",
    ownerName: "Hoàng Thảo My",
    ownerPhone: "0987654321",
    allergies: ["Ngũ cốc", "Sữa bò"],
    preferences: ["Pate tôm biển", "Bóng len lục lạc"],
    notes: "Chân ngắn leo trèo kém, thích đồ chơi lăn sát mặt sàn.",
    avatarColor: "#FEE2E2",
    receivedBoxesCount: 1,
    boxHistory: [
      {
        cycleName: "Hộp Tháng 9/2026 (Kỳ 1)",
        receivedDate: "05/09/2026",
        itemsFeedback: [
          { productName: "Pate cá hồi Na Uy tươi", category: "Thức ăn", rating: "like", comment: "Bé rất thích mùi vị hải sản" },
          { productName: "Cá nhồi catnip", category: "Đồ chơi", rating: "like", comment: "Lăn qua lăn lại ôm ngủ" }
        ]
      }
    ]
  },
  {
    id: "pet-rex",
    name: "Rex",
    species: "dog",
    breed: "Corgi Pembroke",
    weight: 11.2,
    size: "large",
    ageLabel: "3 tuổi",
    ownerName: "Trần Minh Đức",
    ownerPhone: "0905123987",
    allergies: ["Không có"],
    preferences: ["Bánh quy vị phô mai", "Bóng nảy cao"],
    notes: "Rất hiếu động, háu ăn.",
    avatarColor: "#FEF3C7",
    receivedBoxesCount: 3,
    boxHistory: [
      {
        cycleName: "Hộp Tháng 7/2026",
        receivedDate: "02/07/2026",
        itemsFeedback: [
          { productName: "Bóng cao su phát tiếng kêu", category: "Đồ chơi", rating: "like", comment: "Bé gặm phát ra tiếng rất thích" }
        ]
      }
    ]
  }
];

export default function AdminPetsPage() {
  const [pets, setPets] = useState<AdminPetItem[]>(ALL_MOCK_PETS);
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'large'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<AdminPetItem | null>(null);

  const filteredPets = pets.filter((pet) => {
    const matchSpecies = speciesFilter === 'all' || pet.species === speciesFilter;
    const matchSize = sizeFilter === 'all' || pet.size === sizeFilter;
    const matchSearch =
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSpecies && matchSize && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Pet Profile ({pets.length} bé cưng)
          </h1>
          <p className="text-xs text-bark-500">
            Xem hồ sơ dị ứng, sở thích, lịch sử các hộp đã nhận và phản hồi từng món ăn đồ chơi của từng bé cưng.
          </p>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm tên bé cưng, giống loài hoặc tên chủ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value as any)}
            className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 focus:outline-none"
          >
            <option value="all">Tất cả loài</option>
            <option value="dog">🐶 Chỉ Chó</option>
            <option value="cat">🐱 Chỉ Mèo</option>
          </select>

          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 focus:outline-none"
          >
            <option value="all">Tất cả kích cỡ</option>
            <option value="small">Kích cỡ Nhỏ (&lt;10kg)</option>
            <option value="large">Kích cỡ Lớn (≥10kg)</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách Pet */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Bé cưng</th>
              <th className="p-3.5">Loài & Giống</th>
              <th className="p-3.5">Cân nặng / Size</th>
              <th className="p-3.5">Chủ nuôi</th>
              <th className="p-3.5">Cảnh báo dị ứng</th>
              <th className="p-3.5">Sở thích</th>
              <th className="p-3.5">Hộp đã nhận</th>
              <th className="p-3.5">Lịch sử & Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filteredPets.map((pet) => (
              <tr key={pet.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-pine-900 shrink-0 text-sm"
                      style={{ backgroundColor: pet.avatarColor }}
                    >
                      {pet.species === "dog" ? "🐶" : "🐱"}
                    </div>
                    <div>
                      <span className="font-bold text-pine-950 block">{pet.name}</span>
                      <span className="text-[10px] text-bark-400">{pet.ageLabel}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="font-medium text-bark-900 block">{pet.breed}</span>
                  <span className="text-[10px] text-bark-500">{pet.species === "dog" ? "Chó" : "Mèo"}</span>
                </td>
                <td className="p-3.5">
                  <div className="font-semibold text-pine-900">{pet.weight} kg</div>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-bark-600">
                    {pet.size === "small" ? "Size Nhỏ" : "Size Lớn"}
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="font-medium text-bark-900">{pet.ownerName}</div>
                  <div className="text-[11px] text-bark-400">{pet.ownerPhone}</div>
                </td>
                <td className="p-3.5">
                  {pet.allergies.length > 0 && pet.allergies[0] !== "Không có" ? (
                    <div className="flex flex-wrap gap-1">
                      {pet.allergies.map((all, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-800"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-bark-600" />
                          <span>{all}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-grass-700 text-[11px] font-medium">Không có</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="text-[11px] text-bark-600 line-clamp-1 max-w-[180px]">
                    {pet.preferences.join(", ")}
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pine-50 text-pine-800">
                    {pet.receivedBoxesCount} hộp
                  </span>
                </td>
                <td className="p-3.5">
                  <button
                    onClick={() => setSelectedPet(pet)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Xem feedback</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Lịch sử hộp & Feedback từng món */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                  style={{ backgroundColor: selectedPet.avatarColor }}
                >
                  {selectedPet.species === "dog" ? "🐶" : "🐱"}
                </div>
                <div>
                  <h3 className="font-bold text-pine-950 text-sm">
                    Lịch sử & Feedback của bé {selectedPet.name}
                  </h3>
                  <p className="text-[11px] text-bark-500">
                    Chủ nuôi: {selectedPet.ownerName} ({selectedPet.ownerPhone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPet(null)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin cần lưu ý */}
            <div className="p-3 rounded-box bg-surface-muted border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-bark-800 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-bark-600" />
                <span>LƯU Ý DỊ ỨNG & GHI CHÚ ĐẶC BIỆT KHI CHỌN MÓN:</span>
              </div>
              <p className="text-bark-700">
                <span className="font-semibold">Dị ứng: </span>
                {selectedPet.allergies.join(", ")}
              </p>
              {selectedPet.notes && (
                <p className="text-bark-600 text-[11px]">
                  <span className="font-semibold">Ghi chú: </span>
                  {selectedPet.notes}
                </p>
              )}
            </div>

            {/* Danh sách từng hộp đã nhận */}
            <div className="space-y-3">
              <h4 className="font-bold text-pine-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-pine-700" />
                <span>Các hộp Mystery Box đã nhận và đánh giá món ăn / đồ chơi</span>
              </h4>

              {selectedPet.boxHistory.length === 0 ? (
                <p className="text-bark-500 py-3 text-center">Bé chưa nhận hộp quà nào.</p>
              ) : (
                selectedPet.boxHistory.map((box, bIdx) => (
                  <div key={bIdx} className="p-3.5 rounded-box border border-surface-border bg-white space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                      <span className="font-bold text-pine-900">{box.cycleName}</span>
                      <span className="text-bark-400 text-[11px]">Ngày nhận: {box.receivedDate}</span>
                    </div>

                    <div className="space-y-2">
                      {box.itemsFeedback.map((item, iIdx) => (
                        <div key={iIdx} className="p-2 rounded bg-surface-muted flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-bark-900 block">{item.productName}</span>
                            <span className="text-[10px] text-bark-500 block">Loại: {item.category}</span>
                            {item.comment && (
                              <p className="text-[11px] text-bark-600 mt-1 italic">
                                &ldquo;{item.comment}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {item.rating === "like" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-grass-100 text-grass-800">
                                <ThumbsUp className="w-2.5 h-2.5" />
                                <span>Bé thích</span>
                              </span>
                            )}
                            {item.rating === "neutral" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-surface-card text-bark-700 border border-surface-border">
                                <Meh className="w-2.5 h-2.5" />
                                <span>Bình thường</span>
                              </span>
                            )}
                            {item.rating === "dislike" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-800">
                                <ThumbsDown className="w-2.5 h-2.5" />
                                <span>Không thích</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <button
                onClick={() => setSelectedPet(null)}
                className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-medium hover:bg-pine-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
