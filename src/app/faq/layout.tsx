import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Câu hỏi thường gặp",
  description: "Giải đáp về Mystery Box, gói định kỳ, giao hàng, đổi trả và thanh toán.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
