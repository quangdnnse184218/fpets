"use client";

import React from "react";
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

// Địa chỉ theo địa giới mới (không còn Quận/Huyện): Tỉnh/Thành → Phường/Xã → Số nhà, đường
export default function AddressFields({ value, onChange, idPrefix = "addr" }: { value: AddressValue; onChange: (v: AddressValue) => void; idPrefix?: string }) {
  const set = (key: keyof AddressValue, v: string) => onChange({ ...value, [key]: v });
  const input = "w-full min-h-11 px-3 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none";
  const label = "text-xs font-bold text-bark-800 block mb-1";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={label} htmlFor={`${idPrefix}-name`}>Họ tên người nhận *</label>
        <input id={`${idPrefix}-name`} className={input} required autoComplete="name" value={value.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-phone`}>Số điện thoại *</label>
        <input id={`${idPrefix}-phone`} className={input} required type="tel" inputMode="tel" autoComplete="tel" pattern="0[0-9]{9}" title="Số điện thoại 10 số, bắt đầu bằng 0"
          value={value.phone} onChange={(e) => set("phone", e.target.value.replace(/\s/g, ""))} />
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-province`}>Tỉnh / Thành phố *</label>
        <select id={`${idPrefix}-province`} className={input} required value={value.province} onChange={(e) => set("province", e.target.value)}>
          <option value="">Chọn tỉnh / thành</option>
          {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className={label} htmlFor={`${idPrefix}-ward`}>Phường / Xã *</label>
        <input id={`${idPrefix}-ward`} className={input} required placeholder="Ví dụ: Phường Bến Thành" value={value.ward} onChange={(e) => set("ward", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`${idPrefix}-street`}>Số nhà, tên đường *</label>
        <input id={`${idPrefix}-street`} className={input} required autoComplete="street-address" placeholder="Ví dụ: 12 Lê Lợi" value={value.street} onChange={(e) => set("street", e.target.value)} />
      </div>
    </div>
  );
}
