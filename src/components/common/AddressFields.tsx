"use client";

import React, { useEffect, useState } from "react";
import { VN_PROVINCES } from "@/lib/vnProvinces";

export interface AddressValue {
  recipientName: string;
  phone: string;
  province: string;
  ward: string;
  street: string;
}

export const emptyAddress = (): AddressValue => ({ recipientName: "", phone: "", province: "", ward: "", street: "" });

export interface SavedAddressRow {
  id: string;
  recipient_name: string;
  phone: string;
  province_city: string;
  ward: string | null;
  street_address: string;
  is_default: boolean;
}

export const rowToAddress = (row: SavedAddressRow): AddressValue => ({
  recipientName: row.recipient_name,
  phone: row.phone,
  province: row.province_city,
  ward: row.ward || "",
  street: row.street_address,
});

export function formatAddress(a: AddressValue): string {
  return [a.street, a.ward, a.province].filter(Boolean).join(", ");
}

export type AddressErrors = Partial<Record<keyof AddressValue, string>>;

/** Kiểm tra đủ thông tin nhận hàng. Server kiểm tra lại cùng quy tắc khi tạo đơn. */
export function validateAddress(a: AddressValue): AddressErrors {
  const errors: AddressErrors = {};
  if (a.recipientName.trim().length < 2) errors.recipientName = "Nhập họ tên người nhận.";
  if (!/^0[0-9]{9}$/.test(a.phone.trim())) errors.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0.";
  if (!a.province.trim()) errors.province = "Chọn tỉnh / thành phố.";
  if (!a.ward.trim()) errors.ward = "Chọn phường / xã.";
  if (a.street.trim().length < 3) errors.street = "Nhập số nhà, tên đường.";
  return errors;
}

export const isAddressValid = (a: AddressValue) => Object.keys(validateAddress(a)).length === 0;

// Danh sách phường/xã theo địa giới mới (3.321 đơn vị), tải 1 lần khi form địa chỉ đầu tiên hiển thị
type WardMap = Record<string, string[]>;
let wardPromise: Promise<WardMap> | null = null;
function loadWards(): Promise<WardMap> {
  if (!wardPromise) {
    wardPromise = fetch("/data/vn-wards.json")
      .then((r) => (r.ok ? (r.json() as Promise<WardMap>) : Promise.reject(new Error("wards"))))
      .catch(() => {
        wardPromise = null;
        return {} as WardMap;
      });
  }
  return wardPromise;
}

const WARD_GROUPS = [
  { prefix: "Phường ", label: "Phường" },
  { prefix: "Xã ", label: "Xã" },
  { prefix: "Đặc khu ", label: "Đặc khu" },
];

// Địa chỉ theo địa giới mới (không còn Quận/Huyện): Tỉnh/Thành → Phường/Xã → Số nhà, đường
export default function AddressFields({
  value,
  onChange,
  idPrefix = "addr",
  showErrors = false,
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  idPrefix?: string;
  // Bật sau lần bấm lưu/đặt hàng đầu tiên để hiện lỗi dưới từng ô
  showErrors?: boolean;
}) {
  const [wards, setWards] = useState<WardMap | null>(null);
  useEffect(() => {
    let alive = true;
    loadWards().then((data) => alive && setWards(data));
    return () => {
      alive = false;
    };
  }, []);

  const set = (key: keyof AddressValue, v: string) => onChange({ ...value, [key]: v });
  const errors = showErrors ? validateAddress(value) : {};
  const wardList = (wards && value.province && wards[value.province]) || [];
  // Địa chỉ lưu từ trước khi có danh sách: vẫn hiện giá trị cũ để khách không mất dữ liệu
  const legacyWard = value.ward && wards && !wardList.includes(value.ward) ? value.ward : "";
  const wardsFailed = wards !== null && Object.keys(wards).length === 0;

  const input = (invalid: boolean) =>
    `w-full min-h-11 px-3 rounded-box border bg-white text-sm focus:outline-none disabled:bg-surface-muted disabled:text-bark-400 ${
      invalid ? "border-red-400 focus:border-red-600" : "border-surface-border focus:border-pine-900"
    }`;
  const label = "text-xs font-bold text-bark-800 block mb-1";
  const star = <span className="text-red-600">*</span>;
  const message = (key: keyof AddressValue) =>
    errors[key] ? <p id={`${idPrefix}-${key}-error`} className="mt-1 text-xs font-semibold text-red-700">{errors[key]}</p> : null;
  const describedBy = (key: keyof AddressValue) => (errors[key] ? `${idPrefix}-${key}-error` : undefined);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={label} htmlFor={`${idPrefix}-name`}>Họ tên người nhận {star}</label>
        <input id={`${idPrefix}-name`} className={input(!!errors.recipientName)} required autoComplete="name" maxLength={80}
          aria-invalid={!!errors.recipientName} aria-describedby={describedBy("recipientName")}
          value={value.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
        {message("recipientName")}
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-phone`}>Số điện thoại {star}</label>
        <input id={`${idPrefix}-phone`} className={input(!!errors.phone)} required type="tel" inputMode="tel" autoComplete="tel" maxLength={10} placeholder="0912345678"
          aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")}
          value={value.phone} onChange={(e) => set("phone", e.target.value.replace(/[^0-9]/g, ""))} />
        {message("phone")}
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-province`}>Tỉnh / Thành phố {star}</label>
        <select id={`${idPrefix}-province`} className={input(!!errors.province)} required value={value.province}
          aria-invalid={!!errors.province} aria-describedby={describedBy("province")}
          // Đổi tỉnh thì phường/xã cũ không còn đúng
          onChange={(e) => onChange({ ...value, province: e.target.value, ward: "" })}>
          <option value="">Chọn tỉnh / thành</option>
          {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {message("province")}
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-ward`}>Phường / Xã {star}</label>
        {wardsFailed ? (
          // Không tải được danh sách: cho nhập tay để khách vẫn đặt được hàng
          <input id={`${idPrefix}-ward`} className={input(!!errors.ward)} required placeholder="Ví dụ: Phường Bến Thành" maxLength={80}
            aria-invalid={!!errors.ward} aria-describedby={describedBy("ward")}
            value={value.ward} onChange={(e) => set("ward", e.target.value)} />
        ) : (
          <select id={`${idPrefix}-ward`} className={input(!!errors.ward)} required value={value.ward} disabled={!value.province || wards === null}
            aria-invalid={!!errors.ward} aria-describedby={describedBy("ward")}
            onChange={(e) => set("ward", e.target.value)}>
            <option value="">{!value.province ? "Chọn tỉnh / thành trước" : wards === null ? "Đang tải…" : "Chọn phường / xã"}</option>
            {legacyWard && <option value={legacyWard}>{legacyWard}</option>}
            {WARD_GROUPS.map((g) => {
              const items = wardList.filter((w) => w.startsWith(g.prefix));
              return items.length > 0 ? (
                <optgroup key={g.label} label={g.label}>
                  {items.map((w) => <option key={w} value={w}>{w}</option>)}
                </optgroup>
              ) : null;
            })}
          </select>
        )}
        {message("ward")}
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}-street`}>Số nhà, tên đường {star}</label>
        <input id={`${idPrefix}-street`} className={input(!!errors.street)} required autoComplete="street-address" placeholder="Ví dụ: 12 Lê Lợi" maxLength={160}
          aria-invalid={!!errors.street} aria-describedby={describedBy("street")}
          value={value.street} onChange={(e) => set("street", e.target.value)} />
        {message("street")}
      </div>
    </div>
  );
}
