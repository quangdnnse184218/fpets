"use client";

import { useEffect, useState } from "react";
import { fetchPlanOptions } from "@/lib/catalog";
import { DEFAULT_PLANS, PlanLite } from "@/lib/planCopy";

// Tải gói định kỳ một lần cho cả phiên, dùng chung giữa các trang
let cache: PlanLite[] | null = null;
let pending: Promise<PlanLite[]> | null = null;

function loadPlans(): Promise<PlanLite[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetchPlanOptions().then((rows) => {
      if (rows.length > 0) cache = rows.map((p) => ({ cycles: p.cycles, discountPercent: p.discountPercent, freeShipping: p.freeShipping, birthdayGift: p.birthdayGift }));
      pending = null;
      return cache || DEFAULT_PLANS;
    });
  }
  return pending;
}

/** Mức giảm, freeship của các gói định kỳ lấy từ DB; trước khi tải xong dùng giá trị gốc của SPEC. */
export function usePlans(): PlanLite[] {
  const [plans, setPlans] = useState<PlanLite[]>(cache || DEFAULT_PLANS);
  useEffect(() => {
    let alive = true;
    loadPlans().then((p) => alive && setPlans(p));
    return () => {
      alive = false;
    };
  }, []);
  return plans;
}
