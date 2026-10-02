"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";

const SUBJECTS = ["Hỏi về Mystery Box", "Tư vấn gói định kỳ", "Đơn hàng và giao hàng", "Đổi trả", "Hợp tác kinh doanh", "Khác"];
const EMPTY = { fullName: "", phone: "", email: "", subject: SUBJECTS[0], message: "" };

const inputClass = (invalid: boolean) =>
  `w-full min-h-11 px-3.5 rounded-box border bg-white text-sm focus:outline-none ${invalid ? "border-red-400 focus:border-red-600" : "border-surface-border focus:border-pine-900"}`;
const labelClass = "text-xs font-bold text-bark-800 block mb-1";

export default function ContactPage() {
  const { user, isLoggedIn } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Khách đã đăng nhập: điền sẵn họ tên, số điện thoại, email từ tài khoản
  useEffect(() => {
    if (!isLoggedIn) return;
    setForm((f) => ({ ...f, fullName: f.fullName || user.name || "", phone: f.phone || user.phone || "", email: f.email || user.email || "" }));
  }, [isLoggedIn, user.name, user.phone, user.email]);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    fullName: form.fullName.trim() ? "" : "Nhập họ tên của bạn.",
    phone: /^0[0-9]{9}$/.test(form.phone) ? "" : "Số điện thoại gồm 10 số, bắt đầu bằng 0.",
    email: !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "" : "Email chưa đúng định dạng.",
    message: form.message.trim().length >= 5 ? "" : "Nhập nội dung, ít nhất 5 ký tự.",
  };
  const hasError = Object.values(errors).some(Boolean);

  // Lưu vào hệ thống để admin xử lý tại mục Đánh giá & Feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTried(true);
    if (hasError) return;
    setSending(true);
    const { error: rpcError } = await createClient().rpc("submit_feedback", {
      p_full_name: form.fullName,
      p_phone: form.phone,
      p_email: form.email,
      p_subject: form.subject,
      p_message: form.message,
    });
    setSending(false);
    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes("ERR_PHONE_INVALID")) return setError("Số điện thoại gồm 10 số, bắt đầu bằng 0.");
      if (msg.includes("ERR_MESSAGE_TOO_SHORT")) return setError("Nội dung cần ít nhất 5 ký tự.");
      if (msg.includes("ERR_TOO_MANY_REQUESTS")) return setError(`Bạn đã gửi nhiều tin trong 1 giờ qua. Cần hỗ trợ gấp, vui lòng gọi ${CONTACT_INFO.hotline}.`);
      return setError(`Chưa gửi được tin nhắn. Vui lòng thử lại hoặc gọi ${CONTACT_INFO.hotline}.`);
    }
    setSubmitted(true);
  };

  const fieldError = (key: keyof typeof errors) =>
    tried && errors[key] ? <p className="mt-1 text-xs font-semibold text-red-700">{errors[key]}</p> : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="space-y-1.5 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Liên hệ FPETS</h1>
        <p className="text-sm text-bark-600">
          Gửi câu hỏi về đơn hàng, gói định kỳ hoặc món phù hợp cho bé. Nhiều câu hỏi đã có sẵn câu trả lời trong{" "}
          <Link href="/faq" className="font-bold text-pine-900 underline underline-offset-2">Câu hỏi thường gặp</Link>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        <div className="p-5 sm:p-6 rounded-container bg-surface-card border border-surface-border">
          {submitted ? (
            <div className="py-8 text-center space-y-3" role="status">
              <h2 className="text-lg font-bold text-pine-950 font-display">Đã nhận tin nhắn của bạn</h2>
              <p className="text-sm text-bark-600 max-w-md mx-auto leading-relaxed">
                FPETS sẽ gọi lại số {form.phone} trong giờ làm việc ({CONTACT_INFO.hours}). Cần hỗ trợ gấp, gọi{" "}
                <a className="font-bold text-pine-900 underline underline-offset-2" href={`tel:${CONTACT_INFO.hotlineTel}`}>{CONTACT_INFO.hotline}</a>.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSubmitted(false);
                  setTried(false);
                  setForm((f) => ({ ...f, subject: SUBJECTS[0], message: "" }));
                }}
              >
                Gửi tin nhắn khác
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <h2 className="text-base font-bold text-pine-950">Gửi tin nhắn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ct-name" className={labelClass}>Họ và tên <span className="text-red-600">*</span></label>
                  <input id="ct-name" type="text" autoComplete="name" maxLength={120} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={tried && !!errors.fullName} className={inputClass(tried && !!errors.fullName)} />
                  {fieldError("fullName")}
                </div>
                <div>
                  <label htmlFor="ct-phone" className={labelClass}>Số điện thoại <span className="text-red-600">*</span></label>
                  <input id="ct-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\s/g, ""))} placeholder="0912345678" aria-invalid={tried && !!errors.phone} className={inputClass(tried && !!errors.phone)} />
                  {fieldError("phone")}
                </div>
                <div>
                  <label htmlFor="ct-email" className={labelClass}>Email (không bắt buộc)</label>
                  <input id="ct-email" type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={tried && !!errors.email} className={inputClass(tried && !!errors.email)} />
                  {fieldError("email")}
                </div>
                <div>
                  <label htmlFor="ct-subject" className={labelClass}>Chủ đề</label>
                  <select id="ct-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass(false)}>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ct-message" className={labelClass}>Nội dung <span className="text-red-600">*</span></label>
                <textarea
                  id="ct-message"
                  rows={5}
                  maxLength={3000}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Nếu hỏi về đơn hàng, vui lòng ghi kèm mã đơn (FPET-…)."
                  aria-invalid={tried && !!errors.message}
                  className={`${inputClass(tried && !!errors.message)} py-2.5 leading-relaxed`}
                />
                {fieldError("message")}
              </div>
              {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
              <Button type="submit" loading={sending} loadingText="Đang gửi…" className="w-full sm:w-auto">Gửi tin nhắn</Button>
            </form>
          )}
        </div>

        <aside className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4">
          <h2 className="text-base font-bold text-pine-950">Thông tin liên hệ</h2>
          <dl className="space-y-3.5 text-sm">
            <div className="flex gap-3">
              <Phone className="w-4 h-4 text-pine-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs text-bark-500">Hotline</dt>
                <dd><a href={`tel:${CONTACT_INFO.hotlineTel}`} className="font-bold text-pine-950 hover:underline">{CONTACT_INFO.hotline}</a></dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="w-4 h-4 text-pine-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs text-bark-500">Email</dt>
                <dd><a href={`mailto:${CONTACT_INFO.email}`} className="font-bold text-pine-950 hover:underline break-all">{CONTACT_INFO.email}</a></dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="w-4 h-4 text-pine-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs text-bark-500">Giờ làm việc</dt>
                <dd className="text-bark-800">{CONTACT_INFO.hours}, tất cả các ngày</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="w-4 h-4 text-pine-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <dt className="text-xs text-bark-500">Địa chỉ</dt>
                <dd className="text-bark-800 leading-relaxed">{CONTACT_INFO.address}</dd>
              </div>
            </div>
          </dl>
          {(CONTACT_INFO.zaloUrl || CONTACT_INFO.messengerUrl) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {CONTACT_INFO.zaloUrl && (
                <a href={CONTACT_INFO.zaloUrl} target="_blank" rel="noopener noreferrer" className="min-h-10 px-4 inline-flex items-center rounded-box border border-surface-border text-sm font-bold text-pine-950 hover:bg-surface-muted">Chat Zalo</a>
              )}
              {CONTACT_INFO.messengerUrl && (
                <a href={CONTACT_INFO.messengerUrl} target="_blank" rel="noopener noreferrer" className="min-h-10 px-4 inline-flex items-center rounded-box border border-surface-border text-sm font-bold text-pine-950 hover:bg-surface-muted">Chat Messenger</a>
              )}
            </div>
          )}
          <p className="pt-3 border-t border-surface-border text-xs text-bark-600 leading-relaxed">
            Đổi trả đơn đã nhận: gửi yêu cầu ngay trong{" "}
            <Link href="/my-account/orders" className="font-bold text-pine-900 underline underline-offset-2">Đơn hàng của tôi</Link> để được xử lý nhanh hơn. Xem{" "}
            <Link href="/return-policy" className="font-bold text-pine-900 underline underline-offset-2">chính sách đổi trả</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
}
