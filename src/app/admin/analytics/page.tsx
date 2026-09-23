"use client";

import React, { useState } from "react";
import { formatVND } from "@/lib/formatters";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Package,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  PieChart,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("2026");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Doanh thu theo tháng trong năm 2026 (Đơn vị: Triệu VND)
  const monthlyRevenue = [
    { month: "T1", value: 32000000, label: "32 tr" },
    { month: "T2", value: 28000000, label: "28 tr" },
    { month: "T3", value: 45000000, label: "45 tr" },
    { month: "T4", value: 52000000, label: "52 tr" },
    { month: "T5", value: 68000000, label: "68 tr" },
    { month: "T6", value: 85000000, label: "85 tr" },
    { month: "T7", value: 110000000, label: "110 tr" },
    { month: "T8", value: 135000000, label: "135 tr" },
    { month: "T9", value: 158000000, label: "158 tr" },
  ];

  const maxVal = Math.max(...monthlyRevenue.map((m) => m.value));

  // Top 5 sản phẩm bán chạy & tuyển chọn nhiều nhất
  const topProducts = [
    { name: "Pate cá hồi Na Uy tươi nguyên chất", category: "Thức ăn", boxCount: 420, retailCount: 185, totalRevenue: 30250000 },
    { name: "Snack ức gà sấy giòn nguyên miếng", category: "Snack", boxCount: 380, retailCount: 140, totalRevenue: 24700000 },
    { name: "Bóng cao su phát tiếng kêu độ nảy cao", category: "Đồ chơi", boxCount: 310, retailCount: 95, totalRevenue: 22275000 },
    { name: "Cá nhồi bông cỏ bạc hà Catnip cao cấp", category: "Đồ chơi mèo", boxCount: 290, retailCount: 88, totalRevenue: 18900000 },
    { name: "Bánh quy canxi sạch răng thơm miệng", category: "Bánh thưởng", boxCount: 260, retailCount: 72, totalRevenue: 14940000 },
  ];

  // Lý do hủy gói
  const cancelReasons = [
    { reason: "Bé đổi khẩu vị / thay đổi chế độ dinh dưỡng", percent: 45, count: 9 },
    { reason: "Chủ nuôi chuyển chỗ ở / đi công tác xa", percent: 25, count: 5 },
    { reason: "Cắt giảm chi tiêu gia đình", percent: 20, count: 4 },
    { reason: "Lý do cá nhân khác", percent: 10, count: 2 },
  ];

  const handleExportExcel = () => {
    setExportNotice("Đang tạo file Excel...");
    setTimeout(() => {
      setExportNotice("Đã xuất file báo cáo FPETS_Bao_Cao_Doanh_Thu_2026.xlsx thành công!");
      setTimeout(() => setExportNotice(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút xuất báo cáo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Báo cáo & Thống kê Hoạt động
          </h1>
          <p className="text-xs text-bark-500">
            Phân tích chuyên sâu doanh thu, tỷ lệ duy trì gói subscription, lý do hủy gói và hiệu suất sản phẩm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 text-xs focus:outline-none"
          >
            <option value="2026">Năm 2026</option>
            <option value="q3">Quý 3/2026</option>
            <option value="last6m">6 tháng gần nhất</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-grass-800 text-white rounded-box text-xs font-bold hover:bg-grass-900 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-grass-700" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Chỉ số tăng trưởng chính */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-bark-500 text-[11px] mb-1">
            <span>Tổng doanh thu (YTD)</span>
            <span className="text-grass-600 font-bold flex items-center gap-0.5">
              +28% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <span className="font-extrabold text-pine-950 text-xl font-display">
            {formatVND(713000000)}
          </span>
        </div>

        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-bark-500 text-[11px] mb-1">
            <span>Gói Subscription đang chạy</span>
            <span className="text-grass-600 font-bold flex items-center gap-0.5">
              85% duy trì
            </span>
          </div>
          <span className="font-extrabold text-pine-900 text-xl font-display">
            340 gói
          </span>
        </div>

        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-bark-500 text-[11px] mb-1">
            <span>Tỷ lệ hủy gói (Churn Rate)</span>
            <span className="text-grass-700 font-bold">5.8% (Tốt)</span>
          </div>
          <span className="font-extrabold text-bark-800 text-xl font-display">
            20 gói đã hủy
          </span>
        </div>

        <div className="p-4 rounded-container bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-bark-500 text-[11px] mb-1">
            <span>Giá trị vòng đời KH (LTV)</span>
            <span className="text-grass-600 font-bold">+15%</span>
          </div>
          <span className="font-extrabold text-grass-800 text-xl font-display">
            {formatVND(1650000)}
          </span>
        </div>
      </div>

      {/* Biểu đồ Doanh thu theo tháng */}
      <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-pine-800" />
            <h3 className="font-bold text-pine-950 text-sm">
              Biểu đồ tăng trưởng Doanh thu theo tháng (2026)
            </h3>
          </div>
          <span className="text-[11px] text-bark-500 font-medium">Đơn vị: VNĐ</span>
        </div>

        <div className="pt-6 pb-2">
          <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-surface-border">
            {monthlyRevenue.map((item, idx) => {
              const heightPercent = Math.round((item.value / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-bold text-pine-900 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-t-sm bg-pine-800 hover:bg-grass-600 transition-all duration-300 relative"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100" />
                  </div>
                  <span className="text-[11px] font-semibold text-bark-600">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2 Cột: Tỷ lệ Subscription & Lý do Hủy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Khối Trạng thái Subscription */}
        <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="font-bold text-pine-950 text-sm">
              Cơ cấu Trạng thái Subscription
            </h3>
            <span className="text-bark-500 text-[11px]">Tổng 400 gói</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-bark-800 font-semibold mb-1">
                <span>Đang hoạt động (Active)</span>
                <span className="text-grass-700">340 gói (85%)</span>
              </div>
              <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-grass-600 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-bark-800 font-semibold mb-1">
                <span>Đang tạm dừng (Paused do khách yêu cầu)</span>
                <span className="text-honey-600">40 gói (10%)</span>
              </div>
              <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-honey-500 rounded-full" style={{ width: "10%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-bark-800 font-semibold mb-1">
                <span>Đã hủy gói (Cancelled)</span>
                <span className="text-bark-600">20 gói (5%)</span>
              </div>
              <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-bark-400 rounded-full" style={{ width: "5%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Khối Phân tích Lý do Hủy gói */}
        <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="font-bold text-pine-950 text-sm">
              Khảo sát Lý do Hủy gói Subscription
            </h3>
            <span className="text-bark-500 text-[11px]">Mẫu 20 khách</span>
          </div>

          <div className="space-y-3">
            {cancelReasons.map((r, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-bark-800 font-medium mb-1">
                  <span className="line-clamp-1">{r.reason}</span>
                  <span className="font-bold text-pine-900 shrink-0 ml-2">
                    {r.percent}% ({r.count} khách)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pine-800 rounded-full"
                    style={{ width: `${r.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng Top sản phẩm bán chạy & tuyển chọn nhiều nhất */}
      <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-pine-950 text-sm">
            Top 5 Sản phẩm Hiệu quả nhất (Tuyển chọn Box & Shop lẻ)
          </h3>
          <span className="text-bark-500 text-[11px]">Sắp xếp theo doanh thu</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
              <tr>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3">Danh mục</th>
                <th className="p-3">Tuyển vào Box</th>
                <th className="p-3">Bán lẻ Shop</th>
                <th className="p-3">Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-bark-700">
              {topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3 font-semibold text-pine-950 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pine-100 text-pine-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{p.name}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-surface-muted font-medium text-bark-700">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-bark-900">{p.boxCount} lượt</td>
                  <td className="p-3 font-medium text-bark-900">{p.retailCount} món</td>
                  <td className="p-3 font-bold text-grass-800">
                    {formatVND(p.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
