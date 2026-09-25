"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Star, Camera, Filter, MessageSquare, Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [hasPhotoOnly, setHasPhotoOnly] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, images, admin_reply, admin_reply_at, created_at, profiles(full_name), orders(order_type)")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    setReviews((data as unknown as ReviewRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Chưa liên kết loài thú cưng trực tiếp trên reviews (chỉ liên kết qua box_curations
  // của đơn, không phải mọi đơn đều là box) nên bộ lọc loài tạm không áp dụng lọc cứng.
  const filteredReviews = reviews.filter((rev) => {
    if (starFilter !== 'all' && rev.rating !== starFilter) return false;
    if (hasPhotoOnly && rev.images.length === 0) return false;
    return true;
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0";
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* HEADER SECTION */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-honey-100 text-honey-900 text-xs font-bold">
            <Star className="w-3.5 h-3.5 text-honey-600 fill-honey-600" />
            <span>Đánh giá từ cộng đồng ba mẹ thú cưng</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display">
            Niềm Vui Unbox Thực Tế
          </h1>

          <p className="text-xs sm:text-sm text-bark-600">
            Xem những khoảnh khắc mở hộp thực tế và phản hồi chi tiết về từng món đồ chơi, thức ăn từ các bé cưng.
          </p>
        </div>

        {/* KHỐI TỔNG QUAN ĐÁNH GIÁ (OVERVIEW STATS) */}
        <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 text-center md:text-left space-y-2 md:border-r border-surface-border md:pr-6">
            <div className="text-4xl sm:text-5xl font-extrabold text-pine-950 font-display flex items-center justify-center md:justify-start gap-2">
              <span>{avgRating}</span>
              <span className="text-base text-bark-400 font-normal">/ 5.0</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 text-honey-500 fill-honey-500" />
              ))}
            </div>
            <p className="text-xs text-bark-500">
              Dựa trên <strong>{reviews.length}</strong> lượt đánh giá của khách hàng đã nhận hộp
            </p>
          </div>

          {/* Phân bổ số sao */}
          <div className="md:col-span-5 space-y-1.5 text-xs text-bark-600">
            {starCounts.map(({ star, count }) => {
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-12 text-right">{star} sao</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-honey-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold">{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Banner tặng voucher unbox */}
          <div className="md:col-span-3 p-4 rounded-box bg-honey-50 border border-honey-200 text-xs space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1.5 font-bold text-honey-900">
              <Gift className="w-4 h-4 text-honey-600" />
              <span>Tặng Voucher 20.000₫</span>
            </div>
            <p className="text-[11px] text-honey-800 leading-relaxed">
              Mỗi đánh giá kèm ảnh mở hộp thực tế sẽ được tặng ngay voucher 20.000₫ cho đơn tiếp theo.
            </p>
          </div>
        </div>

        {/* THANH BỘ LỌC ĐÁNH GIÁ */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-box bg-surface-card border border-surface-border text-xs">
          {/* Lọc theo sao */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-bark-700 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc theo:
            </span>
            <button
              type="button"
              onClick={() => setStarFilter('all')}
              className={`px-3 py-1.5 rounded-box font-bold transition-colors ${
                starFilter === 'all'
                  ? 'bg-pine-900 text-white'
                  : 'bg-surface-muted hover:bg-surface-border text-bark-700'
              }`}
            >
              Tất cả
            </button>
            {[5, 4, 3].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setStarFilter(star)}
                className={`px-2.5 py-1.5 rounded-box font-bold flex items-center gap-1 transition-colors ${
                  starFilter === star
                    ? 'bg-pine-900 text-white'
                    : 'bg-surface-muted hover:bg-surface-border text-bark-700'
                }`}
              >
                <span>{star}</span>
                <Star className="w-3 h-3 fill-current" />
              </button>
            ))}
          </div>

          {/* Lọc theo ảnh */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-bark-700 select-none">
              <input
                type="checkbox"
                checked={hasPhotoOnly}
                onChange={(e) => setHasPhotoOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-pine-800"
              />
              <span className="font-semibold flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-bark-500" /> Có hình ảnh
              </span>
            </label>
          </div>
        </div>

        {/* DANH SÁCH REVIEW CARDS */}
        <div className="space-y-6">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-6 sm:p-7 rounded-container bg-surface-card border border-surface-border shadow-xs space-y-4"
              >
                {/* Thông tin khách hàng & số sao */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pine-100 text-pine-900 font-extrabold flex items-center justify-center text-sm font-display">
                      {(rev.profiles?.full_name || "K").charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-pine-950">{rev.profiles?.full_name || "Khách hàng FPETS"}</span>
                        <span className="text-[11px] text-grass-700 font-semibold bg-grass-50 px-1.5 py-0.2 rounded border border-grass-200">
                          Đã mua hàng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? "text-honey-500 fill-honey-500" : "text-bark-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-bark-400">· {new Date(rev.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>

                {/* Nhận xét của khách */}
                <p className="text-xs sm:text-sm text-bark-800 leading-relaxed">
                  {rev.comment}
                </p>

                {/* Ảnh unbox đính kèm */}
                {rev.images.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-bark-500 block">
                      Ảnh unbox thực tế:
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {rev.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(img)}
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-box overflow-hidden border border-surface-border hover:opacity-90 transition-opacity bg-surface-muted cursor-zoom-in"
                        >
                          {/* TODO: thay bằng ảnh thật của FPETS khi có */}
                          <Image
                            src={img}
                            alt="Ảnh mở hộp thực tế"
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phản hồi từ Admin FPETS Care */}
                {rev.admin_reply && (
                  <div className="p-3.5 rounded-box bg-pine-50 border border-pine-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-pine-900 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-pine-800" />
                      <span>FPETS Care Team</span>
                      {rev.admin_reply_at && <span className="text-pine-500 font-normal">· {new Date(rev.admin_reply_at).toLocaleDateString("vi-VN")}</span>}
                    </div>
                    <p className="text-[11px] text-pine-950 leading-relaxed">
                      {rev.admin_reply}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center rounded-container bg-surface-card border border-surface-border text-bark-500 space-y-2">
              <Star className="w-8 h-8 text-bark-400 mx-auto" />
              <p className="text-sm font-semibold">Chưa có đánh giá nào phù hợp với bộ lọc hiện tại.</p>
              <button
                type="button"
                onClick={() => { setStarFilter('all'); setHasPhotoOnly(false); }}
                className="text-xs text-pine-900 font-bold hover:underline"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Modal xem ảnh unbox phóng to */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] w-full h-[70vh] rounded-container overflow-hidden bg-black">
              {/* TODO: thay bằng ảnh thật của FPETS khi có */}
              <Image
                src={selectedPhoto}
                alt="Ảnh unbox phóng to"
                fill
                sizes="100vw"
                className="object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
