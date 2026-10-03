"use client";

import React, { useId, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Khớp cấu hình bucket "product-images" (Supabase kiểm tra lại ở server: loại file, dung lượng,
// quyền admin và mẫu tên file; xem migration 20261003000005).
const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type ImageFolder = "products" | "boxes";

// Tên file an toàn: chỉ chữ thường không dấu, số và gạch ngang, kèm mã ngẫu nhiên để không trùng
function safeFileName(hint: string, ext: string): string {
  const base = hint
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const random = Math.random().toString(36).slice(2, 10);
  return `${base || "anh"}-${random}.${ext}`;
}

function uploadErrorMessage(message: string): string {
  if (/row-level security|not authorized|unauthorized|403/i.test(message)) return "Chỉ tài khoản quản trị mới tải ảnh lên được. Vui lòng đăng nhập lại.";
  if (/mime|type/i.test(message)) return "Chỉ nhận ảnh JPG, PNG hoặc WEBP.";
  if (/size|large|exceeded/i.test(message)) return "Ảnh vượt quá 5MB.";
  return "Không tải được ảnh lên, vui lòng thử lại.";
}

/**
 * Chọn ảnh từ máy (bấm hoặc kéo thả), xem trước, đổi hoặc xóa. Trả về đường dẫn công khai của ảnh.
 * Vẫn nhận đường dẫn cũ (https://… hoặc /images/…) và cho dán đường dẫn như phương án phụ.
 */
export default function ImageUpload({
  value,
  onChange,
  folder,
  nameHint = "",
  label = "Ảnh",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: ImageFolder;
  // Tên sản phẩm / hộp, dùng đặt tên file cho dễ nhận biết
  nameHint?: string;
  label?: string;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) return setError("Chỉ nhận ảnh JPG, PNG hoặc WEBP.");
    if (file.size > MAX_BYTES) return setError(`Ảnh nặng ${(file.size / 1024 / 1024).toFixed(1)}MB, tối đa 5MB.`);
    setError("");
    setUploading(true);
    const supabase = createClient();
    const path = `${folder}/${safeFileName(nameHint || file.name.replace(/\.[^.]+$/, ""), ext)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);
    if (upErr) return setError(uploadErrorMessage(upErr.message));
    onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^(https:\/\/|\/)/.test(url)) return setError("Đường dẫn phải bắt đầu bằng https:// hoặc /");
    setError("");
    onChange(url);
    setUrlMode(false);
    setUrlDraft("");
  };

  return (
    <div className="space-y-2 text-xs">
      <span className="font-semibold text-bark-700 block">{label}</span>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 p-2.5 rounded-box border border-surface-border bg-white">
          {/* Ảnh xem trước dùng thẻ img thường: đường dẫn cũ có thể thuộc tên miền chưa khai báo cho next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={nameHint ? `Ảnh ${nameHint}` : "Ảnh đang dùng"} className="w-20 h-20 rounded-box object-cover border border-surface-border bg-surface-muted shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-bark-600 truncate" title={value}>{value.split("/").pop()}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-box border border-surface-border bg-white hover:bg-surface-muted font-semibold text-pine-950 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Đang tải…" : "Đổi ảnh"}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setError("");
                  onChange("");
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-box border border-surface-border bg-white hover:bg-red-50 font-semibold text-red-700 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-1.5 px-4 py-6 rounded-box border-2 border-dashed cursor-pointer text-center transition-colors ${
            dragging ? "border-pine-800 bg-pine-50" : "border-surface-border bg-white hover:bg-surface-muted"
          } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        >
          {uploading ? <Loader2 className="w-6 h-6 text-pine-800 animate-spin" /> : <ImagePlus className="w-6 h-6 text-bark-500" />}
          <span className="font-semibold text-pine-950">{uploading ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy hoặc kéo thả vào đây"}</span>
          <span className="text-bark-600">JPG, PNG hoặc WEBP, tối đa 5MB. Nên dùng ảnh vuông, nền sáng.</span>
        </label>
      )}

      {error && <p role="alert" className="text-red-700 font-semibold">{error}</p>}

      {urlMode ? (
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            placeholder="https://… hoặc /images/…"
            aria-label="Đường dẫn ảnh"
            className="flex-1 h-9 px-3 rounded-box border border-surface-border bg-white focus:border-pine-900 focus:outline-none"
          />
          <button type="button" onClick={applyUrl} className="h-9 px-3 rounded-box bg-pine-900 text-white font-semibold">Dùng</button>
          <button type="button" onClick={() => setUrlMode(false)} className="h-9 px-2 text-bark-600 font-semibold">Hủy</button>
        </div>
      ) : (
        <button type="button" onClick={() => setUrlMode(true)} className="inline-flex items-center gap-1 text-bark-600 hover:text-pine-900 font-semibold">
          <Link2 className="w-3.5 h-3.5" /> Dùng đường dẫn ảnh có sẵn
        </button>
      )}
    </div>
  );
}
