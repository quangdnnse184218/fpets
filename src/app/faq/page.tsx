"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SHIPPING_POLICY } from "@/lib/shipping";
import {
  HelpCircle,
  ChevronDown,
  Search,
  PackageOpen,
  Calendar,
  Truck,
  RotateCcw,
  CreditCard,
  MessageCircle,
  Phone,
} from "lucide-react";

interface FAQItem {
  id: string;
  category: 'box' | 'subscription' | 'shipping' | 'return' | 'payment';
  question: string;
  answer: string;
}

const FAQ_CATEGORIES = [
  { id: "all", label: "Tất cả câu hỏi", icon: HelpCircle },
  { id: "box", label: "Mystery Box", icon: PackageOpen },
  { id: "subscription", label: "Gói định kỳ 1/3/6", icon: Calendar },
  { id: "shipping", label: "Giao hàng & Phí ship", icon: Truck },
  { id: "return", label: "Đổi trả & Khiếu nại", icon: RotateCcw },
  { id: "payment", label: "Thanh toán", icon: CreditCard },
];

const FAQ_DATA: FAQItem[] = [
  // Mystery Box
  {
    id: "box-1",
    category: "box",
    question: "Mystery Box là gì và có những món đồ gì bên trong?",
    answer: "Mystery Box là hộp quà bất ngờ chọn riêng cho từng bé chó hoặc mèo. Box Tiêu chuẩn có 4–5 món, Box Premium có 6–7 món; hộp nào cũng có ít nhất 1 món ăn, 1 đồ chơi và 1 món chăm sóc hoặc phụ kiện. Các sản phẩm đều có nguồn gốc rõ ràng."
  },
  {
    id: "box-2",
    category: "box",
    question: "Làm sao FPETS biết bé nhà tôi bị dị ứng hay không thích món gì?",
    answer: "Bạn khai báo trong Pet Quiz hoặc hồ sơ thú cưng các thành phần bé bị dị ứng (ví dụ: thịt gà, thịt bò, ngũ cốc, hải sản). Khi chọn món, hệ thống loại các sản phẩm chứa thành phần đó theo khai báo của bạn. Sau mỗi hộp, bạn chấm từng món 'Bé thích / Bình thường / Không thích' để các hộp sau hợp khẩu vị hơn."
  },
  {
    id: "box-3",
    category: "box",
    question: "Tổng giá trị các món bên trong hộp có cao hơn giá bán không?",
    answer: "Có. Box Tiêu chuẩn giá 299.000₫, tổng giá bán lẻ các món bên trong từ 380.000₫. Box Premium giá 499.000₫, tổng giá bán lẻ từ 650.000₫."
  },

  // Subscription (Gói định kỳ)
  {
    id: "sub-1",
    category: "subscription",
    question: "Gói định kỳ hoạt động như thế nào? Có những gói nào?",
    answer: "FPETS có 3 gói trả trước: Gói 1 hộp (giá gốc), Gói 3 hộp (giảm 10%, freeship) và Gói 6 hộp (giảm 15%, freeship, kèm quà sinh nhật cho bé). Bạn thanh toán một lần khi đăng ký, sau đó mỗi tháng nhận 1 hộp theo đợt đã chọn: đầu tháng (ngày 1–5) hoặc giữa tháng (ngày 15–20)."
  },
  {
    id: "sub-2",
    category: "subscription",
    question: "FPETS có tự động trừ tiền trong thẻ của tôi sau khi hết gói không?",
    answer: "Không. Gói định kỳ trả trước, FPETS không lưu thẻ và không tự trừ tiền. Khi còn hộp cuối, hệ thống nhắc bạn trên web để bạn tự quyết định có gia hạn hay không."
  },
  {
    id: "sub-3",
    category: "subscription",
    question: "Tôi có thể tạm dừng hoặc hủy gói khi đi công tác được không?",
    answer: "Được. Vào Tài khoản > Gói định kỳ trước ngày chốt (7 ngày trước đợt giao) để tạm dừng 1 hoặc 2 kỳ; lịch giao các hộp còn lại tự lùi sang tháng sau. Nếu hủy gói, các hộp đã trả trước vẫn được giao đủ và không hoàn tiền."
  },

  // Giao hàng & Vận chuyển
  {
    id: "ship-1",
    category: "shipping",
    question: "Phí vận chuyển được tính như thế nào? Khi nào được Freeship?",
    answer: SHIPPING_POLICY
  },
  {
    id: "ship-2",
    category: "shipping",
    question: "Sau khi đặt thì bao lâu tôi sẽ nhận được hàng?",
    answer: "Sản phẩm lẻ và Mystery Box mua 1 lần: giao 1–2 ngày nội thành TP.HCM, 3–5 ngày tỉnh khác. Gói định kỳ: giao theo đợt bạn chọn (đầu tháng ngày 1–5 hoặc giữa tháng ngày 15–20). Bạn xem trạng thái đơn trong Đơn hàng của tôi, hoặc tra bằng mã đơn và số điện thoại ở trang Tra cứu đơn hàng."
  },

  // Đổi trả & Khiếu nại
  {
    id: "ret-1",
    category: "return",
    question: "Khi nào Mystery Box được đổi món miễn phí?",
    answer: "FPETS đổi món hoặc gửi bù miễn phí khi lỗi thuộc về shop: (1) món chứa thành phần dị ứng bạn đã khai trong hồ sơ thú cưng, (2) hàng hỏng, vỡ hoặc hết hạn, (3) giao thiếu món. Báo trong 3 ngày sau khi nhận, kèm ảnh mở hộp, bằng nút 'Yêu cầu đổi / trả' trong chi tiết đơn hàng. Mystery Box không đổi vì bé không thích món. Sản phẩm lẻ còn nguyên seal được đổi trả trong 7 ngày, khách chịu phí ship."
  },
  {
    id: "ret-2",
    category: "return",
    question: "Nếu bé không chịu chơi hoặc không chịu ăn món trong hộp thì sao?",
    answer: "Mystery Box không đổi trả vì bé không thích món. Bạn hãy vào Đơn hàng của tôi, bấm Đánh giá và chấm 'Không thích' cho món đó; FPETS ghi nhận vào hồ sơ của bé để tránh gửi lại món này ở các kỳ sau."
  },

  // Thanh toán
  {
    id: "pay-1",
    category: "payment",
    question: "FPETS hỗ trợ những phương thức thanh toán nào?",
    answer: "FPETS nhận: (1) ví MoMo, (2) VNPay (QR ngân hàng, thẻ ATM, Visa/Mastercard), (3) COD cho đơn mua 1 lần dưới 2.000.000₫. Gói định kỳ chỉ thanh toán online qua MoMo hoặc VNPay."
  },
  {
    id: "pay-2",
    category: "payment",
    question: "Đơn hàng chưa thanh toán online sẽ được giữ trong bao lâu?",
    answer: "Sau khi đặt hàng, bạn có 30 phút để hoàn tất thanh toán online; trong thời gian này hàng được giữ cho bạn. Quá 30 phút chưa thanh toán, đơn tự hủy và hàng được trả lại kho."
  }
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIds, setOpenIds] = useState<string[]>(["box-1", "sub-1"]);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchCategory = activeCategory === "all" || item.category === activeCategory;
    const matchSearch =
      searchQuery.trim() === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header trang */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-900 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-pine-800" />
            <span>Trung tâm trợ giúp FPETS</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display">
            Câu hỏi thường gặp
          </h1>
          <p className="text-sm sm:text-base text-bark-600 max-w-xl mx-auto">
            Giải đáp mọi thắc mắc về Mystery Box, Gói định kỳ, phương thức giao hàng và cam kết an toàn cho thú cưng.
          </p>
        </div>

        {/* Thanh tìm kiếm câu hỏi */}
        <div className="relative max-w-xl mx-auto">
          <Search className="w-5 h-5 text-bark-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm câu hỏi (vd: dị ứng, freeship, tạm dừng gói, đổi trả...)"
            className="w-full pl-11 pr-4 py-3 rounded-box border border-surface-border bg-white text-sm text-bark-900 placeholder:text-bark-400 focus:outline-none focus:border-pine-800 shadow-xs"
          />
        </div>

        {/* Bộ lọc theo danh mục dạng Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-start sm:justify-center scrollbar-none">
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-box text-xs font-bold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-pine-900 text-white shadow-xs"
                    : "bg-surface-card hover:bg-surface-border text-bark-700 border border-surface-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Danh sách câu hỏi Accordion */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openIds.includes(faq.id);
              return (
                <div
                  key={faq.id}
                  id={faq.category === 'return' ? 'doi-tra' : undefined}
                  className="rounded-box border border-surface-border bg-surface-card overflow-hidden shadow-2xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-surface-muted/50 transition-colors"
                  >
                    <span className="font-bold text-sm sm:text-base text-pine-950 font-display">
                      {faq.question}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full bg-surface-muted flex items-center justify-center shrink-0 transition-transform duration-200 text-pine-900 ${
                        isOpen ? "rotate-180 bg-pine-100" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-bark-700 leading-relaxed border-t border-surface-border/60 bg-surface-card">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-box bg-surface-card border border-surface-border text-bark-500 text-sm">
              Không tìm thấy câu hỏi phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Hãy thử tìm với từ khóa khác hoặc liên hệ trực tiếp với chúng tôi.
            </div>
          )}
        </div>

        {/* Khối Hỗ trợ nếu câu hỏi chưa được giải đáp */}
        <div className="rounded-container p-6 sm:p-8 bg-pine-950 text-pine-100 flex flex-col sm:flex-row items-center justify-between gap-6 border border-pine-900">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white font-display">
              Bạn vẫn còn câu hỏi khác cần giải đáp?
            </h3>
            <p className="text-xs sm:text-sm text-pine-300">
              Đội ngũ chăm sóc khách hàng FPETS luôn sẵn sàng hỗ trợ bạn và bé cưng từ 8:00 – 21:00 mỗi ngày.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Gửi tin nhắn</span>
            </Link>
            <a
              href="tel:19006868"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-box bg-pine-800 hover:bg-pine-700 text-white font-bold text-xs transition-colors border border-pine-700"
            >
              <Phone className="w-4 h-4 text-grass-400" />
              <span>Gọi 1900 6868</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
