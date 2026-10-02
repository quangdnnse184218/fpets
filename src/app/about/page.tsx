import React from "react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { PREMIUM_ITEMS, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";

export const metadata = {
  title: "Về FPETS",
  description: "FPETS làm Mystery Box cho chó mèo, chọn món theo hồ sơ của từng bé.",
};

const PRINCIPLES = [
  {
    title: "Chọn theo hồ sơ, không đóng sẵn",
    text: "Mỗi hộp được chọn món sau khi có đơn, dựa trên loài, cân nặng, độ tuổi, dị ứng và sở thích bạn khai cho bé.",
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
    title: "Không ràng buộc",
    text: "Mua thử 1 hộp trước. Gói định kỳ trả trước, không tự trừ tiền; tạm dừng hoặc hủy ngay trong tài khoản.",
  },
];

const BOX_CONTENTS = [
  { title: "Đồ ăn, bánh thưởng", text: "Thịt sấy, pate, hạt hoặc bánh quy, theo loài và độ tuổi của bé." },
  { title: "Đồ chơi", text: "Đồ chơi vận động hoặc tương tác, đúng cỡ với cân nặng của bé." },
  { title: "Chăm sóc, phụ kiện", text: "Một món dùng hằng ngày như khăn lau, lược chải lông, xịt khử mùi." },
  { title: "Thiệp tên bé", text: "Thiệp ghi tên bé và danh sách các món trong hộp." },
];

export default function AboutPage() {
  return (
    <div className="pb-12 sm:pb-16">
      <section className="bg-surface-card border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.15]">
              FPETS làm hộp quà riêng cho từng bé chó, mèo.
            </h1>
            <p className="text-base text-bark-700 leading-relaxed">
              Thay vì đứng trước kệ hàng và đoán bé thích gì, bạn khai hồ sơ của bé một lần. Mỗi tháng FPETS chọn đồ ăn, đồ chơi và món chăm sóc hợp với bé rồi gửi tới nhà.
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-12 sm:space-y-16">
        <section aria-labelledby="principles-heading" className="space-y-5">
          <h2 id="principles-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Cách FPETS làm việc</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="p-5 rounded-container bg-surface-card border border-surface-border">
                <p className="text-xs font-bold text-bark-500 font-display">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1.5 text-base font-bold text-pine-950">{p.title}</h3>
                <p className="mt-1.5 text-sm text-bark-600 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="contents-heading" className="space-y-5">
          <div className="space-y-1.5 max-w-2xl">
            <h2 id="contents-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Trong một hộp có gì</h2>
            <p className="text-sm text-bark-600">
              Box Tiêu chuẩn có {STANDARD_ITEMS}, Box Premium có {PREMIUM_ITEMS}. Tổng giá bán lẻ các món luôn cao hơn giá hộp.
            </p>
          </div>
          <dl className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:divide-x">
            {BOX_CONTENTS.map((c) => (
              <div key={c.title} className="p-5">
                <dt className="text-sm font-bold text-pine-950">{c.title}</dt>
                <dd className="mt-1.5 text-sm text-bark-600 leading-relaxed">{c.text}</dd>
              </div>
            ))}
          </dl>
        </section>

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
