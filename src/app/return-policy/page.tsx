import type { Metadata } from "next";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { CANCEL_POLICY, DISLIKE_POLICY_SHORT } from "@/lib/copy";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Chính sách đổi trả",
  description: "Trường hợp được đổi món, hoàn tiền, thời hạn và cách gửi yêu cầu đổi trả tại FPETS.",
};

// Nội dung theo docs/SPEC.md §10 và đúng với quy tắc hệ thống đang chạy (hạn 3 ngày / 7 ngày, mỗi đơn 1 yêu cầu)
const CASES = [
  { situation: "Món chứa thành phần dị ứng đã khai trong hồ sơ thú cưng", resolution: "Đổi món khác miễn phí, hoặc hoàn tiền món đó", deadline: "3 ngày sau khi nhận" },
  { situation: "Hàng hỏng, vỡ, hết hạn sử dụng", resolution: "Đổi món mới miễn phí, hoặc hoàn tiền món đó", deadline: "3 ngày sau khi nhận" },
  { situation: "Giao thiếu món so với danh sách trong hộp", resolution: "Gửi bù món thiếu miễn phí", deadline: "3 ngày sau khi nhận" },
  { situation: "Sản phẩm lẻ còn nguyên seal, muốn đổi hoặc trả", resolution: "Đổi sản phẩm khác hoặc hoàn tiền; khách chịu phí ship chiều gửi lại", deadline: "7 ngày sau khi nhận" },
  { situation: "Bé chưa thích một món trong Mystery Box", resolution: DISLIKE_POLICY_SHORT, deadline: "—" },
];

const STEPS = [
  { title: "Mở chi tiết đơn", text: "Vào Tài khoản → Đơn hàng, chọn đơn đã giao." },
  { title: "Gửi yêu cầu", text: "Bấm “Yêu cầu đổi / trả”, chọn lý do và mô tả ngắn. Mỗi đơn gửi được 1 yêu cầu." },
  { title: "FPETS liên hệ", text: "FPETS gọi hoặc nhắn Zalo để nhận ảnh hoặc video mở hộp và xác nhận cách xử lý." },
  { title: "Nhận kết quả", text: "FPETS gửi đổi món, gửi bù hoặc hoàn tiền. Kết quả hiện trong chi tiết đơn và mục Thông báo." },
];

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
      <header className="space-y-2 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Chính sách đổi trả</h1>
        <p className="text-sm text-bark-700 leading-relaxed">
          FPETS đổi món hoặc hoàn tiền khi lỗi thuộc về FPETS. Mystery Box là hộp quà bất ngờ nên không đổi trả vì bé không thích món; bạn chấm “Không thích” để hộp sau không gửi lại món đó. Sản phẩm lẻ còn nguyên seal được đổi trả trong 7 ngày.
        </p>
      </header>

      <section aria-labelledby="cases-heading" className="space-y-3">
        <h2 id="cases-heading" className="text-lg font-extrabold text-pine-950 font-display">Trường hợp và cách xử lý</h2>
        {/* Bảng trên màn hình rộng, thẻ xếp dọc trên điện thoại */}
        <div className="hidden sm:block rounded-container bg-surface-card border border-surface-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border text-xs font-bold text-bark-600 uppercase tracking-wide">
                <th scope="col" className="p-3.5 w-[38%]">Trường hợp</th>
                <th scope="col" className="p-3.5">FPETS xử lý</th>
                <th scope="col" className="p-3.5 w-[22%]">Hạn báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-bark-700">
              {CASES.map((c) => (
                <tr key={c.situation}>
                  <th scope="row" className="p-3.5 font-semibold text-pine-950 align-top">{c.situation}</th>
                  <td className="p-3.5 align-top">{c.resolution}</td>
                  <td className="p-3.5 align-top">{c.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="sm:hidden space-y-2.5">
          {CASES.map((c) => (
            <li key={c.situation} className="p-4 rounded-container bg-surface-card border border-surface-border space-y-1.5 text-sm">
              <p className="font-semibold text-pine-950">{c.situation}</p>
              <p className="text-bark-700">{c.resolution}</p>
              {c.deadline !== "—" && <p className="text-sm text-bark-600">Hạn báo: {c.deadline}</p>}
            </li>
          ))}
        </ul>
        <p className="text-sm text-bark-600">Hạn tính từ thời điểm đơn chuyển sang “Đã giao”. Đơn có cả hộp và sản phẩm lẻ áp dụng hạn 7 ngày.</p>
      </section>

      <section aria-labelledby="steps-heading" className="space-y-4">
        <h2 id="steps-heading" className="text-lg font-extrabold text-pine-950 font-display">Cách gửi yêu cầu</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3 lg:block">
                <span className="w-8 h-8 rounded-full bg-pine-900 text-white text-sm font-extrabold flex items-center justify-center shrink-0 relative z-10">{i + 1}</span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="hidden lg:block absolute top-4 left-8 right-[-20px] h-px bg-pine-800/30" />}
                <h3 className="text-sm font-bold text-pine-950 lg:mt-3">{s.title}</h3>
              </div>
              <p className="mt-1 text-sm text-bark-700 leading-relaxed pl-11 lg:pl-0">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <ButtonLink href="/my-account/orders" prefetch={false}>Mở Đơn hàng của tôi</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Liên hệ FPETS</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="notes-heading" className="space-y-2.5">
        <h2 id="notes-heading" className="text-lg font-extrabold text-pine-950 font-display">Lưu ý</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-bark-700 leading-relaxed">
          <li>Giữ lại sản phẩm và bao bì cho tới khi FPETS xử lý xong yêu cầu.</li>
          <li>Hoàn tiền chuyển về tài khoản ngân hàng hoặc ví bạn cung cấp khi FPETS liên hệ.</li>
          <li>Gói định kỳ: {CANCEL_POLICY}</li>
          <li>
            Quá hạn báo hoặc cần hỗ trợ thêm, gọi <a href={`tel:${CONTACT_INFO.hotlineTel}`} className="font-bold text-pine-900 underline underline-offset-2">{CONTACT_INFO.hotline}</a> ({CONTACT_INFO.hours} hằng ngày).
          </li>
        </ul>
      </section>
    </div>
  );
}
