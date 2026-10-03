import type { Metadata } from "next";

// Trang là client component nên đặt tiêu đề tab ở layout của route
export const metadata: Metadata = {
  title: "Gói định kỳ",
  description: "Trả trước 1, 3 hoặc 6 hộp, mỗi tháng bé nhận 1 hộp. Gói 3 và 6 hộp có giá mỗi hộp thấp hơn và miễn phí vận chuyển. Không tự động trừ tiền; hủy lúc nào cũng được, hộp đã trả vẫn giao đủ.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
