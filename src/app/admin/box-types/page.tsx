"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BOX_TYPES, SUBSCRIPTION_PLANS, BoxType } from "@/mock/boxTypes";
import { formatVND } from "@/lib/formatters";
import { Plus, Edit2, Trash2, Check, Percent, Gift, Settings, ShieldAlert, Sparkles, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";

export default function AdminBoxTypesPage() {
  const [boxList, setBoxList] = useState<BoxType[]>(BOX_TYPES);
  const [discount3, setDiscount3] = useState(10);
  const [discount6, setDiscount6] = useState(15);
  const [savedDiscount, setSavedDiscount] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // State cho Modal Sửa/Thêm Box
  const [editingBox, setEditingBox] = useState<BoxType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State cho Modal Xóa Box
  const [deletingBox, setDeletingBox] = useState<BoxType | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSpecies, setFormSpecies] = useState<'dog' | 'cat'>('dog');
  const [formSize, setFormSize] = useState<'small' | 'large'>('small');
  const [formItemCount, setFormItemCount] = useState("4–5 món");
  const [formMinRetail, setFormMinRetail] = useState(380000);
  const [formBasePrice, setFormBasePrice] = useState(299000);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const handleOpenAdd = () => {
    setEditingBox(null);
    setFormName("");
    setFormSpecies("dog");
    setFormSize("small");
    setFormItemCount("4–5 món");
    setFormMinRetail(380000);
    setFormBasePrice(299000);
    setFormImageUrl("https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80");
    setFormDescription("Hộp quà tuyển chọn định kỳ cho bé cưng");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (box: BoxType) => {
    setEditingBox(box);
    setFormName(box.name);
    setFormSpecies(box.species);
    setFormSize(box.size);
    setFormItemCount(box.itemCount);
    setFormMinRetail(box.minRetailValue);
    setFormBasePrice(box.basePrice);
    setFormImageUrl(box.imageUrl);
    setFormDescription(box.description);
    setIsModalOpen(true);
  };

  const handleSaveBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBox) {
      // Sửa
      setBoxList((prev) =>
        prev.map((b) =>
          b.id === editingBox.id
            ? {
                ...b,
                name: formName,
                species: formSpecies,
                size: formSize,
                itemCount: formItemCount,
                minRetailValue: Number(formMinRetail),
                basePrice: Number(formBasePrice),
                imageUrl: formImageUrl,
                description: formDescription,
              }
            : b
        )
      );
    } else {
      // Thêm mới
      const newBox: BoxType = {
        id: `box-custom-${Date.now()}`,
        name: formName,
        slug: `box-${Date.now()}`,
        species: formSpecies,
        size: formSize,
        sizeLabel: formSpecies === "dog" ? (formSize === "small" ? "Dưới 10 kg" : "Trên 10 kg") : "Dành cho Mèo",
        itemCount: formItemCount,
        minRetailValue: Number(formMinRetail),
        basePrice: Number(formBasePrice),
        description: formDescription,
        highlight: "Tuyển chọn chuẩn gu sở thích",
        imagePlaceholderColor: "#E1EDE8",
        imageUrl: formImageUrl,
        typicalItems: ["Snack sấy sạch", "Đồ chơi tương tác", "Vật dụng vệ sinh"],
      };
      setBoxList((prev) => [...prev, newBox]);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDeleteBox = () => {
    if (!deletingBox) return;
    setBoxList((prev) => prev.filter((b) => b.id !== deletingBox.id));
    setNotice(`Đã xóa loại hộp "${deletingBox.name}".`);
    setDeletingBox(null);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSaveDiscountConfig = () => {
    setSavedDiscount(true);
    setTimeout(() => setSavedDiscount(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Mystery Box & Gói Định Kỳ
          </h1>
          <p className="text-xs text-bark-500">
            Cấu hình quy cách các loại hộp quà định kỳ, cam kết giá trị tối thiểu và tỉ lệ chiết khấu theo chu kỳ gói.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-pine-900 text-white rounded-box text-xs font-bold hover:bg-pine-800 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm loại Box mới</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Cấu hình Tỉ lệ giảm giá gói 3 & 6 hộp */}
      <div className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-pine-900 font-bold text-sm">
          <Settings className="w-4 h-4 text-pine-700" />
          <span>Cấu hình tỉ lệ chiết khấu gói Subscription</span>
        </div>
        <p className="text-xs text-bark-600">
          Tỉ lệ này tự động áp dụng khi khách hàng chọn mua gói định kỳ 3 hộp hoặc 6 hộp tại trang /subscription hoặc /boxes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border">
            <span className="font-semibold text-bark-700 block mb-1">Gói 1 hộp (Thử nghiệm)</span>
            <p className="text-bark-500 text-[11px] mb-2">Giá niêm yết chuẩn, phí ship tính theo địa chỉ</p>
            <span className="font-bold text-pine-900 text-sm">Giảm 0%</span>
          </div>

          <div className="p-3.5 rounded-box bg-grass-50/60 border border-grass-200">
            <span className="font-semibold text-pine-900 block mb-1">Gói 3 hộp (Phổ biến nhất)</span>
            <p className="text-bark-500 text-[11px] mb-2">Được miễn phí vận chuyển toàn bộ các kỳ</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-pine-900 text-xs">Chiết khấu:</span>
              <input
                type="number"
                value={discount3}
                onChange={(e) => setDiscount3(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-grass-300 rounded font-bold text-pine-900 text-xs text-center"
              />
              <span className="font-bold text-pine-900">%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-box bg-honey-50/60 border border-honey-200">
            <span className="font-semibold text-bark-800 block mb-1">Gói 6 hộp (Tiết kiệm tối đa)</span>
            <p className="text-bark-500 text-[11px] mb-2">Freeship + Tặng kèm quà sinh nhật cho bé</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-bark-800 text-xs">Chiết khấu:</span>
              <input
                type="number"
                value={discount6}
                onChange={(e) => setDiscount6(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-honey-300 rounded font-bold text-bark-800 text-xs text-center"
              />
              <span className="font-bold text-bark-800">%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveDiscountConfig}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-grass-700 text-white rounded-box text-xs font-semibold hover:bg-grass-800 transition-colors"
          >
            {savedDiscount ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã lưu cấu hình!</span>
              </>
            ) : (
              <span>Lưu cấu hình chiết khấu</span>
            )}
          </button>
        </div>
      </div>

      {/* Danh sách các loại Box */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Hộp quà Mystery Box</th>
              <th className="p-3.5">Phân loại</th>
              <th className="p-3.5">Số món</th>
              <th className="p-3.5">Giá trị tối thiểu</th>
              <th className="p-3.5">Giá bán lẻ (1 hộp)</th>
              <th className="p-3.5">Giá gói 3 hộp (-{discount3}%)</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {boxList.map((box) => {
              const price3 = Math.round((box.basePrice * (100 - discount3)) / 100);
              return (
                <tr key={box.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-surface-border bg-pine-50">
                        {/* TODO: thay bằng ảnh thật của FPETS khi có */}
                        <Image
                          src={box.imageUrl}
                          alt={box.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-pine-950 text-xs">{box.name}</div>
                        <div className="text-[11px] text-bark-500 line-clamp-1 max-w-[260px]">
                          {box.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <PetSpeciesIcon species={box.species} variant="badge" size="xs" />
                      <span className="text-[10px] font-medium text-bark-500 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border">
                        {box.size === "small" ? "Nhỏ" : "Lớn"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 font-medium">{box.itemCount}</td>
                  <td className="p-3.5 font-bold text-bark-800">
                    {formatVND(box.minRetailValue)}
                  </td>
                  <td className="p-3.5 font-bold text-pine-900">
                    {formatVND(box.basePrice)}
                  </td>
                  <td className="p-3.5 font-bold text-grass-700">
                    {formatVND(price3)}/hộp
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(box)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => setDeletingBox(box)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        title="Xóa loại Box này"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa Box */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-5 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">
                {editingBox ? `Chỉnh sửa: ${editingBox.name}` : "Thêm loại Mystery Box mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBox} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Tên loại Box *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Box Tiêu chuẩn cho Chó nhỏ"
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Dành cho loài *</label>
                  <select
                    value={formSpecies}
                    onChange={(e) => setFormSpecies(e.target.value as 'dog' | 'cat')}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white"
                  >
                    <option value="dog">Chó</option>
                    <option value="cat">Mèo</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Kích cỡ *</label>
                  <select
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value as 'small' | 'large')}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none bg-white"
                  >
                    <option value="small">Nhỏ (&lt; 10kg)</option>
                    <option value="large">Lớn (≥ 10kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Số món</label>
                  <input
                    type="text"
                    value={formItemCount}
                    onChange={(e) => setFormItemCount(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá trị tối thiểu</label>
                  <input
                    type="number"
                    value={formMinRetail}
                    onChange={(e) => setFormMinRetail(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-bark-700 block mb-1">Giá bán lẻ (VND)</label>
                  <input
                    type="number"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none font-bold text-pine-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">URL hình ảnh sản phẩm</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-bark-700 block mb-1">Mô tả đặc điểm</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors"
                >
                  {editingBox ? "Lưu thay đổi" : "Tạo loại Box"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Box */}
      {deletingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-sm w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-pine-950 text-sm">Xác nhận xóa loại Box</h3>
            </div>

            <p className="text-bark-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa loại hộp <strong>&ldquo;{deletingBox.name}&rdquo;</strong>?
            </p>

            {/* Cảnh báo nếu đang có subscription */}
            <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cảnh báo gói Subscription:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal">
                Loại Box này có thể đang có khách hàng đăng ký theo gói định kỳ 3 hoặc 6 hộp. Nếu xóa, các kỳ giao tiếp theo cần được chuyển đổi sang loại hộp tương đương.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setDeletingBox(null)}
                className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBox}
                className="px-4 py-1.5 bg-red-600 text-white rounded-box font-bold hover:bg-red-700 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
