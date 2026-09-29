import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import MainNavbar from "@/components/common/MainNavbar";
import MobileBottomNav from "@/components/common/MobileBottomNav";
import Footer from "@/components/common/Footer";
import { ToastProvider } from "@/components/ui/Toast";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FPETS – Mystery Box cho chó mèo",
    template: "%s | FPETS",
  },
  description: "Hộp quà bất ngờ dành riêng cho chó và mèo. Đồ ăn, đồ chơi, phụ kiện được chọn theo hồ sơ của từng bé. Mua thử 1 hộp hoặc đăng ký định kỳ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${bricolageGrotesque.variable}`}>
      <body className="min-h-screen flex flex-col bg-surface text-bark-900 antialiased selection:bg-honey-200">
        <AppProvider>
          <ToastProvider>
          {/* Header điều hướng chính */}
          <MainNavbar />

          {/* Nội dung trang */}
          {/* Không đặt padding đáy ở main: vùng đệm cho thanh điều hướng mobile nằm trong Footer,
              tránh lộ dải nền khác màu giữa trang và footer */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer chân trang */}
          <Footer />

          {/* Thanh điều hướng cố định dưới đáy màn hình trên Mobile (375px) */}
          <MobileBottomNav />
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
