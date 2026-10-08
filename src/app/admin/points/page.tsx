"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coins, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatVND } from "@/lib/formatters";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { textMatches } from "@/lib/search";
import { POINT_KIND_LABEL, POINTS_RULE, VND_PER_POINT } from "@/lib/points";

// Quản lý điểm thưởng (chỉ admin): số dư từng khách, lịch sử cộng / trừ, điều chỉnh tay.
// Quy tắc cộng / dùng điểm chạy tự động ở server (trigger trg_orders_points); trang này chỉ xem và điều chỉnh.

interface TxRow {
  id: string;
  user_id: string;
  order_id: string | null;
  kind: string;
  points: number;
  note: string | null;
  created_at: string;
}
interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
}
interface CustomerPoints {
  profile: ProfileRow;
  balance: number;
  earned: number;
  redeemed: number;
  lastAt: string | null;
}

const KIND_STYLE: Record<string, string> = {
  earn: "bg-grass-50 text-grass-800 border-grass-200",
  redeem: "bg-honey-50 text-honey-800 border-honey-200",
  refund_redeem: "bg-pine-50 text-pine-900 border-pine-200",
  revoke_earn: "bg-red-50 text-red-700 border-red-200",
  adjust: "bg-surface-muted text-bark-700 border-surface-border",
};

const card = "rounded-container bg-surface-card border border-surface-border";
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

export default function AdminPointsPage() {
  const { show } = useToast();
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"customers" | "history">("customers");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("point_transactions").select("id, user_id, order_id, kind, points, note, created_at").order("created_at", { ascending: false }).limit(5000),
      supabase.from("profiles").select("id, full_name, email, phone").in("role", ["customer", "staff"]),
    ]);
    setTxs((t as TxRow[]) || []);
    setProfiles((p as ProfileRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  // Số dư = tổng sổ điểm; kèm tổng đã cộng, đã dùng (sau khi trừ phần được trả lại) và lần thay đổi gần nhất
  const customers = useMemo<CustomerPoints[]>(() => {
    const map = new Map<string, CustomerPoints>();
    profiles.forEach((p) => map.set(p.id, { profile: p, balance: 0, earned: 0, redeemed: 0, lastAt: null }));
    txs.forEach((t) => {
      const c = map.get(t.user_id);
      if (!c) return;
      c.balance += t.points;
      if (t.kind === "earn" || (t.kind === "adjust" && t.points > 0)) c.earned += t.points;
      if (t.kind === "redeem") c.redeemed -= t.points;
      if (t.kind === "refund_redeem") c.redeemed -= t.points;
      if (!c.lastAt || t.created_at > c.lastAt) c.lastAt = t.created_at;
    });
    return Array.from(map.values()).sort((a, b) => b.balance - a.balance || (b.lastAt || "").localeCompare(a.lastAt || ""));
  }, [profiles, txs]);

  const stats = useMemo(() => {
    const since = monthStart();
    const thisMonth = txs.filter((t) => new Date(t.created_at).getTime() >= since);
    const outstanding = customers.reduce((s, c) => s + Math.max(c.balance, 0), 0);
    return {
      outstanding,
      holders: customers.filter((c) => c.balance > 0).length,
      earnedMonth: thisMonth.filter((t) => t.kind === "earn").reduce((s, t) => s + t.points, 0),
      // Điểm dùng trong tháng, trừ phần được trả lại do đơn hủy
      usedMonth: -thisMonth.filter((t) => t.kind === "redeem" || t.kind === "refund_redeem").reduce((s, t) => s + t.points, 0),
    };
  }, [txs, customers]);

  const visibleCustomers = customers.filter(
    (c) => (search ? textMatches([c.profile.full_name, c.profile.email, c.profile.phone], search) : c.balance !== 0 || c.lastAt !== null)
  );
  const visibleTxs = txs.filter((t) => {
    if (kindFilter !== "all" && t.kind !== kindFilter) return false;
    if (!search) return true;
    const p = profileById.get(t.user_id);
    return textMatches([p?.full_name, p?.email, p?.phone, t.note], search);
  });

  const selected = customers.find((c) => c.profile.id === selectedId) || null;

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải điểm thưởng…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Điểm thưởng</h1>
        <p className="text-xs text-bark-500">{POINTS_RULE} Điểm cộng, trừ và trả lại tự động theo đơn hàng.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Stat label="Khách đang giữ" value={`${stats.outstanding.toLocaleString("vi-VN")} điểm`} note={`Tương đương ${formatVND(stats.outstanding * VND_PER_POINT)}`} />
        <Stat label="Khách có điểm" value={`${stats.holders} khách`} />
        <Stat label="Đã cộng tháng này" value={`+${stats.earnedMonth.toLocaleString("vi-VN")} điểm`} />
        <Stat label="Đã dùng tháng này" value={`${stats.usedMonth.toLocaleString("vi-VN")} điểm`} note={`Giảm cho khách ${formatVND(stats.usedMonth * VND_PER_POINT)}`} />
      </div>

      <div className={`${card} p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center`}>
        <div role="tablist" className="inline-flex p-0.5 rounded-box bg-surface-muted border border-surface-border self-start">
          {([
            ["customers", "Khách hàng"],
            ["history", "Lịch sử"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`h-8 px-3 rounded-[6px] text-xs font-semibold ${tab === id ? "bg-surface-card text-pine-950 shadow-xs" : "text-bark-600 hover:text-pine-950"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email, số điện thoại…"
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
        {tab === "history" && (
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Lọc theo loại"
            className="h-9 px-2 rounded-box border border-surface-border text-xs bg-white">
            <option value="all">Mọi loại</option>
            {Object.entries(POINT_KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        )}
      </div>

      {tab === "customers" ? (
        <section className={`${card} overflow-x-auto`}>
          {visibleCustomers.length === 0 ? (
            <p className="p-10 text-center text-xs text-bark-500">{search ? "Không tìm thấy khách phù hợp." : "Chưa có khách nào có điểm."}</p>
          ) : (
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3 text-right">Số dư</th>
                  <th className="p-3 text-right">Đã tích</th>
                  <th className="p-3 text-right">Đã dùng</th>
                  <th className="p-3">Thay đổi gần nhất</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {visibleCustomers.map((c) => (
                  <tr key={c.profile.id} className="hover:bg-surface-muted/50">
                    <td className="p-3">
                      <div className="font-bold text-pine-950">{c.profile.full_name || "(Chưa đặt tên)"}</div>
                      <div className="text-[11px] text-bark-500">{c.profile.email}</div>
                    </td>
                    <td className="p-3 text-right font-extrabold text-pine-950 tabular-nums">{c.balance.toLocaleString("vi-VN")}</td>
                    <td className="p-3 text-right tabular-nums text-bark-700">{c.earned.toLocaleString("vi-VN")}</td>
                    <td className="p-3 text-right tabular-nums text-bark-700">{c.redeemed.toLocaleString("vi-VN")}</td>
                    <td className="p-3 text-bark-600">{c.lastAt ? formatDateTime(c.lastAt) : "—"}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => setSelectedId(c.profile.id)} className="font-bold text-pine-900 hover:underline">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className={card}>
          {visibleTxs.length === 0 ? (
            <p className="p-10 text-center text-xs text-bark-500">Không có giao dịch điểm phù hợp.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {visibleTxs.slice(0, 300).map((t) => {
                const p = profileById.get(t.user_id);
                return (
                  <li key={t.id} className="px-4 py-3 flex items-start gap-3 text-xs">
                    <span className={`shrink-0 px-2 py-0.5 rounded-tag border text-[11px] font-bold ${KIND_STYLE[t.kind] || KIND_STYLE.adjust}`}>
                      {POINT_KIND_LABEL[t.kind] || t.kind}
                    </span>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => setSelectedId(t.user_id)} className="font-bold text-pine-950 hover:underline text-left">
                        {p?.full_name || p?.email || "Khách đã xóa"}
                      </button>
                      <p className="text-bark-600 break-words">{t.note}</p>
                      <p className="text-[11px] text-bark-500">{formatDateTime(t.created_at)}</p>
                    </div>
                    <span className={`shrink-0 font-extrabold tabular-nums ${t.points > 0 ? "text-grass-700" : "text-bark-700"}`}>
                      {t.points > 0 ? "+" : ""}
                      {t.points.toLocaleString("vi-VN")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {selected && (
        <CustomerPointsModal
          customer={selected}
          history={txs.filter((t) => t.user_id === selected.profile.id)}
          onClose={() => setSelectedId(null)}
          onAdjusted={(msg) => {
            show(msg);
            load();
          }}
        />
      )}
    </div>
  );
}

function CustomerPointsModal({ customer, history, onClose, onAdjusted }: {
  customer: CustomerPoints;
  history: TxRow[];
  onClose: () => void;
  onAdjusted: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const n = Math.trunc(Number(amount));
    if (!n || n <= 0) return setError("Nhập số điểm lớn hơn 0.");
    if (!note.trim()) return setError("Nhập lý do điều chỉnh (khách sẽ thấy trong thông báo).");
    const delta = mode === "add" ? n : -n;
    if (delta < 0 && customer.balance + delta < 0) return setError(`Khách chỉ còn ${customer.balance} điểm.`);
    setSaving(true);
    setError("");
    const { error: err } = await createClient().rpc("admin_adjust_points", { p_user_id: customer.profile.id, p_points: delta, p_note: note.trim() });
    setSaving(false);
    if (err) {
      return setError(
        err.message.includes("ERR_POINTS_NEGATIVE") ? "Khách không đủ điểm để trừ." : err.message.includes("ERR_FORBIDDEN") ? "Chỉ admin được điều chỉnh điểm." : "Không điều chỉnh được điểm, vui lòng thử lại."
      );
    }
    setAmount("");
    setNote("");
    onAdjusted(`Đã ${delta > 0 ? "cộng" : "trừ"} ${n} điểm cho ${customer.profile.email}.`);
  };

  return (
    <Modal open onClose={onClose} maxWidth="max-w-lg" title={customer.profile.full_name || customer.profile.email}>
      <div className="space-y-4 text-xs">
        <div className="flex items-center gap-3 p-3 rounded-box bg-surface-muted">
          <Coins className="w-5 h-5 text-honey-600" />
          <div className="flex-1">
            <p className="text-bark-500">{customer.profile.email}{customer.profile.phone ? ` · ${customer.profile.phone}` : ""}</p>
            <p className="text-lg font-extrabold text-pine-950 tabular-nums">
              {customer.balance.toLocaleString("vi-VN")} điểm
              <span className="ml-2 text-xs font-semibold text-bark-600">= {formatVND(Math.max(customer.balance, 0) * VND_PER_POINT)}</span>
            </p>
          </div>
        </div>

        <section className="space-y-2 p-3 rounded-box border border-surface-border">
          <h3 className="font-bold text-pine-950">Điều chỉnh điểm</h3>
          <div className="flex flex-wrap gap-2">
            <div role="radiogroup" aria-label="Cộng hoặc trừ" className="inline-flex p-0.5 rounded-box bg-surface-muted border border-surface-border">
              {([
                ["add", "Cộng"],
                ["subtract", "Trừ"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                  className={`h-8 px-3 rounded-[6px] font-semibold ${mode === id ? "bg-surface-card text-pine-950 shadow-xs" : "text-bark-600"}`}>
                  {label}
                </button>
              ))}
            </div>
            <input type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Số điểm"
              aria-label="Số điểm" className="w-28 h-9 px-2 rounded-box border border-surface-border tabular-nums" />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Lý do, ví dụ: Bồi thường giao trễ đơn FPET-…"
            aria-label="Lý do điều chỉnh" className="w-full h-9 px-2 rounded-box border border-surface-border" />
          {error && <p role="alert" className="text-red-700 font-semibold">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-bark-500">Khách nhận thông báo kèm lý do. Không trừ quá số điểm hiện có.</p>
            <Button size="sm" onClick={submit} loading={saving}>{mode === "add" ? "Cộng điểm" : "Trừ điểm"}</Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-pine-950">Lịch sử điểm ({history.length})</h3>
          {history.length === 0 ? (
            <p className="text-bark-500 py-3">Chưa có giao dịch điểm.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-surface-border rounded-box border border-surface-border">
              {history.map((t) => (
                <li key={t.id} className="px-3 py-2 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-pine-950">{POINT_KIND_LABEL[t.kind] || t.kind}</p>
                    <p className="text-bark-600 break-words">
                      {t.note}
                      {t.order_id && (
                        <>
                          {" · "}
                          <Link href={`/admin/orders?q=${encodeURIComponent(t.note?.match(/FPET-\S+/)?.[0] || "")}&type=all`} className="font-semibold text-pine-900 hover:underline">
                            Xem đơn
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-bark-500">{formatDateTime(t.created_at)}</p>
                  </div>
                  <span className={`shrink-0 font-extrabold tabular-nums ${t.points > 0 ? "text-grass-700" : "text-bark-700"}`}>
                    {t.points > 0 ? "+" : ""}
                    {t.points.toLocaleString("vi-VN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border">
      <span className="text-[11px] font-medium text-bark-500 block truncate">{label}</span>
      <span className="block text-base sm:text-xl font-extrabold text-pine-950 font-display truncate mt-1 tabular-nums">{value}</span>
      {note && <span className="block text-[11px] text-bark-500 mt-1">{note}</span>}
    </div>
  );
}
