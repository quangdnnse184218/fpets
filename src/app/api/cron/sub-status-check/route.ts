import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized, createCronClient } from "@/lib/cron";

// Vercel Cron: chuyển "Quá hạn" -> "Hết hạn" sau 5 ngày ân hạn (SPEC mục 5).
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = createCronClient();
  const { data, error } = await supabase.rpc("check_subscription_grace_periods");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ expired: data });
}
