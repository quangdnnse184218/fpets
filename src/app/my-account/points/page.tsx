"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { POINT_KIND_LABEL, POINTS_RULE, VND_PER_POINT } from "@/lib/points";

interface PointRow {
  id: string;
  kind: string;
  points: number;
  note: string | null;
  order_id: string | null;
  created_at: string;
}

export default function PointsPage() {
  const { user } = useApp();
  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows] = useState<PointRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.id) return;
    const supabase = createClient();
    Promise.all([
      supabase.rpc("my_points"),
      supabase
        .from("point_transactions")
        .select("id, kind, points, note, order_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]).then(([b, list]) => {
      setBalance(Number(b.data) || 0);
      setRows((list.data as PointRow[]) || []);
      setLoading(false);
    });
  }, [user.id]);

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-container bg-surface-card border border-surface-border flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center shrink-0">
          <Coins className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-bark-500">Điểm hiện có</p>
          {balance === null ? (
            <span className="block h-8 w-28 mt-1 rounded bg-surface-muted animate-pulse" aria-hidden="true" />
          ) : (
            <p className="text-2xl font-extrabold text-pine-950 tabular-nums">
              {balance.toLocaleString("vi-VN")} điểm
              <span className="ml-2 text-sm font-semibold text-bark-600">= {formatVND(Math.max(balance, 0) * VND_PER_POINT)}</span>
            </p>
          )}
        </div>
        <Link href="/shop" className="text-xs font-bold text-pine-900 hover:underline">Dùng điểm khi mua hàng</Link>
      </div>

      <p className="text-xs text-bark-600 leading-relaxed">
        {POINTS_RULE} Điểm dùng ở bước thanh toán, trừ vào tiền hàng (không trừ phí ship). Đơn bị hủy thì điểm đã dùng được trả lại.
      </p>

      <section className="rounded-container bg-surface-card border border-surface-border">
        <h2 className="px-4 py-3 border-b border-surface-border text-sm font-bold text-pine-950">Lịch sử điểm</h2>
        {loading ? (
          <p className="px-4 py-8 text-center text-xs text-bark-500">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-bark-500">Chưa có điểm nào. Điểm được cộng khi đơn hàng giao thành công.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-pine-950">{POINT_KIND_LABEL[r.kind] || r.kind}</p>
                  <p className="text-xs text-bark-600">
                    {r.note}
                    {r.order_id && (
                      <>
                        {" · "}
                        <Link href={`/my-account/orders/${r.order_id}`} className="font-semibold text-pine-900 hover:underline">Xem đơn</Link>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-bark-500 mt-0.5">{formatDateTime(r.created_at)}</p>
                </div>
                <span className={`shrink-0 font-extrabold tabular-nums ${r.points > 0 ? "text-grass-700" : "text-bark-700"}`}>
                  {r.points > 0 ? "+" : ""}
                  {r.points.toLocaleString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
