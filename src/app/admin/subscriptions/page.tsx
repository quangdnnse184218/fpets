"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { expireUnpaidOrders } from "@/lib/myOrders";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Pause, Play, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatVND } from "@/lib/formatters";
import { deliveryWindowLabel, DeliverySchedule } from "@/lib/deliverySchedule";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { textMatches } from "@/lib/search";

type SubStatus = "cho_thanh_toan" | "dang_hoat_dong" | "tam_dung" | "qua_han" | "het_han" | "da_huy";

const STATUS_LABEL: Record<SubStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  dang_hoat_dong: "Đang hoạt động",
  tam_dung: "Tạm dừng",
  qua_han: "Hết hộp, chờ gia hạn",
  het_han: "Đã kết thúc",
  da_huy: "Đã hủy",
};

const STATUS_STYLE: Record<SubStatus, string> = {
  dang_hoat_dong: "bg-grass-50 text-grass-700 border-grass-200",
  tam_dung: "bg-honey-50 text-honey-700 border-honey-200",
  qua_han: "bg-amber-50 text-amber-800 border-amber-200",
  het_han: "bg-surface-muted text-bark-600 border-surface-border",
  da_huy: "bg-red-50 text-red-700 border-red-200",
  cho_thanh_toan: "bg-surface-muted text-bark-600 border-surface-border",
};

const ERROR_TEXT: Record<string, string> = {
  ERR_PAST_CUTOFF: "Đã qua ngày chốt của kỳ này nên không tạm dừng được; hộp kỳ này vẫn được giao.",
  ERR_NOTHING_TO_PAUSE: "Gói đã giao hết số hộp trả trước và đang chờ gia hạn, không còn kỳ nào để tạm dừng.",
  ERR_INVALID_STATUS_FOR_PAUSE: "Chỉ tạm dừng được gói đang hoạt động.",
  ERR_INVALID_STATUS_FOR_RESUME: "Gói không ở trạng thái tạm dừng.",
  ERR_INVALID_STATUS_FOR_CANCEL: "Gói này không hủy được ở trạng thái hiện tại.",
  ERR_NOT_FOUND_OR_FORBIDDEN: "Không tìm thấy gói hoặc không có quyền thao tác.",
};

interface SubRow {
  id: string;
  user_id: string;
  subscription_code: string;
  status: SubStatus;
  total_cycles: number;
  remaining_cycles: number;
  current_cycle: number;
  next_delivery_date: string;
  cutoff_date: string;
  delivery_schedule: DeliverySchedule;
  total_prepaid_amount: number;
  cancellation_reason: string | null;
  created_at: string;
  shipping_address_snapshot: { phone?: string; recipient_name?: string } | null;
  pets: { name: string; breed: string | null } | null;
  profiles: { full_name: string | null; phone: string | null; email: string } | null;
  box_types: { name: string } | null;
  subscription_plans: { name: string } | null;
}

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "dang_hoat_dong", label: "Đang hoạt động" },
  { id: "cutoff", label: "Chốt trong 7 ngày" },
  { id: "tam_dung", label: "Tạm dừng" },
  { id: "qua_han", label: "Chờ gia hạn" },
  { id: "da_huy", label: "Đã hủy" },
  { id: "het_han", label: "Đã kết thúc" },
];

// SĐT liên hệ: ưu tiên SĐT nhận hàng của gói (hồ sơ khách có thể chưa nhập SĐT)
const contactPhone = (s: SubRow) => s.shipping_address_snapshot?.phone || s.profiles?.phone || "Chưa có SĐT";

const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const plusDaysIso = (days: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(Date.now() + days * 86400000));

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-bark-500">Đang tải gói định kỳ…</div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}

function SubscriptionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { show } = useToast();

  const filter = FILTERS.some((f) => f.id === (searchParams.get("filter") || searchParams.get("status")))
    ? (searchParams.get("filter") || searchParams.get("status"))!
    : "all";
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<SubRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    await expireUnpaidOrders();
    setLoading(true);
    const { data } = await createClient()
      .from("subscriptions")
      .select(
        "id, user_id, subscription_code, status, total_cycles, remaining_cycles, current_cycle, next_delivery_date, cutoff_date, delivery_schedule, total_prepaid_amount, cancellation_reason, created_at, shipping_address_snapshot, pets(name, breed), profiles(full_name, phone, email), box_types(name), subscription_plans(name)"
      )
      .order("created_at", { ascending: false });
    setSubs((data as unknown as SubRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    if (id === "all") params.delete("filter");
    else params.set("filter", id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Báo cho khách khi admin thao tác hộ trên gói của họ
  const notifyCustomer = async (sub: SubRow, title: string, message: string) => {
    await createClient().from("notifications").insert({ user_id: sub.user_id, title, message, type: "subscription", link: "/my-account/subscriptions" });
  };

  const runAction = async (sub: SubRow, action: () => PromiseLike<{ error: { message: string } | null }>, success: string, notify?: [string, string]) => {
    setBusyId(sub.id);
    const { error } = await action();
    setBusyId(null);
    if (error) {
      const key = Object.keys(ERROR_TEXT).find((k) => error.message.includes(k));
      show(key ? ERROR_TEXT[key] : "Không thực hiện được thao tác, vui lòng thử lại.", { tone: "error" });
      return false;
    }
    if (notify) await notifyCustomer(sub, notify[0], notify[1]);
    show(success);
    load();
    return true;
  };

  const pause = (sub: SubRow) =>
    runAction(sub, () => createClient().rpc("pause_subscription", { p_subscription_id: sub.id, p_cycles: 1 }), `Đã tạm dừng 1 kỳ cho gói ${sub.subscription_code}.`, [
      `Gói ${sub.subscription_code} đã tạm dừng 1 kỳ`,
      "FPETS đã tạm dừng gói theo yêu cầu của bạn. Lịch giao mới có trong mục Gói định kỳ.",
    ]);

  const resume = (sub: SubRow) =>
    runAction(sub, () => createClient().rpc("resume_subscription", { p_subscription_id: sub.id }), `Gói ${sub.subscription_code} đã hoạt động lại.`, [
      `Gói ${sub.subscription_code} đã tiếp tục`,
      "FPETS đã mở lại gói theo yêu cầu của bạn. Lịch giao có trong mục Gói định kỳ.",
    ]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    if (!cancelReason.trim()) {
      show("Vui lòng nhập lý do hủy để gửi cho khách.", { tone: "error" });
      return;
    }
    const ok = await runAction(
      cancelling,
      () => createClient().rpc("cancel_subscription", { p_subscription_id: cancelling.id, p_reason: cancelReason.trim() }),
      `Đã hủy gói ${cancelling.subscription_code}.`,
      [`Gói ${cancelling.subscription_code} đã được hủy`, `Lý do: ${cancelReason.trim()}. Các hộp bạn đã trả trước vẫn được giao đủ theo lịch.`]
    );
    if (ok) {
      setCancelling(null);
      setCancelReason("");
    }
  };

  const today = todayIso();
  const in7 = plusDaysIso(7);
  const filtered = subs.filter((s) => {
    const matchFilter =
      filter === "all" ||
      (filter === "cutoff" ? s.status === "dang_hoat_dong" && s.remaining_cycles > 0 && s.cutoff_date >= today && s.cutoff_date <= in7 : s.status === filter);
    const matchSearch = textMatches([s.subscription_code, s.profiles?.full_name, contactPhone(s), s.pets?.name], search);
    return matchFilter && matchSearch;
  });

  const countOf = (id: string) =>
    id === "all"
      ? subs.length
      : id === "cutoff"
        ? subs.filter((s) => s.status === "dang_hoat_dong" && s.remaining_cycles > 0 && s.cutoff_date >= today && s.cutoff_date <= in7).length
        : subs.filter((s) => s.status === id).length;

  const actions = (sub: SubRow) => (
    <div className="flex flex-wrap gap-1.5">
      {sub.status === "dang_hoat_dong" && (
        <Button size="sm" variant="secondary" loading={busyId === sub.id} onClick={() => pause(sub)}>
          <Pause className="w-3.5 h-3.5" /> Tạm dừng 1 kỳ
        </Button>
      )}
      {sub.status === "tam_dung" && (
        <Button size="sm" variant="secondary" loading={busyId === sub.id} onClick={() => resume(sub)}>
          <Play className="w-3.5 h-3.5" /> Tiếp tục
        </Button>
      )}
      {["dang_hoat_dong", "tam_dung", "qua_han"].includes(sub.status) && (
        <Button size="sm" variant="secondary" disabled={busyId === sub.id} onClick={() => setCancelling(sub)} className="!text-red-700">
          <XCircle className="w-3.5 h-3.5" /> Hủy gói
        </Button>
      )}
    </div>
  );

  const progress = (sub: SubRow) => {
    const prepared = sub.total_cycles - sub.remaining_cycles;
    return (
      <div className="space-y-1">
        <span className="text-xs font-semibold text-pine-950">Đã chuẩn bị {prepared}/{sub.total_cycles} hộp</span>
        <div className="w-28 bg-surface-muted h-1.5 rounded-full overflow-hidden">
          <div className="bg-grass-600 h-full rounded-full" style={{ width: `${(prepared / sub.total_cycles) * 100}%` }} />
        </div>
      </div>
    );
  };

  const nextDelivery = (sub: SubRow) =>
    ["dang_hoat_dong", "tam_dung"].includes(sub.status) && sub.remaining_cycles > 0 ? (
      <>
        <div className="font-semibold text-bark-900">{deliveryWindowLabel(sub.next_delivery_date, sub.delivery_schedule)}</div>
        <div className="text-[11px] text-bark-500">Chốt hộp {formatDate(sub.cutoff_date)}</div>
      </>
    ) : sub.status === "dang_hoat_dong" && sub.remaining_cycles === 0 ? (
      // Đã giao hết hộp trả trước, chờ khách gia hạn tới ngày chốt của kỳ kế tiếp
      <>
        <div className="font-semibold text-bark-900">Chờ gia hạn</div>
        <div className="text-[11px] text-bark-500">Hạn {formatDate(sub.cutoff_date)}</div>
      </>
    ) : (
      <span className="text-bark-500">–</span>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-pine-950 font-display">Gói định kỳ</h1>
        <p className="text-xs text-bark-500">Theo dõi lịch giao từng kỳ, ngày chốt hộp; tạm dừng hoặc hủy gói theo yêu cầu của khách.</p>
      </div>

      <div className="p-3.5 sm:p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Mã gói, tên khách, SĐT, tên bé"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm gói định kỳ"
            className="w-full h-10 pl-9 pr-3 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.id ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-700 hover:bg-surface-muted"
              }`}
            >
              {f.label}
              <span className={`text-[10px] font-extrabold ${filter === f.id ? "text-pine-100" : "text-bark-500"}`}>{countOf(f.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-bark-500">Đang tải gói định kỳ…</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">Không có gói nào phù hợp.</div>
      ) : (
        <>
          <ul className="lg:hidden space-y-2.5">
            {filtered.map((sub) => (
              <li key={sub.id} className="p-3.5 rounded-container bg-surface-card border border-surface-border space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-pine-950">{sub.subscription_code}</span>
                  <span className={`px-2 py-0.5 rounded-tag border text-[11px] font-bold ${STATUS_STYLE[sub.status]}`}>{STATUS_LABEL[sub.status]}</span>
                </div>
                <div>
                  <p className="font-bold text-pine-950">{sub.profiles?.full_name || sub.profiles?.email} · {contactPhone(sub)}</p>
                  <p className="text-bark-600">
                    Bé {sub.pets?.name} · {sub.box_types?.name} · {sub.subscription_plans?.name} · {formatVND(sub.total_prepaid_amount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {progress(sub)}
                  <div>{nextDelivery(sub)}</div>
                </div>
                {sub.status === "da_huy" && sub.cancellation_reason && <p className="text-bark-500">Lý do hủy: {sub.cancellation_reason}</p>}
                {actions(sub)}
              </li>
            ))}
          </ul>

          <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="p-3">Gói</th>
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3">Hộp</th>
                  <th className="p-3">Tiến độ</th>
                  <th className="p-3">Lần giao tới</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-bark-700 align-top">
                {filtered.map((sub) => (
                  <tr key={sub.id}>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-pine-950">{sub.subscription_code}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-tag border text-[11px] font-bold ${STATUS_STYLE[sub.status]}`}>{STATUS_LABEL[sub.status]}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-pine-950">{sub.profiles?.full_name || sub.profiles?.email}</div>
                      <div className="text-[11px] text-bark-500">{contactPhone(sub)} · bé {sub.pets?.name}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-bark-900">{sub.box_types?.name}</div>
                      <div className="text-[11px] text-bark-500">{sub.subscription_plans?.name} · {formatVND(sub.total_prepaid_amount)}</div>
                      {sub.status === "da_huy" && sub.cancellation_reason && <div className="text-[11px] text-bark-500 mt-0.5">Lý do hủy: {sub.cancellation_reason}</div>}
                    </td>
                    <td className="p-3">{progress(sub)}</td>
                    <td className="p-3 whitespace-nowrap">{nextDelivery(sub)}</td>
                    <td className="p-3">{actions(sub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!cancelling}
        title={`Hủy gói ${cancelling?.subscription_code || ""}`}
        message="Gói ngừng nhắc gia hạn. Các hộp khách đã trả trước vẫn được giao đủ theo lịch, không hoàn tiền. Khách nhận thông báo kèm lý do."
        confirmLabel="Hủy gói"
        loading={!!cancelling && busyId === cancelling.id}
        onClose={() => {
          setCancelling(null);
          setCancelReason("");
        }}
        onConfirm={confirmCancel}
      >
        <label className="block text-xs font-semibold text-bark-700">
          Lý do hủy (bắt buộc)
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ví dụ: Khách chuyển nhà ra nước ngoài"
            className="mt-1 w-full h-10 px-3 rounded-box border border-surface-border text-sm font-normal"
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
