"use client";

import React, { useState } from "react";
import Image from "next/image";
import ProductItemImage from "@/components/common/ProductItemImage";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { PRODUCTS, Product } from "@/mock/products";
import { CurationItem } from "@/mock/curationQueue";
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw, Eye, HeartHandshake, Dog, Cat, PawPrint, UtensilsCrossed } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";

export default function AdminBoxCurationPage() {
  const { curationQueue, approveCuration, swapCurationItem } = useApp();

  const [selectedCuration, setSelectedCuration] = useState<CurationItem | null>(curationQueue[0]);
  const [swappingOldProductId, setSwappingOldProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleApprove = (curationId: string) => {
    approveCuration(curationId);
    setNotice("Đã duyệt thành công hộp quà! Đơn hàng được chuyển sang trạng thái Đang chuẩn bị đóng gói.");
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSwap = (newProduct: Product) => {
    if (!selectedCuration || !swappingOldProductId) return;
    swapCurationItem(selectedCuration.id, swappingOldProductId, newProduct);

    // Cập nhật state cục bộ của selectedCuration
    setSelectedCuration((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        selectedProducts: prev.selectedProducts.map((p) =>
          p.id === swappingOldProductId ? newProduct : p
        ),
      };
    });

    setSwappingOldProductId(null);
    setNotice(`Đã đổi món thành công sang: ${newProduct.name}`);
    setTimeout(() => setNotice(null), 3000);
  };

  const activeCuration = curationQueue.find((c) => c.id === selectedCuration?.id) || curationQueue[0];
  const totalValue = activeCuration.selectedProducts.reduce((s, p) => s + p.price, 0);
  const isValueValid = totalValue >= activeCuration.minRetailValue;

  // Kiểm tra dị ứng
  const allergenViolations = activeCuration.selectedProducts.filter((prod) =>
    prod.ingredients.some((ing) =>
      activeCuration.allergies.some((all) => ing.toLowerCase().includes(all.toLowerCase()))
    )
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Hàng chờ tuyển chọn Mystery Box
          </h1>
          <p className="text-xs text-bark-500">
            Hệ thống tự động đề xuất danh sách món dựa trên hồ sơ bé. Nhân viên kho kiểm tra dị ứng, duyệt hoặc đổi món trước khi đóng hộp.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Giao diện 2 cột: Cột trái danh sách hàng chờ, Cột phải chi tiết tuyển chọn */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái: Danh sách các hộp cần duyệt */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold text-bark-700 block">
            Danh sách đợt giao ({curationQueue.length} hộp)
          </span>

          {curationQueue.map((item) => {
            const isSelected = item.id === activeCuration.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCuration(item)}
                className={`w-full p-4 rounded-container border text-left transition-all ${
                  isSelected
                    ? "border-pine-900 bg-surface-card ring-2 ring-pine-900/10 shadow-sm"
                    : "border-surface-border bg-surface-card hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-bark-600">{item.orderCode}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-tag ${
                      item.status === 'Đã duyệt'
                        ? 'bg-grass-100 text-grass-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mt-2">
                  <PetSpeciesIcon species={item.species} variant="avatar" size="sm" />
                  <div>
                    <h3 className="text-sm font-bold text-pine-950">Bé {item.petName}</h3>
                    <p className="text-[11px] text-bark-500">
                      {item.species} · {item.size} ({item.weight}) · {item.orderType}
                    </p>
                  </div>
                </div>

                {item.allergies.length > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded inline-block">
                    Dị ứng: {item.allergies.join(", ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Cột Phải: Bàn làm việc tuyển chọn món cho bé được chọn */}
        <div className="lg:col-span-8 space-y-5">
          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-5 shadow-xs">
            {/* Header thông tin bé */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs font-semibold text-pine-900 bg-pine-50 px-2.5 py-0.5 rounded-tag border border-pine-200">
                    {activeCuration.boxType}
                  </span>
                  <PetSpeciesIcon species={activeCuration.species} variant="badge" size="xs" />
                </div>
                <h2 className="text-xl font-extrabold text-pine-950 font-display mt-1">
                  Tuyển chọn hộp cho bé {activeCuration.petName}
                </h2>
                <p className="text-xs text-bark-600 mt-1">
                  Đơn hàng: <strong>{activeCuration.orderCode}</strong> · Đợt: {activeCuration.deliveryBatch}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-tag ${
                    activeCuration.status === 'Đã duyệt'
                      ? 'bg-grass-100 text-grass-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {activeCuration.status}
                </span>
              </div>
            </div>

            {/* Hồ sơ dị ứng & Món đã gửi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-1">
                <span className="font-bold text-pine-950 block">Thành phần dị ứng cần tránh:</span>
                {activeCuration.allergies.length > 0 ? (
                  <span className="font-extrabold text-red-700 bg-red-100/70 px-2 py-0.5 rounded border border-red-200 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{activeCuration.allergies.join(", ")}</span>
                  </span>
                ) : (
                  <span className="text-grass-700 font-semibold">Không có khai báo dị ứng</span>
                )}
                <div className="text-[11px] text-bark-500 pt-1">
                  Sở thích: {activeCuration.preferences.join(", ") || "Không có"}
                </div>
              </div>

              <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-1">
                <span className="font-bold text-pine-950 block">Các món đã từng gửi kỳ trước:</span>
                <p className="text-[11px] text-bark-600">
                  {activeCuration.previouslySentItems.length > 0
                    ? activeCuration.previouslySentItems.join(" • ")
                    : "Đây là kỳ nhận hộp đầu tiên của bé."}
                </p>
              </div>
            </div>

            {/* Cảnh báo kiểm tra hợp lệ của thuật toán */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-pine-950">
                <span>Danh sách món tự động đề xuất ({activeCuration.selectedProducts.length} món):</span>
                <span className="text-bark-500 font-normal">
                  Cam kết tối thiểu: <strong>{formatVND(activeCuration.minRetailValue)}</strong>
                </span>
              </div>

              {allergenViolations.length > 0 ? (
                <div className="p-3 rounded-box bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Cảnh báo dị ứng: Có món vi phạm thành phần dị ứng của bé! Vui lòng đổi món.</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                  <span>Đã kiểm tra an toàn: 100% không trùng thành phần dị ứng đã khai báo.</span>
                </div>
              )}
            </div>

            {/* Bảng các món được chọn */}
            <div className="space-y-2">
              {activeCuration.selectedProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-box bg-surface-muted border border-surface-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                      <ProductItemImage
                        src={prod.image}
                        alt={prod.name}
                        category={prod.category}
                        placeholderColor={prod.placeholderColor}
                        sizes="36px"
                        showNote={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-pine-950 truncate block">{prod.name}</span>
                      <span className="text-[10px] text-bark-500">
                        {prod.categoryLabel} · Tồn kho: {prod.stock}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-pine-950">{formatVND(prod.price)}</span>
                    <button
                      type="button"
                      onClick={() => setSwappingOldProductId(prod.id)}
                      className="px-2 py-1 rounded bg-surface-card hover:bg-surface-border border border-surface-border text-[11px] font-semibold text-bark-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Đổi món</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng giá trị & Nút Duyệt */}
            <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-bark-500">Tổng giá trị thực tế các món:</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-pine-950 font-display">
                    {formatVND(totalValue)}
                  </span>
                  {isValueValid ? (
                    <span className="text-xs font-bold text-grass-700">
                      (Đạt chuẩn &gt; {formatVND(activeCuration.minRetailValue)})
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-600">
                      (Chưa đạt giá trị tối thiểu {formatVND(activeCuration.minRetailValue)})
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApprove(activeCuration.id)}
                disabled={activeCuration.status === 'Đã duyệt' || !isValueValid || allergenViolations.length > 0}
                className={`px-6 py-3 rounded-box text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                  activeCuration.status === 'Đã duyệt'
                    ? "bg-surface-muted text-bark-400 cursor-not-allowed"
                    : "bg-pine-900 hover:bg-pine-800 text-white shadow-sm"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-butter-200" />
                <span>
                  {activeCuration.status === 'Đã duyệt' ? "Hộp này đã được duyệt" : "Xác nhận duyệt tuyển chọn hộp"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Đổi món trong kho */}
      {swappingOldProductId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs max-h-[80vh] flex flex-col">
            <h3 className="text-base font-bold text-pine-950">
              Chọn sản phẩm thay thế trong kho
            </h3>
            <p className="text-bark-500">
              Chỉ chọn món phù hợp với loài của bé {activeCuration.petName} và không chứa thành phần dị ứng: {activeCuration.allergies.join(", ") || "Không có"}.
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {PRODUCTS.filter(
                (p) =>
                  (p.species === 'both' || (activeCuration.species === 'Chó' ? p.species === 'dog' : p.species === 'cat')) &&
                  !activeCuration.selectedProducts.some((sp) => sp.id === p.id)
              ).map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-box border border-surface-border hover:bg-surface-muted flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                      <ProductItemImage
                        src={prod.image}
                        alt={prod.name}
                        category={prod.category}
                        placeholderColor={prod.placeholderColor}
                        sizes="40px"
                        showNote={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-pine-950 block truncate">{prod.name}</span>
                      <span className="text-[11px] text-bark-500">
                        {prod.categoryLabel} · Tồn: {prod.stock}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-pine-950">{formatVND(prod.price)}</span>
                    <button
                      type="button"
                      onClick={() => handleSwap(prod)}
                      className="px-3 py-1.5 rounded-box bg-pine-900 text-white font-bold text-xs"
                    >
                      Chọn món này
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-surface-border flex justify-end">
              <button
                type="button"
                onClick={() => setSwappingOldProductId(null)}
                className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
