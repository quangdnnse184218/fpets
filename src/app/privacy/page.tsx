import LegalPage from "@/components/common/LegalPage";
import { CONTACT_INFO } from "@/lib/contactInfo";

export const metadata = {
  title: "Chính sách bảo mật",
  description: "FPETS thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn như thế nào.",
};

// Mô tả đúng dữ liệu hệ thống đang lưu (profiles, pets, orders, reviews); cần chủ shop duyệt trước khi mở bán
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Chính sách bảo mật"
      updated="29/09/2026"
      intro="Chính sách này mô tả thông tin FPETS thu thập khi bạn dùng website và cách chúng tôi sử dụng thông tin đó."
      sections={[
        {
          title: "Thông tin chúng tôi thu thập",
          items: [
            "Tài khoản: họ tên, email, số điện thoại, mật khẩu (được mã hóa, FPETS không đọc được).",
            "Giao hàng: tên người nhận, số điện thoại, địa chỉ.",
            "Hồ sơ thú cưng: tên, loài, cân nặng, độ tuổi, giống, ngày sinh, dị ứng, sở thích và đánh giá từng món.",
            "Đơn hàng, gói định kỳ, đánh giá và ảnh bạn tải lên.",
          ],
        },
        {
          title: "Mục đích sử dụng",
          items: [
            "Xử lý đơn hàng, giao hàng và hỗ trợ đổi trả.",
            "Chọn món cho Mystery Box theo hồ sơ thú cưng, tránh thành phần bé bị dị ứng.",
            "Gửi thông báo về đơn hàng, nhắc gia hạn gói và mời đánh giá.",
          ],
        },
        {
          title: "Chia sẻ thông tin",
          items: [
            "FPETS không bán thông tin cá nhân.",
            "Tên, số điện thoại và địa chỉ được chuyển cho đơn vị vận chuyển để giao hàng.",
            "Thanh toán online do MoMo, VNPay xử lý; FPETS không lưu số thẻ của bạn.",
          ],
        },
        {
          title: "Lưu trữ và bảo vệ",
          items: [
            "Dữ liệu lưu trên hạ tầng có mã hóa kết nối; mỗi khách chỉ xem và sửa được dữ liệu của chính mình.",
            "Đánh giá bạn đăng hiển thị công khai kèm tên hiển thị của bạn.",
          ],
        },
        {
          title: "Quyền của bạn",
          items: [
            "Xem và sửa thông tin tài khoản, sổ địa chỉ và hồ sơ thú cưng trong mục Tài khoản.",
            `Yêu cầu xóa tài khoản hoặc dữ liệu: gửi email tới ${CONTACT_INFO.email}.`,
          ],
        },
      ]}
    />
  );
}
