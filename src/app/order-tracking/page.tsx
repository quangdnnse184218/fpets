"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { Search, Package, Truck, CheckCircle2, AlertCircle } from "lucide-react";

export default function OrderTrackingPage() {
  const { orders } = useApp();
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [foundOrder, setFoundOrder] = useState<typeof orders[0] | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const cleanCode = orderCode.trim().toUpperCase();
    const cleanPhone = phone.trim();

    const match = orders.find(
      (o) => o.orderCode.toUpperCase() === cleanCode && (cleanPhone ? o.recipientPhone.includes(cleanPhone) : true)
    );
    setFoundOrder(match || null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
          Tra cứu tiến độ đơn hàng
        </h1>
        <p className="text-xs sm:text-sm text-bark-600">
          Dành cho khách hàng chưa đăng nhập hoặc cần kiểm tra nhanh vị trí kiện hàng.
        </p>
      </div>

      {/* Form tra cứu */}
      <form onSubmit={handleSearch} className="p-6 rounded-container bg-surface-card border border-surface-border shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-bark-800 block mb-1">Mã đơn hàng: *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: FPET-20260920-8812"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-box border border-surface-border font-mono text-xs focus:border-pine-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-bark-800 block mb-1">Số điện thoại đặt hàng: *</label>
            <input
              type="tel"
              required
              placeholder="Ví dụ: 0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tra cứu đơn ngay</span>
          </button>
        </div>

        {/* Gợi ý test nhanh */}
        <div className="text-[11px] text-bark-400 text-center pt-2 border-t border-surface-border">
          * Gợi ý mã mẫu để test thử: <strong>FPET-20260920-8812</strong> (SĐT: 0912345678)
        </div>
      </form>

      {/* Kết quả tra cứu */}
      {searched && (
        <div>
          {foundOrder ? (
            <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border">
                <div>
                  <span className="font-mono font-bold text-pine-950 text-base">{foundOrder.orderCode}</span>
                  <p className="text-xs text-bark-500">Người nhận: {foundOrder.recipientName} ({foundOrder.recipientPhone})</p>
                </div>
                <span className="px-3 py-1 rounded-tag bg-honey-100 text-honey-800 font-bold text-xs">
                  {foundOrder.statusLabel}
                </span>
              </div>

              {/* Chi tiết timeline */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-xs text-pine-950 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-pine-800" />
                  <span>Timeline lộ trình vận chuyển:</span>
                </div>
                <div className="space-y-3 pl-3 border-l-2 border-pine-800/40">
                  {foundOrder.timeline.map((item, idx) => (
                    <div key={idx} className="relative pl-3 text-xs">
                      <span
                        className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full ${
                          item.completed ? "bg-grass-600" : "bg-bark-300"
                        }`}
                      />
                      <div className="flex justify-between font-bold text-pine-950">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-bark-400 font-normal">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-bark-600 mt-0.5">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border flex justify-between text-xs">
                <span className="text-bark-500">Địa chỉ giao: {foundOrder.shippingAddress}</span>
                <strong className="text-pine-950">{formatVND(foundOrder.totalAmount)}</strong>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-container bg-surface-card border border-surface-border text-center space-y-2 text-xs">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="font-bold text-pine-950">Không tìm thấy đơn hàng khớp với thông tin này</div>
              <p className="text-bark-500 max-w-sm mx-auto">
                Vui lòng kiểm tra lại chính xác mã đơn (FPET-...) và số điện thoại đã dùng lúc đặt hàng.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
