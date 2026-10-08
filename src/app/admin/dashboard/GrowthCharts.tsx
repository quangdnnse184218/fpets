"use client";

import React, { useCallback, useEffect, useState } from "react";
import ColumnChart from "@/components/admin/ColumnChart";
import { compareText, fetchGrowth, GROWTH_RANGES, GrowthData, GrowthRange } from "@/lib/adminGrowth";
import { formatVND } from "@/lib/formatters";

// Doanh thu và khách hàng mới theo thời gian. Hai số khác thang đo nên là hai biểu đồ riêng, chung một bộ lọc thời gian.

const card = "rounded-container bg-surface-card border border-surface-border";
const NUM = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

// Số tiền ngắn trên trục: 1,5tr / 500k
function shortVND(v: number): string {
  if (v >= 1_000_000) return `${NUM.format(v / 1_000_000)}tr`;
  if (v >= 1_000) return `${NUM.format(v / 1_000)}k`;
  return NUM.format(v);
}

export default function GrowthCharts({ refreshKey }: { refreshKey: number }) {
  const [range, setRange] = useState<GrowthRange>("30d");
  const [data, setData] = useState<GrowthData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await fetchGrowth(range));
    } catch {
      setError(true);
    }
  }, [range]);

  useEffect(() => {
    setData(null);
    load();
  }, [load, refreshKey]);

  const meta = GROWTH_RANGES.find((r) => r.id === range)!;

  return (
    <section aria-labelledby="growth-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="growth-heading" className="text-sm font-bold text-pine-950">Tăng trưởng</h2>
        <div role="radiogroup" aria-label="Khoảng thời gian" className="inline-flex p-0.5 rounded-box bg-surface-muted border border-surface-border">
          {GROWTH_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => setRange(r.id)}
              className={`h-8 px-3 rounded-[6px] text-xs font-semibold transition-colors ${
                range === r.id ? "bg-surface-card text-pine-950 shadow-xs" : "text-bark-600 hover:text-pine-950"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="p-3 rounded-box bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          Không tải được số liệu tăng trưởng. Bấm Làm mới để thử lại.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <ChartCard
          title="Doanh thu"
          note="Tiền đã thu, không tính đơn đã hoàn tiền"
          total={data ? formatVND(data.revenueTotal) : null}
          compare={data ? compareText(data.revenueTotal, data.revenuePrevious, meta.previousLabel) : ""}
        >
          {data && (
            <ColumnChart
              data={data.buckets.map((b) => ({ key: b.key, label: b.label, longLabel: b.longLabel, value: b.revenue }))}
              formatTick={shortVND}
              formatValue={formatVND}
              valueName="Doanh thu"
              ariaLabel={`Biểu đồ doanh thu ${meta.label} gần nhất, tổng ${formatVND(data.revenueTotal)}`}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Khách hàng mới"
          note="Tài khoản khách đăng ký mới"
          total={data ? `${data.customersTotal} khách` : null}
          compare={data ? compareText(data.customersTotal, data.customersPrevious, meta.previousLabel) : ""}
        >
          {data && (
            <ColumnChart
              data={data.buckets.map((b) => ({ key: b.key, label: b.label, longLabel: b.longLabel, value: b.newCustomers }))}
              formatTick={(v) => NUM.format(v)}
              formatValue={(v) => `${v} khách`}
              valueName="Khách mới"
              integer
              ariaLabel={`Biểu đồ khách hàng mới ${meta.label} gần nhất, tổng ${data.customersTotal} khách`}
            />
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, note, total, compare, children }: { title: string; note: string; total: string | null; compare: string; children: React.ReactNode }) {
  return (
    <div className={`${card} p-4 sm:p-5 space-y-3`}>
      <div>
        <h3 className="text-xs font-semibold text-bark-600">{title}</h3>
        {total === null ? (
          <span className="block h-7 w-32 mt-1 rounded bg-surface-muted animate-pulse" aria-hidden="true" />
        ) : (
          <p className="text-xl sm:text-2xl font-extrabold text-pine-950 tabular-nums mt-0.5">{total}</p>
        )}
        <p className="text-[11px] text-bark-500 mt-0.5">{compare || note}</p>
      </div>
      {total === null ? <div className="h-[200px] rounded-box bg-surface-muted/60 animate-pulse" aria-hidden="true" /> : children}
      {total !== null && <p className="text-[11px] text-bark-500">{note}</p>}
    </div>
  );
}
