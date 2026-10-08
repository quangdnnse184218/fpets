import { createHmac, timingSafeEqual } from "node:crypto";

// Gọi API payOS (chỉ dùng ở server: route handler). Tài liệu: https://payos.vn/docs/api/
// Khóa lấy từ biến môi trường, không bao giờ gửi xuống trình duyệt.

const API = "https://api-merchant.payos.vn";

export function payosConfigured(): boolean {
  return Boolean(
    process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY && process.env.PAYOS_SERVER_SECRET
  );
}

const hmac = (data: string) => createHmac("sha256", process.env.PAYOS_CHECKSUM_KEY || "").update(data).digest("hex");

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function headers() {
  return {
    "x-client-id": process.env.PAYOS_CLIENT_ID || "",
    "x-api-key": process.env.PAYOS_API_KEY || "",
    "Content-Type": "application/json",
  };
}

// Chữ ký dữ liệu payOS gửi về (webhook): sắp khóa theo bảng chữ cái, nối key=value bằng &,
// null / undefined thành chuỗi rỗng, mảng thì JSON (mỗi phần tử sắp khóa), HMAC-SHA256 hex
function dataToSignString(data: Record<string, unknown>): string {
  const sortObj = (o: Record<string, unknown>) =>
    Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => ((acc[k] = o[k]), acc), {});
  return Object.keys(data)
    .sort()
    .filter((k) => data[k] !== undefined)
    .map((k) => {
      const v = data[k];
      let s: string;
      if (v === null || v === undefined || v === "null" || v === "undefined") s = "";
      else if (Array.isArray(v)) s = JSON.stringify(v.map((item) => (item && typeof item === "object" ? sortObj(item as Record<string, unknown>) : item)));
      else s = String(v);
      return `${k}=${s}`;
    })
    .join("&");
}

export function verifyPayosSignature(data: Record<string, unknown>, signature: string): boolean {
  if (!data || typeof signature !== "string" || !process.env.PAYOS_CHECKSUM_KEY) return false;
  return safeEqual(hmac(dataToSignString(data)), signature);
}

export interface CreateLinkInput {
  orderCode: number;
  amount: number;
  description: string; // tối đa 9 ký tự (tài khoản ngân hàng không liên kết qua payOS)
  returnUrl: string;
  cancelUrl: string;
  expiredAt?: number; // giây Unix
  buyerName?: string;
  buyerPhone?: string;
}

// Dữ liệu để tự vẽ mã VietQR trên trang FPETS (không chuyển khách sang trang payOS)
export interface PayosQr {
  qrCode: string; // chuỗi VietQR, vẽ thành mã QR
  accountNumber: string;
  accountName: string;
  bin: string; // mã BIN ngân hàng nhận tiền
  description: string; // nội dung chuyển khoản
  amount: number;
}

export async function createPaymentLink(input: CreateLinkInput): Promise<{ checkoutUrl: string; paymentLinkId: string; qr: PayosQr }> {
  // Chữ ký tạo link: amount, cancelUrl, description, orderCode, returnUrl theo bảng chữ cái
  const signature = hmac(
    `amount=${input.amount}&cancelUrl=${input.cancelUrl}&description=${input.description}&orderCode=${input.orderCode}&returnUrl=${input.returnUrl}`
  );
  const res = await fetch(`${API}/v2/payment-requests`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...input, signature }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.code !== "00" || !body?.data?.qrCode) {
    throw new Error(`payOS create failed: ${body?.code || res.status} ${body?.desc || ""}`.trim());
  }
  const d = body.data;
  return {
    checkoutUrl: d.checkoutUrl,
    paymentLinkId: d.paymentLinkId,
    qr: {
      qrCode: String(d.qrCode),
      accountNumber: String(d.accountNumber || ""),
      accountName: String(d.accountName || ""),
      bin: String(d.bin || ""),
      description: String(d.description || input.description),
      amount: Number(d.amount) || input.amount,
    },
  };
}

export interface PaymentInfo {
  status: string; // PENDING, PROCESSING, PAID, CANCELLED, EXPIRED
  amount: number;
  amountPaid: number;
  reference: string | null;
}

export async function getPaymentInfo(orderCode: number): Promise<PaymentInfo | null> {
  const res = await fetch(`${API}/v2/payment-requests/${orderCode}`, { headers: headers(), cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.code !== "00" || !body?.data) return null;
  const d = body.data;
  return {
    status: String(d.status || ""),
    amount: Number(d.amount) || 0,
    amountPaid: Number(d.amountPaid) || 0,
    reference: d.transactions?.[0]?.reference ?? null,
  };
}

export async function cancelPaymentLink(orderCode: number, reason: string): Promise<void> {
  await fetch(`${API}/v2/payment-requests/${orderCode}/cancel`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ cancellationReason: reason }),
    cache: "no-store",
  }).catch(() => undefined);
}

// Nội dung chuyển khoản tối đa 9 ký tự: "FP" + 6 ký tự cuối của mã đơn (mã cũ 4 số vẫn hợp lệ)
export function transferDescription(orderCode: string): string {
  return ("FP" + orderCode.replace(/[^A-Za-z0-9]/g, "").slice(-6)).toUpperCase();
}
