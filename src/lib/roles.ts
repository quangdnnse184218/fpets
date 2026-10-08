// Phân quyền khu vực quản trị. Dùng chung cho middleware (chặn route ở server) và menu admin.
// Quyền dữ liệu thật nằm ở RLS và RPC (public.is_admin / public.is_staff); file này chỉ quyết định trang nào hiện ra.

export type UserRole = "customer" | "staff" | "admin";

// Trang staff (nhân viên vận hành) được vào. Admin vào được mọi trang /admin.
const STAFF_ADMIN_PATHS = [
  "/admin/orders",
  "/admin/box-curation",
  "/admin/subscriptions",
  "/admin/inventory",
  "/admin/pets",
  "/admin/reviews",
];

export const isBackofficeRole = (role: string | null | undefined): role is "staff" | "admin" =>
  role === "admin" || role === "staff";

export function canAccessAdminPath(role: string | null | undefined, pathname: string): boolean {
  if (role === "admin") return true;
  if (role !== "staff") return false;
  return STAFF_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Trang mở đầu sau khi đăng nhập / khi vào /admin
export function adminHomeFor(role: string | null | undefined): string {
  return role === "staff" ? "/admin/orders" : "/admin/dashboard";
}

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Khách hàng",
  staff: "Nhân viên",
  admin: "Quản trị viên",
};
