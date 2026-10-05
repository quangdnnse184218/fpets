import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Tra cứu đơn hàng",
  description: "Tra cứu trạng thái đơn hàng FPETS bằng mã đơn.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
