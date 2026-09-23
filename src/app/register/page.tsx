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
  ArrowRight,
  ShieldCheck,
  Gift,
  HeartHandshake
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

    // Validate dữ liệu
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
      setErrorMessage(`Chưa nhận được biến môi trường trên Vercel: [${configStatus.missing.join(", ")}]. Hãy đảm bảo bạn đã bấm Save ở Vercel và tích chọn môi trường "Production", sau đó Redeploy.`);
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
        console.error("Lỗi đăng ký (dev log):", error.message);
        if (error.message.includes("User already registered") || error.message.includes("already exists")) {
          setErrorMessage("Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.");
        } else if (error.message.includes("Password should be at least")) {
          setErrorMessage("Mật khẩu quá ngắn. Vui lòng đặt mật khẩu từ 6 ký tự trở lên.");
        } else if (error.message.includes("rate limit") || error.message.includes("Rate limit")) {
          setErrorMessage("Hệ thống gửi thư đang có nhiều yêu cầu. Vui lòng thử lại sau ít phút.");
        } else if (error.message.includes("invalid") && error.message.includes("email")) {
          setErrorMessage("Địa chỉ email không hợp lệ. Vui lòng dùng email đúng định dạng.");
        } else {
          // Bảo mật: Không in raw backend/db error ra ngoài
          setErrorMessage("Đăng ký không thành công. Vui lòng kiểm tra lại thông tin và thử lại.");
        }
        setIsLoading(false);
        return;
      }

      // Kiểm tra xem người dùng có cần xác thực email không
      if (data?.user && !data.session) {
        // Supabase bật "Confirm email"
        setNeedsEmailVerification(true);
        setIsSuccess(true);
      } else if (data?.session) {
        // Đăng ký và tự động đăng nhập luôn
        setIsSuccess(true);
        await refreshUser();
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1200);
      } else {
        setIsSuccess(true);
        setNeedsEmailVerification(true);
      }
    } catch (err: unknown) {
      console.error("Lỗi đăng ký:", err);
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-surface-muted/40">
      <div className="w-full max-w-5xl bg-surface-card rounded-2xl border border-surface-border shadow-soft overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* CỘT TRÁI: Giới thiệu quyền lợi thành viên (Ẩn trên mobile nhỏ, hiện trên LG) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-pine-950 via-pine-900 to-pine-800 text-white p-8 xl:p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-honey-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-grass-500/10 blur-2xl pointer-events-none" />

          <div>
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-honey-300 border border-white/15">
                <Gift className="w-3.5 h-3.5" />
                Đặc quyền thành viên FPETS
              </span>
            </div>

            <h2 className="text-2xl xl:text-3xl font-display font-bold leading-tight mb-4 text-white">
              Cùng FPETS chăm sóc người bạn bốn chân chu đáo nhất
            </h2>
            <p className="text-pine-200/80 text-sm leading-relaxed mb-8">
              Đăng ký tài khoản để mở khóa trải nghiệm hộp quà thú cưng được cá nhân hóa 100% theo tên, sở thích và thể trạng riêng biệt.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-honey-300">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Hồ sơ Pet Profile riêng</h4>
                  <p className="text-xs text-pine-200/70 mt-0.5">Tạo thông tin dị ứng, tính cách và kích cỡ để hộp luôn phù hợp.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-honey-300">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Tự động gộp đơn hàng cũ</h4>
                  <p className="text-xs text-pine-200/70 mt-0.5">Nhập số điện thoại đã từng mua hàng để đồng bộ toàn bộ lịch sử đơn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-honey-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Bảo mật & Tùy biến linh hoạt</h4>
                  <p className="text-xs text-pine-200/70 mt-0.5">Dễ dàng tạm dừng hoặc hủy gói định kỳ bất cứ khi nào bạn muốn.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-xs text-pine-200/60">
            © 2026 FPETS Co. Nền tảng Mystery Box & Đồ cưng cao cấp hàng đầu Việt Nam.
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Ký */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          
          {/* Thông báo đăng ký thành công cần xác thực email */}
          {needsEmailVerification ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-pine-50 border border-pine-200 text-pine-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Mail className="w-8 h-8 text-pine-900" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-bark-900 mb-3">
                Xác thực tài khoản của bạn
              </h3>
              <p className="text-sm text-bark-600 max-w-md mx-auto leading-relaxed mb-6">
                Chúng tôi đã gửi một liên kết xác nhận đến hộp thư <strong className="text-pine-900">{email}</strong>. 
                Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác/spam) và nhấp vào liên kết để kích hoạt tài khoản.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-pine-900 text-white font-medium hover:bg-pine-800 transition-colors shadow-sm"
                >
                  Đến trang Đăng nhập
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-surface-border text-bark-700 hover:bg-surface-muted transition-colors font-medium"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            /* Thông báo đăng nhập ngay thành công */
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-grass-100 text-grass-700 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-display font-bold text-bark-900 mb-2">
                Đăng ký thành công!
              </h3>
              <p className="text-sm text-bark-600 mb-6">
                Chào mừng bạn đến với FPETS. Đang chuyển hướng bạn đến khu vực thành viên...
              </p>
              <div className="inline-block w-6 h-6 border-2 border-pine-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            /* FORM ĐĂNG KÝ CHÍNH */
            <>
              <div className="mb-6">
                <div className="lg:hidden mb-4">
                  <BrandLogo href="/" size="sm" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-bark-950">
                  Tạo tài khoản FPETS
                </h1>
                <p className="text-sm text-bark-600 mt-1.5">
                  Bắt đầu trải nghiệm hộp quà bất ngờ cá nhân hóa cho thú cưng
                </p>
              </div>

              {/* Báo lỗi nếu có */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* Số điện thoại (tùy chọn) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider">
                      Số điện thoại
                    </label>
                    <span className="text-[11px] text-bark-500 font-normal">
                      Khuyến khích để gộp đơn hàng
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

                {/* Grid 2 cột: Mật khẩu & Xác nhận mật khẩu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Mật khẩu */}
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
                        placeholder="Tối thiểu 6 ký tự"
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

                  {/* Xác nhận mật khẩu */}
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
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-border bg-white text-bark-900 text-sm focus:outline-none focus:ring-2 focus:ring-pine-900/20 focus:border-pine-900 transition-colors"
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
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-bark-300 text-pine-900 focus:ring-pine-900"
                  />
                  <label htmlFor="agreeTerms" className="text-xs text-bark-600 leading-snug cursor-pointer select-none">
                    Tôi đồng ý với{" "}
                    <Link href="/about" className="text-pine-900 underline hover:text-pine-950 font-medium">
                      Điều khoản dịch vụ
                    </Link>{" "}
                    và{" "}
                    <Link href="/about" className="text-pine-900 underline hover:text-pine-950 font-medium">
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
                      <span>Đăng ký tài khoản</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Chuyển sang Đăng nhập */}
              <div className="mt-6 pt-5 border-t border-surface-border text-center">
                <p className="text-sm text-bark-600">
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
