import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await createPublicClient()
    .from("products")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  // Layout cha đặt title dạng chuỗi nên template "%s | FPETS" của root không áp xuống đây; ghi rõ hậu tố
  if (!data) return { title: { absolute: "Sản phẩm | FPETS" } };
  return { title: { absolute: `${data.name} | FPETS` }, description: data.description || undefined };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
