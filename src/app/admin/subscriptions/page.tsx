"use client";

import React, { useState } from "react";
import { formatVND } from "@/lib/formatters";
import { Search, Pause, Play, XCircle, RefreshCw, Calendar, Package, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface AdminSubscription {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  petBreed: string;
  boxName: string;
  planName: string;
  totalCycles: number;
  currentCycleIndex: number;
  status: 'dang_hoat_dong' | 'tam_dung' | 'qua_han' | 'da_huy';
  statusLabel: string;
  deliveryScheduleLabel: string;
  nextDeliveryDate: string;
  cutoffDate: string;
  expiryDate: string;
  prepaidAmount: number;
}

const MOCK_ADMIN_SUBSCRIPTIONS: AdminSubscription[] = [
  {
    id: "sub-1",
    code: "SUB-2026-8912",
    customerName: "Nguyễn Văn Quang",
    customerPhone: "0912345678",
    petName: "Miu",
    petBreed: "Mèo Anh Lông Ngắn",
    boxName: "Box Tiêu chuẩn cho Mèo",
    planName: "Gói 3 hộp (Tiết kiệm 10% + Freeship)",
    totalCycles: 3,
    currentCycleIndex: 2,
    status: "dang_hoat_dong",
    statusLabel: "Đang hoạt động",
    deliveryScheduleLabel: "Đầu tháng (Ngày 1–5)",
    nextDeliveryDate: "02/10/2026",
    cutoffDate: "25/09/2026",
    expiryDate: "05/11/2026",
    prepaidAmount: 807000,
  },
  {
    id: "sub-2",
    code: "SUB-2026-5541",
    customerName: "Hoàng Thảo My",
    customerPhone: "0987654321",
    petName: "Bánh Bao",
    petBreed: "Mèo Munchkin",
    boxName: "Box Tiêu chuẩn cho Mèo",
    planName: "Gói 3 hộp (Tiết kiệm 10% + Freeship)",
    totalCycles: 3,
    currentCycleIndex: 1,
    status: "dang_hoat_dong",
    statusLabel: "Đang hoạt động",
    deliveryScheduleLabel: "Giữa tháng (Ngày 15–20)",
    nextDeliveryDate: "16/10/2026",
    cutoffDate: "10/10/2026",
    expiryDate: "20/12/2026",
    prepaidAmount: 807000,
  },
  {
    id: "sub-3",
    code: "SUB-2026-3390",
    customerName: "Trần Minh Đức",
    customerPhone: "0905123987",
    petName: "Rex",
    petBreed: "Corgi Pembroke",
    boxName: "Box Tiêu chuẩn cho Chó lớn",
    planName: "Gói 6 hộp (Tiết kiệm 15% + Quà sinh nhật)",
    totalCycles: 6,
    currentCycleIndex: 3,
    status: "tam_dung",
    statusLabel: "Tạm dừng (Khách yêu cầu)",
    deliveryScheduleLabel: "Đầu tháng (Ngày 1–5)",
    nextDeliveryDate: "Tạm hoãn đến 01/11/2026",
    cutoffDate: "25/10/2026",
    expiryDate: "05/03/2027",
    prepaidAmount: 1525000,
  },
  {
    id: "sub-4",
    code: "SUB-2026-1102",
    customerName: "Lê Thu Hà",
    customerPhone: "0933445566",
    petName: "LuLu",
    petBreed: "Poodle Tiny",
    boxName: "Box Tiêu chuẩn cho Chó nhỏ",
    planName: "Gói 3 hộp (Tiết kiệm 10% + Freeship)",
    totalCycles: 3,
    currentCycleIndex: 3,
    status: "qua_han",
    statusLabel: "Quá hạn thanh toán gia hạn",
    deliveryScheduleLabel: "Giữa tháng (Ngày 15–20)",
    nextDeliveryDate: "Chờ thanh toán kỳ mới",
    cutoffDate: "10/09/2026",
    expiryDate: "20/09/2026",
    prepaidAmount: 807000,
  },
  {
    id: "sub-5",
    code: "SUB-2026-9044",
    customerName: "Phạm Hải Long",
    customerPhone: "0918776655",
    petName: "KiKi",
    petBreed: "Chó Phốc Sóc",
    boxName: "Box Tiêu chuẩn cho Chó nhỏ",
    planName: "Gói 1 hộp (Thử nghiệm)",
    totalCycles: 1,
    currentCycleIndex: 1,
    status: "da_huy",
    statusLabel: "Đã hủy gói",
    deliveryScheduleLabel: "Đầu tháng (Ngày 1–5)",
    nextDeliveryDate: "—",
    cutoffDate: "—",
    expiryDate: "05/08/2026",
    prepaidAmount: 299000,
  }
];

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>(MOCK_ADMIN_SUBSCRIPTIONS);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Nút Tạm dừng / Tiếp tục
  const handleTogglePause = (id: string) => {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const isPaused = s.status === "tam_dung";
        return {
          ...s,
          status: isPaused ? "dang_hoat_dong" : "tam_dung",
          statusLabel: isPaused ? "Đang hoạt động" : "Tạm dừng (CSKH can thiệp)",
        };
      })
    );
    showNotice("Đã cập nhật trạng thái tạm dừng/tiếp tục gói!");
  };

  // Nút Hủy gói
  const handleCancelSub = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn hủy gói định kỳ này hộ khách hàng không?")) {
      setSubs((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "da_huy", statusLabel: "Đã hủy bởi CSKH" } : s
        )
      );
      showNotice("Đã hủy gói subscription thành công.");
    }
  };

  // Nút Gia hạn hộ khách
  const handleRenewSub = (id: string) => {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          totalCycles: s.totalCycles + 3,
          status: "dang_hoat_dong",
          statusLabel: "Đang hoạt động (Đã gia hạn +3 hộp)",
          expiryDate: "05/02/2027",
        };
      })
    );
    showNotice("Đã gia hạn thêm 3 kỳ thành công cho gói!");
  };

  const filtered = subs.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch =
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.petName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thông báo hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Gói Định Kỳ Subscription ({subs.length} gói)
          </h1>
          <p className="text-xs text-bark-500">
            Theo dõi tiến trình từng kỳ giao, ngày chốt thay đổi (cutoff date) và hỗ trợ khách hàng tạm dừng, hủy hoặc gia hạn gói.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-grass-700" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Tổng số gói</span>
          <span className="font-extrabold text-pine-950 text-lg">{subs.length}</span>
        </div>
        <div className="p-3.5 rounded-container bg-grass-50/60 border border-grass-200">
          <span className="text-grass-800 block text-[11px] font-medium">Đang hoạt động</span>
          <span className="font-extrabold text-grass-900 text-lg">
            {subs.filter((s) => s.status === "dang_hoat_dong").length}
          </span>
        </div>
        <div className="p-3.5 rounded-container bg-honey-50/60 border border-honey-200">
          <span className="text-bark-800 block text-[11px] font-medium">Đang tạm dừng</span>
          <span className="font-extrabold text-bark-800 text-lg">
            {subs.filter((s) => s.status === "tam_dung").length}
          </span>
        </div>
        <div className="p-3.5 rounded-container bg-surface-muted border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Quá hạn / Đã hủy</span>
          <span className="font-extrabold text-bark-700 text-lg">
            {subs.filter((s) => s.status === "qua_han" || s.status === "da_huy").length}
          </span>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo mã gói, tên khách, tên bé cưng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 text-xs focus:outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="dang_hoat_dong">Đang hoạt động</option>
          <option value="tam_dung">Tạm dừng</option>
          <option value="qua_han">Quá hạn</option>
          <option value="da_huy">Đã hủy</option>
        </select>
      </div>

      {/* Bảng danh sách Subscription */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Mã gói & Trạng thái</th>
              <th className="p-3.5">Khách hàng & Bé cưng</th>
              <th className="p-3.5">Loại Box & Gói</th>
              <th className="p-3.5">Tiến trình kỳ</th>
              <th className="p-3.5">Lịch giao kế tiếp</th>
              <th className="p-3.5">Cutoff / Hết hạn</th>
              <th className="p-3.5">Thao tác can thiệp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.map((sub) => (
              <tr key={sub.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="font-bold text-pine-950 font-mono text-xs">{sub.code}</div>
                  <div className="mt-1">
                    {sub.status === "dang_hoat_dong" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-grass-100 text-grass-800">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{sub.statusLabel}</span>
                      </span>
                    )}
                    {sub.status === "tam_dung" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-honey-100 text-bark-800">
                        <Pause className="w-2.5 h-2.5" />
                        <span>{sub.statusLabel}</span>
                      </span>
                    )}
                    {sub.status === "qua_han" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-800">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>{sub.statusLabel}</span>
                      </span>
                    )}
                    {sub.status === "da_huy" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-bark-500">
                        <XCircle className="w-2.5 h-2.5" />
                        <span>{sub.statusLabel}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="font-semibold text-pine-950">{sub.customerName}</div>
                  <div className="text-[11px] text-bark-500 flex items-center gap-1 mt-0.5">
                    <span>🐾 Bé: </span>
                    <strong className="text-pine-900">{sub.petName}</strong>
                    <span>({sub.petBreed})</span>
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="font-medium text-bark-900">{sub.boxName}</div>
                  <div className="text-[11px] text-grass-700 font-semibold">{sub.planName}</div>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-pine-900 text-sm">
                      Kỳ {sub.currentCycleIndex}/{sub.totalCycles}
                    </span>
                  </div>
                  <div className="w-24 bg-surface-muted h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-grass-600 h-full rounded-full"
                      style={{ width: `${(sub.currentCycleIndex / sub.totalCycles) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="font-semibold text-bark-900">{sub.nextDeliveryDate}</div>
                  <div className="text-[10px] text-bark-500">{sub.deliveryScheduleLabel}</div>
                </td>
                <td className="p-3.5">
                  <div className="text-[11px]">
                    <span className="text-bark-500">Cutoff: </span>
                    <strong className="text-bark-800">{sub.cutoffDate}</strong>
                  </div>
                  <div className="text-[10px] text-bark-400">
                    Hết hạn: {sub.expiryDate}
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Nút Tạm dừng / Tiếp tục */}
                    {sub.status !== "da_huy" && (
                      <button
                        onClick={() => handleTogglePause(sub.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                          sub.status === "tam_dung"
                            ? "bg-grass-100 text-grass-800 hover:bg-grass-200"
                            : "bg-surface-muted text-bark-700 hover:bg-bark-200"
                        }`}
                        title={sub.status === "tam_dung" ? "Tiếp tục chạy gói" : "Tạm dừng gói"}
                      >
                        {sub.status === "tam_dung" ? (
                          <>
                            <Play className="w-2.5 h-2.5" />
                            <span>Tiếp tục</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-2.5 h-2.5" />
                            <span>Tạm dừng</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Nút Gia hạn */}
                    <button
                      onClick={() => handleRenewSub(sub.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-pine-50 text-pine-900 hover:bg-pine-100 rounded transition-colors"
                      title="Gia hạn thêm 3 kỳ"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Gia hạn</span>
                    </button>

                    {/* Nút Hủy */}
                    {sub.status !== "da_huy" && (
                      <button
                        onClick={() => handleCancelSub(sub.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-bark-100 text-bark-700 hover:bg-bark-200 rounded transition-colors"
                        title="Hủy gói subscription"
                      >
                        <XCircle className="w-2.5 h-2.5" />
                        <span>Hủy</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
