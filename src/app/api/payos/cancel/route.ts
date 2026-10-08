import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelPaymentLink, payosConfigured } from "@/lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Đơn đã hủy thì hủy luôn link payOS để khách không chuyển nhầm tiền vào đơn đã hủy
export async function POST(request: NextRequest) {
  if (!payosConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const { orderId } = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("payos_order_code, status").eq("id", orderId).maybeSingle();
  if (!order?.payos_order_code || order.status !== "da_huy") return NextResponse.json({ ok: false });
  await cancelPaymentLink(Number(order.payos_order_code), "Khách đã hủy đơn");
  return NextResponse.json({ ok: true });
}
