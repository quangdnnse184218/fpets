import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Gói định kỳ",
  description: "Trả trước 1, 3 hoặc 6 hộp, giảm đến 15% và freeship. Không tự động trừ tiền, tạm dừng hoặc hủy dễ dàng.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
