import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Cửa hàng",
  description: "Đồ ăn, đồ chơi và phụ kiện cho chó mèo, mua lẻ từng món.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
