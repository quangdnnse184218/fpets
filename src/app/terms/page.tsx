import LegalPage from "@/components/common/LegalPage";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { EXCHANGE_POLICY } from "@/lib/copy";
import { DELIVERY_TIME, SHIPPING_POLICY } from "@/lib/shipping";

export const metadata = {
  title: "Điều khoản dịch vụ",
  description: "Điều khoản khi mua Mystery Box, gói định kỳ và sản phẩm lẻ tại FPETS.",
};

// Nội dung tóm tắt từ docs/SPEC.md (mục 4–7, 10); cần chủ shop duyệt trước khi mở bán
export default function TermsPage() {
  return (
    <LegalPage
      title="Điều khoản dịch vụ"
      updated="29/09/2026"
      intro="Khi đặt hàng hoặc tạo tài khoản tại FPETS, bạn đồng ý với các điều khoản dưới đây."
      sections={[
        {
          title: "Tài khoản",
          items: [
            "Bạn cần tài khoản để đặt hàng. Mystery Box và gói định kỳ gắn với hồ sơ thú cưng trong tài khoản.",
            "Bạn chịu trách nhiệm về thông tin khai trong hồ sơ thú cưng (loài, cân nặng, độ tuổi, dị ứng). FPETS chọn món dựa trên thông tin này.",
          ],
        },
        {
          title: "Đặt hàng và thanh toán",
          items: [
            "Giá, phí ship và giảm giá được hệ thống tính lại khi tạo đơn; số tiền ở bước thanh toán là số tiền cuối cùng.",
            "Thanh toán qua MoMo, VNPay; COD chỉ áp dụng cho đơn mua 1 lần dưới 2.000.000₫.",
            "Đơn thanh toán online chưa hoàn tất sau 30 phút sẽ tự hủy.",
            "Mỗi đơn dùng tối đa 1 voucher; voucher không cộng dồn với giảm giá của gói 3 hoặc 6 hộp.",
          ],
        },
        {
          title: "Gói định kỳ",
          items: [
            "Gói trả trước cho 1, 3 hoặc 6 hộp, giao mỗi tháng 1 hộp. FPETS không tự động trừ tiền.",
            "Ngày chốt là 7 ngày trước đợt giao; thay đổi sau ngày chốt áp dụng từ kỳ sau.",
            "Bạn có thể tạm dừng tối đa 2 kỳ liên tiếp hoặc hủy gói bất kỳ lúc nào. Khi hủy, các hộp đã trả trước vẫn được giao đủ và không hoàn tiền.",
            "Hết hộp mà chưa gia hạn, gói giữ ưu đãi thêm 5 ngày rồi chuyển sang hết hạn.",
          ],
        },
        {
          title: "Giao hàng",
          items: [
            `Giao toàn quốc. ${SHIPPING_POLICY}`,
            DELIVERY_TIME,
          ],
        },
        {
          title: "Đổi trả",
          items: [
            EXCHANGE_POLICY,
            "Sản phẩm lẻ còn nguyên seal được đổi trả trong 7 ngày, khách chịu phí ship.",
            "Gửi yêu cầu bằng nút \"Yêu cầu đổi / trả\" trong chi tiết đơn hàng.",
          ],
        },
        {
          title: "Liên hệ",
          items: [`Hotline ${CONTACT_INFO.hotline}, email ${CONTACT_INFO.email}.`],
        },
      ]}
    />
  );
}
