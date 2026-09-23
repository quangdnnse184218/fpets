export interface CustomerPetSummary {
  name: string;
  species: 'dog' | 'cat';
  breed: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  provinceCity: string;
  joinedDate: string;
  ordersCount: number;
  totalSpent: number;
  activeSubscription?: string;
  pets: CustomerPetSummary[];
  isLocked: boolean;
}

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    fullName: "Nguyễn Văn Quang",
    email: "quang.nguyen@example.com",
    phone: "0912345678",
    address: "Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu",
    provinceCity: "Hà Nội",
    joinedDate: "15/07/2026",
    ordersCount: 4,
    totalSpent: 1450000,
    activeSubscription: "Gói 3 hộp (Kỳ 2/3)",
    pets: [
      { name: "Bơ", species: "dog", breed: "Golden Retriever" },
      { name: "Miu", species: "cat", breed: "Mèo Anh Lông Ngắn" }
    ],
    isLocked: false
  },
  {
    id: "cust-2",
    fullName: "Hoàng Thảo My",
    email: "thaomy.hoang@gmail.com",
    phone: "0987654321",
    address: "Chung cư Vinhomes Central Park, Bình Thạnh",
    provinceCity: "TP. Hồ Chí Minh",
    joinedDate: "20/08/2026",
    ordersCount: 2,
    totalSpent: 807000,
    activeSubscription: "Gói 3 hộp (Kỳ 1/3)",
    pets: [
      { name: "Bánh Bao", species: "cat", breed: "Mèo Munchkin chân ngắn" }
    ],
    isLocked: false
  },
  {
    id: "cust-3",
    fullName: "Trần Minh Đức",
    email: "ductran.tech@gmail.com",
    phone: "0905123987",
    address: "128 Nguyễn Thị Minh Khai, Phường 6, Quận 3",
    provinceCity: "TP. Hồ Chí Minh",
    joinedDate: "02/09/2026",
    ordersCount: 1,
    totalSpent: 299000,
    activeSubscription: "Gói 1 hộp (Đã hoàn thành)",
    pets: [
      { name: "Rocky", species: "dog", breed: "Husky Siberian" }
    ],
    isLocked: false
  },
  {
    id: "cust-4",
    fullName: "Phạm Hải Đăng",
    email: "haidang.spam@tempmail.com",
    phone: "0945999888",
    address: "Tổ 4, Khu phố 3, Tân Bình",
    provinceCity: "TP. Hồ Chí Minh",
    joinedDate: "10/09/2026",
    ordersCount: 0,
    totalSpent: 0,
    pets: [],
    isLocked: true // Tài khoản bị khóa do nghi vấn spam/bom hàng
  }
];
