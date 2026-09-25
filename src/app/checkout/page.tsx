"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import { fetchBoxTypeById, fetchSubscriptionPlans } from "@/lib/catalog";
import { BoxType, SUBSCRIPTION_PLANS } from "@/mock/boxTypes";
import { CreditCard, Truck, ArrowLeft, Lock, Banknote, Smartphone } from "lucide-react";

function CheckoutFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSubscription = searchParams.get("type") === "subscription";
  const boxId = searchParams.get("box");
  const petId = searchParams.get("pet");
  const planId = searchParams.get("plan");

  const { cart, user, subtotal, shippingFee, total, clearCart, pets, isLoggedIn } = useApp();

  const [recipientName, setRecipientName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [province, setProvince] = useState("TP. Hồ Chí Minh");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [deliverySchedule, setDeliverySchedule] = useState<'dau_thang' | 'giua_thang'>('dau_thang');
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'vnpay' | 'cod'>('momo');

  const [subBox, setSubBox] = useState<BoxType | null>(null);
  const [realPlans, setRealPlans] = useState<Awaited<ReturnType<typeof fetchSubscriptionPlans>>>([]);

  const mockPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];
  const subPet = pets.find((p) => p.id === petId) || pets[0];

  useEffect(() => {
    if (isSubscription && boxId) {
      fetchBoxTypeById(boxId).then(setSubBox);
      fetchSubscriptionPlans().then(setRealPlans);
    }
  }, [isSubscription, boxId]);

  useEffect(() => {
    // Gói định kỳ và Mystery Box luôn cần đăng nhập (SPEC §4, §5); hàng lẻ cho phép mua không cần tài khoản.
    const cartHasBox = cart.some((c) => c.type === "box");
    if (!isLoggedIn && (isSubscription || cartHasBox)) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isLoggedIn, isSubscription, cart, router]);

  const unitPrice = subBox ? Math.round(subBox.basePrice * (1 - mockPlan.discountPercent / 100)) : 0;
  const finalAmount = isSubscription ? unitPrice * mockPlan.cycles : total;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    const supabase = createClient();

    try {
      if (isSubscription) {
        if (!subBox || !subPet) throw new Error("Thiếu thông tin box hoặc thú cưng");
        const realPlan = realPlans.find((p) => p.cycle_count === mockPlan.cycles);
        if (!realPlan) throw new Error("Không tìm thấy gói phù hợp");
        if (paymentMethod === "cod") throw new Error("Gói định kỳ chỉ thanh toán online");

        const { data, error } = await supabase.rpc("subscribe_to_box", {
          p_box_type_id: subBox.id,
          p_pet_id: subPet.id,
          p_plan_id: realPlan.id,
          p_delivery_schedule: deliverySchedule,
          p_recipient_name: recipientName,
          p_recipient_phone: phone,
          p_province_city: province,
          p_district: district,
          p_ward: ward,
          p_shipping_address: address,
          p_payment_method: paymentMethod,
        });
        if (error) throw error;
        const result = data as { order_id: string; order_code: string; total_amount: number };
        router.push(`/checkout/pay/${result.order_id}?code=${result.order_code}&amount=${result.total_amount}&method=${paymentMethod}&sub=1`);
        return;
      }

      if (cart.length === 0) throw new Error("Giỏ hàng trống");

      const items = cart.map((c) =>
        c.type === "retail"
          ? { product_id: c.productId, quantity: c.quantity }
          : { box_type_id: c.boxTypeId, pet_id: c.petId, quantity: c.quantity }
      );

      const { data, error } = await supabase.rpc("checkout_create_order", {
        p_items: items,
        p_recipient_name: recipientName,
        p_recipient_phone: phone,
        p_province_city: province,
        p_district: district,
        p_ward: ward,
        p_shipping_address: address,
        p_payment_method: paymentMethod,
        p_customer_notes: notes || undefined,
      });

      if (error) throw error;
      const result = data as { order_id: string; order_code: string; status: string; total_amount: number };
      await clearCart();

      if (paymentMethod === "cod") {
        router.push(`/checkout/result?code=${result.order_code}&method=cod&amount=${result.total_amount}&status=confirmed`);
      } else {
        router.push(`/checkout/pay/${result.order_id}?code=${result.order_code}&amount=${result.total_amount}&method=${paymentMethod}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại";
      setErrorMsg(friendlyCheckoutError(message));
    } finally {
      setSubmitting(false);
    }
  };

  function friendlyCheckoutError(message: string): string {
    if (message.includes("ERR_OUT_OF_STOCK")) return "Một sản phẩm trong giỏ đã hết hàng: " + message.split(":")[1];
    if (message.includes("ERR_EMPTY_CART")) return "Giỏ hàng của bạn đang trống.";
    if (message.includes("ERR_COD_LIMIT_EXCEEDED")) return "Đơn trên 2.000.000₫ không hỗ trợ thanh toán khi nhận hàng (COD).";
    if (message.includes("ERR_LOGIN_REQUIRED_FOR_BOX")) return "Vui lòng đăng nhập để mua Mystery Box.";
    if (message.includes("ERR_PET_NOT_OWNED")) return "Thú cưng không hợp lệ, vui lòng chọn lại.";
    if (message.includes("ERR_VOUCHER")) return "Mã voucher không áp dụng được cho đơn này.";
    return message;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
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

      {errorMsg && (
        <div className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Thông tin nhận hàng</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-bark-800 block mb-1">Họ tên người nhận: *</label>
                <input type="text" required value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-bark-800 block mb-1">Số điện thoại liên hệ: *</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Tỉnh/Thành: *</label>
                  <input type="text" required value={province} onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Quận/Huyện: *</label>
                  <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
                </div>
                <div>
                  <label className="font-bold text-bark-800 block mb-1">Phường/Xã: *</label>
                  <input type="text" required value={ward} onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="font-bold text-bark-800 block mb-1">Số nhà, tên đường: *</label>
                <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none leading-relaxed" />
              </div>
              <div>
                <label className="font-bold text-bark-800 block mb-1">Ghi chú cho shipper (tùy chọn):</label>
                <input type="text" placeholder="Ví dụ: Gọi trước khi giao, gửi bảo vệ nếu vắng nhà..." value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Phương thức vận chuyển</span>
            </h2>

            {isSubscription ? (
              <div className="space-y-3 text-xs">
                <div className="font-semibold text-bark-800">Chọn đợt giao hàng hằng tháng cho bé {subPet?.name}:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDeliverySchedule('dau_thang')}
                    className={`p-3.5 rounded-box border text-left transition-colors cursor-pointer ${deliverySchedule === 'dau_thang' ? 'border-pine-900 bg-pine-50/70 font-bold text-pine-950 ring-1 ring-pine-900/20' : 'border-surface-border bg-surface hover:bg-surface-muted text-bark-700'}`}>
                    <div>Đợt Đầu tháng</div>
                    <div className="text-[11px] text-bark-500 font-normal mt-0.5">Ngày 1–5 hằng tháng</div>
                  </button>
                  <button type="button" onClick={() => setDeliverySchedule('giua_thang')}
                    className={`p-3.5 rounded-box border text-left transition-colors cursor-pointer ${deliverySchedule === 'giua_thang' ? 'border-pine-900 bg-pine-50/70 font-bold text-pine-950 ring-1 ring-pine-900/20' : 'border-surface-border bg-surface hover:bg-surface-muted text-bark-700'}`}>
                    <div>Đợt Giữa tháng</div>
                    <div className="text-[11px] text-bark-500 font-normal mt-0.5">Ngày 15–20 hằng tháng</div>
                  </button>
                </div>
                <p className="text-[11px] text-bark-500">* Ngày chốt hộp (cut-off) là 7 ngày trước đợt giao để chuẩn bị món ăn tươi.</p>
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
                <span className="font-bold text-pine-950">{shippingFee === 0 ? "Freeship" : formatVND(shippingFee)}</span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Hình thức thanh toán</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <label className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${paymentMethod === 'momo' ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20' : 'border-surface-border hover:bg-surface-muted'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="payment" value="momo" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} className="accent-pine-900" />
                  <div>
                    <span className="font-bold text-pine-950">Ví điện tử MoMo</span>
                    <p className="text-[11px] text-bark-500">Sandbox demo - quét mã QR giả lập</p>
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-bark-600 shrink-0" />
              </label>

              <label className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${paymentMethod === 'vnpay' ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20' : 'border-surface-border hover:bg-surface-muted'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="payment" value="vnpay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} className="accent-pine-900" />
                  <div>
                    <span className="font-bold text-pine-950">VNPay QR / Thẻ ATM & Thẻ quốc tế</span>
                    <p className="text-[11px] text-bark-500">Sandbox demo - 40+ ngân hàng, Visa, Mastercard</p>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-bark-600 shrink-0" />
              </label>

              {!isSubscription ? (
                <label className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20' : 'border-surface-border hover:bg-surface-muted'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="accent-pine-900" />
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

        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-container bg-surface-muted/50 border border-surface-border/80 space-y-4 sticky top-20">
            <h2 className="text-sm font-bold text-pine-950 pb-3 border-b border-surface-border flex items-center justify-between">
              <span>Đơn hàng của bạn</span>
              <span className="text-xs font-normal text-bark-500">{isSubscription ? "Gói định kỳ" : `${cart.length} dòng`}</span>
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {isSubscription ? (
                subBox ? (
                  <div className="p-3 rounded-box bg-surface-card border border-surface-border/60 space-y-1 text-xs">
                    <div className="font-bold text-pine-950">{subBox.name}</div>
                    <div className="text-[11px] text-pine-800 font-semibold">{mockPlan.name}</div>
                    <div className="text-[11px] text-bark-500">Dành cho bé: {subPet?.name} ({subPet?.breed})</div>
                    <div className="text-[11px] text-grass-700 font-medium pt-1">
                      Giao đợt: {deliverySchedule === 'dau_thang' ? 'Đầu tháng (1–5)' : 'Giữa tháng (15–20)'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-bark-500">Đang tải thông tin box...</div>
                )
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="truncate pr-2">
                      <span className="font-bold text-pine-950">{item.quantity}x </span>
                      <span className="text-bark-800 truncate">{item.type === 'box' ? item.boxType?.name : item.product?.name}</span>
                      {item.type === 'box' && <span className="text-[11px] text-pine-800 block">(Bé {item.petName})</span>}
                    </div>
                    <span className="font-semibold text-bark-900 shrink-0">{formatVND(item.unitPrice * item.quantity)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-surface-border text-xs">
              <div className="flex justify-between text-bark-600">
                <span>Tạm tính:</span>
                <span className="font-semibold text-bark-900">{formatVND(isSubscription ? finalAmount : subtotal)}</span>
              </div>
              <div className="flex justify-between text-bark-600">
                <span>Phí vận chuyển:</span>
                <span>{isSubscription || shippingFee === 0 ? "Freeship" : formatVND(shippingFee)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-surface-border text-sm font-extrabold text-pine-950">
                <span>Tổng cộng:</span>
                <span className="text-2xl font-extrabold font-display text-pine-950">{formatVND(finalAmount)}</span>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-4 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-60">
              <span>{submitting ? "Đang xử lý..." : "Xác nhận & Đặt hàng ngay"}</span>
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
