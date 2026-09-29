import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Thanh toán",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
