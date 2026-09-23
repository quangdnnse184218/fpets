export interface BoxType {
  id: string;
  name: string;
  slug: string;
  species: 'dog' | 'cat';
  size: 'small' | 'large';
  sizeLabel: string;
  itemCount: string;
  minRetailValue: number;
  basePrice: number;
  description: string;
  highlight: string;
  imagePlaceholderColor: string;
  // TODO: thay bằng ảnh thật của FPETS khi có
  imageUrl: string;
  typicalItems: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  cycles: number;
  discountPercent: number;
  freeShipping: boolean;
  birthdayGift: boolean;
  badge?: string;
  description: string;
}

export const BOX_TYPES: BoxType[] = [
  {
    id: "box-std-dog-small",
    name: "Box Tiêu chuẩn cho Chó nhỏ",
    slug: "box-tieu-chuan-cho-nho",
    species: "dog",
    size: "small",
    sizeLabel: "Dưới 10 kg (Poodle, Phốc, Corgi...)",
    itemCount: "4–5 món",
    minRetailValue: 380000,
    basePrice: 299000,
    description: "Hộp quà tuyển chọn riêng gồm bánh thưởng dinh dưỡng, đồ chơi kích thước vừa miệng và vật dụng vệ sinh an toàn cho các bé cún nhỏ.",
    highlight: "Tiết kiệm tối thiểu 81.000₫ so với mua lẻ",
    imagePlaceholderColor: "#E1EDE8",
    // TODO: thay bằng ảnh thật của FPETS khi có
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80",
    typicalItems: ["Snack thịt sấy giòn", "Bánh quy sạch răng", "Bóng phát tiếng kêu nhỏ", "Khăn lau tai mắt dịu nhẹ"]
  },
  {
    id: "box-std-dog-large",
    name: "Box Tiêu chuẩn cho Chó lớn",
    slug: "box-tieu-chuan-cho-lon",
    species: "dog",
    size: "large",
    sizeLabel: "Từ 10 kg trở lên (Golden, Husky, Alaska...)",
    itemCount: "4–5 món",
    minRetailValue: 380000,
    basePrice: 299000,
    description: "Hộp quà dành riêng cho các bé cún lớn với đồ chơi chịu lực gặm cao, thức ăn bổ sung canxi và phụ kiện chịu tải chắc chắn.",
    highlight: "Đồ chơi siêu dai chịu lực kéo khỏe",
    imagePlaceholderColor: "#E1EDE8",
    // TODO: thay bằng ảnh thật của FPETS khi có
    imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80",
    typicalItems: ["Gặm xương sạch răng size L", "Dây thừng kéo co siêu bền", "Thịt sấy giàu đạm", "Xịt khử mùi chân lông"]
  },
  {
    id: "box-std-cat",
    name: "Box Tiêu chuẩn cho Mèo",
    slug: "box-tieu-chuan-meo",
    species: "cat",
    size: "small",
    sizeLabel: "Mọi kích cỡ mèo cưng",
    itemCount: "4–5 món",
    minRetailValue: 380000,
    basePrice: 299000,
    description: "Hộp quà mê hoặc các hoàng thượng với pate thượng hạng, cỏ catnip hữu cơ sấy khô và đồ chơi tương tác rèn phản xạ săn mồi.",
    highlight: "100% không hạt độn, tuyển chọn theo khẩu vị bé",
    imagePlaceholderColor: "#FEF7E6",
    // TODO: thay bằng ảnh thật của FPETS khi có
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
    typicalItems: ["Pate cá hồi Na Uy 85g", "Cá nhồi cỏ catnip", "Súp thưởng nắp vặn", "Cần câu lông vũ chuông"]
  },
  {
    id: "box-prm-dog",
    name: "Box Premium cho Chó",
    slug: "box-premium-cho",
    species: "dog",
    size: "small",
    sizeLabel: "Tùy chỉnh theo cân nặng bé",
    itemCount: "6–7 món",
    minRetailValue: 650000,
    basePrice: 499000,
    description: "Phiên bản cao cấp gấp đôi niềm vui: thực phẩm dinh dưỡng nhập khẩu, đồ chơi thông minh trí tuệ và phụ kiện thời trang riêng biệt.",
    highlight: "Giá trị thực nhận trên 650.000₫",
    imagePlaceholderColor: "#FDECC4",
    // TODO: thay bằng ảnh thật của FPETS khi có
    imageUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&q=80",
    typicalItems: ["Thịt bò Úc sấy thăng hoa", "Đồ chơi giấu thức ăn IQ", "Gel dinh dưỡng lông bóng", "Khăn yếm thiết kế riêng", "Bóng nảy siêu đàn hồi"]
  },
  {
    id: "box-prm-cat",
    name: "Box Premium cho Mèo",
    slug: "box-premium-meo",
    species: "cat",
    size: "small",
    sizeLabel: "Mọi lứa tuổi mèo",
    itemCount: "6–7 món",
    minRetailValue: 650000,
    basePrice: 499000,
    description: "Trải nghiệm hoàng gia với pate hữu cơ cao cấp, đồ chơi kích thích não bộ, thảm cào móng mini và lược chải mát-xa lông rụng.",
    highlight: "Đặc quyền quà sinh nhật & phụ kiện giới hạn",
    imagePlaceholderColor: "#FDECC4",
    // TODO: thay bằng ảnh thật của FPETS khi có
    imageUrl: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80",
    typicalItems: ["Pate tôm hùm thượng hạng", "Cá ngừ đại dương sấy lạnh", "Lược chải nút bấm thông minh", "Đồ chơi chuột chạy pin mini", "Dầu cá Omega 3"]
  }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-1",
    name: "Gói 1 hộp",
    cycles: 1,
    discountPercent: 0,
    freeShipping: false,
    birthdayGift: false,
    description: "Nhận 1 hộp thử nghiệm để xem phản ứng và sở thích của bé trước khi cam kết lâu dài."
  },
  {
    id: "plan-3",
    name: "Gói 3 hộp",
    cycles: 3,
    discountPercent: 10,
    freeShipping: true,
    birthdayGift: false,
    badge: "Phổ biến nhất",
    description: "Giao định kỳ 1 hộp mỗi tháng trong 3 tháng. Tiết kiệm 10% và miễn phí vận chuyển toàn bộ kỳ giao."
  },
  {
    id: "plan-6",
    name: "Gói 6 hộp",
    cycles: 6,
    discountPercent: 15,
    freeShipping: true,
    birthdayGift: true,
    badge: "Tiết kiệm nhất",
    description: "Giao định kỳ 6 tháng. Giảm 15%, miễn phí giao hàng và tặng thêm phần quà sinh nhật độc quyền cho bé."
  }
];
