"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone, RotateCcw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";

interface FeedbackRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: "new" | "handled";
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
}

type Filter = "new" | "handled" | "all";

const waitingDays = (createdAt: string) => Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));

const FILTER_LABEL: Record<Filter, string> = { new: "Chưa xử lý", handled: "Đã xử lý", all: "Tất cả" };

// Hộp thư góp ý / liên hệ gửi từ trang Liên hệ
export default function FeedbackInbox({ onCountChange }: { onCountChange?: (newCount: number) => void }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("new");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await createClient()
      .from("feedback_messages")
      .select("id, full_name, phone, email, subject, message, status, admin_note, handled_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (data as FeedbackRow[]) || [];
    setRows(list);
    onCountChange?.(list.filter((r) => r.status === "new").length);
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (row: FeedbackRow, status: FeedbackRow["status"]) => {
    setSavingId(row.id);
    const note = notes[row.id] ?? row.admin_note ?? "";
    await createClient()
      .from("feedback_messages")
      .update({ status, admin_note: note.trim() || null, handled_at: status === "handled" ? new Date().toISOString() : null })
      .eq("id", row.id);
    setSavingId(null);
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q || [r.full_name, r.phone, r.email || "", r.subject, r.message].some((v) => v.toLowerCase().includes(q)))
  );

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 rounded-box font-semibold transition-colors ${filter === f ? "bg-pine-900 text-white" : "bg-surface-muted text-bark-700 hover:bg-bark-200"}`}
            >
              {FILTER_LABEL[f]} ({f === "all" ? rows.length : rows.filter((r) => r.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-bark-500">Đang tải góp ý...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
          {filter === "new" ? "Không có góp ý nào đang chờ xử lý." : "Không có góp ý phù hợp."}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => (
            <li
              key={row.id}
              className={`p-4 rounded-container bg-surface-card border border-surface-border space-y-3 text-xs ${
                row.status === "new" ? `border-l-4 ${waitingDays(row.created_at) >= 3 ? "border-l-red-500" : waitingDays(row.created_at) >= 1 ? "border-l-amber-500" : "border-l-honey-400"}` : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-pine-950 text-sm">{row.subject}</p>
                  <p className="text-bark-500 mt-0.5">
                    {row.full_name} · {formatDateTime(row.created_at)}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-tag text-[10px] font-bold ${row.status === "new" ? "bg-honey-100 text-bark-800" : "bg-grass-100 text-grass-800"}`}
                >
                  {row.status === "new"
                    ? `Chưa xử lý · ${waitingDays(row.created_at) === 0 ? "mới hôm nay" : `chờ ${waitingDays(row.created_at)} ngày`}`
                    : `Đã xử lý ${row.handled_at ? formatDateTime(row.handled_at) : ""}`}
                </span>
              </div>

              <p className="text-bark-800 leading-relaxed whitespace-pre-line">{row.message}</p>

              <div className="flex flex-wrap gap-3 text-bark-600">
                <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 font-semibold text-pine-900 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {row.phone}
                </a>
                {row.email && (
                  <a href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`} className="inline-flex items-center gap-1 font-semibold text-pine-900 hover:underline">
                    <Mail className="w-3.5 h-3.5" /> {row.email}
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-2 border-t border-surface-border">
                <label className="flex-1">
                  <span className="text-[11px] font-semibold text-bark-600 block mb-1">Ghi chú nội bộ</span>
                  <input
                    type="text"
                    value={notes[row.id] ?? row.admin_note ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder="Ví dụ: Đã gọi lại, khách đổi sang gói 3 hộp"
                    className="w-full min-h-9 px-3 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
                  />
                </label>
                {row.status === "new" ? (
                  <Button size="sm" loading={savingId === row.id} onClick={() => setStatus(row, "handled")}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đánh dấu đã xử lý
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" loading={savingId === row.id} onClick={() => setStatus(row, "new")}>
                    <RotateCcw className="w-3.5 h-3.5" /> Mở lại
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
