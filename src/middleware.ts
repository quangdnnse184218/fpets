import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminHomeFor, canAccessAdminPath, isBackofficeRole } from "@/lib/roles";

// Bảo vệ route ở tầng server: /admin chỉ admin và staff (staff chỉ các trang vận hành),
// /my-account chỉ user đã đăng nhập.
// Không tin bất kỳ role/trạng thái đăng nhập nào gửi từ client (AGENTS.md).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAccountRoute = pathname.startsWith("/my-account");

  if (!isAdminRoute && !isAccountRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Chưa cấu hình Supabase: chặn truy cập các route cần bảo vệ thay vì cho qua.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !isBackofficeRole(profile.role) || profile.is_active === false) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Staff chỉ vào các trang vận hành; trang ngoài quyền (doanh thu, sản phẩm, voucher...) đưa về trang đơn hàng
    if (!canAccessAdminPath(profile.role, pathname)) {
      return NextResponse.redirect(new URL(adminHomeFor(profile.role), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/my-account/:path*"],
};
