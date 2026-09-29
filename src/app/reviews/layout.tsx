import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Đánh giá của khách hàng",
  description: "Đánh giá và ảnh mở hộp từ khách đã nhận hàng FPETS.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
