// 34 tỉnh/thành theo Nghị quyết sắp xếp đơn vị hành chính 2025 (hiệu lực 01/07/2025).
// Không còn cấp quận/huyện: địa chỉ gồm Tỉnh/Thành → Phường/Xã → Số nhà, đường.
export const VN_PROVINCES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Hải Phòng",
  "Đà Nẵng",
  "Cần Thơ",
  "Huế",
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lạng Sơn",
  "Lào Cai",
  "Lâm Đồng",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
];

// Tỉnh/thành cũ đã nhập vào từng tỉnh/thành mới (Nghị quyết 202/2025/QH15).
// Hiện kèm trong ô chọn để khách ở tỉnh cũ (ví dụ Bình Dương, Long An) biết phải chọn mục nào.
// 11 tỉnh/thành không có trong bảng này là các đơn vị giữ nguyên.
export const VN_MERGED_FROM: Record<string, string[]> = {
  "TP. Hồ Chí Minh": ["Bình Dương", "Bà Rịa - Vũng Tàu"],
  "Hải Phòng": ["Hải Dương"],
  "Đà Nẵng": ["Quảng Nam"],
  "Cần Thơ": ["Sóc Trăng", "Hậu Giang"],
  "An Giang": ["Kiên Giang"],
  "Bắc Ninh": ["Bắc Giang"],
  "Cà Mau": ["Bạc Liêu"],
  "Đắk Lắk": ["Phú Yên"],
  "Đồng Nai": ["Bình Phước"],
  "Đồng Tháp": ["Tiền Giang"],
  "Gia Lai": ["Bình Định"],
  "Hưng Yên": ["Thái Bình"],
  "Khánh Hòa": ["Ninh Thuận"],
  "Lào Cai": ["Yên Bái"],
  "Lâm Đồng": ["Đắk Nông", "Bình Thuận"],
  "Ninh Bình": ["Hà Nam", "Nam Định"],
  "Phú Thọ": ["Vĩnh Phúc", "Hòa Bình"],
  "Quảng Ngãi": ["Kon Tum"],
  "Quảng Trị": ["Quảng Bình"],
  "Tây Ninh": ["Long An"],
  "Thái Nguyên": ["Bắc Kạn"],
  "Tuyên Quang": ["Hà Giang"],
  "Vĩnh Long": ["Bến Tre", "Trà Vinh"],
};

/** Tên hiện trong ô chọn tỉnh/thành: "TP. Hồ Chí Minh (gồm Bình Dương, Bà Rịa - Vũng Tàu cũ)" */
export function provinceLabel(province: string): string {
  const merged = VN_MERGED_FROM[province];
  return merged ? `${province} (gồm ${merged.join(", ")} cũ)` : province;
}
