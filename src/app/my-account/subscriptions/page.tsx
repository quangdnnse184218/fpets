"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/formatters";
import { Pause, Play, CheckCircle2, AlertTriangle } from "lucide-react";

type SubStatus = "cho_thanh_toan" | "dang_hoat_dong" | "tam_dung" | "qua_han" | "het_han" | "da_huy";

const STATUS_LABEL: Record<SubStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  dang_hoat_dong: "Đang hoạt động",
  tam_dung: "Tạm dừng",
  qua_han: "Quá hạn",
  het_han: "Hết hạn",
  da_huy: "Đã hủy",
};

interface SubscriptionRow {
  id: string;
  subscription_code: string;
  status: SubStatus;
  total_cycles: number;
  remaining_cycles: number;
  current_cycle: number;
  next_delivery_date: string;
  cutoff_date: string;
  total_prepaid_amount: number;
  paused_cycles_left: number;
  pets: { name: string; breed: string | null } | null;
  box_types: { name: string } | null;
  subscription_plans: { name: string } | null;
}

export default function MySubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pauseModalSubId, setPauseModalSubId] = useState<string | null>(null);
  const [cancelModalSubId, setCancelModalSubId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("Bé đi du lịch cùng gia đình");
  const [busy, setBusy] = useState(false);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, subscription_code, status, total_cycles, remaining_cycles, current_cycle, next_delivery_date, cutoff_date, total_prepaid_amount, paused_cycles_left, pets(name, breed), box_types(name), subscription_plans(name)")
      .order("created_at", { ascending: false });
    if (!error && data) setSubscriptions(data as unknown as SubscriptionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setActionError(null);
    setTimeout(() => setActionNotice(null), 4000);
  };
  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4000);
  };

  const handleConfirmPause = async () => {
    if (!pauseModalSubId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("pause_subscription", { p_subscription_id: pauseModalSubId, p_cycles: 1 });
    setBusy(false);
    setPauseModalSubId(null);
    if (error) {
      showError(error.message.includes("ERR_PAST_CUTOFF") ? "Đã qua ngày chốt, không thể tạm dừng kỳ này." : "Không thể tạm dừng gói này.");
      return;
    }
    showNotification("Đã tạm dừng 1 kỳ giao tiếp theo. Lịch nhận hộp tự động dời sang tháng sau!");
    loadSubs();
  };

  const handleResume = async (id: string) => {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("resume_subscription", { p_subscription_id: id });
    setBusy(false);
    if (error) {
      showError("Không thể tiếp tục gói này.");
      return;
    }
    showNotification("Gói đã hoạt động trở lại bình thường!");
    loadSubs();
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSubId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_subscription", { p_subscription_id: cancelModalSubId, p_reason: cancelReason });
    setBusy(false);
    setCancelModalSubId(null);
    if (error) {
      showError("Không thể hủy gói này.");
      return;
    }
    showNotification("Đã hủy gia hạn gói. Các hộp bạn đã trả trước vẫn sẽ được chuẩn bị và giao đầy đủ.");
    loadSubs();
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-bark-500">Đang tải gói định kỳ...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-pine-950">Gói Mystery Box định kỳ của bạn</h2>
        <p className="text-xs text-bark-500">
          Quản lý lịch giao hằng tháng, tạm dừng khi bận đi vắng hoặc hủy gói.
        </p>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-box bg-grass-50 border border-grass-200 text-grass-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-box bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {subscriptions.length === 0 && (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border space-y-2">
          <p>Bạn chưa có gói định kỳ nào.</p>
          <Link href="/boxes" className="text-pine-800 font-semibold hover:underline">Xem các loại Mystery Box</Link>
        </div>
      )}

      {subscriptions.map((sub) => {
        const isPaused = sub.status === "tam_dung";
        const isCancelled = sub.status === "da_huy" || sub.status === "het_han";
        const completedCycles = sub.total_cycles - sub.remaining_cycles;

        return (
          <div key={sub.id} className={`p-6 rounded-container bg-surface-card border space-y-5 shadow-xs ${isPaused ? "border-amber-400 bg-amber-50/20" : isCancelled ? "border-bark-300 opacity-90" : "border-surface-border"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-surface-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-pine-950 text-sm">{sub.subscription_code}</span>
                  <span className={`px-2.5 py-0.5 rounded-tag text-xs font-bold ${isPaused ? "bg-amber-100 text-amber-800" : isCancelled ? "bg-bark-200 text-bark-700" : "bg-grass-100 text-grass-800"}`}>
                    {STATUS_LABEL[sub.status]}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-pine-950">{sub.box_types?.name}</h3>
                <p className="text-xs text-bark-600">
                  Dành cho bé: <strong>{sub.pets?.name}</strong> ({sub.pets?.breed}) · {sub.subscription_plans?.name}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-bark-500">Tổng tiền đã trả:</div>
                <div className="text-base font-bold text-pine-950 font-display">{formatVND(sub.total_prepaid_amount)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-pine-950">
                <span>Tiến độ giao hộp ({completedCycles}/{sub.total_cycles} hộp):</span>
                <span className="text-honey-700">Còn lại {sub.remaining_cycles} hộp chưa giao</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-muted overflow-hidden flex gap-1 p-0.5 border border-surface-border">
                {[...Array(sub.total_cycles)].map((_, i) => (
                  <div key={i} className={`h-full flex-1 rounded-full ${i < completedCycles ? "bg-grass-600" : i === completedCycles && !isPaused && !isCancelled ? "bg-honey-500 animate-pulse" : "bg-surface-border"}`} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-box bg-surface-muted text-xs">
              <div>
                <span className="text-bark-500 block">Ngày giao dự kiến tiếp theo:</span>
                <strong className="text-pine-950">{new Date(sub.next_delivery_date).toLocaleDateString("vi-VN")}</strong>
              </div>
              <div>
                <span className="text-bark-500 block">Hạn chốt thay đổi (Cut-off):</span>
                <strong className="text-honey-800">{new Date(sub.cutoff_date).toLocaleDateString("vi-VN")}</strong>
              </div>
            </div>

            {!isCancelled && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-surface-border">
                <div className="flex flex-wrap items-center gap-2">
                  {isPaused ? (
                    <button type="button" disabled={busy} onClick={() => handleResume(sub.id)}
                      className="px-3.5 py-2 rounded-box bg-grass-700 hover:bg-grass-800 text-white font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60">
                      <Play className="w-3.5 h-3.5" />
                      <span>Tiếp tục nhận hộp ngay</span>
                    </button>
                  ) : sub.status === "dang_hoat_dong" ? (
                    <button type="button" onClick={() => setPauseModalSubId(sub.id)}
                      className="px-3.5 py-2 rounded-box bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold flex items-center gap-1.5 transition-colors">
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tạm dừng 1 kỳ</span>
                    </button>
                  ) : null}
                </div>

                <button type="button" onClick={() => setCancelModalSubId(sub.id)} className="text-bark-500 hover:text-red-600 font-semibold transition-colors">
                  Hủy gói định kỳ
                </button>
              </div>
            )}
          </div>
        );
      })}

      {pauseModalSubId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
              <Pause className="w-4 h-4 text-amber-600" />
              <span>Xác nhận tạm dừng kỳ giao kế tiếp</span>
            </h3>
            <p className="text-bark-600 leading-relaxed">
              Hộp đã trả trước của bạn sẽ được giữ nguyên và tự động dời sang tháng sau.
            </p>
            <div className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900">
              * Giới hạn tạm dừng tối đa 2 kỳ liên tiếp. Bạn có thể bấm &quot;Tiếp tục ngay&quot; bất kỳ lúc nào.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button type="button" onClick={() => setPauseModalSubId(null)} className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold">
                Không, giữ nguyên lịch
              </button>
              <button type="button" disabled={busy} onClick={handleConfirmPause} className="px-5 py-2 rounded-box bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-60">
                Xác nhận tạm dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalSubId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-card rounded-container p-6 space-y-4 shadow-xl border border-surface-border text-xs">
            <h3 className="text-base font-bold text-pine-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Hủy gói định kỳ?</span>
            </h3>
            <div className="p-3 rounded-box bg-surface-muted border border-surface-border space-y-1">
              <div className="font-bold text-pine-950">Gợi ý từ FPETS:</div>
              <p className="text-bark-600">
                Nếu bạn sắp đi vắng, bạn có thể chọn <strong>Tạm dừng</strong> thay vì hủy hẳn.
              </p>
            </div>
            <div>
              <label className="font-bold text-bark-800 block mb-1">Vui lòng cho FPETS biết lý do hủy:</label>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full p-2.5 rounded-box border border-surface-border bg-white">
                <option value="Bé đi du lịch cùng gia đình">Bé đi vắng / Du lịch</option>
                <option value="Đồ chơi và bánh thưởng còn nhiều">Bánh thưởng trong hộp còn nhiều chưa dùng hết</option>
                <option value="Muốn đổi sang gói khác">Muốn đổi sang gói khác hoặc mua lẻ</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>
            <p className="text-[11px] text-bark-500">
              * Khi bấm hủy, toàn bộ số hộp bạn đã trả trước vẫn sẽ được giao đầy đủ đến hết kỳ, không hoàn tiền.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button type="button" onClick={() => setCancelModalSubId(null)} className="px-4 py-2 rounded-box border border-surface-border text-bark-700 font-semibold">
                Giữ gói
              </button>
              <button type="button" disabled={busy} onClick={handleConfirmCancel} className="px-5 py-2 rounded-box bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-60">
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
