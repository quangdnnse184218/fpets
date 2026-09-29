import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gói định kỳ" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
