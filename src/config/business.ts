// Thông tin nghiệp vụ dùng chung cho câu chữ trên toàn site.
//
// QUY ƯỚC: mục để `null` là CHƯA có số liệu thật từ cửa hàng. Giao diện không hiển thị mục đó
// (không điền số phỏng đoán). Tìm "CẦN CỬA HÀNG ĐIỀN" để thấy các mục còn thiếu; điền xong là
// nội dung tự hiện ở mọi trang đang dùng.
//
// Các số liệu ĐÃ có nguồn riêng, không lặp lại ở đây:
//  - Mức giảm gói định kỳ: bảng subscription_plans (admin sửa ở trang Loại Mystery Box), đọc qua usePlans().
//  - Phí ship và thời gian giao: src/lib/shipping.ts (bản sao của hàm calc_shipping_fee ở server).

export const BUSINESS = {
  // Nơi gửi hàng, ví dụ: "kho FPETS tại TP.HCM". CẦN CỬA HÀNG ĐIỀN.
  // Lưu ý: địa chỉ liên hệ hiện ghi Hà Nội nhưng phí ship đang ưu đãi cho địa chỉ tại TP.HCM (SPEC §6).
  shipFrom: null as string | null,

  // Cam kết sản phẩm. CẦN CỬA HÀNG ĐIỀN (để null thì khối "Về sản phẩm" không hiện dòng đó).
  // Ví dụ: "Hàng chính hãng, nhập từ nhà phân phối có hóa đơn"
  productOrigin: null as string | null,
  // Ví dụ: "Đồ ăn còn hạn dùng ít nhất 3 tháng khi giao"
  minShelfLife: null as string | null,
  // Ví dụ: "Danh mục món ăn được bác sĩ thú y tư vấn". Không có tư vấn thú y thì để null.
  vetAdvice: null as string | null,

  // Thiệp trong hộp. CẦN CỬA HÀNG ĐIỀN: nếu mỗi hộp có kèm thiệp ghi tên bé thì điền mô tả,
  // ví dụ: "Thiệp ghi tên bé và danh sách các món trong hộp."
  // Để null thì trang Về FPETS và Pet Quiz không nhắc tới thiệp (hệ thống hiện chưa có bước in thiệp).
  nameCard: null as string | null,

  // Hộp được chọn nhiều nhất: slug trong bảng box_types, ví dụ "box-tieu-chuan-cho-nho".
  // Để null khi chưa đủ dữ liệu bán hàng thật; nhãn "Được chọn nhiều nhất" sẽ không hiện.
  bestSellerBoxSlug: null as string | null,

  // Gói định kỳ được chọn nhiều nhất (số hộp: 1, 3 hoặc 6). CẦN CỬA HÀNG ĐIỀN khi có số liệu bán thật.
  // Để null thì gói 3 hộp chỉ ghi "FPETS gợi ý", không ghi "Được chọn nhiều nhất".
  mostChosenPlanCycles: null as number | null,
};

// Chính sách hủy gói định kỳ đã chốt theo SPEC §5 và đúng với cách hệ thống đang chạy:
// không hoàn tiền, các hộp đã trả trước vẫn được giao đủ. Câu chữ nằm ở src/lib/copy.ts (CANCEL_POLICY).

/** Các dòng cam kết sản phẩm đã có dữ liệu; rỗng thì không hiện khối này. */
export function productAssurances(): { title: string; text: string }[] {
  return [
    BUSINESS.productOrigin && { title: "Nguồn gốc", text: BUSINESS.productOrigin },
    BUSINESS.minShelfLife && { title: "Hạn dùng", text: BUSINESS.minShelfLife },
    BUSINESS.vetAdvice && { title: "Tư vấn thú y", text: BUSINESS.vetAdvice },
  ].filter((x): x is { title: string; text: string } => !!x);
}
