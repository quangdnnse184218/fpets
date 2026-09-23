"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { User, MapPin, Phone, Mail, CheckCircle2, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useApp();
  const [address, setAddress] = useState(user.address);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-pine-950">Thông tin cá nhân & Sổ địa chỉ</h2>
        <p className="text-xs text-bark-500">
          Địa chỉ này sẽ được điền mặc định cho các đơn hàng mua lẻ và các kỳ giao Mystery Box.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-container bg-surface-card border border-surface-border space-y-4 shadow-xs text-xs">
        {saved && (
          <div className="p-3 rounded-box bg-grass-50 border border-grass-200 text-grass-800 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã cập nhật thông tin thành công!</span>
          </div>
        )}

        <div>
          <label className="font-bold text-bark-800 block mb-1">Họ và tên:</label>
          <div className="flex items-center gap-2 p-2.5 rounded-box bg-surface-muted border border-surface-border text-bark-700">
            <User className="w-4 h-4 text-bark-400" />
            <span>{user.name}</span>
          </div>
        </div>

        <div>
          <label className="font-bold text-bark-800 block mb-1">Email đăng ký:</label>
          <div className="flex items-center gap-2 p-2.5 rounded-box bg-surface-muted border border-surface-border text-bark-700">
            <Mail className="w-4 h-4 text-bark-400" />
            <span>{user.email}</span>
          </div>
        </div>

        <div>
          <label className="font-bold text-bark-800 block mb-1">Số điện thoại liên hệ nhận hàng: *</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-bark-400 absolute left-3 top-3" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-box border border-surface-border focus:border-pine-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-bark-800 block mb-1">Địa chỉ giao hàng mặc định: *</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-bark-400 absolute left-3 top-3" />
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-box border border-surface-border focus:border-pine-900 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>

      {/* KHỐI ĐĂNG XUẤT TÀI KHOẢN */}
      <div className="p-5 rounded-container bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h4 className="font-bold text-bark-900">Quản lý phiên đăng nhập</h4>
          <p className="text-bark-500 mt-0.5">Đăng xuất khỏi tài khoản trên thiết bị này.</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            window.location.href = "/";
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    </div>
  );
}
