"use client";

import React, { useState } from "react";
import { MOCK_CUSTOMERS, Customer } from "@/mock/customers";
import { formatVND } from "@/lib/formatters";
import { Search, Lock, Unlock, Eye, Users, ShieldAlert, Phone, Mail, MapPin, Package, Heart, X } from "lucide-react";
import PetSpeciesIcon from "@/components/common/PetSpeciesIcon";

export default function AdminCustomersPage() {
  const [customerList, setCustomerList] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Toggle trạng thái khóa tài khoản
  const toggleLockCustomer = (id: string) => {
    setCustomerList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isLocked: !c.isLocked } : c))
    );
    if (selectedCustomer && selectedCustomer.id === id) {
      setSelectedCustomer((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
    }
  };

  const filtered = customerList.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thống kê nhanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-pine-950 font-display">
            Quản lý Khách hàng ({customerList.length} tài khoản)
          </h1>
          <p className="text-xs text-bark-500">
            Xem hồ sơ tài khoản, liên hệ, đơn hàng, gói định kỳ và quản lý quyền truy cập của người dùng.
          </p>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm */}
      <div className="p-4 rounded-container bg-surface-card border border-surface-border">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-bark-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-box border border-surface-border text-xs focus:border-pine-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Bảng danh sách khách hàng */}
      <div className="rounded-container bg-surface-card border border-surface-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-muted text-bark-700 font-bold border-b border-surface-border text-[11px]">
            <tr>
              <th className="p-3.5">Khách hàng</th>
              <th className="p-3.5">Liên hệ</th>
              <th className="p-3.5">Khu vực</th>
              <th className="p-3.5">Thú cưng</th>
              <th className="p-3.5">Gói định kỳ</th>
              <th className="p-3.5">Đơn / Chi tiêu</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-bark-700">
            {filtered.map((customer) => (
              <tr key={customer.id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-3.5">
                  <div className="font-bold text-pine-950 text-xs">{customer.fullName}</div>
                  <div className="text-[11px] text-bark-400">Tham gia: {customer.joinedDate}</div>
                </td>
                <td className="p-3.5 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-bark-600">
                    <Phone className="w-3 h-3 text-bark-400" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-bark-500 text-[11px]">
                    <Mail className="w-3 h-3 text-bark-400" />
                    <span className="truncate max-w-[140px]">{customer.email}</span>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="font-medium text-bark-800">{customer.provinceCity}</span>
                </td>
                <td className="p-3.5">
                  <div className="flex flex-wrap gap-1">
                    {customer.pets.map((p, idx) => (
                      <PetSpeciesIcon
                        key={idx}
                        species={p.species}
                        variant="badge"
                        size="xs"
                        label={p.name}
                      />
                    ))}
                  </div>
                </td>
                <td className="p-3.5">
                  {customer.activeSubscription ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-grass-100 text-grass-800">
                      {customer.activeSubscription}
                    </span>
                  ) : (
                    <span className="text-bark-400 text-[11px]">Chưa đăng ký</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="font-semibold text-pine-900">{customer.ordersCount} đơn</div>
                  <div className="text-[11px] font-bold text-bark-800">{formatVND(customer.totalSpent)}</div>
                </td>
                <td className="p-3.5">
                  {customer.isLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bark-100 text-bark-700">
                      <Lock className="w-3 h-3 text-bark-600" />
                      <span>Đã khóa</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-grass-50 text-grass-700">
                      <span>Hoạt động</span>
                    </span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-pine-900 bg-pine-50 hover:bg-pine-100 rounded transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      onClick={() => toggleLockCustomer(customer.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                        customer.isLocked
                          ? "bg-grass-100 text-grass-800 hover:bg-grass-200"
                          : "bg-bark-100 text-bark-700 hover:bg-bark-200"
                      }`}
                      title={customer.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                    >
                      {customer.isLocked ? (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Chi tiết khách hàng */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-xs">
          <div className="bg-surface-card rounded-container border border-surface-border p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-pine-100 text-pine-900 font-bold flex items-center justify-center text-sm">
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-pine-950 text-sm">{selectedCustomer.fullName}</h3>
                  <span className="text-[11px] text-bark-500">Mã KH: {selectedCustomer.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-bark-400 hover:text-bark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin liên hệ */}
            <div className="p-3.5 rounded-box bg-surface-muted border border-surface-border space-y-2">
              <h4 className="font-bold text-bark-800 text-[11px] uppercase tracking-wider">Thông tin liên hệ</h4>
              <div className="grid grid-cols-2 gap-2 text-bark-700">
                <div>
                  <span className="text-bark-500 block text-[11px]">Số điện thoại</span>
                  <span className="font-semibold">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-bark-500 block text-[11px]">Email</span>
                  <span className="font-semibold break-all">{selectedCustomer.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-bark-500 block text-[11px]">Địa chỉ giao hàng</span>
                  <span className="font-semibold">{selectedCustomer.address}, {selectedCustomer.provinceCity}</span>
                </div>
              </div>
            </div>

            {/* Thú cưng của khách */}
            <div className="space-y-2">
              <h4 className="font-bold text-bark-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-grass-600" />
                <span>Hồ sơ thú cưng ({selectedCustomer.pets.length})</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {selectedCustomer.pets.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-box border border-surface-border bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PetSpeciesIcon species={p.species} variant="avatar" size="sm" />
                      <div>
                        <span className="font-bold text-pine-950">{p.name}</span>
                        <span className="text-[11px] text-bark-500 block">{p.breed}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-pine-700 bg-pine-50 px-2 py-0.5 rounded">
                      Đã lưu Profile
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gói định kỳ & Thống kê đơn */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-box border border-surface-border bg-white">
                <span className="text-[11px] text-bark-500 block mb-1">Gói Subscription</span>
                <span className="font-bold text-pine-900 block">
                  {selectedCustomer.activeSubscription || "Chưa có gói"}
                </span>
              </div>
              <div className="p-3 rounded-box border border-surface-border bg-white">
                <span className="text-[11px] text-bark-500 block mb-1">Tổng chi tiêu</span>
                <span className="font-bold text-grass-700 block">
                  {formatVND(selectedCustomer.totalSpent)} ({selectedCustomer.ordersCount} đơn)
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex justify-between items-center pt-3 border-t border-surface-border">
              <button
                onClick={() => toggleLockCustomer(selectedCustomer.id)}
                className={`px-3 py-1.5 rounded-box font-bold flex items-center gap-1.5 transition-colors ${
                  selectedCustomer.isLocked
                    ? "bg-grass-700 text-white hover:bg-grass-800"
                    : "bg-bark-800 text-white hover:bg-bark-900"
                }`}
              >
                {selectedCustomer.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa tài khoản</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa tài khoản này</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 bg-surface-muted text-bark-700 rounded-box font-medium hover:bg-bark-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
