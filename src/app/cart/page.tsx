"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductItemImage from "@/components/common/ProductItemImage";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Trash2, ShoppingBag, Truck, CheckCircle2, AlertCircle, PackageOpen, Minus, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { findAllergyConflicts } from "@/lib/petOptions";
import type { CartItem } from "@/context/AppContext";
import { SHIPPING_CONFIG } from "@/lib/shipping";
import { capitalize, discountSentence } from "@/lib/planCopy";
import { usePlans } from "@/lib/usePlans";

// Ngưỡng hiện nhãn "Chỉ còn X" (SPEC §4)
const LOW_STOCK = 5;
const MAX_PER_LINE = 10;

// Dòng mua được: hộp luôn mua được, sản phẩm lẻ phải còn hàng (SPEC §4: không cho thanh toán dòng hết hàng)
const canBuy = (item: CartItem) => item.type === "box" || (item.product?.stock ?? 0) > 0;
const nameOf = (item: CartItem) => (item.type === "box" ? item.boxType?.name : item.product?.name) || "sản phẩm";
const hrefOf = (item: CartItem) =>
  item.type === "box" ? (item.boxType ? `/boxes/${item.boxType.slug}` : "/boxes") : item.product ? `/shop/${item.product.slug}` : "/shop";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    isCartReady,
    pets,
    updateQuantity,
    updatePetForBox,
    removeFromCart,
    removeManyFromCart,
    selectedIds,
    selectedCart,
    toggleSelected,
    selectOnly,
    subtotal,
    shippingFee,
    total,
    voucherCode,
    voucherDiscount,
    voucherApplied,
    voucherMessage,
    applyVoucher,
    clearVoucher,
    addToCart,
  } = useApp();
  const { show } = useToast();
  const plans = usePlans();

  const [inputCode, setInputCode] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);

  // Dòng vừa hết hàng mà đang được tick thì bỏ tick, để tổng tiền không tính món không mua được
  useEffect(() => {
    const blocked = selectedCart.filter((c) => !canBuy(c)).map((c) => c.id);
    if (blocked.length > 0) selectOnly(selectedIds.filter((id) => !blocked.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCart]);

  // Xóa ngay, cho phép hoàn tác trong 5 giây. Hoàn tác thì món được tick lại như trước khi xóa.
  const handleRemove = (item: CartItem) => {
    const wasSelected = selectedIds.includes(item.id);
    const keepSelected = selectedIds.filter((id) => id !== item.id);
    removeFromCart(item.id);
    show(`Đã xóa ${nameOf(item)}`, {
      actions: [{ label: "Hoàn tác", onClick: async () => {
        const { id: _removedId, ...rest } = item;
        void _removedId;
        const lineId = await addToCart(rest);
        if (wasSelected && lineId) selectOnly([...keepSelected, lineId]);
      } }],
    });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyVoucher(inputCode);
  };

  // Box chỉ đổi được sang bé cùng loài (chó: cùng size) và chưa có hộp cùng loại trong giỏ — khớp ràng buộc ở server
  const eligiblePetsFor = (item: CartItem) =>
    pets.filter(
      (p) =>
        item.boxType &&
        p.species === item.boxType.species &&
        (item.boxType.species !== "dog" || p.size === item.boxType.size) &&
        !cart.some((other) => other.id !== item.id && other.type === "box" && other.boxTypeId === item.boxTypeId && other.petId === p.id)
    );

  // Giỏ hàng tài khoản tải từ server: chưa tải xong thì chưa kết luận là giỏ trống
  if (!isCartReady) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-bark-500" aria-busy="true">Đang tải giỏ hàng…</div>;
  }

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
            Chọn một Mystery Box cho bé, hoặc mua lẻ đồ ăn, đồ chơi trong cửa hàng.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/boxes"
            className="px-6 py-3 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs transition-colors"
          >
            Xem Mystery Box
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 rounded-box bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold text-xs transition-colors"
          >
            Vào cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  const buyable = cart.filter(canBuy);
  const selectedCount = selectedCart.length;
  const allSelected = buyable.length > 0 && buyable.every((c) => selectedIds.includes(c.id));
  const toggleAll = (on: boolean) => selectOnly(on ? buyable.map((c) => c.id) : []);
  const remainingForFreeship = Math.max(0, SHIPPING_CONFIG.freeShippingThreshold - subtotal);
  const freeshipPercent = Math.min(100, Math.round((subtotal / SHIPPING_CONFIG.freeShippingThreshold) * 100));
  const goCheckout = () => router.push("/checkout");
  const payLabel = selectedCount === 0 ? "Chọn món để thanh toán" : `Thanh toán (${selectedCount})`;
  const payButton =
    "rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm transition-colors disabled:bg-surface-muted disabled:text-bark-500 disabled:cursor-not-allowed";

  // Ô số lượng dùng chung cho bố cục điện thoại và máy tính
  const quantityControl = (item: CartItem) => {
    if (item.type === "box") return <span className="text-xs text-bark-600" title="Mỗi hộp được chọn món riêng cho 1 bé">1 hộp</span>;
    const max = Math.min(MAX_PER_LINE, item.product?.stock ?? MAX_PER_LINE);
    return (
      <div className="inline-flex items-center border border-surface-border rounded-box bg-white">
        <IconButton label="Giảm số lượng" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>
          <Minus className="w-3.5 h-3.5" />
        </IconButton>
        <span className="w-8 text-center text-sm font-bold text-pine-950 tabular-nums" aria-live="polite">{item.quantity}</span>
        <IconButton label="Tăng số lượng" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= max}>
          <Plus className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    );
  };
  const removeButton = (item: CartItem) => (
    <IconButton label={`Xóa ${nameOf(item)} khỏi giỏ`} className="hover:!text-red-600" onClick={() => handleRemove(item)}>
      <Trash2 className="w-4 h-4" />
    </IconButton>
  );

  return (
    // pb lớn trên điện thoại/tablet để nội dung cuối không bị thanh thanh toán che
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-28 lg:pb-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
        Giỏ hàng <span className="ml-1 text-base font-semibold text-bark-600 font-sans">{cart.length} sản phẩm</span>
      </h1>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8 lg:items-start">
        {/* ---------- Danh sách món ---------- */}
        <div className="min-w-0 space-y-3">
          <section aria-label="Các món trong giỏ" className="rounded-container bg-surface-card border border-surface-border overflow-hidden">
            <div className="flex items-center gap-4 px-4 sm:px-5 min-h-12 border-b border-surface-border bg-surface-muted/50 text-xs font-bold text-bark-600">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-pine-950 mr-auto">
                <input type="checkbox" className="w-5 h-5 accent-pine-900" checked={allSelected} disabled={buyable.length === 0} onChange={(e) => toggleAll(e.target.checked)} />
                <span>Chọn tất cả ({buyable.length})</span>
              </label>
              <span className="hidden xl:block w-20 text-right">Đơn giá</span>
              <span className="hidden xl:block w-28 text-center">Số lượng</span>
              <span className="hidden xl:block w-24 text-right">Thành tiền</span>
              <span className="hidden xl:block w-9" aria-hidden="true" />
            </div>

            <ul className="divide-y divide-surface-border">
              {cart.map((item) => {
                const conflicts = item.product ? findAllergyConflicts(item.product, pets) : [];
                const name = nameOf(item);
                const checked = selectedIds.includes(item.id);
                const available = canBuy(item);
                const stock = item.product?.stock ?? 0;
                const petOptions = item.type === "box" ? eligiblePetsFor(item) : [];
                return (
                  <li key={item.id} className={`px-4 sm:px-5 py-4 transition-colors ${checked ? "bg-pine-50/50" : ""}`}>
                    <div className="flex items-start xl:items-center gap-3 sm:gap-4">
                      <input
                        type="checkbox"
                        className="mt-6 sm:mt-7 xl:mt-0 w-5 h-5 shrink-0 accent-pine-900 cursor-pointer disabled:cursor-not-allowed"
                        checked={checked}
                        disabled={!available}
                        onChange={() => toggleSelected(item.id)}
                        aria-label={`Chọn ${name} để thanh toán`}
                      />

                      <Link href={hrefOf(item)} className={`relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0 rounded-box overflow-hidden border border-surface-border bg-surface-muted ${available ? "" : "opacity-50"}`} tabIndex={-1} aria-hidden="true">
                        {item.type === "box" && item.boxType?.imageUrl ? (
                          <Image src={item.boxType.imageUrl} alt="" fill sizes="72px" className="object-cover" />
                        ) : item.product ? (
                          <ProductItemImage src={item.product.image} alt="" category={item.product.category} placeholderColor={item.product.placeholderColor} sizes="72px" showNote={false} />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-bark-600"><PackageOpen className="w-6 h-6" /></span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={hrefOf(item)} className="block text-sm font-bold text-pine-950 leading-snug hover:underline underline-offset-2">
                          {name}
                        </Link>
                        <p className="text-xs text-bark-600">
                          {item.type === "box" ? `Mystery Box${item.petName ? ` · Bé ${item.petName}` : ""}` : item.product?.categoryLabel}
                          {item.type === "retail" && available && stock <= LOW_STOCK && <span className="font-semibold text-honey-700"> · Chỉ còn {stock}</span>}
                        </p>
                        {!available && <p className="text-xs font-bold text-red-700">Hết hàng, không thanh toán được</p>}

                        {conflicts.length > 0 && (
                          <p className="flex items-start gap-1 text-xs text-red-700 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                            <span>
                              Có thể chứa {conflicts.map((c) => `${c.allergy.toLowerCase()} (bé ${c.petName} dị ứng)`).join(", ")}.
                            </span>
                          </p>
                        )}

                        {/* Cho phép đổi Pet ngay trong giỏ hàng nếu là dòng Box */}
                        {petOptions.length > 1 && (
                          <div className="pt-0.5 flex items-center gap-2">
                            <label className="text-xs text-bark-600" htmlFor={`pet-${item.id}`}>Đổi bé nhận hộp:</label>
                            <select
                              id={`pet-${item.id}`}
                              value={item.petId || ""}
                              onChange={(e) => {
                                const newPet = pets.find((p) => p.id === e.target.value);
                                if (newPet) updatePetForBox(item.id, newPet.id, newPet.name);
                              }}
                              className="min-h-9 text-xs font-medium px-2 rounded-box border border-surface-border bg-white text-pine-950"
                            >
                              {petOptions.map((pet) => (
                                <option key={pet.id} value={pet.id}>
                                  {pet.name}{pet.breed ? ` (${pet.breed})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Màn hình dưới 1280px: số lượng, thành tiền và nút xóa nằm ngay dưới tên món */}
                        <div className="xl:hidden pt-1.5 flex items-center gap-3">
                          {quantityControl(item)}
                          <span className="ml-auto text-sm font-extrabold text-pine-950 font-display">{formatVND(item.unitPrice * item.quantity)}</span>
                          {removeButton(item)}
                        </div>
                      </div>

                      {/* Màn hình rộng: các cột thẳng hàng với tiêu đề phía trên */}
                      <span className="hidden xl:block w-20 text-right text-sm text-bark-700 tabular-nums">{formatVND(item.unitPrice)}</span>
                      <span className="hidden xl:flex w-28 justify-center">{quantityControl(item)}</span>
                      <span className="hidden xl:block w-24 text-right text-sm font-extrabold text-pine-950 font-display tabular-nums">{formatVND(item.unitPrice * item.quantity)}</span>
                      <span className="hidden xl:flex w-9 justify-end">{removeButton(item)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-sm">
            <Link href="/shop" className="font-bold text-pine-900 hover:underline underline-offset-2 min-h-9 inline-flex items-center">Tiếp tục mua sắm</Link>
            {selectedCount > 0 && (
              <button type="button" onClick={() => setConfirmBulk(true)} className="min-h-9 font-semibold text-bark-700 hover:text-red-700 underline underline-offset-2">
                Xóa {selectedCount} sản phẩm đã chọn
              </button>
            )}
          </div>

          {/* Gợi ý gói định kỳ (SPEC §4), một dòng gọn dưới danh sách */}
          <p className="px-1 text-sm text-bark-600">
            Muốn bé nhận hộp mỗi tháng? {capitalize(discountSentence(plans))}.{" "}
            <Link href="/subscription" className="font-bold text-pine-900 hover:underline underline-offset-2">Xem gói định kỳ</Link>
          </p>
        </div>

        {/* ---------- Tóm tắt đơn: bám theo khi cuộn trên máy tính ---------- */}
        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-24" aria-label="Tóm tắt đơn hàng">
          <div className="rounded-container bg-surface-card border border-surface-border p-5 space-y-4">
            <h2 className="text-base font-bold text-pine-950">Tóm tắt đơn hàng</h2>

            <form onSubmit={handleApply} className="space-y-1.5">
              <label htmlFor="cart-voucher" className="text-xs font-bold text-bark-700">Mã giảm giá</label>
              <div className="flex gap-2">
                <input
                  id="cart-voucher"
                  type="text"
                  placeholder="Nhập mã"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  autoComplete="off"
                  className="flex-1 min-w-0 min-h-11 px-3 text-sm rounded-box border border-surface-border focus:border-pine-900 focus:outline-none bg-white uppercase placeholder:normal-case"
                />
                <Button type="submit" variant="secondary" size="sm" className="shrink-0 whitespace-nowrap" disabled={!inputCode.trim()}>
                  Áp dụng
                </Button>
              </div>
              {voucherMessage && (
                <div className={`text-xs font-medium pt-0.5 flex items-center gap-1 ${voucherApplied ? "text-grass-700" : "text-red-600"}`}>
                  {voucherApplied ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{voucherMessage}</span>
                  {voucherApplied && (
                    <button type="button" onClick={() => { clearVoucher(); setInputCode(""); }} className="ml-auto font-bold text-bark-700 underline underline-offset-2">
                      Bỏ mã
                    </button>
                  )}
                </div>
              )}
            </form>

            <dl className="space-y-2 pt-4 border-t border-surface-border text-sm">
              <div className="flex justify-between gap-3 text-bark-700">
                <dt>Tạm tính ({selectedCount} sản phẩm)</dt>
                <dd className="font-semibold text-pine-950 tabular-nums">{formatVND(subtotal)}</dd>
              </div>
              {voucherDiscount > 0 && (
                <div className="flex justify-between gap-3 text-grass-700 font-semibold">
                  <dt>Giảm giá ({voucherCode})</dt>
                  <dd className="tabular-nums">−{formatVND(voucherDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 text-bark-700">
                <dt>Phí vận chuyển</dt>
                <dd className="tabular-nums text-right">
                  {selectedCount === 0 ? "—" : shippingFee === 0 ? <span className="font-semibold text-grass-700">Miễn phí</span> : `${formatVND(SHIPPING_CONFIG.hcmFee)} – ${formatVND(SHIPPING_CONFIG.otherFee)}`}
                </dd>
              </div>
            </dl>

            {/* Mốc miễn phí vận chuyển: chỉ hiện ở đây, kèm thanh tiến độ theo các món đang tick.
                Khi đơn đã được miễn phí thì dòng "Phí vận chuyển: Miễn phí" ở trên là đủ, không nhắc lại. */}
            {!(selectedCount > 0 && shippingFee === 0) && (
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-pine-700 transition-[width] duration-300" style={{ width: `${freeshipPercent}%` }} />
                </div>
                <p className="flex items-start gap-1.5 text-xs text-bark-700">
                  <Truck className="w-4 h-4 shrink-0 text-pine-800" aria-hidden="true" />
                  {selectedCount === 0 ? (
                    <span>Đơn từ <strong className="text-pine-950">{formatVND(SHIPPING_CONFIG.freeShippingThreshold)}</strong> được miễn phí vận chuyển.</span>
                  ) : (
                    <span>Mua thêm <strong className="text-pine-950">{formatVND(remainingForFreeship)}</strong> để được miễn phí vận chuyển.</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex items-end justify-between gap-3 pt-4 border-t border-surface-border">
              <div>
                <div className="text-sm font-bold text-pine-950">Tổng cộng</div>
                {selectedCount > 0 && shippingFee === null && <div className="text-xs text-bark-600">chưa gồm phí vận chuyển</div>}
              </div>
              <div className="text-2xl font-extrabold font-display text-pine-950 tabular-nums">{formatVND(total)}</div>
            </div>

            {/* Điện thoại, tablet đã có thanh thanh toán dính đáy nên nút này chỉ hiện trên máy tính */}
            <button type="button" onClick={goCheckout} disabled={selectedCount === 0} className={`hidden lg:flex w-full min-h-12 items-center justify-center ${payButton}`}>
              {payLabel}
            </button>
          </div>
        </aside>
      </div>

      {/* Điện thoại, tablet: thanh thanh toán luôn nằm dưới đáy màn hình (trên thanh điều hướng), cuộn tới đâu cũng bấm được */}
      <div className="lg:hidden fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom,0px))] md:bottom-0 z-30 bg-surface-card border-t border-surface-border shadow-[0_-4px_12px_rgba(12,30,25,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="min-w-0 mr-auto">
            <div className="text-xs text-bark-600 truncate">
              {selectedCount === 0 ? "Chưa chọn món nào" : `Tổng cộng (${selectedCount} sản phẩm)`}
            </div>
            <div className="text-lg font-extrabold font-display text-pine-950 leading-tight tabular-nums">{formatVND(total)}</div>
          </div>
          <button type="button" onClick={goCheckout} disabled={selectedCount === 0} className={`shrink-0 h-11 px-5 ${payButton}`}>
            {selectedCount === 0 ? "Thanh toán" : `Thanh toán (${selectedCount})`}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBulk}
        title={`Xóa ${selectedCount} sản phẩm đã chọn?`}
        message="Các sản phẩm này sẽ rời khỏi giỏ hàng."
        confirmLabel="Xóa"
        onConfirm={async () => {
          await removeManyFromCart(selectedCart.map((c) => c.id));
          setConfirmBulk(false);
        }}
        onClose={() => setConfirmBulk(false)}
      />
    </div>
  );
}
