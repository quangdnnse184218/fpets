import React from "react";
import Image from "next/image";
import { Cookie, MailOpen, SprayCan, Volleyball } from "lucide-react";
import { BUSINESS, productAssurances } from "@/config/business";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { PREMIUM_ITEMS, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";

export const metadata = {
  title: "Về FPETS",
  description: "FPETS làm Mystery Box cho chó mèo: đồ ăn, đồ chơi và món chăm sóc chọn riêng theo loài, cân nặng và dị ứng của từng bé.",
};

const PRINCIPLES = [
  {
    title: "Chọn món sau khi có đơn, không đóng sẵn",
    text: "Mỗi hộp được chọn riêng cho một bé. Ví dụ bé 8 kg dị ứng gà sẽ không nhận món có gà, đồ chơi cũng đúng cỡ miệng của bé.",
  },
  {
    title: "Dị ứng là điều kiện bắt buộc",
    text: "Món có thành phần bé dị ứng bị loại ngay từ bước chọn. Nếu vẫn có sai sót, FPETS đổi món hoặc hoàn tiền món đó.",
  },
  {
    title: "Hộp sau hợp hơn hộp trước",
    text: "Bạn chấm từng món bé thích hay không. FPETS tránh gửi lại món bé không thích và món đã gửi ở hộp trước.",
  },
  {
    title: "Không tự trừ tiền",
    text: "Mua thử 1 hộp trước. Gói định kỳ trả trước một lần, hết gói bạn chủ động gia hạn. Tạm dừng hoặc hủy ngay trong tài khoản; khi hủy, các hộp đã trả vẫn được giao đủ và không hoàn tiền.",
  },
];

const BOX_CONTENTS = [
  { icon: Cookie, title: "Đồ ăn, bánh thưởng", text: "Thịt sấy, pate, hạt hoặc bánh quy, theo loài và độ tuổi của bé." },
  { icon: Volleyball, title: "Đồ chơi", text: "Đồ chơi vận động hoặc tương tác, đúng cỡ với cân nặng của bé." },
  { icon: SprayCan, title: "Chăm sóc, phụ kiện", text: "Một món dùng hằng ngày như khăn lau, lược chải lông, xịt khử mùi." },
  // Thiệp chỉ hiện khi cửa hàng xác nhận có kèm thiệp trong hộp (src/config/business.ts)
  ...(BUSINESS.nameCard ? [{ icon: MailOpen, title: "Thiệp tên bé", text: BUSINESS.nameCard }] : []),
];

export default function AboutPage() {
  // Cam kết về nguồn gốc, hạn dùng, tư vấn thú y: chỉ hiện các dòng cửa hàng đã điền trong src/config/business.ts
  const assurances = productAssurances();
  return (
    <div className="pb-12 sm:pb-16">
      <section className="bg-surface-card border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="space-y-4">
            <h1 className="text-[30px] sm:text-[36px] lg:text-[44px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.25]">
              FPETS làm hộp quà riêng cho từng bé chó, mèo
            </h1>
            <p className="text-base text-bark-700 leading-relaxed">
              Thay vì đứng trước kệ hàng và đoán bé thích gì, bạn cho FPETS biết về bé một lần: loài, cân nặng, tuổi, dị ứng, sở thích. FPETS chọn đồ ăn, đồ chơi và món chăm sóc hợp với bé rồi gửi tới nhà: mua thử 1 hộp, hoặc đăng ký gói để mỗi tháng bé nhận một hộp.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <ButtonLink href="/boxes" size="lg">Xem các loại hộp</ButtonLink>
              <ButtonLink href="/quiz" variant="secondary" size="lg">Làm {QUIZ_NAME}</ButtonLink>
            </div>
          </div>
          {/* Ảnh hộp tạm; thay bằng ảnh chụp hộp thật khi có */}
          <div className="relative aspect-[4/3] rounded-container overflow-hidden border border-surface-border bg-surface-muted">
            <Image
              src="/images/hero/fpets-box-open.jpg"
              alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-12 sm:space-y-16">
        <section aria-labelledby="principles-heading" className="space-y-5">
          <h2 id="principles-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Cách FPETS làm việc</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="p-5 rounded-container bg-surface-card border border-surface-border">
                <p className="text-xs font-bold text-bark-600 font-display">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1.5 text-base font-bold text-pine-950">{p.title}</h3>
                <p className="mt-1.5 text-sm text-bark-700 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="contents-heading" className="space-y-5">
          <div className="space-y-1.5 max-w-2xl">
            <h2 id="contents-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Trong một hộp có gì</h2>
            <p className="text-sm text-bark-700">
              Box Tiêu chuẩn có {STANDARD_ITEMS}, Box Premium có {PREMIUM_ITEMS}. Tổng giá bán lẻ các món luôn cao hơn giá hộp.
            </p>
          </div>
          <dl className={`rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border sm:divide-y-0 sm:grid sm:divide-x ${BOX_CONTENTS.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {BOX_CONTENTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-5">
                <span className="w-10 h-10 rounded-box bg-honey-100 text-honey-700 flex items-center justify-center" aria-hidden="true">
                  <Icon className="w-5 h-5" />
                </span>
                <dt className="mt-3 text-sm font-bold text-pine-950">{title}</dt>
                <dd className="mt-1.5 text-sm text-bark-700 leading-relaxed">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {assurances.length > 0 && (
          <section aria-labelledby="assurance-heading" className="space-y-5">
            <h2 id="assurance-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Về sản phẩm trong hộp</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {assurances.map((a) => (
                <div key={a.title} className="p-5 rounded-container bg-surface-card border border-surface-border">
                  <dt className="text-sm font-bold text-pine-950">{a.title}</dt>
                  <dd className="mt-1.5 text-sm text-bark-700 leading-relaxed">{a.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="contact-heading" className="p-5 sm:p-7 rounded-container bg-pine-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 id="contact-heading" className="text-lg sm:text-xl font-bold font-display">Cần hỏi thêm về FPETS?</h2>
            <p className="text-sm text-pine-200">
              Hotline {CONTACT_INFO.hotline} ({CONTACT_INFO.hours} hằng ngày) · {CONTACT_INFO.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <ButtonLink href="/contact" variant="secondary">Liên hệ</ButtonLink>
            <ButtonLink href="/faq" variant="secondary">Câu hỏi thường gặp</ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
