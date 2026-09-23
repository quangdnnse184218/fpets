export interface BoxItemReview {
  productName: string;
  category: 'food' | 'toy' | 'accessory';
  rating: 'like' | 'neutral' | 'dislike';
  comment?: string;
}

export interface Review {
  id: string;
  orderCode: string;
  customerName: string;
  avatarUrl?: string;
  petName: string;
  petSpecies: 'dog' | 'cat';
  petBreed: string;
  boxName: string;
  rating: number; // 1-5
  createdAt: string;
  comment: string;
  images: string[];
  itemReviews: BoxItemReview[];
  adminReply?: {
    author: string;
    content: string;
    createdAt: string;
  };
  isPublished: boolean;
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: "rev-1",
    orderCode: "FPET-20260910-1042",
    customerName: "Hoàng Thảo My",
    petName: "Miu",
    petSpecies: "cat",
    petBreed: "Mèo Anh Lông Ngắn",
    boxName: "Box Tiêu chuẩn cho Mèo",
    rating: 5,
    createdAt: "12/09/2026",
    comment: "Hộp quà tháng này quá ưng ý luôn! Vừa mở hộp là bé Miu lao ngay vào ôm lấy con cá catnip đạp chân sau liên tục. Pate cá hồi thơm nức mũi, bé ăn hết veo một loáng. Thích nhất là không có thành phần dị ứng nào mà bé từng bị trước đây.",
    // TODO: thay bằng ảnh thật của FPETS khi có
    images: [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
      "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&q=80"
    ],
    itemReviews: [
      { productName: "Pate Cá Hồi Tươi & Bí Đỏ Hầm", category: "food", rating: "like", comment: "Bé liếm sạch bát không chừa giọt nào" },
      { productName: "Cá Nhồi Cỏ Mèo Catnip Phát Tiếng", category: "toy", rating: "like", comment: "Ôm ngủ cả ngày không chịu buông" },
      { productName: "Súp Thưởng Cá Ngừ & Tảo Biển", category: "food", rating: "like" },
      { productName: "Cần Câu Lông Vũ Chuông", category: "toy", rating: "neutral", comment: "Chơi được 15p là lười nằm ngắm" }
    ],
    adminReply: {
      author: "FPETS Care Team",
      content: "Cảm ơn bạn My và bé Miu đáng yêu! Kỳ sau FPETS sẽ nhặt thêm loại đồ chơi gặm nhấm dẻo hơn để phục vụ hoàng thượng nhé ạ!",
      createdAt: "13/09/2026"
    },
    isPublished: true
  },
  {
    id: "rev-2",
    orderCode: "FPET-20260912-3391",
    customerName: "Trần Đức Nam",
    petName: "Bơ",
    petSpecies: "dog",
    petBreed: "Golden Retriever (18kg)",
    boxName: "Box Tiêu chuẩn cho Chó lớn",
    rating: 5,
    createdAt: "15/09/2026",
    comment: "Đồ chơi thừng bện siêu bền, cún nhà mình kéo co với bố cả tuần nay mà chưa đứt sợi nào. Bánh quy bò men tiêu hóa giòn thơm, phân bé rất đẹp. Giá 299k mà tổng giá trị các món bên trong phải hơn 400k. Đã đăng ký tiếp gói 6 tháng!",
    // TODO: thay bằng ảnh thật của FPETS khi có
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80",
      "https://images.unsplash.com/photo-1582798358481-d199fb7347bb?w=800&q=80"
    ],
    itemReviews: [
      { productName: "Dây Thừng Bện Kéo Co Đôi Cotton", category: "toy", rating: "like", comment: "Cực dai bền, cắn thoải mái" },
      { productName: "Bánh Quy Canxi Men Tiêu Hóa Vị Bò", category: "food", rating: "like" },
      { productName: "Bóng Cao Su Non Kêu Bíp", category: "toy", rating: "like" },
      { productName: "Khăn Ướt Kháng Khuẩn Tràm Trà", category: "accessory", rating: "neutral", comment: "Mùi tràm trà hơi nhẹ nhưng sạch" }
    ],
    adminReply: {
      author: "FPETS Care Team",
      content: "Chào anh Nam, cảm ơn sự đồng hành của gia đình cùng bé Bơ! Kỳ sau hộp của bé sẽ có thêm quà sinh nhật đặc quyền gói 6 tháng nhé ạ.",
      createdAt: "15/09/2026"
    },
    isPublished: true
  },
  {
    id: "rev-3",
    orderCode: "FPET-20260905-2019",
    customerName: "Lê Ngọc Linh",
    petName: "Đậu Đậu",
    petSpecies: "dog",
    petBreed: "Poodle Toy (3.5kg)",
    boxName: "Box Tiêu chuẩn cho Chó nhỏ",
    rating: 4,
    createdAt: "08/09/2026",
    comment: "Shop đóng gói cẩn thận, có thiệp ghi tên riêng của bé Đậu Đậu nhìn rất ấm áp. Hạt dinh dưỡng kích thước nhỏ vừa miệng bé. Duy chỉ có món bóng cao su hơi to so với hàm của Poodle nhỏ nên bé hơi khó ngậm.",
    // TODO: thay bằng ảnh thật của FPETS khi có
    images: [
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&q=80"
    ],
    itemReviews: [
      { productName: "Hạt Dinh Dưỡng Thịt Cừu Cho Cún Nhỏ", category: "food", rating: "like" },
      { productName: "Snack Ức Gà Sấy Giòn", category: "food", rating: "like" },
      { productName: "Bóng Cao Su Kêu Bíp", category: "toy", rating: "dislike", comment: "Hơi to so với mồm bé Poodle 3.5kg" },
      { productName: "Vòng Cổ Phản Quang Chuông", category: "accessory", rating: "like" }
    ],
    adminReply: {
      author: "FPETS Care Team",
      content: "FPETS xin chân thành ghi nhận góp ý của chị Linh ạ. Hệ thống đã cập nhật lưu ý size đồ chơi nhỏ hơn cho bé Đậu Đậu ở các kỳ tiếp theo ngay rồi ạ!",
      createdAt: "09/09/2026"
    },
    isPublished: true
  },
  {
    id: "rev-4",
    orderCode: "FPET-20260901-5120",
    customerName: "Vũ Khánh An",
    petName: "Sữa",
    petSpecies: "cat",
    petBreed: "Mèo Ba Tư",
    boxName: "Box Premium cho Mèo",
    rating: 5,
    createdAt: "03/09/2026",
    comment: "Hộp Premium đúng là đỉnh cao! Cây lược chải lông nút bấm dùng thích mê, ấn nhẹ một cái là lông rụng ra sạch bách. Hộp có hẳn 7 món xịn sò, bé ăn ngoan ngủ kỹ suốt tuần.",
    // TODO: thay bằng ảnh thật của FPETS khi có
    images: [
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80",
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80"
    ],
    itemReviews: [
      { productName: "Lược Chải Lông Nút Bấm Tự Đẩy", category: "accessory", rating: "like", comment: "Món này 10/10" },
      { productName: "Pate Cá Hồi Tươi & Bí Đỏ Hầm", category: "food", rating: "like" },
      { productName: "Cá Nhồi Cỏ Mèo Catnip", category: "toy", rating: "like" },
      { productName: "Súp Thưởng Cá Ngừ Tảo Biển", category: "food", rating: "like" },
      { productName: "Cần Câu Lông Vũ", category: "toy", rating: "like" }
    ],
    isPublished: true
  }
];
