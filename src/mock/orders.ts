export type OrderStatus =
  | 'cho_thanh_toan'
  | 'da_xac_nhan'
  | 'dang_chuan_bi'
  | 'dang_giao'
  | 'da_giao'
  | 'da_huy'
  | 'doi_tra';

export interface OrderItem {
  id: string;
  name: string;
  type: 'box' | 'retail';
  petName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTrackingEvent {
  time: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface Order {
  id: string;
  orderCode: string;
  orderType: 'retail' | 'mystery_box' | 'subscription_cycle';
  subscriptionLabel?: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  paymentMethod: 'MoMo' | 'VNPay' | 'COD';
  paymentStatus: 'Đã thanh toán' | 'Chờ thanh toán';
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  trackingCode?: string;
  carrier?: string;
  items: OrderItem[];
  timeline: OrderTrackingEvent[];
}

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-1",
    orderCode: "FPET-20260920-8812",
    orderType: "mystery_box",
    status: "dang_giao",
    statusLabel: "Đang giao hàng",
    createdAt: "20/09/2026 09:30",
    paymentMethod: "MoMo",
    paymentStatus: "Đã thanh toán",
    recipientName: "Nguyễn Văn Quang",
    recipientPhone: "0912345678",
    shippingAddress: "Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    subtotal: 299000,
    shippingFee: 35000,
    discount: 0,
    totalAmount: 334000,
    trackingCode: "GHN-88291039VN",
    carrier: "Giao Hàng Nhanh (GHN)",
    items: [
      {
        id: "item-1",
        name: "Box Tiêu chuẩn cho Chó lớn (Hộp tuyển chọn tháng 9)",
        type: "box",
        petName: "Bơ",
        quantity: 1,
        unitPrice: 299000,
        totalPrice: 299000
      }
    ],
    timeline: [
      {
        time: "20/09/2026 09:30",
        title: "Đặt hàng thành công",
        description: "Đơn hàng đã được thanh toán qua Ví MoMo.",
        completed: true
      },
      {
        time: "20/09/2026 14:15",
        title: "Hoàn tất tuyển chọn hộp",
        description: "Admin đã chọn 5 món phù hợp theo hồ sơ bé Bơ (không chứa thịt gà).",
        completed: true
      },
      {
        time: "21/09/2026 08:30",
        title: "Đã bàn giao vận chuyển",
        description: "Bưu tá GHN đã lấy kiện hàng. Mã vận đơn: GHN-88291039VN.",
        completed: true
      },
      {
        time: "Dự kiến 23/09/2026",
        title: "Giao hàng đến bạn",
        description: "Kiện hàng đang trên đường trung chuyển về bưu cục phát.",
        completed: false
      }
    ]
  },
  {
    id: "ord-2",
    orderCode: "FPET-20260902-1102",
    orderType: "subscription_cycle",
    subscriptionLabel: "Kỳ 1/3 (Gói 3 hộp)",
    status: "da_giao",
    statusLabel: "Đã giao thành công",
    createdAt: "02/09/2026 08:00",
    paymentMethod: "VNPay",
    paymentStatus: "Đã thanh toán",
    recipientName: "Nguyễn Văn Quang",
    recipientPhone: "0912345678",
    shippingAddress: "Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalAmount: 0,
    trackingCode: "GHN-77182903VN",
    carrier: "Giao Hàng Nhanh",
    items: [
      {
        id: "item-2",
        name: "Box Tiêu chuẩn cho Mèo (Hộp kỳ 1 - Đợt giao đầu tháng)",
        type: "box",
        petName: "Miu",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }
    ],
    timeline: [
      {
        time: "02/09/2026 08:00",
        title: "Tạo đơn tự động cho kỳ 1",
        description: "Gói định kỳ 3 hộp đã kích hoạt kỳ giao đầu tháng 9.",
        completed: true
      },
      {
        time: "02/09/2026 16:00",
        title: "Đã đóng gói hộp quà",
        description: "4 món ăn và đồ chơi catnip đã được xếp gọn trong hộp.",
        completed: true
      },
      {
        time: "04/09/2026 15:20",
        title: "Giao hàng thành công",
        description: "Khách hàng đã nhận hàng và ký nhận.",
        completed: true
      }
    ]
  },
  {
    id: "ord-3",
    orderCode: "FPET-20260921-9923",
    orderType: "retail",
    status: "dang_chuan_bi",
    statusLabel: "Đang chuẩn bị hàng",
    createdAt: "21/09/2026 11:20",
    paymentMethod: "COD",
    paymentStatus: "Chờ thanh toán",
    recipientName: "Nguyễn Văn Quang",
    recipientPhone: "0912345678",
    shippingAddress: "Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    subtotal: 90000,
    shippingFee: 35000,
    discount: 0,
    totalAmount: 125000,
    items: [
      {
        id: "item-3",
        name: "Snack Ức Gà Sấy Thăng Hoa (Túi 50g)",
        type: "retail",
        quantity: 2,
        unitPrice: 45000,
        totalPrice: 90000
      }
    ],
    timeline: [
      {
        time: "21/09/2026 11:20",
        title: "Đặt hàng COD thành công",
        description: "Nhân viên CSKH FPETS đã gọi điện xác nhận đơn hàng của bạn.",
        completed: true
      },
      {
        time: "21/09/2026 14:00",
        title: "Đang đóng gói sản phẩm",
        description: "Kho hàng đang kiểm tra hạn sử dụng và dán niêm phong.",
        completed: true
      }
    ]
  }
];
