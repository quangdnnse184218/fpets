"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Pause, Play, XCircle, AlertCircle, CheckCircle2 } from "lucide-react";

type SubStatus = "cho_thanh_toan" | "dang_hoat_dong" | "tam_dung" | "qua_han" | "het_han" | "da_huy";

const STATUS_LABEL: Record<SubStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  dang_hoat_dong: "Đang hoạt động",
  tam_dung: "Tạm dừng",
  qua_han: "Quá hạn",
  het_han: "Hết hạn",
  da_huy: "Đã hủy",
};

interface SubRow {
  id: string;
  subscription_code: string;
  status: SubStatus;
  total_cycles: number;
  remaining_cycles: number;
  current_cycle: number;
  next_delivery_date: string;
  cutoff_date: string;
  delivery_schedule: string;
  pets: { name: string; breed: string | null } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
  box_types: { name: string } | null;
  subscription_plans: { name: string } | null;
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("id, subscription_code, status, total_cycles, remaining_cycles, current_cycle, next_delivery_date, cutoff_date, delivery_schedule, pets(name, breed), profiles(full_name, phone), box_types(name), subscription_plans(name)")
      .order("created_at", { ascending: false });
    setSubs((data as unknown as SubRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  const showNotice = (msg: string) => { setActionNotice(msg); setTimeout(() => setActionNotice(null), 3000); };

  const handleTogglePause = async (sub: SubRow) => {
    setBusyId(sub.id);
    const supabase = createClient();
    if (sub.status === "tam_dung") {
      const { error } = await supabase.rpc("resume_subscription", { p_subscription_id: sub.id });
      if (!error) showNotice("Đã tiếp tục gói cho khách.");
    } else {
      const { error } = await supabase.rpc("pause_subscription", { p_subscription_id: sub.id, p_cycles: 1 });
      if (!error) showNotice("Đã tạm dừng 1 kỳ hộ khách.");
      else showNotice("Không thể tạm dừng: " + error.message);
    }
    setBusyId(null);
    loadSubs();
  };

  const handleCancelSub = async (sub: SubRow) => {
    if (!confirm("Bạn có chắc chắn muốn hủy gói định kỳ này hộ khách hàng không?")) return;
    setBusyId(sub.id);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_subscription", { p_subscription_id: sub.id, p_reason: "Hủy bởi CSKH/Admin" });
    setBusyId(null);
    if (!error) showNotice("Đã hủy gói subscription thành công.");
    loadSubs();
  };

  const filtered = subs.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch =
      s.subscription_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.pets?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const STATUS_ICON: Record<SubStatus, typeof CheckCircle2> = {
    dang_hoat_dong: CheckCircle2, tam_dung: Pause, qua_han: AlertCircle, het_han: XCircle, da_huy: XCircle, cho_thanh_toan: AlertCircle,
  };
  const STATUS_STYLE: Record<SubStatus, string> = {
    dang_hoat_dong: "bg-grass-100 text-grass-800", tam_dung: "bg-honey-100 text-bark-800", qua_han: "bg-bark-100 text-bark-800",
    het_han: "bg-surface-muted text-bark-500", da_huy: "bg-surface-muted text-bark-500", cho_thanh_toan: "bg-surface-muted text-bark-500",
  };

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải gói định kỳ...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Quản lý Gói Định Kỳ Subscription ({subs.length} gói)</h1>
        <p className="text-xs text-bark-500">Theo dõi tiến trình từng kỳ giao, ngày chốt và hỗ trợ khách hàng tạm dừng hoặc hủy gói.</p>
      </div>

      {actionNotice && (
        <div className="p-3 bg-grass-100 border border-grass-200 text-grass-900 rounded-box text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-grass-700" /><span>{actionNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-container bg-surface-card border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Tổng số gói</span>
          <span className="font-extrabold text-pine-950 text-lg">{subs.length}</span>
        </div>
        <div className="p-3.5 rounded-container bg-grass-50/60 border border-grass-200">
          <span className="text-grass-800 block text-[11px] font-medium">Đang hoạt động</span>
          <span className="font-extrabold text-grass-900 text-lg">{subs.filter((s) => s.status === "dang_hoat_dong").length}</span>
        </div>
        <div className="p-3.5 rounded-container bg-honey-50/60 border border-honey-200">
          <span className="text-bark-800 block text-[11px] font-medium">Đang tạm dừng</span>
          <span className="font-extrabold text-bark-800 text-lg">{subs.filter((s) => s.status === "tam_dung").length}</span>
        </div>
        <div className="p-3.5 rounded-container bg-surface-muted border border-surface-border">
          <span className="text-bark-500 block text-[11px]">Quá hạn / Đã hủy</span>
          <span className="font-extrabold text-bark-700 text-lg">{subs.filter((s) => ["qua_han", "het_han", "da_huy"].includes(s.status)).length}</span>
        </div>
      </div>

      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm theo mã gói, tên khách, tên bé..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-box border border-surface-border bg-white text-bark-700 text-xs focus:outline-none">
          <option value="all">Tất cả trạng thái</option>
          <option value="dang_hoat_dong">Đang hoạt động</option>
          <option value="tam_dung">Tạm dừng</option>
          <option value="qua_han">Quá hạn</option>
          <option value="het_han">Hết hạn</option>
          <option value="da_huy">Đã hủy</option>
        </select>
      </div>

      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Mã gói & Trạng thái</th>
              <th className="p-3.5">Khách hàng & Bé cưng</th>
              <th className="p-3.5">Loại Box & Gói</th>
              <th className="p-3.5">Tiến trình kỳ</th>
              <th className="p-3.5">Lịch giao kế tiếp</th>
              <th className="p-3.5">Cutoff</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.map((sub) => {
              const Icon = STATUS_ICON[sub.status];
              const completed = sub.total_cycles - sub.remaining_cycles;
              return (
                <tr key={sub.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-pine-950 font-mono text-xs">{sub.subscription_code}</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[sub.status]}`}>
                        <Icon className="w-2.5 h-2.5" /><span>{STATUS_LABEL[sub.status]}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-pine-950">{sub.profiles?.full_name}</div>
                    <div className="text-[11px] text-bark-500 mt-0.5">Bé: <strong className="text-pine-900">{sub.pets?.name}</strong> ({sub.pets?.breed})</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-bark-900">{sub.box_types?.name}</div>
                    <div className="text-[11px] text-grass-700 font-semibold">{sub.subscription_plans?.name}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-pine-900 text-sm">Kỳ {completed}/{sub.total_cycles}</span>
                    <div className="w-24 bg-surface-muted h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-grass-600 h-full rounded-full" style={{ width: `${(completed / sub.total_cycles) * 100}%` }} />
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-bark-900">{new Date(sub.next_delivery_date).toLocaleDateString("vi-VN")}</div>
                    <div className="text-[10px] text-bark-500">{sub.delivery_schedule === "dau_thang" ? "Đầu tháng" : "Giữa tháng"}</div>
                  </td>
                  <td className="p-3.5"><div className="text-[11px]"><strong className="text-bark-800">{new Date(sub.cutoff_date).toLocaleDateString("vi-VN")}</strong></div></td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!["da_huy", "het_han"].includes(sub.status) && (
                        <button onClick={() => handleTogglePause(sub)} disabled={busyId === sub.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors disabled:opacity-60 ${sub.status === "tam_dung" ? "bg-grass-100 text-grass-800 hover:bg-grass-200" : "bg-surface-muted text-bark-700 hover:bg-bark-200"}`}>
                          {sub.status === "tam_dung" ? (<><Play className="w-2.5 h-2.5" /><span>Tiếp tục</span></>) : (<><Pause className="w-2.5 h-2.5" /><span>Tạm dừng</span></>)}
                        </button>
                      )}
                      {!["da_huy", "het_han"].includes(sub.status) && (
                        <button onClick={() => handleCancelSub(sub)} disabled={busyId === sub.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-bark-100 text-bark-700 hover:bg-bark-200 rounded transition-colors disabled:opacity-60">
                          <XCircle className="w-2.5 h-2.5" /><span>Hủy</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
