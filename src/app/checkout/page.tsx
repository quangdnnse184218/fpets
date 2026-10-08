"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import { calcShippingFee, formatShippingFee, DELIVERY_DAYS } from "@/lib/shipping";
import { fetchBoxTypeById, fetchPlanOptions } from "@/lib/catalog";
import { Truck, ArrowLeft, Banknote, QrCode, Coins } from "lucide-react";
import { BoxType, SubscriptionPlan } from "@/types/models";
import AddressFields, { AddressValue, SavedAddressRow, emptyAddress, formatAddress, isAddressValid, rowToAddress } from "@/components/common/AddressFields";
import { DeliverySchedule, SCHEDULE_LABEL, deliveryWindowLabel, recommendedSchedule, secondDeliveryWindow } from "@/lib/deliverySchedule";
import { formatDate } from "@/lib/formatters";
import { Button, ButtonLink } from "@/components/ui/Button";
import { planUnitPrice } from "@/lib/pricing";
import { CANCEL_POLICY, COD_MAX_AMOUNT, COD_OVER_LIMIT, NO_AUTO_CHARGE } from "@/lib/copy";
import { pointsEarnedFor, usablePoints, VND_PER_POINT } from "@/lib/points";

function CheckoutFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSubscription = searchParams.get("type") === "subscription";
  const boxId = searchParams.get("box");
  const petId = searchParams.get("pet");
  const planId = searchParams.get("plan");

  // Chỉ thanh toán các món khách đã tick trong giỏ (selectedCart); món chưa tick ở lại giỏ
  const { cart: fullCart, selectedCart: cart, isCartReady, user, subtotal, voucherCode, voucherDiscount, voucherFreeShip, removeOrderedFromCart, pets, isLoggedIn, isLoadingAuth } = useApp();

  const [addr, setAddr] = useState<AddressValue>(emptyAddress());
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [notes, setNotes] = useState("");
  const province = addr.province;
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAddrErrors, setShowAddrErrors] = useState(false);
  // Đặt xong thì giỏ được xóa trước khi chuyển trang: không hiện "giỏ hàng trống" trong khoảnh khắc đó
  const [placed, setPlaced] = useState(false);

  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>(() => {
    const fromUrl = searchParams.get("schedule");
    return fromUrl === "giua_thang" || fromUrl === "dau_thang" ? fromUrl : recommendedSchedule();
  });
  // Hai hình thức (chốt 08/10/2026): chuyển khoản VietQR qua payOS, hoặc COD cho đơn mua 1 lần
  const [paymentMethod, setPaymentMethod] = useState<'payos' | 'cod'>('payos');

  // Tích điểm: 1 điểm trừ 1.000₫ tiền hàng, không giới hạn số điểm mỗi đơn (server tính lại)
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState<number | null>(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    createClient().rpc("my_points").then(({ data }) => setPointsBalance(Number(data) || 0));
  }, [isLoggedIn]);

  const [subBox, setSubBox] = useState<BoxType | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Voucher khi đăng ký gói (SPEC §5 bước 4). Giỏ hàng có ô voucher riêng; gói định kỳ không đi qua giỏ nên nhập ở đây.
  const [subVoucherInput, setSubVoucherInput] = useState("");
  const [subVoucher, setSubVoucher] = useState<PreviewVoucher | null>(null);
  const [subVoucherError, setSubVoucherError] = useState("");

  // Tự điền từ sổ địa chỉ (ưu tiên địa chỉ mặc định); chưa có thì điền tên, SĐT từ hồ sơ
  useEffect(() => {
    if (!user.id) return;
    createClient()
      .from("addresses")
      .select("id, recipient_name, phone, province_city, ward, street_address, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as SavedAddressRow[]) || [];
        setSavedAddresses(rows);
        if (rows.length > 0) {
          setSelectedAddressId(rows[0].id);
          setAddr(rowToAddress(rows[0]));
        } else {
          setSaveAsDefault(true);
          setAddr((a) => ({ ...a, recipientName: a.recipientName || user.name, phone: a.phone || user.phone }));
        }
      });
  }, [user.id, user.name, user.phone]);

  const chooseAddress = (id: string) => {
    setSelectedAddressId(id);
    const row = savedAddresses.find((r) => r.id === id);
    setAddr(row ? rowToAddress(row) : { ...emptyAddress(), recipientName: user.name, phone: user.phone });
  };

  // Lưu địa chỉ mới vào sổ (và đặt mặc định nếu khách chọn) sau khi đặt hàng thành công
  const persistAddress = async () => {
    if (!user.id || selectedAddressId !== "new") return;
    const supabase = createClient();
    if (saveAsDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").insert({
      user_id: user.id,
      recipient_name: addr.recipientName.trim(),
      phone: addr.phone.trim(),
      province_city: addr.province,
      // Địa giới mới không còn quận/huyện; cột district vẫn NOT NULL nên lưu chuỗi rỗng
      district: "",
      ward: addr.ward,
      street_address: addr.street.trim(),
      is_default: saveAsDefault || savedAddresses.length === 0,
    });
  };

  // Gọi sau khi đơn đã tạo: lưu sổ địa chỉ lỗi thì bỏ qua, không báo nhầm là đặt hàng thất bại
  const persistAddressQuietly = async () => {
    try {
      await persistAddress();
    } catch (err) {
      console.warn("Không lưu được địa chỉ vào sổ:", err);
    }
  };

  const selectedPlan = plans.find((p) => p.id === planId);
  const subPet = pets.find((p) => p.id === petId);

  useEffect(() => {
    if (isSubscription && boxId) {
      fetchBoxTypeById(boxId).then(setSubBox);
      fetchPlanOptions().then(setPlans);
    }
  }, [isSubscription, boxId]);

  useEffect(() => {
    // Mọi đơn đều cần đăng nhập: giỏ hàng lưu theo tài khoản, hộp và gói gắn với hồ sơ thú cưng.
    // Chờ xác định xong phiên đăng nhập, tránh đá khách đã đăng nhập về trang login khi tải lại trang.
    if (isLoadingAuth) return;
    if (!isLoggedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  // Số tiền hiển thị mô phỏng đúng công thức server (checkout_create_order / subscribe_to_box)
  const unitPrice = subBox && selectedPlan ? planUnitPrice(subBox.basePrice, selectedPlan.discountPercent) : 0;
  const itemsAmount = isSubscription ? unitPrice * (selectedPlan?.cycles || 0) : subtotal;
  const subVoucherState = subscriptionVoucherState(subVoucher, selectedPlan, itemsAmount);
  const shippingFee = isSubscription
    ? calcShippingFee(province, itemsAmount, selectedPlan?.freeShipping || subVoucherState.freeShip)
    : calcShippingFee(province, subtotal, voucherFreeShip);
  const discount = isSubscription ? subVoucherState.discount : voucherFreeShip ? 0 : voucherDiscount;

  const applySubVoucher = async () => {
    const code = subVoucherInput.trim().toUpperCase();
    setSubVoucherError("");
    if (!code) return setSubVoucherError("Vui lòng nhập mã giảm giá");
    const { data } = await createClient().rpc("preview_voucher", { p_code: code });
    const row = data?.[0];
    if (!row) {
      setSubVoucher(null);
      return setSubVoucherError("Mã không hợp lệ hoặc đã hết hạn");
    }
    setSubVoucher({
      code,
      voucherType: row.voucher_type,
      discountValue: row.discount_value,
      maxDiscount: row.max_discount,
      minOrderValue: row.min_order_value,
      scope: row.scope,
    });
  };
  // Điểm trừ vào tiền hàng còn lại sau voucher (không trừ phí ship)
  const maxPoints = usablePoints(pointsBalance, itemsAmount - discount);
  const pointsToUse = usePoints ? Math.min(Math.max(0, pointsInput ?? maxPoints), maxPoints) : 0;
  const pointsDiscount = pointsToUse * VND_PER_POINT;
  const finalAmount = Math.max(0, itemsAmount + (shippingFee ?? 0) - discount - pointsDiscount);
  const pointsToEarn = pointsEarnedFor(finalAmount - (shippingFee ?? 0));
  // COD chỉ nhận đơn không quá 2.000.000₫ (server kiểm tra lại): quá mức thì khóa lựa chọn và nói rõ lý do
  const codAllowed = finalAmount <= COD_MAX_AMOUNT;
  useEffect(() => {
    if ((!codAllowed || isSubscription) && paymentMethod === "cod") setPaymentMethod("payos");
  }, [codAllowed, isSubscription, paymentMethod]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    // Thiếu thông tin nhận hàng thì không gửi đơn. Địa chỉ đã lưu bị thiếu: mở form để khách bổ sung.
    if (!isAddressValid(addr)) {
      if (selectedAddressId !== "new") setSelectedAddressId("new");
      setShowAddrErrors(true);
      setErrorMsg("Vui lòng điền đủ thông tin nhận hàng ở các ô được đánh dấu.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    try {
      if (isSubscription) {
        if (!subBox || !subPet) throw new Error("Thiếu thông tin box hoặc bé nhận hộp, vui lòng chọn lại từ trang Mystery Box.");
        if (!selectedPlan) throw new Error("Không tìm thấy gói phù hợp, vui lòng chọn lại gói.");
        if (paymentMethod === "cod") throw new Error("Gói định kỳ chỉ thanh toán online");

        const { data, error } = await supabase.rpc("subscribe_to_box", {
          p_box_type_id: subBox.id,
          p_pet_id: subPet.id,
          p_plan_id: selectedPlan.id,
          p_delivery_schedule: deliverySchedule,
          p_recipient_name: addr.recipientName.trim(),
          p_recipient_phone: addr.phone.trim(),
          p_province_city: addr.province,
          p_district: "",
          p_ward: addr.ward,
          p_shipping_address: addr.street.trim(),
          p_payment_method: paymentMethod,
          p_voucher_code: subVoucherState.applied && subVoucher ? subVoucher.code : undefined,
          p_points: pointsToUse,
        });
        if (error) throw error;
        await persistAddressQuietly();
        const result = data as { order_id: string; order_code: string; total_amount: number; paid?: boolean };
        // Điểm / voucher trả hết tiền: gói đã kích hoạt, không cần thanh toán
        router.push(
          result.paid
            ? "/my-account/subscriptions"
            : `/checkout/pay/${result.order_id}?code=${result.order_code}&amount=${result.total_amount}&method=${paymentMethod}&sub=1`
        );
        return;
      }

      if (cart.length === 0) throw new Error("Chưa chọn món nào để thanh toán");

      const items = cart.map((c) =>
        c.type === "retail"
          ? { product_id: c.productId, quantity: c.quantity }
          : { box_type_id: c.boxTypeId, pet_id: c.petId, quantity: c.quantity }
      );

      const { data, error } = await supabase.rpc("checkout_create_order", {
        p_items: items,
        p_recipient_name: addr.recipientName.trim(),
        p_recipient_phone: addr.phone.trim(),
        p_province_city: addr.province,
        p_district: "",
        p_ward: addr.ward,
        p_shipping_address: addr.street.trim(),
        p_payment_method: paymentMethod,
        p_customer_notes: notes.trim() || undefined,
        p_voucher_code: voucherCode || undefined,
        p_points: pointsToUse,
      });

      if (error) throw error;
      await persistAddressQuietly();
      const result = data as { order_id: string; order_code: string; status: string; total_amount: number };
      setPlaced(true);
      await removeOrderedFromCart(cart.map((c) => c.id));

      if (paymentMethod === "cod" || result.status === "da_xac_nhan") {
        // COD, hoặc điểm / voucher đã trả hết tiền: đơn xác nhận ngay
        router.push(`/checkout/result?code=${result.order_code}&method=${paymentMethod}&amount=${result.total_amount}&status=${paymentMethod === "cod" ? "confirmed" : "paid"}`);
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
    if (message.includes("ERR_ACCOUNT_LOCKED")) return "Tài khoản đang bị tạm khóa nên chưa đặt hàng được. Vui lòng gọi hotline để được hỗ trợ.";
    if (message.includes("ERR_ADDRESS_INCOMPLETE")) return "Thông tin nhận hàng chưa đủ. Vui lòng kiểm tra họ tên, tỉnh/thành, phường/xã và địa chỉ.";
    if (message.includes("ERR_PHONE_INVALID")) return "Số điện thoại nhận hàng gồm 10 số, bắt đầu bằng 0.";
    if (message.includes("ERR_OUT_OF_STOCK")) return "Một sản phẩm trong giỏ đã hết hàng: " + message.split(":")[1];
    if (message.includes("ERR_EMPTY_CART")) return "Giỏ hàng của bạn đang trống.";
    if (message.includes("ERR_COD_LIMIT_EXCEEDED")) return COD_OVER_LIMIT;
    if (message.includes("ERR_LOGIN_REQUIRED_FOR_BOX")) return "Vui lòng đăng nhập để mua Mystery Box.";
    if (message.includes("ERR_PET_NOT_OWNED")) return "Thú cưng không hợp lệ, vui lòng chọn lại.";
    if (message.includes("ERR_VOUCHER_SCOPE")) return "Mã voucher không áp dụng cho loại hàng trong đơn này.";
    if (message.includes("ERR_VOUCHER_MIN_ORDER")) return "Đơn chưa đạt giá trị tối thiểu để dùng mã voucher.";
    if (message.includes("ERR_VOUCHER_USER_LIMIT")) return "Bạn đã dùng hết lượt cho mã voucher này.";
    if (message.includes("ERR_PAYMENT_METHOD_NOT_SUPPORTED")) return "Hình thức thanh toán này không còn hỗ trợ. Vui lòng chọn chuyển khoản VietQR hoặc COD.";
    if (message.includes("ERR_VOUCHER_NOT_STACKABLE")) return "Voucher không dùng chung với ưu đãi của gói 3 và 6 hộp. Chọn gói 1 hộp hoặc bỏ mã.";
    if (message.includes("ERR_VOUCHER_NOT_FIRST_SUBSCRIPTION")) return "Mã này chỉ dành cho lần đăng ký gói đầu tiên.";
    if (message.includes("ERR_VOUCHER_EXHAUSTED")) return "Mã voucher đã hết lượt sử dụng.";
    if (message.includes("ERR_LOGIN_REQUIRED")) return "Vui lòng đăng nhập để đặt hàng.";
    if (message.includes("ERR_VOUCHER")) return "Mã voucher không áp dụng được cho đơn này.";
    if (message.includes("ERR_PET_BOX_MISMATCH")) return "Bé được chọn không phù hợp với loại box này (khác loài hoặc khác size). Vui lòng chọn lại bé hoặc loại box.";
    if (message.includes("ERR_DUPLICATE_BOX")) return "Trong giỏ có 2 hộp cùng loại cho cùng một bé. Vui lòng xóa bớt một hộp.";
    if (message.includes("ERR_BOX_QUANTITY")) return "Mỗi dòng Mystery Box là 1 hộp cho 1 bé. Muốn mua cho bé khác, hãy thêm hộp cho bé đó.";
    if (message.includes("ERR_PLAN_NOT_FOUND")) return "Gói định kỳ không còn áp dụng, vui lòng chọn lại.";
    if (message.includes("ERR_BOX_NOT_FOUND")) return "Loại box này hiện không còn bán.";
    if (message.includes("ERR_COD_NOT_ALLOWED_FOR_SUBSCRIPTION")) return "Gói định kỳ chỉ hỗ trợ thanh toán online (MoMo / VNPay).";
    return message;
  }

  if (isLoadingAuth || !isLoggedIn || !isCartReady) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-bark-600" aria-busy="true">Đang tải trang thanh toán…</div>;
  }

  if (!isSubscription && cart.length === 0 && fullCart.length > 0 && !placed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-pine-950">Chưa chọn món nào để thanh toán</h1>
        <p className="text-sm text-bark-600">Vào giỏ hàng và tick các món bạn muốn thanh toán lần này.</p>
        <div className="flex justify-center">
          <ButtonLink href="/cart">Về giỏ hàng</ButtonLink>
        </div>
      </div>
    );
  }

  if (!isSubscription && cart.length === 0 && !placed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-pine-950">Giỏ hàng đang trống</h1>
        <p className="text-sm text-bark-600">Chọn hộp hoặc sản phẩm trước khi thanh toán.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <ButtonLink href="/boxes">Xem Mystery Box</ButtonLink>
          <ButtonLink href="/shop" variant="secondary">Vào cửa hàng</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-4 border-b border-surface-border space-y-2">
        {/* Đăng ký gói đi thẳng từ trang Box nên quay lại trang đó, không phải giỏ hàng */}
        <Link href={isSubscription ? "/subscription" : "/cart"} className="text-xs font-semibold text-bark-600 hover:text-bark-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isSubscription ? "Quay lại chọn gói" : "Quay lại giỏ hàng"}</span>
        </Link>
        <h1 className="text-2xl font-bold text-pine-950">{isSubscription ? "Đăng ký gói định kỳ" : "Thanh toán"}</h1>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-sm text-red-700 font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Thông tin nhận hàng</span>
            </h2>

            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                {savedAddresses.map((row) => (
                  <label key={row.id} className={`flex items-start gap-3 p-3 rounded-box border cursor-pointer text-xs ${selectedAddressId === row.id ? "border-pine-900 bg-pine-50/60" : "border-surface-border"}`}>
                    <input type="radio" name="saved-address" className="mt-0.5 accent-pine-900" checked={selectedAddressId === row.id} onChange={() => chooseAddress(row.id)} />
                    <span>
                      <span className="font-bold text-pine-950">{row.recipient_name} · {row.phone}</span>
                      {row.is_default && <span className="ml-1.5 px-1.5 py-0.5 rounded-tag bg-pine-100 text-pine-800 text-[11px] font-bold">Mặc định</span>}
                      <span className="block text-bark-600 mt-0.5">{formatAddress(rowToAddress(row))}</span>
                    </span>
                  </label>
                ))}
                <label className={`flex items-center gap-3 p-3 rounded-box border cursor-pointer text-xs ${selectedAddressId === "new" ? "border-pine-900 bg-pine-50/60" : "border-surface-border"}`}>
                  <input type="radio" name="saved-address" className="accent-pine-900" checked={selectedAddressId === "new"} onChange={() => chooseAddress("new")} />
                  <span className="font-bold text-pine-950">Giao đến địa chỉ khác</span>
                </label>
              </div>
            )}

            {selectedAddressId === "new" && (
              <div className="space-y-3">
                <AddressFields value={addr} onChange={setAddr} idPrefix="checkout" showErrors={showAddrErrors} />
                {user.id && savedAddresses.length > 0 && (
                  <label className="flex items-center gap-2 min-h-11 text-xs text-bark-700 cursor-pointer">
                    <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} className="w-4 h-4 accent-pine-900" />
                    Lưu làm địa chỉ mặc định
                  </label>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-bark-800 block mb-1" htmlFor="checkout-notes">Ghi chú cho shipper (tùy chọn)</label>
              <input id="checkout-notes" type="text" placeholder="Ví dụ: Gọi trước khi giao, gửi bảo vệ nếu vắng nhà..." value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-11 px-3 rounded-box border border-surface-border text-sm focus:border-pine-900 focus:outline-none" />
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>{isSubscription ? "Lịch giao" : "Vận chuyển"}</span>
            </h2>

            {isSubscription ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(SCHEDULE_LABEL) as DeliverySchedule[]).map((sc) => (
                    <button key={sc} type="button" onClick={() => setDeliverySchedule(sc)} aria-pressed={deliverySchedule === sc}
                      className={`min-h-11 p-3 rounded-box border text-left transition-colors ${deliverySchedule === sc ? "border-pine-900 bg-pine-50/70 font-bold text-pine-950" : "border-surface-border bg-surface hover:bg-surface-muted text-bark-700"}`}>
                      {deliverySchedule === sc ? "✓ " : ""}{SCHEDULE_LABEL[sc]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-bark-700 leading-relaxed">
                  <strong className="text-pine-950">Hộp đầu tiên gửi ngay sau khi thanh toán</strong> (giao {DELIVERY_DAYS}). Đợt giao bạn chọn áp dụng từ hộp thứ 2:
                  hộp kế tiếp giao {deliveryWindowLabel(secondDeliveryWindow(deliverySchedule).start, deliverySchedule)}, các hộp sau cách nhau 1 tháng.
                  Trước mỗi đợt 7 ngày (từ {formatDate(secondDeliveryWindow(deliverySchedule).cutoff)}) FPETS chốt hồ sơ của bé để chọn món; thay đổi sau ngày chốt áp dụng từ kỳ sau.
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-xs text-bark-700">
                <Truck className="w-4 h-4 text-pine-900 shrink-0" />
                <span>
                  Giao tiêu chuẩn toàn quốc, {DELIVERY_DAYS}. Phí ship:{" "}
                  <strong className="text-pine-950">{shippingFee === null ? "chọn tỉnh/thành để tính" : formatShippingFee(shippingFee)}</strong>
                </span>
              </p>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pine-900 text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Hình thức thanh toán</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <label className={`p-3.5 rounded-box border flex items-center justify-between cursor-pointer transition-colors ${paymentMethod === 'payos' ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20' : 'border-surface-border hover:bg-surface-muted'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="payment" value="payos" checked={paymentMethod === 'payos'} onChange={() => setPaymentMethod('payos')} className="accent-pine-900" />
                  <div>
                    <span className="font-bold text-pine-950">Chuyển khoản ngân hàng (VietQR)</span>
                    <p className="text-xs text-bark-500">Quét mã QR bằng app ngân hàng bất kỳ, xác nhận tự động qua payOS</p>
                  </div>
                </div>
                <QrCode className="w-5 h-5 text-bark-600 shrink-0" />
              </label>

              {!isSubscription ? (
                <label className={`p-3.5 rounded-box border flex items-center justify-between transition-colors ${codAllowed ? "cursor-pointer" : "cursor-not-allowed bg-surface-muted/60"} ${paymentMethod === 'cod' ? 'border-pine-900 bg-pine-50/60 ring-1 ring-pine-900/20' : 'border-surface-border hover:bg-surface-muted'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} disabled={!codAllowed} className="accent-pine-900" />
                    <div className="min-w-0">
                      <span className={`font-bold ${codAllowed ? "text-pine-950" : "text-bark-500"}`}>Thanh toán khi nhận hàng (COD)</span>
                      {codAllowed ? (
                        <p className="text-xs text-bark-600 leading-snug whitespace-normal">Cho đơn không quá 2.000.000₫. FPETS gọi xác nhận đơn COD đầu tiên của bạn.</p>
                      ) : (
                        <p className="text-xs font-semibold text-red-700 leading-snug whitespace-normal">{COD_OVER_LIMIT}</p>
                      )}
                    </div>
                  </div>
                  <Banknote className="w-5 h-5 text-bark-600 shrink-0" />
                </label>
              ) : (
                <div className="p-3 rounded-box bg-surface-muted text-xs text-bark-700 leading-relaxed space-y-1">
                  <p>Gói định kỳ trả trước nên chỉ thanh toán bằng chuyển khoản VietQR. {NO_AUTO_CHARGE}</p>
                  <p>{CANCEL_POLICY}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6 lg:hidden space-y-2">
            <Button type="submit" size="lg" className="w-full" loading={submitting}>Đặt hàng · {formatVND(finalAmount)}</Button>
            <PolicyNote />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="p-5 sm:p-6 rounded-container bg-surface-muted/50 border border-surface-border/80 space-y-4">
            <h2 className="text-sm font-bold text-pine-950 pb-3 border-b border-surface-border flex items-center justify-between">
              <span>Đơn hàng của bạn</span>
              <span className="text-xs font-normal text-bark-500">{isSubscription ? "Gói định kỳ" : `${cart.reduce((n, c) => n + c.quantity, 0)} sản phẩm`}</span>
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {isSubscription ? (
                subBox ? (
                  <div className="p-3 rounded-box bg-surface-card border border-surface-border/60 space-y-1 text-xs">
                    <div className="font-bold text-pine-950">{subBox.name}</div>
                    <div className="text-xs text-pine-800 font-semibold">{selectedPlan?.name}</div>
                    <div className="text-xs text-bark-500">Dành cho bé: {subPet?.name}{subPet?.breed ? ` (${subPet.breed})` : ""}</div>
                    <div className="text-xs text-grass-700 font-medium pt-1">
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
                      {item.type === 'box' && <span className="text-xs text-pine-800 block">(Bé {item.petName})</span>}
                    </div>
                    <span className="font-semibold text-bark-900 shrink-0">{formatVND(item.unitPrice * item.quantity)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-surface-border text-xs">
              <div className="flex justify-between text-bark-600">
                <span>Tạm tính:</span>
                <span className="font-semibold text-bark-900">{formatVND(itemsAmount)}</span>
              </div>
              <div className="flex justify-between text-bark-600">
                <span>Phí vận chuyển:</span>
                <span>{formatShippingFee(shippingFee)}</span>
              </div>
              {isSubscription && (
                <div className="space-y-1.5">
                  {subVoucher ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className={subVoucherState.applied ? "text-grass-700 font-semibold" : "text-bark-600"}>
                        Voucher {subVoucher.code}: {subVoucherState.applied ? (subVoucherState.freeShip ? "Miễn phí ship" : `−${formatVND(discount)}`) : subVoucherState.message}
                      </span>
                      <button type="button" onClick={() => setSubVoucher(null)} className="text-bark-500 hover:text-red-700 underline shrink-0">Bỏ mã</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={subVoucherInput}
                        onChange={(e) => setSubVoucherInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySubVoucher(); } }}
                        placeholder="Mã giảm giá"
                        aria-label="Mã giảm giá"
                        className="flex-1 min-w-0 h-9 px-3 rounded-box border border-surface-border bg-surface-card uppercase"
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={applySubVoucher}>Áp dụng</Button>
                    </div>
                  )}
                  {subVoucherError && <p className="text-red-700">{subVoucherError}</p>}
                </div>
              )}
              {!isSubscription && voucherCode && (
                <div className="flex justify-between text-grass-700 font-semibold">
                  <span>Voucher {voucherCode}:</span>
                  <span>{voucherFreeShip ? "Miễn phí ship" : `−${formatVND(discount)}`}</span>
                </div>
              )}
              {pointsBalance > 0 && (
                <div className="p-2.5 rounded-box bg-surface-card border border-surface-border space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      disabled={maxPoints === 0}
                      className="accent-pine-900"
                    />
                    <Coins className="w-4 h-4 text-honey-600 shrink-0" />
                    <span className="flex-1 text-bark-800">
                      Dùng điểm <span className="text-bark-500">(có {pointsBalance.toLocaleString("vi-VN")} điểm)</span>
                    </span>
                    {pointsToUse > 0 && <span className="font-semibold text-grass-700">−{formatVND(pointsDiscount)}</span>}
                  </label>
                  {usePoints && maxPoints > 0 && (
                    <div className="flex items-center gap-2 pl-6">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={maxPoints}
                        value={pointsInput ?? maxPoints}
                        onChange={(e) => setPointsInput(e.target.value === "" ? 0 : Math.floor(Number(e.target.value)))}
                        aria-label="Số điểm muốn dùng"
                        className="w-24 h-8 px-2 rounded-box border border-surface-border bg-white tabular-nums"
                      />
                      <span className="text-bark-500">điểm, tối đa {maxPoints.toLocaleString("vi-VN")} cho đơn này</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-surface-border text-sm font-extrabold text-pine-950">
                <span>Tổng cộng:</span>
                <span className="text-2xl font-extrabold font-display text-pine-950">{formatVND(finalAmount)}</span>
              </div>
              {pointsToEarn > 0 && (
                <p className="text-bark-600">
                  Nhận thêm <strong className="text-pine-950">{pointsToEarn.toLocaleString("vi-VN")} điểm</strong>{" "}
                  {isSubscription ? "khi thanh toán xong" : "khi đơn giao thành công"}.
                </p>
              )}
            </div>

            <div className="hidden lg:block space-y-2">
              <Button type="submit" size="lg" className="w-full" loading={submitting}>Đặt hàng</Button>
              <PolicyNote />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

interface PreviewVoucher {
  code: string;
  voucherType: string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  scope: string;
}

// Khớp kiểm tra voucher trong subscribe_to_box; số tiền thật luôn do server tính lại
function subscriptionVoucherState(v: PreviewVoucher | null, plan: SubscriptionPlan | undefined, amount: number) {
  const none = { discount: 0, freeShip: false, applied: false };
  if (!v || !plan) return { ...none, message: "" };
  if (!["all", "box", "first_subscription"].includes(v.scope)) return { ...none, message: "mã không áp dụng cho gói định kỳ" };
  // SPEC §8: voucher không cộng dồn với giảm giá của gói 3/6
  if (plan.discountPercent > 0) return { ...none, message: "không dùng chung với ưu đãi của gói này" };
  if (amount < v.minOrderValue) return { ...none, message: `cần đơn từ ${formatVND(v.minOrderValue)}` };
  if (v.voucherType === "free_shipping") return { ...none, freeShip: true, applied: true, message: "" };
  let discount = 0;
  if (v.voucherType === "percentage") {
    discount = Math.round((amount * v.discountValue) / 100);
    if (v.maxDiscount) discount = Math.min(discount, v.maxDiscount);
  } else if (v.voucherType === "fixed_amount") {
    discount = Math.min(v.discountValue, amount);
  }
  return { discount, freeShip: false, applied: true, message: "" };
}

function PolicyNote() {
  return (
    <p className="text-xs text-bark-500 text-center leading-relaxed">
      Bấm đặt hàng nghĩa là bạn đồng ý với <Link href="/return-policy" className="underline">chính sách đổi trả</Link> và{" "}
      <Link href="/terms" className="underline">điều khoản dịch vụ</Link> của FPETS.
    </p>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<div className="max-w-5xl mx-auto py-16 text-center text-xs text-bark-500">Đang tải trang thanh toán...</div>}>
      <CheckoutFormContent />
    </React.Suspense>
  );
}
