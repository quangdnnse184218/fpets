"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured, getSupabaseConfigStatus } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import BrandLogo from "@/components/common/BrandLogo";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight,
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
        setErrorMessage("Không thể gửi lại email xác nhận. Vui lòng thử lại sau.");
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
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

    const configStatus = getSupabaseConfigStatus();
    if (!configStatus.isConfigured) {
      setErrorMessage(`Chưa nhận được biến môi trường trên Vercel: [${configStatus.missing.join(", ")}]. Hãy kiểm tra lại mục Environment Variables trên Vercel.`);
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
        console.error("Lỗi xác thực (dev):", error.message);
        if (error.message.includes("Email not confirmed")) {
          setIsUnconfirmed(true);
          setErrorMessage("Tài khoản chưa được kích hoạt. Vui lòng kiểm tra hộp thư email.");
        } else if (error.message.includes("Too many requests")) {
          setErrorMessage("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi ít phút và thử lại.");
        } else {
          // Bảo mật: Không để lộ lỗi nội bộ database/schema
          setErrorMessage("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();

        await refreshUser();

        setTimeout(() => {
          if (redirectUrl) {
            router.push(redirectUrl);
          } else if (profile?.role === "admin" || profile?.role === "kho" || profile?.role === "cskh") {
            router.push("/admin/dashboard");
          } else {
            router.push("/my-account/pets");
          }
        }, 600);
      }
    } catch (err: unknown) {
      console.error("Lỗi đăng nhập (dev):", err);
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại sau ít phút.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-muted/30">
      <div className="w-full max-w-md bg-surface-card rounded-2xl border border-surface-border shadow-soft p-6 sm:p-9">
        
        {/* Logo & Tiêu đề gọn gàng ở giữa */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <BrandLogo href="/" size="md" />
          </div>
          <h1 className="text-2xl font-display font-bold text-bark-950">
            Đăng nhập FPETS
          </h1>
          <p className="text-xs sm:text-sm text-bark-600 mt-1">
            Chào mừng bạn trở lại với FPETS
          </p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>

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
              <span className="text-xs text-bark-600">Ghi nhớ đăng nhập</span>
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

        {/* Chuyển sang Đăng ký */}
        <div className="mt-6 pt-5 border-t border-surface-border text-center">
          <p className="text-xs sm:text-sm text-bark-600">
            Chưa có tài khoản FPETS?{" "}
            <Link
              href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
              className="font-semibold text-pine-900 hover:text-pine-950 underline hover:no-underline"
            >
              Đăng ký tài khoản
            </Link>
          </p>
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
