"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDate } from "@/lib/formatters";
import { Search, Lock, Unlock, Eye, Phone, Mail, Heart, X, BadgeCheck } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { textMatches } from "@/lib/search";
import { ROLE_LABEL } from "@/lib/roles";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: "customer" | "staff";
  created_at: string;
}
interface PetRow { id: string; user_id: string; name: string; species: "dog" | "cat"; breed: string | null }
interface OrderAgg { user_id: string; total_amount: number; payment_status: string }
interface SubRow { user_id: string; status: string; subscription_code: string }

export default function AdminCustomersPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [orders, setOrders] = useState<OrderAgg[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState<ProfileRow | null>(null);
  const [roleChange, setRoleChange] = useState<ProfileRow | null>(null);
  const { show } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: p }, { data: pe }, { data: o }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, is_active, role, created_at").in("role", ["customer", "staff"]).order("created_at", { ascending: false }),
      supabase.from("pets").select("id, user_id, name, species, breed"),
      supabase.from("orders").select("user_id, total_amount, payment_status").not("user_id", "is", null),
      supabase.from("subscriptions").select("user_id, status, subscription_code"),
    ]);
    setProfiles((p as ProfileRow[]) || []);
    setPets((pe as unknown as PetRow[]) || []);
    setOrders((o as unknown as OrderAgg[]) || []);
    setSubs((s as unknown as SubRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const petsByUser = useMemo(() => {
    const map = new Map<string, PetRow[]>();
    pets.forEach((p) => map.set(p.user_id, [...(map.get(p.user_id) || []), p]));
    return map;
  }, [pets]);

  const orderStatsByUser = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    orders.forEach((o) => {
      const cur = map.get(o.user_id) || { count: 0, total: 0 };
      cur.count += 1;
      if (o.payment_status === "paid") cur.total += o.total_amount;
      map.set(o.user_id, cur);
    });
    return map;
  }, [orders]);

  const activeSubByUser = useMemo(() => {
    const map = new Map<string, string>();
    subs.forEach((s) => {
      if (s.status === "dang_hoat_dong") map.set(s.user_id, s.subscription_code);
    });
    return map;
  }, [subs]);

  const setActive = async (customer: ProfileRow, active: boolean) => {
    setBusy(true);
    const { error } = await createClient().from("profiles").update({ is_active: active }).eq("id", customer.id);
    setBusy(false);
    if (error) return show("Không cập nhật được tài khoản.", { tone: "error" });
    show(active ? `Đã mở khóa tài khoản ${customer.email}.` : `Đã khóa tài khoản ${customer.email}.`);
    setLocking(null);
    loadData();
  };

  // Cấp / thu hồi vai trò nhân viên vận hành (RPC set_user_role chỉ cho admin, không đổi được tài khoản admin)
  const toggleStaffRole = async (person: ProfileRow) => {
    const next = person.role === "staff" ? "customer" : "staff";
    setBusy(true);
    const { error } = await createClient().rpc("set_user_role", { p_user_id: person.id, p_role: next });
    setBusy(false);
    if (error) return show("Không đổi được vai trò tài khoản.", { tone: "error" });
    show(next === "staff" ? `${person.email} đã là nhân viên vận hành.` : `${person.email} đã trở lại là khách hàng.`);
    setRoleChange(null);
    loadData();
  };

  // Khóa cần xác nhận (khách bị đăng xuất, không đặt hàng được); mở khóa làm ngay
  const toggleLockCustomer = (id: string, currentActive: boolean) => {
    const customer = profiles.find((p) => p.id === id);
    if (!customer) return;
    if (currentActive) setLocking(customer);
    else setActive(customer, true);
  };

  const filtered = profiles.filter((c) => textMatches([c.full_name, c.email, c.phone], searchTerm));

  const selectedCustomer = profiles.find((p) => p.id === selectedId) || null;

  if (loading) return <div className="py-16 text-center text-xs text-bark-500">Đang tải danh sách khách hàng...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">Khách hàng ({profiles.length})</h1>
          <p className="text-xs text-bark-500">Xem hồ sơ, đơn hàng, gói định kỳ và quản lý quyền truy cập. Cấp quyền nhân viên trong chi tiết từng tài khoản.</p>
        </div>
      </div>

      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Tìm theo họ tên, email hoặc số điện thoại..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none" />
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="lg:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-bark-500 rounded-container bg-surface-card border border-surface-border">
            Không tìm thấy khách hàng phù hợp.
          </div>
        ) : (
          filtered.map((customer) => {
            const customerPets = petsByUser.get(customer.id) || [];
            const stats = orderStatsByUser.get(customer.id) || { count: 0, total: 0 };
            const activeSub = activeSubByUser.get(customer.id);
            return (
              <div
                key={customer.id}
                className="p-3.5 rounded-container bg-surface-card border border-surface-border space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-pine-950 text-xs">
                      {customer.full_name || "(Chưa đặt tên)"}
                      {customer.role === "staff" && <StaffBadge />}
                    </h3>
                    <div className="text-[10px] text-bark-500 mt-0.5">
                      Tham gia: {formatDate(customer.created_at)}
                    </div>
                  </div>
                  <div>
                    {!customer.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-700">
                        <Lock className="w-3 h-3" />
                        <span>Đã khóa</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-grass-50 text-grass-700">
                        <span>Hoạt động</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-bark-600">
                    <Phone className="w-3 h-3 text-bark-400" />
                    <span>{customer.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-bark-500 text-[11px]">
                    <Mail className="w-3 h-3 text-bark-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-border/70 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-bark-500 block">Thú cưng:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {customerPets.map((p) => (
                        <PetSpeciesIcon key={p.id} species={p.species} variant="badge" size="xs" label={p.name} />
                      ))}
                      {customerPets.length === 0 && <span className="text-bark-500 text-[11px]">Chưa có</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-bark-500 block">Đơn / Chi tiêu:</span>
                    <span className="font-semibold text-pine-900 text-xs">{stats.count} đơn</span>
                    <span className="text-[11px] font-bold text-bark-800 ml-1">({formatVND(stats.total)})</span>
                  </div>
                </div>

                {activeSub && (
                  <div className="text-[11px]">
                    <span className="text-bark-500">Gói: </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-grass-100 text-grass-800">
                      {activeSub}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/50">
                  <button
                    type="button"
                    onClick={() => setSelectedId(customer.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Chi tiết</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLockCustomer(customer.id, customer.is_active)}
                    disabled={busy}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors disabled:opacity-60 ${
                      !customer.is_active ? "bg-grass-100 text-grass-800" : "bg-bark-100 text-bark-700"
                    }`}
                  >
                    {!customer.is_active ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Mở</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Khóa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden lg:block rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[760px] whitespace-nowrap">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Khách hàng</th>
              <th className="p-3.5">Liên hệ</th>
              <th className="p-3.5">Thú cưng</th>
              <th className="p-3.5">Gói định kỳ</th>
              <th className="p-3.5">Đơn / Chi tiêu</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-xs text-bark-500">Không tìm thấy khách hàng phù hợp.</td>
              </tr>
            )}
            {filtered.map((customer) => {
              const customerPets = petsByUser.get(customer.id) || [];
              const stats = orderStatsByUser.get(customer.id) || { count: 0, total: 0 };
              const activeSub = activeSubByUser.get(customer.id);
              return (
                <tr key={customer.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-pine-950 text-xs">
                      {customer.full_name || "(Chưa đặt tên)"}
                      {customer.role === "staff" && <StaffBadge />}
                    </div>
                    <div className="text-[11px] text-bark-500">Tham gia: {formatDate(customer.created_at)}</div>
                  </td>
                  <td className="p-3.5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-bark-600"><Phone className="w-3 h-3 text-bark-400" /><span>{customer.phone || "—"}</span></div>
                    <div className="flex items-center gap-1.5 text-bark-500 text-[11px]"><Mail className="w-3 h-3 text-bark-400" /><span className="truncate max-w-[140px]">{customer.email}</span></div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {customerPets.map((p) => <PetSpeciesIcon key={p.id} species={p.species} variant="badge" size="xs" label={p.name} />)}
                      {customerPets.length === 0 && <span className="text-bark-500 text-[11px]">Chưa có</span>}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {activeSub ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-grass-100 text-grass-800">{activeSub}</span>
                    ) : (
                      <span className="text-bark-500 text-[11px]">Chưa đăng ký</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-pine-900">{stats.count} đơn</div>
                    <div className="text-[11px] font-bold text-bark-800">{formatVND(stats.total)}</div>
                  </td>
                  <td className="p-3.5">
                    {!customer.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-700"><Lock className="w-3 h-3" /><span>Đã khóa</span></span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-grass-50 text-grass-700"><span>Hoạt động</span></span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedId(customer.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors">
                        <Eye className="w-3 h-3" /><span>Chi tiết</span>
                      </button>
                      <button onClick={() => toggleLockCustomer(customer.id, customer.is_active)} disabled={busy}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition-colors disabled:opacity-60 ${!customer.is_active ? "bg-grass-100 text-grass-800 hover:bg-grass-200" : "bg-bark-100 text-bark-700 hover:bg-bark-200"}`}>
                        {!customer.is_active ? (<><Unlock className="w-3 h-3" /><span>Mở</span></>) : (<><Lock className="w-3 h-3" /><span>Khóa</span></>)}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-4 sm:p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-pine-100 text-pine-900 font-bold flex items-center justify-center text-sm">
                  {(selectedCustomer.full_name || "?").charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-pine-950 text-sm">
                    {selectedCustomer.full_name || "(Chưa đặt tên)"}
                    {selectedCustomer.role === "staff" && <StaffBadge />}
                  </h3>
                  <span className="text-[11px] text-bark-500">Mã KH: {selectedCustomer.id.slice(0, 8)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 text-bark-400 hover:text-bark-700 rounded"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-2">
              <h4 className="font-bold text-bark-800 text-[11px] uppercase tracking-wider">Thông tin liên hệ</h4>
              <div className="grid grid-cols-2 gap-2 text-bark-700">
                <div><span className="text-bark-500 block text-[11px]">Số điện thoại</span><span className="font-semibold">{selectedCustomer.phone || "—"}</span></div>
                <div><span className="text-bark-500 block text-[11px]">Email</span><span className="font-semibold break-all">{selectedCustomer.email}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-bark-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-grass-600" />
                <span>Hồ sơ thú cưng ({(petsByUser.get(selectedCustomer.id) || []).length})</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {(petsByUser.get(selectedCustomer.id) || []).map((p) => (
                  <div key={p.id} className="p-2.5 rounded-box border border-surface-border bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PetSpeciesIcon species={p.species} variant="avatar" size="sm" />
                      <div><span className="font-bold text-pine-950">{p.name}</span><span className="text-[11px] text-bark-500 block">{p.breed}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-box border border-surface-border bg-white">
                <span className="text-[11px] text-bark-500 block mb-1">Gói định kỳ đang chạy</span>
                <span className="font-bold text-pine-900 block">{activeSubByUser.get(selectedCustomer.id) || "Chưa có gói"}</span>
              </div>
              <div className="p-3 rounded-box border border-surface-border bg-white">
                <span className="text-[11px] text-bark-500 block mb-1">Tổng chi tiêu</span>
                <span className="font-bold text-grass-700 block">
                  {formatVND((orderStatsByUser.get(selectedCustomer.id) || { total: 0 }).total)} ({(orderStatsByUser.get(selectedCustomer.id) || { count: 0 }).count} đơn)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-box border border-surface-border space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-bark-500 block">Vai trò</span>
                  <span className="font-bold text-pine-950">{ROLE_LABEL[selectedCustomer.role]}</span>
                </div>
                <button type="button" onClick={() => setRoleChange(selectedCustomer)} disabled={busy}
                  className="px-3 py-1.5 rounded-box border border-surface-border font-semibold text-pine-900 hover:bg-surface-muted transition-colors disabled:opacity-60">
                  {selectedCustomer.role === "staff" ? "Thu hồi quyền nhân viên" : "Cấp quyền nhân viên"}
                </button>
              </div>
              <p className="text-[11px] text-bark-500 leading-relaxed">
                Nhân viên vận hành xử lý đơn hàng, tuyển chọn hộp, tồn kho, gói định kỳ, hồ sơ thú cưng, đánh giá và góp ý.
                Không xem doanh thu, không sửa sản phẩm, giá, voucher và không quản lý tài khoản.
              </p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-surface-border">
              <button onClick={() => toggleLockCustomer(selectedCustomer.id, selectedCustomer.is_active)} disabled={busy}
                className={`px-3 py-1.5 rounded-box font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${!selectedCustomer.is_active ? "bg-grass-700 text-white hover:bg-grass-800" : "bg-bark-800 text-white hover:bg-bark-900"}`}>
                {!selectedCustomer.is_active ? (<><Unlock className="w-3.5 h-3.5" /><span>Mở khóa tài khoản</span></>) : (<><Lock className="w-3.5 h-3.5" /><span>Khóa tài khoản này</span></>)}
              </button>
              <button type="button" onClick={() => setSelectedId(null)} className="px-4 py-1.5 bg-surface-muted text-bark-700 rounded-box font-medium hover:bg-bark-200 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!roleChange}
        title={roleChange?.role === "staff" ? "Thu hồi quyền nhân viên" : "Cấp quyền nhân viên"}
        message={
          roleChange?.role === "staff" ? (
            <>
              <strong>{roleChange?.full_name || roleChange?.email}</strong> sẽ không vào được trang quản trị nữa và dùng web như khách hàng.
            </>
          ) : (
            <>
              <strong>{roleChange?.full_name || roleChange?.email}</strong> sẽ vào được trang quản trị để xử lý đơn hàng, tuyển chọn hộp,
              tồn kho, gói định kỳ, hồ sơ thú cưng, đánh giá và góp ý của khách.
            </>
          )
        }
        confirmLabel={roleChange?.role === "staff" ? "Thu hồi quyền" : "Cấp quyền"}
        danger={roleChange?.role === "staff"}
        loading={busy}
        onClose={() => setRoleChange(null)}
        onConfirm={() => roleChange && toggleStaffRole(roleChange)}
      />

      <ConfirmDialog
        open={!!locking}
        title="Khóa tài khoản khách"
        message={
          <>
            Khóa <strong>{locking?.full_name || locking?.email}</strong>? Khách bị đăng xuất, không đăng nhập và không đặt hàng được nữa.
            Gói định kỳ đã trả trước vẫn tiếp tục giao; muốn dừng hãy hủy gói ở trang Gói định kỳ.
          </>
        }
        confirmLabel="Khóa tài khoản"
        loading={busy}
        onClose={() => setLocking(null)}
        onConfirm={() => locking && setActive(locking, false)}
      />
    </div>
  );
}

function StaffBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-pine-100 text-pine-900 align-middle">
      <BadgeCheck className="w-3 h-3" />
      <span>Nhân viên</span>
    </span>
  );
}
