"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { expireUnpaidOrders } from "@/lib/myOrders";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { Smartphone, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";

// Trang giả lập cổng thanh toán MoMo/VNPay (sandbox) theo đúng mục 6 SPEC:
// "Giai đoạn làm web chạy trên môi trường sandbox; khách cần tài khoản merchant
// MoMo/VNPay trước khi mở bán thật." Khi có tài khoản merchant thật, thay bước
// "Tôi đã thanh toán" bằng redirect sang MoMo/VNPay + webhook IPN thật.
function PaySimulationContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params?.orderId as string;
  const orderCode = searchParams.get("code") || "";
  const amount = Number(searchParams.get("amount")) || 0;
  const method = searchParams.get("method") || "momo";
  const isSubscription = searchParams.get("sub") === "1";

  const [status, setStatus] = useState<"idle" | "processing" | "failed" | "expired">("idle");

  const handleConfirmPayment = async () => {
    setStatus("processing");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirm_order_payment", {
      p_order_id: orderId,
      p_order_code: orderCode,
    });

    if (error) {
      // Quá 30 phút: đơn không thanh toán được nữa, chuyển luôn sang "Đã hủy" thay vì nằm lại ở "Chờ thanh toán"
      if (error.message.includes("ERR_PAYMENT_EXPIRED")) {
        await expireUnpaidOrders();
        setStatus("expired");
      } else {
        setStatus("failed");
      }
      return;
    }
    // Server không báo lỗi khi đơn đã ở trạng thái khác (trả về trạng thái hiện tại). Đơn đã bị hủy vì quá hạn
    // thì KHÔNG được coi là thanh toán thành công; chỉ sang trang kết quả khi đơn thật sự đã thanh toán.
    const result = data as { status?: string; payment_status?: string } | null;
    if (result?.status === "da_huy") {
      setStatus("expired");
      return;
    }
    if (result?.payment_status !== "paid") {
      setStatus("failed");
      return;
    }

    const dest = isSubscription ? "/my-account/subscriptions" : "/checkout/result";
    router.push(`${dest}?code=${orderCode}&method=${method}&amount=${amount}&status=paid`);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link href="/cart" className="text-xs font-semibold text-bark-600 hover:text-bark-900 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Hủy thanh toán</span>
      </Link>

      <div className="p-6 rounded-container bg-surface-card border border-surface-border text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-pine-50 text-pine-800 flex items-center justify-center mx-auto">
          {method === "vnpay" ? <CreditCard className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="text-lg font-bold text-pine-950">
            {method === "vnpay" ? "Thanh toán qua VNPay (Sandbox)" : "Thanh toán qua MoMo (Sandbox)"}
          </h1>
          <p className="text-xs text-bark-500 mt-1">Mã đơn: <span className="font-mono">{orderCode}</span></p>
        </div>

        <div className="p-4 rounded-box bg-surface-muted border border-dashed border-surface-border">
          <div className="text-xs text-bark-500">Số tiền cần thanh toán</div>
          <div className="text-2xl font-extrabold text-pine-950 font-display">{formatVND(amount)}</div>
        </div>

        <p className="text-xs text-bark-500 leading-relaxed">
          Chế độ thử nghiệm: cổng thanh toán {method === "vnpay" ? "VNPay" : "MoMo"} thật chưa được kết nối, bạn không bị trừ tiền.
          Bấm nút dưới để mô phỏng đã thanh toán thành công.
        </p>

        {status === "failed" && (
          <p role="alert" className="text-xs text-red-600 font-semibold">Chưa xác nhận được thanh toán. Vui lòng thử lại.</p>
        )}
        {status === "expired" && (
          <div role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-2">
            <p>Đơn đã quá 30 phút chưa thanh toán nên đã bị hủy. Vui lòng đặt lại đơn mới.</p>
            <Link href="/cart" className="inline-block font-bold underline underline-offset-2">Về giỏ hàng</Link>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={status === "processing" || status === "expired"}
          className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-60"
        >
          {status === "processing" ? "Đang xác nhận..." : "Tôi đã thanh toán"}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-grass-700 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Đơn giữ chỗ trong 30 phút, quá hạn sẽ tự hủy</span>
        </div>
      </div>
    </div>
  );
}

export default function PaySimulationPage() {
  return (
    <React.Suspense fallback={<div className="max-w-md mx-auto py-16 text-center text-xs text-bark-500">Đang tải...</div>}>
      <PaySimulationContent />
    </React.Suspense>
  );
}
