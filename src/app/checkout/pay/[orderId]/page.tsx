"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { expireUnpaidOrders } from "@/lib/myOrders";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { ArrowLeft, Check, Clock, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// Thanh toán chuyển khoản VietQR qua payOS (SPEC §6, chốt 08/10/2026). Khách không rời trang FPETS:
//  1. Mở trang -> /api/payos/create tạo yêu cầu thanh toán ở server (số tiền lấy từ database), trả dữ liệu VietQR.
//  2. Trang tự vẽ mã QR kèm số tài khoản, tên, số tiền, nội dung chuyển khoản.
//  3. Vài giây một lần gọi /api/payos/sync: server hỏi payOS, tiền về thì xác nhận đơn. Webhook payOS cũng
//     xác nhận đơn ở server; trang nào biết trước thì chuyển sang kết quả trước.

interface PayOrder {
  order_code: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_expires_at: string | null;
}

interface PayosQr {
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  description: string;
  amount: number;
}

type PayState = "loading" | "creating" | "waiting" | "failed" | "unavailable" | "expired" | "out_of_stock" | "subscription_ended";

const POLL_MS = 3000;

function PayContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const orderId = params?.orderId as string;
  const isSubscription = searchParams.get("sub") === "1";

  const [order, setOrder] = useState<PayOrder | null>(null);
  const [qr, setQr] = useState<PayosQr | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [status, setStatus] = useState<PayState>("loading");
  const [soldOutItem, setSoldOutItem] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const syncing = useRef(false);

  const goToResult = useCallback(
    (o: PayOrder) => {
      const dest = isSubscription ? "/my-account/subscriptions" : "/checkout/result";
      router.replace(`${dest}?code=${o.order_code}&method=payos&amount=${o.total_amount}&status=paid`);
    },
    [isSubscription, router]
  );

  const readOrder = useCallback(async () => {
    const { data } = await createClient()
      .from("orders")
      .select("order_code, total_amount, status, payment_status, payment_expires_at")
      .eq("id", orderId)
      .maybeSingle();
    const o = data as PayOrder | null;
    setOrder(o);
    return o;
  }, [orderId]);

  // Trạng thái đơn (và lý do server trả về) -> trạng thái trang. Trả true nếu đã kết thúc (không chờ nữa).
  const applyResult = useCallback(
    (o: PayOrder | null, r?: { reason?: string; product?: string } | null): boolean => {
      if (!o) return setStatus("failed"), true;
      if (o.payment_status === "paid" && o.status !== "da_huy") return goToResult(o), true;
      if (r?.reason === "out_of_stock") {
        setSoldOutItem(r.product || "");
        return setStatus("out_of_stock"), true;
      }
      if (r?.reason === "subscription_ended") return setStatus("subscription_ended"), true;
      if (o.status !== "cho_thanh_toan") return setStatus("expired"), true;
      return false;
    },
    [goToResult]
  );

  // Mở trang: đọc đơn, tạo (hoặc lấy lại) mã VietQR
  useEffect(() => {
    (async () => {
      const o = await readOrder();
      if (applyResult(o)) return;
      setStatus("creating");
      const res = await fetch("/api/payos/create", { method: "POST", body: JSON.stringify({ orderId, sub: isSubscription }) }).catch(() => null);
      const body = res ? await res.json().catch(() => null) : null;
      if (res?.ok && body?.qr?.qrCode) {
        setQr(body.qr);
        setStatus("waiting");
        return;
      }
      if (body?.error === "ERR_PAYMENT_EXPIRED" || body?.error === "ERR_INVALID_ORDER_STATUS") {
        await expireUnpaidOrders();
        if (!applyResult(await readOrder())) setStatus("expired");
        return;
      }
      setStatus(body?.error === "PAYOS_NOT_CONFIGURED" ? "unavailable" : "failed");
    })();
  }, [orderId, isSubscription, readOrder, applyResult]);

  // Vẽ mã QR từ chuỗi VietQR của payOS
  useEffect(() => {
    if (!qr?.qrCode) return;
    QRCode.toDataURL(qr.qrCode, { width: 520, margin: 1, errorCorrectionLevel: "M" }).then(setQrImage).catch(() => setStatus("failed"));
  }, [qr]);

  // Chờ tiền về: hỏi server vài giây một lần (server hỏi payOS và xác nhận đơn khi đã nhận tiền)
  useEffect(() => {
    if (status !== "waiting") return;
    const t = window.setInterval(async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const res = await fetch("/api/payos/sync", { method: "POST", body: JSON.stringify({ orderId }) }).catch(() => null);
        const r = res?.ok ? await res.json().catch(() => null) : null;
        applyResult(await readOrder(), r);
      } finally {
        syncing.current = false;
      }
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [status, orderId, readOrder, applyResult]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const expiresAt = order?.payment_expires_at ? new Date(order.payment_expires_at).getTime() : null;
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;
  const timeUp = secondsLeft === 0 && status === "waiting";
  useEffect(() => {
    if (!timeUp) return;
    // Hết 30 phút: hủy đơn quá hạn rồi hiện thông báo
    expireUnpaidOrders().then(() => setStatus("expired"));
  }, [timeUp]);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    show(`Đã sao chép ${label}`);
  };

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, "0") : null;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-5">
      <Link href={isSubscription ? "/my-account/subscriptions" : "/my-account/orders"} className="text-xs font-semibold text-bark-600 hover:text-bark-900 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{isSubscription ? "Về gói định kỳ" : "Về đơn hàng của tôi"}</span>
      </Link>

      <div className="p-5 sm:p-6 rounded-container bg-surface-card border border-surface-border text-center space-y-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-pine-950">Quét mã để chuyển khoản</h1>
          <p className="text-xs text-bark-500 mt-1">
            Đơn <span className="font-mono">{order?.order_code || "…"}</span> · dùng app ngân hàng bất kỳ
          </p>
        </div>

        {status === "waiting" && qrImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt={`Mã VietQR chuyển ${formatVND(qr?.amount || 0)} cho đơn ${order?.order_code}`} className="mx-auto w-64 h-64 rounded-box border border-surface-border bg-white p-2" />
            <dl className="text-left text-sm divide-y divide-surface-border rounded-box border border-surface-border">
              <InfoRow label="Số tiền" value={formatVND(qr?.amount || 0)} strong onCopy={() => copy(String(qr?.amount || ""), "số tiền")} />
              <InfoRow label="Nội dung" value={qr?.description || ""} strong onCopy={() => copy(qr?.description || "", "nội dung")} />
              <InfoRow label="Số tài khoản" value={qr?.accountNumber || ""} onCopy={() => copy(qr?.accountNumber || "", "số tài khoản")} />
              <InfoRow label="Chủ tài khoản" value={qr?.accountName || ""} />
            </dl>
            <p className="flex items-center justify-center gap-2 text-xs font-semibold text-pine-900" role="status">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang chờ chuyển khoản, trang tự cập nhật khi tiền về
            </p>
            {secondsLeft !== null && (
              <p className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${secondsLeft < 300 ? "text-red-700" : "text-bark-600"}`}>
                <Clock className="w-3.5 h-3.5" />
                Mã còn hiệu lực {minutes}:{seconds}
              </p>
            )}
            <p className="text-[11px] text-bark-500 leading-relaxed">
              Giữ nguyên số tiền và nội dung chuyển khoản để đơn được xác nhận tự động. Không cần gửi ảnh chụp.
            </p>
          </>
        ) : (status === "loading" || status === "creating" || (status === "waiting" && !qrImage)) ? (
          <div className="py-10 space-y-2 text-sm text-bark-600" role="status">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-pine-800" />
            <p>Đang tạo mã thanh toán…</p>
          </div>
        ) : null}

        {status === "failed" && (
          <div role="alert" className="space-y-2">
            <p className="text-xs text-red-600 font-semibold">Chưa tạo được mã thanh toán. Vui lòng thử lại sau ít phút.</p>
            <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold text-pine-900 underline">Thử lại</button>
          </div>
        )}
        {status === "unavailable" && (
          <p role="alert" className="text-xs text-red-600 font-semibold">Cổng thanh toán đang bảo trì. Vui lòng thử lại sau hoặc gọi hotline để được hỗ trợ.</p>
        )}
        {status === "expired" && (
          <div role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-2">
            <p>Đơn đã quá 30 phút chưa thanh toán nên đã bị hủy. Nếu bạn vừa chuyển khoản, FPETS sẽ hoàn tiền. Vui lòng đặt lại đơn mới.</p>
            <Link href="/cart" className="inline-block font-bold underline underline-offset-2">Về giỏ hàng</Link>
          </div>
        )}
        {status === "out_of_stock" && (
          <div role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-2">
            <p>
              {soldOutItem ? `"${soldOutItem}" vừa hết hàng` : "Một món trong đơn vừa hết hàng"} nên đơn đã được hủy.
              Nếu bạn đã chuyển khoản, FPETS sẽ hoàn tiền; bạn không cần làm gì thêm.
            </p>
            <Link href="/cart" className="inline-block font-bold underline underline-offset-2">Về giỏ hàng</Link>
          </div>
        )}
        {status === "subscription_ended" && (
          <div role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-2">
            <p>Gói đã kết thúc trước khi thanh toán gia hạn nên yêu cầu gia hạn đã được hủy. Nếu bạn đã chuyển khoản, FPETS sẽ hoàn tiền.</p>
            <Link href="/subscription" className="inline-block font-bold underline underline-offset-2">Đăng ký gói mới</Link>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-grass-700 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Xác nhận tự động qua payOS, FPETS không lưu thông tin ngân hàng của bạn</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, strong, onCopy }: { label: string; value: string; strong?: boolean; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <dt className="w-28 shrink-0 text-xs text-bark-500">{label}</dt>
      <dd className={`flex-1 min-w-0 break-all ${strong ? "font-bold text-pine-950" : "text-bark-800"}`}>{value}</dd>
      {onCopy && (
        <button
          type="button"
          onClick={() => {
            onCopy();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          aria-label={`Sao chép ${label.toLowerCase()}`}
          className="p-1.5 rounded text-bark-500 hover:text-pine-900 hover:bg-surface-muted shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-grass-700" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <React.Suspense fallback={<div className="max-w-md mx-auto py-16 text-center text-xs text-bark-500">Đang tải...</div>}>
      <PayContent />
    </React.Suspense>
  );
}
