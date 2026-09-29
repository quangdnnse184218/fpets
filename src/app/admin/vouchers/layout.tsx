import type { Metadata } from "next";

export const metadata: Metadata = { title: "Voucher" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
