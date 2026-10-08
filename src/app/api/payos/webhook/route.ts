import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { payosConfigured, verifyPayosSignature } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// payOS gọi về khi có giao dịch. Chỉ tin dữ liệu khi chữ ký đúng (khóa checksum chỉ server biết).
// Xác nhận đơn bằng confirm_payos_payment kèm khóa bí mật của server (không cần phiên đăng nhập).
// Webhook hợp lệ luôn trả 200, kể cả mã đơn lạ (payOS gửi một webhook thử khi đăng ký URL).
export async function POST(request: NextRequest) {
  if (!payosConfigured()) return NextResponse.json({ success: false }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    success?: boolean;
    data?: Record<string, unknown>;
    signature?: string;
  } | null;
  if (!body?.data || !body.signature || !verifyPayosSignature(body.data, body.signature)) {
    return NextResponse.json({ success: false, error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  const data = body.data;
  if (body.code === "00" && data.code === "00") {
    const { data: result, error } = await createPublicClient().rpc("confirm_payos_payment", {
      p_payos_order_code: Number(data.orderCode),
      p_amount: Number(data.amount),
      p_reference: data.reference ? String(data.reference) : null,
      p_secret: process.env.PAYOS_SERVER_SECRET || "",
    });
    if (error) {
      // Lỗi phía hệ thống: trả 500 để payOS gửi lại
      console.error("payOS webhook confirm:", error.message);
      return NextResponse.json({ success: false }, { status: 500 });
    }
    console.log("payOS webhook:", data.orderCode, (result as { result?: string } | null)?.result);
  }
  return NextResponse.json({ success: true });
}
