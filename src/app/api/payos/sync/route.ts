import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getPaymentInfo, payosConfigured } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Khách quay về từ trang payOS: hỏi thẳng payOS (bằng khóa của server) xem đơn đã trả chưa,
// phòng khi webhook đến chậm. Không tin tham số payOS gắn trên URL trả về.
export async function POST(request: NextRequest) {
  if (!payosConfigured()) return NextResponse.json({ error: "PAYOS_NOT_CONFIGURED" }, { status: 503 });
  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: "ERR_ORDER_NOT_FOUND" }, { status: 400 });

  // RLS: khách chỉ đọc được đơn của mình
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("payos_order_code, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "ERR_ORDER_NOT_FOUND" }, { status: 404 });
  if (!order.payos_order_code || order.payment_status !== "pending") {
    return NextResponse.json({ status: order.status, payment_status: order.payment_status });
  }

  const info = await getPaymentInfo(Number(order.payos_order_code));
  if (info?.status === "PAID") {
    const { data: result } = await createPublicClient().rpc("confirm_payos_payment", {
      p_payos_order_code: Number(order.payos_order_code),
      p_amount: info.amountPaid,
      p_reference: info.reference,
      p_secret: process.env.PAYOS_SERVER_SECRET || "",
    });
    const r = result as { status?: string; payment_status?: string; reason?: string; product?: string } | null;
    return NextResponse.json({ ...r, payos_status: info.status });
  }
  return NextResponse.json({ status: order.status, payment_status: order.payment_status, payos_status: info?.status || null });
}
