import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hồ sơ thú cưng" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
