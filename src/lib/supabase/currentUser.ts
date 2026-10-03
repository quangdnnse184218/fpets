"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * id tài khoản đang đăng nhập (đọc từ phiên lưu sẵn, không gọi mạng).
 * Dùng để lọc dữ liệu "của tôi" ở trang khách: RLS cho admin đọc mọi bản ghi,
 * nên không thể chỉ dựa vào RLS khi admin xem cửa hàng.
 */
export async function currentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}
