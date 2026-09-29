import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await createPublicClient()
    .from("box_types")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { title: "Mystery Box" };
  return { title: data.name, description: data.description || undefined };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
