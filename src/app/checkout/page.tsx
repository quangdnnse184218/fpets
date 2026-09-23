"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { BOX_TYPES, SUBSCRIPTION_PLANS } from "@/mock/boxTypes";
import { Order } from "@/mock/orders";
import { CheckCircle2, ShieldCheck, CreditCard, Truck, ArrowLeft, Lock, Banknote, Smartphone } from "lucide-react";

function CheckoutFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSubscription = searchParams.get("type") === "subscription";
  const boxId = searchParams.get("box");
  const petId = searchParams.get("pet");
  const planId = searchParams.get("plan");

  const { cart, user, subtotal, shippingFee, total, clearCart, addOrder, pets } = useApp();

  // Khối 1: Thông tin người nhận
  const [recipientName, setRecipientName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [notes, setNotes] = useState("");

  // Với subscription: chọn đợt giao
  const [deliverySchedule, setDeliverySchedule] = useState<'dau_thang' | 'giua_thang'>('dau_thang');

  // Khối 3: Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState<'MoMo' | 'VNPay' | 'COD'>('MoMo');

  // Tính toán số tiền
  let finalAmount = total;
  let subBox = BOX_TYPES[0];
  let subPlan = SUBSCRIPTION_PLANS[1];
  let subPet = pets[0];

  if (isSubscription) {
    subBox = BOX_TYPES.find((b) => b.id === boxId) || BOX_TYPES[0];
    subPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];
    subPet = pets.find((p) => p.id === petId) || pets[0];

    const unitPrice = Math.round(subBox.basePrice * (1 - subPlan.discountPercent / 100));
    finalAmount = unitPrice * subPlan.cycles;
  }

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const orderCode = `FPET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: "ord-" + Date.now(),
      orderCode: orderCode,
      orderType: isSubscription ? 'subscription_cycle' : 'retail',
      subscriptionLabel: isSubscription ? `Kỳ 1/${subPlan.cycles} (${subPlan.name})` : undefined,
      status: paymentMethod === 'COD' ? 'da_xac_nhan' : 'da_xac_nhan',
      statusLabel: 'Đã xác nhận',
      createdAt: new Date().toLocaleDateString('vi-VN') + " " + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Chờ thanh toán' : 'Đã thanh toán',
      recipientName: recipientName,
      recipientPhone: phone,
      shippingAddress: address,
      subtotal: isSubscription ? finalAmount : subtotal,
      shippingFee: isSubscription ? 0 : shippingFee,
      discount: 0,
      totalAmount: finalAmount,
      items: isSubscription
        ? [
            {
              id: "sub-item-1",
              name: `${subBox.name} (${subPlan.name})`,
              type: "box",
              petName: subPet?.name,
              quantity: 1,
              unitPrice: finalAmount,
              totalPrice: finalAmount,
            },
          ]
        : cart.map((c) => ({
            id: c.id,
            name: c.type === 'box' ? (c.boxType?.name || "Mystery Box") : (c.product?.name || "Sản phẩm"),
            type: c.type,
            petName: c.petName,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            totalPrice: c.unitPrice * c.quantity,
          })),
      timeline: [
        {
          time: "Vừa xong",
          title: "Đặt hàng thành công",
          description: `Đơn hàng đã được ghi nhận qua phương thức ${paymentMethod}.`,
          completed: true,
        },
      ],
    };

    addOrder(newOrder);
    if (!isSubscription) {
      clearCart();
    }

    router.push(`/checkout/result?code=${orderCode}&method=${paymentMethod}&amount=${finalAmount}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header checkout */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <Link href="/cart" className="text-xs font-semibold text-bark-600 hover:text-bark-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại giỏ hàng</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-grass-700 font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>Thanh toán an toàn SSL</span>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Khối Thông Tin Bên Trái: Tích hợp liền mạch với divider mảnh, không lạm dụng 3 card lặp lại */}
        <div className="lg:col-span-7 rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border shadow-xs overflow-hidden">
          {/* KHỐI 1: Thông tin người nhận */}
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Thông tin nhận hàng</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-bark-800 block mb-1">Họ tên người nhận: *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">Số điện thoại liên hệ: *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">Địa chỉ giao hàng đầy đủ: *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-bark-800 block mb-1">Ghi chú cho shipper (tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gọi trước khi giao, gửi bảo vệ nếu vắng nhà..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* KHỐI 2: Phương thức giao hàng */}
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Phương thức vận chuyển</span>
            </h2>

            {isSubscription ? (
              <div className="space-y-3 text-xs">
                <div className="font-semibold text-bark-800">
                  Chọn đợt giao hàng hằng tháng cho bé {subPet?.name}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliverySchedule('dau_thang')}
                    className={`p-3.5 rounded-box border text-left transition-colors cursor-pointer ${
                      deliverySchedule === 'dau_thang'
                        ? 'border-pine-900 bg-pine-50/70 font-bold text-pine-950 ring-1 ring-pine-900/20'
                        : 'border-surface-border bg-surface hover:bg-surface-muted text-bark-700'
                    }`}
                  >
                    <div>Đợt Đầu tháng</div>
                    <div className="text-[11px] text-bark-500 font-normal mt-0.5">Ngày 1–5 hằng tháng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliverySchedule('giua_thang')}
                    className={`p-3.5 rounded-box border text-left transition-colors cursor-pointer ${
                      deliverySchedule === 'giua_thang'
                        ? 'border-pine-900 bg-pine-50/70 font-bold text-pine-950 ring-1 ring-pine-900/20'
                        : 'border-surface-border bg-surface hover:bg-surface-muted text-bark-700'
                    }`}
                  >
                    <div>Đợt Giữa tháng</div>
                    <div className="text-[11px] text-bark-500 font-normal mt-0.5">Ngày 15–20 hằng tháng</div>
                  </button>
                </div>
                <p className="text-[11px] text-bark-500">
                  * Ngày chốt hộp (cut-off) là 7 ngày trước đợt giao để chuẩn bị món ăn tươi.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-box bg-surface-muted/60 border border-surface-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-pine-900" />
                  <div>
                    <span className="font-bold text-pine-950">Giao hàng tiêu chuẩn toàn quốc</span>
                    <p className="text-[11px] text-bark-500">1–2 ngày (Nội thành) · 3–5 ngày (Tỉnh khác)</p>
                  </div>
                </div>
                <span className="font-bold text-pine-950">
                  {shippingFee === 0 ? "Freeship" : formatVND(shippingFee)}
                </span>
              </div>
            )}
          </div>

          {/* KHỐI 3: Phương thức thanh toán */}
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Hình thức thanh toán</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              {/* MoMo */}
              <label
                className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${
                  paymentMethod === 'MoMo'
                    ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="MoMo"
                    checked={paymentMethod === 'MoMo'}
                    onChange={() => setPaymentMethod('MoMo')}
                    className="accent-pine-900"
                  />
                  <div>
                    <span className="font-bold text-pine-950">Ví điện tử MoMo</span>
                    <p className="text-[11px] text-bark-500">Quét mã QR hoặc mở ứng dụng MoMo trên điện thoại</p>
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-bark-600 shrink-0" />
              </label>

              {/* VNPay */}
              <label
                className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${
                  paymentMethod === 'VNPay'
                    ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20'
                    : 'border-surface-border hover:bg-surface-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="VNPay"
                    checked={paymentMethod === 'VNPay'}
                    onChange={() => setPaymentMethod('VNPay')}
                    className="accent-pine-900"
                  />
                  <div>
                    <span className="font-bold text-pine-950">VNPay QR / Thẻ ATM & Thẻ quốc tế</span>
                    <p className="text-[11px] text-bark-500">Hỗ trợ 40+ ngân hàng Việt Nam, Visa, Mastercard</p>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-bark-600 shrink-0" />
              </label>

              {/* COD: Chỉ cho phép đơn mua lẻ / mua 1 lần */}
              {!isSubscription ? (
                <label
                  className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20'
                      : 'border-surface-border hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-pine-900"
                    />
                    <div>
                      <span className="font-bold text-pine-950">Thanh toán khi nhận hàng (COD)</span>
                      <p className="text-[11px] text-bark-500">Áp dụng cho đơn dưới 2.000.000₫. CSKH sẽ gọi xác nhận đơn đầu</p>
                    </div>
                  </div>
                  <Banknote className="w-5 h-5 text-bark-600 shrink-0" />
                </label>
              ) : (
                <div className="p-3 rounded-box bg-surface-muted text-[11px] text-bark-500">
                  * Gói định kỳ áp dụng ưu đãi trả trước nên chỉ chấp nhận thanh toán online qua MoMo hoặc VNPay.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KHỐI 4: Xem lại đơn hàng & Nút Đặt hàng */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-container bg-surface-muted/50 border border-surface-border/80 space-y-4 sticky top-20">
            <h2 className="text-sm font-bold text-pine-950 pb-3 border-b border-surface-border flex items-center justify-between">
              <span>Đơn hàng của bạn</span>
              <span className="text-xs font-normal text-bark-500">
                {isSubscription ? "Gói định kỳ" : `${cart.length} dòng`}
              </span>
            </h2>

            {/* Chi tiết item */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {isSubscription ? (
                <div className="p-3 rounded-box bg-surface-card border border-surface-border/60 space-y-1 text-xs">
                  <div className="font-bold text-pine-950">{subBox.name}</div>
                  <div className="text-[11px] text-pine-800 font-semibold">{subPlan.name}</div>
                  <div className="text-[11px] text-bark-500">Dành cho bé: {subPet?.name} ({subPet?.breed})</div>
                  <div className="text-[11px] text-grass-700 font-medium pt-1">
                    Giao đợt: {deliverySchedule === 'dau_thang' ? 'Đầu tháng (1–5)' : 'Giữa tháng (15–20)'}
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="truncate pr-2">
                      <span className="font-bold text-pine-950">{item.quantity}x </span>
                      <span className="text-bark-800 truncate">
                        {item.type === 'box' ? item.boxType?.name : item.product?.name}
                      </span>
                      {item.type === 'box' && (
                        <span className="text-[11px] text-pine-800 block">
                          (Bé {item.petName})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-bark-900 shrink-0">
                      {formatVND(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Bảng tổng tiền */}
            <div className="space-y-2 pt-3 border-t border-surface-border text-xs">
              <div className="flex justify-between text-bark-600">
                <span>Tạm tính:</span>
                <span className="font-semibold text-bark-900">
                  {formatVND(isSubscription ? finalAmount : subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-bark-600">
                <span>Phí vận chuyển:</span>
                <span>{isSubscription || shippingFee === 0 ? "Freeship" : formatVND(shippingFee)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-surface-border text-sm font-extrabold text-pine-950">
                <span>Tổng cộng:</span>
                <span className="text-2xl font-extrabold font-display text-pine-950">
                  {formatVND(finalAmount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              <span>Xác nhận & Đặt hàng ngay</span>
            </button>

            <div className="text-[11px] text-bark-500 text-center leading-relaxed">
              Bằng việc bấm đặt hàng, bạn đồng ý với chính sách đổi trả và điều khoản dịch vụ của FPETS.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<div className="max-w-5xl mx-auto py-16 text-center text-xs text-bark-500">Đang tải trang thanh toán...</div>}>
      <CheckoutFormContent />
    </React.Suspense>
  );
}
