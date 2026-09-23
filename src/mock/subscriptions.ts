export interface Subscription {
  id: string;
  code: string;
  petId: string;
  petName: string;
  petBreed: string;
  boxName: string;
  planName: string;
  totalCycles: number;
  completedCycles: number;
  remainingCycles: number;
  currentCycleIndex: number;
  status: 'cho_thanh_toan' | 'dang_hoat_dong' | 'tam_dung' | 'qua_han' | 'het_han' | 'da_huy';
  statusLabel: string;
  deliverySchedule: 'dau_thang' | 'giua_thang';
  deliveryScheduleLabel: string;
  nextDeliveryDate: string;
  cutoffDate: string;
  prepaidAmount: number;
  pausedCyclesLeft: number;
  shippingAddress: string;
}

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub-1",
    code: "SUB-2026-8912",
    petId: "pet-miu",
    petName: "Miu",
    petBreed: "Mèo Anh Lông Ngắn",
    boxName: "Box Tiêu chuẩn cho Mèo",
    planName: "Gói 3 hộp (Tiết kiệm 10% + Freeship)",
    totalCycles: 3,
    completedCycles: 1,
    remainingCycles: 2,
    currentCycleIndex: 2,
    status: "dang_hoat_dong",
    statusLabel: "Đang hoạt động",
    deliverySchedule: "dau_thang",
    deliveryScheduleLabel: "Đầu tháng (Ngày 1–5)",
    nextDeliveryDate: "02/10/2026",
    cutoffDate: "25/09/2026",
    prepaidAmount: 807000,
    pausedCyclesLeft: 0,
    shippingAddress: "Số 24 ngõ 105 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội"
  }
];
