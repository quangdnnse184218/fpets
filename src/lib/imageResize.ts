// Thu nhỏ ảnh ngay trên trình duyệt trước khi tải lên: ảnh chụp bằng điện thoại thường 3–8MB,
// trong khi hiển thị trên web chỉ cần cạnh dài khoảng 1600px (vài trăm KB).

/** Đọc file ảnh, thu về cạnh dài tối đa `maxSide` và nén JPEG. Ném lỗi nếu file không phải ảnh đọc được. */
export async function resizeImageToJpeg(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("ERR_IMAGE_DECODE"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ERR_IMAGE_DECODE");
    // Nền trắng cho ảnh PNG/WEBP có vùng trong suốt (JPEG không có kênh alpha)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("ERR_IMAGE_DECODE");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
