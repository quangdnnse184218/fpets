"use client";

import { createClient } from "@/lib/supabase/client";
import { resolveImageUrl } from "@/lib/adapters";
import type { OrderStatus } from "@/lib/orderDisplay";

export interface MyOrderItem {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  box_type_id: string | null;
  pets: { name: string } | null;
  products: { slug: string; images: string[] | null } | null;
  box_types: { name: string; images: string[] | null } | null;
}

export interface MyOrder {
  id: string;
  order_code: string;
  order_type: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  cycle_index: number | null;
  tracking_code: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  return_requested_at: string | null;
  return_reason: string | null;
  payment_expires_at: string | null;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  province_city: string | null;
  ward: string | null;
  customer_notes: string | null;
  order_items: MyOrderItem[];
  subscriptions: {
    id: string;
    subscription_code: string;
    total_cycles: number;
    box_types: { name: string; images: string[] | null } | null;
    pets: { name: string } | null;
  } | null;
}

const ORDER_SELECT = `id, order_code, order_type, status, payment_method, payment_status, subtotal, shipping_fee, discount_amount, total_amount,
  cycle_index, tracking_code, created_at, updated_at, paid_at, cancelled_at, cancellation_reason, return_requested_at, return_reason,
  payment_expires_at, recipient_name, recipient_phone, shipping_address, province_city, ward, customer_notes,
  order_items(id, product_id, product_name_snapshot, quantity, unit_price, total_price, box_type_id, pets(name), products(slug, images), box_types(name, images)),
  subscriptions(id, subscription_code, total_cycles, box_types(name, images), pets(name))`;

export async function fetchMyOrders(): Promise<MyOrder[]> {
  const { data } = await createClient().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  return (data as unknown as MyOrder[]) || [];
}

export async function fetchMyOrder(id: string): Promise<MyOrder | null> {
  const { data } = await createClient().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as MyOrder) || null;
}

const FALLBACK_THUMB = "/images/hero/fpets-box-open.jpg";

// Dòng hiển thị của đơn: đơn kỳ gói không có order_items nên dựng từ thông tin gói
export function orderLines(order: MyOrder) {
  if (order.order_type === "subscription_cycle" && order.subscriptions) {
    const s = order.subscriptions;
    return [
      {
        key: `${order.id}-cycle`,
        name: `${s.box_types?.name || "Mystery Box"} – Kỳ ${order.cycle_index || 1}/${s.total_cycles}`,
        petName: s.pets?.name || null,
        quantity: 1,
        amount: 0,
        thumb: resolveImageUrl(s.box_types?.images?.[0], FALLBACK_THUMB),
        subscriptionCode: s.subscription_code,
      },
    ];
  }
  return order.order_items.map((i) => ({
    key: i.id,
    name: i.product_name_snapshot,
    petName: i.pets?.name || null,
    quantity: i.quantity,
    amount: i.total_price,
    thumb: resolveImageUrl((i.products?.images || i.box_types?.images)?.[0], FALLBACK_THUMB),
    subscriptionCode: null as string | null,
  }));
}
