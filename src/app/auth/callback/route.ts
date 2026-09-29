import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safeRedirect";

// Google (OAuth, PKCE) trả về đây kèm ?code=...; đổi code lấy phiên đăng nhập rồi quay lại trang khách đang đứng
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"), "");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  if (next) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Không có trang đích: admin vào dashboard, khách vào hồ sơ thú cưng (giống đăng nhập bằng mật khẩu)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile?.role === "admin" ? "/admin/dashboard" : "/my-account/pets", origin));
}
