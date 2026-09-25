import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized, createCronClient } from "@/lib/cron";

// Vercel Cron: nhắc gia hạn subscription trước 7/3/1 ngày (SPEC mục 5, 8).
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = createCronClient();
  const { data, error } = await supabase.rpc("send_subscription_reminders");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notified: data });
}
