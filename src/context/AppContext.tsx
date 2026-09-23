"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Pet, INITIAL_PETS } from "@/mock/pets";
import { Product, PRODUCTS } from "@/mock/products";
import { BoxType, BOX_TYPES } from "@/mock/boxTypes";
import { Order, INITIAL_ORDERS } from "@/mock/orders";
import { Subscription, INITIAL_SUBSCRIPTIONS } from "@/mock/subscriptions";
import { CurationItem, INITIAL_CURATION_QUEUE } from "@/mock/curationQueue";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CartItem {
  id: string; // unique cart line id
  type: 'box' | 'retail';
  productId?: string;
  product?: Product;
  boxTypeId?: string;
  boxType?: BoxType;
  petId?: string;
  petName?: string;
  quantity: number;
  unitPrice: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'customer' | 'admin' | 'kho' | 'cskh';
  avatarUrl?: string;
}

interface AppContextType {
  // Auth
  isLoggedIn: boolean;
  isLoadingAuth: boolean;
  user: UserProfile;
  login: () => void;
  logout: () => Promise<void>;
  toggleRole: () => void;
  refreshUser: () => Promise<void>;

  // Pets
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "receivedBoxesCount" | "avatarColor">) => Pet;
  updatePet: (id: string, updated: Partial<Pet>) => void;
  deletePet: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  updateQuantity: (id: string, delta: number) => void;
  updatePetForBox: (cartItemId: string, petId: string, petName: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  voucherCode: string;
  voucherDiscount: number;
  voucherMessage: string;
  applyVoucher: (code: string) => boolean;
  subtotal: number;
  shippingFee: number;
  total: number;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;

  // Subscriptions
  subscriptions: Subscription[];
  pauseSubscription: (id: string, cycles: number) => void;
  resumeSubscription: (id: string) => void;
  cancelSubscription: (id: string, reason: string) => void;
  renewSubscription: (id: string, planName: string, prepaidAmount: number) => void;

  // Admin Box Curation
  curationQueue: CurationItem[];
  approveCuration: (curationId: string) => void;
  swapCurationItem: (curationId: string, oldProductId: string, newProduct: Product) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default user profile khi chưa đăng nhập
  const DEFAULT_USER: UserProfile = {
    name: "Khách hàng",
    email: "",
    phone: "",
    address: "",
    role: "customer"
  };

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  // Hàm load profile người dùng từ Supabase
  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const supabase = createClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile && !error) {
        setUser({
          id: profile.id,
          name: profile.full_name || email?.split("@")[0] || "Thành viên",
          email: profile.email || email || "",
          phone: profile.phone || "",
          address: "",
          role: profile.role || "customer",
          avatarUrl: profile.avatar_url || undefined,
        });
        setIsLoggedIn(true);
      } else {
        // Fallback khi bảng profiles chưa kịp sync hoặc trigger đang chạy
        setUser({
          id: userId,
          name: email?.split("@")[0] || "Thành viên",
          email: email || "",
          phone: "",
          address: "",
          role: "customer",
        });
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error("Lỗi tải thông tin người dùng:", err);
      setIsLoggedIn(true);
    }
  };

  // Khởi tạo và lắng nghe Supabase auth state change (với cơ chế kiểm tra an toàn)
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoadingAuth(false);
      return;
    }

    try {
      const supabase = createClient();

      // 1. Kiểm tra session hiện tại
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email);
        } else {
          setIsLoggedIn(false);
          setUser(DEFAULT_USER);
        }
        setIsLoadingAuth(false);
      }).catch((err) => {
        console.warn("Lỗi getSession Supabase:", err);
        setIsLoadingAuth(false);
      });

      // 2. Lắng nghe thay đổi auth (đăng nhập, đăng xuất, token refreshed)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email);
          } else {
            setIsLoggedIn(false);
            setUser(DEFAULT_USER);
          }
          setIsLoadingAuth(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.warn("Lỗi khởi tạo Supabase auth listener:", err);
      setIsLoadingAuth(false);
    }
  }, []);

  // Auth actions
  const login = () => setIsLoggedIn(true);

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    } finally {
      setIsLoggedIn(false);
      setUser(DEFAULT_USER);
    }
  };

  const refreshUser = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id, session.user.email);
    }
  };

  const toggleRole = () => {
    setUser(prev => ({
      ...prev,
      role: prev.role === 'customer' ? 'admin' : 'customer'
    }));
  };

  // Pets state
  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: "cart-line-1",
      type: "box",
      boxTypeId: "box-std-dog-large",
      boxType: BOX_TYPES[1],
      petId: "pet-bo",
      petName: "Bơ",
      quantity: 1,
      unitPrice: 299000
    },
    {
      id: "cart-line-2",
      type: "retail",
      productId: "prod-02",
      product: PRODUCTS[1],
      quantity: 2,
      unitPrice: 45000
    }
  ]);

  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherMessage, setVoucherMessage] = useState<string>("");

  // Orders state
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);

  // Admin Curation state
  const [curationQueue, setCurationQueue] = useState<CurationItem[]>(INITIAL_CURATION_QUEUE);

  // Pet actions
  const addPet = (newPetData: Omit<Pet, "id" | "receivedBoxesCount" | "avatarColor">): Pet => {
    const newPet: Pet = {
      ...newPetData,
      id: "pet-" + Date.now(),
      receivedBoxesCount: 0,
      avatarColor: newPetData.species === 'dog' ? '#E1EDE8' : '#FEF7E6'
    };
    setPets(prev => [newPet, ...prev]);
    return newPet;
  };

  const updatePet = (id: string, updated: Partial<Pet>) => {
    setPets(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const deletePet = (id: string) => {
    setPets(prev => prev.filter(p => p.id !== id));
    // ON DELETE CASCADE: Xóa item box trong giỏ nếu pet bị xóa
    setCart(prev => prev.filter(c => c.petId !== id));
  };

  // Cart actions
  const addToCart = (item: Omit<CartItem, "id">) => {
    setCart(prev => {
      // Nếu đã có box cùng loại và cùng pet, hoặc cùng sản phẩm lẻ -> tăng số lượng
      const existingIdx = prev.findIndex(c => {
        if (item.type === 'box') {
          return c.type === 'box' && c.boxTypeId === item.boxTypeId && c.petId === item.petId;
        } else {
          return c.type === 'retail' && c.productId === item.productId;
        }
      });

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity = Math.min(10, next[existingIdx].quantity + item.quantity);
        return next;
      }

      return [...prev, { ...item, id: "cart-" + Date.now() + Math.random() }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === id) {
        const newQ = Math.max(1, Math.min(10, c.quantity + delta));
        return { ...c, quantity: newQ };
      }
      return c;
    }));
  };

  const updatePetForBox = (cartItemId: string, petId: string, petName: string) => {
    setCart(prev => prev.map(c => {
      if (c.id === cartItemId) {
        return { ...c, petId, petName };
      }
      return c;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setVoucherCode("");
    setVoucherDiscount(0);
    setVoucherMessage("");
  };

  const applyVoucher = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setVoucherMessage("Vui lòng nhập mã giảm giá");
      return false;
    }

    if (clean === "CHAOBANMOI" || clean === "FPET10" || clean === "CHAOMUNG10") {
      const calcDiscount = Math.round(subtotal * 0.1);
      setVoucherCode(clean);
      setVoucherDiscount(calcDiscount);
      setVoucherMessage("Áp dụng thành công mã chào mừng: Giảm 10%");
      return true;
    }

    if (clean === "FREESHIP") {
      setVoucherCode(clean);
      setVoucherDiscount(shippingFee);
      setVoucherMessage("Áp dụng mã miễn phí vận chuyển thành công");
      return true;
    }

    setVoucherMessage("Mã voucher không hợp lệ hoặc đã hết hạn");
    return false;
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 35000;
  const total = Math.max(0, subtotal + shippingFee - voucherDiscount);

  // Orders
  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  // Subscriptions
  const pauseSubscription = (id: string, cycles: number) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'tam_dung',
          statusLabel: 'Tạm dừng (Bỏ qua 1 kỳ)',
          pausedCyclesLeft: cycles,
          nextDeliveryDate: '02/11/2026' // dời 1 tháng
        };
      }
      return s;
    }));
  };

  const resumeSubscription = (id: string) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'dang_hoat_dong',
          statusLabel: 'Đang hoạt động',
          pausedCyclesLeft: 0,
          nextDeliveryDate: '02/10/2026'
        };
      }
      return s;
    }));
  };

  const cancelSubscription = (id: string, reason: string) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'da_huy',
          statusLabel: 'Đã hủy gói (Vẫn giao các hộp đã trả)'
        };
      }
      return s;
    }));
  };

  const renewSubscription = (id: string, planName: string, prepaidAmount: number) => {
    const newSub: Subscription = {
      id: "sub-" + Date.now(),
      code: "SUB-2026-" + Math.floor(1000 + Math.random() * 9000),
      petId: "pet-bo",
      petName: "Bơ",
      petBreed: "Golden Retriever",
      boxName: "Box Tiêu chuẩn cho Chó lớn",
      planName: planName,
      totalCycles: 3,
      completedCycles: 0,
      remainingCycles: 3,
      currentCycleIndex: 1,
      status: "dang_hoat_dong",
      statusLabel: "Đang hoạt động (Gia hạn nối tiếp)",
      deliverySchedule: "dau_thang",
      deliveryScheduleLabel: "Đầu tháng (Ngày 1–5)",
      nextDeliveryDate: "02/11/2026", // Nối tiếp sau khi gói cũ kết thúc
      cutoffDate: "25/10/2026",
      prepaidAmount: prepaidAmount,
      pausedCyclesLeft: 0,
      shippingAddress: user.address
    };
    setSubscriptions(prev => [newSub, ...prev]);
  };

  // Curation
  const approveCuration = (curationId: string) => {
    setCurationQueue(prev => prev.map(c => {
      if (c.id === curationId) {
        return { ...c, status: 'Đã duyệt' };
      }
      return c;
    }));
  };

  const swapCurationItem = (curationId: string, oldProductId: string, newProduct: Product) => {
    setCurationQueue(prev => prev.map(c => {
      if (c.id === curationId) {
        const nextProds = c.selectedProducts.map(p => p.id === oldProductId ? newProduct : p);
        return { ...c, selectedProducts: nextProds };
      }
      return c;
    }));
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isLoadingAuth,
        user,
        login,
        logout,
        toggleRole,
        refreshUser,
        pets,
        addPet,
        updatePet,
        deletePet,
        cart,
        addToCart,
        updateQuantity,
        updatePetForBox,
        removeFromCart,
        clearCart,
        voucherCode,
        voucherDiscount,
        voucherMessage,
        applyVoucher,
        subtotal,
        shippingFee,
        total,
        orders,
        addOrder,
        subscriptions,
        pauseSubscription,
        resumeSubscription,
        cancelSubscription,
        renewSubscription,
        curationQueue,
        approveCuration,
        swapCurationItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
