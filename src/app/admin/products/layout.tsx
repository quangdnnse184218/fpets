import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sản phẩm" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
