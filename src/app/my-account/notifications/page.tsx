"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useApp();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(async () => {
    if (!user.id) return;
    const { data } = await createClient()
      .from("notifications")
      .select("id, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as NotificationRow[]) || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await createClient().from("notifications").update({ is_read: true }).in("id", ids);
  };

  const open = async (n: NotificationRow) => {
    await markRead([n.id]);
    if (n.link?.startsWith("/")) router.push(n.link);
  };

  const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
  const visible = onlyUnread ? items.filter((n) => !n.is_read) : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOnlyUnread((v) => !v)} aria-pressed={onlyUnread}>
            {onlyUnread ? "Hiện tất cả" : `Chưa đọc (${unreadIds.length})`}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => markRead(unreadIds)} disabled={unreadIds.length === 0}>
            Đánh dấu đã đọc hết
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-40 rounded-container bg-surface-muted animate-pulse" />
      ) : visible.length === 0 ? (
        <div className="p-10 text-center rounded-container bg-surface-card border border-surface-border text-sm text-bark-600">
          <Bell className="w-8 h-8 mx-auto mb-2 text-bark-300" />
          {onlyUnread ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo nào."}
        </div>
      ) : (
        <ul className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border overflow-hidden">
          {visible.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={`w-full text-left px-4 py-3.5 flex gap-3 hover:bg-surface-muted transition-colors ${n.is_read ? "" : "bg-pine-50/60"}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? "bg-transparent" : "bg-honey-600"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className={`block text-sm ${n.is_read ? "font-semibold text-bark-800" : "font-bold text-pine-950"}`}>
                    {n.title}
                    {!n.is_read && <span className="sr-only"> (chưa đọc)</span>}
                  </span>
                  <span className="block text-xs text-bark-600 mt-0.5 leading-relaxed">{n.message}</span>
                  <span className="block text-[11px] text-bark-400 mt-1">{formatDateTime(n.created_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
