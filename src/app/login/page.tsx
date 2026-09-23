"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/common/BrandLogo";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Send
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { refreshUser } = useApp();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Điền nhanh tài khoản thử nghiệm
  const fillSampleAccount = (sampleEmail: string, samplePass: string) => {
    setEmail(sampleEmail);
    setPassword(samplePass);
    setErrorMessage("");
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (error) {
        setErrorMessage("Không thể gửi lại email xác nhận: " + error.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 6000);
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi gửi lại email.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsUnconfirmed(false);

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage("Hệ thống chưa được cấu hình biến môi trường Supabase trên Vercel. Vui lòng thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong Vercel Settings.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
        } else if (error.message.includes("Email not confirmed")) {
          setIsUnconfirmed(true);
          setErrorMessage("Tài khoản chưa được kích hoạt. Vui lòng kiểm tra hộp thư email để xác nhận.");
        } else if (error.message.includes("Too many requests")) {
          setErrorMessage("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi ít phút và thử lại.");
        } else {
          setErrorMessage(error.message || "Đăng nhập không thành công.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");

        // Lấy profile để kiểm tra quyền hạn chuyển hướng
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();

        await refreshUser();

        // Chuyển hướng theo vai trò hoặc redirectUrl
        setTimeout(() => {
          if (redirectUrl) {
            router.push(redirectUrl);
          } else if (profile?.role === "admin" || profile?.role === "kho" || profile?.role === "cskh") {
            router.push("/admin/dashboard");
          } else {
            router.push("/my-account");
          }
        }, 800);
      }
    } catch (err: unknown) {
      console.error("Lỗi đăng nhập:", err);
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-surface-muted/40">
      <div className="w-full max-w-4xl bg-surface-card rounded-2xl border border-surface-border shadow-soft overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* CỘT TRÁI: Hero thông điệp (Ẩn trên mobile nhỏ, hiện trên LG) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-pine-950 via-pine-900 to-pine-800 text-white p-8 xl:p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-honey-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-grass-500/10 blur-2xl pointer-events-none" />

          <div>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-honey-300 border border-white/15">
                <Sparkles className="w-3.5 h-3.5" />
                Chào mừng trở lại!
              </span>
            </div>

            <h2 className="text-2xl xl:text-3xl font-display font-bold leading-tight mb-4 text-white">
              Đăng nhập để theo dõi hộp quà & thú cưng của bạn
            </h2>
            <p className="text-pine-200/80 text-sm leading-relaxed mb-6">
              Quản lý gói định kỳ, cập nhật sở thích cho bé cưng và kiểm tra hành trình giao hàng từng tháng thật dễ dàng.
            </p>

            {/* Thẻ gợi ý nhanh các tài khoản mẫu */}
            <div className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs space-y-2.5">
              <div className="font-semibold text-honey-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Tài khoản thử nghiệm nhanh:</span>
              </div>
              
              <div className="space-y-1.5 text-pine-100">
                <button
                  type="button"
                  onClick={() => fillSampleAccount("khachhang@fpets.vn", "Khach@123")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-between transition-colors"
                >
                  <span>Khách hàng: <strong>khachhang@fpets.vn</strong></span>
                  <span className="text-[10px] text-honey-300 underline">Bấm để điền</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillSampleAccount("admin@fpets.vn", "Admin@123")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-between transition-colors"
                >
                  <span>Quản trị viên: <strong>admin@fpets.vn</strong></span>
                  <span className="text-[10px] text-honey-300 underline">Bấm để điền</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-xs text-pine-200/60">
            Hệ thống đăng nhập bảo mật hai lớp chuẩn Supabase Auth & RLS Postgres.
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Nhập */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          
          <div className="mb-6">
            <div className="lg:hidden mb-4">
              <BrandLogo href="/" size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-bark-950">
              Đăng nhập FPETS
            </h1>
            <p className="text-sm text-bark-600 mt-1.5">
              Nhập email và mật khẩu của bạn để truy cập tài khoản
            </p>
          </div>

          {/* Báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>

              {/* Nút gửi lại email kích hoạt nếu email chưa xác nhận */}
              {isUnconfirmed && (
                <div className="mt-3 pt-2.5 border-t border-red-200/60 flex items-center justify-between">
                  <span className="text-xs text-red-600">Chưa nhận được email?</span>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    {isResending ? "Đang gửi..." : "Gửi lại email xác nhận"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Thông báo gửi lại email thành công */}
          {resendSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-grass-50 border border-grass-200 text-grass-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-grass-600" />
              <span>Đã gửi email kích hoạt mới! Vui lòng kiểm tra hộp thư của bạn.</span>
            </div>
          )}

          {/* Báo thành công */}
          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-grass-50 border border-grass-200 text-grass-800 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-grass-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-pine-900 hover:text-pine-950 font-medium hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-bark-400 hover:text-bark-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Ghi nhớ đăng nhập */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-bark-300 text-pine-900 focus:ring-pine-900"
                />
                <span className="text-xs text-bark-600">Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Nút Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-pine-900 hover:bg-pine-800 active:bg-pine-950 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Hộp gợi ý tài khoản mẫu trên Mobile */}
          <div className="mt-5 lg:hidden p-3 rounded-xl bg-surface-muted border border-surface-border text-xs space-y-2">
            <span className="font-semibold text-bark-800">Thử nhanh bằng tài khoản mẫu:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillSampleAccount("khachhang@fpets.vn", "Khach@123")}
                className="p-2 rounded-lg bg-white border border-surface-border hover:border-pine-900 text-left transition-colors"
              >
                <div className="font-medium text-bark-900">Khách hàng</div>
                <div className="text-[10px] text-bark-500">khachhang@fpets.vn</div>
              </button>
              <button
                type="button"
                onClick={() => fillSampleAccount("admin@fpets.vn", "Admin@123")}
                className="p-2 rounded-lg bg-white border border-surface-border hover:border-pine-900 text-left transition-colors"
              >
                <div className="font-medium text-bark-900">Quản trị viên</div>
                <div className="text-[10px] text-bark-500">admin@fpets.vn</div>
              </button>
            </div>
          </div>

          {/* Chuyển sang Đăng ký */}
          <div className="mt-6 pt-5 border-t border-surface-border text-center">
            <p className="text-sm text-bark-600">
              Chưa có tài khoản FPETS?{" "}
              <Link
                href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                className="font-semibold text-pine-900 hover:text-pine-950 underline hover:no-underline"
              >
                Đăng ký miễn phí
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-pine-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
