"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { VN_PROVINCES, provinceLabel } from "@/lib/vnProvinces";
import { normalizeText } from "@/lib/petOptions";

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

const WARD_PREFIX = /^(Phường|Xã|Đặc khu) /;

// Ô chọn phường/xã có tìm kiếm. Một tỉnh có tới hơn 100 phường/xã và tên nào cũng bắt đầu bằng "Phường"/"Xã",
// nên ô chọn thường không dò nhanh được; ở đây khách gõ vài chữ (có dấu hoặc không dấu) để lọc danh sách.
function WardPicker({
  id,
  wards,
  value,
  onChange,
  disabled,
  placeholder,
  invalid,
  describedBy,
  className,
}: {
  id: string;
  wards: string[];
  value: string;
  onChange: (ward: string) => void;
  disabled: boolean;
  placeholder: string;
  invalid: boolean;
  describedBy?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  // null: ô đang hiện phường/xã đã chọn; chuỗi: khách đang gõ để tìm
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = normalizeText(query ?? "").trim();
    return q ? wards.filter((w) => normalizeText(w).includes(q)) : wards;
  }, [wards, query]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    if (open) return;
    setActive(Math.max(0, wards.indexOf(value)));
    setOpen(true);
  };
  const choose = (ward: string) => {
    onChange(ward);
    setQuery(null);
    setOpen(false);
  };
  // Rời ô: gõ đúng tên một phường/xã thì nhận luôn, xóa trắng thì bỏ chọn, còn lại giữ lựa chọn trước đó
  const commit = () => {
    if (query !== null) {
      const q = normalizeText(query).trim();
      if (q === "") onChange("");
      else {
        const exact = wards.filter((w) => normalizeText(w) === q || normalizeText(w.replace(WARD_PREFIX, "")) === q);
        if (exact.length === 1) onChange(exact[0]);
      }
    }
    setQuery(null);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) show();
      else setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape" && open) {
      // Chỉ đóng danh sách, không đóng luôn hộp thoại đang chứa form
      e.stopPropagation();
      setQuery(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`${className} pr-9`}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={80}
        disabled={disabled}
        placeholder={placeholder}
        value={query ?? value}
        onFocus={(e) => {
          e.target.select();
          show();
        }}
        onClick={show}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
      <ChevronDown className="w-4 h-4 text-bark-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
      {open && !disabled && (
        // Giữ con trỏ trong ô khi bấm vào danh sách, để bấm chọn không bị coi là rời ô
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-box border border-surface-border bg-white shadow-lg py-1 text-sm"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-bark-600">Không có phường/xã nào khớp “{query}”.</li>
          ) : (
            matches.map((w, i) => (
              <li
                key={w}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={w === value}
                onClick={() => choose(w)}
                onMouseEnter={() => setActive(i)}
                className={`px-3 min-h-10 flex items-center cursor-pointer ${i === active ? "bg-pine-50" : ""} ${w === value ? "font-bold text-pine-950" : "text-bark-800"}`}
              >
                {w}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

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
          {VN_PROVINCES.map((p) => <option key={p} value={p}>{provinceLabel(p)}</option>)}
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
          <WardPicker
            // Đổi tỉnh thì tạo lại ô để xóa chữ đang gõ dở
            key={value.province}
            id={`${idPrefix}-ward`}
            wards={wardList}
            value={value.ward}
            onChange={(ward) => set("ward", ward)}
            disabled={!value.province || wards === null}
            placeholder={!value.province ? "Chọn tỉnh / thành trước" : wards === null ? "Đang tải…" : "Gõ để tìm phường / xã"}
            invalid={!!errors.ward}
            describedBy={describedBy("ward")}
            className={input(!!errors.ward)}
          />
        )}
        {message("ward")}
        {legacyWard && !errors.ward && (
          <p className="mt-1 text-xs font-semibold text-amber-700">“{legacyWard}” không có trong danh sách phường/xã mới. Chọn lại để giao hàng chính xác.</p>
        )}
      </div>
      <p className="sm:col-span-2 -mt-1 text-xs text-bark-600">
        Địa chỉ theo địa giới mới từ 01/07/2025: không còn quận/huyện, nhiều phường/xã cũ đã gộp và đổi tên.
      </p>
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
