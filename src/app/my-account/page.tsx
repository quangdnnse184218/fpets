"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { fetchMyOrders, MyOrder, orderLines } from "@/lib/myOrders";
import { formatDate, formatVND, formatWeight } from "@/lib/formatters";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, cleanItemName } from "@/lib/orderDisplay";
import { DeliverySchedule, cutoffOf, deliveryWindowLabel } from "@/lib/deliverySchedule";
import { AGE_LABEL } from "@/lib/petOptions";
import { ButtonLink } from "@/components/ui/Button";
import { capitalize, discountSentence, freeShippingPlans } from "@/lib/planCopy";
import { usePlans } from "@/lib/usePlans";

interface SubSummary {
  id: string;
  subscription_code: string;
  status: string;
  remaining_cycles: number;
  total_cycles: number;
  next_delivery_date: string;
  delivery_schedule: DeliverySchedule;
  pets: { name: string } | null;
  box_types: { name: string } | null;
}

const SUB_STATUS: Record<string, string> = { dang_hoat_dong: "Đang hoạt động", tam_dung: "Tạm dừng", qua_han: "Chờ gia hạn" };
const card = "rounded-container bg-surface-card border border-surface-border";

export default function AccountOverviewPage() {
  const { user, pets } = useApp();
  const plans = usePlans();
  const [subs, setSubs] = useState<SubSummary[]>([]);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.id) return;
    Promise.all([
      createClient()
        .from("subscriptions")
        .select("id, subscription_code, status, remaining_cycles, total_cycles, next_delivery_date, delivery_schedule, pets(name), box_types(name)")
        .eq("user_id", user.id)
        .in("status", ["dang_hoat_dong", "tam_dung", "qua_han"])
        .order("next_delivery_date", { ascending: true }),
      fetchMyOrders(),
    ]).then(([subRes, orderData]) => {
      setSubs((subRes.data as unknown as SubSummary[]) || []);
      setOrders(orderData);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 rounded-container bg-surface-muted animate-pulse" />
        <div className="h-48 rounded-container bg-surface-muted animate-pulse" />
      </div>
    );
  }

  // Đơn gia hạn chỉ là biên nhận thanh toán, không phải đơn giao hàng
  const recentOrders = orders.filter((o) => o.order_type !== "subscription_renewal").slice(0, 3);
  const nextSub = subs.find((s) => s.status !== "qua_han" && s.remaining_cycles > 0);
  const renewSub = subs.find((s) => s.status === "qua_han" || (s.status === "dang_hoat_dong" && s.remaining_cycles <= 1));

  return (
    <div className="space-y-5">
      {renewSub && (
        <div className="p-4 rounded-container bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-900">
            Gói <strong>{renewSub.subscription_code}</strong> của bé {renewSub.pets?.name} {renewSub.status === "qua_han" ? "đã hết hộp" : "còn hộp cuối"}. Gia hạn để giữ lịch giao cho bé.
          </p>
          <ButtonLink href="/my-account/subscriptions" size="sm" className="shrink-0">Gia hạn gói</ButtonLink>
        </div>
      )}

      <section aria-labelledby="next-box-heading" className={`${card} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="next-box-heading" className="text-sm font-bold text-pine-950">Hộp sắp giao</h2>
          {subs.length > 0 && <Link href="/my-account/subscriptions" className="text-xs font-bold text-pine-900 hover:underline">Quản lý gói</Link>}
        </div>
        {nextSub ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-bark-500">Hộp</p>
              <p className="font-bold text-pine-950">{nextSub.box_types?.name}</p>
              <p className="text-xs text-bark-600">Bé {nextSub.pets?.name} · {SUB_STATUS[nextSub.status]}</p>
            </div>
            <div>
              <p className="text-xs text-bark-500">Dự kiến giao</p>
              <p className="font-bold text-pine-950">{deliveryWindowLabel(nextSub.next_delivery_date, nextSub.delivery_schedule)}</p>
              <p className="text-xs text-bark-600">Chốt hồ sơ {formatDate(cutoffOf(nextSub.next_delivery_date))}</p>
            </div>
            <div>
              <p className="text-xs text-bark-500">Còn lại</p>
              <p className="font-bold text-pine-950">{nextSub.remaining_cycles}/{nextSub.total_cycles} hộp</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-bark-600">Bạn chưa có gói định kỳ. {capitalize(discountSentence(plans))}, {freeShippingPlans(plans)} được miễn phí vận chuyển.</p>
            <ButtonLink href="/subscription" variant="secondary" size="sm" className="shrink-0">Xem gói định kỳ</ButtonLink>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-orders-heading" className={card}>
        <div className="p-4 sm:px-5 flex items-center justify-between gap-3 border-b border-surface-border">
          <h2 id="recent-orders-heading" className="text-sm font-bold text-pine-950">Đơn gần đây</h2>
          {recentOrders.length > 0 && <Link href="/my-account/orders" className="text-xs font-bold text-pine-900 hover:underline">Xem tất cả</Link>}
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-bark-600">Bạn chưa có đơn hàng nào.</p>
            <ButtonLink href="/boxes" size="sm" className="shrink-0">Chọn hộp cho bé</ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {recentOrders.map((order) => {
              const lines = orderLines(order);
              return (
                <li key={order.id}>
                  <Link href={`/my-account/orders/${order.id}`} className="flex items-center gap-3 p-4 sm:px-5 hover:bg-surface-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-pine-950 truncate">
                        {lines[0] ? cleanItemName(lines[0].name) : order.order_code}
                        {lines.length > 1 && <span className="font-normal text-bark-500"> và {lines.length - 1} món khác</span>}
                      </p>
                      <p className="text-xs text-bark-500 mt-0.5">
                        <span className="font-mono">{order.order_code}</span> · {formatDate(order.created_at)}
                        {order.order_type !== "subscription_cycle" && ` · ${formatVND(order.total_amount)}`}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-tag border text-xs font-bold shrink-0 ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                    <ChevronRight className="w-4 h-4 text-bark-400 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="pets-heading" className={card}>
        <div className="p-4 sm:px-5 flex items-center justify-between gap-3 border-b border-surface-border">
          <h2 id="pets-heading" className="text-sm font-bold text-pine-950">Thú cưng</h2>
          {pets.length > 0 && <Link href="/my-account/pets" className="text-xs font-bold text-pine-900 hover:underline">Quản lý hồ sơ</Link>}
        </div>
        {pets.length === 0 ? (
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-bark-600">Tạo hồ sơ cho bé để FPETS gợi ý hộp phù hợp.</p>
            <ButtonLink href="/quiz" variant="accent" size="sm" className="shrink-0">Làm Pet Quiz</ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {pets.map((pet) => (
              <li key={pet.id} className="p-4 sm:px-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-pine-950 truncate">{pet.name}</p>
                  <p className="text-xs text-bark-500">
                    {[pet.species === "dog" ? "Chó" : "Mèo", pet.weight ? formatWeight(pet.weight) : "", AGE_LABEL[pet.ageGroup]].filter(Boolean).join(" · ")}
                    {pet.allergies.length > 0 && ` · Dị ứng: ${pet.allergies.join(", ").toLowerCase()}`}
                  </p>
                </div>
                <Link href={`/boxes?pet=${pet.id}`} className="text-xs font-bold text-pine-900 hover:underline shrink-0">Chọn hộp</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
