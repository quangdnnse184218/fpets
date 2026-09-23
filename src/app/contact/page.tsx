"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    subject: "Hỏi về Mystery Box",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-900 text-xs font-bold">
            <MessageCircle className="w-3.5 h-3.5 text-pine-800" />
            <span>Liên hệ & Chăm sóc khách hàng</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display">
            Chúng Tôi Luôn Lắng Nghe Bạn
          </h1>
          <p className="text-xs sm:text-sm text-bark-600">
            Có thắc mắc về đơn hàng, gói quà hay cần tư vấn khẩu vị cho bé cưng? Đội ngũ FPETS sẵn sàng hỗ trợ bạn nhanh chóng.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: Thông tin liên hệ trực tiếp & Giờ làm việc (5 cột) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-container bg-pine-950 text-pine-100 border border-pine-900 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-white font-display">
                Kênh liên hệ trực tiếp
              </h2>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-box bg-pine-850 flex items-center justify-center shrink-0 text-grass-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-pine-400 block text-xs">Tổng đài hỗ trợ:</span>
                    <a href="tel:19006868" className="font-bold text-white hover:text-honey-400 text-base">
                      1900 6868
                    </a>
                    <span className="text-[11px] text-pine-400 block mt-0.5">(Cước gọi 1.000đ/phút)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-box bg-pine-850 flex items-center justify-center shrink-0 text-grass-400">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-pine-400 block text-xs">Zalo Doanh Nghiệp (OA):</span>
                    <strong className="text-white block text-sm">FPETS Official</strong>
                    <span className="text-[11px] text-pine-400 block mt-0.5">Phản hồi tin nhắn trong vòng 15 phút</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-box bg-pine-850 flex items-center justify-center shrink-0 text-grass-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-pine-400 block text-xs">Email CSKH:</span>
                    <a href="mailto:hotro@fpets.vn" className="font-medium text-white hover:text-honey-400">
                      hotro@fpets.vn
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-box bg-pine-850 flex items-center justify-center shrink-0 text-grass-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-pine-400 block text-xs">Văn phòng vận hành:</span>
                    <span className="text-pine-200 block text-xs leading-relaxed">
                      Số 24 ngõ 105 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-2 border-t border-pine-800">
                  <div className="w-9 h-9 rounded-box bg-pine-850 flex items-center justify-center shrink-0 text-honey-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-pine-400 block text-xs">Khung giờ phục vụ:</span>
                    <span className="font-bold text-white block">8:00 – 21:00</span>
                    <span className="text-[11px] text-pine-400 block">Tất cả các ngày trong tuần (kể cả Thứ 7 & CN)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Thẻ cam kết */}
            <div className="p-4 rounded-box bg-surface-card border border-surface-border flex items-center gap-3 text-xs text-bark-700">
              <ShieldCheck className="w-5 h-5 text-grass-700 shrink-0" />
              <span>Mọi yêu cầu đổi món do dị ứng đều được tiếp nhận và xử lý trong vòng <strong>24 giờ</strong>.</span>
            </div>
          </div>

          {/* CỘT PHẢI: Form gửi tin nhắn liên hệ (7 cột) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-container bg-surface-card border border-surface-border shadow-xs">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-grass-100 text-grass-800 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-pine-950 font-display">
                    Cảm ơn bạn đã liên hệ với FPETS!
                  </h3>
                  <p className="text-sm text-bark-600 max-w-md mx-auto leading-relaxed">
                    Yêu cầu của bạn đã được chuyển đến bộ phận CSKH. Chúng tôi sẽ liên hệ lại qua số điện thoại hoặc email của bạn trong thời gian sớm nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ fullName: "", phone: "", email: "", subject: "Hỏi về Mystery Box", message: "" });
                    }}
                    className="inline-flex px-4 py-2 rounded-box bg-pine-900 text-white text-xs font-bold hover:bg-pine-800 transition-colors"
                  >
                    Gửi yêu cầu khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-lg font-bold text-pine-950 font-display border-b border-surface-border pb-3">
                    Gửi tin nhắn trực tuyến
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-bark-800">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full px-3.5 py-2.5 rounded-box border border-surface-border bg-white text-xs text-bark-900 focus:outline-none focus:border-pine-800 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-bark-800">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ví dụ: 0912 345 678"
                        className="w-full px-3.5 py-2.5 rounded-box border border-surface-border bg-white text-xs text-bark-900 focus:outline-none focus:border-pine-800 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-bark-800">
                        Địa chỉ Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@example.com"
                        className="w-full px-3.5 py-2.5 rounded-box border border-surface-border bg-white text-xs text-bark-900 focus:outline-none focus:border-pine-800 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-bark-800">
                        Chủ đề cần hỗ trợ
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-box border border-surface-border bg-white text-xs text-bark-900 focus:outline-none focus:border-pine-800 shadow-2xs"
                      >
                        <option value="Hỏi về Mystery Box">Hỏi về Mystery Box</option>
                        <option value="Tư vấn gói định kỳ 1/3/6">Tư vấn gói định kỳ 1/3/6</option>
                        <option value="Tra cứu tiến độ đơn hàng">Tra cứu tiến độ đơn hàng</option>
                        <option value="Yêu cầu đổi trả món dị ứng">Yêu cầu đổi trả món dị ứng</option>
                        <option value="Hợp tác kinh doanh">Hợp tác kinh doanh</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-bark-800">
                      Nội dung tin nhắn <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Mô tả chi tiết câu hỏi hoặc vấn đề của bạn..."
                      className="w-full p-3.5 rounded-box border border-surface-border bg-white text-xs text-bark-900 focus:outline-none focus:border-pine-800 shadow-2xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {loading ? (
                      <span>Đang gửi tin nhắn...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi tin nhắn ngay</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
