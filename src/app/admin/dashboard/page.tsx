"use client";

import React from "react";
import Link from "next/link";
import { formatVND } from "@/lib/formatters";
import { Gift, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Tổng quan vận hành & Báo cáo
          </h1>
          <p className="text-xs text-bark-500">
            Dữ liệu thống kê doanh thu, tình trạng các gói subscription và tiến độ tuyển chọn box.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-box bg-surface-card border border-surface-border text-bark-700 font-semibold">
            Tháng 09/2026
          </span>
        </div>
      </div>

      {/* Cấu trúc thống kê mới: Hero Card tác nghiệp kho + Cụm 3 chỉ số kinh doanh */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* HERO STAT CARD: Hộp cần tuyển chọn đợt tới (Ưu tiên số 1 của người vận hành kho) */}
        <div className="lg:col-span-6 rounded-container bg-pine-950 text-white p-6 sm:p-7 flex flex-col justify-between shadow-md relative overflow-hidden border border-pine-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pine-300">Đợt giao sắp tới</span>
              <span className="text-xs px-2.5 py-0.5 rounded-tag bg-pine-900 text-pine-200 font-semibold border border-pine-800">01 – 05/10/2026</span>
            </div>

            <div>
              <span className="text-xs text-pine-300 block mb-1">Hộp cần tuyển chọn đợt tới</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
                  20
                </span>
                <span className="text-lg text-pine-200 font-semibold">hộp Mystery Box</span>
              </div>
            </div>

            <p className="text-xs text-pine-300/90 leading-relaxed max-w-md">
              Hạn chót (cut-off) trước 25/09 để kịp chuẩn bị thực phẩm tươi và đồ chơi theo dị ứng của từng bé.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-pine-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-honey-500 animate-pulse" />
              <span className="text-pine-200">
                <strong>3 hộp</strong> đang chờ nhân viên duyệt món
              </span>
            </div>

            <Link
              href="/admin/box-curation"
              className="px-4 py-2.5 rounded-box bg-white hover:bg-pine-50 text-pine-950 font-bold text-xs shrink-0 transition-colors text-center shadow-sm"
            >
              Mở hàng chờ tuyển chọn
            </Link>
          </div>
        </div>

        {/* CỤM 3 CHỈ SỐ BÁO CÁO PHỤ (Gộp gọn gàng, có divider thanh lịch) */}
        <div className="lg:col-span-6 rounded-container bg-surface-card border border-surface-border p-6 shadow-xs flex flex-col justify-between divide-y divide-surface-border">
          {/* 1. Doanh thu */}
          <div className="pb-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Doanh thu tháng này</span>
              <TrendingUp className="w-4 h-4 text-grass-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-pine-950 font-display">
                {formatVND(48650000)}
              </span>
              <span className="text-[11px] font-semibold text-grass-700 bg-grass-50 px-2 py-0.5 rounded-tag border border-grass-200">
                +18.4% so với tháng trước
              </span>
            </div>
          </div>

          {/* 2. Gói định kỳ */}
          <div className="py-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Gói định kỳ hoạt động</span>
              <Gift className="w-4 h-4 text-pine-800" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-pine-950 font-display">
                42 gói
              </span>
              <span className="text-[11px] text-bark-500">
                3 gói tạm dừng · 1 gói đã hủy
              </span>
            </div>
          </div>

          {/* 3. Cảnh báo tồn kho */}
          <div className="pt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-bark-500">
              <span className="font-medium">Cảnh báo tồn kho</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-700 font-display">
                2 sản phẩm
              </span>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-tag border border-amber-200">
                Tồn kho dưới 15 cái
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng phân bổ 7 trạng thái đơn hàng */}
      <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-4">
        <h3 className="text-sm font-bold text-pine-950">Phân bổ đơn hàng theo 7 trạng thái</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="p-3 rounded-box bg-surface-muted">
            <span className="text-[11px] text-bark-500 block">Chờ thanh toán</span>
            <span className="text-lg font-bold text-bark-800">2</span>
          </div>
          <div className="p-3 rounded-box bg-pine-50">
            <span className="text-[11px] text-pine-800 block">Đã xác nhận</span>
            <span className="text-lg font-bold text-pine-950">4</span>
          </div>
          <div className="p-3 rounded-box bg-amber-50/70 border border-amber-100/60">
            <span className="text-[11px] text-amber-800 block">Đang chuẩn bị</span>
            <span className="text-lg font-bold text-amber-900">3</span>
          </div>
          <div className="p-3 rounded-box bg-blue-50">
            <span className="text-[11px] text-blue-800 block">Đang giao</span>
            <span className="text-lg font-bold text-blue-950">12</span>
          </div>
          <div className="p-3 rounded-box bg-grass-50">
            <span className="text-[11px] text-grass-800 block">Đã giao</span>
            <span className="text-lg font-bold text-grass-900">118</span>
          </div>
          <div className="p-3 rounded-box bg-red-50">
            <span className="text-[11px] text-red-800 block">Đã hủy</span>
            <span className="text-lg font-bold text-red-900">3</span>
          </div>
          <div className="p-3 rounded-box bg-amber-50">
            <span className="text-[11px] text-amber-800 block">Đổi / Trả</span>
            <span className="text-lg font-bold text-amber-900">1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
