"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Trash2, ShoppingBag, Sparkles, Tag, CheckCircle2, AlertCircle, PackageOpen, UtensilsCrossed, PawPrint } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

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
  } = useApp();

  const [inputCode, setInputCode] = useState("");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyVoucher(inputCode);
  };

  const remainingForFreeship = Math.max(0, 500000 - subtotal);

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
          <Sparkles className="w-4 h-4 text-honey-600" />
          {remainingForFreeship === 0 ? (
            <span className="font-bold text-grass-700">
              Bạn đã đủ điều kiện nhận MIỄN PHÍ VẬN CHUYỂN toàn quốc!
            </span>
          ) : (
            <span className="text-bark-700">
              Mua thêm <strong>{formatVND(remainingForFreeship)}</strong> để được <strong>Freeship</strong> (đơn từ 500k).
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Danh sách dòng sản phẩm */}
        <div className="lg:col-span-8 space-y-3">
          {cart.map((item) => (
            <Card
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Icon loại sản phẩm */}
                <div
                  className="w-16 h-16 rounded-box flex items-center justify-center text-2xl shrink-0 border border-black/5"
                  style={{
                    backgroundColor:
                      item.type === 'box'
                        ? item.boxType?.imagePlaceholderColor || '#E1EDE8'
                        : item.product?.placeholderColor || '#FEF7E6',
                  }}
                >
                  {item.type === 'box' ? (
                    <PackageOpen className="w-6 h-6 text-pine-900" />
                  ) : item.product?.category === 'food' ? (
                    <UtensilsCrossed className="w-6 h-6 text-bark-700" />
                  ) : (
                    <PawPrint className="w-6 h-6 text-bark-700" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">
                      {item.type === 'box' ? 'Mystery Box' : 'Sản phẩm lẻ'}
                    </Badge>
                    {item.type === 'box' && (
                      <span className="text-[11px] text-pine-900 font-semibold">
                        Dành cho bé: {item.petName || "Bé cưng"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-pine-950 leading-snug">
                    {item.type === 'box' ? item.boxType?.name : item.product?.name}
                  </h3>

                  <div className="text-xs font-semibold text-bark-800">
                    {formatVND(item.unitPrice)}
                  </div>

                  {/* Cho phép đổi Pet ngay trong giỏ hàng nếu là dòng Box */}
                  {item.type === 'box' && pets.length > 1 && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[11px] text-bark-500">Đổi bé nhận hộp:</span>
                      <select
                        value={item.petId || ""}
                        onChange={(e) => {
                          const newPet = pets.find((p) => p.id === e.target.value);
                          if (newPet) {
                            updatePetForBox(item.id, newPet.id, newPet.name);
                          }
                        }}
                        className="text-xs font-medium py-0.5 px-2 rounded border border-surface-border bg-surface-muted text-pine-950"
                      >
                        {pets.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name} ({pet.breed})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Tăng giảm số lượng & Thành tiền */}
              <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-border">
                <div className="flex items-center border border-surface-border rounded-box bg-surface-muted">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="px-2.5 py-1 text-bark-700 hover:bg-surface-border text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="px-2.5 text-xs font-bold text-pine-950">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="px-2.5 py-1 text-bark-700 hover:bg-surface-border text-sm font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[90px]">
                  <div className="text-sm font-extrabold text-pine-950 font-display">
                    {formatVND(item.unitPrice * item.quantity)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="p-1.5 text-bark-400 hover:text-red-600 transition-colors"
                  title="Xóa khỏi giỏ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}

          {/* Banner Upsell Gói định kỳ: Thiết kế phẳng không đóng card nổi */}
          <div className="p-4 rounded-container bg-pine-50/70 border border-pine-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-pine-950">Muốn nhận hộp đều đặn mỗi tháng cho bé?</span>
              <p className="text-bark-600 mt-0.5">
                Đăng ký Gói định kỳ 3 hoặc 6 hộp để tiết kiệm 10–15% và được miễn phí vận chuyển trọn gói.
              </p>
            </div>
            <Link
              href="/boxes"
              className="px-3.5 py-1.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold shrink-0 transition-colors"
            >
              Xem các gói định kỳ
            </Link>
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
                  placeholder="Nhập mã, VD: CHAOMUNG10"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-box border border-surface-border focus:border-pine-900 focus:outline-none bg-surface-card"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Áp dụng
                </button>
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
                <span>Phí vận chuyển dự kiến:</span>
                <span>{shippingFee === 0 ? "Miễn phí" : formatVND(shippingFee)}</span>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-grass-700 font-semibold">
                  <span>Giảm giá ({voucherCode}):</span>
                  <span>−{formatVND(voucherDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-surface-border text-sm font-extrabold text-pine-950">
                <span>Tổng thanh toán:</span>
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
              <span>Tiến hành đặt hàng ({formatVND(total)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
