"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MOCK_REVIEWS, Review } from "@/mock/reviews";
import { Star, Eye, EyeOff, MessageSquare, CheckCircle2, ThumbsUp, Meh, ThumbsDown, Search, X } from "lucide-react";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState("");
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Toggle Ẩn / Hiện review
  const toggleVisibility = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPublished: !r.isPublished } : r))
    );
  };

  // Mở modal phản hồi
  const handleOpenReply = (review: Review) => {
    setReplyingReview(review);
    setReplyContent(review.adminReply?.content || "");
  };

  // Lưu phản hồi
  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;
    setReviews((prev) =>
      prev.map((r) =>
        r.id === replyingReview.id
          ? {
              ...r,
              adminReply: {
                author: "FPETS CSKH Team",
                content: replyContent,
                createdAt: "Hôm nay",
              },
            }
          : r
      )
    );
    setReplyingReview(null);
  };

  const filtered = reviews.filter((r) => {
    const matchStar = starFilter === 'all' || r.rating === starFilter;
    const matchSearch =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      r.petName.toLowerCase().includes(search.toLowerCase());
    return matchStar && matchSearch;
  });

  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thống kê */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Đánh giá & Phản hồi Khách hàng ({reviews.length} đánh giá)
          </h1>
          <p className="text-xs text-bark-500">
            Kiểm duyệt hình ảnh unbox, ẩn/hiện đánh giá công khai và phản hồi chính thức từ ban chăm sóc khách hàng FPETS.
          </p>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Đánh giá trung bình</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-extrabold text-pine-950 text-xl">{avgRating}</span>
            <div className="flex text-honey-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-honey-500" />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-container bg-grass-50/60 border border-grass-200">
          <span className="text-grass-800 block text-[11px] font-medium">5 sao tuyệt đối</span>
          <span className="font-extrabold text-grass-900 text-lg">
            {reviews.filter((r) => r.rating === 5).length} lượt
          </span>
        </div>

        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Có ảnh unbox</span>
          <span className="font-extrabold text-pine-900 text-lg">
            {reviews.filter((r) => r.images && r.images.length > 0).length} bài
          </span>
        </div>

        <div className="p-3.5 rounded-container bg-honey-50/60 border border-honey-200">
          <span className="text-bark-800 block text-[11px] font-medium">Đã phản hồi</span>
          <span className="font-extrabold text-bark-800 text-lg">
            {reviews.filter((r) => r.adminReply).length} bài
          </span>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, tên cưng hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={() => setStarFilter('all')}
            className={`px-3 py-1.5 rounded-box font-semibold transition-colors ${
              starFilter === 'all'
                ? 'bg-pine-900 text-white'
                : 'bg-surface-muted text-bark-700 hover:bg-bark-200'
            }`}
          >
            Tất cả
          </button>
          {[5, 4, 3].map((star) => (
            <button
              key={star}
              onClick={() => setStarFilter(star)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-box font-semibold transition-colors ${
                starFilter === star
                  ? 'bg-pine-900 text-white'
                  : 'bg-surface-muted text-bark-700 hover:bg-bark-200'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-honey-500 text-honey-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Bảng Review */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Khách hàng & Bé cưng</th>
              <th className="p-3.5">Số sao</th>
              <th className="p-3.5">Nội dung đánh giá & Ảnh</th>
              <th className="p-3.5">Đánh giá từng món</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.map((rev) => (
              <tr key={rev.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="font-bold text-pine-950 text-xs">{rev.customerName}</div>
                  <div className="text-[11px] text-bark-500 mt-0.5">
                    {rev.petSpecies === "dog" ? "🐶" : "🐱"} Bé <strong>{rev.petName}</strong> ({rev.petBreed})
                  </div>
                  <div className="text-[10px] text-bark-400 mt-0.5">{rev.createdAt}</div>
                </td>

                <td className="p-3.5">
                  <div className="flex text-honey-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-bark-500 block mt-1">{rev.boxName}</span>
                </td>

                <td className="p-3.5 max-w-xs">
                  <p className="text-bark-800 font-medium line-clamp-3 leading-relaxed">
                    {rev.comment}
                  </p>

                  {/* Ảnh unbox thumbnail nếu có */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {rev.images.map((img: string, idx: number) => (
                        <div key={idx} className="relative w-10 h-10 rounded border border-surface-border overflow-hidden shrink-0">
                          {/* TODO: thay bằng ảnh thật của FPETS khi có */}
                          <Image
                            src={img}
                            alt="Ảnh unbox"
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phản hồi từ CSKH nếu có */}
                  {rev.adminReply && (
                    <div className="mt-2 p-2 rounded bg-pine-50 border border-pine-100 text-[11px] text-pine-900">
                      <span className="font-bold block text-pine-950">Phản hồi của FPETS:</span>
                      <p className="italic mt-0.5">&ldquo;{rev.adminReply.content}&rdquo;</p>
                    </div>
                  )}
                </td>

                <td className="p-3.5">
                  {rev.itemReviews && rev.itemReviews.length > 0 ? (
                    <div className="space-y-1">
                      {rev.itemReviews.map((item, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          {item.rating === "like" && <ThumbsUp className="w-2.5 h-2.5 text-grass-600 shrink-0" />}
                          {item.rating === "neutral" && <Meh className="w-2.5 h-2.5 text-bark-400 shrink-0" />}
                          {item.rating === "dislike" && <ThumbsDown className="w-2.5 h-2.5 text-bark-700 shrink-0" />}
                          <span className="truncate max-w-[130px] text-bark-700">{item.productName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-bark-400 text-[11px]">—</span>
                  )}
                </td>

                <td className="p-3.5">
                  <button
                    onClick={() => toggleVisibility(rev.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      rev.isPublished
                        ? "bg-grass-100 text-grass-800"
                        : "bg-bark-100 text-bark-600"
                    }`}
                  >
                    {rev.isPublished ? (
                      <>
                        <Eye className="w-2.5 h-2.5" />
                        <span>Hiển thị</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-2.5 h-2.5" />
                        <span>Đang ẩn</span>
                      </>
                    )}
                  </button>
                </td>

                <td className="p-3.5">
                  <button
                    onClick={() => handleOpenReply(rev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{rev.adminReply ? "Sửa trả lời" : "Phản hồi"}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Phản hồi Khách hàng */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">
                Phản hồi đánh giá của {replyingReview.customerName}
              </h3>
              <button
                onClick={() => setReplyingReview(null)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-box bg-surface-muted text-bark-700 italic">
              &ldquo;{replyingReview.comment}&rdquo;
            </div>

            <form onSubmit={handleSaveReply} className="space-y-3">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">
                  Nội dung phản hồi từ FPETS Care Team *
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Chào bạn, cảm ơn bạn và bé cưng đã tin tưởng lựa chọn FPETS..."
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors"
                >
                  Gửi phản hồi công khai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
