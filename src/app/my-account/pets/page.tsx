"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Pet } from "@/mock/pets";
import { Plus, Edit2, Trash2, ShieldAlert, Sparkles, Check, Dog, Cat, PawPrint } from "lucide-react";

export default function MyPetsPage() {
  const { pets, addPet, updatePet, deletePet } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // New pet form state
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState(6.0);
  const [gender, setGender] = useState<'Đực' | 'Cái'>('Đực');
  const [ageGroup, setAgeGroup] = useState<'puppy_kitten' | 'adult' | 'senior'>('adult');
  const [allergiesText, setAllergiesText] = useState("");
  const [preferencesText, setPreferencesText] = useState("");

  const handleCreatePet = (e: React.FormEvent) => {
    e.preventDefault();
    addPet({
      name: name.trim() || "Bé cưng",
      species: species,
      breed: breed.trim() || (species === 'dog' ? "Chó cỏ" : "Mèo ta"),
      weight: Number(weight) || 5,
      size: weight >= 10 ? 'large' : 'small',
      ageGroup: ageGroup,
      ageLabel: ageGroup === 'puppy_kitten' ? 'Dưới 1 tuổi' : ageGroup === 'adult' ? 'Trưởng thành' : 'Trên 7 tuổi',
      gender: gender,
      allergies: allergiesText ? allergiesText.split(",").map(s => s.trim()).filter(Boolean) : [],
      preferences: preferencesText ? preferencesText.split(",").map(s => s.trim()).filter(Boolean) : [],
      notes: "",
    });

    // Reset
    setName("");
    setBreed("");
    setAllergiesText("");
    setPreferencesText("");
    setShowAddModal(false);
  };

  const handleUpdatePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    updatePet(editingPet.id, {
      name: editingPet.name,
      breed: editingPet.breed,
      weight: Number(editingPet.weight),
      size: Number(editingPet.weight) >= 10 ? 'large' : 'small',
      allergies: editingPet.allergies,
      preferences: editingPet.preferences,
    });
    setEditingPet(null);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút thêm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-pine-950">Hồ sơ thú cưng ({pets.length} bé)</h2>
          <p className="text-xs text-bark-500">
            Thông tin này được FPETS dùng để tuyển chọn từng món trong Mystery Box cho bé.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/quiz"
            className="px-3 py-2 rounded-box bg-surface-card hover:bg-surface-muted border border-surface-border text-xs font-bold text-bark-800 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-honey-600" />
            <span>Thêm qua Quiz</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm bé mới</span>
          </button>
        </div>
      </div>

      {/* Danh sách thẻ Pet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pets.map((pet) => (
          <div
            key={pet.id}
            className="p-5 rounded-container bg-surface-card border border-surface-border flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-box flex items-center justify-center border border-black/5 shrink-0"
                    style={{ backgroundColor: pet.avatarColor }}
                  >
                    {pet.species === 'dog' ? (
                      <Dog className="w-6 h-6 text-pine-900" />
                    ) : (
                      <Cat className="w-6 h-6 text-pine-900" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
                      <span>{pet.name}</span>
                      <span className="text-xs text-bark-500 font-normal">({pet.gender})</span>
                    </h3>
                    <p className="text-xs text-bark-600">
                      {pet.breed} · {pet.weight} kg · {pet.ageLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingPet({ ...pet })}
                    className="p-1.5 rounded text-bark-400 hover:text-pine-900 transition-colors"
                    title="Chỉnh sửa hồ sơ"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa hồ sơ bé ${pet.name}? Mọi hộp quà gắn với bé trong giỏ cũng sẽ bị gỡ bỏ.`)) {
                        deletePet(pet.id);
                      }
                    }}
                    className="p-1.5 rounded text-bark-400 hover:text-red-600 transition-colors"
                    title="Xóa hồ sơ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thông tin dị ứng & sở thích */}
              <div className="mt-4 pt-3 border-t border-surface-border space-y-2 text-xs">
                <div>
                  <span className="font-bold text-bark-700">Dị ứng cần tránh: </span>
                  {pet.allergies.length > 0 ? (
                    <span className="text-honey-800 font-medium bg-honey-50 px-2 py-0.5 rounded border border-honey-200">
                      {pet.allergies.join(", ")}
                    </span>
                  ) : (
                    <span className="text-grass-700 font-medium">Không có dị ứng</span>
                  )}
                </div>

                <div>
                  <span className="font-bold text-bark-700">Sở thích: </span>
                  <span className="text-bark-600">
                    {pet.preferences.length > 0 ? pet.preferences.join(", ") : "Chưa cập nhật"}
                  </span>
                </div>
              </div>
            </div>

            {/* Chân thẻ Pet */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
              <span className="text-bark-500">Đã nhận: {pet.receivedBoxesCount} hộp FPETS</span>
              <Link
                href={`/boxes`}
                className="font-bold text-honey-700 hover:text-honey-800"
              >
                Đặt hộp cho bé {pet.name}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Thêm Pet Nhanh */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border">
            <h3 className="text-base font-bold text-pine-950">Thêm hồ sơ thú cưng mới</h3>
            <form onSubmit={handleCreatePet} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Loài: *</label>
                  <select
                    value={species}
                    onChange={(e) => setSpecies(e.target.value as 'dog' | 'cat')}
                    className="w-full px-3 py-2 rounded-box border border-surface-border bg-white"
                  >
                    <option value="dog">Chó</option>
                    <option value="cat">Mèo</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Tên bé: *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tên bé cưng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-box border border-surface-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Giống:</label>
                  <input
                    type="text"
                    placeholder="Poodle, Golden, Mèo Anh..."
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-3 py-2 rounded-box border border-surface-border"
                  />
                </div>
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Cân nặng (kg): *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-box border border-surface-border"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">
                  Thành phần dị ứng (cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thịt gà, Bắp, Tôm..."
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border"
                />
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">
                  Sở thích (cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gặm xương, Dây thừng, Cỏ catnip..."
                  value={preferencesText}
                  onChange={(e) => setPreferencesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-box border border-surface-border text-bark-700 hover:bg-surface-muted font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold"
                >
                  Lưu hồ sơ bé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Pet */}
      {editingPet && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border">
            <h3 className="text-base font-bold text-pine-950">Chỉnh sửa hồ sơ bé {editingPet.name}</h3>
            <form onSubmit={handleUpdatePet} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-bark-800 block mb-1">Tên bé:</label>
                <input
                  type="text"
                  required
                  value={editingPet.name}
                  onChange={(e) => setEditingPet({ ...editingPet, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-box border border-surface-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Giống:</label>
                  <input
                    type="text"
                    value={editingPet.breed}
                    onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })}
                    className="w-full px-3 py-2 rounded-box border border-surface-border"
                  />
                </div>
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Cân nặng (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingPet.weight}
                    onChange={(e) => setEditingPet({ ...editingPet, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-box border border-surface-border"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">
                  Thành phần dị ứng (cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={editingPet.allergies.join(", ")}
                  onChange={(e) =>
                    setEditingPet({
                      ...editingPet,
                      allergies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-box border border-surface-border"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="px-4 py-2 rounded-box border border-surface-border text-bark-700 hover:bg-surface-muted font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
