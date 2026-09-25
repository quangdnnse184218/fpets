import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized, createCronClient } from "@/lib/cron";

// Vercel Cron: sinh đơn cho kỳ giao mới của các gói subscription tới hạn cut-off (SPEC mục 5).
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = createCronClient();
  const { data, error } = await supabase.rpc("generate_subscription_cycle_orders");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ generated: data });
}
