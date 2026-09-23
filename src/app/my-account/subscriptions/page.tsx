"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatVND } from "@/lib/formatters";
import { SUBSCRIPTION_PLANS } from "@/mock/boxTypes";
import { RefreshCw, Pause, Play, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export default function MySubscriptionsPage() {
  const { subscriptions, pauseSubscription, resumeSubscription, cancelSubscription, renewSubscription } = useApp();

  const [pauseModalSubId, setPauseModalSubId] = useState<string | null>(null);
  const [cancelModalSubId, setCancelModalSubId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("Bé đi du lịch cùng gia đình");
  const [renewModalSubId, setRenewModalSubId] = useState<string | null>(null);
  const [selectedRenewPlan, setSelectedRenewPlan] = useState("plan-3");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleConfirmPause = () => {
    if (!pauseModalSubId) return;
    pauseSubscription(pauseModalSubId, 1);
    setPauseModalSubId(null);
    showNotification("Đã tạm dừng 1 kỳ giao tiếp theo. Lịch nhận hộp tự động dời sang tháng sau!");
  };

  const handleConfirmCancel = () => {
    if (!cancelModalSubId) return;
    cancelSubscription(cancelModalSubId, cancelReason);
    setCancelModalSubId(null);
    showNotification("Đã hủy gia hạn gói. Các hộp bạn đã trả trước vẫn sẽ được chuẩn bị và giao đầy đủ.");
  };

  const handleConfirmRenew = () => {
    if (!renewModalSubId) return;
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedRenewPlan) || SUBSCRIPTION_PLANS[1];
    renewSubscription(renewModalSubId, `${plan.name} (Gia hạn)`, 807000);
    setRenewModalSubId(null);
    showNotification("Gia hạn thành công! Gói mới sẽ tự động kích hoạt nối tiếp sau kỳ cuối cùng.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-pine-950">Gói Mystery Box định kỳ của bạn</h2>
        <p className="text-xs text-bark-500">
          Quản lý lịch giao hằng tháng, tạm dừng khi bận đi vắng hoặc gia hạn để duy trì ưu đãi.
        </p>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {subscriptions.map((sub) => {
        const isPaused = sub.status === 'tam_dung';
        const isCancelled = sub.status === 'da_huy';
        const isLastBox = sub.remainingCycles <= 1;

        return (
          <div
            key={sub.id}
            className={`p-6 rounded-container bg-surface-card border space-y-5 shadow-xs ${
              isPaused ? "border-amber-400 bg-amber-50/20" : isCancelled ? "border-bark-300 opacity-90" : "border-surface-border"
            }`}
          >
            {/* Header gói */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-surface-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-pine-950 text-sm">{sub.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-tag text-xs font-bold ${
                    isPaused ? "bg-amber-100 text-amber-800" : isCancelled ? "bg-bark-200 text-bark-700" : "bg-grass-100 text-grass-800"
                  }`}>
                    {sub.statusLabel}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-pine-950">{sub.boxName}</h3>
                <p className="text-xs text-bark-600">
                  Dành cho bé: <strong>{sub.petName}</strong> ({sub.petBreed}) · {sub.planName}
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-bark-500">Tổng tiền đã trả:</div>
                <div className="text-base font-bold text-pine-950 font-display">
                  {formatVND(sub.prepaidAmount)}
                </div>
              </div>
            </div>

            {/* Tiến độ các kỳ */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-pine-950">
                <span>Tiến độ giao hộp ({sub.completedCycles}/{sub.totalCycles} hộp):</span>
                <span className="text-honey-700">Còn lại {sub.remainingCycles} hộp chưa giao</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-muted overflow-hidden flex gap-1 p-0.5 border border-surface-border">
                {[...Array(sub.totalCycles)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full flex-1 rounded-full ${
                      i < sub.completedCycles
                        ? "bg-grass-600"
                        : i === sub.completedCycles && !isPaused && !isCancelled
                        ? "bg-honey-500 animate-pulse"
                        : "bg-surface-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Thông tin kỳ giao kế tiếp & Cut-off date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-box bg-surface-muted text-xs">
              <div>
                <span className="text-bark-500 block">Đợt giao hằng tháng:</span>
                <strong className="text-pine-950">{sub.deliveryScheduleLabel}</strong>
              </div>
              <div>
                <span className="text-bark-500 block">Ngày giao dự kiến tiếp theo:</span>
                <strong className="text-pine-950">{sub.nextDeliveryDate}</strong>
              </div>
              <div>
                <span className="text-bark-500 block">Hạn chốt thay đổi (Cut-off):</span>
                <strong className="text-honey-800">{sub.cutoffDate}</strong>
              </div>
            </div>

            {/* Các nút can thiệp gói (Pause, Cancel, Resume, Renew) */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-surface-border">
              <div className="flex flex-wrap items-center gap-2">
                {/* Nút Pause / Resume */}
                {!isCancelled && (
                  <>
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={() => {
                          resumeSubscription(sub.id);
                          showNotification("Gói đã hoạt động trở lại bình thường!");
                        }}
                        className="px-3.5 py-2 rounded-box bg-grass-700 hover:bg-grass-800 text-white font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Tiếp tục nhận hộp ngay</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPauseModalSubId(sub.id)}
                        className="px-3.5 py-2 rounded-box bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tạm dừng 1 kỳ</span>
                      </button>
                    )}
                  </>
                )}

                {/* Nút Gia hạn */}
                {!isCancelled && (
                  <button
                    type="button"
                    onClick={() => setRenewModalSubId(sub.id)}
                    className="px-3.5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold transition-colors"
                  >
                    <span>Gia hạn tiếp nối</span>
                  </button>
                )}
              </div>

              {/* Nút Hủy gói */}
              {!isCancelled && (
                <button
                  type="button"
                  onClick={() => setCancelModalSubId(sub.id)}
                  className="text-bark-500 hover:text-red-600 font-semibold transition-colors"
                >
                  Hủy gói định kỳ
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal Tạm Dừng */}
      {pauseModalSubId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
              <Pause className="w-4 h-4 text-amber-600" />
              <span>Xác nhận tạm dừng kỳ giao kế tiếp</span>
            </h3>
            <p className="text-bark-600 leading-relaxed">
              Bạn có thể bỏ qua 1 kỳ giao tháng 10. Hộp đã trả trước của bạn sẽ được giữ nguyên và tự động dời sang tháng 11/2026.
            </p>
            <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900">
              * Giới hạn tạm dừng tối đa 2 kỳ liên tiếp. Bạn có thể bấm "Tiếp tục ngay" bất kỳ lúc nào để nhận lại hộp sớm hơn.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setPauseModalSubId(null)}
                className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
              >
                Không, giữ nguyên lịch
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="px-5 py-2 rounded-box bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Xác nhận tạm dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Gói */}
      {cancelModalSubId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Hủy gia hạn gói định kỳ?</span>
            </h3>
            <div className="p-3 rounded-box bg-surface-muted border border-surface-border space-y-1">
              <div className="font-bold text-pine-950">Gợi ý từ FPETS:</div>
              <p className="text-bark-600">
                Nếu bạn sắp đi vắng hoặc bé chưa dùng hết món cũ, bạn có thể chọn <strong>Tạm dừng</strong> thay vì hủy để vẫn giữ ưu đãi chiết khấu 10%!
              </p>
            </div>

            <div>
              <label className="font-bold text-bark-800 block mb-1">Vui lòng cho FPETS biết lý do hủy:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-box border border-surface-border bg-white"
              >
                <option value="Bé đi du lịch cùng gia đình">Bé đi vắng / Du lịch</option>
                <option value="Đồ chơi và bánh thưởng còn nhiều">Bánh thưởng trong hộp còn nhiều chưa dùng hết</option>
                <option value="Muốn đổi sang gói khác">Muốn đổi sang gói khác hoặc mua lẻ</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>

            <p className="text-[11px] text-bark-500">
              * Khi bấm hủy, FPETS sẽ không nhắc gia hạn nữa. Toàn bộ số hộp bạn đã trả trước vẫn sẽ được giao đầy đủ đến hết kỳ.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setCancelModalSubId(null)}
                className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
              >
                Giữ gói
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-box bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gia Hạn Gói */}
      {renewModalSubId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-pine-900" />
              <span>Gia hạn gói Mystery Box nối tiếp</span>
            </h3>

            <p className="text-bark-600">
              Chọn gói bạn muốn tiếp tục nhận cho bé. Lịch giao sẽ tự động nối tiếp ngay sau khi kỳ cuối hiện tại hoàn thành.
            </p>

            <div className="space-y-2">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <label
                  key={plan.id}
                  className={`p-3 rounded-box border flex items-center justify-between cursor-pointer ${
                    selectedRenewPlan === plan.id ? "border-pine-900 bg-pine-50" : "border-surface-border hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="renewPlan"
                      value={plan.id}
                      checked={selectedRenewPlan === plan.id}
                      onChange={() => setSelectedRenewPlan(plan.id)}
                      className="accent-pine-900"
                    />
                    <div>
                      <span className="font-bold text-pine-950">{plan.name}</span>
                      <span className="text-[11px] text-bark-500 block">{plan.description}</span>
                    </div>
                  </div>
                  <span className="font-extrabold text-pine-950">
                    {plan.cycles === 1 ? "299.000₫" : plan.cycles === 3 ? "807.000₫" : "1.525.000₫"}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setRenewModalSubId(null)}
                className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRenew}
                className="px-5 py-2 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold"
              >
                Thanh toán gia hạn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
