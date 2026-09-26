"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { Search, Truck, AlertCircle } from "lucide-react";

type OrderStatus = "cho_thanh_toan" | "da_xac_nhan" | "dang_chuan_bi" | "dang_giao" | "da_giao" | "da_huy" | "doi_tra";

const STATUS_STEPS: { key: OrderStatus; label: string; description: string }[] = [
  { key: "cho_thanh_toan", label: "Chờ thanh toán", description: "Đơn đã tạo, đang chờ thanh toán online (tự hủy sau 30 phút nếu không thanh toán)." },
  { key: "da_xac_nhan", label: "Đã xác nhận", description: "Đã thanh toán hoặc đơn COD đã được xác nhận." },
  { key: "dang_chuan_bi", label: "Đang chuẩn bị", description: "Box đang được tuyển chọn / đóng gói." },
  { key: "dang_giao", label: "Đang giao", description: "Đã bàn giao đơn vị vận chuyển." },
  { key: "da_giao", label: "Đã giao", description: "Bạn đã nhận hàng thành công." },
];

interface LookupResult {
  order_code: string;
  status: OrderStatus;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  total_amount: number;
  tracking_code: string | null;
}

export default function OrderTrackingPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<LookupResult | null>(null);

  // Điền sẵn mã đơn khi đến từ trang đặt hàng thành công (?code=...)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) setOrderCode(code);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("lookup_order", {
      p_order_code: orderCode.trim().toUpperCase(),
      p_phone: phone.trim(),
    });
    const rows = (data as unknown as LookupResult[]) || [];
    setFoundOrder(rows[0] || null);
    setLoading(false);
  };

  const currentStepIdx = foundOrder ? STATUS_STEPS.findIndex((s) => s.key === foundOrder.status) : -1;
  const isCancelled = foundOrder && (foundOrder.status === "da_huy" || foundOrder.status === "doi_tra");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Tra cứu tiến độ đơn hàng</h1>
        <p className="text-xs sm:text-sm text-bark-600">
          Dành cho khách hàng chưa đăng nhập hoặc cần kiểm tra nhanh vị trí kiện hàng.
        </p>
      </div>

      <form onSubmit={handleSearch} className="p-6 rounded-container bg-surface-card border border-surface-border shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-bark-800 block mb-1">Mã đơn hàng: *</label>
            <input type="text" required placeholder="Ví dụ: FPET-20260920-8812" value={orderCode} onChange={(e) => setOrderCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-box border border-surface-border font-mono text-xs focus:border-pine-900 focus:outline-none" />
          </div>
          <div>
            <label className="font-bold text-bark-800 block mb-1">Số điện thoại đặt hàng: *</label>
            <input type="tel" required placeholder="Ví dụ: 0912345678" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-center pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60">
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? "Đang tra cứu..." : "Tra cứu đơn ngay"}</span>
          </button>
        </div>
      </form>

      {searched && !loading && (
        <div>
          {foundOrder ? (
            <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border">
                <div>
                  <span className="font-mono font-bold text-pine-950 text-base">{foundOrder.order_code}</span>
                  <p className="text-xs text-bark-500">Người nhận: {foundOrder.recipient_name} ({foundOrder.recipient_phone})</p>
                </div>
                <span className="px-3 py-1 rounded-tag bg-honey-100 text-honey-800 font-bold text-xs">
                  {STATUS_STEPS.find((s) => s.key === foundOrder.status)?.label || (foundOrder.status === "da_huy" ? "Đã hủy" : "Đổi / Trả")}
                </span>
              </div>

              {!isCancelled && (
                <div className="space-y-3 pt-2">
                  <div className="font-bold text-xs text-pine-950 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-pine-800" />
                    <span>Tiến độ giao hàng:</span>
                  </div>
                  <div className="space-y-3 pl-3 border-l-2 border-pine-800/40">
                    {STATUS_STEPS.map((step, idx) => (
                      <div key={step.key} className="relative pl-3 text-xs">
                        <span className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full ${idx <= currentStepIdx ? "bg-grass-600" : "bg-bark-300"}`} />
                        <div className={`font-bold ${idx <= currentStepIdx ? "text-pine-950" : "text-bark-400"}`}>{step.label}</div>
                        <p className="text-[11px] text-bark-600 mt-0.5">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {foundOrder.tracking_code && (
                <div className="text-xs text-bark-600">Mã vận đơn: <span className="font-mono font-bold text-pine-950">{foundOrder.tracking_code}</span></div>
              )}

              <div className="pt-3 border-t border-surface-border flex justify-between text-xs">
                <span className="text-bark-500">Địa chỉ giao: {foundOrder.shipping_address}</span>
                <strong className="text-pine-950">{formatVND(foundOrder.total_amount)}</strong>
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
