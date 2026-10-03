"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatters";
import { buttonClass } from "@/components/ui/Button";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
  orders: { order_type: string } | null;
}

// Ảnh review không hợp lệ (không phải URL tuyệt đối hoặc bắt đầu bằng "/") bị bỏ qua
// thay vì cho next/image render và làm vỡ trang.
function validImages(images: string[] | null): string[] {
  return (images || []).filter((img) => img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/"));
}

const ORDER_KIND: Record<string, string> = {
  retail: "Mua sản phẩm lẻ",
  mystery_box: "Mua Mystery Box",
  subscription_cycle: "Hộp theo gói định kỳ",
};

// Ít đánh giá thì điểm trung bình dễ gây nghi ngờ ("5.0 từ 1 lượt"), nên chỉ hiện thống kê khi đủ số lượng
const MIN_FOR_STATS = 5;

function Stars({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= rating ? "text-honey-500 fill-honey-500" : "text-bark-200 fill-bark-200"}`} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [hasPhotoOnly, setHasPhotoOnly] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const { data } = await createClient()
      .from("reviews")
      .select("id, rating, comment, images, admin_reply, admin_reply_at, created_at, profiles(full_name), orders(order_type)")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    setReviews((data as unknown as ReviewRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedPhoto(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedPhoto]);

  const filtered = reviews.filter((rev) => (starFilter === "all" || rev.rating === starFilter) && (!hasPhotoOnly || validImages(rev.images).length > 0));
  const showStats = reviews.length >= MIN_FOR_STATS;
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const countOf = (star: number) => reviews.filter((r) => r.rating === star).length;
  const photoCount = reviews.filter((r) => validImages(r.images).length > 0).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Đánh giá của khách hàng</h1>
          <p className="text-sm text-bark-600">Nhận xét từ khách đã nhận hàng tại FPETS.</p>
        </div>
        <Link href="/my-account/orders" prefetch={false} className={buttonClass("secondary", "md", "shrink-0 self-start sm:self-auto")}>
          Viết đánh giá
        </Link>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 lg:items-start">
        <aside className="lg:sticky lg:top-20 p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-5">
          {showStats ? (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold text-pine-950 font-display leading-none">{avg.toFixed(1)}</span>
                <span className="text-sm text-bark-500 pb-0.5">/ 5</span>
              </div>
              <Stars rating={Math.round(avg)} />
              <p className="text-xs text-bark-500">{reviews.length} đánh giá</p>
            </div>
          ) : (
            <p className="text-sm text-bark-700">
              <strong className="text-pine-950">{loading ? "…" : reviews.length}</strong> đánh giá đã đăng
            </p>
          )}

          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-bark-800 mb-1.5">Lọc theo số sao</legend>
            <button type="button" aria-pressed={starFilter === "all"} onClick={() => setStarFilter("all")} className={filterRow(starFilter === "all")}>
              <span className="flex-1 text-left">Tất cả</span>
              <span className="text-xs text-bark-500">{reviews.length}</span>
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = countOf(star);
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <button key={star} type="button" aria-pressed={starFilter === star} onClick={() => setStarFilter(star)} className={filterRow(starFilter === star)}>
                  <span className="w-10 text-left shrink-0">{star} sao</span>
                  <span className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden="true">
                    <span className="block h-full bg-honey-500 rounded-full" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-5 text-right text-xs text-bark-500 shrink-0">{count}</span>
                </button>
              );
            })}
          </fieldset>

          <label className="flex items-center gap-2.5 min-h-10 text-sm text-bark-700 cursor-pointer">
            <input type="checkbox" checked={hasPhotoOnly} onChange={(e) => setHasPhotoOnly(e.target.checked)} className="w-4 h-4 accent-pine-900" />
            <span className="flex-1">Có ảnh mở hộp</span>
            <span className="text-xs text-bark-500">{photoCount}</span>
          </label>
        </aside>

        <div className="mt-4 lg:mt-0 space-y-3 min-w-0">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-32 rounded-container bg-surface-muted animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center rounded-container bg-surface-card border border-surface-border space-y-2">
              <p className="text-sm text-bark-600">{reviews.length === 0 ? "Chưa có đánh giá nào." : "Không có đánh giá nào khớp bộ lọc."}</p>
              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStarFilter("all");
                    setHasPhotoOnly(false);
                  }}
                  className="text-sm font-bold text-pine-900 underline underline-offset-2"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            filtered.map((rev) => {
              const name = rev.profiles?.full_name?.trim() || "Khách hàng FPETS";
              const images = validImages(rev.images);
              return (
                <article key={rev.id} className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-pine-100 text-pine-900 font-bold flex items-center justify-center text-sm shrink-0" aria-hidden="true">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-pine-950 truncate">{name}</p>
                        <p className="text-xs text-bark-500">
                          {(rev.orders && ORDER_KIND[rev.orders.order_type]) || "Đã mua hàng"} · {formatDate(rev.created_at)}
                        </p>
                      </div>
                    </div>
                    <Stars rating={rev.rating} />
                  </div>

                  {rev.comment && <p className="text-sm text-bark-800 leading-relaxed whitespace-pre-line">{rev.comment}</p>}

                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(img)}
                          aria-label={`Xem ảnh mở hộp ${idx + 1}`}
                          className="relative w-20 h-20 rounded-box overflow-hidden border border-surface-border bg-surface-muted"
                        >
                          <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {rev.admin_reply && (
                    <div className="pl-3.5 border-l-2 border-pine-800/40 space-y-0.5">
                      <p className="text-xs font-bold text-pine-900">
                        FPETS phản hồi
                        {rev.admin_reply_at && <span className="font-normal text-bark-500"> · {formatDate(rev.admin_reply_at)}</span>}
                      </p>
                      <p className="text-sm text-bark-700 leading-relaxed whitespace-pre-line">{rev.admin_reply}</p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div role="dialog" aria-modal="true" aria-label="Ảnh mở hộp" className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-2xl w-full h-[70vh] rounded-container overflow-hidden bg-black">
            <Image src={selectedPhoto} alt="Ảnh mở hộp của khách" fill sizes="100vw" className="object-contain" />
            <button type="button" onClick={() => setSelectedPhoto(null)} className="absolute top-3 right-3 min-h-10 px-4 rounded-full bg-black/60 text-white text-sm font-bold hover:bg-black/80">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const filterRow = (active: boolean) =>
  `w-full flex items-center gap-2.5 min-h-10 px-2.5 rounded-box text-sm transition-colors ${
    active ? "bg-pine-50 text-pine-950 font-semibold" : "text-bark-700 hover:bg-surface-muted"
  }`;
