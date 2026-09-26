// Chỉ cho phép quay lại đường dẫn nội bộ ("/..."), chặn open redirect sang site ngoài
// qua tham số ?redirect=https://... hoặc //evil.com
export function safeRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
