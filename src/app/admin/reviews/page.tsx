"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAdminTasks } from "../AdminTasks";
import { createClient } from "@/lib/supabase/client";
import { Star, Eye, EyeOff, MessageSquare, Search, X } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import FeedbackInbox from "./FeedbackInbox";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  status: string;
  admin_reply: string | null;
  created_at: string;
  user_id: string;
  order_id: string;
  profiles: { full_name: string | null } | null;
  orders: { order_code: string } | null;
}

// Số ngày đánh giá / góp ý đã chờ phản hồi; chờ càng lâu màu càng đậm
const waitingDays = (createdAt: string) => Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
const waitingLabel = (days: number) => (days === 0 ? "Mới hôm nay" : `Chờ ${days} ngày`);
const waitingTone = (days: number, lowRating: boolean) =>
  days >= 7 || (lowRating && days >= 3)
    ? { bar: "border-l-red-500", chip: "bg-red-50 text-red-700 border-red-200" }
    : days >= 3 || lowRating
      ? { bar: "border-l-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" }
      : { bar: "border-l-honey-400", chip: "bg-honey-50 text-honey-800 border-honey-200" };

type ReplyFilter = "unreplied" | "replied" | "all";

// Ảnh review chưa có Storage thật ở seed data (chỉ là path giả lập), nên ảnh
// không hợp lệ (không phải URL tuyệt đối hoặc bắt đầu bằng "/") sẽ bị bỏ qua
// thay vì cho next/image render và crash trang.
function validImages(images: string[] | null | undefined): string[] {
  return (images || []).filter((img) => img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/"));
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-bark-500">Đang tải…</div>}>
      <ReviewsContent />
    </Suspense>
  );
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const { refresh: refreshTasks } = useAdminTasks();
  // Mở đúng tab khi đi từ chuông thông báo / Tổng quan (?tab=feedback, ?filter=unreplied)
  const [tab, setTab] = useState<"reviews" | "feedback">(searchParams.get("tab") === "feedback" ? "feedback" : "reviews");
  const [newFeedback, setNewFeedback] = useState<number | null>(null);
  const onFeedbackCount = useCallback(
    (n: number) => {
      setNewFeedback(n);
      refreshTasks();
    },
    [refreshTasks]
  );

  // Đếm góp ý chưa xử lý ngay khi mở trang để admin thấy trên tab
  useEffect(() => {
    createClient()
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .then(({ count }) => setNewFeedback(count ?? 0));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Đánh giá & góp ý</h1>
        <p className="text-xs text-bark-500">Ẩn/hiện và trả lời đánh giá sau khi nhận hàng; xử lý góp ý gửi từ trang Liên hệ.</p>
      </div>
      <div role="tablist" className="flex gap-1 border-b border-surface-border text-sm">
        {([
          ["reviews", "Đánh giá đơn hàng"],
          ["feedback", `Góp ý & Liên hệ${newFeedback ? ` (${newFeedback} mới)` : ""}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 px-4 -mb-px border-b-2 font-bold transition-colors ${tab === key ? "border-pine-900 text-pine-950" : "border-transparent text-bark-500 hover:text-pine-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "reviews" ? <ReviewsPanel initialUnreplied={searchParams.get("filter") === "unreplied"} onChanged={refreshTasks} /> : <FeedbackInbox onCountChange={onFeedbackCount} />}
    </div>
  );
}

function ReviewsPanel({ initialUnreplied, onChanged }: { initialUnreplied: boolean; onChanged: () => void }) {
  const { show } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>(initialUnreplied ? "unreplied" : "all");
  const [search, setSearch] = useState("");
  const [replyingReview, setReplyingReview] = useState<ReviewRow | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, images, status, admin_reply, created_at, user_id, order_id, profiles(full_name), orders(order_code)")
      .order("created_at", { ascending: false });
    setReviews((data as unknown as ReviewRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const toggleVisibility = async (rev: ReviewRow) => {
    const supabase = createClient();
    const nextStatus = rev.status === "published" ? "hidden" : "published";
    setReviews((prev) => prev.map((r) => (r.id === rev.id ? { ...r, status: nextStatus } : r)));
    const { error } = await supabase.from("reviews").update({ status: nextStatus }).eq("id", rev.id);
    if (error) {
      setReviews((prev) => prev.map((r) => (r.id === rev.id ? { ...r, status: rev.status } : r)));
      show("Không cập nhật được đánh giá.", { tone: "error" });
      return;
    }
    show(nextStatus === "published" ? "Đánh giá đã hiện trên trang Đánh giá." : "Đã ẩn đánh giá khỏi trang công khai.");
  };

  const handleOpenReply = (review: ReviewRow) => {
    setReplyingReview(review);
    setReplyContent(review.admin_reply || "");
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;
    const reply = replyContent.trim();
    if (!reply) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").update({ admin_reply: reply, admin_reply_at: new Date().toISOString() }).eq("id", replyingReview.id);
    if (error) {
      setSaving(false);
      show("Không lưu được phản hồi, vui lòng thử lại.", { tone: "error" });
      return;
    }
    // Lần trả lời đầu tiên: báo cho khách biết FPETS đã đọc đánh giá
    if (!replyingReview.admin_reply) {
      await supabase.from("notifications").insert({
        user_id: replyingReview.user_id,
        title: `FPETS đã trả lời đánh giá đơn ${replyingReview.orders?.order_code || ""}`.trim(),
        message: reply.length > 140 ? `${reply.slice(0, 140)}…` : reply,
        type: "order",
        link: `/my-account/orders/${replyingReview.order_id}`,
      });
    }
    setSaving(false);
    setReplyingReview(null);
    show("Đã lưu phản hồi.");
    onChanged();
    loadReviews();
  };

  const unrepliedCount = reviews.filter((r) => !r.admin_reply).length;
  const replyCounts: Record<ReplyFilter, number> = { unreplied: unrepliedCount, replied: reviews.length - unrepliedCount, all: reviews.length };

  // Chưa phản hồi lên đầu, trong đó chờ lâu nhất xếp trước; đã phản hồi xếp sau, mới nhất trước
  const sorted = [...reviews].sort((a, b) => {
    if (!a.admin_reply !== !b.admin_reply) return a.admin_reply ? 1 : -1;
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return a.admin_reply ? -diff : diff;
  });

  const filtered = sorted.filter((r) => {
    const matchStar = (starFilter === "all" || r.rating === starFilter) && (replyFilter === "all" || (replyFilter === "unreplied") === !r.admin_reply);
    const matchSearch =
      (r.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.comment || "").toLowerCase().includes(search.toLowerCase());
    return matchStar && matchSearch;
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải đánh giá...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Đánh giá trung bình</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-extrabold text-pine-950 text-xl">{avgRating}</span>
            <div className="flex text-honey-500" aria-hidden="true">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(avgRating)) ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`} />)}
            </div>
          </div>
        </div>
        <div className="p-3.5 rounded-container bg-grass-50/60 border border-grass-200">
          <span className="text-grass-800 block text-[11px] font-medium">Đánh giá 5 sao</span>
          <span className="font-extrabold text-grass-900 text-lg">{reviews.filter((r) => r.rating === 5).length} lượt</span>
        </div>
        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Có ảnh</span>
          <span className="font-extrabold text-pine-900 text-lg">{reviews.filter((r) => r.images?.length > 0).length} bài</span>
        </div>
        <div className="p-3.5 rounded-container bg-honey-50/60 border border-honey-200">
          <span className="text-bark-800 block text-[11px] font-medium">Đã phản hồi</span>
          <span className="font-extrabold text-bark-800 text-lg">{reviews.filter((r) => r.admin_reply).length} bài</span>
        </div>
      </div>

      <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
        {/* Lọc theo tình trạng phản hồi, kèm số lượng */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Tình trạng phản hồi">
          {([["unreplied", "Chưa phản hồi"], ["replied", "Đã phản hồi"], ["all", "Tất cả"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={replyFilter === key}
              onClick={() => setReplyFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                replyFilter === key ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-700 hover:bg-surface-muted"
              }`}
            >
              {label}
              <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                key === "unreplied" && replyCounts.unreplied > 0 ? "bg-honey-500 text-pine-950" : replyFilter === key ? "bg-white/20 text-white" : "bg-surface-muted text-bark-600"
              }`}>
                {replyCounts[key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm theo tên khách hoặc nội dung..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button onClick={() => setStarFilter("all")} className={`px-3 py-1.5 rounded-box font-semibold transition-colors ${starFilter === "all" ? "bg-pine-900 text-white" : "bg-surface-muted text-bark-700 hover:bg-bark-200"}`}>Tất cả sao</button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button key={star} onClick={() => setStarFilter(star)} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-box font-semibold transition-colors ${starFilter === star ? "bg-pine-900 text-white" : "bg-surface-muted text-bark-700 hover:bg-bark-200"}`}>
              <span>{star}</span><Star className="w-3 h-3 fill-honey-500 text-honey-500" />
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Chưa có đánh giá nào phù hợp.
          </div>
        ) : (
          filtered.map((rev) => {
            const days = waitingDays(rev.created_at);
            const tone = waitingTone(days, rev.rating <= 3);
            return (
            <div key={rev.id} className={`p-3.5 rounded-container bg-surface-card border border-surface-border shadow-xs space-y-2.5 text-xs ${!rev.admin_reply ? `border-l-4 ${tone.bar}` : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-pine-950 text-xs">{rev.profiles?.full_name || "Khách hàng"}</div>
                  <div className="text-[11px] text-bark-500 mt-0.5">
                    Đơn: {rev.orders?.order_code || "N/A"} · {formatDate(rev.created_at)}
                  </div>
                  {!rev.admin_reply && (
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-tag border text-[11px] font-bold ${tone.chip}`}>Chưa phản hồi · {waitingLabel(days)}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleVisibility(rev)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors ${
                    rev.status === "published" ? "bg-grass-100 text-grass-800" : "bg-bark-100 text-bark-600"
                  }`}
                >
                  {rev.status === "published" ? (
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
              </div>

              <div className="flex items-center gap-1 text-honey-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`}
                  />
                ))}
              </div>

              {rev.comment && (
                <p className="text-bark-800 text-xs leading-relaxed font-medium">{rev.comment}</p>
              )}

              {validImages(rev.images).length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5">
                  {validImages(rev.images).map((img, idx) => (
                    <div key={idx} className="relative w-12 h-12 rounded border border-surface-border overflow-hidden shrink-0">
                      <Image src={img} alt="Ảnh unbox" fill sizes="48px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {rev.admin_reply && (
                <div className="p-2 rounded bg-pine-50 border border-pine-100 text-[11px] text-pine-900 space-y-0.5">
                  <span className="font-bold block text-pine-950">Phản hồi của FPETS:</span>
                  <p className="italic">&ldquo;{rev.admin_reply}&rdquo;</p>
                </div>
              )}

              <div className="pt-2 border-t border-surface-border flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReply(rev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{rev.admin_reply ? "Sửa trả lời" : "Phản hồi"}</span>
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Khách hàng</th>
              <th className="p-3.5">Số sao</th>
              <th className="p-3.5">Nội dung & Ảnh</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-bark-500">Chưa có đánh giá nào phù hợp.</td>
              </tr>
            )}
            {filtered.map((rev) => {
              const days = waitingDays(rev.created_at);
              const tone = waitingTone(days, rev.rating <= 3);
              return (
              <tr key={rev.id} className={`hover:bg-surface-muted/50 transition-colors ${!rev.admin_reply ? "bg-honey-50/40" : ""}`}>
                <td className={`p-3.5 ${!rev.admin_reply ? `border-l-4 ${tone.bar}` : "border-l-4 border-l-transparent"}`}>
                  <div className="font-bold text-pine-950 text-xs">{rev.profiles?.full_name || "Khách hàng"}</div>
                  <div className="text-[11px] text-bark-500 mt-0.5">Đơn: {rev.orders?.order_code} · {formatDate(rev.created_at)}</div>
                  {!rev.admin_reply && (
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-tag border text-[11px] font-bold whitespace-nowrap ${tone.chip}`}>Chưa phản hồi · {waitingLabel(days)}</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="flex text-honey-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`} />)}
                  </div>
                </td>
                <td className="p-3.5 max-w-xs">
                  <p className="text-bark-800 font-medium line-clamp-3 leading-relaxed">{rev.comment}</p>
                  {validImages(rev.images).length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {validImages(rev.images).map((img, idx) => (
                        <div key={idx} className="relative w-10 h-10 rounded border border-surface-border overflow-hidden shrink-0">
                          <Image src={img} alt="Ảnh unbox" fill sizes="40px" className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {rev.admin_reply && (
                    <div className="mt-2 p-2 rounded bg-pine-50 border border-pine-100 text-[11px] text-pine-900">
                      <span className="font-bold block text-pine-950">Phản hồi của FPETS:</span>
                      <p className="italic mt-0.5">&ldquo;{rev.admin_reply}&rdquo;</p>
                    </div>
                  )}
                </td>
                <td className="p-3.5">
                  <button onClick={() => toggleVisibility(rev)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${rev.status === "published" ? "bg-grass-100 text-grass-800" : "bg-bark-100 text-bark-600"}`}>
                    {rev.status === "published" ? (<><Eye className="w-2.5 h-2.5" /><span>Hiển thị</span></>) : (<><EyeOff className="w-2.5 h-2.5" /><span>Đang ẩn</span></>)}
                  </button>
                </td>
                <td className="p-3.5">
                  <button onClick={() => handleOpenReply(rev)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors">
                    <MessageSquare className="w-3 h-3" /><span>{rev.admin_reply ? "Sửa trả lời" : "Phản hồi"}</span>
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-4 sm:p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold text-pine-950 text-sm">Phản hồi đánh giá của {replyingReview.profiles?.full_name}</h3>
              <button onClick={() => setReplyingReview(null)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 rounded-box bg-surface-muted text-bark-700 italic">&ldquo;{replyingReview.comment}&rdquo;</div>
            <form onSubmit={handleSaveReply} className="space-y-3">
              <div>
                <label className="font-semibold text-bark-700 block mb-1">Phản hồi của FPETS (hiện công khai dưới đánh giá) *</label>
                <textarea rows={4} required value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border rounded-box focus:border-pine-900 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setReplyingReview(null)} className="px-3 py-1.5 text-bark-600 hover:text-bark-900 font-medium">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-pine-900 text-white rounded-box font-bold hover:bg-pine-800 transition-colors disabled:opacity-60">
                  {saving ? "Đang lưu..." : "Lưu phản hồi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
