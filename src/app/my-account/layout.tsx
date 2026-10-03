import type { Metadata } from "next";
import AccountShell from "./AccountShell";

export const metadata: Metadata = {
  title: { template: "%s | Tài khoản FPETS", default: "Tài khoản" },
  robots: { index: false, follow: false },
};

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
