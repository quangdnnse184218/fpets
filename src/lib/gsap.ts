"use client";

// Đăng ký plugin GSAP một lần cho cả app. Chỉ import từ component phía trình duyệt ("use client"),
// mọi lệnh gsap chạy trong useGSAP nên không chạy lúc render ở server.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Người dùng bật "giảm chuyển động" trong hệ điều hành thì không chạy hiệu ứng nào
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
