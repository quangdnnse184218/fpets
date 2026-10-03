"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, AlertTriangle, Eye, ThumbsUp, Meh, ThumbsDown, Package, X } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { Tables } from "@/types/database";
import { formatDate } from "@/lib/formatters";

type PetRow = Tables<"pets"> & { profiles: { full_name: string | null; phone: string | null } | null };
interface FeedbackRow {
  id: string;
  rating: "like" | "neutral" | "dislike";
  notes: string | null;
  created_at: string;
  products: { name: string } | null;
}

const AGE_LABEL: Record<string, string> = { puppy_kitten: "Dưới 1 tuổi", adult: "Trưởng thành", senior: "Trên 7 tuổi" };
const RATING_BADGE: Record<string, { icon: typeof ThumbsUp; className: string; label: string }> = {
  like: { icon: ThumbsUp, className: "bg-grass-100 text-grass-800", label: "Bé thích" },
  neutral: { icon: Meh, className: "bg-surface-card text-bark-700 border border-surface-border", label: "Bình thường" },
  dislike: { icon: ThumbsDown, className: "bg-bark-100 text-bark-800", label: "Không thích" },
};

export default function AdminPetsPage() {
  const [pets, setPets] = useState<PetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "dog" | "cat">("all");
  const [sizeFilter, setSizeFilter] = useState<"all" | "small" | "large">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<PetRow | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [boxesReceived, setBoxesReceived] = useState(0);

  const loadPets = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("pets").select("*, profiles(full_name, phone)").order("created_at", { ascending: false });
    setPets((data as unknown as PetRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPets(); }, [loadPets]);

  const openPet = async (pet: PetRow) => {
    setSelectedPet(pet);
    const supabase = createClient();
    const [{ data: fb }, { count }] = await Promise.all([
      supabase.from("pet_item_feedback").select("id, rating, notes, created_at, products(name)").eq("pet_id", pet.id).order("created_at", { ascending: false }),
      supabase.from("box_curations").select("id", { count: "exact", head: true }).eq("pet_id", pet.id).eq("status", "curated"),
    ]);
    setFeedback((fb as unknown as FeedbackRow[]) || []);
    setBoxesReceived(count || 0);
  };

  const filteredPets = pets.filter((pet) => {
    const matchSpecies = speciesFilter === "all" || pet.species === speciesFilter;
    const matchSize = sizeFilter === "all" || pet.size === sizeFilter;
    const matchSearch =
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.breed || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSpecies && matchSize && matchSearch;
  });

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải danh sách thú cưng...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Quản lý Pet Profile ({pets.length} bé cưng)</h1>
          <p className="text-xs text-bark-500">Xem hồ sơ dị ứng, sở thích và phản hồi từng món của từng bé cưng.</p>
        </div>
      </div>

      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm tên bé, giống loài hoặc tên chủ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value as "all" | "dog" | "cat")}
            className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 focus:outline-none">
            <option value="all">Tất cả loài</option>
            <option value="dog">Chó</option>
            <option value="cat">Mèo</option>
          </select>
          <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value as "all" | "small" | "large")}
            className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 focus:outline-none">
            <option value="all">Tất cả kích cỡ</option>
            <option value="small">Nhỏ (&lt;10kg)</option>
            <option value="large">Lớn (≥10kg)</option>
          </select>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-2.5">
        {filteredPets.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Chưa có hồ sơ thú cưng nào phù hợp.
          </div>
        ) : (
          filteredPets.map((pet) => (
            <div
              key={pet.id}
              className="p-3.5 rounded-container bg-surface-card border border-surface-border space-y-2.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PetSpeciesIcon species={pet.species} variant="avatar" size="sm" />
                  <div>
                    <h3 className="font-bold text-pine-950 text-xs">
                      {pet.name}
                    </h3>
                    <div className="text-[10px] text-bark-400">
                      {AGE_LABEL[pet.age_group]} · {pet.breed || (pet.species === "dog" ? "Chó" : "Mèo")}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-pine-900 block">{pet.weight || "—"} kg</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-bark-600">
                    {pet.size === "small" ? "Size Nhỏ" : "Size Lớn"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-border/70 text-xs space-y-1">
                <div className="flex items-center justify-between text-bark-600">
                  <span className="text-bark-400 text-[11px]">Chủ nuôi:</span>
                  <span className="font-medium text-pine-950">{pet.profiles?.full_name || "—"} ({pet.profiles?.phone || "—"})</span>
                </div>

                <div>
                  <span className="text-bark-400 text-[11px] block">Dị ứng:</span>
                  {pet.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {pet.allergies.map((all, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-800">
                          <AlertTriangle className="w-2.5 h-2.5 text-bark-600" />
                          <span>{all}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-grass-700 text-[11px] font-medium">Không có</span>
                  )}
                </div>

                {pet.preferences.length > 0 && (
                  <div className="text-[11px] text-bark-600 pt-0.5">
                    <span className="text-bark-400">Sở thích: </span>
                    {pet.preferences.join(", ")}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-surface-border/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => openPet(pet)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Xem feedback &amp; lịch sử</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Bé cưng</th>
              <th className="p-3.5">Loài & Giống</th>
              <th className="p-3.5">Cân nặng / Size</th>
              <th className="p-3.5">Chủ nuôi</th>
              <th className="p-3.5">Cảnh báo dị ứng</th>
              <th className="p-3.5">Sở thích</th>
              <th className="p-3.5">Lịch sử & Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filteredPets.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-xs text-bark-500">Chưa có hồ sơ thú cưng nào phù hợp.</td>
              </tr>
            )}
            {filteredPets.map((pet) => (
              <tr key={pet.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <PetSpeciesIcon species={pet.species} variant="avatar" size="sm" />
                    <div>
                      <span className="font-bold text-pine-950 block">{pet.name}</span>
                      <span className="text-[10px] text-bark-400">{AGE_LABEL[pet.age_group]}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="font-medium text-bark-900 block">{pet.breed || "—"}</span>
                  <span className="text-[10px] text-bark-500">{pet.species === "dog" ? "Chó" : "Mèo"}</span>
                </td>
                <td className="p-3.5">
                  <div className="font-semibold text-pine-900">{pet.weight || "—"} kg</div>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-bark-600">
                    {pet.size === "small" ? "Size Nhỏ" : "Size Lớn"}
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="font-medium text-bark-900">{pet.profiles?.full_name || "—"}</div>
                  <div className="text-[11px] text-bark-400">{pet.profiles?.phone || "—"}</div>
                </td>
                <td className="p-3.5">
                  {pet.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pet.allergies.map((all, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-800">
                          <AlertTriangle className="w-2.5 h-2.5 text-bark-600" /><span>{all}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-grass-700 text-[11px] font-medium">Không có</span>
                  )}
                </td>
                <td className="p-3.5"><div className="text-[11px] text-bark-600 line-clamp-1 max-w-[180px]">{pet.preferences.join(", ") || "—"}</div></td>
                <td className="p-3.5">
                  <button onClick={() => openPet(pet)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors">
                    <Eye className="w-3 h-3" /><span>Xem feedback</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <PetSpeciesIcon species={selectedPet.species} variant="avatar" size="md" />
                <div>
                  <h3 className="font-bold text-pine-950 text-sm">Lịch sử & Feedback của bé {selectedPet.name}</h3>
                  <p className="text-[11px] text-bark-500">Chủ nuôi: {selectedPet.profiles?.full_name} ({selectedPet.profiles?.phone})</p>
                </div>
              </div>
              <button onClick={() => setSelectedPet(null)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 rounded-box bg-surface-muted border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-bark-800 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-bark-600" />
                <span>LƯU Ý DỊ ỨNG & GHI CHÚ KHI CHỌN MÓN:</span>
              </div>
              <p className="text-bark-700"><span className="font-semibold">Dị ứng: </span>{selectedPet.allergies.join(", ") || "Không có"}</p>
              {selectedPet.notes && <p className="text-bark-600 text-[11px] whitespace-pre-line"><span className="font-semibold">Ghi chú: </span>{selectedPet.notes}</p>}
              <p className="text-bark-600 text-[11px]"><span className="font-semibold">Đã nhận: </span>{boxesReceived} hộp</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-pine-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-pine-700" />
                <span>Phản hồi từng món đã nhận</span>
              </h4>

              {feedback.length === 0 ? (
                <p className="text-bark-500 py-3 text-center">Bé chưa có phản hồi món nào.</p>
              ) : (
                <div className="space-y-2">
                  {feedback.map((item) => {
                    const badge = RATING_BADGE[item.rating];
                    const Icon = badge.icon;
                    return (
                      <div key={item.id} className="p-2 rounded bg-surface-muted flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-bark-900 block">{item.products?.name || "Sản phẩm"}</span>
                          <span className="text-[10px] text-bark-500 block">{formatDate(item.created_at)}</span>
                          {item.notes && <p className="text-[11px] text-bark-600 mt-1 italic whitespace-pre-line">&ldquo;{item.notes}&rdquo;</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badge.className}`}>
                          <Icon className="w-2.5 h-2.5" /><span>{badge.label}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <button onClick={() => setSelectedPet(null)} className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-medium hover:bg-pine-800 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
