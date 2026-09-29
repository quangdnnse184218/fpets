"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Đăng nhập / đăng ký bằng Google qua Supabase Auth; tài khoản mới tự tạo profile bằng trigger handle_new_user
export default function GoogleSignInButton({ next, label = "Tiếp tục với Google" }: { next?: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    // Thành công thì trình duyệt đã chuyển sang Google; chỉ tới đây khi có lỗi
    if (oauthError) {
      setError("Không mở được đăng nhập Google, vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl border border-surface-border bg-white hover:bg-surface-muted text-sm font-semibold text-bark-900 flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        <span>{loading ? "Đang chuyển sang Google..." : label}</span>
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
