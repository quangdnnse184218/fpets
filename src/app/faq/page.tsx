"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { DELIVERY_DAYS, SHIPPING_POLICY } from "@/lib/shipping";
import { PREMIUM_ITEMS, STANDARD_ITEMS } from "@/lib/copy";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { normalizeText } from "@/lib/petOptions";
import { buttonClass } from "@/components/ui/Button";

type CategoryId = "box" | "subscription" | "shipping" | "return" | "payment";

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "box", label: "Mystery Box" },
  { id: "subscription", label: "Gói định kỳ" },
  { id: "shipping", label: "Giao hàng" },
  { id: "return", label: "Đổi trả" },
  { id: "payment", label: "Thanh toán" },
];

const FAQ_DATA: { category: CategoryId; question: string; answer: string }[] = [
  {
    category: "box",
    question: "Mystery Box là gì, trong hộp có gì?",
    answer: `Mystery Box là hộp quà chọn riêng cho từng bé chó hoặc mèo. Box Tiêu chuẩn có ${STANDARD_ITEMS}, Box Premium có ${PREMIUM_ITEMS}; hộp nào cũng có ít nhất 1 món ăn, 1 đồ chơi và 1 món chăm sóc hoặc phụ kiện.`,
  },
  {
    category: "box",
    question: "FPETS chọn món cho bé dựa vào đâu?",
    answer: "Dựa vào hồ sơ thú cưng bạn khai: loài, cân nặng, độ tuổi, thành phần dị ứng và sở thích. Món chứa thành phần bé dị ứng bị loại khi chọn. Sau mỗi hộp, bạn chấm từng món “Bé thích / Bình thường / Không thích” để hộp sau hợp hơn.",
  },
  {
    category: "box",
    question: "Giá trị các món trong hộp so với giá hộp thế nào?",
    answer: "Tổng giá bán lẻ các món trong hộp luôn cao hơn giá hộp. Mức tối thiểu của từng loại ghi ở trang Mystery Box, dòng “trị giá từ”.",
  },
  {
    category: "box",
    question: "Mua Mystery Box có cần tài khoản không?",
    answer: "Có. Hộp gắn với hồ sơ của một bé cụ thể nên bạn cần đăng nhập và tạo hồ sơ thú cưng trước khi đặt.",
  },
  {
    category: "subscription",
    question: "Gói định kỳ gồm những gói nào?",
    answer: "Có 3 gói trả trước: Gói 1 hộp (giá gốc), Gói 3 hộp (giảm 10%, miễn phí vận chuyển) và Gói 6 hộp (giảm 15%, miễn phí vận chuyển, kèm quà sinh nhật cho bé). Mỗi tháng bạn nhận 1 hộp theo đợt đã chọn: đầu tháng (ngày 1–5) hoặc giữa tháng (ngày 15–20).",
  },
  {
    category: "subscription",
    question: "FPETS có tự động trừ tiền khi hết gói không?",
    answer: "Không. Gói trả trước một lần, FPETS không lưu thẻ và không tự trừ tiền. Khi còn hộp cuối, bạn nhận thông báo nhắc gia hạn; không gia hạn thì gói tự kết thúc.",
  },
  {
    category: "subscription",
    question: "Tôi tạm dừng hoặc hủy gói thế nào?",
    answer: "Vào Tài khoản → Gói định kỳ. Tạm dừng 1 hoặc 2 kỳ trước ngày chốt (7 ngày trước đợt giao), lịch giao tự lùi lại và gói tự chạy tiếp khi hết thời gian tạm dừng. Hủy gói bất kỳ lúc nào: các hộp đã trả trước vẫn được giao đủ, không hoàn tiền.",
  },
  {
    category: "subscription",
    question: "Tôi đổi địa chỉ hoặc đợt giao giữa chừng được không?",
    answer: "Được. Vào Tài khoản → Gói định kỳ → Đổi đợt giao / địa chỉ. Lưu trước ngày chốt thì áp dụng cho hộp sắp giao, sau ngày chốt thì áp dụng từ kỳ sau.",
  },
  {
    category: "shipping",
    question: "Phí vận chuyển tính thế nào?",
    answer: SHIPPING_POLICY,
  },
  {
    category: "shipping",
    question: "Bao lâu thì tôi nhận được hàng?",
    answer: `Sản phẩm lẻ và Mystery Box mua 1 lần: ${DELIVERY_DAYS}. Hộp theo gói định kỳ: giao trong đợt bạn chọn. Bạn theo dõi trạng thái trong Đơn hàng của tôi, hoặc tra bằng mã đơn và số điện thoại ở trang Tra cứu đơn hàng.`,
  },
  {
    category: "return",
    question: "Khi nào được đổi món hoặc hoàn tiền?",
    answer: "Khi lỗi thuộc về FPETS: món chứa thành phần dị ứng đã khai trong hồ sơ, hàng hỏng hoặc hết hạn, giao thiếu món. Báo trong 3 ngày sau khi nhận bằng nút “Yêu cầu đổi / trả” trong chi tiết đơn. Sản phẩm lẻ còn nguyên seal được đổi trả trong 7 ngày, khách chịu phí ship.",
  },
  {
    category: "return",
    question: "Bé không thích món trong hộp thì sao?",
    answer: "Mystery Box không đổi vì bé không thích món. Bạn chấm “Không thích” cho món đó khi đánh giá đơn; FPETS ghi vào hồ sơ của bé và tránh gửi lại ở các hộp sau.",
  },
  {
    category: "payment",
    question: "FPETS nhận những hình thức thanh toán nào?",
    answer: "Ví MoMo, VNPay (QR ngân hàng, thẻ ATM, Visa/Mastercard) và COD cho đơn mua 1 lần dưới 2.000.000₫. Gói định kỳ chỉ thanh toán online qua MoMo hoặc VNPay.",
  },
  {
    category: "payment",
    question: "Đơn chưa thanh toán online được giữ bao lâu?",
    answer: "30 phút. Quá thời gian này đơn tự hủy và hàng được trả lại kho; bạn đặt lại đơn mới nếu vẫn muốn mua.",
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const q = normalizeText(query.trim());
  const matches = FAQ_DATA.filter((item) => !q || normalizeText(`${item.question} ${item.answer}`).includes(q));
  const groups = CATEGORIES.map((c) => ({ ...c, items: matches.filter((m) => m.category === c.id) })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="space-y-4 max-w-2xl">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Câu hỏi thường gặp</h1>
          <p className="text-sm text-bark-600">Mystery Box, gói định kỳ, giao hàng, đổi trả và thanh toán.</p>
        </div>
        <div className="relative">
          <label htmlFor="faq-search" className="sr-only">Tìm câu hỏi</label>
          <Search className="w-4 h-4 text-bark-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm câu hỏi: dị ứng, phí ship, tạm dừng gói…"
            className="w-full min-h-11 pl-10 pr-3 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none"
          />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10 lg:items-start">
        {/* Mục lục theo chủ đề: cột trái trên desktop, hàng chip xuống dòng trên mobile */}
        <nav aria-label="Chủ đề" className="lg:sticky lg:top-20 flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="min-h-10 px-3.5 lg:px-3 inline-flex items-center rounded-full lg:rounded-box border border-surface-border lg:border-transparent bg-surface-card lg:bg-transparent text-sm font-semibold text-bark-700 hover:text-pine-950 hover:bg-surface-muted transition-colors"
            >
              {c.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 lg:mt-0 space-y-8 min-w-0">
          {groups.length === 0 && (
            <div className="p-8 text-center rounded-container bg-surface-card border border-surface-border space-y-2">
              <p className="text-sm text-bark-600">Không tìm thấy câu hỏi nào khớp “{query}”.</p>
              <button type="button" onClick={() => setQuery("")} className="text-sm font-bold text-pine-900 underline underline-offset-2">Xem tất cả câu hỏi</button>
            </div>
          )}
          {groups.map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="space-y-3 scroll-mt-24">
              <h2 id={`${group.id}-heading`} className="text-lg font-extrabold text-pine-950 font-display">{group.label}</h2>
              <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
                {group.items.map((item) => (
                  // Đang tìm kiếm thì mở sẵn các câu khớp để thấy ngay câu trả lời
                  <details key={item.question} className="group" open={q !== "" || undefined}>
                    <summary className="flex items-center justify-between gap-4 p-4 sm:px-5 cursor-pointer list-none text-sm font-bold text-pine-950 hover:bg-surface-muted/50">
                      <span>{item.question}</span>
                      <ChevronDown className="w-4 h-4 text-bark-500 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="px-4 sm:px-5 pb-4 text-sm text-bark-700 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
              {group.id === "return" && (
                <Link href="/return-policy" className="inline-block text-sm font-bold text-pine-900 underline underline-offset-2">
                  Đọc chính sách đổi trả đầy đủ
                </Link>
              )}
            </section>
          ))}

          <div className="p-5 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-pine-950">Chưa thấy câu trả lời?</h2>
              <p className="text-sm text-bark-600 mt-0.5">FPETS trả lời trong giờ làm việc {CONTACT_INFO.hours} hằng ngày.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link href="/contact" className={buttonClass("primary", "md")}>Gửi câu hỏi</Link>
              <a href={`tel:${CONTACT_INFO.hotlineTel}`} className={buttonClass("secondary", "md")}>Gọi {CONTACT_INFO.hotline}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
