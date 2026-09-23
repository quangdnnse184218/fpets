import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return NextResponse.json({
    status: "ok",
    hasSupabaseUrl: Boolean(url),
    urlPreview: url ? url.substring(0, 25) + "..." : "CHƯA CÓ (Rỗng)",
    hasSupabaseAnonKey: Boolean(key),
    keyLength: key ? key.length : 0,
    isReady: Boolean(url && key && url.startsWith("http")),
  });
}
