"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

// Biểu đồ cột một chuỗi số liệu theo thời gian (SVG thuần, không thêm thư viện).
// Quy cách: cột tối đa 24px, bo 4px ở đầu cột, vuông ở đường gốc, cách nhau ít nhất 2px; lưới mảnh, nhạt;
// chỉ ghi số trên cột cao nhất; rê chuột / chạm / phím mũi tên để xem từng cột; có bảng số liệu thay thế.

export interface ColumnDatum {
  key: string;
  label: string; // nhãn trục X (ngắn)
  longLabel: string; // trong tooltip và bảng
  value: number;
}

interface Props {
  data: ColumnDatum[];
  // Số trên trục Y (ngắn: 1,5tr) và số đầy đủ trong tooltip / bảng (1.500.000₫)
  formatTick: (v: number) => string;
  formatValue: (v: number) => string;
  valueName: string; // tiêu đề cột số trong bảng, ví dụ "Doanh thu"
  integer?: boolean; // vạch trục Y chỉ là số nguyên (đếm người)
  ariaLabel: string;
  height?: number;
}

// Màu cột: họ xanh pine của thương hiệu, bản đủ độ bão hòa để không trông như màu xám (đã kiểm bằng validate_palette)
const BAR = "#168A6E";
const BAR_ACTIVE = "#1E4239"; // pine-800
const GRID = "#E7E3DA"; // surface-border
const AXIS_TEXT = "#6E6762"; // bark-500, đạt 4.5:1 trên nền trắng

const PAD = { top: 18, right: 6, bottom: 22, left: 40 };
// Nửa bề rộng ước tính của một nhãn cỡ 10px ("08/10", "2,5tr"): nhãn gần mép hơn mức này thì canh lề thay vì canh giữa
const HALF_LABEL = 18;
const MAX_BAR = 24;
const MIN_GAP = 2;

// Vạch chia "đẹp": 0, 1, 2, 2.5, 5 × 10^k
function niceTicks(max: number, integer: boolean, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw && (!integer || Number.isInteger(s))) || 10 * pow;
  const s = integer ? Math.max(1, Math.ceil(step)) : step;
  const ticks: number[] = [];
  for (let v = 0; v < max + s; v += s) ticks.push(v);
  return ticks;
}

// Cột bo 4px ở đầu, vuông ở chân
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export default function ColumnChart({ data, formatTick, formatValue, valueName, integer = false, ariaLabel, height = 200 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = useMemo(() => niceTicks(max, integer), [max, integer]);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(1, Math.min(MAX_BAR, slot - MIN_GAP));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1;

  // Thưa nhãn trục X để không chồng nhau (mỗi nhãn cần khoảng 38px), luôn giữ nhãn cuối
  const labelEvery = Math.max(1, Math.ceil(38 / Math.max(slot, 1)));
  const showLabel = (i: number) => (data.length - 1 - i) % labelEvery === 0;

  const onKey = (e: React.KeyboardEvent) => {
    if (!data.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((prev) => {
        const cur = prev ?? (step > 0 ? -1 : data.length);
        return Math.min(data.length - 1, Math.max(0, cur + step));
      });
    } else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(data.length - 1);
    else if (e.key === "Escape") setActive(null);
  };

  // Nhãn sát mép trái / phải canh theo mép để không bị cắt
  const anchorAt = (cx: number): { x: number; anchor: "start" | "middle" | "end" } =>
    cx + HALF_LABEL > width - PAD.right
      ? { x: width - PAD.right, anchor: "end" }
      : cx - HALF_LABEL < PAD.left - 4
        ? { x: PAD.left - 4, anchor: "start" }
        : { x: cx, anchor: "middle" };

  const tip = active !== null ? data[active] : null;
  const tipX = active !== null ? PAD.left + slot * active + slot / 2 : 0;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${ariaLabel}. Dùng phím mũi tên để xem từng cột.`}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-pine-800/40 rounded"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={AXIS_TEXT} className="tabular-nums">
                  {formatTick(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const x = PAD.left + slot * i + (slot - barW) / 2;
              const h = (d.value / top) * plotH;
              return (
                <g key={d.key}>
                  <path d={barPath(x, PAD.top + plotH - h, barW, h)} fill={active === i ? BAR_ACTIVE : BAR} />
                  {i === peak && active === null && (
                    <text x={anchorAt(x + barW / 2).x} y={PAD.top + plotH - h - 5} textAnchor={anchorAt(x + barW / 2).anchor} fontSize={10} fontWeight={700} fill="#17342C" className="tabular-nums">
                      {formatTick(d.value)}
                    </text>
                  )}
                  {showLabel(i) && (
                    <text x={anchorAt(PAD.left + slot * i + slot / 2).x} y={height - 6} textAnchor={anchorAt(PAD.left + slot * i + slot / 2).anchor} fontSize={10} fill={AXIS_TEXT}>
                      {d.label}
                    </text>
                  )}
                  {/* Vùng bắt chuột phủ cả cột dọc, rộng hơn thân cột */}
                  <rect
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {tip && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-box bg-pine-950 text-white px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{ left: Math.min(Math.max(tipX, 70), width - 70), top: 0 }}
          >
            <span className="block text-sm font-extrabold tabular-nums">{formatValue(tip.value)}</span>
            <span className="block text-[11px] text-pine-200">{tip.longLabel}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        aria-controls={tableId}
        className="text-[11px] font-semibold text-pine-900 hover:underline"
      >
        {showTable ? "Ẩn bảng số liệu" : "Xem bảng số liệu"}
      </button>
      {showTable && (
        <div id={tableId} className="max-h-56 overflow-y-auto rounded-box border border-surface-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-muted text-bark-600">
              <tr>
                <th className="text-left font-semibold px-3 py-1.5">Thời gian</th>
                <th className="text-right font-semibold px-3 py-1.5">{valueName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {[...data].reverse().map((d) => (
                <tr key={d.key}>
                  <td className="px-3 py-1.5 text-bark-700">{d.longLabel}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-pine-950 tabular-nums">{formatValue(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
