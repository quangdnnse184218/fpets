import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized, createCronClient } from "@/lib/cron";

// Vercel Cron: hủy đơn "chờ thanh toán" quá 30 phút (SPEC mục 7).
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = createCronClient();
  const { data, error } = await supabase.rpc("cancel_expired_orders");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ cancelled: data });
}
