"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Camera,
  Heart,
  Smile,
  Frown,
  CheckCircle2,
  Filter,
  MessageSquare,
  Gift,
  ArrowRight,
  ShieldCheck,
  Dog,
  Cat,
} from "lucide-react";
import { MOCK_REVIEWS, Review } from "@/mock/reviews";

export default function ReviewsPage() {
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [hasPhotoOnly, setHasPhotoOnly] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const filteredReviews = MOCK_REVIEWS.filter((rev) => {
    if (!rev.isPublished) return false;
    if (starFilter !== 'all' && rev.rating !== starFilter) return false;
    if (speciesFilter !== 'all' && rev.petSpecies !== speciesFilter) return false;
    if (hasPhotoOnly && rev.images.length === 0) return false;
    return true;
  });

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
              <span>4.9</span>
              <span className="text-base text-bark-400 font-normal">/ 5.0</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 text-honey-500 fill-honey-500" />
              ))}
            </div>
            <p className="text-xs text-bark-500">
              Dựa trên hơn <strong>620+</strong> lượt đánh giá của khách hàng đã nhận hộp
            </p>
          </div>

          {/* Phân bổ số sao */}
          <div className="md:col-span-5 space-y-1.5 text-xs text-bark-600">
            <div className="flex items-center gap-2">
              <span className="w-12 text-right">5 sao</span>
              <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-honey-500 rounded-full w-[92%]" />
              </div>
              <span className="w-8 text-right font-semibold">92%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-right">4 sao</span>
              <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-honey-500 rounded-full w-[7%]" />
              </div>
              <span className="w-8 text-right font-semibold">7%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-right">3 sao</span>
              <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-honey-500 rounded-full w-[1%]" />
              </div>
              <span className="w-8 text-right font-semibold">1%</span>
            </div>
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

          {/* Lọc theo loài và ảnh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-box">
              <button
                type="button"
                onClick={() => setSpeciesFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  speciesFilter === 'all' ? 'bg-white text-pine-950 shadow-2xs' : 'text-bark-600'
                }`}
              >
                Tất cả loài
              </button>
              <button
                type="button"
                onClick={() => setSpeciesFilter('dog')}
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${
                  speciesFilter === 'dog' ? 'bg-white text-pine-950 shadow-2xs' : 'text-bark-600'
                }`}
              >
                <Dog className="w-3 h-3" />
                <span>Chó</span>
              </button>
              <button
                type="button"
                onClick={() => setSpeciesFilter('cat')}
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${
                  speciesFilter === 'cat' ? 'bg-white text-pine-950 shadow-2xs' : 'text-bark-600'
                }`}
              >
                <Cat className="w-3 h-3" />
                <span>Mèo</span>
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-bark-700 select-none pl-2 border-l border-surface-border">
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
                      {rev.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-pine-950">{rev.customerName}</span>
                        <span className="text-[11px] text-grass-700 font-semibold bg-grass-50 px-1.5 py-0.2 rounded border border-grass-200">
                          Đã mua hàng
                        </span>
                      </div>
                      <div className="text-[11px] text-bark-500">
                        Bé: <strong className="text-pine-900">{rev.petName}</strong> ({rev.petBreed}) · Hộp: {rev.boxName}
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
                    <span className="text-xs text-bark-400">· {rev.createdAt}</span>
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
                            alt={`Ảnh mở hộp ${rev.petName}`}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* BẢNG CHẤM ĐIỂM TỪNG MÓN TRONG HỘP */}
                {rev.itemReviews && rev.itemReviews.length > 0 && (
                  <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border text-xs space-y-2">
                    <span className="font-bold text-pine-950 block text-[11px]">
                      Phản hồi của bé với từng món trong hộp:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rev.itemReviews.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-surface-card border border-surface-border/60 flex items-center justify-between gap-2"
                        >
                          <span className="text-[11px] text-bark-800 font-medium truncate">
                            {item.productName}
                          </span>
                          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold">
                            {item.rating === 'like' && (
                              <span className="text-grass-800 bg-grass-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-grass-700 text-grass-700" /> Bé thích
                              </span>
                            )}
                            {item.rating === 'neutral' && (
                              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Smile className="w-3 h-3 text-amber-700" /> Bình thường
                              </span>
                            )}
                            {item.rating === 'dislike' && (
                              <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Frown className="w-3 h-3 text-red-600" /> Không thích
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phản hồi từ Admin FPETS Care */}
                {rev.adminReply && (
                  <div className="p-3.5 rounded-box bg-pine-50 border border-pine-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-pine-900 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-pine-800" />
                      <span>{rev.adminReply.author}</span>
                      <span className="text-pine-500 font-normal">· {rev.adminReply.createdAt}</span>
                    </div>
                    <p className="text-[11px] text-pine-950 leading-relaxed">
                      {rev.adminReply.content}
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
                onClick={() => { setStarFilter('all'); setSpeciesFilter('all'); setHasPhotoOnly(false); }}
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
