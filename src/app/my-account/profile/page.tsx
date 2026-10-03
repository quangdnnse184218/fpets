"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import AddressFields, { AddressValue, SavedAddressRow, emptyAddress, formatAddress, isAddressValid, rowToAddress } from "@/components/common/AddressFields";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const input = "w-full min-h-11 px-3 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none";
const label = "text-xs font-bold text-bark-800 block mb-1";

export default function ProfilePage() {
  const { user, refreshUser } = useApp();
  const { show } = useToast();

  const [fullName, setFullName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [savingInfo, setSavingInfo] = useState(false);

  const [addresses, setAddresses] = useState<SavedAddressRow[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; value: AddressValue; isDefault: boolean } | null>(null);
  const [savingAddr, setSavingAddr] = useState(false);
  const [showAddrErrors, setShowAddrErrors] = useState(false);
  const [deletingAddr, setDeletingAddr] = useState<SavedAddressRow | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setFullName(user.name);
    setPhone(user.phone);
  }, [user.name, user.phone]);

  const loadAddresses = useCallback(async () => {
    if (!user.id) return;
    const { data } = await createClient()
      .from("addresses")
      .select("id, recipient_name, phone, province_city, ward, street_address, is_default")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses((data as SavedAddressRow[]) || []);
  }, [user.id]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) return;
    setSavingInfo(true);
    const { error } = await createClient().from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq("id", user.id);
    setSavingInfo(false);
    if (error) return show("Không lưu được thông tin, vui lòng thử lại.", { tone: "error" });
    await refreshUser();
    show("Đã lưu thông tin tài khoản");
  };

  // Chỉ 1 địa chỉ mặc định: bỏ cờ mặc định ở các địa chỉ khác trước khi đặt
  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !user.id) return;
    if (!isAddressValid(editing.value)) {
      setShowAddrErrors(true);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#address-form [aria-invalid="true"]')?.focus());
      return;
    }
    setSavingAddr(true);
    const supabase = createClient();
    const makeDefault = editing.isDefault || addresses.length === 0;
    if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const row = {
      recipient_name: editing.value.recipientName.trim(),
      phone: editing.value.phone.trim(),
      province_city: editing.value.province,
      district: "",
      ward: editing.value.ward,
      street_address: editing.value.street.trim(),
      is_default: makeDefault,
    };
    const { error } = editing.id
      ? await supabase.from("addresses").update(row).eq("id", editing.id)
      : await supabase.from("addresses").insert({ ...row, user_id: user.id });
    setSavingAddr(false);
    if (error) return show("Không lưu được địa chỉ, vui lòng thử lại.", { tone: "error" });
    setEditing(null);
    show("Đã lưu địa chỉ");
    loadAddresses();
  };

  const setDefault = async (row: SavedAddressRow) => {
    if (!user.id) return;
    const supabase = createClient();
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", row.id);
    show("Đã đặt làm địa chỉ mặc định");
    loadAddresses();
  };

  const deleteAddress = async () => {
    if (!deletingAddr) return;
    const { error } = await createClient().from("addresses").delete().eq("id", deletingAddr.id);
    setDeletingAddr(null);
    if (error) return show("Địa chỉ đang được dùng cho gói định kỳ, không thể xóa.", { tone: "error" });
    show("Đã xóa địa chỉ");
    loadAddresses();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return show("Mật khẩu cần ít nhất 6 ký tự.", { tone: "error" });
    if (password !== password2) return show("Hai mật khẩu chưa khớp.", { tone: "error" });
    setSavingPw(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSavingPw(false);
    if (error) {
      return show(error.message.toLowerCase().includes("reauthentication") ? "Vui lòng đăng nhập lại rồi đổi mật khẩu." : "Không đổi được mật khẩu, vui lòng thử lại.", { tone: "error" });
    }
    setPassword("");
    setPassword2("");
    show("Đã đổi mật khẩu");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <form onSubmit={saveInfo} className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-pine-950">Tài khoản</h3>
            <div>
              <label className={label} htmlFor="pf-name">Họ và tên</label>
              <input id="pf-name" className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className={label} htmlFor="pf-email">Email</label>
              <input id="pf-email" className={`${input} bg-surface-muted text-bark-500`} value={user.email} disabled />
            </div>
            <div>
              <label className={label} htmlFor="pf-phone">Số điện thoại</label>
              <input id="pf-phone" className={input} type="tel" inputMode="tel" pattern="0[0-9]{9}" title="Số điện thoại 10 số, bắt đầu bằng 0"
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))} />
            </div>
            <Button type="submit" loading={savingInfo}>Lưu thay đổi</Button>
          </form>

          <form onSubmit={changePassword} className="p-5 rounded-container bg-surface-card border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-pine-950">Đổi mật khẩu</h3>
            <div>
              <label className={label} htmlFor="pf-pw">Mật khẩu mới</label>
              <input id="pf-pw" type="password" autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div>
              <label className={label} htmlFor="pf-pw2">Nhập lại mật khẩu mới</label>
              <input id="pf-pw2" type="password" autoComplete="new-password" className={input} value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={6} required />
            </div>
            <Button type="submit" variant="secondary" loading={savingPw}>Đổi mật khẩu</Button>
          </form>
        </div>

        <section className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-pine-950">Sổ địa chỉ</h3>
            <Button variant="secondary" size="sm" onClick={() => { setShowAddrErrors(false); setEditing({ id: null, value: { ...emptyAddress(), recipientName: user.name, phone: user.phone }, isDefault: addresses.length === 0 }); }}>
              <Plus className="w-3.5 h-3.5" /> Thêm địa chỉ
            </Button>
          </div>
          {addresses.length === 0 ? (
            <p className="text-sm text-bark-500 py-6 text-center">Chưa có địa chỉ nào. Địa chỉ mặc định được điền sẵn khi đặt hàng và đăng ký gói.</p>
          ) : (
            <ul className="space-y-2">
              {addresses.map((row) => (
                <li key={row.id} className={`p-3 rounded-box border text-sm ${row.is_default ? "border-pine-800 bg-pine-50/50" : "border-surface-border"}`}>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-pine-800 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-pine-950">
                        {row.recipient_name} · {row.phone}
                        {row.is_default && <span className="ml-1.5 px-1.5 py-0.5 rounded-tag bg-pine-100 text-pine-800 text-[10px] font-bold">Mặc định</span>}
                      </p>
                      <p className="text-xs text-bark-600 mt-0.5">{formatAddress(rowToAddress(row))}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2 pl-6">
                    <Button variant="link" size="sm" onClick={() => { setShowAddrErrors(false); setEditing({ id: row.id, value: rowToAddress(row), isDefault: row.is_default }); }}>Sửa</Button>
                    {!row.is_default && (
                      <Button variant="link" size="sm" onClick={() => setDefault(row)}><Star className="w-3.5 h-3.5" /> Đặt mặc định</Button>
                    )}
                    <Button variant="link" size="sm" className="!text-red-700" onClick={() => setDeletingAddr(row)}>Xóa</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}
          maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={savingAddr}>Hủy</Button>
              <Button type="submit" form="address-form" loading={savingAddr}>Lưu địa chỉ</Button>
            </>
          }
        >
          <form id="address-form" onSubmit={saveAddress} noValidate className="space-y-3">
            <AddressFields value={editing.value} onChange={(value) => setEditing({ ...editing, value })} idPrefix="book" showErrors={showAddrErrors} />
            <label className="flex items-center gap-2 min-h-11 text-sm text-bark-700 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-pine-900" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
              Đặt làm địa chỉ mặc định
            </label>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deletingAddr}
        title="Xóa địa chỉ?"
        message={deletingAddr ? formatAddress(rowToAddress(deletingAddr)) : ""}
        confirmLabel="Xóa địa chỉ"
        onConfirm={deleteAddress}
        onClose={() => setDeletingAddr(null)}
      />
    </div>
  );
}
