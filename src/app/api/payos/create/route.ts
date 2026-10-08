import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentLink, payosConfigured, transferDescription, type PayosQr } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tạo (hoặc lấy lại) yêu cầu thanh toán payOS cho đơn của khách đang đăng nhập; trả dữ liệu VietQR để trang
// FPETS tự vẽ mã QR (khách không rời trang).
// Số tiền, hạn thanh toán lấy từ database qua payos_prepare (kiểm chủ đơn), không tin dữ liệu trình duyệt.
export async function POST(request: NextRequest) {
  if (!payosConfigured()) {
    return NextResponse.json({ error: "PAYOS_NOT_CONFIGURED" }, { status: 503 });
  }
  const { orderId, sub } = (await request.json().catch(() => ({}))) as { orderId?: string; sub?: boolean };
  if (!orderId) return NextResponse.json({ error: "ERR_ORDER_NOT_FOUND" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("payos_prepare", { p_order_id: orderId });
  if (error || !data) {
    const code = error?.message.match(/ERR_[A-Z_]+/)?.[0] || "ERR_ORDER_NOT_FOUND";
    return NextResponse.json({ error: code }, { status: 400 });
  }
  const order = data as { payos_order_code: number; order_code: string; amount: number; expires_at: string | null; checkout_url: string | null; qr: PayosQr | null };
  if (order.qr?.qrCode) return NextResponse.json({ qr: order.qr });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const back = `${origin}/checkout/pay/${orderId}?${sub ? "sub=1&" : ""}payos=1`;
  try {
    const link = await createPaymentLink({
      orderCode: Number(order.payos_order_code),
      amount: Math.round(Number(order.amount)),
      description: transferDescription(order.order_code),
      returnUrl: back,
      cancelUrl: back,
      expiredAt: order.expires_at ? Math.floor(new Date(order.expires_at).getTime() / 1000) : undefined,
    });
    await supabase.rpc("payos_save_link", {
      p_order_id: orderId,
      p_payment_link_id: link.paymentLinkId,
      p_checkout_url: link.checkoutUrl,
      p_qr: link.qr as unknown as import("@/types/database").Json,
    });
    return NextResponse.json({ qr: link.qr });
  } catch (err) {
    console.error("payOS create link:", err);
    return NextResponse.json({ error: "PAYOS_CREATE_FAILED" }, { status: 502 });
  }
}
