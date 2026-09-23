"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  ArrowRight,
  ShieldCheck,
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
    answer: "Mystery Box của FPETS là hộp quà bất ngờ được thiết kế riêng cho từng bé cún hoặc mèo mỗi tháng. Mỗi hộp gồm 4–5 món (Box Tiêu chuẩn) hoặc 6–7 món (Box Premium), kết hợp cân đối giữa: Thức ăn/bánh thưởng dinh dưỡng, đồ chơi kích thích vận động & trí tuệ, cùng vật dụng chăm sóc vệ sinh an toàn. Tất cả đều đến từ thương hiệu uy tín, có nguồn gốc xuất xứ rõ ràng."
  },
  {
    id: "box-2",
    category: "box",
    question: "Làm sao FPETS biết bé nhà tôi bị dị ứng hay không thích món gì?",
    answer: "Trước khi đặt hàng hoặc chọn gói, bạn sẽ hoàn thành bảng trắc nghiệm Pet Quiz (hoặc khai báo trong Pet Profile). Bạn có thể đánh dấu chính xác các thành phần bé bị dị ứng (ví dụ: thịt gà, thịt bò, ngũ cốc, hải sản...). Thuật toán tuyển chọn tự động của FPETS sẽ loại trừ 100% sản phẩm chứa thành phần dị ứng này. Ngoài ra, sau mỗi kỳ nhận hộp, bạn có thể chấm điểm 'Bé thích / Bình thường / Không thích' cho từng món để các kỳ sau hộp quà ngày càng chuẩn xác hơn!"
  },
  {
    id: "box-3",
    category: "box",
    question: "Tổng giá trị các món bên trong hộp có cao hơn giá bán không?",
    answer: "Cam kết chắc chắn là CÓ! Hộp Tiêu chuẩn có giá 299.000₫ nhưng tổng giá trị bán lẻ thực tế của các món bên trong luôn từ 380.000₫ trở lên (tiết kiệm tối thiểu 81.000₫). Hộp Premium có giá 499.000₫ cam kết tổng giá trị thực tế trên 650.000₫ (tiết kiệm tối thiểu 151.000₫)."
  },

  // Subscription (Gói định kỳ)
  {
    id: "sub-1",
    category: "subscription",
    question: "Gói định kỳ hoạt động như thế nào? Có những gói nào?",
    answer: "FPETS cung cấp 3 gói định kỳ trả trước: Gói 1 hộp (Thử nghiệm), Gói 3 hộp (Tiết kiệm 10% + Miễn phí vận chuyển toàn bộ kỳ), và Gói 6 hộp (Tiết kiệm 15% + Miễn phí vận chuyển + Quà tặng sinh nhật độc quyền cho bé). Bạn chỉ thanh toán 1 lần duy nhất lúc đăng ký gói, sau đó hàng tháng hệ thống sẽ tự động giao hộp quà tận nhà theo đợt bạn chọn (Đầu tháng: ngày 1–5, hoặc Giữa tháng: ngày 15–20)."
  },
  {
    id: "sub-2",
    category: "subscription",
    question: "FPETS có tự động trừ tiền trong thẻ của tôi sau khi hết gói không?",
    answer: "TUYỆT ĐỐI KHÔNG! FPETS áp dụng chính sách thanh toán trả trước hoàn toàn minh bạch. Chúng tôi không lưu trữ thông tin thẻ tín dụng và không bao giờ tự ý trừ tiền. Khi gói gần hết (còn 1 hộp cuối), hệ thống sẽ gửi email và thông báo để bạn chủ động quyết định có gia hạn tiếp hay không."
  },
  {
    id: "sub-3",
    category: "subscription",
    question: "Tôi có thể tạm dừng (Pause) hoặc hủy gói (Cancel) khi đi công tác được không?",
    answer: "Hoàn toàn được! Bạn có thể vào mục 'Tài khoản > Gói định kỳ' bất kỳ lúc nào trước ngày chốt kỳ (Cut-off date, trước ngày giao 7 ngày) để chọn 'Tạm dừng 1 hoặc 2 kỳ'. Lịch giao của các hộp còn lại sẽ tự động lùi sang tháng sau. Nếu bạn chọn 'Hủy gói', các hộp bạn đã trả trước vẫn sẽ được tuyển chọn và giao đầy đủ đến tận hộp cuối cùng."
  },

  // Giao hàng & Vận chuyển
  {
    id: "ship-1",
    category: "shipping",
    question: "Phí vận chuyển được tính như thế nào? Khi nào được Freeship?",
    answer: "Phí giao hàng đồng giá 25.000₫ cho khu vực nội thành TP.HCM và Hà Nội; 35.000₫ cho tất cả các tỉnh thành khác trên toàn quốc. ĐẶC BIỆT: Miễn phí vận chuyển 100% cho mọi đơn hàng từ 500.000₫ và cho toàn bộ các kỳ giao của Gói định kỳ 3 hộp và 6 hộp."
  },
  {
    id: "ship-2",
    category: "shipping",
    question: "Sau khi đặt thì bao lâu tôi sẽ nhận được hàng?",
    answer: "Với đơn sản phẩm lẻ và Mystery Box mua 1 lần: Thời gian giao từ 1–2 ngày làm việc tại TP.HCM/Hà Nội, và từ 3–5 ngày với các tỉnh thành khác. Với Gói định kỳ: Hộp quà sẽ được đóng gói và giao đúng vào đợt bạn đã chọn (Đầu tháng: ngày 1–5, hoặc Giữa tháng: ngày 15–20 hàng tháng). Bạn luôn có thể tra cứu hành trình bưu kiện với mã vận đơn qua trang 'Tra cứu đơn'."
  },

  // Đổi trả & Khiếu nại
  {
    id: "ret-1",
    category: "return",
    question: "Chính sách đổi trả trong vòng 3 ngày áp dụng trong những trường hợp nào?",
    answer: "Vì tính chất bất ngờ của Mystery Box, FPETS không hỗ trợ đổi trả vì lý do chủ quan không thích. Tuy nhiên, FPETS cam kết ĐỔI MÓN HOẶC GỬI BÙ MIỄN PHÍ 100% trong vòng 3 ngày sau khi nhận hàng nếu: (1) Món trong hộp dính thành phần dị ứng mà bạn đã khai báo rõ trong Pet Profile, (2) Hàng bị hỏng, rách, vỡ hoặc hết hạn sử dụng trong quá trình vận chuyển, (3) Giao thiếu sản phẩm so với cam kết số món. Khách chỉ cần chụp ảnh gói hàng và bấm 'Yêu cầu đổi / trả' ngay trong chi tiết đơn hàng."
  },
  {
    id: "ret-2",
    category: "return",
    question: "Nếu bé không chịu chơi hoặc không chịu ăn món trong hộp thì sao?",
    answer: "Khẩu vị và tâm lý thú cưng đôi khi cần thời gian làm quen. Bạn hãy vào phần Đánh giá đơn hàng và chấm 'Không thích' cho món đó. Thuật toán của FPETS sẽ ghi nhớ vĩnh viễn và không bao giờ đưa sản phẩm đó (hoặc loại tương tự) vào các kỳ tiếp theo của bé nữa!"
  },

  // Thanh toán
  {
    id: "pay-1",
    category: "payment",
    question: "FPETS hỗ trợ những phương thức thanh toán nào?",
    answer: "Chúng tôi hỗ trợ: (1) Ví điện tử MoMo, (2) Cổng thanh toán VNPay (hỗ trợ quét mã QR mọi ứng dụng ngân hàng, thẻ ATM nội địa, thẻ quốc tế Visa/Mastercard), (3) Thanh toán khi nhận hàng (COD) áp dụng cho đơn mua 1 lần dưới 2.000.000₫. Riêng các Gói định kỳ 1/3/6 hộp yêu cầu thanh toán online trả trước qua MoMo hoặc VNPay."
  },
  {
    id: "pay-2",
    category: "payment",
    question: "Đơn hàng chưa thanh toán online sẽ được giữ trong bao lâu?",
    answer: "Sau khi bấm 'Đặt hàng', bạn sẽ có 30 phút để hoàn tất quét mã hoặc xác nhận thanh toán trên cổng MoMo/VNPay. Hệ thống sẽ tạm giữ tồn kho cho bạn. Quá thời gian 30 phút mà chưa thanh toán, đơn hàng sẽ tự động hủy và số lượng tồn kho được hoàn trả lại trên hệ thống."
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
            Câu Hỏi Thường Gặp
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-box bg-honey-500 hover:bg-honey-600 text-pine-950 font-bold text-xs transition-colors shadow-sm"
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
