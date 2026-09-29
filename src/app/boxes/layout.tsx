import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Mystery Box cho chó mèo",
  description: "Các loại Mystery Box Tiêu chuẩn và Premium cho chó nhỏ, chó lớn và mèo, chọn riêng theo hồ sơ của bé.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
