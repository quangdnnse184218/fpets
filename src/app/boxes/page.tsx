"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BOX_TYPES } from "@/mock/boxTypes";
import { formatVND } from "@/lib/formatters";
import { CheckCircle2, Sparkles, Filter } from "lucide-react";

export default function BoxesPage() {
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');

  const filteredBoxes = BOX_TYPES.filter((box) => {
    if (speciesFilter === 'all') return true;
    return box.species === speciesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Tiêu đề trang */}
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-800 text-xs font-bold">
          <span>Hộp quà định kỳ & Mua lẻ 1 lần</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-pine-950 font-display">
          Các loại Mystery Box tại FPETS
        </h1>
        <p className="text-sm sm:text-base text-bark-600 leading-relaxed">
          Mỗi hộp được thiết kế theo kích cỡ khung hàm và tính cách của từng bé. Bạn có thể mua thử 1 hộp duy nhất hoặc đăng ký gói định kỳ để tiết kiệm đến 15%.
        </p>
      </div>

      {/* Bộ lọc loài */}
      <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
        <span className="text-xs font-bold text-bark-500 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Lọc theo bé:
        </span>
        <button
          onClick={() => setSpeciesFilter('all')}
          className={`px-3.5 py-1.5 rounded-box text-xs font-bold transition-colors ${
            speciesFilter === 'all'
              ? 'bg-pine-900 text-white'
              : 'bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border'
          }`}
        >
          Tất cả ({BOX_TYPES.length})
        </button>
        <button
          onClick={() => setSpeciesFilter('dog')}
          className={`px-3.5 py-1.5 rounded-box text-xs font-bold transition-colors ${
            speciesFilter === 'dog'
              ? 'bg-pine-900 text-white'
              : 'bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border'
          }`}
        >
          Dành cho Chó ({BOX_TYPES.filter(b => b.species === 'dog').length})
        </button>
        <button
          onClick={() => setSpeciesFilter('cat')}
          className={`px-3.5 py-1.5 rounded-box text-xs font-bold transition-colors ${
            speciesFilter === 'cat'
              ? 'bg-pine-900 text-white'
              : 'bg-surface-card hover:bg-surface-muted text-bark-700 border border-surface-border'
          }`}
        >
          Dành cho Mèo ({BOX_TYPES.filter(b => b.species === 'cat').length})
        </button>
      </div>

      {/* Danh sách các loại Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBoxes.map((box) => (
          <div
            key={box.id}
            className="rounded-container bg-surface-card border border-surface-border overflow-hidden flex flex-col justify-between shadow-sm hover:border-pine-800 transition-colors group"
          >
            {/* Phần Header Box */}
            <div className="p-5 space-y-3">
              {/* Hình ảnh đại diện thật của từng loại Box */}
              <div className="relative w-full h-44 rounded-box overflow-hidden border border-surface-border">
                {/* TODO: thay bằng ảnh thật của FPETS khi có */}
                <Image
                  src={box.imageUrl}
                  alt={`Ảnh chụp thật ${box.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-tag bg-white/90 text-bark-800 text-[10px] font-bold shadow-xs">
                  {box.itemCount}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-pine-800">
                  {box.sizeLabel}
                </div>
                <h3 className="text-base font-bold text-pine-950 mt-0.5">{box.name}</h3>
              </div>

              <p className="text-xs text-bark-600 line-clamp-2 leading-relaxed">
                {box.description}
              </p>

              {/* Món tiêu biểu */}
              <div className="pt-3 border-t border-surface-border space-y-1.5">
                <div className="text-[11px] font-bold text-bark-700">Món tiêu biểu bên trong:</div>
                <ul className="space-y-1 text-xs text-bark-600">
                  {box.typicalItems.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3 h-3 text-grass-600 shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Phần Giá & Nút hành động */}
            <div className="p-5 pt-3 bg-surface-muted/60 border-t border-surface-border space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-bark-500">Giá mua thử 1 hộp:</div>
                  <div className="text-xl font-extrabold text-pine-950 font-display">
                    {formatVND(box.basePrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-grass-700 font-semibold">Trị giá tối thiểu:</div>
                  <div className="text-xs font-bold text-bark-600 line-through">
                    {formatVND(box.minRetailValue)}
                  </div>
                </div>
              </div>

              <Link
                href={`/boxes/${box.slug}`}
                className="block w-full py-2.5 rounded-box text-center text-xs font-bold bg-pine-900 hover:bg-pine-800 text-white transition-colors cursor-pointer"
              >
                Xem chi tiết & Chọn bé nhận hộp
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Banner Quiz trợ giúp: Thiết kế phẳng tone pine tinh tế */}
      <div className="p-6 rounded-container bg-pine-50/70 border border-pine-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-pine-950 flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-pine-700" />
            <span>Chưa rõ bé phù hợp với loại hộp nào nhất?</span>
          </h3>
          <p className="text-xs text-bark-600">
            Làm bài trắc nghiệm 5 câu nhanh để hệ thống tính toán khẩu phần và kích cỡ chuẩn cho bé.
          </p>
        </div>
        <Link
          href="/quiz"
          className="px-5 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
        >
          Làm Pet Quiz 2 phút
        </Link>
      </div>
    </div>
  );
}
