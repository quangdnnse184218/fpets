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
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/my-account/pets";
  const { refreshUser } = useApp();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của FPETS.");
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

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (error) {
        console.error("Lỗi đăng ký (dev):", error.message);
        if (error.message.includes("User already registered") || error.message.includes("already exists")) {
          setErrorMessage("Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.");
        } else if (error.message.includes("Password should be at least")) {
          setErrorMessage("Mật khẩu quá ngắn. Vui lòng đặt mật khẩu từ 6 ký tự trở lên.");
        } else if (error.message.includes("rate limit") || error.message.includes("Rate limit")) {
          setErrorMessage("Hệ thống gửi thư đang có nhiều yêu cầu. Vui lòng thử lại sau ít phút.");
        } else if (error.message.includes("invalid") && error.message.includes("email")) {
          setErrorMessage("Địa chỉ email không hợp lệ. Vui lòng dùng email đúng định dạng.");
        } else {
          setErrorMessage("Đăng ký không thành công. Vui lòng kiểm tra lại thông tin và thử lại.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.user && !data.session) {
        setNeedsEmailVerification(true);
        setIsSuccess(true);
      } else if (data?.session) {
        setIsSuccess(true);
        await refreshUser();
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1000);
      } else {
        setIsSuccess(true);
        setNeedsEmailVerification(true);
      }
    } catch (err: unknown) {
      console.error("Lỗi đăng ký (dev):", err);
      setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại sau ít phút.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-muted/30">
      <div className="w-full max-w-lg bg-surface-card rounded-2xl border border-surface-border shadow-soft p-6 sm:p-9">
        
        {/* Trường hợp cần xác nhận email */}
        {needsEmailVerification ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-pine-50 border border-pine-200 text-pine-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-bold text-bark-900 mb-2">
              Xác thực tài khoản của bạn
            </h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed mb-6">
              Chúng tôi đã gửi email xác nhận đến <strong className="text-pine-900">{email}</strong>. 
              Vui lòng kiểm tra hộp thư đến (hoặc thư rác/spam) và nhấp vào liên kết để kích hoạt tài khoản.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-pine-900 text-white text-xs font-semibold hover:bg-pine-800 transition-colors shadow-sm"
              >
                Đến trang Đăng nhập
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-surface-border text-bark-700 hover:bg-surface-muted text-xs font-medium transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          /* Đăng ký thành công & chuyển hướng */
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-grass-100 text-grass-700 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-bold text-bark-900 mb-1.5">
              Đăng ký thành công!
            </h3>
            <p className="text-xs sm:text-sm text-bark-600 mb-5">
              Chào mừng bạn đến với FPETS. Đang chuyển hướng bạn đến khu vực thành viên...
            </p>
            <div className="inline-block w-5 h-5 border-2 border-pine-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          /* FORM ĐĂNG KÝ CHÍNH - GỌN GÀNG, SANG TRỌNG */
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <BrandLogo href="/" size="md" />
              </div>
              <h1 className="text-2xl font-display font-bold text-bark-950">
                Tạo tài khoản FPETS
              </h1>
              <p className="text-xs sm:text-sm text-bark-600 mt-1">
                Bắt đầu hành trình cá nhân hóa hộp quà cho thú cưng của bạn
              </p>
            </div>

            {/* Báo lỗi nếu có */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                  Địa chỉ Email <span className="text-red-500">*</span>
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

              {/* Số điện thoại */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider">
                    Số điện thoại
                  </label>
                  <span className="text-[11px] text-bark-500">
                    Khuyến khích để gộp đơn hàng cũ
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
                  />
                </div>
              </div>

              {/* Mật khẩu & Xác nhận mật khẩu (2 cột) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
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

                <div>
                  <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bark-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-bark-400 hover:text-bark-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Điều khoản */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-bark-300 text-pine-900 focus:ring-pine-900"
                />
                <label htmlFor="agreeTerms" className="text-xs text-bark-600 cursor-pointer select-none">
                  Tôi đồng ý với{" "}
                  <Link href="/about" className="text-pine-900 underline font-medium">
                    Điều khoản dịch vụ
                  </Link>{" "}
                  và{" "}
                  <Link href="/about" className="text-pine-900 underline font-medium">
                    Chính sách bảo mật
                  </Link>{" "}
                  của FPETS.
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
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản FPETS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Chuyển sang Đăng nhập */}
            <div className="mt-6 pt-4 border-t border-surface-border text-center">
              <p className="text-xs sm:text-sm text-bark-600">
                Đã có tài khoản FPETS?{" "}
                <Link
                  href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                  className="font-semibold text-pine-900 hover:text-pine-950 underline hover:no-underline"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-pine-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
