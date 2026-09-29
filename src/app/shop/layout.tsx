import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Shop bán lẻ",
  description: "Đồ ăn, đồ chơi và phụ kiện cho chó mèo, mua lẻ không cần tài khoản.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
