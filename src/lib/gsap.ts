"use client";

// Đăng ký plugin GSAP một lần cho cả app. Chỉ import từ component phía trình duyệt ("use client"),
// mọi lệnh gsap chạy trong useGSAP nên không chạy lúc render ở server.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Hiệu ứng luôn chạy, kể cả khi hệ điều hành bật "giảm chuyển động" (chủ dự án chọn 08/10/2026).
// Muốn tôn trọng lại cài đặt đó: đổi thành "(prefers-reduced-motion: no-preference)" và bọc CSS trong globals.css tương ứng.
export const MOTION_OK = "all";

export { gsap, ScrollTrigger, useGSAP };
