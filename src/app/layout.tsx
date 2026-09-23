import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import DemoRoleSwitcher from "@/components/common/DemoRoleSwitcher";
import MainNavbar from "@/components/common/MainNavbar";
import MobileBottomNav from "@/components/common/MobileBottomNav";
import Footer from "@/components/common/Footer";

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
  title: "FPETS – Mystery Box Cá Nhân Hóa & Đồ Cưng Cao Cấp",
  description: "Hộp quà bất ngờ dành riêng cho chó và mèo. Đồ ăn, đồ chơi, phụ kiện được tuyển chọn theo từng Pet Profile. Mua thử 1 hộp hoặc đăng ký định kỳ.",
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
          {/* Thanh công cụ hỗ trợ demo: Chuyển đổi Khách / Admin & Đăng nhập nhanh */}
          <DemoRoleSwitcher />
          
          {/* Header điều hướng chính */}
          <MainNavbar />

          {/* Nội dung trang */}
          <main className="flex-1 pb-20 md:pb-10">
            {children}
          </main>

          {/* Footer chân trang */}
          <Footer />

          {/* Thanh điều hướng cố định dưới đáy màn hình trên Mobile (375px) */}
          <MobileBottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
