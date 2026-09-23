"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "";
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message || "Không thể gửi email đặt lại mật khẩu.");
      } else {
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-surface-muted/40">
      <div className="w-full max-w-md bg-surface-card rounded-2xl border border-surface-border shadow-soft p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo href="/" size="sm" />
          </div>
          <h1 className="text-2xl font-display font-bold text-bark-950">
            Quên mật khẩu?
          </h1>
          <p className="text-xs sm:text-sm text-bark-600 mt-1.5 leading-relaxed">
            Nhập địa chỉ email đăng ký của bạn. Chúng tôi sẽ gửi liên kết để bạn thiết lập mật khẩu mới.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-grass-100 text-grass-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-bark-900 mb-1">
              Đã gửi liên kết khôi phục!
            </h3>
            <p className="text-xs text-bark-600 mb-6 leading-relaxed">
              Vui lòng kiểm tra hộp thư đến (và mục spam/quảng cáo) của <strong className="text-pine-900">{email}</strong> để đặt lại mật khẩu mới.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-pine-900 hover:bg-pine-800 text-white font-medium text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-bark-800 uppercase tracking-wider mb-1.5">
                Địa chỉ Email đã đăng ký
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-pine-900 hover:bg-pine-800 active:bg-pine-950 text-white font-semibold text-xs sm:text-sm shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <span>Gửi liên kết đặt lại mật khẩu</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-xs text-bark-600 hover:text-pine-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Quay lại trang Đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
