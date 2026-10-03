import type { Metadata } from "next";
import AdminShell from "./AdminShell";

// Tiêu đề tab: "<Tên trang> | FPETS Admin"; khu vực quản trị không cho công cụ tìm kiếm lập chỉ mục
export const metadata: Metadata = {
  title: { template: "%s | FPETS Admin", default: "Quản trị" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
