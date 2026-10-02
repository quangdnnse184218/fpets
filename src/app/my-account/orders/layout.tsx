import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
