import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Pet Quiz",
  description: "Trả lời 7 câu để FPETS gợi ý Mystery Box phù hợp với bé.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
