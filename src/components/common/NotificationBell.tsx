"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/formatters";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// Thông báo web cho khách (nhắc gia hạn gói, gói quá hạn/hết hạn, gia hạn thành công...)
export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, link, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);
    setItems((data as NotificationRow[]) || []);
    // Số trên badge = tổng số chưa đọc, không chỉ trong 15 thông báo gần nhất
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
    setUnreadTotal(count || 0);
  }, [userId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = unreadTotal;

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const newlyRead = items.filter((n) => ids.includes(n.id) && !n.is_read).length;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    setUnreadTotal((c) => Math.max(0, c - newlyRead));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  };

  const handleClick = async (n: NotificationRow) => {
    await markRead([n.id]);
    setOpen(false);
    if (n.link && n.link.startsWith("/")) router.push(n.link);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-box text-bark-700 hover:bg-surface-muted transition-colors"
        title="Thông báo"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      >
        <Bell className="w-5 h-5 text-pine-950" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-honey-600 text-white text-[10px] font-extrabold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(88vw,340px)] max-h-[70vh] overflow-y-auto rounded-container bg-surface-card border border-surface-border shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <span className="text-sm font-bold text-pine-950">Thông báo</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead(items.filter((n) => !n.is_read).map((n) => n.id))}
                className="text-[11px] font-semibold text-pine-800 hover:underline"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-bark-500">Bạn chưa có thông báo nào.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors ${n.is_read ? "" : "bg-pine-50/60"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-honey-600 shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-pine-950">{n.title}</div>
                        <p className="text-[11px] text-bark-600 leading-relaxed mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-bark-400">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/my-account/notifications" onClick={() => setOpen(false)} className="block px-4 py-3 text-center text-xs font-bold text-pine-900 border-t border-surface-border hover:bg-surface-muted">
            Xem tất cả thông báo
          </Link>
        </div>
      )}
    </div>
  );
}
