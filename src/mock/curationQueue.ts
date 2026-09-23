import { Product, PRODUCTS } from "./products";

export interface CurationItem {
  id: string;
  orderCode: string;
  orderType: 'Gói định kỳ (Kỳ 2/3)' | 'Mua 1 lần';
  deliveryBatch: 'Đầu tháng (1–5)' | 'Giữa tháng (15–20)';
  petName: string;
  species: 'Chó' | 'Mèo';
  size: string;
  weight: string;
  age: string;
  allergies: string[];
  preferences: string[];
  previouslySentItems: string[];
  boxType: string;
  minRetailValue: number;
  selectedProducts: Product[];
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Đã đóng gói';
}

export const INITIAL_CURATION_QUEUE: CurationItem[] = [
  {
    id: "cur-1",
    orderCode: "FPET-20261001-0021",
    orderType: "Gói định kỳ (Kỳ 2/3)",
    deliveryBatch: "Đầu tháng (1–5)",
    petName: "Bơ",
    species: "Chó",
    size: "Lớn",
    weight: "18.5 kg",
    age: "2 tuổi (Trưởng thành)",
    allergies: ["Thịt gà", "Bắp / Ngô"],
    preferences: ["Gặm xương giòn", "Đồ chơi dây thừng kéo co", "Thịt cừu sấy"],
    previouslySentItems: ["Pate cừu nướng", "Bóng phát tiếng kêu", "Khăn lau tai"],
    boxType: "Box Tiêu chuẩn cho Chó lớn",
    minRetailValue: 380000,
    status: "Chờ duyệt",
    selectedProducts: [
      PRODUCTS[2], // Bánh quy canxi men tiêu hóa vị bò (65k) - không dính gà
      PRODUCTS[3], // Hạt dinh dưỡng thịt cừu (85k)
      PRODUCTS[5], // Dây thừng kéo co đôi cotton (55k)
      PRODUCTS[7], // Bóng cao su non phát tiếng bíp (60k)
      PRODUCTS[9], // Khăn ướt kháng khuẩn tràm trà (45k)
      PRODUCTS[10], // Lược chải nút bấm (85k)
    ]
  },
  {
    id: "cur-2",
    orderCode: "FPET-20261001-0038",
    orderType: "Gói định kỳ (Kỳ 2/3)",
    deliveryBatch: "Đầu tháng (1–5)",
    petName: "Miu",
    species: "Mèo",
    size: "Nhỏ",
    weight: "4.2 kg",
    age: "8 tháng (Mèo con)",
    allergies: [],
    preferences: ["Cỏ bạc hà Catnip", "Pate cá hồi", "Cần câu lông vũ"],
    previouslySentItems: ["Pate gà xé", "Bóng len lục lạc"],
    boxType: "Box Tiêu chuẩn cho Mèo",
    minRetailValue: 380000,
    status: "Chờ duyệt",
    selectedProducts: [
      PRODUCTS[0], // Pate cá hồi bí đỏ (35k)
      PRODUCTS[1], // Snack ức gà sấy lạnh (45k)
      PRODUCTS[4], // Súp thưởng cá ngừ (40k)
      PRODUCTS[6], // Cá nhồi cỏ catnip sột soạt (40k)
      PRODUCTS[8], // Cần câu lông vũ chuông (35k)
      PRODUCTS[10], // Lược chải thông minh (85k)
      PRODUCTS[11], // Vòng cổ dạ quang (45k)
    ]
  },
  {
    id: "cur-3",
    orderCode: "FPET-20260925-9012",
    orderType: "Mua 1 lần",
    deliveryBatch: "Giữa tháng (15–20)",
    petName: "Lu",
    species: "Chó",
    size: "Nhỏ",
    weight: "5.0 kg",
    age: "4 tuổi (Trưởng thành)",
    allergies: ["Hải sản"],
    preferences: ["Bánh quy thưởng", "Bóng kêu"],
    previouslySentItems: [],
    boxType: "Box Tiêu chuẩn cho Chó nhỏ",
    minRetailValue: 380000,
    status: "Đã duyệt",
    selectedProducts: [
      PRODUCTS[1], // Snack ức gà
      PRODUCTS[2], // Bánh quy vị bò
      PRODUCTS[7], // Bóng cao su bíp
      PRODUCTS[9], // Khăn ướt
    ]
  }
];
