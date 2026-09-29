"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, CreditCard, MapPin, Pause, Play, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDate } from "@/lib/formatters";
import { fetchPlanOptions } from "@/lib/catalog";
import { SubscriptionPlan } from "@/types/models";
import { DeliverySchedule, SCHEDULE_LABEL, deliveryWindowLabel } from "@/lib/deliverySchedule";
import { ORDER_STATUS_LABEL, OrderStatus } from "@/lib/orderDisplay";
import AddressFields, { AddressValue, emptyAddress, formatAddress } from "@/components/common/AddressFields";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type SubStatus = "cho_thanh_toan" | "dang_hoat_dong" | "tam_dung" | "qua_han" | "het_han" | "da_huy";

const STATUS_LABEL: Record<SubStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  dang_hoat_dong: "Đang hoạt động",
  tam_dung: "Tạm dừng",
  qua_han: "Quá hạn",
  het_han: "Hết hạn",
  da_huy: "Đã hủy",
};
const STATUS_STYLE: Record<SubStatus, string> = {
  cho_thanh_toan: "bg-surface-muted text-bark-700",
  dang_hoat_dong: "bg-grass-100 text-grass-800",
  tam_dung: "bg-amber-100 text-amber-800",
  qua_han: "bg-amber-100 text-amber-800",
  het_han: "bg-bark-200 text-bark-700",
  da_huy: "bg-bark-200 text-bark-700",
};

const CANCEL_REASONS = ["Bé không hợp với các món", "Chi phí chưa phù hợp", "Tôi muốn tự chọn đồ cho bé", "Bé đã có đủ đồ dùng", "Khác"];
const MAX_PAUSE_CYCLES = 2;

interface SnapshotAddress {
  recipient_name?: string;
  phone?: string;
  province_city?: string;
  ward?: string;
  address?: string;
}

interface SubscriptionRow {
  id: string;
  subscription_code: string;
  status: SubStatus;
  total_cycles: number;
  remaining_cycles: number;
  current_cycle: number;
  next_delivery_date: string;
  cutoff_date: string;
  delivery_schedule: DeliverySchedule;
  total_prepaid_amount: number;
  grace_period_expires_at: string | null;
  shipping_address_snapshot: SnapshotAddress | null;
  pets: { name: string } | null;
  box_types: { name: string; baseprice: number } | null;
  subscription_plans: { name: string } | null;
}

interface SubOrder {
  id: string;
  order_code: string;
  order_type: string;
  cycle_index: number | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  payment_expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  subscription_id: string;
}

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - todayStart().getTime()) / 86400000);
const addMonths = (date: string, n: number) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
};
const snapshotToAddress = (s: SnapshotAddress | null): AddressValue => ({
  recipientName: s?.recipient_name || "",
  phone: s?.phone || "",
  province: s?.province_city || "",
  ward: s?.ward || "",
  street: s?.address || "",
});

// Gia hạn được khi còn hộp cuối hoặc đang trong 5 ngày quá hạn (khớp renew_subscription)
const canRenew = (sub: SubscriptionRow) =>
  (sub.status === "dang_hoat_dong" && sub.remaining_cycles <= 1) ||
  (sub.status === "qua_han" && !!sub.grace_period_expires_at && new Date(sub.grace_period_expires_at) >= new Date());

export default function MySubscriptionsPage() {
  const router = useRouter();
  const { show } = useToast();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [orders, setOrders] = useState<SubOrder[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [pauseSub, setPauseSub] = useState<SubscriptionRow | null>(null);
  const [cancelSub, setCancelSub] = useState<SubscriptionRow | null>(null);
  const [renewSub, setRenewSub] = useState<SubscriptionRow | null>(null);
  const [editSub, setEditSub] = useState<SubscriptionRow | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: subData }, { data: orderData }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, subscription_code, status, total_cycles, remaining_cycles, current_cycle, next_delivery_date, cutoff_date, delivery_schedule, total_prepaid_amount, grace_period_expires_at, shipping_address_snapshot, pets(name), box_types(name, baseprice), subscription_plans(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, order_code, order_type, cycle_index, status, total_amount, payment_method, payment_status, payment_expires_at, paid_at, created_at, updated_at, subscription_id")
        .not("subscription_id", "is", null)
        .order("created_at", { ascending: true }),
    ]);
    setSubs((subData as unknown as SubscriptionRow[]) || []);
    setOrders((orderData as unknown as SubOrder[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetchPlanOptions().then(setPlans);
  }, [load]);

  const resume = async (sub: SubscriptionRow) => {
    setResuming(sub.id);
    const { error } = await createClient().rpc("resume_subscription", { p_subscription_id: sub.id });
    setResuming(null);
    if (error) return show("Không tiếp tục được gói, vui lòng thử lại.", { tone: "error" });
    show("Gói đã hoạt động trở lại");
    load();
  };

  if (loading) {
    return <div className="h-72 rounded-container bg-surface-muted animate-pulse" aria-busy="true" />;
  }

  if (subs.length === 0) {
    return (
      <div className="p-8 rounded-container bg-surface-card border border-surface-border text-center space-y-3">
        <CalendarClock className="w-10 h-10 mx-auto text-pine-800" />
        <h2 className="text-base font-bold text-pine-950">Bạn chưa có gói định kỳ</h2>
        <p className="text-sm text-bark-600 max-w-md mx-auto">
          Trả trước 3 hoặc 6 hộp, mỗi tháng bé nhận 1 hộp chọn riêng theo hồ sơ. Giảm đến 15%, miễn phí ship, tạm dừng hoặc hủy bất kỳ lúc nào.
        </p>
        <ButtonLink href="/subscription">Chọn gói cho bé</ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-pine-950">Gói định kỳ</h2>
        <p className="text-xs text-bark-500">Theo dõi lịch giao, tạm dừng, đổi địa chỉ hoặc gia hạn gói.</p>
      </div>

      {subs.map((sub) => {
        const subOrders = orders.filter((o) => o.subscription_id === sub.id);
        const pending = subOrders.find(
          (o) => (o.order_type === "subscription_initial" || o.order_type === "subscription_renewal") && o.status === "cho_thanh_toan" && o.payment_expires_at && new Date(o.payment_expires_at) > new Date()
        );
        const payments = subOrders.filter((o) => (o.order_type === "subscription_initial" || o.order_type === "subscription_renewal") && o.payment_status === "paid");
        const isActive = sub.status === "dang_hoat_dong";
        const isPaused = sub.status === "tam_dung";
        const pastCutoff = daysUntil(sub.cutoff_date) < 0;
        const renewable = canRenew(sub);
        // Nút gia hạn chỉ thành nút chính khi đã quá hạn hoặc còn ≤7 ngày tới ngày chốt hộp cuối
        const renewUrgent = renewable && (sub.status === "qua_han" || daysUntil(sub.cutoff_date) <= 7);
        const addr = snapshotToAddress(sub.shipping_address_snapshot);

        return (
          <article key={sub.id} className="p-5 rounded-container bg-surface-card border border-surface-border space-y-5 shadow-xs">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-pine-950">{sub.subscription_code}</span>
                  <span className={`px-2 py-0.5 rounded-tag text-[11px] font-bold ${STATUS_STYLE[sub.status]}`}>{STATUS_LABEL[sub.status]}</span>
                </div>
                <p className="text-sm text-bark-700 mt-1">
                  {sub.box_types?.name} · {sub.subscription_plans?.name} · bé <strong>{sub.pets?.name}</strong>
                </p>
              </div>
              <div className="text-right text-xs text-bark-500">
                Đã trả trước
                <span className="block text-base font-extrabold text-pine-950">{formatVND(sub.total_prepaid_amount)}</span>
              </div>
            </header>

            {/* Tiến độ: mỗi kỳ ghi ngày, kỳ đã có đơn bấm được để xem đơn */}
            <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${sub.total_cycles}, minmax(0, 1fr))` }}>
              {Array.from({ length: sub.total_cycles }, (_, i) => {
                const idx = i + 1;
                const order = subOrders.find((o) => o.order_type === "subscription_cycle" && o.cycle_index === idx);
                const delivered = order?.status === "da_giao";
                const estDate = addMonths(sub.next_delivery_date, idx - sub.current_cycle);
                const label = delivered ? formatDate(order!.updated_at) : order ? ORDER_STATUS_LABEL[order.status] : formatDate(estDate);
                const bar = (
                  <>
                    <span className={`block h-2 rounded-full ${delivered ? "bg-grass-600" : order ? "bg-pine-700" : "bg-surface-border"}`} />
                    <span className="block mt-1 text-[10px] text-bark-600 leading-tight">
                      Kỳ {idx} {delivered && <Check className="inline w-3 h-3 text-grass-700" />}
                      <span className="block text-bark-500">{label}</span>
                    </span>
                  </>
                );
                return (
                  <li key={idx} className="text-center">
                    {order ? <Link href={`/my-account/orders/${order.id}`} className="block hover:opacity-80" aria-label={`Xem đơn kỳ ${idx}`}>{bar}</Link> : bar}
                  </li>
                );
              })}
            </ol>

            {(isActive || isPaused) && sub.remaining_cycles > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-box bg-surface-muted/60 border border-surface-border">
                  <span className="text-bark-500 block">Hộp tiếp theo ({SCHEDULE_LABEL[sub.delivery_schedule].toLowerCase()})</span>
                  <strong className="text-pine-950 text-sm">{deliveryWindowLabel(sub.next_delivery_date, sub.delivery_schedule)}</strong>
                </div>
                <div className="p-3 rounded-box bg-surface-muted/60 border border-surface-border">
                  <span className="text-bark-500 block">Ngày chốt hộp kỳ này</span>
                  <strong className="text-pine-950 text-sm">{formatDate(sub.cutoff_date)}</strong>
                  {!pastCutoff && (
                    <Link href="/my-account/pets" className="block mt-0.5 text-pine-900 font-semibold hover:underline">
                      Cập nhật sở thích của bé trước {formatDate(sub.cutoff_date)}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {sub.status === "qua_han" && sub.grace_period_expires_at && (
              <p className="p-3 rounded-box bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Gói đã giao hết hộp. Gia hạn trước <strong>{formatDate(sub.grace_period_expires_at)}</strong> để giữ ưu đãi và lịch giao cho bé.
              </p>
            )}
            {sub.status === "da_huy" && sub.remaining_cycles > 0 && (
              <p className="p-3 rounded-box bg-surface-muted border border-surface-border text-bark-700 text-xs">
                Gói đã hủy. FPETS vẫn giao nốt <strong>{sub.remaining_cycles} hộp</strong> bạn đã trả trước.
              </p>
            )}

            {(isActive || isPaused) && addr.street && (
              <p className="flex items-start gap-2 text-xs text-bark-600">
                <MapPin className="w-4 h-4 shrink-0 text-pine-800" />
                <span>Giao tới {addr.recipientName} · {addr.phone} · {formatAddress(addr)}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-border">
              {pending && (
                <ButtonLink href={`/checkout/pay/${pending.id}?code=${pending.order_code}&amount=${pending.total_amount}&method=${pending.payment_method}&sub=1`}>
                  <CreditCard className="w-4 h-4" /> Thanh toán tiếp {formatVND(pending.total_amount)}
                </ButtonLink>
              )}
              {renewable && (
                <Button variant={renewUrgent ? "primary" : "secondary"} onClick={() => setRenewSub(sub)}>
                  <RefreshCw className="w-4 h-4" /> {pending ? "Chọn lại gói gia hạn" : "Gia hạn gói"}
                </Button>
              )}
              {isActive && (
                <Button variant="secondary" onClick={() => setPauseSub(sub)}>
                  <Pause className="w-4 h-4" /> Tạm dừng
                </Button>
              )}
              {isPaused && (
                <Button onClick={() => resume(sub)} loading={resuming === sub.id}>
                  <Play className="w-4 h-4" /> Tiếp tục ngay
                </Button>
              )}
              {(isActive || isPaused) && (
                <Button variant="secondary" onClick={() => setEditSub(sub)}>
                  <CalendarClock className="w-4 h-4" /> Đổi đợt giao / địa chỉ
                </Button>
              )}
              {(isActive || isPaused) && (
                <Button variant="danger" className="sm:ml-auto" onClick={() => setCancelSub(sub)}>
                  Hủy gói
                </Button>
              )}
            </div>

            {payments.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer min-h-10 flex items-center font-bold text-pine-900">Lịch sử thanh toán ({payments.length})</summary>
                <ul className="mt-1 divide-y divide-surface-border rounded-box border border-surface-border">
                  {payments.map((p) => (
                    <li key={p.id}>
                      <Link href={`/my-account/orders/${p.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-surface-muted">
                        <span>
                          <span className="font-mono font-semibold text-pine-950">{p.order_code}</span>
                          <span className="text-bark-500"> · {p.order_type === "subscription_renewal" ? "Gia hạn" : "Đăng ký"} · {formatDate(p.paid_at || p.created_at)}</span>
                        </span>
                        <span className="font-bold text-pine-950">{formatVND(p.total_amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        );
      })}

      {pauseSub && <PauseModal sub={pauseSub} onClose={() => setPauseSub(null)} onDone={(msg) => { setPauseSub(null); show(msg); load(); }} />}
      {cancelSub && (
        <CancelModal
          sub={cancelSub}
          onClose={() => setCancelSub(null)}
          onPauseInstead={() => { const s = cancelSub; setCancelSub(null); setPauseSub(s); }}
          onDone={(msg) => { setCancelSub(null); show(msg); load(); }}
        />
      )}
      {editSub && <DeliveryModal sub={editSub} onClose={() => setEditSub(null)} onDone={(msg) => { setEditSub(null); show(msg); load(); }} />}
      {renewSub && (
        <RenewModal
          sub={renewSub}
          plans={plans}
          onClose={() => setRenewSub(null)}
          onCreated={(url) => router.push(url)}
          onError={(msg) => { setRenewSub(null); show(msg, { tone: "error" }); }}
        />
      )}
    </div>
  );
}

function PauseModal({ sub, onClose, onDone }: { sub: SubscriptionRow; onClose: () => void; onDone: (msg: string) => void }) {
  const [cycles, setCycles] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pastCutoff = daysUntil(sub.cutoff_date) < 0;
  const newDate = addMonths(sub.next_delivery_date, cycles);

  const submit = async () => {
    setSaving(true);
    const { error: err } = await createClient().rpc("pause_subscription", { p_subscription_id: sub.id, p_cycles: cycles });
    setSaving(false);
    if (err) {
      setError(err.message.includes("ERR_PAST_CUTOFF") ? "Đã qua ngày chốt, hộp kỳ này vẫn được giao." : "Không tạm dừng được gói, vui lòng thử lại.");
      return;
    }
    onDone(`Đã tạm dừng ${cycles} kỳ. Hộp tiếp theo giao ${deliveryWindowLabel(newDate, sub.delivery_schedule)}.`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Tạm dừng gói"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Để sau</Button>
          <Button onClick={submit} loading={saving} disabled={pastCutoff}>Xác nhận tạm dừng</Button>
        </>
      }
    >
      {pastCutoff ? (
        <p className="text-sm text-bark-700">
          Đã qua ngày chốt ({formatDate(sub.cutoff_date)}), hộp kỳ này đang được chuẩn bị nên không thể tạm dừng. Bạn có thể tạm dừng từ kỳ sau.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-bark-700">Bỏ qua tối đa {MAX_PAUSE_CYCLES} kỳ giao liên tiếp. Hộp đã trả trước được giữ nguyên và dời sang các tháng sau.</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: MAX_PAUSE_CYCLES }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setCycles(n)} aria-pressed={cycles === n}
                className={`min-h-11 rounded-box border text-sm font-bold ${cycles === n ? "border-pine-900 bg-pine-50 text-pine-950" : "border-surface-border text-bark-700"}`}>
                {cycles === n ? "✓ " : ""}Bỏ qua {n} kỳ
              </button>
            ))}
          </div>
          <p className="p-3 rounded-box bg-pine-50 text-sm text-pine-950">
            Hộp tiếp theo sẽ giao <strong>{deliveryWindowLabel(newDate, sub.delivery_schedule)}</strong>.
          </p>
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function CancelModal({ sub, onClose, onPauseInstead, onDone }: { sub: SubscriptionRow; onClose: () => void; onPauseInstead: () => void; onDone: (msg: string) => void }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    const finalReason = reason === "Khác" ? other.trim() || "Khác" : reason;
    const { error: err } = await createClient().rpc("cancel_subscription", { p_subscription_id: sub.id, p_reason: finalReason });
    setSaving(false);
    if (err) return setError("Không hủy được gói, vui lòng thử lại.");
    onDone("Đã hủy gói. Các hộp đã trả tiền vẫn được giao đủ.");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Hủy gói ${sub.subscription_code}?`}
      footer={
        <>
          {sub.status === "dang_hoat_dong" && <Button variant="secondary" onClick={onPauseInstead} disabled={saving}>Tạm dừng thay vì hủy</Button>}
          <Button variant="danger" onClick={submit} loading={saving}>Xác nhận hủy gói</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="p-3 rounded-box bg-surface-muted text-sm text-bark-800">
          Các hộp đã trả tiền (<strong>còn {sub.remaining_cycles} hộp</strong>) vẫn được giao đủ. FPETS không hoàn tiền và không nhắc gia hạn nữa.
        </p>
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-bark-800 mb-1">Vì sao bạn muốn hủy?</legend>
          {CANCEL_REASONS.map((r) => (
            <label key={r} className={`flex items-center gap-2.5 min-h-11 px-3 rounded-box border cursor-pointer text-sm ${reason === r ? "border-pine-800 bg-pine-50" : "border-surface-border"}`}>
              <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-pine-900" />
              {r}
            </label>
          ))}
        </fieldset>
        {reason === "Khác" && (
          <textarea rows={2} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Chia sẻ thêm để FPETS cải thiện" className="w-full p-3 rounded-box border border-surface-border text-sm" />
        )}
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      </div>
    </Modal>
  );
}

function DeliveryModal({ sub, onClose, onDone }: { sub: SubscriptionRow; onClose: () => void; onDone: (msg: string) => void }) {
  const [schedule, setSchedule] = useState<DeliverySchedule>(sub.delivery_schedule);
  const [addr, setAddr] = useState<AddressValue>(() => {
    const a = snapshotToAddress(sub.shipping_address_snapshot);
    return a.street ? a : emptyAddress();
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error: err } = await createClient().rpc("update_my_subscription_delivery", {
      p_subscription_id: sub.id,
      p_delivery_schedule: schedule,
      p_address: { recipient_name: addr.recipientName, phone: addr.phone, province_city: addr.province, ward: addr.ward, address: addr.street },
    });
    setSaving(false);
    if (err) return setError(err.message.includes("ERR_ADDRESS_INCOMPLETE") ? "Vui lòng điền đủ địa chỉ." : "Không lưu được thay đổi, vui lòng thử lại.");
    const next = (data as { next_delivery_date: string }).next_delivery_date;
    onDone(`Đã lưu. Hộp tiếp theo giao ${deliveryWindowLabel(next, schedule)}.`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Đổi đợt giao và địa chỉ"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" form="delivery-form" loading={saving}>Lưu thay đổi</Button>
        </>
      }
    >
      <form id="delivery-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-bold text-bark-800 block">Đợt giao hằng tháng</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SCHEDULE_LABEL) as DeliverySchedule[]).map((sc) => (
              <button key={sc} type="button" onClick={() => setSchedule(sc)} aria-pressed={schedule === sc}
                className={`min-h-11 px-3 rounded-box border text-xs font-bold ${schedule === sc ? "border-pine-900 bg-pine-50 text-pine-950" : "border-surface-border text-bark-700"}`}>
                {schedule === sc ? "✓ " : ""}{SCHEDULE_LABEL[sc]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-bark-800 block">Địa chỉ nhận các kỳ sau</span>
          <AddressFields value={addr} onChange={setAddr} idPrefix="sub-addr" />
        </div>
        <p className="text-[11px] text-bark-500">
          Hộp đã qua ngày chốt ({formatDate(sub.cutoff_date)}) vẫn giao theo thông tin cũ; thay đổi áp dụng từ kỳ sau.
        </p>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      </form>
    </Modal>
  );
}

function RenewModal({
  sub,
  plans,
  onClose,
  onCreated,
  onError,
}: {
  sub: SubscriptionRow;
  plans: SubscriptionPlan[];
  onClose: () => void;
  onCreated: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const [planId, setPlanId] = useState(() => (plans.find((p) => p.cycles === 3) || plans[0])?.id || "");
  const [method, setMethod] = useState<"momo" | "vnpay">("momo");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!planId) return;
    setSaving(true);
    const { data, error } = await createClient().rpc("renew_subscription", { p_subscription_id: sub.id, p_plan_id: planId, p_payment_method: method });
    setSaving(false);
    if (error || !data) return onError(error?.message.includes("ERR_RENEW_NOT_ALLOWED") ? "Gói này hiện không thể gia hạn." : "Không tạo được yêu cầu gia hạn, vui lòng thử lại.");
    const r = data as { order_id: string; order_code: string; total_amount: number };
    onCreated(`/checkout/pay/${r.order_id}?code=${r.order_code}&amount=${r.total_amount}&method=${method}&sub=1`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Gia hạn gói ${sub.subscription_code}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Để sau</Button>
          <Button onClick={submit} loading={saving} disabled={!planId}>Tiếp tục thanh toán</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-bark-600">Chọn gói tiếp theo cho bé {sub.pets?.name}. Hộp mới nối tiếp ngay sau hộp hiện tại.</p>
        {plans.map((plan) => {
          const unit = Math.round((sub.box_types?.baseprice || 0) * (1 - plan.discountPercent / 100));
          const selected = plan.id === planId;
          return (
            <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} aria-pressed={selected}
              className={`w-full min-h-11 p-3 rounded-box border text-left flex items-center justify-between ${selected ? "border-pine-900 bg-pine-50" : "border-surface-border hover:bg-surface-muted"}`}>
              <span>
                <span className="block font-bold text-pine-950 text-sm">{selected ? "✓ " : ""}{plan.name}</span>
                <span className="block text-[11px] text-bark-500">
                  {formatVND(unit)}/hộp{plan.discountPercent > 0 ? ` · giảm ${plan.discountPercent}%` : ""}{plan.freeShipping ? " · miễn phí ship" : ""}
                </span>
              </span>
              <span className="font-extrabold text-pine-950">{formatVND(unit * plan.cycles)}</span>
            </button>
          );
        })}
        <div className="grid grid-cols-2 gap-2">
          {(["momo", "vnpay"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
              className={`min-h-11 rounded-box border text-sm font-bold ${method === m ? "border-pine-900 bg-pine-50" : "border-surface-border"}`}>
              {method === m ? "✓ " : ""}{m === "momo" ? "Ví MoMo" : "VNPay"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-bark-500">Số tiền cuối cùng (kể cả phí ship) được tính lại ở bước thanh toán.</p>
      </div>
    </Modal>
  );
}
