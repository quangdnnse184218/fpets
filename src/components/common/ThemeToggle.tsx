"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Nút chuyển giao diện sáng / tối. Lưu lựa chọn trong localStorage "fpets-theme";
// script trong <head> (src/app/layout.tsx) áp lớp "dark" trước khi trang vẽ để không nháy.
export const THEME_KEY = "fpets-theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // localStorage bị chặn: chỉ đổi trong lần xem này
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={dark ? "Giao diện sáng" : "Giao diện tối"}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-box text-bark-700 hover:text-pine-950 hover:bg-surface-muted transition-colors ${className}`}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

// Chạy trước khi trang vẽ: có lựa chọn đã lưu thì theo lựa chọn, chưa có thì theo cài đặt sáng / tối của máy
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;
