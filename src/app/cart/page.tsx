"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductItemImage from "@/components/common/ProductItemImage";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Trash2, ShoppingBag, Truck, Tag, CheckCircle2, AlertCircle, PackageOpen, Minus, Plus } from "lucide-react";
import { Button, IconButton, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { findAllergyConflicts } from "@/lib/petOptions";
import type { CartItem } from "@/context/AppContext";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatShippingFee, SHIPPING_CONFIG } from "@/lib/shipping";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    pets,
    updateQuantity,
    updatePetForBox,
    removeFromCart,
    subtotal,
    shippingFee,
    total,
    voucherCode,
    voucherDiscount,
    voucherMessage,
    applyVoucher,
    addToCart,
  } = useApp();
  const { show } = useToast();

  // Xóa ngay, cho phép hoàn tác trong 5 giây
  const handleRemove = (item: CartItem) => {
    removeFromCart(item.id);
    const name = item.type === "box" ? item.boxType?.name : item.product?.name;
    show(`Đã xóa ${name || "sản phẩm"}`, {
      actions: [{ label: "Hoàn tác", onClick: () => {
        const { id: _removedId, ...rest } = item;
        void _removedId;
        addToCart(rest);
      } }],
    });
  };

  const [inputCode, setInputCode] = useState("");

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyVoucher(inputCode);
  };

  const remainingForFreeship = Math.max(0, SHIPPING_CONFIG.freeShippingThreshold - subtotal);

  // Box chỉ đổi được sang bé cùng loài (chó: cùng size) — khớp ràng buộc ở server
  const eligiblePetsFor = (item: (typeof cart)[number]) =>
    pets.filter(
      (p) =>
        item.boxType &&
        p.species === item.boxType.species &&
        (item.boxType.species !== "dog" || p.size === item.boxType.size)
    );

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-bark-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Giỏ hàng của bạn đang trống
          </h1>
          <p className="text-sm text-bark-600 max-w-md mx-auto">
            Hãy khám phá chiếc Mystery Box bất ngờ đầu tiên hoặc chọn các món snack thơm ngon cho bé nhé!
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/boxes"
            className="px-6 py-3 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs transition-colors"
          >
            Khám phá Mystery Box
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 rounded-box bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold text-xs transition-colors"
          >
            Xem shop đồ lẻ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Giỏ hàng ({cart.reduce((s, i) => s + i.quantity, 0)} món)
          </h1>
          <p className="text-xs text-bark-500 mt-0.5">
            Các món mua lẻ và Mystery Box mua 1 lần được giao chung trong 1 kiện.
          </p>
        </div>
      </div>

      {/* Thông báo thanh Freeship */}
      <div className="p-3.5 rounded-box bg-pine-50 border border-pine-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-pine-800" />
          {remainingForFreeship === 0 ? (
            <span className="font-bold text-grass-700">
              Đơn của bạn được miễn phí vận chuyển.
            </span>
          ) : (
            <span className="text-bark-700">
              Mua thêm <strong>{formatVND(remainingForFreeship)}</strong> để được miễn phí vận chuyển (đơn từ {formatVND(SHIPPING_CONFIG.freeShippingThreshold)}).
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Danh sách dòng sản phẩm */}
        <div className="lg:col-span-8 space-y-3">
          {cart.map((item) => {
            const conflicts = item.product ? findAllergyConflicts(item.product, pets) : [];
            return (
            <Card
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Ảnh thật của sản phẩm / Mystery Box */}
                <div className="w-16 h-16 rounded-box overflow-hidden relative shrink-0 border border-surface-border bg-surface-muted">
                  {item.type === 'box' && item.boxType?.imageUrl ? (
                    <Image
                      src={item.boxType.imageUrl}
                      alt={item.boxType.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : item.product ? (
                    <ProductItemImage
                      src={item.product.image}
                      alt={item.product.name}
                      category={item.product.category}
                      placeholderColor={item.product.placeholderColor}
                      sizes="64px"
                      showNote={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-muted text-bark-600">
                      <PackageOpen className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">
                      {item.type === 'box' ? 'Mystery Box' : 'Sản phẩm lẻ'}
                    </Badge>
                    {item.type === 'box' && item.petName && (
                      <span className="px-2 py-0.5 rounded-tag bg-pine-50 text-pine-900 text-[11px] font-semibold">Bé {item.petName}</span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-pine-950 leading-snug">
                    {item.type === 'box' ? item.boxType?.name : item.product?.name}
                  </h3>

                  {conflicts.length > 0 && (
                    <p className="flex items-start gap-1 text-[11px] text-red-700 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>
                        Sản phẩm có thể chứa {conflicts.map((c) => `${c.allergy.toLowerCase()} (bé ${c.petName} đang khai báo dị ứng)`).join(", ")}.
                      </span>
                    </p>
                  )}

                  {/* Cho phép đổi Pet ngay trong giỏ hàng nếu là dòng Box */}
                  {item.type === 'box' && eligiblePetsFor(item).length > 1 && (
                    <div className="pt-1 flex items-center gap-2">
                      <label className="text-[11px] text-bark-500" htmlFor={`pet-${item.id}`}>Đổi bé nhận hộp:</label>
                      <select
                        id={`pet-${item.id}`}
                        value={item.petId || ""}
                        onChange={(e) => {
                          const newPet = pets.find((p) => p.id === e.target.value);
                          if (newPet) {
                            updatePetForBox(item.id, newPet.id, newPet.name);
                          }
                        }}
                        className="min-h-9 text-xs font-medium px-2 rounded-box border border-surface-border bg-white text-pine-950"
                      >
                        {eligiblePetsFor(item).map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name} ({pet.breed})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Số lượng & Thành tiền */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-border">
                {item.type === 'box' ? (
                  <span className="text-xs text-bark-500" title="Mỗi đơn chỉ mua 1 Mystery Box">1 hộp</span>
                ) : (
                  <div className="flex items-center border border-surface-border rounded-box bg-white">
                    <IconButton label="Giảm số lượng" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>
                      <Minus className="w-3.5 h-3.5" />
                    </IconButton>
                    <span className="w-8 text-center text-sm font-bold text-pine-950" aria-live="polite">{item.quantity}</span>
                    <IconButton label="Tăng số lượng" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                )}

                <div className="text-right min-w-[90px]">
                  <div className="text-sm font-extrabold text-pine-950 font-display">
                    {formatVND(item.unitPrice * item.quantity)}
                  </div>
                  {item.quantity > 1 && <div className="text-[11px] text-bark-500">{formatVND(item.unitPrice)} / món</div>}
                </div>

                <IconButton label="Xóa khỏi giỏ" className="hover:!text-red-600" onClick={() => handleRemove(item)}>
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </Card>
            );
          })}

          {/* Gợi ý gói định kỳ: nút phụ để không tranh với "Tiến hành đặt hàng" */}
          <div className="p-4 rounded-container bg-pine-50/70 border border-pine-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-pine-950">Muốn nhận hộp đều đặn mỗi tháng cho bé?</span>
              <p className="text-bark-600 mt-0.5">
                Gói 1, 3 hoặc 6 hộp, giao mỗi tháng. Gói 3 và 6 hộp giảm 10–15%, miễn phí vận chuyển.
              </p>
            </div>
            <ButtonLink href="/subscription" variant="secondary" size="sm" className="shrink-0">
              Xem các gói định kỳ
            </ButtonLink>
          </div>
        </div>

        {/* Tóm tắt đơn hàng & Nhập Voucher: Dạng Section tinh gọn có divider */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-container bg-surface-muted/50 border border-surface-border/70 space-y-4">
            <h2 className="text-base font-bold text-pine-950 pb-3 border-b border-surface-border">
              Tóm tắt đơn hàng
            </h2>

            {/* Ô nhập Voucher */}
            <form onSubmit={handleApply} className="space-y-1.5">
              <label className="text-xs font-bold text-bark-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-pine-700" />
                <span>Mã giảm giá / Voucher:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="flex-1 min-h-11 md:min-h-9 px-3 text-xs rounded-box border border-surface-border focus:border-pine-900 focus:outline-none bg-surface-card"
                />
                <Button type="submit" variant="secondary" size="sm" disabled={!inputCode.trim()}>
                  Áp dụng
                </Button>
              </div>

              {voucherMessage && (
                <div
                  className={`text-[11px] font-medium pt-1 flex items-center gap-1 ${
                    voucherDiscount > 0 ? "text-grass-700" : "text-red-600"
                  }`}
                >
                  {voucherDiscount > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{voucherMessage}</span>
                </div>
              )}
            </form>

            {/* Bảng tính tiền */}
            <div className="space-y-2 pt-3 border-t border-surface-border text-xs">
              <div className="flex justify-between text-bark-600">
                <span>Tạm tính hàng:</span>
                <span className="font-semibold text-bark-900">{formatVND(subtotal)}</span>
              </div>

              <div className="flex justify-between text-bark-600">
                <span>Phí vận chuyển:</span>
                <span>{formatShippingFee(shippingFee)}</span>
              </div>
              {shippingFee === null && (
                <p className="text-[11px] text-bark-500">
                  {formatVND(SHIPPING_CONFIG.hcmFee)} nội thành TP.HCM, {formatVND(SHIPPING_CONFIG.otherFee)} tỉnh khác. Tính chính xác ở bước đặt hàng.
                </p>
              )}

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-grass-700 font-semibold">
                  <span>Giảm giá ({voucherCode}):</span>
                  <span>−{formatVND(voucherDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-surface-border text-sm font-extrabold text-pine-950">
                <span>{shippingFee === null ? "Tạm tính (chưa gồm ship):" : "Tổng thanh toán:"}</span>
                <span className="text-xl font-extrabold font-display text-pine-950">
                  {formatVND(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              <span>Tiến hành đặt hàng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
