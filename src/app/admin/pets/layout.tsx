import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pet Profile" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
