import React from "react";
import { Check } from "lucide-react";

export interface OrderStep {
  label: string;
  // Dòng phụ dưới nhãn, ví dụ thời điểm "15:51 · 30/09/2026"
  time?: string | null;
}

/**
 * Thanh tiến trình đơn hàng: các bước nối với nhau bằng đường kẻ ngang,
 * đoạn đã đi qua tô đậm. Dùng ở chi tiết đơn và trang tra cứu đơn.
 * currentIndex là bước mới nhất đơn đã tới; các bước từ đó trở về trước hiện dấu tích.
 */
export default function OrderStepper({ steps, currentIndex }: { steps: OrderStep[]; currentIndex: number }) {
  return (
    <ol className="flex items-start" aria-label="Tiến trình đơn hàng">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        return (
          <li key={step.label} className="relative flex-1 flex flex-col items-center text-center min-w-0" aria-current={current ? "step" : undefined}>
            {/* Đường nối sang bước kế tiếp, nằm sau vòng tròn */}
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`absolute top-[13px] left-1/2 w-full h-0.5 ${i < currentIndex ? "bg-pine-900" : "bg-surface-border"}`} />
            )}
            <span
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done ? "bg-pine-900 border-pine-900 text-white" : "bg-white border-surface-border text-bark-400"
              } ${current ? "ring-4 ring-pine-900/15" : ""}`}
            >
              {done ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`mt-2 px-0.5 text-[11px] sm:text-xs leading-tight ${done ? "font-bold text-pine-950" : "text-bark-500"}`}>
              {step.label}
            </span>
            {/* "HH:mm · dd/MM/yyyy": giờ và ngày xuống 2 dòng; điện thoại bỏ năm (đã có ở dòng "Đặt lúc") để các cột không dính nhau */}
            {step.time && (
              <span className="mt-0.5 px-0.5 text-[10px] sm:text-[11px] text-bark-500 leading-tight tabular-nums">
                {step.time.split(" · ").map((part) =>
                  /^\d{2}\/\d{2}\/\d{4}$/.test(part) ? (
                    <span key={part} className="block">
                      <span className="sm:hidden">{part.slice(0, 5)}</span>
                      <span className="hidden sm:inline">{part}</span>
                    </span>
                  ) : (
                    <span key={part} className="block">{part}</span>
                  )
                )}
              </span>
            )}
            <span className="sr-only">{current && i < steps.length - 1 ? "(bước hiện tại)" : done ? "(đã xong)" : "(chưa tới)"}</span>
          </li>
        );
      })}
    </ol>
  );
}
